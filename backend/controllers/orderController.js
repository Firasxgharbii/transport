const OrderModel = require("../models/orderModel");
const DriverModel = require("../models/driverModel");
const ClientModel = require("../models/clientModel");

const {
  uploadDeliveryProofFiles,
} = require("../services/deliveryService");

/* ============================================================
   VALEURS AUTORISÉES
============================================================ */

const ALLOWED_ORDER_STATUSES = [
  "pending",
  "assigned",
  "pickup_in_progress",
  "picked_up",
  "delivery_in_progress",
  "arrived",
  "completed",
  "cancelled",
  "incident",
];

const ALLOWED_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
];

const ALLOWED_STOP_TYPES = [
  "pickup",
  "delivery",
  "warehouse",
  "break",
];

const ALLOWED_STOP_STATUSES = [
  "pending",
  "arrived",
  "completed",
  "failed",
  "skipped",
];

const ALLOWED_SERVICE_TYPES = [
  "pickup_only",
  "delivery_only",
  "pickup_delivery",
];

/*
 * Parcours chauffeur autorisé.
 * Les rôles administratifs conservent la capacité opérationnelle
 * de corriger un statut lorsque nécessaire.
 */
const DRIVER_STATUS_TRANSITIONS = {
  assigned: [
    "pickup_in_progress",
    "incident",
  ],

  pickup_in_progress: [
    "picked_up",
    "incident",
  ],

  picked_up: [
    "delivery_in_progress",
    "incident",
  ],

  delivery_in_progress: [
    "arrived",
    "incident",
  ],

  arrived: [
    "completed",
    "incident",
  ],

  completed: [],
  cancelled: [],
  incident: [],
};

/* ============================================================
   UTILITAIRES
============================================================ */

function parsePositiveId(value) {
  const id = Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

function normalizeNullableId(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return parsePositiveId(value);
}

function normalizeOptionalText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalizedValue =
    String(value).trim();

  return normalizedValue || null;
}

function normalizeNullableNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function normalizeMoney(value) {
  const amount = Number(value || 0);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return null;
  }

  return Number(amount.toFixed(2));
}

function calculateOrderAmounts({
  subtotal,
  taxes,
  total_amount,
}) {
  const normalizedSubtotal =
    normalizeMoney(subtotal);

  if (normalizedSubtotal === null) {
    return null;
  }

  let normalizedTaxes =
    normalizeMoney(taxes);

  if (normalizedTaxes === null) {
    return null;
  }

  let normalizedTotal =
    normalizeMoney(total_amount);

  if (normalizedTotal === null) {
    normalizedTotal =
      normalizedSubtotal +
      normalizedTaxes;
  }

  return {
    subtotal:
      normalizedSubtotal,

    taxes:
      normalizedTaxes,

    total_amount:
      Number(
        normalizedTotal.toFixed(2),
      ),
  };
}

function getAuthenticatedUserId(req) {
  return (
    req.user?.id ||
    req.user?.user_id ||
    null
  );
}

function getAuthenticatedRole(req) {
  return (
    req.user?.role ||
    req.user?.role_name ||
    req.user?.roleName ||
    null
  );
}

function isPrivilegedRole(role) {
  return (
    role === "super_admin" ||
    role === "dispatcher"
  );
}

async function getAuthenticatedDriver(req) {
  const userId =
    parsePositiveId(
      getAuthenticatedUserId(req),
    );

  if (!userId) {
    return null;
  }

  return DriverModel.getDriverByUserId(
    userId,
  );
}

async function getAuthenticatedClient(req) {
  const userId =
    parsePositiveId(
      getAuthenticatedUserId(req),
    );

  if (!userId) {
    return null;
  }

  return ClientModel.getClientByUserId(
    userId,
  );
}

/*
 * Autorisation par ressource.
 *
 * Important :
 * - un rôle seul ne suffit pas ;
 * - un chauffeur doit être réellement assigné à la commande ;
 * - un client doit être réellement propriétaire de la commande.
 */
async function authorizeOrderAccess(
  req,
  order,
) {
  const role =
    getAuthenticatedRole(req);

  if (isPrivilegedRole(role)) {
    return {
      authorized: true,
      role,
      driver: null,
      client: null,
    };
  }

  if (role === "driver") {
    const driver =
      await getAuthenticatedDriver(req);

    const authorized =
      Boolean(
        driver &&
        Number(order?.driver_id) ===
          Number(driver.id),
      );

    return {
      authorized,
      role,
      driver,
      client: null,
    };
  }

  if (role === "client") {
    const client =
      await getAuthenticatedClient(req);

    const authorized =
      Boolean(
        client &&
        Number(order?.client_id) ===
          Number(client.id),
      );

    return {
      authorized,
      role,
      driver: null,
      client,
    };
  }

  return {
    authorized: false,
    role,
    driver: null,
    client: null,
  };
}

function sendOrderNotFound(res) {
  return res.status(404).json({
    success: false,
    message:
      "Commande introuvable.",
  });
}

function isAllowedDriverTransition(
  currentStatus,
  nextStatus,
) {
  const allowed =
    DRIVER_STATUS_TRANSITIONS[
      currentStatus
    ] || [];

  return allowed.includes(
    nextStatus,
  );
}

function normalizeServiceType(
  value,
  pickupAddress,
  deliveryAddress,
) {
  if (
    value !== undefined &&
    value !== null &&
    value !== ""
  ) {
    const normalizedValue =
      String(value).trim();

    return ALLOWED_SERVICE_TYPES.includes(
      normalizedValue,
    )
      ? normalizedValue
      : null;
  }

  if (pickupAddress && deliveryAddress) {
    return "pickup_delivery";
  }

  if (pickupAddress) {
    return "pickup_only";
  }

  if (deliveryAddress) {
    return "delivery_only";
  }

  return null;
}


/*
 * Compatibilité avec le schéma SQL actuel :
 * les colonnes orders.pickup_address et orders.delivery_address
 * sont obligatoires dans la base, alors que l'API accepte aussi
 * pickup_only et delivery_only.
 *
 * Pour un service à une seule adresse opérationnelle, on conserve
 * l'adresse réelle dans son champ et on la réplique dans l'autre
 * champ uniquement pour satisfaire la contrainte NOT NULL SQL.
 * Cela évite les erreurs ER_BAD_NULL_ERROR sans inventer une adresse.
 */
function getDatabaseCompatibleAddresses(
  serviceType,
  pickupAddress,
  deliveryAddress,
) {
  if (serviceType === "pickup_only") {
    return {
      pickup_address: pickupAddress,
      delivery_address:
        deliveryAddress || pickupAddress,
    };
  }

  if (serviceType === "delivery_only") {
    return {
      pickup_address:
        pickupAddress || deliveryAddress,
      delivery_address: deliveryAddress,
    };
  }

  return {
    pickup_address: pickupAddress,
    delivery_address: deliveryAddress,
  };
}


function buildOrderAuditComment({
  prefix,
  existingOrder,
  updatedData,
  explicitComment,
}) {
  const changes = [];

  const trackedFields = [
    ["client_id", "client"],
    ["driver_id", "chauffeur"],
    ["vehicle_id", "véhicule"],
    ["pickup_address", "adresse de ramassage"],
    ["delivery_address", "adresse de livraison"],
    ["pickup_date", "date de ramassage"],
    ["pickup_time", "heure de ramassage"],
    ["delivery_date", "date de livraison"],
    ["delivery_time", "heure de livraison"],
    ["pallets_count", "palettes"],
    ["priority", "priorité"],
    ["status", "statut"],
  ];

  for (const [field, label] of trackedFields) {
    if (
      !Object.prototype.hasOwnProperty.call(
        updatedData,
        field,
      )
    ) {
      continue;
    }

    const before =
      existingOrder?.[field] ?? null;
    const after =
      updatedData[field] ?? null;

    if (
      String(before ?? "") !==
      String(after ?? "")
    ) {
      changes.push(label);
    }
  }

  const userComment =
    normalizeOptionalText(explicitComment);

  if (userComment) {
    changes.push(userComment);
  }

  return changes.length
    ? `${prefix} : ${changes.join(", ")}`
    : prefix;
}

/* ============================================================
   RÉCUPÉRER TOUTES LES COMMANDES
============================================================ */

const getAllOrders = async (
  req,
  res,
) => {
  try {
    const orders =
      await OrderModel.getAllOrders();

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
      orders,
    });
  } catch (error) {
    console.error(
      "Erreur getAllOrders :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération des commandes.",
      error: error.message,
    });
  }
};

/* ============================================================
   RÉCUPÉRER UNE COMMANDE PAR ID
============================================================ */

const getOrderById = async (
  req,
  res,
) => {
  try {
    const orderId =
      parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    const order =
      await OrderModel.getOrderById(
        orderId,
      );

    if (!order) {
      return sendOrderNotFound(res);
    }

    const access =
      await authorizeOrderAccess(
        req,
        order,
      );

    /*
     * 404 volontaire pour les ressources qui ne sont pas
     * accessibles au chauffeur/client authentifié.
     * Cela évite d'aider à énumérer les identifiants.
     */
    if (!access.authorized) {
      return sendOrderNotFound(res);
    }

    const [
      stops,
      timeline,
      proofs,
    ] = await Promise.all([
      OrderModel.getOrderStops(
        orderId,
      ),

      OrderModel.getOrderTimeline(
        orderId,
      ),

      OrderModel.getDeliveryProofs(
        orderId,
      ),
    ]);

    return res.status(200).json({
      success: true,

      data: {
        ...order,
        stops,
        timeline,
        proofs,
      },

      order: {
        ...order,
        stops,
        timeline,
        proofs,
      },
    });
  } catch (error) {
    console.error(
      "Erreur getOrderById :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération de la commande.",
    });
  }
};

/* ============================================================
   CRÉER UNE COMMANDE
============================================================ */

const createOrder = async (
  req,
  res,
) => {
  try {
    const {
      client_id,
      driver_id,
      vehicle_id,

      pickup_address,
      delivery_address,

      pickup_date,
      pickup_time,

      delivery_date,
      delivery_time,

      pallets_count,

      description,
      notes,

      subtotal,
      taxes,
      total_amount,

      estimated_distance,
      estimated_duration,

      priority,
      onfleet_task_id,

      status,
      stops,
      service_type,
      order_type,
    } = req.body;

    const clientId =
      parsePositiveId(client_id);

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message:
          "Le client est obligatoire et doit être valide.",
      });
    }

    const normalizedDriverId =
      normalizeNullableId(driver_id);

    if (
      driver_id &&
      !normalizedDriverId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du chauffeur invalide.",
      });
    }

    const normalizedVehicleId =
      normalizeNullableId(vehicle_id);

    if (
      vehicle_id &&
      !normalizedVehicleId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du véhicule invalide.",
      });
    }

    const normalizedPickupAddress =
      normalizeOptionalText(
        pickup_address,
      );

    const normalizedDeliveryAddress =
      normalizeOptionalText(
        delivery_address,
      );

    const normalizedServiceType =
      normalizeServiceType(
        service_type || order_type,
        normalizedPickupAddress,
        normalizedDeliveryAddress,
      );

    if (!normalizedServiceType) {
      return res.status(400).json({
        success: false,
        message:
          "Le type de commande est invalide. Utilisez pickup_only, delivery_only ou pickup_delivery.",
      });
    }

    if (
      normalizedServiceType === "pickup_only" &&
      !normalizedPickupAddress
    ) {
      return res.status(400).json({
        success: false,
        message:
          "L’adresse de ramassage est obligatoire pour une commande de ramassage seulement.",
      });
    }

    if (
      normalizedServiceType === "delivery_only" &&
      !normalizedDeliveryAddress
    ) {
      return res.status(400).json({
        success: false,
        message:
          "L’adresse de livraison est obligatoire pour une commande de livraison seulement.",
      });
    }

    if (
      normalizedServiceType === "pickup_delivery" &&
      (
        !normalizedPickupAddress ||
        !normalizedDeliveryAddress
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Les adresses de ramassage et de livraison sont obligatoires pour ce type de commande.",
      });
    }

    const databaseAddresses =
      getDatabaseCompatibleAddresses(
        normalizedServiceType,
        normalizedPickupAddress,
        normalizedDeliveryAddress,
      );

    const normalizedPalletsCount =
      pallets_count === undefined ||
      pallets_count === null ||
      pallets_count === ""
        ? 0
        : Number(pallets_count);

    if (
      !Number.isInteger(
        normalizedPalletsCount,
      ) ||
      normalizedPalletsCount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le nombre de palettes doit être un entier positif ou égal à zéro.",
      });
    }

    const normalizedPriority =
      priority || "normal";

    if (
      !ALLOWED_PRIORITIES.includes(
        normalizedPriority,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Priorité de commande invalide.",
      });
    }

    const normalizedStatus =
      status ||
      (normalizedDriverId
        ? "assigned"
        : "pending");

    if (
      !ALLOWED_ORDER_STATUSES.includes(
        normalizedStatus,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Statut de commande invalide.",
      });
    }

    const amounts =
      calculateOrderAmounts({
        subtotal,
        taxes,
        total_amount,
      });

    if (!amounts) {
      return res.status(400).json({
        success: false,
        message:
          "Les montants financiers sont invalides.",
      });
    }

    const normalizedDistance =
      normalizeNullableNumber(
        estimated_distance,
      );

    if (
      normalizedDistance !== null &&
      normalizedDistance < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La distance estimée ne peut pas être négative.",
      });
    }

    const normalizedDuration =
      normalizeNullableNumber(
        estimated_duration,
      );

    if (
      normalizedDuration !== null &&
      (
        !Number.isInteger(
          normalizedDuration,
        ) ||
        normalizedDuration < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La durée estimée doit être exprimée en minutes.",
      });
    }

    const orderNumber =
      await OrderModel.generateOrderNumber();

    const orderData = {
      order_number:
        orderNumber,

      client_id:
        clientId,

      driver_id:
        normalizedDriverId,

      vehicle_id:
        normalizedVehicleId,

      pickup_address:
        databaseAddresses.pickup_address,

      delivery_address:
        databaseAddresses.delivery_address,

      pickup_date:
        pickup_date || null,

      pickup_time:
        pickup_time || null,

      delivery_date:
        delivery_date || null,

      delivery_time:
        delivery_time || null,

      pallets_count:
        normalizedPalletsCount,

      description:
        normalizeOptionalText(
          description,
        ),

      notes:
        normalizeOptionalText(
          notes,
        ),

      subtotal:
        amounts.subtotal,

      taxes:
        amounts.taxes,

      total_amount:
        amounts.total_amount,

      estimated_distance:
        normalizedDistance,

      estimated_duration:
        normalizedDuration,

      priority:
        normalizedPriority,

      onfleet_task_id:
        normalizeOptionalText(
          onfleet_task_id,
        ),

      status:
        normalizedStatus,
    };

    const orderId =
      await OrderModel.createOrder(
        orderData,
      );

    /*
     * Ajoute les arrêts supplémentaires.
     * Les adresses principales restent aussi
     * dans pickup_address et delivery_address.
     */
    if (
      Array.isArray(stops) &&
      stops.length > 0
    ) {
      for (
        let index = 0;
        index < stops.length;
        index += 1
      ) {
        const stop =
          stops[index];

        const stopAddress =
          normalizeOptionalText(
            stop.address,
          );

        if (!stopAddress) {
          continue;
        }

        const stopType =
          ALLOWED_STOP_TYPES.includes(
            stop.stop_type,
          )
            ? stop.stop_type
            : "delivery";

        await OrderModel.createOrderStop(
          orderId,
          {
            stop_order:
              Number.isInteger(
                Number(
                  stop.stop_order,
                ),
              )
                ? Number(
                    stop.stop_order,
                  )
                : index + 1,

            stop_type:
              stopType,

            customer_name:
              normalizeOptionalText(
                stop.customer_name,
              ),

            company_name:
              normalizeOptionalText(
                stop.company_name,
              ),

            contact_name:
              normalizeOptionalText(
                stop.contact_name,
              ),

            phone:
              normalizeOptionalText(
                stop.phone,
              ),

            email:
              normalizeOptionalText(
                stop.email,
              ),

            address:
              stopAddress,

            city:
              normalizeOptionalText(
                stop.city,
              ),

            province:
              normalizeOptionalText(
                stop.province,
              ),

            postal_code:
              normalizeOptionalText(
                stop.postal_code,
              ),

            latitude:
              normalizeNullableNumber(
                stop.latitude,
              ),

            longitude:
              normalizeNullableNumber(
                stop.longitude,
              ),

            scheduled_start:
              stop.scheduled_start ||
              null,

            scheduled_end:
              stop.scheduled_end ||
              null,

            status:
              ALLOWED_STOP_STATUSES.includes(
                stop.status,
              )
                ? stop.status
                : "pending",

            notes:
              normalizeOptionalText(
                stop.notes,
              ),
          },
        );
      }
    }

    await OrderModel.insertStatusHistory(
      orderId,
      normalizedStatus,
      getAuthenticatedUserId(req),
      `Commande créée · type ${normalizedServiceType}`,
    );

    const createdOrder =
      await OrderModel.getOrderById(
        orderId,
      );

    const createdStops =
      await OrderModel.getOrderStops(
        orderId,
      );

    return res.status(201).json({
      success: true,
      message:
        "Commande créée avec succès.",

      data: {
        ...createdOrder,
        stops: createdStops,
      },

      order: {
        ...createdOrder,
        stops: createdStops,
      },
    });
  } catch (error) {
    console.error(
      "Erreur createOrder :",
      error,
    );

    if (
      error.code ===
      "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Le numéro de commande ou la position d’un arrêt existe déjà.",
      });
    }

    if (
      error.code ===
      "ER_NO_REFERENCED_ROW_2"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le client, le chauffeur, le véhicule ou une autre donnée liée n’existe pas.",
      });
    }

    if (
      error.code ===
      "ER_BAD_NULL_ERROR"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Une donnée obligatoire de la commande est manquante.",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la création de la commande.",
      error: error.message,
    });
  }
};

/* ============================================================
   MODIFIER UNE COMMANDE
============================================================ */

const updateOrder = async (
  req,
  res,
) => {
  try {
    const orderId =
      parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    const existingOrder =
      await OrderModel.getOrderById(
        orderId,
      );

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
    }

    const updatedData = {};

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "client_id",
      )
    ) {
      const clientId =
        parsePositiveId(
          req.body.client_id,
        );

      if (!clientId) {
        return res.status(400).json({
          success: false,
          message:
            "Identifiant du client invalide.",
        });
      }

      updatedData.client_id =
        clientId;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "driver_id",
      )
    ) {
      const driverId =
        normalizeNullableId(
          req.body.driver_id,
        );

      if (
        req.body.driver_id &&
        !driverId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Identifiant du chauffeur invalide.",
        });
      }

      updatedData.driver_id =
        driverId;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "vehicle_id",
      )
    ) {
      const vehicleId =
        normalizeNullableId(
          req.body.vehicle_id,
        );

      if (
        req.body.vehicle_id &&
        !vehicleId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Identifiant du véhicule invalide.",
        });
      }

      updatedData.vehicle_id =
        vehicleId;
    }

    const textFields = [
      "pickup_address",
      "delivery_address",
      "description",
      "notes",
      "onfleet_task_id",
    ];

    for (
      const field of textFields
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field,
        )
      ) {
        updatedData[field] =
          normalizeOptionalText(
            req.body[field],
          );
      }
    }

    const requestedServiceType =
      req.body.service_type ||
      req.body.order_type;

    const finalPickupAddress =
      Object.prototype.hasOwnProperty.call(
        updatedData,
        "pickup_address",
      )
        ? updatedData.pickup_address
        : normalizeOptionalText(
            existingOrder.pickup_address,
          );

    const finalDeliveryAddress =
      Object.prototype.hasOwnProperty.call(
        updatedData,
        "delivery_address",
      )
        ? updatedData.delivery_address
        : normalizeOptionalText(
            existingOrder.delivery_address,
          );

    const normalizedServiceType =
      normalizeServiceType(
        requestedServiceType,
        finalPickupAddress,
        finalDeliveryAddress,
      );

    if (!normalizedServiceType) {
      return res.status(400).json({
        success: false,
        message:
          "Le type de commande est invalide ou aucune adresse opérationnelle n’est disponible.",
      });
    }

    if (
      normalizedServiceType === "pickup_only" &&
      !finalPickupAddress
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Une adresse de ramassage est obligatoire pour ce type de commande.",
      });
    }

    if (
      normalizedServiceType === "delivery_only" &&
      !finalDeliveryAddress
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Une adresse de livraison est obligatoire pour ce type de commande.",
      });
    }

    if (
      normalizedServiceType === "pickup_delivery" &&
      (
        !finalPickupAddress ||
        !finalDeliveryAddress
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Les adresses de ramassage et de livraison sont obligatoires pour ce type de commande.",
      });
    }

    const databaseAddresses =
      getDatabaseCompatibleAddresses(
        normalizedServiceType,
        finalPickupAddress,
        finalDeliveryAddress,
      );

    const addressOrServiceTypeChanged =
      Object.prototype.hasOwnProperty.call(
        req.body,
        "pickup_address",
      ) ||
      Object.prototype.hasOwnProperty.call(
        req.body,
        "delivery_address",
      ) ||
      Object.prototype.hasOwnProperty.call(
        req.body,
        "service_type",
      ) ||
      Object.prototype.hasOwnProperty.call(
        req.body,
        "order_type",
      );

    if (addressOrServiceTypeChanged) {
      updatedData.pickup_address =
        databaseAddresses.pickup_address;

      updatedData.delivery_address =
        databaseAddresses.delivery_address;
    }

    const nullableDateFields = [
      "pickup_date",
      "pickup_time",
      "delivery_date",
      "delivery_time",
    ];

    for (
      const field of nullableDateFields
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field,
        )
      ) {
        updatedData[field] =
          req.body[field] || null;
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "pallets_count",
      )
    ) {
      const palletsCount =
        Number(
          req.body.pallets_count,
        );

      if (
        !Number.isInteger(
          palletsCount,
        ) ||
        palletsCount < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Le nombre de palettes est invalide.",
        });
      }

      updatedData.pallets_count =
        palletsCount;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "priority",
      )
    ) {
      if (
        !ALLOWED_PRIORITIES.includes(
          req.body.priority,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Priorité de commande invalide.",
        });
      }

      updatedData.priority =
        req.body.priority;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "status",
      )
    ) {
      if (
        !ALLOWED_ORDER_STATUSES.includes(
          req.body.status,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Statut de commande invalide.",
        });
      }

      updatedData.status =
        req.body.status;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "estimated_distance",
      )
    ) {
      const distance =
        normalizeNullableNumber(
          req.body.estimated_distance,
        );

      if (
        distance !== null &&
        distance < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La distance estimée est invalide.",
        });
      }

      updatedData.estimated_distance =
        distance;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "estimated_duration",
      )
    ) {
      const duration =
        normalizeNullableNumber(
          req.body.estimated_duration,
        );

      if (
        duration !== null &&
        (
          !Number.isInteger(
            duration,
          ) ||
          duration < 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La durée estimée est invalide.",
        });
      }

      updatedData.estimated_duration =
        duration;
    }

    const hasFinancialFields =
      [
        "subtotal",
        "taxes",
        "total_amount",
      ].some((field) =>
        Object.prototype.hasOwnProperty.call(
          req.body,
          field,
        ),
      );

    if (hasFinancialFields) {
      const amounts =
        calculateOrderAmounts({
          subtotal:
            req.body.subtotal ??
            existingOrder.subtotal,

          taxes:
            req.body.taxes ??
            existingOrder.taxes,

          total_amount:
            req.body.total_amount ??
            existingOrder.total_amount,
        });

      if (!amounts) {
        return res.status(400).json({
          success: false,
          message:
            "Les montants financiers sont invalides.",
        });
      }

      Object.assign(
        updatedData,
        amounts,
      );
    }

    const result =
      await OrderModel.updateOrder(
        orderId,
        updatedData,
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Aucune information valide n’a été modifiée.",
      });
    }

    const statusChanged =
      updatedData.status &&
      updatedData.status !==
        existingOrder.status;

    if (statusChanged) {
      await OrderModel.insertStatusHistory(
        orderId,
        updatedData.status,
        getAuthenticatedUserId(req),
        normalizeOptionalText(
          req.body.comment,
        ) || "Statut modifié",
      );
    }

    const nonStatusChanges =
      Object.keys(updatedData).filter(
        (field) =>
          field !== "status" &&
          String(existingOrder?.[field] ?? "") !==
            String(updatedData[field] ?? ""),
      );

    if (nonStatusChanges.length > 0) {
      await OrderModel.insertStatusHistory(
        orderId,
        statusChanged
          ? updatedData.status
          : existingOrder.status,
        getAuthenticatedUserId(req),
        buildOrderAuditComment({
          prefix: "Commande modifiée",
          existingOrder,
          updatedData,
          explicitComment:
            statusChanged
              ? null
              : req.body.comment,
        }),
      );
    }

    const updatedOrder =
      await OrderModel.getOrderById(
        orderId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Commande modifiée avec succès.",
      data: updatedOrder,
      order: updatedOrder,
    });
  } catch (error) {
    console.error(
      "Erreur updateOrder :",
      error,
    );

    if (
      error.code ===
      "ER_NO_REFERENCED_ROW_2"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le client, le chauffeur ou le véhicule sélectionné n’existe pas.",
      });
    }

    if (
      error.code ===
      "ER_BAD_NULL_ERROR"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Une donnée obligatoire de la commande est manquante.",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la modification de la commande.",
      error: error.message,
    });
  }
};

/* ============================================================
   SUPPRIMER UNE COMMANDE
============================================================ */

const deleteOrder = async (
  req,
  res,
) => {
  try {
    const orderId =
      parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    const existingOrder =
      await OrderModel.getOrderById(
        orderId,
      );

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
    }

    if (
      existingOrder.status ===
      "completed"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Une commande terminée ne peut pas être supprimée.",
      });
    }

    const result =
      await OrderModel.deleteOrder(
        orderId,
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Commande supprimée avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur deleteOrder :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la suppression de la commande.",
      error: error.message,
    });
  }
};

/* ============================================================
   ASSIGNER UN CHAUFFEUR
============================================================ */

const assignDriver = async (
  req,
  res,
) => {
  try {
    const orderId =
      parsePositiveId(req.params.id);

    const driverId =
      parsePositiveId(
        req.body.driver_id,
      );

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du chauffeur invalide.",
      });
    }

    const order =
      await OrderModel.getOrderById(
        orderId,
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
    }

    if (
      [
        "completed",
        "cancelled",
      ].includes(order.status)
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Impossible d’assigner un chauffeur à cette commande.",
      });
    }

    const result =
      await OrderModel.assignDriver(
        orderId,
        driverId,
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
    }

    const finalStatus =
      order.status === "pending"
        ? "assigned"
        : order.status;

    await OrderModel.insertStatusHistory(
      orderId,
      finalStatus,
      getAuthenticatedUserId(req),
      normalizeOptionalText(
        req.body.comment,
      ) ||
        `Chauffeur #${driverId} assigné`,
    );

    const updatedOrder =
      await OrderModel.getOrderById(
        orderId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Chauffeur assigné avec succès.",
      data: updatedOrder,
      order: updatedOrder,
    });
  } catch (error) {
    console.error(
      "Erreur assignDriver :",
      error,
    );

    if (
      error.code ===
      "ER_NO_REFERENCED_ROW_2"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le chauffeur sélectionné n’existe pas.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de l’assignation du chauffeur.",
      error: error.message,
    });
  }
};

/* ============================================================
   ASSIGNER UN VÉHICULE
============================================================ */

const assignVehicle = async (
  req,
  res,
) => {
  try {
    const orderId =
      parsePositiveId(req.params.id);

    const vehicleId =
      parsePositiveId(
        req.body.vehicle_id,
      );

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du véhicule invalide.",
      });
    }

    const order =
      await OrderModel.getOrderById(
        orderId,
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
    }

    const result =
      await OrderModel.assignVehicle(
        orderId,
        vehicleId,
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
    }

    const updatedOrder =
      await OrderModel.getOrderById(
        orderId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Véhicule assigné avec succès.",
      data: updatedOrder,
      order: updatedOrder,
    });
  } catch (error) {
    console.error(
      "Erreur assignVehicle :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de l’assignation du véhicule.",
      error: error.message,
    });
  }
};

/* ============================================================
   MODIFIER LE STATUT
============================================================ */

const updateOrderStatus = async (
  req,
  res,
) => {
  try {
    const orderId =
      parsePositiveId(req.params.id);

    const {
      status,
      comment,
      reason,
      status_reason,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    if (
      !status ||
      !ALLOWED_ORDER_STATUSES.includes(
        status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Statut de commande invalide.",
      });
    }

    const order =
      await OrderModel.getOrderById(
        orderId,
      );

    if (!order) {
      return sendOrderNotFound(res);
    }

    const access =
      await authorizeOrderAccess(
        req,
        order,
      );

    if (!access.authorized) {
      return sendOrderNotFound(res);
    }

    if (
      order.status === status
    ) {
      return res.status(409).json({
        success: false,
        message:
          "La commande possède déjà ce statut.",
      });
    }

    /*
     * Un chauffeur ne peut pas sauter les étapes.
     * Les corrections opérationnelles restent possibles pour
     * super_admin / dispatcher.
     */
    if (
      access.role === "driver" &&
      !isAllowedDriverTransition(
        order.status,
        status,
      )
    ) {
      return res.status(409).json({
        success: false,
        code:
          "INVALID_DRIVER_STATUS_TRANSITION",
        message:
          "Cette étape n’est pas autorisée dans l’état actuel de la livraison.",
      });
    }

    /*
     * Un chauffeur ne peut pas terminer manuellement une
     * livraison sans preuve complète.
     *
     * La route POST /:id/proofs crée la preuve et passe ensuite
     * la commande à completed automatiquement.
     */
    if (
      status === "completed" &&
      access.role === "driver"
    ) {
      const proofs =
        await OrderModel.getDeliveryProofs(
          orderId,
        );

      const hasCompleteProof =
        proofs.some((proof) =>
          Boolean(
            proof.signature_url &&
            proof.photo_url &&
            (
              proof.receiver_first_name ||
              proof.receiver_last_name
            )
          )
        );

      if (!hasCompleteProof) {
        return res.status(409).json({
          success: false,
          code:
            "DELIVERY_PROOF_REQUIRED",
          message:
            "La photo, la signature et le nom du destinataire sont obligatoires avant de terminer la livraison.",
        });
      }
    }

    const result =
      await OrderModel.updateStatus(
        orderId,
        status,
      );

    if (
      result.affectedRows === 0
    ) {
      return sendOrderNotFound(res);
    }

    const auditComment =
      normalizeOptionalText(
        comment ||
        reason ||
        status_reason,
      );

    await OrderModel.insertStatusHistory(
      orderId,
      status,
      getAuthenticatedUserId(req),
      auditComment,
    );

    const updatedOrder =
      await OrderModel.getOrderById(
        orderId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Statut modifié avec succès.",
      data: updatedOrder,
      order: updatedOrder,
    });
  } catch (error) {
    console.error(
      "Erreur updateOrderStatus :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la modification du statut.",
    });
  }
};

/* ============================================================
   COMMANDES D’UN CHAUFFEUR
============================================================ */

const getDriverOrders = async (
  req,
  res,
) => {
  try {
    const requestedDriverId =
      parsePositiveId(
        req.params.driverId,
      );

    if (!requestedDriverId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du chauffeur invalide.",
      });
    }

    const role =
      getAuthenticatedRole(req);

    let driverId =
      requestedDriverId;

    if (role === "driver") {
      const authenticatedDriver =
        await getAuthenticatedDriver(req);

      if (
        !authenticatedDriver ||
        Number(
          authenticatedDriver.id,
        ) !==
          Number(
            requestedDriverId,
          )
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Chauffeur introuvable.",
        });
      }

      driverId =
        authenticatedDriver.id;
    }

    const orders =
      await OrderModel.getDriverOrders(
        driverId,
      );

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
      orders,
    });
  } catch (error) {
    console.error(
      "Erreur getDriverOrders :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération des commandes du chauffeur.",
    });
  }
};

/* ============================================================
   RÉCUPÉRER LES ARRÊTS
============================================================ */

const getOrderStops = async (
  req,
  res,
) => {
  try {
    const orderId =
      parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    const order =
      await OrderModel.getOrderById(
        orderId,
      );

    if (!order) {
      return sendOrderNotFound(res);
    }

    const access =
      await authorizeOrderAccess(
        req,
        order,
      );

    if (!access.authorized) {
      return sendOrderNotFound(res);
    }

    const stops =
      await OrderModel.getOrderStops(
        orderId,
      );

    return res.status(200).json({
      success: true,
      count: stops.length,
      data: stops,
      stops,
    });
  } catch (error) {
    console.error(
      "Erreur getOrderStops :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération des arrêts.",
    });
  }
};

/* ============================================================
   AJOUTER UN ARRÊT
============================================================ */

const addOrderStop = async (
  req,
  res,
) => {
  try {
    const orderId =
      parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    const order =
      await OrderModel.getOrderById(
        orderId,
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
    }

    const {
      stop_order,
      stop_type,
      address,
      status,
    } = req.body;

    const stopOrder =
      Number(stop_order);

    if (
      !Number.isInteger(stopOrder) ||
      stopOrder <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La position de l’arrêt est invalide.",
      });
    }

    if (
      !ALLOWED_STOP_TYPES.includes(
        stop_type,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Type d’arrêt invalide.",
      });
    }

    const normalizedAddress =
      normalizeOptionalText(address);

    if (!normalizedAddress) {
      return res.status(400).json({
        success: false,
        message:
          "L’adresse de l’arrêt est obligatoire.",
      });
    }

    if (
      status &&
      !ALLOWED_STOP_STATUSES.includes(
        status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Statut de l’arrêt invalide.",
      });
    }

    const stopId =
      await OrderModel.createOrderStop(
        orderId,
        {
          ...req.body,

          stop_order:
            stopOrder,

          stop_type,

          address:
            normalizedAddress,

          customer_name:
            normalizeOptionalText(
              req.body.customer_name,
            ),

          company_name:
            normalizeOptionalText(
              req.body.company_name,
            ),

          contact_name:
            normalizeOptionalText(
              req.body.contact_name,
            ),

          phone:
            normalizeOptionalText(
              req.body.phone,
            ),

          email:
            normalizeOptionalText(
              req.body.email,
            ),

          city:
            normalizeOptionalText(
              req.body.city,
            ),

          province:
            normalizeOptionalText(
              req.body.province,
            ),

          postal_code:
            normalizeOptionalText(
              req.body.postal_code,
            ),

          latitude:
            normalizeNullableNumber(
              req.body.latitude,
            ),

          longitude:
            normalizeNullableNumber(
              req.body.longitude,
            ),

          status:
            status || "pending",

          notes:
            normalizeOptionalText(
              req.body.notes,
            ),
        },
      );

    const stop =
      await OrderModel.getOrderStopById(
        stopId,
      );

    return res.status(201).json({
      success: true,
      message:
        "Arrêt ajouté avec succès.",
      data: stop,
      stop,
    });
  } catch (error) {
    console.error(
      "Erreur addOrderStop :",
      error,
    );

    if (
      error.code ===
      "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Cette position d’arrêt existe déjà dans la commande.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de l’ajout de l’arrêt.",
      error: error.message,
    });
  }
};

/* ============================================================
   MODIFIER UN ARRÊT
============================================================ */

const updateOrderStop = async (
  req,
  res,
) => {
  try {
    const stopId =
      parsePositiveId(
        req.params.stopId,
      );

    if (!stopId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de l’arrêt invalide.",
      });
    }

    const existingStop =
      await OrderModel.getOrderStopById(
        stopId,
      );

    if (!existingStop) {
      return res.status(404).json({
        success: false,
        message:
          "Arrêt introuvable.",
      });
    }

    const stopOrderId =
      parsePositiveId(
        existingStop.order_id,
      );

    if (!stopOrderId) {
      return res.status(404).json({
        success: false,
        message:
          "Arrêt introuvable.",
      });
    }

    const order =
      await OrderModel.getOrderById(
        stopOrderId,
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Arrêt introuvable.",
      });
    }

    const access =
      await authorizeOrderAccess(
        req,
        order,
      );

    if (!access.authorized) {
      return res.status(404).json({
        success: false,
        message:
          "Arrêt introuvable.",
      });
    }

    if (
      req.body.stop_type &&
      !ALLOWED_STOP_TYPES.includes(
        req.body.stop_type,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Type d’arrêt invalide.",
      });
    }

    if (
      req.body.status &&
      !ALLOWED_STOP_STATUSES.includes(
        req.body.status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Statut d’arrêt invalide.",
      });
    }

    if (
      req.body.stop_order !==
      undefined
    ) {
      const stopOrder =
        Number(
          req.body.stop_order,
        );

      if (
        !Number.isInteger(
          stopOrder,
        ) ||
        stopOrder <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Position de l’arrêt invalide.",
        });
      }
    }

    if (
      req.body.address !==
        undefined &&
      !normalizeOptionalText(
        req.body.address,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "L’adresse de l’arrêt est obligatoire.",
      });
    }

    const result =
      await OrderModel.updateOrderStop(
        stopId,
        req.body,
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Aucune information valide n’a été modifiée.",
      });
    }

    const updatedStop =
      await OrderModel.getOrderStopById(
        stopId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Arrêt modifié avec succès.",
      data: updatedStop,
      stop: updatedStop,
    });
  } catch (error) {
    console.error(
      "Erreur updateOrderStop :",
      error,
    );

    if (
      error.code ===
      "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Cette position d’arrêt existe déjà.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la modification de l’arrêt.",
    });
  }
};

/* ============================================================
   SUPPRIMER UN ARRÊT
============================================================ */

const deleteOrderStop = async (
  req,
  res,
) => {
  try {
    const stopId =
      parsePositiveId(
        req.params.stopId,
      );

    if (!stopId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de l’arrêt invalide.",
      });
    }

    const existingStop =
      await OrderModel.getOrderStopById(
        stopId,
      );

    if (!existingStop) {
      return res.status(404).json({
        success: false,
        message:
          "Arrêt introuvable.",
      });
    }

    const result =
      await OrderModel.deleteOrderStop(
        stopId,
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Arrêt introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Arrêt supprimé avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur deleteOrderStop :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la suppression de l’arrêt.",
      error: error.message,
    });
  }
};

/* ============================================================
   HISTORIQUE DE LA COMMANDE
============================================================ */

const getOrderTimeline = async (
  req,
  res,
) => {
  try {
    const orderId =
      parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    const order =
      await OrderModel.getOrderById(
        orderId,
      );

    if (!order) {
      return sendOrderNotFound(res);
    }

    const access =
      await authorizeOrderAccess(
        req,
        order,
      );

    if (!access.authorized) {
      return sendOrderNotFound(res);
    }

    const timeline =
      await OrderModel.getOrderTimeline(
        orderId,
      );

    return res.status(200).json({
      success: true,
      count: timeline.length,
      data: timeline,
      timeline,
    });
  } catch (error) {
    console.error(
      "Erreur getOrderTimeline :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération de l’historique.",
    });
  }
};

/* ============================================================
   PREUVES DE LIVRAISON
============================================================ */

const getDeliveryProofs = async (
  req,
  res,
) => {
  try {
    const orderId =
      parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    const order =
      await OrderModel.getOrderById(
        orderId,
      );

    if (!order) {
      return sendOrderNotFound(res);
    }

    const access =
      await authorizeOrderAccess(
        req,
        order,
      );

    if (!access.authorized) {
      return sendOrderNotFound(res);
    }

    const proofs =
      await OrderModel.getDeliveryProofs(
        orderId,
      );

    return res.status(200).json({
      success: true,
      count: proofs.length,
      data: proofs,
      proofs,
    });
  } catch (error) {
    console.error(
      "Erreur getDeliveryProofs :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération des preuves de livraison.",
    });
  }
};

/* ============================================================
   CRÉER UNE PREUVE DE LIVRAISON
============================================================ */

const createDeliveryProof = async (
  req,
  res,
) => {
  try {
    const orderId =
      parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    const order =
      await OrderModel.getOrderById(
        orderId,
      );

    if (!order) {
      return sendOrderNotFound(res);
    }

    const access =
      await authorizeOrderAccess(
        req,
        order,
      );

    if (!access.authorized) {
      return sendOrderNotFound(res);
    }

    /*
     * Pour un chauffeur, l'identité ne vient JAMAIS de req.body.
     * Elle est dérivée du JWT -> users.id -> drivers.user_id.
     */
    let driverId = null;

    if (access.role === "driver") {
      driverId =
        parsePositiveId(
          access.driver?.id,
        );

      if (
        !driverId ||
        Number(order.driver_id) !==
          Number(driverId)
      ) {
        return sendOrderNotFound(res);
      }

      /*
       * La preuve finale ne peut être créée que lorsque
       * le chauffeur a réellement atteint l'étape "arrived".
       */
      if (
        order.status !== "arrived"
      ) {
        return res.status(409).json({
          success: false,
          code:
            "DELIVERY_NOT_ARRIVED",
          message:
            "La preuve de livraison peut être enregistrée uniquement après avoir confirmé l’arrivée.",
        });
      }
    } else {
      driverId =
        parsePositiveId(
          req.body?.driver_id ||
          order.driver_id,
        );

      if (!driverId) {
        return res.status(400).json({
          success: false,
          message:
            "Aucun chauffeur valide n’est associé à cette commande.",
        });
      }

      if (
        order.driver_id &&
        Number(order.driver_id) !==
          Number(driverId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Ce chauffeur n’est pas assigné à cette commande.",
        });
      }
    }

    const photoFile =
      req.files?.photo?.[0] ||
      null;

    const signatureFile =
      req.files?.signature?.[0] ||
      null;

    const receiverFirstName =
      normalizeOptionalText(
        req.body?.receiver_first_name,
      );

    const receiverLastName =
      normalizeOptionalText(
        req.body?.receiver_last_name,
      );

    const recipientName =
      normalizeOptionalText(
        req.body?.recipient_name,
      );

    const notes =
      normalizeOptionalText(
        req.body?.notes,
      );

    const isNewDeliveryProof =
      Boolean(
        photoFile ||
        signatureFile ||
        receiverFirstName ||
        receiverLastName,
      );

    if (isNewDeliveryProof) {
      if (
        !receiverFirstName &&
        !receiverLastName
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Le prénom ou le nom du destinataire est obligatoire.",
        });
      }

      if (!photoFile) {
        return res.status(400).json({
          success: false,
          message:
            "La photo de livraison est obligatoire.",
        });
      }

      if (!signatureFile) {
        return res.status(400).json({
          success: false,
          message:
            "La signature du destinataire est obligatoire.",
        });
      }

      const uploadedFiles =
        await uploadDeliveryProofFiles({
          photo: photoFile,
          signature: signatureFile,
          orderId,
        });

      const proofId =
        await OrderModel.createDeliveryProof({
          order_id:
            orderId,

          driver_id:
            driverId,

          receiver_first_name:
            receiverFirstName,

          receiver_last_name:
            receiverLastName,

          signature_url:
            uploadedFiles.signature.url,

          photo_url:
            uploadedFiles.photo.url,

          notes,
        });

      if (
        order.status !== "completed"
      ) {
        await OrderModel.updateStatus(
          orderId,
          "completed",
        );

        await OrderModel.insertStatusHistory(
          orderId,
          "completed",
          getAuthenticatedUserId(req),
          "Livraison terminée avec photo et signature du destinataire",
        );
      }

      const [
        updatedOrder,
        proofs,
        timeline,
      ] = await Promise.all([
        OrderModel.getOrderById(
          orderId,
        ),

        OrderModel.getDeliveryProofs(
          orderId,
        ),

        OrderModel.getOrderTimeline(
          orderId,
        ),
      ]);

      const createdProof =
        proofs.find(
          (proof) =>
            Number(proof.id) ===
            Number(proofId),
        ) ||
        proofs[0] ||
        null;

      return res.status(201).json({
        success: true,
        message:
          "Livraison terminée et preuve enregistrée avec succès.",

        proof_id:
          proofId,

        proof:
          createdProof,

        order:
          updatedOrder,

        timeline,

        data: {
          proof:
            createdProof,
          order:
            updatedOrder,
          timeline,
        },
      });
    }

    /*
     * L'ancien format JSON accepte des URL fournies par le client.
     * Pour éviter qu'un chauffeur puisse fabriquer une preuve à partir
     * d'une URL arbitraire, il est réservé aux rôles opérationnels.
     */
    if (access.role === "driver") {
      return res.status(400).json({
        success: false,
        message:
          "Une photo, une signature et le nom du destinataire sont obligatoires.",
      });
    }

    const allowedProofTypes = [
      "photo",
      "signature",
      "code",
      "document",
    ];

    const proofType =
      normalizeOptionalText(
        req.body?.proof_type,
      );

    if (
      !proofType ||
      !allowedProofTypes.includes(
        proofType,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Type de preuve invalide.",
      });
    }

    const fileUrl =
      normalizeOptionalText(
        req.body?.file_url,
      );

    if (
      ["photo", "signature"].includes(
        proofType,
      ) &&
      !fileUrl
    ) {
      return res.status(400).json({
        success: false,
        message:
          "L’URL du fichier est obligatoire pour cette preuve.",
      });
    }

    const proofId =
      await OrderModel.createDeliveryProof({
        ...req.body,

        order_id:
          orderId,

        driver_id:
          driverId,

        proof_type:
          proofType,

        file_url:
          fileUrl,

        recipient_name:
          recipientName,

        notes,
      });

    return res.status(201).json({
      success: true,
      message:
        "Preuve de livraison enregistrée.",
      data: {
        id: proofId,
      },
    });
  } catch (error) {
    console.error(
      "Erreur createDeliveryProof :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de l’enregistrement de la preuve de livraison.",
    });
  }
};

/* ============================================================
   BONS DE LIVRAISON
============================================================ */

// Récupérer tous les bons de livraison
const getAllDeliveryNotes = async (req, res) => {
  try {
    const orders = await OrderModel.getAllOrders();

    const deliveryNotes = await Promise.all(
      orders.map(async (order) => {
        const [stops, proofs] = await Promise.all([
          OrderModel.getOrderStops(order.id),
          OrderModel.getDeliveryProofs(order.id),
        ]);

        return {
          ...order,
          stops,
          proofs,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: deliveryNotes.length,
      data: deliveryNotes,
      deliveryNotes,
    });
  } catch (error) {
    console.error(
      "Erreur getAllDeliveryNotes :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération des bons de livraison.",
      error: error.message,
    });
  }
};

// Récupérer un bon de livraison par commande
const getDeliveryNoteByOrderId = async (
  req,
  res,
) => {
  try {
    const orderId =
      parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    const order =
      await OrderModel.getOrderById(
        orderId,
      );

    if (!order) {
      return sendOrderNotFound(res);
    }

    const access =
      await authorizeOrderAccess(
        req,
        order,
      );

    if (!access.authorized) {
      return sendOrderNotFound(res);
    }

    const [
      stops,
      timeline,
      proofs,
    ] = await Promise.all([
      OrderModel.getOrderStops(
        orderId,
      ),
      OrderModel.getOrderTimeline(
        orderId,
      ),
      OrderModel.getDeliveryProofs(
        orderId,
      ),
    ]);

    const deliveryNote = {
      ...order,
      stops,
      timeline,
      proofs,
    };

    return res.status(200).json({
      success: true,
      data: deliveryNote,
      deliveryNote,
    });
  } catch (error) {
    console.error(
      "Erreur getDeliveryNoteByOrderId :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération du bon de livraison.",
    });
  }
};

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,

  assignDriver,
  assignVehicle,

  updateOrderStatus,

  getDriverOrders,

  getOrderStops,
  addOrderStop,
  updateOrderStop,
  deleteOrderStop,

  getOrderTimeline,

  getDeliveryProofs,
  createDeliveryProof,

    getAllDeliveryNotes,
  getDeliveryNoteByOrderId,
};
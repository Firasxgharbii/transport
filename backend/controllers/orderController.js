const OrderModel = require("../models/orderModel");

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
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
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
      error: error.message,
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

    if (!normalizedPickupAddress) {
      return res.status(400).json({
        success: false,
        message:
          "L’adresse de ramassage est obligatoire.",
      });
    }

    const normalizedDeliveryAddress =
      normalizeOptionalText(
        delivery_address,
      );

    if (!normalizedDeliveryAddress) {
      return res.status(400).json({
        success: false,
        message:
          "L’adresse de livraison est obligatoire.",
      });
    }

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
        normalizedPickupAddress,

      delivery_address:
        normalizedDeliveryAddress,

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
      "Commande créée",
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

    if (
      updatedData.pickup_address ===
      null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "L’adresse de ramassage est obligatoire.",
      });
    }

    if (
      updatedData.delivery_address ===
      null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "L’adresse de livraison est obligatoire.",
      });
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

    if (
      updatedData.status &&
      updatedData.status !==
        existingOrder.status
    ) {
      await OrderModel.insertStatusHistory(
        orderId,
        updatedData.status,
        getAuthenticatedUserId(req),
        normalizeOptionalText(
          req.body.comment,
        ) || "Statut modifié",
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
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
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

    /* ----------------------------------------------------------
       Un chauffeur ne peut pas terminer manuellement une
       livraison sans preuve complète.

       La route POST /:id/proofs crée la preuve et passe ensuite
       la commande à completed automatiquement.
    ---------------------------------------------------------- */

    const authenticatedRole =
      req.user?.role ||
      req.user?.role_name ||
      req.user?.roleName ||
      null;

    if (
      status === "completed" &&
      authenticatedRole === "driver"
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
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
    }

    await OrderModel.insertStatusHistory(
      orderId,
      status,
      getAuthenticatedUserId(req),
      normalizeOptionalText(
        comment,
      ),
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
      error: error.message,
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
    const driverId =
      parsePositiveId(
        req.params.driverId,
      );

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du chauffeur invalide.",
      });
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
      error: error.message,
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
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
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
      error: error.message,
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
      error: error.message,
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
      error: error.message,
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
      error: error.message,
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
      return res.status(404).json({
        success: false,
        message:
          "Commande introuvable.",
      });
    }

    const driverId =
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

    /* ----------------------------------------------------------
       NOUVEAU FORMAT : multipart/form-data
       photo + signature + nom du destinataire
    ---------------------------------------------------------- */

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

      /* --------------------------------------------------------
         Une preuve complète termine automatiquement la commande.
      -------------------------------------------------------- */

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

    /* ----------------------------------------------------------
       COMPATIBILITÉ AVEC L’ANCIEN FORMAT JSON
       proof_type + file_url
    ---------------------------------------------------------- */

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
      error: error.message,
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
const getDeliveryNoteByOrderId = async (req, res) => {
  try {
    const orderId = parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de commande invalide.",
      });
    }

    const order =
      await OrderModel.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Commande introuvable.",
      });
    }

    const [stops, timeline, proofs] =
      await Promise.all([
        OrderModel.getOrderStops(orderId),
        OrderModel.getOrderTimeline(orderId),
        OrderModel.getDeliveryProofs(orderId),
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
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération du bon de livraison.",
      error: error.message,
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
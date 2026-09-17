const OrderModel = require("../models/orderModel");
const DriverModel = require("../models/driverModel");
const ClientModel = require("../models/clientModel");

const {
  notifyAdmin,
} = require("../services/notificationService");

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


const ALLOWED_DESTINATION_TYPES = ["residential", "commercial"];
const ALLOWED_PACKAGE_TYPES = ["box", "pallet"];
const ALLOWED_WEIGHT_UNITS = ["lb", "kg"];
const ALLOWED_DIMENSION_UNITS = ["in", "cm"];

function normalizeBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "oui", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "non", "off"].includes(normalized)) return false;
  return defaultValue;
}

function normalizeLimitedText(value, maxLength) {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  return text.slice(0, maxLength);
}

function buildClientPickupAddress(client) {
  return [client?.address, client?.city, client?.province, client?.postal_code]
    .map((part) => normalizeOptionalText(part))
    .filter(Boolean)
    .join(", ");
}

function isIsoDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

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

const getMyOrders = async (req, res) => {
  try {
    const role = getAuthenticatedRole(req);
    if (role !== "client") {
      return res.status(403).json({ success: false, message: "Accès réservé aux clients." });
    }

    const client = await getAuthenticatedClient(req);
    if (!client) {
      return res.status(403).json({ success: false, message: "Profil client introuvable." });
    }

    const orders = await OrderModel.getClientOrders(client.id);
    return res.status(200).json({ success: true, count: orders.length, data: orders, orders });
  } catch (error) {
    console.error("Erreur getMyOrders :", error);
    return res.status(500).json({ success: false, message: "Erreur lors de la récupération de vos commandes." });
  }
};

const getOrderById = async (
  req,
  res,
) => {
  try {
    const orderId = parsePositiveId(req.params.id);

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Identifiant de commande invalide." });
    }

    const order = await OrderModel.getOrderById(orderId);
    if (!order) return sendOrderNotFound(res);

    const access = await authorizeOrderAccess(req, order);
    if (!access.authorized) return sendOrderNotFound(res);

    const [stops, timeline, proofs, packages] = await Promise.all([
      OrderModel.getOrderStops(orderId),
      OrderModel.getOrderTimeline(orderId),
      OrderModel.getDeliveryProofs(orderId),
      OrderModel.getOrderPackages(orderId),
    ]);

    const fullOrder = { ...order, stops, timeline, proofs, packages };

    return res.status(200).json({
      success: true,
      data: fullOrder,
      order: fullOrder,
    });
  } catch (error) {
    console.error("Erreur getOrderById :", error);
    return res.status(500).json({ success: false, message: "Erreur lors de la récupération de la commande." });
  }
};

/* ============================================================
   CRÉER UNE COMMANDE
============================================================ */

const createOrder = async (req, res) => {
  let createdOrderId = null;

  try {
    const role = getAuthenticatedRole(req);
    const privileged = isPrivilegedRole(role);

    if (!privileged && role !== "client") {
      return res.status(403).json({ success: false, message: "Vous n’êtes pas autorisé à créer une commande." });
    }

    let client = null;
    let clientId = null;

    if (role === "client") {
      client = await getAuthenticatedClient(req);
      if (!client) {
        return res.status(403).json({ success: false, message: "Profil client introuvable." });
      }
      clientId = Number(client.id);

      const hasCompletePickupAddress =
        await ClientModel.hasCompleteAddress(client.id);

      if (!hasCompletePickupAddress) {
        return res.status(400).json({
          success: false,
          code: "CLIENT_PICKUP_ADDRESS_REQUIRED",
          message:
            "Votre adresse de ramassage n’est pas complète. Veuillez compléter votre profil avant de créer une commande.",
        });
      }
    } else {
      clientId = parsePositiveId(req.body.client_id);
      if (!clientId) {
        return res.status(400).json({ success: false, message: "Le client est obligatoire et doit être valide." });
      }
    }

    const requestedPickupAddress = role === "client"
      ? normalizeLimitedText(buildClientPickupAddress(client), 500)
      : normalizeLimitedText(req.body.pickup_address, 500);
    const requestedDeliveryAddress = normalizeLimitedText(req.body.delivery_address, 500);

    const serviceType = normalizeServiceType(
      req.body.service_type || req.body.order_type,
      requestedPickupAddress,
      requestedDeliveryAddress,
    );

    if (!serviceType) {
      return res.status(400).json({
        success: false,
        message: "Le type de commande est invalide ou aucune adresse opérationnelle n’est disponible.",
      });
    }

    if (serviceType === "pickup_only" && !requestedPickupAddress) {
      return res.status(400).json({ success: false, message: "Une adresse de ramassage est obligatoire pour ce type de commande." });
    }
    if (serviceType === "delivery_only" && !requestedDeliveryAddress) {
      return res.status(400).json({ success: false, message: "Une adresse de livraison est obligatoire pour ce type de commande." });
    }
    if (serviceType === "pickup_delivery" && (!requestedPickupAddress || !requestedDeliveryAddress)) {
      return res.status(400).json({ success: false, message: "Les adresses de ramassage et de livraison sont obligatoires pour ce type de commande." });
    }

    const databaseAddresses = getDatabaseCompatibleAddresses(
      serviceType,
      requestedPickupAddress,
      requestedDeliveryAddress,
    );

    const destinationType = String(req.body.destination_type || "residential").trim().toLowerCase();
    if (!ALLOWED_DESTINATION_TYPES.includes(destinationType)) {
      return res.status(400).json({ success: false, message: "Type d’adresse de destination invalide." });
    }

    const packageType = String(req.body.package_type || "box").trim().toLowerCase();
    if (!ALLOWED_PACKAGE_TYPES.includes(packageType)) {
      return res.status(400).json({ success: false, message: "Type de colis invalide." });
    }

    const quantity = Number(req.body.quantity ?? req.body.package_quantity ?? req.body.pallets_count ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return res.status(400).json({ success: false, message: "La quantité doit être comprise entre 1 et 100." });
    }

    const weight = normalizeNullableNumber(req.body.weight);
    if (weight === null || weight <= 0 || weight > 100000) {
      return res.status(400).json({ success: false, message: "Le poids doit être supérieur à zéro." });
    }

    const weightUnit = String(req.body.weight_unit || "kg").trim().toLowerCase();
    if (!ALLOWED_WEIGHT_UNITS.includes(weightUnit)) {
      return res.status(400).json({ success: false, message: "Unité de poids invalide." });
    }

    const dimensionUnit = String(req.body.dimension_unit || "cm").trim().toLowerCase();
    if (!ALLOWED_DIMENSION_UNITS.includes(dimensionUnit)) {
      return res.status(400).json({ success: false, message: "Unité de dimensions invalide." });
    }

    const dimensions = {};
    for (const field of ["length", "width", "height"]) {
      const value = normalizeNullableNumber(req.body[field]);
      if (value !== null && (value <= 0 || value > 10000)) {
        return res.status(400).json({ success: false, message: `La dimension ${field} est invalide.` });
      }
      dimensions[field] = value;
    }

    const splitDateTime = (value, explicitTime) => {
      const normalized = normalizeOptionalText(value);
      const normalizedTime = normalizeOptionalText(explicitTime);
      if (!normalized) return { date: null, time: normalizedTime };

      const match = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2})(?::\d{2})?)?$/);
      if (!match || !isIsoDate(match[1])) return null;
      return { date: match[1], time: normalizedTime || match[2] || null };
    };

    const pickupSchedule = splitDateTime(req.body.pickup_date, req.body.pickup_time);
    const deliverySchedule = splitDateTime(req.body.delivery_date, req.body.delivery_time);
    if (!pickupSchedule || !deliverySchedule) {
      return res.status(400).json({
        success: false,
        message: "Format de date invalide. Utilisez AAAA-MM-JJ ou AAAA-MM-JJTHH:MM.",
      });
    }

    if ((serviceType === "pickup_only" || serviceType === "pickup_delivery") && !pickupSchedule.date) {
      return res.status(400).json({ success: false, message: "La date de ramassage est obligatoire." });
    }
    if ((serviceType === "delivery_only" || serviceType === "pickup_delivery") && !deliverySchedule.date) {
      return res.status(400).json({ success: false, message: "La date de livraison est obligatoire." });
    }

    const signatureRequired = normalizeBoolean(req.body.signature_required, false);
    const companyName = destinationType === "commercial" ? normalizeLimitedText(req.body.company_name, 150) : null;
    const contactName = normalizeLimitedText(req.body.contact_name, 150);
    const contactPhone = normalizeLimitedText(req.body.contact_phone, 30);
    const contactExtension = normalizeLimitedText(req.body.contact_extension, 20);
    const deliveryUnit = normalizeLimitedText(req.body.delivery_unit, 50);
    const notes = normalizeLimitedText(req.body.notes, 2000);
    const description = normalizeLimitedText(req.body.description, 500);

    if (!description) {
      return res.status(400).json({ success: false, message: "La description de la marchandise est obligatoire." });
    }

    let driverId = null;
    let vehicleId = null;
    let priority = "normal";
    let status = "pending";
    let subtotal = 0;
    let taxes = 0;
    let totalAmount = 0;

    if (privileged) {
      driverId = normalizeNullableId(req.body.driver_id);
      vehicleId = normalizeNullableId(req.body.vehicle_id);
      priority = ALLOWED_PRIORITIES.includes(req.body.priority) ? req.body.priority : "normal";
      status = ALLOWED_ORDER_STATUSES.includes(req.body.status)
        ? req.body.status
        : (driverId ? "assigned" : "pending");

      const amounts = calculateOrderAmounts({
        subtotal: req.body.subtotal,
        taxes: req.body.taxes,
        total_amount: req.body.total_amount,
      });
      if (!amounts) {
        return res.status(400).json({ success: false, message: "Les montants financiers sont invalides." });
      }
      subtotal = amounts.subtotal;
      taxes = amounts.taxes;
      totalAmount = amounts.total_amount;
    }

    const palletsCount = packageType === "pallet"
      ? quantity
      : Math.max(0, Number.isInteger(Number(req.body.pallets_count)) ? Number(req.body.pallets_count) : 0);
    const orderNumber = await OrderModel.generateOrderNumber();

    const orderData = {
      order_number: orderNumber,
      client_id: clientId,
      driver_id: driverId,
      pickup_driver_id: privileged ? normalizeNullableId(req.body.pickup_driver_id) : null,
      delivery_driver_id: privileged ? normalizeNullableId(req.body.delivery_driver_id) : null,
      vehicle_id: vehicleId,
      pickup_address: databaseAddresses.pickup_address,
      delivery_address: databaseAddresses.delivery_address,
      destination_type: destinationType,
      company_name: companyName,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_extension: contactExtension,
      delivery_unit: deliveryUnit,
      signature_required: signatureRequired,
      pickup_date: pickupSchedule.date,
      pickup_time: pickupSchedule.time,
      delivery_date: deliverySchedule.date,
      delivery_time: deliverySchedule.time,
      pallets_count: palletsCount,
      description,
      notes,
      subtotal,
      taxes,
      total_amount: totalAmount,
      estimated_distance: privileged ? normalizeNullableNumber(req.body.estimated_distance) : null,
      estimated_duration: privileged ? normalizeNullableNumber(req.body.estimated_duration) : null,
      priority,
      route_position: privileged ? normalizeNullableNumber(req.body.route_position) : null,
      onfleet_task_id: privileged ? normalizeOptionalText(req.body.onfleet_task_id) : null,
      status,
    };

    createdOrderId = await OrderModel.createOrder(orderData);

    const pickupCity = role === "client"
      ? normalizeLimitedText(client?.city, 100)
      : normalizeLimitedText(req.body.pickup_city, 100);
    const pickupProvince = role === "client"
      ? normalizeLimitedText(client?.province, 100)
      : normalizeLimitedText(req.body.pickup_province, 100);
    const pickupPostalCode = role === "client"
      ? normalizeLimitedText(client?.postal_code, 20)
      : normalizeLimitedText(req.body.pickup_postal_code, 20);
    const deliveryCity = normalizeLimitedText(req.body.delivery_city, 100);
    const deliveryProvince = normalizeLimitedText(req.body.delivery_province, 100);
    const deliveryPostalCode = normalizeLimitedText(req.body.delivery_postal_code, 20);

    let stopOrder = 1;
    if (serviceType === "pickup_only" || serviceType === "pickup_delivery") {
      await OrderModel.createOrderStop(createdOrderId, {
        stop_order: stopOrder++,
        stop_type: "pickup",
        customer_name: role === "client" ? [client?.first_name, client?.last_name].filter(Boolean).join(" ") || null : null,
        company_name: role === "client" ? client?.company_name || null : null,
        contact_name: role === "client" ? [client?.first_name, client?.last_name].filter(Boolean).join(" ") || null : null,
        phone: role === "client" ? client?.phone || null : null,
        email: role === "client" ? client?.email || null : null,
        address: requestedPickupAddress,
        city: pickupCity,
        province: pickupProvince,
        postal_code: pickupPostalCode,
        latitude: role === "client" ? null : normalizeNullableNumber(req.body.pickup_latitude),
        longitude: role === "client" ? null : normalizeNullableNumber(req.body.pickup_longitude),
        status: "pending",
        notes: null,
      });
    }

    if (serviceType === "delivery_only" || serviceType === "pickup_delivery") {
      await OrderModel.createOrderStop(createdOrderId, {
        stop_order: stopOrder++,
        stop_type: "delivery",
        customer_name: contactName,
        company_name: companyName,
        contact_name: contactName,
        phone: contactPhone,
        email: null,
        address: requestedDeliveryAddress,
        city: deliveryCity,
        province: deliveryProvince,
        postal_code: deliveryPostalCode,
        latitude: normalizeNullableNumber(req.body.delivery_latitude),
        longitude: normalizeNullableNumber(req.body.delivery_longitude),
        status: "pending",
        notes: deliveryUnit ? `Unité / suite : ${deliveryUnit}` : null,
      });
    }

    if (privileged && Array.isArray(req.body.stops)) {
      for (let index = 0; index < req.body.stops.length; index += 1) {
        const stop = req.body.stops[index] || {};
        const stopAddress = normalizeLimitedText(stop.address, 500);
        if (!stopAddress) continue;
        await OrderModel.createOrderStop(createdOrderId, {
          ...stop,
          stop_order: stopOrder++,
          stop_type: ALLOWED_STOP_TYPES.includes(stop.stop_type) ? stop.stop_type : "delivery",
          address: stopAddress,
          status: ALLOWED_STOP_STATUSES.includes(stop.status) ? stop.status : "pending",
        });
      }
    }

    for (let i = 1; i <= quantity; i += 1) {
      const barcode = quantity === 1
        ? orderNumber
        : `${orderNumber}-P${String(i).padStart(3, "0")}`;

      await OrderModel.createOrderPackage(createdOrderId, {
        barcode,
        package_number: i,
        package_type: packageType,
        description,
        weight,
        weight_unit: weightUnit,
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        dimension_unit: dimensionUnit,
        current_status: "created",
      });
    }

    await OrderModel.insertStatusHistory(
      createdOrderId,
      status,
      getAuthenticatedUserId(req),
      role === "client" ? "Commande créée par le client" : `Commande créée par l’équipe opérationnelle pour le client #${clientId}`,
    );

    const [createdOrder, createdStops, packages] = await Promise.all([
      OrderModel.getOrderById(createdOrderId),
      OrderModel.getOrderStops(createdOrderId),
      OrderModel.getOrderPackages(createdOrderId),
    ]);

    if (role === "client") {
      try {
        const clientDisplayName =
          normalizeLimitedText(client?.company_name, 150) ||
          [client?.first_name, client?.last_name]
            .map((value) => normalizeOptionalText(value))
            .filter(Boolean)
            .join(" ") ||
          normalizeOptionalText(client?.email) ||
          `Client #${clientId}`;

        const packageLabel = quantity > 1 ? `${quantity} colis` : "1 colis";
        const routeLabels = [];
        if (serviceType === "pickup_only" || serviceType === "pickup_delivery") routeLabels.push(`Ramassage : ${requestedPickupAddress}.`);
        if (serviceType === "delivery_only" || serviceType === "pickup_delivery") routeLabels.push(`Livraison : ${requestedDeliveryAddress}${deliveryUnit ? `, unité ${deliveryUnit}` : ""}.`);

        const notificationMessage = [
          `${clientDisplayName} vient de créer ${orderNumber}.`,
          `${packageLabel} · ${weight} ${weightUnit}.`,
          ...routeLabels,
          pickupSchedule.date ? `Ramassage demandé : ${pickupSchedule.date}${pickupSchedule.time ? ` ${pickupSchedule.time}` : ""}.` : null,
          deliverySchedule.date ? `Livraison demandée : ${deliverySchedule.date}${deliverySchedule.time ? ` ${deliverySchedule.time}` : ""}.` : null,
          signatureRequired ? "Preuve requise : signature." : "Preuve requise : photo.",
        ].filter(Boolean).join(" ");

        await notifyAdmin({
          io: req.app.get("io"),
          type: "order_created_by_client",
          level: "info",
          title: `Nouvelle commande ${orderNumber}`,
          message: notificationMessage,
          entityType: "order",
          entityId: createdOrderId,
          actionUrl: `/dashboard/admin/orders/${createdOrderId}`,
          email: true,
        });
      } catch (notificationError) {
        console.error("Erreur notification nouvelle commande → admin :", notificationError);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Commande créée avec succès.",
      data: { ...createdOrder, stops: createdStops, packages },
      order: { ...createdOrder, stops: createdStops, packages },
    });
  } catch (error) {
    console.error("Erreur createOrder :", error);

    if (createdOrderId) {
      try {
        await OrderModel.deleteOrder(createdOrderId);
      } catch (cleanupError) {
        console.error("Erreur nettoyage commande incomplète :", cleanupError);
      }
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Une référence ou un code colis existe déjà. Réessayez." });
    }
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ success: false, message: "Une donnée liée à la commande n’existe pas." });
    }
    if (error.code === "ER_BAD_NULL_ERROR") {
      return res.status(400).json({ success: false, message: "Une donnée obligatoire de la commande est manquante." });
    }

    return res.status(500).json({ success: false, message: "Erreur lors de la création de la commande." });
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
      "company_name",
      "contact_name",
      "contact_phone",
      "contact_extension",
      "delivery_unit",
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

    if (Object.prototype.hasOwnProperty.call(req.body, "destination_type")) {
      const destinationType = String(req.body.destination_type || "").trim().toLowerCase();
      if (!ALLOWED_DESTINATION_TYPES.includes(destinationType)) {
        return res.status(400).json({ success: false, message: "Type d’adresse de destination invalide." });
      }
      updatedData.destination_type = destinationType;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "signature_required")) {
      updatedData.signature_required = normalizeBoolean(req.body.signature_required, false) ? 1 : 0;
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

      const signatureRequired = Boolean(Number(order.signature_required));
      const hasCompleteProof = proofs.some((proof) =>
        signatureRequired
          ? Boolean(proof.signature_url)
          : Boolean(proof.photo_url)
      );

      if (!hasCompleteProof) {
        return res.status(409).json({
          success: false,
          code:
            "DELIVERY_PROOF_REQUIRED",
          message:
            signatureRequired
              ? "Une signature est obligatoire avant de terminer la livraison."
              : "Une photo est obligatoire avant de terminer la livraison.",
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

const createDeliveryProof = async (req, res) => {
  try {
    const orderId = parsePositiveId(req.params.id);
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Identifiant de commande invalide." });
    }

    const order = await OrderModel.getOrderById(orderId);
    if (!order) return sendOrderNotFound(res);

    const access = await authorizeOrderAccess(req, order);
    if (!access.authorized) return sendOrderNotFound(res);

    let driverId = null;
    if (access.role === "driver") {
      driverId = parsePositiveId(access.driver?.id);
    } else {
      driverId = parsePositiveId(req.body?.driver_id || order.delivery_driver_id || order.driver_id);
    }

    if (!driverId) {
      return res.status(400).json({ success: false, message: "Chauffeur de livraison introuvable." });
    }

    const photoFile = req.files?.photo?.[0] || null;
    const signatureFile = req.files?.signature?.[0] || null;
    const receiverFirstName = normalizeLimitedText(req.body?.receiver_first_name, 100) || "";
    const receiverLastName = normalizeLimitedText(req.body?.receiver_last_name, 100) || "";
    const notes = normalizeLimitedText(req.body?.notes, 2000);
    const signatureRequired = Boolean(Number(order.signature_required));

    if (access.role === "driver") {
      if (signatureRequired && !signatureFile) {
        return res.status(400).json({
          success: false,
          code: "SIGNATURE_REQUIRED",
          message: "Une signature est obligatoire pour cette livraison.",
        });
      }

      if (!signatureRequired && !photoFile) {
        return res.status(400).json({
          success: false,
          code: "PHOTO_REQUIRED",
          message: "Une photo est obligatoire pour cette livraison.",
        });
      }

      const uploadedFiles = await uploadDeliveryProofFiles({
        photo: photoFile,
        signature: signatureFile,
        orderId,
      });

      const signatureUrl = uploadedFiles?.signature?.url || uploadedFiles?.signature_url || null;
      const photoUrl = uploadedFiles?.photo?.url || uploadedFiles?.photo_url || null;

      if (signatureRequired && !signatureUrl) {
        return res.status(500).json({ success: false, message: "La signature n’a pas pu être enregistrée." });
      }
      if (!signatureRequired && !photoUrl) {
        return res.status(500).json({ success: false, message: "La photo n’a pas pu être enregistrée." });
      }

      const proofId = await OrderModel.createDeliveryProof({
        order_id: orderId,
        driver_id: driverId,
        receiver_first_name: receiverFirstName,
        receiver_last_name: receiverLastName,
        signature_url: signatureUrl,
        photo_url: photoUrl,
        notes,
      });

      if (order.status !== "completed") {
        await OrderModel.updateStatus(orderId, "completed");
        await OrderModel.insertStatusHistory(
          orderId,
          "completed",
          getAuthenticatedUserId(req),
          signatureRequired
            ? "Livraison terminée avec signature"
            : "Livraison terminée avec photo",
        );
      }

      const [updatedOrder, proofs, timeline] = await Promise.all([
        OrderModel.getOrderById(orderId),
        OrderModel.getDeliveryProofs(orderId),
        OrderModel.getOrderTimeline(orderId),
      ]);

      const createdProof = proofs.find((proof) => Number(proof.id) === Number(proofId)) || proofs[0] || null;
      return res.status(201).json({
        success: true,
        message: "Preuve de livraison enregistrée avec succès.",
        proof_id: proofId,
        proof: createdProof,
        order: updatedOrder,
        timeline,
        data: { proof: createdProof, order: updatedOrder, timeline },
      });
    }

    // Compatibilité admin/dispatcher : URLs directes uniquement pour les rôles privilégiés.
    const signatureUrl = normalizeLimitedText(req.body?.signature_url || (req.body?.proof_type === "signature" ? req.body?.file_url : null), 2000);
    const photoUrl = normalizeLimitedText(req.body?.photo_url || (["photo", "image", "delivery_photo"].includes(req.body?.proof_type) ? req.body?.file_url : null), 2000);

    if (signatureRequired && !signatureUrl) {
      return res.status(400).json({ success: false, message: "Une signature est obligatoire pour cette livraison." });
    }
    if (!signatureRequired && !photoUrl) {
      return res.status(400).json({ success: false, message: "Une photo est obligatoire pour cette livraison." });
    }

    const proofId = await OrderModel.createDeliveryProof({
      order_id: orderId,
      driver_id: driverId,
      receiver_first_name: receiverFirstName,
      receiver_last_name: receiverLastName,
      signature_url: signatureUrl,
      photo_url: photoUrl,
      notes,
    });

    return res.status(201).json({ success: true, message: "Preuve enregistrée.", proof_id: proofId });
  } catch (error) {
    console.error("Erreur createDeliveryProof :", error);
    return res.status(500).json({ success: false, message: "Erreur lors de l’enregistrement de la preuve de livraison." });
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
  getMyOrders,
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
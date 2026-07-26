const OrderModel = require("../models/orderModel");

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

/* ============================================================
   GÉNÉRER UN NUMÉRO DE COMMANDE
============================================================ */

function generateOrderNumber() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const randomNumber = Math.floor(1000 + Math.random() * 9000);

  return `ORD-${year}${month}${day}-${randomNumber}`;
}

/* ============================================================
   RÉCUPÉRER TOUTES LES COMMANDES
============================================================ */

const getAllOrders = async (req, res) => {
  try {
    const orders = await OrderModel.getAllOrders();

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Erreur getAllOrders :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des commandes.",
    });
  }
};

/* ============================================================
   RÉCUPÉRER UNE COMMANDE PAR ID
============================================================ */

const getOrderById = async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de commande invalide.",
      });
    }

    const order = await OrderModel.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Commande introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Erreur getOrderById :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la commande.",
    });
  }
};

/* ============================================================
   CRÉER UNE COMMANDE
============================================================ */

const createOrder = async (req, res) => {
  try {
    const {
      client_id,
      driver_id,
      pickup_address,
      delivery_address,
      pickup_date,
      pickup_time,
      delivery_date,
      delivery_time,
      pallets_count,
      description,
      notes,
      status,
    } = req.body;

    if (!client_id) {
      return res.status(400).json({
        success: false,
        message: "Le client est obligatoire.",
      });
    }

    if (!pickup_address || !pickup_address.trim()) {
      return res.status(400).json({
        success: false,
        message: "L’adresse de ramassage est obligatoire.",
      });
    }

    if (!delivery_address || !delivery_address.trim()) {
      return res.status(400).json({
        success: false,
        message: "L’adresse de livraison est obligatoire.",
      });
    }

    if (
      pallets_count !== undefined &&
      (!Number.isInteger(Number(pallets_count)) ||
        Number(pallets_count) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Le nombre de palettes doit être positif ou égal à zéro.",
      });
    }

    if (status && !ALLOWED_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Statut de commande invalide.",
      });
    }

    const orderData = {
      order_number: generateOrderNumber(),
      client_id: Number(client_id),
      driver_id: driver_id ? Number(driver_id) : null,
      pickup_address: pickup_address.trim(),
      delivery_address: delivery_address.trim(),
      pickup_date: pickup_date || null,
      pickup_time: pickup_time || null,
      delivery_date: delivery_date || null,
      delivery_time: delivery_time || null,
      pallets_count:
        pallets_count !== undefined ? Number(pallets_count) : 0,
      description: description?.trim() || null,
      notes: notes?.trim() || null,
      status: status || "pending",
    };

    const orderId = await OrderModel.createOrder(orderData);

    const createdOrder = await OrderModel.getOrderById(orderId);

    if (req.user?.id) {
      await OrderModel.insertStatusHistory(
        orderId,
        orderData.status,
        req.user.id,
        "Commande créée"
      );
    }

    return res.status(201).json({
      success: true,
      message: "Commande créée avec succès.",
      data: createdOrder,
    });
  } catch (error) {
    console.error("Erreur createOrder :", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Le numéro de commande existe déjà.",
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message: "Le client ou le chauffeur sélectionné n’existe pas.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la commande.",
    });
  }
};

/* ============================================================
   MODIFIER UNE COMMANDE
============================================================ */

const updateOrder = async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de commande invalide.",
      });
    }

    const existingOrder = await OrderModel.getOrderById(orderId);

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Commande introuvable.",
      });
    }

    const {
      driver_id,
      pickup_address,
      delivery_address,
      pickup_date,
      pickup_time,
      delivery_date,
      delivery_time,
      pallets_count,
      description,
      notes,
      status,
    } = req.body;

    if (status && !ALLOWED_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Statut de commande invalide.",
      });
    }

    if (
      pallets_count !== undefined &&
      (!Number.isInteger(Number(pallets_count)) ||
        Number(pallets_count) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Le nombre de palettes est invalide.",
      });
    }

    const updatedData = {
      driver_id:
        driver_id !== undefined
          ? driver_id
            ? Number(driver_id)
            : null
          : existingOrder.driver_id,

      pickup_address:
        pickup_address !== undefined
          ? pickup_address.trim()
          : existingOrder.pickup_address,

      delivery_address:
        delivery_address !== undefined
          ? delivery_address.trim()
          : existingOrder.delivery_address,

      pickup_date:
        pickup_date !== undefined
          ? pickup_date || null
          : existingOrder.pickup_date,

      pickup_time:
        pickup_time !== undefined
          ? pickup_time || null
          : existingOrder.pickup_time,

      delivery_date:
        delivery_date !== undefined
          ? delivery_date || null
          : existingOrder.delivery_date,

      delivery_time:
        delivery_time !== undefined
          ? delivery_time || null
          : existingOrder.delivery_time,

      pallets_count:
        pallets_count !== undefined
          ? Number(pallets_count)
          : existingOrder.pallets_count,

      description:
        description !== undefined
          ? description?.trim() || null
          : existingOrder.description,

      notes:
        notes !== undefined
          ? notes?.trim() || null
          : existingOrder.notes,

      status:
        status !== undefined
          ? status
          : existingOrder.status,
    };

    const result = await OrderModel.updateOrder(orderId, updatedData);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Commande introuvable.",
      });
    }

    if (status && status !== existingOrder.status && req.user?.id) {
      await OrderModel.insertStatusHistory(
        orderId,
        status,
        req.user.id,
        req.body.comment || "Statut modifié"
      );
    }

    const updatedOrder = await OrderModel.getOrderById(orderId);

    return res.status(200).json({
      success: true,
      message: "Commande modifiée avec succès.",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Erreur updateOrder :", error);

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message: "Le chauffeur sélectionné n’existe pas.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Erreur lors de la modification de la commande.",
    });
  }
};

/* ============================================================
   SUPPRIMER UNE COMMANDE
============================================================ */

const deleteOrder = async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de commande invalide.",
      });
    }

    const existingOrder = await OrderModel.getOrderById(orderId);

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Commande introuvable.",
      });
    }

    if (existingOrder.status === "completed") {
      return res.status(409).json({
        success: false,
        message: "Une commande terminée ne peut pas être supprimée.",
      });
    }

    const result = await OrderModel.deleteOrder(orderId);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Commande introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Commande supprimée avec succès.",
    });
  } catch (error) {
    console.error("Erreur deleteOrder :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la commande.",
    });
  }
};

/* ============================================================
   ASSIGNER UN CHAUFFEUR
============================================================ */

const assignDriver = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const driverId = Number(req.body.driver_id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de commande invalide.",
      });
    }

    if (!Number.isInteger(driverId) || driverId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant du chauffeur invalide.",
      });
    }

    const order = await OrderModel.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Commande introuvable.",
      });
    }

    if (["completed", "cancelled"].includes(order.status)) {
      return res.status(409).json({
        success: false,
        message:
          "Impossible d’assigner un chauffeur à cette commande.",
      });
    }

    const result = await OrderModel.assignDriver(orderId, driverId);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Commande introuvable.",
      });
    }

    if (req.user?.id) {
      await OrderModel.insertStatusHistory(
        orderId,
        "assigned",
        req.user.id,
        req.body.comment || `Chauffeur ${driverId} assigné`
      );
    }

    const updatedOrder = await OrderModel.getOrderById(orderId);

    return res.status(200).json({
      success: true,
      message: "Chauffeur assigné avec succès.",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Erreur assignDriver :", error);

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message: "Le chauffeur sélectionné n’existe pas.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Erreur lors de l’assignation du chauffeur.",
    });
  }
};

/* ============================================================
   MODIFIER LE STATUT
============================================================ */

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { status, comment } = req.body;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de commande invalide.",
      });
    }

    if (!status || !ALLOWED_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Statut de commande invalide.",
      });
    }

    const order = await OrderModel.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Commande introuvable.",
      });
    }

    if (order.status === status) {
      return res.status(409).json({
        success: false,
        message: "La commande possède déjà ce statut.",
      });
    }

    const result = await OrderModel.updateStatus(orderId, status);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Commande introuvable.",
      });
    }

    await OrderModel.insertStatusHistory(
      orderId,
      status,
      req.user?.id || null,
      comment || null
    );

    const updatedOrder = await OrderModel.getOrderById(orderId);

    return res.status(200).json({
      success: true,
      message: "Statut modifié avec succès.",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Erreur updateOrderStatus :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur lors de la modification du statut.",
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  assignDriver,
  updateOrderStatus,
};
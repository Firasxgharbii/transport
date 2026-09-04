const DispatchModel = require("../models/dispatchModel");

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

exports.getDispatchOrders = async (req, res) => {
  try {
    const result = await DispatchModel.getOrders(req.query);
    return res.status(200).json({
      success: true,
      data: result.rows,
      orders: result.rows,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("Erreur getDispatchOrders :", error);
    return res.status(500).json({
      success: false,
      message: "Impossible de charger le Dispatch Center.",
      error: error.message,
    });
  }
};

exports.getDispatchOrderIds = async (req, res) => {
  try {
    const ids = await DispatchModel.getMatchingIds(req.query);
    return res.status(200).json({
      success: true,
      count: ids.length,
      ids,
      data: ids,
    });
  } catch (error) {
    console.error("Erreur getDispatchOrderIds :", error);
    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les commandes filtrées.",
      error: error.message,
    });
  }
};

exports.bulkUpdateOrders = async (req, res) => {
  try {
    const orderIds = Array.isArray(req.body?.order_ids)
      ? req.body.order_ids
      : [];
    const changes =
      req.body?.changes && typeof req.body.changes === "object"
        ? req.body.changes
        : {};

    if (!orderIds.length) {
      return res.status(400).json({
        success: false,
        message: "Sélectionne au moins une commande.",
      });
    }

    if (orderIds.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Maximum 1000 commandes par opération.",
      });
    }

    const result = await DispatchModel.bulkUpdate(orderIds, changes);
    return res.status(200).json({
      success: true,
      message: `${result.affectedRows} commande(s) mise(s) à jour.`,
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Erreur bulkUpdateOrders :", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Mise à jour massive impossible.",
    });
  }
};

exports.reorderOrders = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "Aucune commande à réordonner.",
      });
    }

    if (items.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Maximum 1000 positions par opération.",
      });
    }

    const result = await DispatchModel.reorder(items);
    return res.status(200).json({
      success: true,
      message: "Ordre des livraisons enregistré.",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Erreur reorderOrders :", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Réorganisation impossible.",
    });
  }
};

exports.getOrderOperations = async (req, res) => {
  try {
    const orderId = parseId(req.params.orderId);
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Commande invalide.",
      });
    }

    const operations = await DispatchModel.getOrderOperations(orderId);
    return res.status(200).json({
      success: true,
      count: operations.length,
      data: operations,
      operations,
    });
  } catch (error) {
    console.error("Erreur getOrderOperations :", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Impossible de charger les opérations.",
    });
  }
};

exports.createOrderOperation = async (req, res) => {
  try {
    const orderId = parseId(req.params.orderId);
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Commande invalide.",
      });
    }

    const operation = await DispatchModel.createOperation(orderId, req.body || {});
    return res.status(201).json({
      success: true,
      message: "Opération créée.",
      data: operation,
      operation,
    });
  } catch (error) {
    console.error("Erreur createOrderOperation :", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Impossible de créer l’opération.",
    });
  }
};

exports.updateOrderOperation = async (req, res) => {
  try {
    const operationId = parseId(req.params.operationId);
    if (!operationId) {
      return res.status(400).json({
        success: false,
        message: "Opération invalide.",
      });
    }

    const operation = await DispatchModel.updateOperation(
      operationId,
      req.body || {},
    );

    return res.status(200).json({
      success: true,
      message: "Opération mise à jour.",
      data: operation,
      operation,
    });
  } catch (error) {
    console.error("Erreur updateOrderOperation :", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Impossible de modifier l’opération.",
    });
  }
};

exports.deleteOrderOperation = async (req, res) => {
  try {
    const operationId = parseId(req.params.operationId);
    if (!operationId) {
      return res.status(400).json({
        success: false,
        message: "Opération invalide.",
      });
    }

    const result = await DispatchModel.deleteOperation(operationId);
    return res.status(200).json({
      success: true,
      message: "Opération supprimée.",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Erreur deleteOrderOperation :", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Impossible de supprimer l’opération.",
    });
  }
};
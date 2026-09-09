const DispatchModel = require("../models/dispatchModel");
const OrderModel = require("../models/orderModel");

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function getAuthenticatedUserId(req) {
  return req.user?.id || req.user?.user_id || null;
}

function cleanValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Aucun";
  }
  return String(value);
}

function idLabel(value, label) {
  if (value === null || value === undefined || value === "") {
    return "Non assigné";
  }
  return `${label} #${value}`;
}

function operationTypeLabel(value) {
  const labels = {
    pickup: "Ramassage",
    warehouse_in: "Entrée entrepôt",
    warehouse_storage: "Stockage entrepôt",
    warehouse_out: "Sortie entrepôt",
    delivery: "Livraison",
  };

  return labels[value] || cleanValue(value);
}

function operationStatusLabel(value) {
  const labels = {
    pending: "En attente",
    assigned: "Assignée",
    in_progress: "En cours",
    completed: "Terminée",
    cancelled: "Annulée",
  };

  return labels[value] || cleanValue(value);
}

/**
 * L'historique existant utilise order_status_history :
 * - order_id
 * - status
 * - changed_by
 * - comment
 *
 * On conserve donc le statut réel de la commande dans "status"
 * et on décrit l'action Dispatch dans "comment".
 *
 * L'audit est volontairement "best effort" :
 * une panne d'écriture de l'historique ne doit pas annuler
 * une modification Dispatch qui a déjà été effectuée.
 */
async function recordHistorySafe({
  orderId,
  status,
  userId,
  comment,
}) {
  try {
    await OrderModel.insertStatusHistory(
      orderId,
      status || "pending",
      userId,
      comment,
    );
    return true;
  } catch (error) {
    console.error(
      `Erreur audit Dispatch pour commande ${orderId} :`,
      error,
    );
    return false;
  }
}

async function recordManyHistory(entries) {
  let written = 0;
  let failed = 0;

  for (const entry of entries) {
    const ok = await recordHistorySafe(entry);
    if (ok) written += 1;
    else failed += 1;
  }

  return { written, failed };
}

function describeBulkChange(before, after, requestedChanges) {
  const parts = [];

  if (
    Object.prototype.hasOwnProperty.call(requestedChanges, "driver_id") &&
    before.driver_id !== after.driver_id
  ) {
    parts.push(
      `chauffeur: ${idLabel(before.driver_id, "Chauffeur")} → ${idLabel(
        after.driver_id,
        "Chauffeur",
      )}`,
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(requestedChanges, "vehicle_id") &&
    before.vehicle_id !== after.vehicle_id
  ) {
    parts.push(
      `véhicule: ${idLabel(before.vehicle_id, "Véhicule")} → ${idLabel(
        after.vehicle_id,
        "Véhicule",
      )}`,
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(requestedChanges, "status") &&
    before.status !== after.status
  ) {
    parts.push(
      `statut: ${cleanValue(before.status)} → ${cleanValue(after.status)}`,
    );
  }

  return parts;
}

function describeOperationChanges(before, after) {
  const parts = [];

  const checks = [
    [
      "operation_type",
      "type",
      operationTypeLabel,
    ],
    [
      "driver_id",
      "chauffeur",
      (value) => idLabel(value, "Chauffeur"),
    ],
    [
      "vehicle_id",
      "véhicule",
      (value) => idLabel(value, "Véhicule"),
    ],
    [
      "warehouse_name",
      "entrepôt",
      cleanValue,
    ],
    [
      "scheduled_date",
      "date",
      cleanValue,
    ],
    [
      "scheduled_time",
      "heure",
      cleanValue,
    ],
    [
      "status",
      "statut opération",
      operationStatusLabel,
    ],
    [
      "route_position",
      "position opération",
      cleanValue,
    ],
    [
      "notes",
      "notes",
      cleanValue,
    ],
  ];

  for (const [field, label, formatter] of checks) {
    const oldValue = before?.[field] ?? null;
    const newValue = after?.[field] ?? null;

    if (String(oldValue ?? "") !== String(newValue ?? "")) {
      parts.push(
        `${label}: ${formatter(oldValue)} → ${formatter(newValue)}`,
      );
    }
  }

  return parts;
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

    const beforeRows = await DispatchModel.getOrderSnapshots(orderIds);

    const result = await DispatchModel.bulkUpdate(
      orderIds,
      changes,
    );

    const afterRows = await DispatchModel.getOrderSnapshots(
      result.ids,
    );

    const beforeMap = new Map(
      beforeRows.map((row) => [Number(row.id), row]),
    );

    const userId = getAuthenticatedUserId(req);

    const auditEntries = [];

    for (const after of afterRows) {
      const before = beforeMap.get(Number(after.id));
      if (!before) continue;

      const details = describeBulkChange(
        before,
        after,
        changes,
      );

      if (!details.length) continue;

      auditEntries.push({
        orderId: Number(after.id),
        status: after.status || before.status || "pending",
        userId,
        comment: `[DISPATCH] Mise à jour: ${details.join(
          " | ",
        )}`,
      });
    }

    const audit = await recordManyHistory(auditEntries);

    return res.status(200).json({
      success: true,
      message: `${result.affectedRows} commande(s) mise(s) à jour.`,
      affectedRows: result.affectedRows,
      audit,
    });
  } catch (error) {
    console.error("Erreur bulkUpdateOrders :", error);

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Mise à jour massive impossible.",
    });
  }
};

exports.reorderOrders = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items)
      ? req.body.items
      : [];

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

    const requestedIds = items
      .map((item) => parseId(item?.id))
      .filter(Boolean);

    const beforeRows =
      await DispatchModel.getOrderSnapshots(
        requestedIds,
      );

    const beforeMap = new Map(
      beforeRows.map((row) => [Number(row.id), row]),
    );

    const result = await DispatchModel.reorder(items);

    const afterRows =
      await DispatchModel.getOrderSnapshots(
        result.ids,
      );

    const userId = getAuthenticatedUserId(req);
    const auditEntries = [];

    for (const after of afterRows) {
      const before = beforeMap.get(Number(after.id));
      if (!before) continue;

      const oldPosition =
        before.route_position === null ||
        before.route_position === undefined
          ? "Aucune"
          : before.route_position;

      const newPosition =
        after.route_position === null ||
        after.route_position === undefined
          ? "Aucune"
          : after.route_position;

      if (String(oldPosition) === String(newPosition)) {
        continue;
      }

      auditEntries.push({
        orderId: Number(after.id),
        status: after.status || before.status || "pending",
        userId,
        comment: `[DISPATCH] Position de route: ${oldPosition} → ${newPosition}`,
      });
    }

    const audit = await recordManyHistory(auditEntries);

    return res.status(200).json({
      success: true,
      message: "Ordre des livraisons enregistré.",
      affectedRows: result.affectedRows,
      audit,
    });
  } catch (error) {
    console.error("Erreur reorderOrders :", error);

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Réorganisation impossible.",
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

    const operations =
      await DispatchModel.getOrderOperations(orderId);

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
      message:
        error.message ||
        "Impossible de charger les opérations.",
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

    const operation =
      await DispatchModel.createOperation(
        orderId,
        req.body || {},
      );

    const orderSnapshot =
      await DispatchModel.getOrderSnapshotById(
        orderId,
      );

    const userId = getAuthenticatedUserId(req);

    const auditOk = await recordHistorySafe({
      orderId,
      status: orderSnapshot?.status || "pending",
      userId,
      comment:
        `[DISPATCH] Opération ajoutée #${operation.id}: ` +
        `${operationTypeLabel(operation.operation_type)} | ` +
        `chauffeur ${idLabel(operation.driver_id, "Chauffeur")} | ` +
        `véhicule ${idLabel(operation.vehicle_id, "Véhicule")} | ` +
        `position ${cleanValue(operation.route_position)} | ` +
        `statut ${operationStatusLabel(operation.status)}`,
    });

    return res.status(201).json({
      success: true,
      message: "Opération créée.",
      data: operation,
      operation,
      audit: {
        written: auditOk ? 1 : 0,
        failed: auditOk ? 0 : 1,
      },
    });
  } catch (error) {
    console.error("Erreur createOrderOperation :", error);

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Impossible de créer l’opération.",
    });
  }
};

exports.updateOrderOperation = async (req, res) => {
  try {
    const operationId = parseId(
      req.params.operationId,
    );

    if (!operationId) {
      return res.status(400).json({
        success: false,
        message: "Opération invalide.",
      });
    }

    const before =
      await DispatchModel.getOperationById(
        operationId,
      );

    const operation =
      await DispatchModel.updateOperation(
        operationId,
        req.body || {},
      );

    const changes = describeOperationChanges(
      before,
      operation,
    );

    const orderId = Number(operation.order_id);

    const orderSnapshot =
      await DispatchModel.getOrderSnapshotById(
        orderId,
      );

    const userId = getAuthenticatedUserId(req);

    let audit = {
      written: 0,
      failed: 0,
    };

    if (changes.length) {
      const ok = await recordHistorySafe({
        orderId,
        status: orderSnapshot?.status || "pending",
        userId,
        comment:
          `[DISPATCH] Opération #${operationId} modifiée: ` +
          changes.join(" | "),
      });

      audit = {
        written: ok ? 1 : 0,
        failed: ok ? 0 : 1,
      };
    }

    return res.status(200).json({
      success: true,
      message: "Opération mise à jour.",
      data: operation,
      operation,
      audit,
    });
  } catch (error) {
    console.error("Erreur updateOrderOperation :", error);

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Impossible de modifier l’opération.",
    });
  }
};

exports.deleteOrderOperation = async (req, res) => {
  try {
    const operationId = parseId(
      req.params.operationId,
    );

    if (!operationId) {
      return res.status(400).json({
        success: false,
        message: "Opération invalide.",
      });
    }

    const operation =
      await DispatchModel.getOperationById(
        operationId,
      );

    const orderId = Number(operation.order_id);

    const orderSnapshot =
      await DispatchModel.getOrderSnapshotById(
        orderId,
      );

    const result =
      await DispatchModel.deleteOperation(
        operationId,
      );

    const userId = getAuthenticatedUserId(req);

    const auditOk = await recordHistorySafe({
      orderId,
      status: orderSnapshot?.status || "pending",
      userId,
      comment:
        `[DISPATCH] Opération supprimée #${operationId}: ` +
        `${operationTypeLabel(operation.operation_type)} | ` +
        `chauffeur ${idLabel(operation.driver_id, "Chauffeur")} | ` +
        `véhicule ${idLabel(operation.vehicle_id, "Véhicule")} | ` +
        `position ${cleanValue(operation.route_position)} | ` +
        `statut ${operationStatusLabel(operation.status)}`,
    });

    return res.status(200).json({
      success: true,
      message: "Opération supprimée.",
      affectedRows: result.affectedRows,
      audit: {
        written: auditOk ? 1 : 0,
        failed: auditOk ? 0 : 1,
      },
    });
  } catch (error) {
    console.error("Erreur deleteOrderOperation :", error);

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Impossible de supprimer l’opération.",
    });
  }
};
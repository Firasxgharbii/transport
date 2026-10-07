"use strict";

/*
 * GLORY SOLUTIONS
 * Dispatch Administrative Override Service
 *
 * Règle métier :
 * - Le workflow chauffeur reste strict.
 * - Le Dispatch peut corriger / rouvrir / remettre en circulation.
 * - Aucune ancienne preuve n'est supprimée.
 * - Les anciennes exécutions restent dans l'historique.
 */

const ACTIVE_OPERATION_STATUSES = new Set([
  "pending",
  "assigned",
]);

function positiveId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function audit(
  conn,
  {
    actorUserId,
    orderId,
    action,
    previousStatus = null,
    nextStatus = null,
    metadata = {},
    routeId = null,
    dispatchTaskId = null,
    driverId = null,
    vehicleId = null,
  }
) {
  try {
    await conn.query(
      `
        INSERT INTO operational_audit_log
        (
          entity_type,
          entity_id,
          order_id,
          action,
          previous_status,
          new_status,
          route_id,
          dispatch_task_id,
          driver_id,
          vehicle_id,
          user_id,
          metadata
        )
        VALUES
        ('order', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderId,
        orderId,
        action,
        previousStatus,
        nextStatus,
        routeId,
        dispatchTaskId,
        driverId,
        vehicleId,
        actorUserId || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (err) {
    if (err?.code !== "ER_NO_SUCH_TABLE") {
      throw err;
    }
  }
}

/*
 * Prépare une commande pour une NOUVELLE exécution.
 *
 * IMPORTANT :
 * On ne réutilise pas une ancienne opération déjà exécutée.
 * Cela protège :
 * - scans
 * - signature
 * - photos
 * - GPS
 * - exceptions
 * - historique chauffeur
 */
async function prepareNewOperation(
  conn,
  {
    orderId,
    operationType,
    actorUserId,
    reason = "dispatch_manual_reopen",
  }
) {
  const order = positiveId(orderId);
  const type = String(operationType || "").toLowerCase();

  if (!order || !["pickup", "delivery"].includes(type)) {
    throw new Error("Commande ou type d'opération invalide.");
  }

  const [[orderRow]] = await conn.query(
    `
      SELECT id, order_number, status
      FROM orders
      WHERE id=?
      FOR UPDATE
    `,
    [order]
  );

  if (!orderRow) {
    throw new Error("Commande introuvable.");
  }

  const [operations] = await conn.query(
    `
      SELECT
        id,
        status,
        dispatch_task_id,
        driver_id,
        vehicle_id,
        scheduled_date,
        scheduled_time
      FROM order_operations
      WHERE order_id=?
        AND operation_type=?
      ORDER BY id DESC
      FOR UPDATE
    `,
    [order, type]
  );

  /*
   * S'il existe déjà une opération réellement disponible,
   * inutile d'en créer une autre.
   */
  const reusable = operations.find(
    op =>
      ACTIVE_OPERATION_STATUSES.has(String(op.status)) &&
      op.dispatch_task_id == null
  );

  if (reusable) {
    await audit(conn, {
      actorUserId,
      orderId: order,
      action: "dispatch.operation.reactivated",
      previousStatus: reusable.status,
      nextStatus: reusable.status,
      metadata: {
        operation_id: reusable.id,
        operation_type: type,
        reason,
        reused: true,
      },
    });

    return {
      created: false,
      operationId: reusable.id,
      operationType: type,
    };
  }

  /*
   * Nouvelle opération = nouveau cycle.
   * L'ancienne opération n'est jamais modifiée.
   */
  const [created] = await conn.query(
    `
      INSERT INTO order_operations
      (
        order_id,
        operation_type,
        driver_id,
        vehicle_id,
        scheduled_date,
        scheduled_time,
        status,
        dispatch_task_id
      )
      VALUES (?, ?, NULL, NULL, NULL, NULL, 'pending', NULL)
    `,
    [order, type]
  );

  await audit(conn, {
    actorUserId,
    orderId: order,
    action: "dispatch.operation.reopened",
    previousStatus: orderRow.status,
    nextStatus: "pending",
    metadata: {
      previous_operation_ids: operations.map(op => op.id),
      new_operation_id: created.insertId,
      operation_type: type,
      reason,
      preserved_history: true,
    },
  });

  return {
    created: true,
    operationId: created.insertId,
    operationType: type,
  };
}

async function reopenOrder(
  conn,
  {
    orderId,
    operationType = "delivery",
    actorUserId,
    reason = "Commande rouverte manuellement par le Dispatch",
  }
) {
  const order = positiveId(orderId);

  if (!order) {
    throw new Error("Commande invalide.");
  }

  const [[row]] = await conn.query(
    `
      SELECT id, order_number, status
      FROM orders
      WHERE id=?
      FOR UPDATE
    `,
    [order]
  );

  if (!row) {
    throw new Error("Commande introuvable.");
  }

  const operation = await prepareNewOperation(conn, {
    orderId: order,
    operationType,
    actorUserId,
    reason,
  });

  /*
   * La commande redevient disponible.
   * L'affectation à une route déterminera ensuite assigned/in_progress.
   */
  await conn.query(
    `UPDATE orders SET status='pending' WHERE id=?`,
    [order]
  );

  try {
    await conn.query(
      `
        INSERT INTO order_status_history
        (order_id, status, changed_by, comment)
        VALUES (?, 'pending', ?, ?)
      `,
      [
        order,
        actorUserId || null,
        reason,
      ]
    );
  } catch (err) {
    if (err?.code !== "ER_NO_SUCH_TABLE") {
      throw err;
    }
  }

  await audit(conn, {
    actorUserId,
    orderId: order,
    action: "dispatch.order.reopened",
    previousStatus: row.status,
    nextStatus: "pending",
    metadata: {
      reason,
      operation_id: operation.operationId,
      operation_type: operation.operationType,
      new_operation_created: operation.created,
      preserved_history: true,
    },
  });

  return {
    success: true,
    orderId: order,
    orderNumber: row.order_number,
    previousStatus: row.status,
    status: "pending",
    operationId: operation.operationId,
    operationType: operation.operationType,
    newOperationCreated: operation.created,
  };
}

module.exports = {
  prepareNewOperation,
  reopenOrder,
};

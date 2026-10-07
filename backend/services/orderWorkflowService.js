"use strict";

const ORDER_STATUSES = new Set([
  "pending", "assigned", "pickup_in_progress", "picked_up",
  "delivery_in_progress", "arrived", "completed", "cancelled", "incident",
]);

const LABELS = Object.freeze({
  pending: "En attente",
  assigned: "Assignée",
  pickup_in_progress: "Ramassage en cours",
  picked_up: "À livrer",
  delivery_in_progress: "En livraison",
  arrived: "Arrivé",
  completed: "Terminée",
  cancelled: "Annulée",
  incident: "Incident",
});

function assertStatus(status) {
  if (!ORDER_STATUSES.has(status)) {
    const e = new Error(`Statut de commande invalide: ${status}`);
    e.statusCode = 400;
    throw e;
  }
}

async function getOrderForUpdate(conn, orderId) {
  const [rows] = await conn.query(
    `SELECT id, order_number, status FROM orders WHERE id=? FOR UPDATE`,
    [orderId],
  );
  return rows[0] || null;
}

async function transitionOrderStatus(conn, {
  orderId,
  nextStatus,
  changedBy = null,
  action = "status_change",
  comment = null,
  routeId = null,
  dispatchTaskId = null,
  driverId = null,
  vehicleId = null,
  metadata = null,
}) {
  assertStatus(nextStatus);
  const order = await getOrderForUpdate(conn, orderId);
  if (!order) {
    const e = new Error(`Commande #${orderId} introuvable.`);
    e.statusCode = 404;
    throw e;
  }

  const previousStatus = order.status;
  if (previousStatus !== nextStatus) {
    await conn.query(
      `UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [nextStatus, orderId],
    );
  }

  await conn.query(
    `INSERT INTO order_status_history(order_id,status,changed_by,comment)
     VALUES(?,?,?,?)`,
    [
      orderId,
      nextStatus,
      changedBy,
      comment || `${action}: ${previousStatus} -> ${nextStatus}`,
    ],
  );

  // La migration 005 crée cette table. L'audit enrichi reste best-effort
  // pour permettre un déploiement progressif sans casser l'application.
  try {
    await conn.query(
      `INSERT INTO operational_audit_log
       (entity_type,entity_id,order_id,action,previous_status,new_status,
        route_id,dispatch_task_id,driver_id,vehicle_id,user_id,metadata)
       VALUES('order',?,?,?,?,?,?,?,?,?,?,?)`,
      [
        orderId, orderId, action, previousStatus, nextStatus,
        routeId, dispatchTaskId, driverId, vehicleId, changedBy,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );
  } catch (e) {
    if (e && e.code !== "ER_NO_SUCH_TABLE") throw e;
  }

  return { orderId, previousStatus, status: nextStatus, changed: previousStatus !== nextStatus };
}

async function cancelOrderEverywhere(conn, { orderId, changedBy = null, reason = null }) {
  const [operations] = await conn.query(
    `SELECT op.id, op.order_id, op.operation_type, op.status, op.dispatch_task_id,
            op.driver_id, op.vehicle_id, op.scheduled_date,
            dt.route_id, dt.stop_position, dt.status AS stop_status
       FROM order_operations op
       LEFT JOIN dispatch_tasks dt ON dt.id = op.dispatch_task_id
      WHERE op.order_id = ?
      FOR UPDATE`,
    [orderId],
  );

  const touchedRoutes = new Set();
  const touchedStops = new Set();
  const removedOperations = [];

  for (const op of operations) {
    const stopId = Number(op.dispatch_task_id) || null;
    const routeId = Number(op.route_id) || null;
    if (routeId) touchedRoutes.add(routeId);
    if (stopId) touchedStops.add(stopId);

    // Historique du retrait de route. Best-effort pour rester compatible
    // avec les installations où la migration 008 n'est pas encore présente.
    if (routeId && stopId) {
      try {
        await conn.query(
          `INSERT INTO dispatch_route_removal_history
           (route_id,stop_id,operation_id,order_id,operation_type,actor_user_id,
            previous_operation_status,restored_operation_status,previous_driver_id,
            previous_vehicle_id,previous_scheduled_date,reason,details)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            routeId, stopId, op.id, orderId, op.operation_type, changedBy,
            op.status, "cancelled", op.driver_id, op.vehicle_id, op.scheduled_date,
            reason || "order_cancelled",
            JSON.stringify({
              scope: "order_status_cancelled",
              previous_stop_status: op.stop_status,
              automatic: true,
            }),
          ],
        );
      } catch (e) {
        if (e && e.code !== "ER_NO_SUCH_TABLE") throw e;
      }
    }

    // Une commande annulée n'appartient plus à aucun stop actif.
    // On conserve l'opération elle-même pour la traçabilité.
    await conn.query(
      `UPDATE order_operations
          SET status='cancelled',
              dispatch_task_id=NULL,
              driver_id=NULL,
              vehicle_id=NULL,
              scheduled_date=NULL
        WHERE id=?`,
      [op.id],
    );

    removedOperations.push({
      operation_id: op.id,
      operation_type: op.operation_type,
      stop_id: stopId,
      route_id: routeId,
      previous_status: op.status,
    });
  }

  // Un stop partagé reste en place. Un stop devenu vide est retiré de la route
  // et marqué cancelled afin qu'il disparaisse immédiatement de l'app chauffeur.
  for (const stopId of touchedStops) {
    const [[stop]] = await conn.query(
      `SELECT id, route_id, status FROM dispatch_tasks WHERE id=? FOR UPDATE`,
      [stopId],
    );
    if (!stop) continue;

    const [[remaining]] = await conn.query(
      `SELECT COUNT(*) AS total
         FROM order_operations
        WHERE dispatch_task_id=?
          AND status<>'cancelled'`,
      [stopId],
    );

    if (Number(remaining?.total || 0) === 0) {
      if (stop.route_id) touchedRoutes.add(Number(stop.route_id));
      await conn.query(
        `UPDATE dispatch_tasks
            SET status='cancelled',
                route_id=NULL,
                stop_position=NULL,
                driver_id=NULL,
                vehicle_id=NULL
          WHERE id=?`,
        [stopId],
      );
    }
  }

  // Recompacte les positions des stops qui restent sur chaque route.
  for (const routeId of touchedRoutes) {
    const [stops] = await conn.query(
      `SELECT id
         FROM dispatch_tasks
        WHERE route_id=? AND status<>'cancelled'
        ORDER BY stop_position IS NULL, stop_position, id
        FOR UPDATE`,
      [routeId],
    );
    for (let i = 0; i < stops.length; i += 1) {
      await conn.query(
        `UPDATE dispatch_tasks SET stop_position=? WHERE id=?`,
        [i + 1, stops[i].id],
      );
    }

    // La route reste existante dans l'historique. Si elle n'a plus de stop,
    // elle redevient un brouillon vide plutôt que d'être supprimée.
    if (stops.length === 0) {
      await conn.query(
        `UPDATE dispatch_routes
            SET status=CASE WHEN status IN ('completed','cancelled') THEN status ELSE 'draft' END
          WHERE id=?`,
        [routeId],
      );
    }

    try {
      await conn.query(
        `INSERT INTO dispatch_route_activity(route_id,user_id,action,details)
         VALUES(?,?,?,?)`,
        [routeId, changedBy, "order.cancelled.auto_detach", JSON.stringify({
          order_id: orderId,
          operation_ids: removedOperations
            .filter(x => x.route_id === routeId)
            .map(x => x.operation_id),
          reason: reason || null,
          sync: "immediate",
        })],
      );
    } catch (e) {
      if (e && e.code !== "ER_NO_SUCH_TABLE") throw e;
    }
  }

  return {
    order_id: orderId,
    removed_operations: removedOperations,
    affected_route_ids: [...touchedRoutes],
    affected_stop_ids: [...touchedStops],
  };
}

function statusAfterStop(taskType) {
  if (taskType === "pickup") return "picked_up"; // affiché « À livrer »
  if (taskType === "delivery") return "completed";
  return null;
}

function packageStatusAfterStop(taskType) {
  if (taskType === "pickup") return "picked_up";
  if (taskType === "delivery") return "delivered";
  return null;
}

module.exports = {
  ORDER_STATUSES,
  LABELS,
  transitionOrderStatus,
  cancelOrderEverywhere,
  statusAfterStop,
  packageStatusAfterStop,
};

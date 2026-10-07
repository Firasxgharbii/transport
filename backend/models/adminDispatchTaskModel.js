"use strict";

/**
 * Glory Solutions
 * Consultation des missions regroupées pour l'administration.
 * Lecture seule : aucune modification des commandes ou des scans.
 */

async function getAdminDispatchTasks(connection) {
  const [tasks] = await connection.query(`
    SELECT
      dt.id,
      dt.task_type,
      dt.client_id,
      dt.driver_id,
      dt.vehicle_id,
      dt.address,
      dt.city,
      dt.province,
      dt.postal_code,
      dt.scheduled_date,
      dt.scheduled_time,
      dt.status,
      dt.route_id,
      dt.stop_position,
      dt.notes,
      dt.created_at,

      COUNT(DISTINCT op.order_id) AS total_orders,
      COUNT(DISTINCT p.id) AS total_packages,

      COUNT(
        DISTINCT CASE
          WHEN se.scan_status = 'accepted'
            AND se.scan_type = dt.task_type
            AND se.operation_id = op.id
            AND se.driver_id = dt.driver_id
          THEN p.id
        END
      ) AS scanned_packages

    FROM dispatch_tasks dt

    LEFT JOIN order_operations op
      ON op.dispatch_task_id = dt.id
      AND op.operation_type = dt.task_type
      AND op.status <> 'cancelled'

    LEFT JOIN order_packages p
      ON p.order_id = op.order_id

    LEFT JOIN scan_events se
      ON se.package_id = p.id
      AND se.operation_id = op.id
      AND se.driver_id = dt.driver_id
      AND se.scan_status = 'accepted'
      AND se.scan_type = dt.task_type

    WHERE dt.status IN ('pending', 'assigned')
      AND dt.route_id IS NULL

    GROUP BY dt.id

    ORDER BY
      CASE dt.status
        WHEN 'in_progress' THEN 0
        WHEN 'assigned' THEN 1
        WHEN 'pending' THEN 2
        WHEN 'completed' THEN 3
        ELSE 4
      END,
      dt.scheduled_date,
      dt.scheduled_time,
      dt.id
  `);

  return tasks.map(task => ({
    ...task,
    total_orders: Number(task.total_orders),
    total_packages: Number(task.total_packages),
    scanned_packages: Number(task.scanned_packages),
    remaining_packages:
      Number(task.total_packages) -
      Number(task.scanned_packages),
  }));
}


/**
 * Supprime uniquement le regroupement opérationnel d'une mission non commencée.
 * Les commandes et les colis ne sont jamais supprimés.
 * Toute preuve d'exécution (scan, exception, preuve, stop démarré/fermé) bloque la suppression.
 */
async function deleteAdminDispatchTask(connection, taskId) {
  const id = Number(taskId);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Mission invalide.");

  const conn = await connection.getConnection();
  try {
    await conn.beginTransaction();
    const [[task]] = await conn.query(
      `SELECT id, route_id, status FROM dispatch_tasks WHERE id=? FOR UPDATE`, [id]
    );
    if (!task) throw new Error("Mission introuvable.");
    if (!["pending", "assigned"].includes(String(task.status))) {
      throw new Error("Cette mission a déjà commencé. Suppression bloquée pour préserver la traçabilité.");
    }

    const [ops] = await conn.query(
      `SELECT id, status FROM order_operations WHERE dispatch_task_id=? FOR UPDATE`, [id]
    );
    if (ops.some(op => !["pending", "assigned"].includes(String(op.status)))) {
      throw new Error("Une opération de cette mission a déjà commencé. Suppression bloquée.");
    }

    // Un scan accepté est une preuve métier : on ne détruit jamais la mission dans ce cas.
    const [[scanRow]] = await conn.query(
      `SELECT COUNT(*) AS total FROM scan_events se
       WHERE se.operation_id IN (SELECT id FROM order_operations WHERE dispatch_task_id=?)
         AND se.scan_status='accepted'`, [id]
    );
    if (Number(scanRow?.total || 0) > 0) {
      throw new Error("Des colis ont déjà été scannés. La mission doit rester dans l'historique.");
    }

    const [[exceptionRow]] = await conn.query(
      `SELECT COUNT(*) AS total FROM driver_package_exceptions WHERE dispatch_task_id=?`, [id]
    );
    const [[proofRow]] = await conn.query(
      `SELECT COUNT(*) AS total FROM driver_delivery_proofs WHERE dispatch_task_id=?`, [id]
    );
    if (Number(exceptionRow?.total || 0) > 0 || Number(proofRow?.total || 0) > 0) {
      throw new Error("Cette mission contient déjà une exception ou une preuve. Suppression bloquée.");
    }

    // driver_stop_runs peut exister simplement parce que le stop a été consulté.
    // On ne supprime que les runs vierges; un run commencé/fermé protège la mission.
    const [runs] = await conn.query(
      `SELECT id, execution_status, started_at, closed_at
       FROM driver_stop_runs WHERE dispatch_task_id=? FOR UPDATE`, [id]
    );
    if (runs.some(r => r.started_at || r.closed_at || !["todo"].includes(String(r.execution_status)))) {
      throw new Error("Cette mission possède un historique chauffeur. Suppression bloquée.");
    }

    const routeId = task.route_id ? Number(task.route_id) : null;

    // Les opérations redeviennent non planifiées. Leur statut métier reste inchangé.
    await conn.query(
      `UPDATE order_operations
       SET dispatch_task_id=NULL, driver_id=NULL, vehicle_id=NULL, scheduled_date=NULL
       WHERE dispatch_task_id=?`, [id]
    );

    // Retire seulement les runs vierges responsables du FK ON DELETE RESTRICT.
    await conn.query(`DELETE FROM driver_stop_runs WHERE dispatch_task_id=?`, [id]);
    await conn.query(`DELETE FROM dispatch_tasks WHERE id=?`, [id]);

    // Recompacte l'ordre de la route si la mission en faisait partie.
    if (routeId) {
      const [remaining] = await conn.query(
        `SELECT id FROM dispatch_tasks WHERE route_id=? ORDER BY stop_position,id FOR UPDATE`, [routeId]
      );
      for (let i = 0; i < remaining.length; i++) {
        await conn.query(`UPDATE dispatch_tasks SET stop_position=? WHERE id=?`, [i + 1, remaining[i].id]);
      }
    }

    await conn.commit();
    return { success: true, task_id: id, detached_operations: ops.length };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  getAdminDispatchTasks,
  deleteAdminDispatchTask,
};

const db = require("../config/db");

const ALLOWED_STATUSES = [
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

function positiveInt(value, fallback = null) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function buildFilters(filters = {}) {
  const where = [];
  const params = [];
  const search = String(filters.search || "").trim();

  if (search) {
    where.push(`(
      o.order_number LIKE ? OR c.company_name LIKE ? OR
      c.first_name LIKE ? OR c.last_name LIKE ? OR
      o.pickup_address LIKE ? OR o.delivery_address LIKE ?
    )`);
    const term = `%${search}%`;
    params.push(term, term, term, term, term, term);
  }

  const clientId = positiveInt(filters.client_id);
  if (clientId) { where.push("o.client_id = ?"); params.push(clientId); }

  const driverId = positiveInt(filters.driver_id);
  if (driverId) { where.push("o.driver_id = ?"); params.push(driverId); }

  const status = String(filters.status || "").trim();
  if (status && ALLOWED_STATUSES.includes(status)) {
    where.push("o.status = ?"); params.push(status);
  }

  return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

const DispatchModel = {
  async getOrders(filters = {}) {
    const page = positiveInt(filters.page, 1);
    const limit = Math.min(Math.max(positiveInt(filters.limit, 100), 1), 250);
    const offset = (page - 1) * limit;
    const { sql, params } = buildFilters(filters);

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM orders o INNER JOIN clients c ON c.id = o.client_id ${sql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await db.query(
      `SELECT
        o.id, o.order_number, o.client_id, o.driver_id, o.vehicle_id,
        o.pickup_address, o.delivery_address, o.pickup_date, o.pickup_time,
        o.delivery_date, o.delivery_time, o.priority, o.status, o.route_position,
        c.first_name AS client_first_name, c.last_name AS client_last_name, c.company_name,
        u.first_name AS driver_first_name, u.last_name AS driver_last_name,
        TRIM(CONCAT_WS(' ', v.make, v.model)) AS vehicle_name,
        v.plate AS vehicle_plate
      FROM orders o
      INNER JOIN clients c ON c.id = o.client_id
      LEFT JOIN drivers d ON d.id = o.driver_id
      LEFT JOIN users u ON u.id = d.user_id
      LEFT JOIN vehicles v ON v.id = o.vehicle_id
      ${sql}
      ORDER BY
        CASE WHEN o.route_position IS NULL THEN 1 ELSE 0 END,
        o.route_position ASC,
        COALESCE(o.pickup_date, DATE(o.created_at)) ASC,
        COALESCE(o.pickup_time, '23:59:59') ASC,
        o.id ASC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return { rows, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
  },

  async getMatchingIds(filters = {}) {
    const { sql, params } = buildFilters(filters);
    const [rows] = await db.query(
      `SELECT o.id FROM orders o INNER JOIN clients c ON c.id = o.client_id ${sql} ORDER BY o.id ASC LIMIT 5000`,
      params,
    );
    return rows.map((row) => Number(row.id));
  },

  async bulkUpdate(orderIds, changes) {
    const ids = [...new Set(orderIds.map(Number))]
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, 1000);
    if (!ids.length) throw new Error("Aucune commande valide.");

    const sets = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(changes, "driver_id")) {
      if (changes.driver_id !== null && !positiveInt(changes.driver_id)) throw new Error("Chauffeur invalide.");
      sets.push("driver_id = ?");
      values.push(changes.driver_id === null ? null : Number(changes.driver_id));
    }

    if (Object.prototype.hasOwnProperty.call(changes, "vehicle_id")) {
      if (changes.vehicle_id !== null && !positiveInt(changes.vehicle_id)) throw new Error("Véhicule invalide.");
      sets.push("vehicle_id = ?");
      values.push(changes.vehicle_id === null ? null : Number(changes.vehicle_id));
    }

    if (Object.prototype.hasOwnProperty.call(changes, "status")) {
      const status = String(changes.status || "");
      if (!ALLOWED_STATUSES.includes(status)) throw new Error("Statut invalide.");
      sets.push("status = ?");
      values.push(status);
    }

    if (!sets.length) throw new Error("Aucune modification à appliquer.");
    sets.push("updated_at = CURRENT_TIMESTAMP");

    const placeholders = ids.map(() => "?").join(",");
    const [result] = await db.query(
      `UPDATE orders SET ${sets.join(", ")} WHERE id IN (${placeholders})`,
      [...values, ...ids],
    );

    return { affectedRows: result.affectedRows || 0, ids };
  },

  async reorder(items) {
    const normalized = items
      .map((item) => ({ id: positiveInt(item?.id), route_position: positiveInt(item?.route_position) }))
      .filter((item) => item.id && item.route_position)
      .slice(0, 1000);
    if (!normalized.length) throw new Error("Aucune position valide.");

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const chunkSize = 200;
      for (let start = 0; start < normalized.length; start += chunkSize) {
        const chunk = normalized.slice(start, start + chunkSize);
        const caseParts = [];
        const caseValues = [];
        const ids = [];
        for (const item of chunk) {
          caseParts.push("WHEN ? THEN ?");
          caseValues.push(item.id, item.route_position);
          ids.push(item.id);
        }
        await connection.query(
          `UPDATE orders SET
            route_position = CASE id ${caseParts.join(" ")} ELSE route_position END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id IN (${ids.map(() => "?").join(",")})`,
          [...caseValues, ...ids],
        );
      }
      await connection.commit();
      return { affectedRows: normalized.length };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

module.exports = DispatchModel;

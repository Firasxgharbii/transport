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

const ALLOWED_OPERATION_TYPES = [
  "pickup",
  "warehouse_in",
  "warehouse_storage",
  "warehouse_out",
  "delivery",
];

const ALLOWED_OPERATION_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
];

function positiveInt(value, fallback = null) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function nullablePositiveInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = positiveInt(value);
  if (!n) throw new Error("Identifiant invalide.");
  return n;
}

function nullableText(value, maxLength = null) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return maxLength ? text.slice(0, maxLength) : text;
}

function nullableDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("Date invalide.");
  return text;
}

function nullableTime(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(text)) throw new Error("Heure invalide.");
  return text.length === 5 ? `${text}:00` : text;
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
  if (clientId) {
    where.push("o.client_id = ?");
    params.push(clientId);
  }

  const driverId = positiveInt(filters.driver_id);
  if (driverId) {
    where.push(`(
      o.driver_id = ? OR EXISTS (
        SELECT 1
        FROM order_operations oo_filter
        WHERE oo_filter.order_id = o.id
          AND oo_filter.driver_id = ?
      )
    )`);
    params.push(driverId, driverId);
  }

  const status = String(filters.status || "").trim();
  if (status && ALLOWED_STATUSES.includes(status)) {
    where.push("o.status = ?");
    params.push(status);
  }

  return {
    sql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

async function ensureOrderExists(connectionOrDb, orderId) {
  const [rows] = await connectionOrDb.query(
    "SELECT id FROM orders WHERE id = ? LIMIT 1",
    [orderId],
  );
  if (!rows.length) throw new Error("Commande introuvable.");
}

async function ensureDriverExists(connectionOrDb, driverId) {
  if (!driverId) return;
  const [rows] = await connectionOrDb.query(
    "SELECT id FROM drivers WHERE id = ? LIMIT 1",
    [driverId],
  );
  if (!rows.length) throw new Error("Chauffeur introuvable.");
}

async function ensureVehicleExists(connectionOrDb, vehicleId) {
  if (!vehicleId) return;
  const [rows] = await connectionOrDb.query(
    "SELECT id FROM vehicles WHERE id = ? LIMIT 1",
    [vehicleId],
  );
  if (!rows.length) throw new Error("Véhicule introuvable.");
}

function normalizeOperationInput(data = {}, { partial = false } = {}) {
  const output = {};

  if (!partial || Object.prototype.hasOwnProperty.call(data, "operation_type")) {
    const type = String(data.operation_type || "").trim();
    if (!ALLOWED_OPERATION_TYPES.includes(type)) {
      throw new Error("Type d’opération invalide.");
    }
    output.operation_type = type;
  }

  if (Object.prototype.hasOwnProperty.call(data, "driver_id")) {
    output.driver_id = nullablePositiveInt(data.driver_id);
  }

  if (Object.prototype.hasOwnProperty.call(data, "vehicle_id")) {
    output.vehicle_id = nullablePositiveInt(data.vehicle_id);
  }

  if (Object.prototype.hasOwnProperty.call(data, "warehouse_name")) {
    output.warehouse_name = nullableText(data.warehouse_name, 150);
  }

  if (Object.prototype.hasOwnProperty.call(data, "scheduled_date")) {
    output.scheduled_date = nullableDate(data.scheduled_date);
  }

  if (Object.prototype.hasOwnProperty.call(data, "scheduled_time")) {
    output.scheduled_time = nullableTime(data.scheduled_time);
  }

  if (Object.prototype.hasOwnProperty.call(data, "completed_at")) {
    output.completed_at = data.completed_at ? new Date(data.completed_at) : null;
    if (output.completed_at && Number.isNaN(output.completed_at.getTime())) {
      throw new Error("Date de complétion invalide.");
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(data, "status")) {
    const status = String(data.status || (partial ? "" : "pending")).trim();
    if (!ALLOWED_OPERATION_STATUSES.includes(status)) {
      throw new Error("Statut d’opération invalide.");
    }
    output.status = status;
  }

  if (Object.prototype.hasOwnProperty.call(data, "route_position")) {
    output.route_position = nullablePositiveInt(data.route_position);
  }

  if (Object.prototype.hasOwnProperty.call(data, "notes")) {
    output.notes = nullableText(data.notes);
  }

  if (!partial && !Object.prototype.hasOwnProperty.call(output, "driver_id")) output.driver_id = null;
  if (!partial && !Object.prototype.hasOwnProperty.call(output, "vehicle_id")) output.vehicle_id = null;
  if (!partial && !Object.prototype.hasOwnProperty.call(output, "warehouse_name")) output.warehouse_name = null;
  if (!partial && !Object.prototype.hasOwnProperty.call(output, "scheduled_date")) output.scheduled_date = null;
  if (!partial && !Object.prototype.hasOwnProperty.call(output, "scheduled_time")) output.scheduled_time = null;
  if (!partial && !Object.prototype.hasOwnProperty.call(output, "completed_at")) output.completed_at = null;
  if (!partial && !Object.prototype.hasOwnProperty.call(output, "route_position")) output.route_position = null;
  if (!partial && !Object.prototype.hasOwnProperty.call(output, "notes")) output.notes = null;

  return output;
}

const DispatchModel = {
  ALLOWED_OPERATION_TYPES,
  ALLOWED_OPERATION_STATUSES,

  async getOrders(filters = {}) {
    const page = positiveInt(filters.page, 1);
    const limit = Math.min(Math.max(positiveInt(filters.limit, 100), 1), 250);
    const offset = (page - 1) * limit;
    const { sql, params } = buildFilters(filters);

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM orders o
       INNER JOIN clients c ON c.id = o.client_id
       ${sql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await db.query(
      `SELECT
        o.id,
        o.order_number,
        o.client_id,
        o.driver_id,
        o.vehicle_id,
        o.pickup_address,
        o.delivery_address,
        o.pickup_date,
        o.pickup_time,
        o.delivery_date,
        o.delivery_time,
        o.priority,
        o.status,
        o.route_position,
        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.company_name,
        u.first_name AS driver_first_name,
        u.last_name AS driver_last_name,
        TRIM(CONCAT_WS(' ', v.make, v.model)) AS vehicle_name,
        v.plate AS vehicle_plate,
        COUNT(DISTINCT oo.id) AS operation_count,
        SUM(CASE WHEN oo.operation_type = 'pickup' AND oo.status <> 'cancelled' THEN 1 ELSE 0 END) AS pickup_operation_count,
        SUM(CASE WHEN oo.operation_type IN ('warehouse_in', 'warehouse_storage', 'warehouse_out') AND oo.status <> 'cancelled' THEN 1 ELSE 0 END) AS warehouse_operation_count,
        SUM(CASE WHEN oo.operation_type = 'delivery' AND oo.status <> 'cancelled' THEN 1 ELSE 0 END) AS delivery_operation_count,
        SUM(CASE WHEN oo.status = 'completed' THEN 1 ELSE 0 END) AS completed_operation_count
      FROM orders o
      INNER JOIN clients c ON c.id = o.client_id
      LEFT JOIN drivers d ON d.id = o.driver_id
      LEFT JOIN users u ON u.id = d.user_id
      LEFT JOIN vehicles v ON v.id = o.vehicle_id
      LEFT JOIN order_operations oo ON oo.order_id = o.id
      ${sql}
      GROUP BY
        o.id,
        o.order_number,
        o.client_id,
        o.driver_id,
        o.vehicle_id,
        o.pickup_address,
        o.delivery_address,
        o.pickup_date,
        o.pickup_time,
        o.delivery_date,
        o.delivery_time,
        o.priority,
        o.status,
        o.route_position,
        c.first_name,
        c.last_name,
        c.company_name,
        u.first_name,
        u.last_name,
        v.make,
        v.model,
        v.plate
      ORDER BY
        CASE WHEN o.route_position IS NULL THEN 1 ELSE 0 END,
        o.route_position ASC,
        COALESCE(o.pickup_date, DATE(o.created_at)) ASC,
        COALESCE(o.pickup_time, '23:59:59') ASC,
        o.id ASC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      rows,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async getMatchingIds(filters = {}) {
    const { sql, params } = buildFilters(filters);
    const [rows] = await db.query(
      `SELECT DISTINCT o.id
       FROM orders o
       INNER JOIN clients c ON c.id = o.client_id
       ${sql}
       ORDER BY o.id ASC
       LIMIT 5000`,
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
      if (changes.driver_id !== null && !positiveInt(changes.driver_id)) {
        throw new Error("Chauffeur invalide.");
      }
      sets.push("driver_id = ?");
      values.push(changes.driver_id === null ? null : Number(changes.driver_id));
    }

    if (Object.prototype.hasOwnProperty.call(changes, "vehicle_id")) {
      if (changes.vehicle_id !== null && !positiveInt(changes.vehicle_id)) {
        throw new Error("Véhicule invalide.");
      }
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
      .map((item) => ({
        id: positiveInt(item?.id),
        route_position: positiveInt(item?.route_position),
      }))
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

  async getOrderOperations(orderId) {
    const id = positiveInt(orderId);
    if (!id) throw new Error("Commande invalide.");

    await ensureOrderExists(db, id);

    const [rows] = await db.query(
      `SELECT
        oo.id,
        oo.order_id,
        oo.operation_type,
        oo.driver_id,
        oo.vehicle_id,
        oo.warehouse_name,
        oo.scheduled_date,
        oo.scheduled_time,
        oo.completed_at,
        oo.status,
        oo.route_position,
        oo.notes,
        oo.created_at,
        oo.updated_at,
        o.order_number,
        u.first_name AS driver_first_name,
        u.last_name AS driver_last_name,
        TRIM(CONCAT_WS(' ', v.make, v.model)) AS vehicle_name,
        v.plate AS vehicle_plate
      FROM order_operations oo
      INNER JOIN orders o ON o.id = oo.order_id
      LEFT JOIN drivers d ON d.id = oo.driver_id
      LEFT JOIN users u ON u.id = d.user_id
      LEFT JOIN vehicles v ON v.id = oo.vehicle_id
      WHERE oo.order_id = ?
      ORDER BY
        CASE WHEN oo.route_position IS NULL THEN 1 ELSE 0 END,
        oo.route_position ASC,
        COALESCE(oo.scheduled_date, DATE(oo.created_at)) ASC,
        COALESCE(oo.scheduled_time, '23:59:59') ASC,
        oo.id ASC`,
      [id],
    );

    return rows;
  },

  async createOperation(orderId, data = {}) {
    const id = positiveInt(orderId);
    if (!id) throw new Error("Commande invalide.");

    const operation = normalizeOperationInput(data);
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();
      await ensureOrderExists(connection, id);
      await ensureDriverExists(connection, operation.driver_id);
      await ensureVehicleExists(connection, operation.vehicle_id);

      const [result] = await connection.query(
        `INSERT INTO order_operations (
          order_id,
          operation_type,
          driver_id,
          vehicle_id,
          warehouse_name,
          scheduled_date,
          scheduled_time,
          completed_at,
          status,
          route_position,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          operation.operation_type,
          operation.driver_id,
          operation.vehicle_id,
          operation.warehouse_name,
          operation.scheduled_date,
          operation.scheduled_time,
          operation.completed_at,
          operation.status,
          operation.route_position,
          operation.notes,
        ],
      );

      await connection.commit();
      return this.getOperationById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getOperationById(operationId) {
    const id = positiveInt(operationId);
    if (!id) throw new Error("Opération invalide.");

    const [rows] = await db.query(
      `SELECT
        oo.*,
        o.order_number,
        u.first_name AS driver_first_name,
        u.last_name AS driver_last_name,
        TRIM(CONCAT_WS(' ', v.make, v.model)) AS vehicle_name,
        v.plate AS vehicle_plate
      FROM order_operations oo
      INNER JOIN orders o ON o.id = oo.order_id
      LEFT JOIN drivers d ON d.id = oo.driver_id
      LEFT JOIN users u ON u.id = d.user_id
      LEFT JOIN vehicles v ON v.id = oo.vehicle_id
      WHERE oo.id = ?
      LIMIT 1`,
      [id],
    );

    if (!rows.length) throw new Error("Opération introuvable.");
    return rows[0];
  },

  async updateOperation(operationId, data = {}) {
    const id = positiveInt(operationId);
    if (!id) throw new Error("Opération invalide.");

    const operation = normalizeOperationInput(data, { partial: true });
    const fields = [];
    const values = [];

    const fieldMap = [
      "operation_type",
      "driver_id",
      "vehicle_id",
      "warehouse_name",
      "scheduled_date",
      "scheduled_time",
      "completed_at",
      "status",
      "route_position",
      "notes",
    ];

    for (const field of fieldMap) {
      if (Object.prototype.hasOwnProperty.call(operation, field)) {
        fields.push(`${field} = ?`);
        values.push(operation[field]);
      }
    }

    if (!fields.length) throw new Error("Aucune modification à appliquer.");

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [currentRows] = await connection.query(
        "SELECT id FROM order_operations WHERE id = ? LIMIT 1",
        [id],
      );
      if (!currentRows.length) throw new Error("Opération introuvable.");

      if (Object.prototype.hasOwnProperty.call(operation, "driver_id")) {
        await ensureDriverExists(connection, operation.driver_id);
      }
      if (Object.prototype.hasOwnProperty.call(operation, "vehicle_id")) {
        await ensureVehicleExists(connection, operation.vehicle_id);
      }

      fields.push("updated_at = CURRENT_TIMESTAMP");
      await connection.query(
        `UPDATE order_operations SET ${fields.join(", ")} WHERE id = ?`,
        [...values, id],
      );

      await connection.commit();
      return this.getOperationById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async deleteOperation(operationId) {
    const id = positiveInt(operationId);
    if (!id) throw new Error("Opération invalide.");

    const [result] = await db.query(
      "DELETE FROM order_operations WHERE id = ?",
      [id],
    );

    if (!result.affectedRows) throw new Error("Opération introuvable.");
    return { affectedRows: result.affectedRows };
  },
};

module.exports = DispatchModel;
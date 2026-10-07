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
  "load_vehicle",
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
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  }

  const text = String(value).trim();

  if (!/^[1-9]\\d*$/.test(text)) {
    return fallback;
  }

  const n = Number(text);

  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
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

  // Ne pas reproposer une commande pendant qu'une mission active la traite.
  // Une fois le ramassage termine, la commande peut revenir pour planifier
  // sa livraison. Aucune commande ni aucun colis n'est supprime.
  where.push(`NOT EXISTS (
    SELECT 1 FROM order_operations planned_op
    INNER JOIN dispatch_tasks planned_task
      ON planned_task.id = planned_op.dispatch_task_id
    WHERE planned_op.order_id = o.id
      AND planned_op.status <> 'cancelled'
      AND planned_task.status NOT IN ('completed', 'cancelled')
  )`);


  if (search) {
    where.push(`(
      o.order_number LIKE ? OR c.company_name LIKE ? OR
      c.first_name LIKE ? OR c.last_name LIKE ? OR
      o.pickup_address LIKE ? OR o.delivery_address LIKE ?
    )`);
    const term = `%${search}%`;
    params.push(term, term, term, term, term, term);
  }

  const rawClientId = String(filters.client_id ?? "").trim();
  if (rawClientId) {
    const clientId = Number(rawClientId);

    if (!Number.isSafeInteger(clientId) || clientId <= 0) {
      throw new Error("Identifiant client invalide.");
    }

    where.push("o.client_id = ?");
    params.push(clientId);
  }

  const rawDriverId = String(filters.driver_id ?? "").trim();
  if (rawDriverId) {
    const driverId = Number(rawDriverId);

    if (!Number.isSafeInteger(driverId) || driverId <= 0) {
      throw new Error("Identifiant chauffeur invalide.");
    }

    where.push(`(
      o.driver_id = ?
      OR o.pickup_driver_id = ?
      OR o.delivery_driver_id = ?
      OR EXISTS (
        SELECT 1
        FROM order_operations oo_filter
        WHERE oo_filter.order_id = o.id
          AND oo_filter.driver_id = ?
          AND oo_filter.status <> 'cancelled'
      )
    )`);

    params.push(driverId, driverId, driverId, driverId);
  }

  const status = String(filters.status || "").trim();
  if (status && ALLOWED_STATUSES.includes(status)) {
    where.push("o.status = ?");
    params.push(status);
  } else {
    // Le Dispatch est une vue de travail active. Les livraisons terminées et
    // commandes annulées restent dans l'historique, jamais dans le Dispatch actif.
    where.push("o.status NOT IN ('completed','cancelled')");
  }


  const dateColumns = {
    pickup: "o.pickup_date",
    delivery: "o.delivery_date",
    created: "o.created_at",
  };

  const dateType = String(filters.date_type || "pickup").trim();

  if (!Object.prototype.hasOwnProperty.call(dateColumns, dateType)) {
    throw new Error("Type de date invalide.");
  }

  const dateColumn = dateColumns[dateType];

  const dateFrom = String(filters.date_from || "").trim();
  const dateTo = String(filters.date_to || "").trim();

  const validDate = /^\d{4}-\d{2}-\d{2}$/;

  if (dateFrom && !validDate.test(dateFrom)) {
    throw new Error("Date de début invalide.");
  }

  if (dateTo && !validDate.test(dateTo)) {
    throw new Error("Date de fin invalide.");
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error("La date de début dépasse la date de fin.");
  }

  if (dateFrom) {
    where.push(`${dateColumn} >= ?`);
    params.push(dateFrom);
  }

  if (dateTo) {
    where.push(`${dateColumn} < DATE_ADD(?, INTERVAL 1 DAY)`);
    params.push(dateTo);
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

  async getOrderSnapshotById(orderId) {
    const id = positiveInt(orderId);
    if (!id) return null;

    const [rows] = await db.query(
      `SELECT
        id,
        order_number,
        driver_id,
        vehicle_id,
        status,
        route_position,
        updated_at
      FROM orders
      WHERE id = ?
      LIMIT 1`,
      [id],
    );

    return rows[0] || null;
  },

  async getOrderSnapshots(orderIds = []) {
    if (!Array.isArray(orderIds) || orderIds.length < 1) {
      return [];
    }

    const ids = orderIds.map((value) => positiveInt(value));

    if (ids.some((id) => !id)) {
      throw new Error("Identifiant de commande invalide.");
    }

    if (new Set(ids).size !== ids.length) {
      throw new Error("La liste des commandes contient des doublons.");
    }

    if (ids.length > 1000) {
      throw new Error("Trop de commandes.");
    }

    const placeholders = ids.map(() => "?").join(",");

    const [rows] = await db.query(
      `SELECT
        id,
        order_number,
        driver_id,
        vehicle_id,
        status,
        route_position,
        updated_at
      FROM orders
      WHERE id IN (${placeholders})`,
      ids,
    );

    return rows;
  },

  async getOrders(filters = {}) {
    const page = positiveInt(filters.page, 1);
    const requestedLimit = positiveInt(filters.limit, 100);
    const limit = Math.min(requestedLimit || 100, 250);

    if (page > Math.floor(Number.MAX_SAFE_INTEGER / limit)) {
      throw new Error("Page invalide.");
    }

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
    if (!Array.isArray(orderIds) || orderIds.length < 1 || orderIds.length > 1000) {
      throw new Error("Liste de commandes invalide.");
    }

    const ids = orderIds.map((value) => positiveInt(value));

    if (ids.some((id) => !id)) {
      throw new Error("Identifiant de commande invalide.");
    }

    if (new Set(ids).size !== ids.length) {
      throw new Error("La liste des commandes contient des doublons.");
    }

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
    if (!Array.isArray(items) || items.length < 1 || items.length > 1000) {
      throw new Error("Liste de positions invalide.");
    }

    const normalized = items.map((item) => ({
      id: positiveInt(item?.id),
      route_position: positiveInt(item?.route_position),
    }));

    if (
      normalized.some(
        (item) => !item.id || !item.route_position
      )
    ) {
      throw new Error("Position de commande invalide.");
    }

    const ids = normalized.map((item) => item.id);

    if (new Set(ids).size !== ids.length) {
      throw new Error("La liste des commandes contient des doublons.");
    }

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
      return {
        affectedRows: normalized.length,
        ids: normalized.map((item) => item.id),
      };
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


/*
 * Historique des scans entrepôt / Dispatch.
 * Lecture seule : ne modifie aucun colis ni aucune commande.
 */
DispatchModel.getWarehouseScanHistory = async function (limit = 50) {
  const parsedLimit = Number(limit);

  const safeLimit =
    Number.isSafeInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 200)
      : 50;

  const [rows] = await db.query(
    `
      SELECT
        se.id,
        se.order_id,
        se.package_id,
        se.operation_id,
        se.driver_id,
        se.vehicle_id,
        se.scanned_by_user_id,
        se.scanned_code,
        se.scan_type,
        se.scan_status,
        se.latitude,
        se.longitude,
        se.accuracy,
        se.device_type,
        se.device_name,
        se.scan_source,
        se.notes,
        se.scanned_at,
        se.created_at
      FROM scan_events AS se
      WHERE se.scan_type IN (
        'warehouse_in',
        'warehouse_storage',
        'warehouse_out'
      )
      ORDER BY se.scanned_at DESC, se.id DESC
      LIMIT ?
    `,
    [safeLimit]
  );

  return rows;
};


/*
 * Entrée physique au triage.
 * Contrairement au scanner chauffeur, ce scan ne dépend d'aucune affectation
 * chauffeur. L'utilisateur qui scanne vient exclusivement du JWT.
 */
DispatchModel.processWarehouseScan = async function (scannedByUserId, payload = {}) {
  const userId = positiveInt(scannedByUserId);
  if (!userId) {
    const error = new Error("Utilisateur non authentifié.");
    error.statusCode = 401;
    throw error;
  }

  const cleanCode = String(payload.scanned_code || payload.barcode || payload.code || "")
    .trim()
    .toUpperCase();
  if (!cleanCode) {
    const error = new Error("Le code-barres est obligatoire.");
    error.statusCode = 400;
    throw error;
  }

  const requestedType = String(payload.scan_type || "warehouse_in").trim().toLowerCase();
  if (requestedType !== "warehouse_in") {
    const error = new Error("Le module Triage accepte uniquement les entrées entrepôt.");
    error.statusCode = 400;
    throw error;
  }

  const source = String(payload.scan_source || "manual").trim().toLowerCase();
  const allowedSources = new Set(["camera", "zebra", "manual", "barcode_scanner"]);
  const scanSource = allowedSources.has(source) ? source : "manual";
  const nullableNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const barcodeMatch = /^(GLY-\d{4}-\d{6})-P(\d{1,3})$/.exec(cleanCode);
    const compatibleCode = barcodeMatch
      ? `${barcodeMatch[1]}-P${barcodeMatch[2].padStart(3, "0")}`
      : cleanCode;

    let [packageRows] = await connection.query(
      `SELECT p.id,p.order_id,p.barcode,p.package_number,p.description,p.weight,p.current_status,o.order_number
       FROM order_packages p
       INNER JOIN orders o ON o.id=p.order_id
       WHERE UPPER(TRIM(p.barcode)) IN (?,?)
       ORDER BY CASE WHEN UPPER(TRIM(p.barcode))=? THEN 0 ELSE 1 END
       LIMIT 1 FOR UPDATE`,
      [cleanCode, compatibleCode, cleanCode]
    );
    let packageRow = packageRows[0] || null;

    if (!packageRow && barcodeMatch) {
      const [legacyRows] = await connection.query(
        `SELECT p.id,p.order_id,p.barcode,p.package_number,p.description,p.weight,p.current_status,o.order_number
         FROM order_packages p
         INNER JOIN orders o ON o.id=p.order_id
         WHERE UPPER(TRIM(o.order_number))=? AND p.package_number=?
           AND UPPER(TRIM(p.barcode))=UPPER(TRIM(o.order_number))
         LIMIT 1 FOR UPDATE`,
        [barcodeMatch[1], Number(barcodeMatch[2])]
      );
      packageRow = legacyRows[0] || null;
    }

    // Compatibilité : scanner la référence de commande crée P01 si nécessaire.
    if (!packageRow) {
      const referenceMatch = /^GLY-\d{4}-(\d{6})$/.exec(cleanCode);
      const referenceOrderId = referenceMatch ? Number(referenceMatch[1]) : null;
      const [orderRows] = await connection.query(
        `SELECT id,order_number FROM orders
         WHERE UPPER(TRIM(order_number))=? OR (? IS NOT NULL AND id=?)
         ORDER BY CASE WHEN UPPER(TRIM(order_number))=? THEN 0 ELSE 1 END LIMIT 1`,
        [cleanCode, referenceOrderId, referenceOrderId, cleanCode]
      );
      const order = orderRows[0] || null;
      if (order) {
        const generatedBarcode = `${String(order.order_number).toUpperCase()}-P01`;
        await connection.query(
          `INSERT INTO order_packages (order_id,barcode,package_number,current_status)
           VALUES (?,?,1,'created')
           ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),updated_at=CURRENT_TIMESTAMP`,
          [order.id, generatedBarcode]
        );
        [packageRows] = await connection.query(
          `SELECT p.id,p.order_id,p.barcode,p.package_number,p.description,p.weight,p.current_status,o.order_number
           FROM order_packages p INNER JOIN orders o ON o.id=p.order_id
           WHERE p.order_id=? AND p.package_number=1 LIMIT 1 FOR UPDATE`,
          [order.id]
        );
        packageRow = packageRows[0] || null;
      }
    }

    if (!packageRow) {
      const error = new Error("Aucun colis ou numéro de commande correspondant à ce code.");
      error.statusCode = 404;
      throw error;
    }

    const [duplicateRows] = await connection.query(
      `SELECT id,operation_id,driver_id,vehicle_id,scanned_at
       FROM scan_events
       WHERE package_id=? AND scan_type='warehouse_in' AND scan_status='accepted'
       ORDER BY id DESC LIMIT 1`,
      [packageRow.id]
    );
    const previous = duplicateRows[0] || null;

    // L'opération est informative seulement. Le triage ne dépend pas d'un chauffeur.
    const [operationRows] = await connection.query(
      `SELECT id,driver_id,vehicle_id,dispatch_task_id,status
       FROM order_operations
       WHERE order_id=? AND operation_type='delivery' AND status<>'cancelled'
       ORDER BY CASE WHEN status IN ('pending','assigned') THEN 0 ELSE 1 END,id DESC LIMIT 1`,
      [packageRow.order_id]
    );
    const operation = operationRows[0] || null;

    if (previous) {
      const [dup] = await connection.query(
        `INSERT INTO scan_events
         (order_id,package_id,operation_id,driver_id,vehicle_id,scanned_by_user_id,scanned_code,scan_type,scan_status,
          latitude,longitude,accuracy,device_type,device_name,scan_source,notes)
         VALUES (?,?,?,?,?,?,?,'warehouse_in','duplicate',?,?,?,?,?,?,?,?)`,
        [packageRow.order_id,packageRow.id,operation?.id||previous.operation_id||null,
         operation?.driver_id||previous.driver_id||null,operation?.vehicle_id||previous.vehicle_id||null,userId,cleanCode,
         nullableNumber(payload.latitude),nullableNumber(payload.longitude),nullableNumber(payload.accuracy),
         payload.device_type||null,payload.device_name||null,scanSource,payload.notes||"Entrée triage déjà enregistrée."]
      );
      await connection.commit();
      return {success:true,duplicate:true,rejected:false,scan_status:"duplicate",event_id:dup.insertId,
        message:"Ce colis est déjà en attente au triage.",package:packageRow,operation,scan_type:"warehouse_in"};
    }

    const [insert] = await connection.query(
      `INSERT INTO scan_events
       (order_id,package_id,operation_id,driver_id,vehicle_id,scanned_by_user_id,scanned_code,scan_type,scan_status,
        latitude,longitude,accuracy,device_type,device_name,scan_source,notes)
       VALUES (?,?,?,?,?,?,?,'warehouse_in','accepted',?,?,?,?,?,?,?,?)`,
      [packageRow.order_id,packageRow.id,operation?.id||null,operation?.driver_id||null,operation?.vehicle_id||null,userId,cleanCode,
       nullableNumber(payload.latitude),nullableNumber(payload.longitude),nullableNumber(payload.accuracy),
       payload.device_type||null,payload.device_name||null,scanSource,payload.notes||null]
    );

    await connection.query(
      `UPDATE order_packages SET current_status='warehouse_in',updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [packageRow.id]
    );

    await connection.commit();
    return {success:true,duplicate:false,rejected:false,scan_status:"accepted",event_id:insert.insertId,
      message:"Colis accepté — en attente au triage.",package:{...packageRow,current_status:"warehouse_in"},operation,
      scan_type:"warehouse_in"};
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = DispatchModel;
const db = require("../config/db");

const OrderModel = {
  /* =====================================================
     RÉCUPÉRER TOUTES LES COMMANDES
  ===================================================== */

  async getAllOrders() {
    const [rows] = await db.query(`
      SELECT
        o.*,

        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.company_name,
        c.phone AS client_phone,
        c.email AS client_email,

        d.id AS driver_record_id,

        u.first_name AS driver_first_name,
        u.last_name AS driver_last_name,
        COALESCE(d.phone, u.phone) AS driver_phone,

        d.vehicle_name,
        d.vehicle_plate,
        d.availability_status,

        (
          SELECT COUNT(*)
          FROM order_stops os
          WHERE os.order_id = o.id
        ) AS stop_count,

        (
          SELECT COUNT(*)
          FROM order_stops os
          WHERE os.order_id = o.id
            AND os.status = 'completed'
        ) AS completed_stops

      FROM orders o

      INNER JOIN clients c
        ON c.id = o.client_id

      LEFT JOIN drivers d
        ON d.id = o.driver_id

      LEFT JOIN users u
        ON u.id = d.user_id

      ORDER BY o.created_at DESC
    `);

    return rows;
  },

  /* =====================================================
     RÉCUPÉRER UNE COMMANDE
  ===================================================== */

  async getOrderById(id) {
    const [rows] = await db.query(
      `
      SELECT
        o.*,

        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.company_name,
        c.phone AS client_phone,
        c.email AS client_email,
        c.address AS client_address,
        c.city AS client_city,
        c.province AS client_province,
        c.postal_code AS client_postal_code,

        d.id AS driver_record_id,

        u.first_name AS driver_first_name,
        u.last_name AS driver_last_name,
        u.email AS driver_email,
        COALESCE(d.phone, u.phone) AS driver_phone,

        d.vehicle_name,
        d.vehicle_plate,
        d.availability_status,

        (
          SELECT COUNT(*)
          FROM order_stops os
          WHERE os.order_id = o.id
        ) AS stop_count,

        (
          SELECT COUNT(*)
          FROM order_stops os
          WHERE os.order_id = o.id
            AND os.status = 'completed'
        ) AS completed_stops

      FROM orders o

      INNER JOIN clients c
        ON c.id = o.client_id

      LEFT JOIN drivers d
        ON d.id = o.driver_id

      LEFT JOIN users u
        ON u.id = d.user_id

      WHERE o.id = ?

      LIMIT 1
      `,
      [id]
    );

    return rows[0] || null;
  },

  /* =====================================================
     GÉNÉRER UN NUMÉRO DE COMMANDE
  ===================================================== */

  async generateOrderNumber() {
    const year = new Date().getFullYear();

    const [rows] = await db.query(
      `
      SELECT id
      FROM orders
      ORDER BY id DESC
      LIMIT 1
      `
    );

    const nextId =
      rows.length > 0
        ? Number(rows[0].id) + 1
        : 1;

    return `GLY-${year}-${String(
      nextId
    ).padStart(6, "0")}`;
  },

  /* =====================================================
     CRÉER UNE COMMANDE
  ===================================================== */

  async createOrder(data) {
    const {
      order_number,
      client_id,
      driver_id,
      vehicle_id,

      pickup_address,
      delivery_address,

      pickup_date,
      pickup_time,

      delivery_date,
      delivery_time,

      pallets_count,

      description,
      notes,

      subtotal,
      taxes,
      total_amount,

      estimated_distance,
      estimated_duration,

      priority,
      onfleet_task_id,

      status,
    } = data;

    const [result] = await db.query(
      `
      INSERT INTO orders (
        order_number,
        client_id,
        driver_id,
        vehicle_id,

        pickup_address,
        delivery_address,

        pickup_date,
        pickup_time,

        delivery_date,
        delivery_time,

        pallets_count,

        description,
        notes,

        subtotal,
        taxes,
        total_amount,

        estimated_distance,
        estimated_duration,

        priority,
        onfleet_task_id,

        status
      )
      VALUES (
        ?, ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?,
        ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?
      )
      `,
      [
        order_number,
        client_id,
        driver_id || null,
        vehicle_id || null,

        pickup_address,
        delivery_address,

        pickup_date || null,
        pickup_time || null,

        delivery_date || null,
        delivery_time || null,

        pallets_count || 0,

        description || null,
        notes || null,

        subtotal || 0,
        taxes || 0,
        total_amount || 0,

        estimated_distance || null,
        estimated_duration || null,

        priority || "normal",
        onfleet_task_id || null,

        status || "pending",
      ]
    );

    return result.insertId;
  },

  /* =====================================================
     MODIFIER UNE COMMANDE
  ===================================================== */

  async updateOrder(id, data) {
    const allowedFields = [
      "client_id",
      "driver_id",
      "vehicle_id",

      "pickup_address",
      "delivery_address",

      "pickup_date",
      "pickup_time",

      "delivery_date",
      "delivery_time",

      "pallets_count",

      "description",
      "notes",

      "subtotal",
      "taxes",
      "total_amount",

      "estimated_distance",
      "estimated_duration",

      "priority",
      "onfleet_task_id",

      "status",
    ];

    const fields = [];
    const values = [];

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          data,
          field
        )
      ) {
        fields.push(`${field} = ?`);
        values.push(data[field] ?? null);
      }
    }

    if (fields.length === 0) {
      return {
        affectedRows: 0,
        changedRows: 0,
      };
    }

    values.push(id);

    const [result] = await db.query(
      `
      UPDATE orders
      SET
        ${fields.join(", ")},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      values
    );

    return result;
  },

  /* =====================================================
     SUPPRIMER UNE COMMANDE
  ===================================================== */

  async deleteOrder(id) {
    const [result] = await db.query(
      `
      DELETE FROM orders
      WHERE id = ?
      `,
      [id]
    );

    return result;
  },

  /* =====================================================
     ASSIGNER UN CHAUFFEUR
  ===================================================== */

  async assignDriver(
    orderId,
    driverId
  ) {
    const [result] = await db.query(
      `
      UPDATE orders
      SET
        driver_id = ?,
        status = CASE
          WHEN status = 'pending'
          THEN 'assigned'
          ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [driverId, orderId]
    );

    return result;
  },

  /* =====================================================
     ASSIGNER UN VÉHICULE
  ===================================================== */

  async assignVehicle(
    orderId,
    vehicleId
  ) {
    const [result] = await db.query(
      `
      UPDATE orders
      SET
        vehicle_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [vehicleId, orderId]
    );

    return result;
  },

  /* =====================================================
     MODIFIER LE STATUT
  ===================================================== */

  async updateStatus(
    orderId,
    status
  ) {
    const [result] = await db.query(
      `
      UPDATE orders
      SET
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [status, orderId]
    );

    return result;
  },

  /* =====================================================
     HISTORIQUE DES STATUTS
  ===================================================== */

  async insertStatusHistory(
    orderId,
    status,
    userId,
    comment
  ) {
    const [result] = await db.query(
      `
      INSERT INTO order_status_history (
        order_id,
        status,
        changed_by,
        comment
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        orderId,
        status,
        userId || null,
        comment || null,
      ]
    );

    return result.insertId;
  },

  async getOrderTimeline(orderId) {
    const [rows] = await db.query(
      `
      SELECT
        osh.*,
        u.first_name,
        u.last_name,
        u.email

      FROM order_status_history osh

      LEFT JOIN users u
        ON u.id = osh.changed_by

      WHERE osh.order_id = ?

      ORDER BY osh.created_at DESC
      `,
      [orderId]
    );

    return rows;
  },

  /* =====================================================
     ARRÊTS D’UNE COMMANDE
  ===================================================== */

  async getOrderStops(orderId) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM order_stops
      WHERE order_id = ?
      ORDER BY stop_order ASC
      `,
      [orderId]
    );

    return rows;
  },

  async getOrderStopById(stopId) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM order_stops
      WHERE id = ?
      LIMIT 1
      `,
      [stopId]
    );

    return rows[0] || null;
  },

  async createOrderStop(
    orderId,
    data
  ) {
    const {
      stop_order,
      stop_type,

      customer_name,
      company_name,
      contact_name,

      phone,
      email,

      address,
      city,
      province,
      postal_code,

      latitude,
      longitude,

      scheduled_start,
      scheduled_end,

      status,
      notes,
    } = data;

    const [result] = await db.query(
      `
      INSERT INTO order_stops (
        order_id,
        stop_order,
        stop_type,

        customer_name,
        company_name,
        contact_name,

        phone,
        email,

        address,
        city,
        province,
        postal_code,

        latitude,
        longitude,

        scheduled_start,
        scheduled_end,

        status,
        notes
      )
      VALUES (
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?
      )
      `,
      [
        orderId,
        stop_order,
        stop_type,

        customer_name || null,
        company_name || null,
        contact_name || null,

        phone || null,
        email || null,

        address,
        city || null,
        province || null,
        postal_code || null,

        latitude || null,
        longitude || null,

        scheduled_start || null,
        scheduled_end || null,

        status || "pending",
        notes || null,
      ]
    );

    return result.insertId;
  },

  async updateOrderStop(
    stopId,
    data
  ) {
    const allowedFields = [
      "stop_order",
      "stop_type",

      "customer_name",
      "company_name",
      "contact_name",

      "phone",
      "email",

      "address",
      "city",
      "province",
      "postal_code",

      "latitude",
      "longitude",

      "scheduled_start",
      "scheduled_end",

      "arrived_at",
      "completed_at",

      "status",
      "notes",
    ];

    const fields = [];
    const values = [];

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          data,
          field
        )
      ) {
        fields.push(`${field} = ?`);
        values.push(data[field] ?? null);
      }
    }

    if (fields.length === 0) {
      return {
        affectedRows: 0,
        changedRows: 0,
      };
    }

    values.push(stopId);

    const [result] = await db.query(
      `
      UPDATE order_stops
      SET
        ${fields.join(", ")},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      values
    );

    return result;
  },

  async deleteOrderStop(stopId) {
    const [result] = await db.query(
      `
      DELETE FROM order_stops
      WHERE id = ?
      `,
      [stopId]
    );

    return result;
  },

  /* =====================================================
     COMMANDES D’UN CHAUFFEUR
  ===================================================== */

  async getDriverOrders(driverId) {
    const [rows] = await db.query(
      `
      SELECT
        o.*,

        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.company_name,
        c.phone AS client_phone,
        c.email AS client_email,

        (
          SELECT COUNT(*)
          FROM order_stops os
          WHERE os.order_id = o.id
        ) AS stop_count,

        (
          SELECT COUNT(*)
          FROM order_stops os
          WHERE os.order_id = o.id
            AND os.status = 'completed'
        ) AS completed_stops

      FROM orders o

      INNER JOIN clients c
        ON c.id = o.client_id

      WHERE o.driver_id = ?

      ORDER BY
        COALESCE(
          o.pickup_date,
          DATE(o.created_at)
        ) DESC,
        o.pickup_time DESC
      `,
      [driverId]
    );

    return rows;
  },

  /* =====================================================
     PREUVES DE LIVRAISON
  ===================================================== */

  async getDeliveryProofs(orderId) {
    const [rows] = await db.query(
      `
      SELECT
        dp.*,

        u.first_name AS driver_first_name,
        u.last_name AS driver_last_name

      FROM delivery_proofs dp

      LEFT JOIN drivers d
        ON d.id = dp.driver_id

      LEFT JOIN users u
        ON u.id = d.user_id

      WHERE dp.order_id = ?

      ORDER BY dp.created_at DESC
      `,
      [orderId]
    );

    return rows;
  },

  async createDeliveryProof(data) {
    const {
      order_id,
      stop_id,
      driver_id,

      proof_type,
      file_url,

      recipient_name,
      confirmation_code,

      latitude,
      longitude,

      notes,
    } = data;

    const [result] = await db.query(
      `
      INSERT INTO delivery_proofs (
        order_id,
        stop_id,
        driver_id,

        proof_type,
        file_url,

        recipient_name,
        confirmation_code,

        latitude,
        longitude,

        notes
      )
      VALUES (
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?
      )
      `,
      [
        order_id,
        stop_id || null,
        driver_id,

        proof_type,
        file_url || null,

        recipient_name || null,
        confirmation_code || null,

        latitude || null,
        longitude || null,

        notes || null,
      ]
    );

    return result.insertId;
  },
};

module.exports = OrderModel;
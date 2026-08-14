const db = require("../config/db");

const DriverModel = {
  /* =====================================================
     RÉCUPÉRER TOUS LES CHAUFFEURS
  ===================================================== */

  async getAllDrivers() {
    const [rows] = await db.query(`
      SELECT
        d.id,
        d.user_id,

        u.first_name,
        u.last_name,
        u.email,

        COALESCE(
          d.phone,
          u.phone
        ) AS phone,

        u.status,

        d.availability_status,
        d.profile_photo_url,

        d.license_number,
        d.license_expiry,

        d.address,
        d.city,
        d.province,
        d.postal_code,

        d.emergency_contact_name,
        d.emergency_contact_phone,

        d.vehicle_name,
        d.vehicle_plate,

        d.last_seen_at,
        d.onfleet_worker_id,

        d.created_at,
        d.updated_at,

        (
          SELECT COUNT(*)
          FROM orders o
          WHERE o.driver_id = d.id
            AND DATE(
              COALESCE(
                o.pickup_date,
                o.created_at
              )
            ) = CURDATE()
            AND o.status NOT IN (
              'completed',
              'cancelled'
            )
        ) AS current_orders,

        (
          SELECT COUNT(*)
          FROM orders o
          WHERE o.driver_id = d.id
        ) AS total_orders,

        (
          SELECT COUNT(*)
          FROM orders o
          WHERE o.driver_id = d.id
            AND o.status = 'completed'
        ) AS completed_orders

      FROM drivers d

      INNER JOIN users u
        ON d.user_id = u.id

      ORDER BY d.id DESC
    `);

    return rows;
  },

  /* =====================================================
     RÉCUPÉRER UN CHAUFFEUR
  ===================================================== */

  async getDriverById(id) {
    const [rows] = await db.query(
      `
      SELECT
        d.id,
        d.user_id,

        u.first_name,
        u.last_name,
        u.email,

        COALESCE(
          d.phone,
          u.phone
        ) AS phone,

        u.status,

        d.availability_status,
        d.profile_photo_url,

        d.license_number,
        d.license_expiry,

        d.address,
        d.city,
        d.province,
        d.postal_code,

        d.emergency_contact_name,
        d.emergency_contact_phone,

        d.vehicle_name,
        d.vehicle_plate,

        d.last_seen_at,
        d.onfleet_worker_id,

        d.created_at,
        d.updated_at,

        (
          SELECT COUNT(*)
          FROM orders o
          WHERE o.driver_id = d.id
        ) AS total_orders,

        (
          SELECT COUNT(*)
          FROM orders o
          WHERE o.driver_id = d.id
            AND o.status = 'completed'
        ) AS completed_orders,

        (
          SELECT COUNT(*)
          FROM orders o
          WHERE o.driver_id = d.id
            AND o.status NOT IN (
              'completed',
              'cancelled'
            )
        ) AS active_orders

      FROM drivers d

      INNER JOIN users u
        ON d.user_id = u.id

      WHERE d.id = ?

      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  },

  /* =====================================================
     CRÉER UN CHAUFFEUR
  ===================================================== */

  async createDriver(data) {
    const {
      user_id,
      phone,
      profile_photo_url,
      availability_status = "offline",
      license_number,
      license_expiry,
      address,
      city,
      province,
      postal_code,
      emergency_contact_name,
      emergency_contact_phone,
      vehicle_name,
      vehicle_plate,
      onfleet_worker_id,
    } = data;

    const [result] = await db.query(
      `
      INSERT INTO drivers (
        user_id,
        phone,
        profile_photo_url,
        availability_status,
        license_number,
        license_expiry,
        address,
        city,
        province,
        postal_code,
        emergency_contact_name,
        emergency_contact_phone,
        vehicle_name,
        vehicle_plate,
        onfleet_worker_id
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
      `,
      [
        user_id,
        phone || null,
        profile_photo_url || null,
        availability_status,
        license_number || null,
        license_expiry || null,
        address || null,
        city || null,
        province || null,
        postal_code || null,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        vehicle_name || null,
        vehicle_plate || null,
        onfleet_worker_id || null,
      ],
    );

    return result.insertId;
  },

  /* =====================================================
     MODIFIER UN CHAUFFEUR
  ===================================================== */

  async updateDriver(id, data) {
    const allowedFields = [
      "phone",
      "profile_photo_url",
      "availability_status",
      "license_number",
      "license_expiry",
      "address",
      "city",
      "province",
      "postal_code",
      "emergency_contact_name",
      "emergency_contact_phone",
      "vehicle_name",
      "vehicle_plate",
      "last_seen_at",
      "onfleet_worker_id",
    ];

    const fields = [];
    const values = [];

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          data,
          field,
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
      UPDATE drivers
      SET
        ${fields.join(", ")},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      values,
    );

    return result;
  },

  /* =====================================================
     SUPPRIMER UN CHAUFFEUR
  ===================================================== */

  async deleteDriver(id) {
    const [result] = await db.query(
      `
      DELETE FROM drivers
      WHERE id = ?
      `,
      [id],
    );

    return result;
  },

  /* =====================================================
     VÉRIFIER LE RÔLE
  ===================================================== */

  async checkUserIsDriver(userId) {
    const [rows] = await db.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.status,
        r.name AS role

      FROM users u

      INNER JOIN roles r
        ON u.role_id = r.id

      WHERE u.id = ?

      LIMIT 1
      `,
      [userId],
    );

    return rows[0] || null;
  },

  /* =====================================================
     VÉRIFIER SI LE PROFIL EXISTE
  ===================================================== */

  async checkDriverExistsForUser(userId) {
    const [rows] = await db.query(
      `
      SELECT id
      FROM drivers
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId],
    );

    return rows[0] || null;
  },

  /* =====================================================
     RÉCUPÉRER LES COMMANDES DU CHAUFFEUR
  ===================================================== */

  async getDriverOrders(driverId) {
    const [rows] = await db.query(
      `
      SELECT
        o.id,
        o.order_number,
        o.client_id,
        o.driver_id,

        o.pickup_address,
        o.delivery_address,
        o.pickup_date,

        o.status,
        o.total_amount,
        o.created_at,
        o.updated_at,

        c.first_name
          AS client_first_name,

        c.last_name
          AS client_last_name,

        c.company_name

      FROM orders o

      LEFT JOIN clients c
        ON o.client_id = c.id

      WHERE o.driver_id = ?

      ORDER BY
        COALESCE(
          o.pickup_date,
          o.created_at
        ) DESC
      `,
      [driverId],
    );

    return rows;
  },
};

module.exports = DriverModel;
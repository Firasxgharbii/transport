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

        d.last_seen_at,
        d.onfleet_worker_id,

        d.created_at,
        d.updated_at,

        /* ==========================
           VÉHICULE ACTUEL
        ========================== */

        v.id AS vehicle_id,

        v.make AS vehicle_make,
        v.model AS vehicle_model,
        v.year AS vehicle_year,

        v.plate AS vehicle_plate,
        v.vin AS vehicle_vin,

        v.vehicle_type,
        v.capacity_kg,
        v.capacity_pallets,

        v.fuel_type,
        v.mileage,

        v.status AS vehicle_status,

        CONCAT_WS(
          ' ',
          v.make,
          v.model
        ) AS vehicle_name,

        /* ==========================
           STATISTIQUES COMMANDES
        ========================== */

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
        ON u.id = d.user_id

      LEFT JOIN vehicles v
        ON v.driver_id = d.id

      ORDER BY d.id DESC
    `);

    return rows;
  },

  /* =====================================================
     RÉCUPÉRER UN CHAUFFEUR PAR DRIVER ID
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

          d.last_seen_at,
          d.onfleet_worker_id,

          d.created_at,
          d.updated_at,

          /* ==========================
             VÉHICULE ASSIGNÉ
          ========================== */

          v.id AS vehicle_id,

          v.make AS vehicle_make,
          v.model AS vehicle_model,
          v.year AS vehicle_year,

          v.plate AS vehicle_plate,
          v.vin AS vehicle_vin,

          v.vehicle_type,

          v.capacity_kg,
          v.capacity_pallets,

          v.fuel_type,
          v.mileage,

          v.status AS vehicle_status,

          v.insurance_number,
          v.insurance_expiry,

          v.registration_number,
          v.registration_expiry,

          CONCAT_WS(
            ' ',
            v.make,
            v.model
          ) AS vehicle_name,

          /* ==========================
             STATISTIQUES
          ========================== */

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
          ON u.id = d.user_id

        LEFT JOIN vehicles v
          ON v.driver_id = d.id

        WHERE d.id = ?

        LIMIT 1
      `,
      [id]
    );

    return rows[0] || null;
  },

  /* =====================================================
     RÉCUPÉRER LE CHAUFFEUR PAR USER ID

     Utilisé notamment par :
     GET /api/drivers/me
  ===================================================== */

  async getDriverByUserId(userId) {
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

          d.last_seen_at,
          d.onfleet_worker_id,

          d.created_at,
          d.updated_at,

          /* ==========================
             VÉHICULE ASSIGNÉ
          ========================== */

          v.id AS vehicle_id,

          v.make AS vehicle_make,
          v.model AS vehicle_model,
          v.year AS vehicle_year,

          v.plate AS vehicle_plate,
          v.vin AS vehicle_vin,

          v.vehicle_type,

          v.capacity_kg,
          v.capacity_pallets,

          v.fuel_type,
          v.mileage,

          v.status AS vehicle_status,

          v.insurance_number,
          v.insurance_expiry,

          v.registration_number,
          v.registration_expiry,

          CONCAT_WS(
            ' ',
            v.make,
            v.model
          ) AS vehicle_name,

          /* ==========================
             STATISTIQUES
          ========================== */

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
          ) AS active_orders,

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
          ) AS current_orders

        FROM drivers d

        INNER JOIN users u
          ON u.id = d.user_id

        LEFT JOIN vehicles v
          ON v.driver_id = d.id

        WHERE d.user_id = ?

        LIMIT 1
      `,
      [userId]
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

        onfleet_worker_id || null,
      ]
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

      "last_seen_at",
      "onfleet_worker_id",
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
        UPDATE drivers
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
     SUPPRIMER UN CHAUFFEUR
  ===================================================== */

  async deleteDriver(id) {
    /*
     * Grâce à FK vehicles.driver_id
     * ON DELETE SET NULL,
     * le véhicule n'est pas supprimé.
     */

    const [result] = await db.query(
      `
        DELETE FROM drivers
        WHERE id = ?
      `,
      [id]
    );

    return result;
  },

  /* =====================================================
     VÉRIFIER LE RÔLE UTILISATEUR
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
          ON r.id = u.role_id

        WHERE u.id = ?

        LIMIT 1
      `,
      [userId]
    );

    return rows[0] || null;
  },

  /* =====================================================
     VÉRIFIER SI LE PROFIL CHAUFFEUR EXISTE
  ===================================================== */

  async checkDriverExistsForUser(userId) {
    const [rows] = await db.query(
      `
        SELECT id
        FROM drivers
        WHERE user_id = ?
        LIMIT 1
      `,
      [userId]
    );

    return rows[0] || null;
  },

  /* =====================================================
     RÉCUPÉRER LE VÉHICULE DU CHAUFFEUR
  ===================================================== */

  async getDriverVehicle(driverId) {
    const [rows] = await db.query(
      `
        SELECT
          v.id,
          v.driver_id,

          v.make,
          v.model,
          v.year,

          v.plate,
          v.vin,

          v.vehicle_type,

          v.capacity_kg,
          v.capacity_pallets,

          v.fuel_type,
          v.mileage,

          v.status,

          v.insurance_number,
          v.insurance_expiry,

          v.registration_number,
          v.registration_expiry,

          v.notes,

          v.created_at,
          v.updated_at

        FROM vehicles v

        WHERE v.driver_id = ?

        LIMIT 1
      `,
      [driverId]
    );

    return rows[0] || null;
  },

  /* =====================================================
     ASSIGNER UN VÉHICULE AU CHAUFFEUR
  ===================================================== */

  async assignVehicle(driverId, vehicleId) {
    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      /*
       * Désassigner les anciens véhicules
       * du chauffeur.
       */

      await connection.query(
        `
          UPDATE vehicles
          SET
            driver_id = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE driver_id = ?
        `,
        [driverId]
      );

      /*
       * Assigner le nouveau véhicule.
       */

      const [result] =
        await connection.query(
          `
            UPDATE vehicles
            SET
              driver_id = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [
            driverId,
            vehicleId,
          ]
        );

      await connection.commit();

      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /* =====================================================
     DÉSAFFECTER LE VÉHICULE DU CHAUFFEUR
  ===================================================== */

  async unassignVehicle(driverId) {
    const [result] = await db.query(
      `
        UPDATE vehicles
        SET
          driver_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE driver_id = ?
      `,
      [driverId]
    );

    return result;
  },

  /* =====================================================
     RÉCUPÉRER LES COMMANDES DU CHAUFFEUR

     IMPORTANT :
     L'ordre du Dispatch est prioritaire grâce à
     orders.route_position.
  ===================================================== */

  async getDriverOrders(driverId) {
    const [rows] = await db.query(
      `
        SELECT
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

          o.status,
          o.priority,

          /* POSITION DÉFINIE PAR LE DISPATCH */
          o.route_position,

          o.total_amount,

          o.created_at,
          o.updated_at,

          c.first_name
            AS client_first_name,

          c.last_name
            AS client_last_name,

          c.company_name,

          v.make
            AS vehicle_make,

          v.model
            AS vehicle_model,

          v.plate
            AS vehicle_plate

        FROM orders o

        LEFT JOIN clients c
          ON c.id = o.client_id

        LEFT JOIN vehicles v
          ON v.id = o.vehicle_id

        WHERE o.driver_id = ?

        /* ===============================================
           ORDRE EXACT DU DISPATCH

           1. Les commandes ayant une route_position
              passent en premier.

           2. #1, #2, #3, #4...

           3. Les commandes sans position restent
              ensuite triées par date et heure.
        =============================================== */

        ORDER BY
          CASE
            WHEN o.route_position IS NULL THEN 1
            ELSE 0
          END ASC,

          o.route_position ASC,

          COALESCE(
            o.pickup_date,
            DATE(o.created_at)
          ) ASC,

          COALESCE(
            o.pickup_time,
            '23:59:59'
          ) ASC,

          o.id ASC
      `,
      [driverId]
    );

    return rows;
  },
};

module.exports = DriverModel;
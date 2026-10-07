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

          (
            SELECT CASE
              WHEN COUNT(DISTINCT linked_op.dispatch_task_id) = 1
              THEN MAX(linked_op.dispatch_task_id)
              ELSE NULL
            END
            FROM order_operations linked_op
            WHERE linked_op.order_id = o.id
              AND linked_op.driver_id = o.driver_id
              AND linked_op.status <> 'cancelled'
          ) AS dispatch_task_id,

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

          /* ==========================
             PROGRESSION DU PLANNING
          ========================== */

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
          ) AS completed_stops,

          (
            SELECT COUNT(*)
            FROM order_stops os
            WHERE os.order_id = o.id
              AND os.status <> 'completed'
          ) AS remaining_stops,

          (
            SELECT COUNT(*)
            FROM order_packages p
            WHERE p.order_id = o.id
          ) AS package_count,

          (
            SELECT COUNT(*)
            FROM order_packages p
            WHERE p.order_id = o.id
              AND p.current_status = 'delivered'
          ) AS delivered_packages,

          (
            SELECT COUNT(*)
            FROM order_packages p
            WHERE p.order_id = o.id
              AND p.current_status <> 'delivered'
          ) AS remaining_packages,

          (
            SELECT MAX(se.scanned_at)
            FROM scan_events se
            WHERE se.order_id = o.id
          ) AS last_scan_at,

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

  /* =====================================================
     OPÉRATIONS ASSIGNÉES AU CHAUFFEUR CONNECTÉ
  ===================================================== */

  async getDriverOperations(driverId) {
    const [rows] = await db.query(
      `
        SELECT
          op.id,
          op.id AS operation_id,
          op.dispatch_task_id,
          op.order_id,
          op.operation_type,
          op.driver_id,
          op.vehicle_id,
          op.warehouse_name,
          op.scheduled_date,
          op.scheduled_time,
          op.completed_at,
          op.status,
          op.route_position,
          op.notes,
          op.created_at,
          op.updated_at,

          o.order_number,
          o.pickup_address,
          o.delivery_address,
          o.pickup_date,
          o.pickup_time,
          o.delivery_date,
          o.delivery_time,
          o.priority,

          c.first_name AS client_first_name,
          c.last_name AS client_last_name,
          c.company_name,

          v.make AS vehicle_make,
          v.model AS vehicle_model,
          v.plate AS vehicle_plate

        FROM order_operations op

        INNER JOIN orders o
          ON o.id = op.order_id

        LEFT JOIN clients c
          ON c.id = o.client_id

        LEFT JOIN vehicles v
          ON v.id = op.vehicle_id

        WHERE op.driver_id = ?
          AND op.status <> 'cancelled'

        ORDER BY
          CASE
            WHEN op.status = 'in_progress' THEN 0
            WHEN op.status = 'assigned' THEN 1
            WHEN op.status = 'pending' THEN 2
            WHEN op.status = 'completed' THEN 3
            ELSE 4
          END ASC,
          CASE
            WHEN op.route_position IS NULL THEN 1
            ELSE 0
          END ASC,
          op.route_position ASC,
          COALESCE(op.scheduled_date, DATE(op.created_at)) ASC,
          COALESCE(op.scheduled_time, '23:59:59') ASC,
          op.id ASC
      `,
      [driverId]
    );

    return rows;
  },


  /* =====================================================
     RÉCUPÉRER UNE OPÉRATION PRÉCISE DU CHAUFFEUR CONNECTÉ

     GET /api/drivers/me/operations/:operationId

     SÉCURITÉ :
     - driverId vient du chauffeur authentifié.
     - operationId est validé.
     - L'opération doit appartenir au chauffeur connecté.
     - Aucun driver_id du frontend n'est utilisé comme autorité.
  ===================================================== */

  async getDriverOperationById(driverId, operationId) {
    const safeDriverId = Number(driverId);
    const safeOperationId = Number(operationId);

    if (
      !Number.isInteger(safeDriverId) ||
      safeDriverId <= 0
    ) {
      const error = new Error(
        "Identifiant chauffeur invalide."
      );

      error.statusCode = 400;
      throw error;
    }

    if (
      !Number.isInteger(safeOperationId) ||
      safeOperationId <= 0
    ) {
      const error = new Error(
        "Identifiant de tâche invalide."
      );

      error.statusCode = 400;
      throw error;
    }

    const [rows] = await db.query(
      `
        SELECT
          op.id,
          op.order_id,
          op.operation_type,
          op.driver_id,
          op.vehicle_id,
          op.warehouse_name,
          op.scheduled_date,
          op.scheduled_time,
          op.completed_at,
          op.status,
          op.route_position,
          op.notes,
          op.created_at,
          op.updated_at,

          o.order_number,
          o.client_id,
          o.pickup_address,
          o.delivery_address,
          o.pickup_date,
          o.pickup_time,
          o.delivery_date,
          o.delivery_time,
          o.priority,

          c.first_name AS client_first_name,
          c.last_name AS client_last_name,
          c.company_name,
          c.phone AS client_phone,
          c.email AS client_email,

          v.make AS vehicle_make,
          v.model AS vehicle_model,
          v.year AS vehicle_year,
          v.plate AS vehicle_plate,
          v.vehicle_type,

          CONCAT_WS(
            ' ',
            v.make,
            v.model
          ) AS vehicle_name,

          (
            SELECT COUNT(*)
            FROM order_packages p
            WHERE p.order_id = op.order_id
          ) AS package_count,

          (
            SELECT COUNT(DISTINCT se.package_id)
            FROM scan_events se
            WHERE se.operation_id = op.id
              AND se.driver_id = op.driver_id
              AND se.scan_status = 'accepted'
              AND NOT EXISTS (
                SELECT 1
                FROM scan_cancellations sc
                WHERE sc.scan_event_id = se.id
              )
              AND se.scan_type =
                CASE op.operation_type
                  WHEN 'pickup' THEN 'pickup'
                  WHEN 'warehouse_in' THEN 'warehouse_in'
                  WHEN 'warehouse_storage' THEN 'warehouse_storage'
                  WHEN 'warehouse_out' THEN 'warehouse_out'
                  WHEN 'delivery' THEN 'delivery'
                  ELSE op.operation_type
                END
          ) AS scanned_packages,

          (
            SELECT MAX(se.scanned_at)
            FROM scan_events se
            WHERE se.operation_id = op.id
              AND se.driver_id = op.driver_id
          ) AS last_scan_at

        FROM order_operations op

        INNER JOIN orders o
          ON o.id = op.order_id

        LEFT JOIN clients c
          ON c.id = o.client_id

        LEFT JOIN vehicles v
          ON v.id = op.vehicle_id

        WHERE op.id = ?
          AND op.driver_id = ?
          AND op.status <> 'cancelled'

        LIMIT 1
      `,
      [
        safeOperationId,
        safeDriverId,
      ]
    );

    const operation = rows[0] || null;

    if (!operation) {
      return null;
    }

    const [packages] = await db.query(
      `
        SELECT
          p.id,
          p.order_id,
          p.barcode,
          p.package_number,
          p.description,
          p.package_type,
          p.weight,
          p.weight_unit,
          p.length,
          p.width,
          p.height,
          p.dimension_unit,
          p.current_status,
          p.created_at,
          p.updated_at,

          CASE
            WHEN EXISTS (
              SELECT 1
              FROM scan_events se
              WHERE se.package_id = p.id
                AND se.operation_id = ?
                AND se.driver_id = ?
                AND se.scan_status = 'accepted'
                AND NOT EXISTS (
                  SELECT 1
                  FROM scan_cancellations sc
                  WHERE sc.scan_event_id = se.id
                )
            )
            THEN 1
            ELSE 0
          END AS scanned,

          (
            SELECT MAX(se.scanned_at)
            FROM scan_events se
            WHERE se.package_id = p.id
              AND se.operation_id = ?
              AND se.driver_id = ?
          ) AS last_scan_at

        FROM order_packages p

        WHERE p.order_id = ?

        ORDER BY
          p.package_number ASC,
          p.id ASC
      `,
      [
        safeOperationId,
        safeDriverId,
        safeOperationId,
        safeDriverId,
        operation.order_id,
      ]
    );

    const [scans] = await db.query(
      `
        SELECT
          se.id,
          se.order_id,
          se.package_id,
          se.operation_id,
          se.driver_id,
          se.vehicle_id,
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

          p.barcode,
          p.package_number,
          p.current_status AS package_status

        FROM scan_events se

        LEFT JOIN order_packages p
          ON p.id = se.package_id

        WHERE se.operation_id = ?
          AND se.driver_id = ?

        ORDER BY
          se.scanned_at DESC,
          se.id DESC

        LIMIT 100
      `,
      [
        safeOperationId,
        safeDriverId,
      ]
    );

    const totalPackages =
      Number(operation.package_count || 0);

    const scannedPackages =
      Number(operation.scanned_packages || 0);

    const progressPercentage =
      totalPackages > 0
        ? Math.min(
            100,
            Math.round(
              (scannedPackages / totalPackages) * 100
            )
          )
        : 0;

    let taskAddress = null;

    if (operation.operation_type === "pickup") {
      taskAddress =
        operation.pickup_address || null;
    } else if (
      operation.operation_type === "delivery"
    ) {
      taskAddress =
        operation.delivery_address || null;
    } else {
      taskAddress =
        operation.warehouse_name ||
        operation.delivery_address ||
        operation.pickup_address ||
        null;
    }

    const taskDate =
      operation.scheduled_date ||
      (
        operation.operation_type === "delivery"
          ? operation.delivery_date
          : operation.pickup_date
      ) ||
      null;

    const taskTime =
      operation.scheduled_time ||
      (
        operation.operation_type === "delivery"
          ? operation.delivery_time
          : operation.pickup_time
      ) ||
      null;

    return {
      ...operation,

      task_address: taskAddress,
      task_date: taskDate,
      task_time: taskTime,

      package_count: totalPackages,
      scanned_packages: scannedPackages,

      remaining_packages: Math.max(
        0,
        totalPackages - scannedPackages
      ),

      progress_percentage:
        progressPercentage,

      packages,
      scans,
    };
  },

  /* =====================================================
     HISTORIQUE DES SCANS DU CHAUFFEUR
  ===================================================== */

  async getDriverScanHistory(driverId, limit = 50) {
    const safeLimit = Math.min(
      200,
      Math.max(1, Number(limit) || 50)
    );

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

          p.barcode,
          p.package_number,
          p.current_status AS package_status,

          o.order_number,

          op.operation_type,
          op.warehouse_name

        FROM scan_events se

        INNER JOIN order_packages p
          ON p.id = se.package_id

        INNER JOIN orders o
          ON o.id = se.order_id

        LEFT JOIN order_operations op
          ON op.id = se.operation_id

        WHERE se.driver_id = ?

        ORDER BY se.scanned_at DESC, se.id DESC
        LIMIT ?
      `,
      [driverId, safeLimit]
    );

    return rows;
  },

  /* Recherche pure: retrouve le stop sans modifier le colis. */
  async lookupDriverPackage(driverId, rawCode) {
    const code = String(rawCode || "").trim().toUpperCase();
    if (!code || code.length > 120) {
      const error = new Error("Code-barres invalide.");
      error.statusCode = 400;
      throw error;
    }

    const packageMatch = /^(GLY-\d{4}-\d{6})-P(\d{1,3})$/.exec(code);
    const orderMatch = /^(GLY-\d{4}-\d{6})$/.exec(code);
    const compatible = packageMatch
      ? `${packageMatch[1]}-P${packageMatch[2].padStart(3, "0")}`
      : code;

    let [packages] = await db.query(`
      SELECT p.id, p.order_id, p.barcode, p.package_number,
             p.current_status, o.order_number
      FROM order_packages p
      INNER JOIN orders o ON o.id = p.order_id
      WHERE UPPER(TRIM(p.barcode)) IN (?, ?)
         OR (? IS NOT NULL AND UPPER(TRIM(o.order_number)) = ?
             AND p.package_number = ?)
      ORDER BY CASE WHEN UPPER(TRIM(p.barcode)) = ? THEN 0 ELSE 1 END,
               p.package_number ASC
      LIMIT 1
    `, [code, compatible,
        packageMatch ? packageMatch[1] : null,
        packageMatch ? packageMatch[1] : null,
        packageMatch ? Number(packageMatch[2]) : null, code]);

    let pkg = packages[0] || null;

    if (!pkg && orderMatch) {
      const [rows] = await db.query(`
        SELECT p.id, p.order_id, p.barcode, p.package_number,
               p.current_status, o.order_number
        FROM orders o
        INNER JOIN order_packages p ON p.order_id = o.id
        WHERE UPPER(TRIM(o.order_number)) = ?
        ORDER BY p.package_number ASC, p.id ASC
        LIMIT 1
      `, [code]);
      pkg = rows[0] || null;
    }

    if (!pkg) {
      const error = new Error("Colis ou commande introuvable.");
      error.statusCode = 404;
      throw error;
    }

    /* dispatch_tasks.driver_id est l'autorité pour le chauffeur du stop.
       On n'exige pas op.driver_id car un stop groupé peut contenir plusieurs commandes. */
    const [operations] = await db.query(`
      SELECT op.id AS operation_id, op.operation_type,
             op.status AS operation_status,
             dt.id AS task_id, dt.route_id, dt.address, dt.city,
             dt.postal_code, dt.stop_position, dt.status AS task_status,
             o.pickup_address, o.delivery_address,
             (SELECT COUNT(*) FROM order_operations x
               WHERE x.dispatch_task_id = dt.id AND x.status <> 'cancelled') AS stop_operations,
             (SELECT COUNT(*) FROM order_packages q
               INNER JOIN order_operations x2 ON x2.order_id = q.order_id
               WHERE x2.dispatch_task_id = dt.id AND x2.status <> 'cancelled') AS stop_packages
      FROM order_operations op
      INNER JOIN orders o ON o.id = op.order_id
      INNER JOIN dispatch_tasks dt ON dt.id = op.dispatch_task_id
      WHERE op.order_id = ?
        AND dt.driver_id = ?
        AND op.operation_type = dt.task_type
        AND op.status <> 'cancelled'
        AND dt.status <> 'cancelled'
      ORDER BY
        CASE WHEN dt.status = 'in_progress' THEN 0
             WHEN dt.status IN ('todo','pending','assigned') THEN 1
             WHEN dt.status = 'completed' THEN 3 ELSE 2 END,
        dt.stop_position ASC, op.id DESC
      LIMIT 1
    `, [pkg.order_id, driverId]);

    if (!operations.length) {
      const error = new Error("Ce colis n'appartient à aucun stop assigné à ce chauffeur.");
      error.statusCode = 403;
      throw error;
    }

    const op = operations[0];
    return {
      success: true,
      scan_status: "identified",
      lookup_only: true,
      message: `Stop #${op.stop_position || op.task_id} trouvé.`,
      package: pkg,
      task: { id: Number(op.task_id), stop_position: op.stop_position,
              status: op.task_status, route_id: op.route_id },
      operation: { id: Number(op.operation_id),
                   operation_type: op.operation_type,
                   status: op.operation_status },
      dispatch_task_id: Number(op.task_id),
      task_id: Number(op.task_id),
      route_id: op.route_id,
      stop_position: op.stop_position,
      address: op.operation_type === "delivery"
        ? (op.delivery_address || op.address)
        : (op.pickup_address || op.address),
      city: op.city,
      postal_code: op.postal_code,
      stop_operations: Number(op.stop_operations || 0),
      stop_packages: Number(op.stop_packages || 0)
    };
  },

  /* =====================================================
     TRAITER UN SCAN CHAUFFEUR

     - Le chauffeur vient de req.user côté contrôleur.
     - Le code peut être :
         GLY-2026-000125-P01
       ou directement :
         GLY-2026-000125
       Dans ce deuxième cas, P01 est créé automatiquement.
     - scanType peut être "auto" : le backend choisit la
       prochaine opération active assignée au chauffeur.
  ===================================================== */

  async processDriverScan(driverId, authenticatedUserId, payload) {
    const connection = await db.getConnection();

    const scannedByUserId = Number(authenticatedUserId);

    if (!Number.isInteger(scannedByUserId) || scannedByUserId <= 0) {
      connection.release();

      const error = new Error(
        "Utilisateur authentifié invalide pour enregistrer le scan."
      );
      error.statusCode = 401;
      throw error;
    }

    const cleanCode = String(payload.scanned_code || "")
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      .replace(/[‐‑‒–—−]/g, "-")
      .replace(/\s+/g, "")
      .trim()
      .toUpperCase();

    const requestedScanType = String(
      payload.scan_type || "auto"
    )
      .trim()
      .toLowerCase();

    const source = [
      "camera",
      "zebra",
      "manual",
      "barcode_scanner",
    ].includes(payload.scan_source)
      ? payload.scan_source
      : "camera";

    const nullableNumber = (value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };

    const scanTypeToPackageStatus = {
      pickup: "picked_up",
      warehouse_in: "warehouse_in",
      warehouse_storage: "warehouse_storage",
      warehouse_out: "warehouse_out",
      load_vehicle: "out_for_delivery",
      delivery: "delivered",
      incident: "incident",
    };

    const operationToScanType = {
      pickup: "pickup",
      warehouse_in: "warehouse_in",
      warehouse_storage: "warehouse_storage",
      warehouse_out: "warehouse_out",
      load_vehicle: "load_vehicle",
      delivery: "delivery",
    };

    const allowedRequestedTypes = [
      "auto",
      "pickup",
      "warehouse_in",
      "warehouse_storage",
      "warehouse_out",
      "load_vehicle",
      "delivery",
      "incident",
    ];

    if (!cleanCode) {
      connection.release();

      const error = new Error("Le code-barres est obligatoire.");
      error.statusCode = 400;
      throw error;
    }

    if (!allowedRequestedTypes.includes(requestedScanType)) {
      connection.release();

      const error = new Error("Type de scan invalide.");
      error.statusCode = 400;
      throw error;
    }

    if (
      requestedScanType === "incident" &&
      !String(payload.notes || "").trim()
    ) {
      connection.release();

      const error = new Error(
        "Un commentaire est obligatoire pour une livraison impossible ou un incident."
      );
      error.statusCode = 400;
      throw error;
    }

    try {
      await connection.beginTransaction();

      /* -------------------------------------------------
         1. Retrouver le colis par son barcode
      ------------------------------------------------- */

      // Accepter P01 et P001 sans modifier les codes-barres stockés.
      // La recherche exacte reste prioritaire.
      const barcodeMatch = /^(GLY-\d{4}-\d{6})-P(\d{1,3})$/.exec(cleanCode);
      const compatibleCode = barcodeMatch
        ? `${barcodeMatch[1]}-P${barcodeMatch[2].padStart(3, "0")}`
        : cleanCode;

      let [packageRows] = await connection.query(
        `
          SELECT
            p.id,
            p.order_id,
            p.barcode,
            p.package_number,
            p.description,
            p.weight,
            p.current_status,
            o.order_number
          FROM order_packages p
          INNER JOIN orders o
            ON o.id = p.order_id
          WHERE UPPER(p.barcode) IN (?, ?)
          ORDER BY CASE WHEN UPPER(p.barcode) = ? THEN 0 ELSE 1 END
          LIMIT 1
        `,
        [cleanCode, compatibleCode, cleanCode]
      );

      let packageRow = packageRows[0] || null;

      // Compatibilité avec les anciens colis enregistrés sous
      // le numéro de commande seul, par exemple GLY-2026-000053.
      // On exige le numéro exact de commande ET le numéro de colis.
      if (!packageRow && barcodeMatch) {
        const packageNumber = Number(barcodeMatch[2]);

        const [legacyRows] = await connection.query(
          `
            SELECT
              p.id,
              p.order_id,
              p.barcode,
              p.package_number,
              p.description,
              p.weight,
              p.current_status,
              o.order_number
            FROM order_packages p
            INNER JOIN orders o
              ON o.id = p.order_id
            WHERE UPPER(TRIM(o.order_number)) = ?
              AND p.package_number = ?
              AND UPPER(TRIM(p.barcode)) = UPPER(TRIM(o.order_number))
            LIMIT 1
          `,
          [barcodeMatch[1], packageNumber]
        );

        packageRow = legacyRows[0] || null;
      }

      /* -------------------------------------------------
         2. Compatibilité immédiate :
            si le chauffeur scanne directement le numéro
            de commande, créer automatiquement P01.
      ------------------------------------------------- */

      if (!packageRow) {
        /*
         * Compatibilité avec les références Glory imprimées.
         *
         * Cas normal :
         *   GLY-2026-000031 == orders.order_number
         *
         * Cas de secours :
         *   certaines anciennes commandes peuvent avoir un
         *   order_number formaté différemment alors que la
         *   référence imprimée conserve l'ID de commande dans
         *   les 6 derniers chiffres.
         *
         * Exemple :
         *   GLY-2026-000031 -> order id 31
         *
         * Le fallback par ID ne s'applique QUE si le code
         * respecte exactement le format GLY-YYYY-NNNNNN.
         */
        const referenceMatch =
          /^GLY-\d{4}-(\d{6})$/.exec(cleanCode);

        const referenceOrderId =
          referenceMatch
            ? Number(referenceMatch[1])
            : null;

        const [orderRows] = await connection.query(
          `
            SELECT id, order_number
            FROM orders
            WHERE UPPER(TRIM(order_number)) = ?
               OR (
                 ? IS NOT NULL
                 AND id = ?
               )
            ORDER BY
              CASE
                WHEN UPPER(TRIM(order_number)) = ? THEN 0
                ELSE 1
              END ASC
            LIMIT 1
          `,
          [
            cleanCode,
            referenceOrderId,
            referenceOrderId,
            cleanCode,
          ]
        );

        const order = orderRows[0] || null;

        if (order) {
          const generatedBarcode = `${String(
            order.order_number
          ).toUpperCase()}-P01`;

          await connection.query(
            `
              INSERT INTO order_packages (
                order_id,
                barcode,
                package_number,
                current_status
              )
              VALUES (?, ?, 1, 'created')
              ON DUPLICATE KEY UPDATE
                id = LAST_INSERT_ID(id),
                updated_at = CURRENT_TIMESTAMP
            `,
            [order.id, generatedBarcode]
          );

          [packageRows] = await connection.query(
            `
              SELECT
                p.id,
                p.order_id,
                p.barcode,
                p.package_number,
                p.description,
                p.weight,
                p.current_status,
                o.order_number
              FROM order_packages p
              INNER JOIN orders o
                ON o.id = p.order_id
              WHERE p.order_id = ?
                AND p.package_number = 1
              LIMIT 1
            `,
            [order.id]
          );

          packageRow = packageRows[0] || null;
        }
      }

      if (!packageRow) {
        const error = new Error(
          "Aucun colis ou numéro de commande correspondant à ce code."
        );
        error.statusCode = 404;
        throw error;
      }

      /* -------------------------------------------------
         3. Trouver les opérations actives assignées
            à CE chauffeur pour CETTE commande.
      ------------------------------------------------- */

      /*
       * IMPORTANT :
       * Le Dispatch peut avoir affecté le chauffeur directement sur orders
       * alors que certaines order_operations plus anciennes sont encore
       * sans driver_id.
       *
       * On synchronise UNIQUEMENT les opérations sans chauffeur lorsque
       * la commande appartient réellement au chauffeur authentifié.
       *
       * Une opération déjà affectée à un autre chauffeur n'est jamais
       * réattribuée ici : la sécurité reste donc stricte.
       */
      await connection.query(
        `
          UPDATE order_operations op
          INNER JOIN orders o
            ON o.id = op.order_id
          SET
            op.driver_id = o.driver_id,
            op.vehicle_id = COALESCE(op.vehicle_id, o.vehicle_id),
            op.status = CASE
              WHEN op.status = 'pending' THEN 'assigned'
              ELSE op.status
            END,
            op.updated_at = CURRENT_TIMESTAMP
          WHERE op.order_id = ?
            AND op.driver_id IS NULL
            AND o.driver_id = ?
            AND op.status IN ('pending', 'assigned', 'in_progress')
        `,
        [packageRow.order_id, driverId]
      );

      const [operationRows] = await connection.query(
        `
          SELECT
            op.id,
            op.order_id,
            op.operation_type,
            op.driver_id,
            op.vehicle_id,
            op.warehouse_name,
            op.scheduled_date,
            op.scheduled_time,
            op.status,
            op.route_position,
            op.dispatch_task_id
          FROM order_operations op
          WHERE op.order_id = ?
            AND op.driver_id = ?
            AND op.status IN ('pending', 'assigned', 'in_progress')
          ORDER BY
            CASE
              WHEN op.status = 'in_progress' THEN 0
              WHEN op.status = 'assigned' THEN 1
              ELSE 2
            END ASC,
            CASE
              WHEN op.route_position IS NULL THEN 1
              ELSE 0
            END ASC,
            op.route_position ASC,
            COALESCE(op.scheduled_date, DATE(op.created_at)) ASC,
            COALESCE(op.scheduled_time, '23:59:59') ASC,
            op.id ASC
          FOR UPDATE
        `,
        [packageRow.order_id, driverId]
      );

      let operation = null;
      let finalScanType = requestedScanType;

      if (requestedScanType === "auto") {
        operation = operationRows[0] || null;

        if (operation) {
          finalScanType =
            operationToScanType[operation.operation_type] || "";
        }
      } else if (requestedScanType === "incident") {
        operation = operationRows[0] || null;
      } else if (requestedScanType === "load_vehicle") {
        operation =
          operationRows.find(
            (item) => item.operation_type === "load_vehicle"
          ) || null;
      } else {
        operation =
          operationRows.find(
            (item) => item.operation_type === requestedScanType
          ) || null;
      }

      /* -------------------------------------------------
         4. Vérifier si ce scan a déjà été accepté.
      ------------------------------------------------- */

      const duplicateParams = [
        packageRow.id,
        driverId,
        finalScanType || requestedScanType,
      ];

      let duplicateSql = `
        SELECT
          se.id,
          se.operation_id,
          se.scanned_at
        FROM scan_events se
        LEFT JOIN scan_cancellations sc
          ON sc.scan_event_id = se.id
        WHERE se.package_id = ?
          AND se.driver_id = ?
          AND se.scan_type = ?
          AND se.scan_status = 'accepted'
          AND sc.id IS NULL
      `;

      if (operation?.id) {
        duplicateSql += " AND se.operation_id = ?";
        duplicateParams.push(operation.id);
      }

      duplicateSql += " ORDER BY se.id DESC LIMIT 1";

      const [duplicateRows] = await connection.query(
        duplicateSql,
        duplicateParams
      );

      const previousAcceptedScan = duplicateRows[0] || null;

      if (previousAcceptedScan) {
        const [duplicateInsert] = await connection.query(
          `
            INSERT INTO scan_events (
              order_id,
              package_id,
              operation_id,
              driver_id,
              vehicle_id,
              scanned_by_user_id,
              scanned_code,
              scan_type,
              scan_status,
              latitude,
              longitude,
              accuracy,
              device_type,
              device_name,
              scan_source,
              notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'duplicate', ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            packageRow.order_id,
            packageRow.id,
            operation?.id || previousAcceptedScan.operation_id || null,
            driverId,
            operation?.vehicle_id || null,
            scannedByUserId,
            cleanCode,
            finalScanType || requestedScanType,
            nullableNumber(payload.latitude),
            nullableNumber(payload.longitude),
            nullableNumber(payload.accuracy),
            payload.device_type || null,
            payload.device_name || null,
            source,
            payload.notes || "Scan déjà enregistré.",
          ]
        );

        await connection.commit();

        return {
          success: true,
          duplicate: true,
          scan_status: "duplicate",
          message: "Ce scan a déjà été enregistré.",
          event_id: duplicateInsert.insertId,
          package: packageRow,
          operation,
          task: operation?.dispatch_task_id
            ? { id: operation.dispatch_task_id }
            : null,
          scan_type: finalScanType || requestedScanType,
        };
      }

      /* -------------------------------------------------
         5. Si aucune opération n'est assignée au chauffeur,
            conserver le scan comme REJETÉ pour audit.
      ------------------------------------------------- */

      if (!operation && requestedScanType !== "incident") {
        const rejectedType =
          requestedScanType === "auto"
            ? "incident"
            : requestedScanType;

        const [rejectedInsert] = await connection.query(
          `
            INSERT INTO scan_events (
              order_id,
              package_id,
              operation_id,
              driver_id,
              vehicle_id,
              scanned_by_user_id,
              scanned_code,
              scan_type,
              scan_status,
              latitude,
              longitude,
              accuracy,
              device_type,
              device_name,
              scan_source,
              notes
            )
            VALUES (?, ?, NULL, ?, NULL, ?, ?, ?, 'rejected', ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            packageRow.order_id,
            packageRow.id,
            driverId,
            scannedByUserId,
            cleanCode,
            rejectedType,
            nullableNumber(payload.latitude),
            nullableNumber(payload.longitude),
            nullableNumber(payload.accuracy),
            payload.device_type || null,
            payload.device_name || null,
            source,
            payload.notes ||
              "Aucune opération active assignée à ce chauffeur pour cette commande.",
          ]
        );

        await connection.commit();

        return {
          success: false,
          rejected: true,
          scan_status: "rejected",
          statusCode: 403,
          message:
            "Cette opération n'est pas assignée à votre compte chauffeur.",
          event_id: rejectedInsert.insertId,
          package: packageRow,
          operation: null,
          scan_type: rejectedType,
        };
      }

      if (!finalScanType || !scanTypeToPackageStatus[finalScanType]) {
        const error = new Error(
          "Impossible de déterminer le type d'opération à scanner."
        );
        error.statusCode = 409;
        throw error;
      }

      /* -------------------------------------------------
         6. Enregistrer le scan accepté.
      ------------------------------------------------- */

      const [insertResult] = await connection.query(
        `
          INSERT INTO scan_events (
            order_id,
            package_id,
            operation_id,
            driver_id,
            vehicle_id,
            scanned_by_user_id,
            scanned_code,
            scan_type,
            scan_status,
            latitude,
            longitude,
            accuracy,
            device_type,
            device_name,
            scan_source,
            notes
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'accepted', ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          packageRow.order_id,
          packageRow.id,
          operation?.id || null,
          driverId,
          operation?.vehicle_id || null,
          scannedByUserId,
          cleanCode,
          finalScanType,
          nullableNumber(payload.latitude),
          nullableNumber(payload.longitude),
          nullableNumber(payload.accuracy),
          payload.device_type || null,
          payload.device_name || null,
          source,
          payload.notes || null,
        ]
      );

      /* -------------------------------------------------
         7. Mettre à jour l'état physique du colis.
      ------------------------------------------------- */

      const packageStatus =
        scanTypeToPackageStatus[finalScanType];

      /*
       * Scanner V4 :
       * mémoriser l'état PHYSIQUE exact du colis avant le scan.
       *
       * Cette information permet à "Annuler ce scan" de restaurer
       * exactement l'état précédent au lieu de le deviner.
       */
      const previousPackageStatus = packageRow.current_status;

      await connection.query(
        `
          UPDATE order_packages
          SET
            current_status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [packageStatus, packageRow.id]
      );

      await connection.query(
        `
          INSERT INTO package_status_audit (
            package_id,
            order_id,
            operation_id,
            dispatch_task_id,
            route_id,
            actor_type,
            actor_id,
            action,
            from_status,
            to_status,
            reason,
            metadata
          )
          VALUES (
            ?, ?, ?, ?, ?, 'driver', ?,
            'SCAN_ACCEPTED',
            ?, ?, NULL,
            JSON_OBJECT('scan_event_id', ?)
          )
        `,
        [
          packageRow.id,
          packageRow.order_id,
          operation?.id || null,
          operation?.dispatch_task_id || null,
          null,
          scannedByUserId,
          previousPackageStatus,
          packageStatus,
          insertResult.insertId
        ]
      );

      /* -------------------------------------------------
         8. Le scanner NE démarre jamais un stop.

         Règle Glory Solutions :
         - Commencer le stop => in_progress
         - Scanner => enregistrer uniquement le scan
         - Terminer le stop => completed

         Le chauffeur doit donc avoir explicitement commencé
         le stop avant de pouvoir scanner.
      ------------------------------------------------- */

      if (
        operation?.id &&
        ["pickup", "delivery"].includes(finalScanType)
      ) {
        if (!operation.dispatch_task_id) {
          const error = new Error(
            "Cette opération n'est reliée à aucun stop."
          );
          error.statusCode = 409;
          throw error;
        }

        const [startedRows] = await connection.query(
          `
            SELECT
              dt.id,
              dt.status AS task_status,
              dsr.execution_status
            FROM dispatch_tasks dt
            LEFT JOIN driver_stop_runs dsr
              ON dsr.dispatch_task_id = dt.id
             AND dsr.driver_id = ?
            WHERE dt.id = ?
              AND dt.driver_id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [
            driverId,
            operation.dispatch_task_id,
            driverId
          ]
        );

        const startedStop = startedRows[0] || null;

        if (
          !startedStop ||
          startedStop.task_status !== "in_progress" ||
          startedStop.execution_status !== "in_progress"
        ) {
          const error = new Error(
            "Commencez le stop avant de scanner les colis."
          );
          error.statusCode = 409;
          throw error;
        }
      }

      /* -------------------------------------------------
         9. IMPORTANT - LE SCAN NE FERME JAMAIS UNE OPERATION

         Un scan accepté signifie uniquement que le colis
         a été physiquement traité pour l'étape courante.

         La fermeture de l'opération et du stop appartient
         exclusivement au workflow "Terminer le stop"
         (driverDispatchTaskModel.closeStop).

         Ceci évite qu'un stop avec un seul colis disparaisse
         immédiatement après son scan.
      ------------------------------------------------- */

      const operationCompleted = false;

      const [eventRows] = await connection.query(
        `
          SELECT
            id,
            order_id,
            package_id,
            operation_id,
            driver_id,
            vehicle_id,
            scanned_by_user_id,
            scanned_code,
            scan_type,
            scan_status,
            latitude,
            longitude,
            accuracy,
            device_type,
            device_name,
            scan_source,
            notes,
            scanned_at,
            created_at
          FROM scan_events
          WHERE id = ?
          LIMIT 1
        `,
        [insertResult.insertId]
      );

      /*
       * Le scanner ne modifie volontairement PAS le statut final
       * de dispatch_tasks.
       *
       * Même si tous les colis sont scannés :
       *   - l'opération reste in_progress
       *   - le stop reste in_progress
       *
       * Seule l'action explicite "Terminer le stop" peut
       * effectuer la fermeture transactionnelle.
       */

      await connection.commit();

      return {
        success: true,
        duplicate: false,
        rejected: false,
        scan_status: "accepted",
        message: operationCompleted
          ? "Scan accepté. Opération terminée."
          : "Scan accepté avec succès.",
        event: eventRows[0] || null,
        package: {
          ...packageRow,
          current_status: packageStatus,
        },
        operation: operation
          ? {
              ...operation,
              // Toujours retourner le vrai statut stocké.
              // Le scanner ne démarre et ne termine jamais l'opération.
              status: operation.status,
            }
          : null,
        operation_completed: operationCompleted,
        task: operation?.dispatch_task_id
          ? { id: operation.dispatch_task_id }
          : null,
        scan_type: finalScanType,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },


  /* =========================================================
     ANNULER LE SCAN D'UN COLIS PRECIS
  ========================================================= */
  cancelPackageScan: async (
    driverId,
    userId,
    dispatchTaskId,
    packageId,
    reason
  ) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const cleanReason = String(reason || "").trim();

      if (cleanReason.length < 3) {
        const error = new Error(
          "La raison de l'annulation est obligatoire."
        );
        error.statusCode = 400;
        throw error;
      }

      /* Stop obligatoirement EN COURS */
      const [tasks] = await connection.query(
        `
          SELECT
            dt.id,
            dt.route_id,
            dt.vehicle_id,
            dt.status,
            dsr.execution_status
          FROM dispatch_tasks dt
          LEFT JOIN driver_stop_runs dsr
            ON dsr.dispatch_task_id = dt.id
           AND dsr.driver_id = ?
          WHERE dt.id = ?
            AND dt.driver_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [driverId, dispatchTaskId, driverId]
      );

      const task = tasks[0];

      if (!task) {
        const error = new Error("Stop introuvable.");
        error.statusCode = 404;
        throw error;
      }

      if (
        task.status !== "in_progress" ||
        task.execution_status !== "in_progress"
      ) {
        const error = new Error(
          "Le stop doit être en cours pour annuler un scan."
        );
        error.statusCode = 409;
        throw error;
      }

      /*
       * Dernier scan ACCEPTED encore actif de CE colis,
       * dans CE stop, effectué par CE chauffeur.
       */
      /*
       * Vérifier d'abord que CE colis appartient réellement
       * à CE stop. Ainsi on garde la sécurité du stop sans
       * dépendre d'anciens scan_events mal reliés.
       */
      const [packageInTaskRows] = await connection.query(
        `
          SELECT DISTINCT p.id
          FROM order_packages p
          INNER JOIN order_operations op
            ON op.order_id = p.order_id
          WHERE p.id = ?
            AND op.dispatch_task_id = ?
            AND op.driver_id = ?
          LIMIT 1
        `,
        [packageId, dispatchTaskId, driverId]
      );

      if (!packageInTaskRows[0]) {
        const error = new Error(
          "Ce colis n'appartient pas à ce stop."
        );
        error.statusCode = 409;
        throw error;
      }

      /*
       * Dernier scan ACCEPTED encore actif de CE colis
       * effectué par CE chauffeur.
       *
       * On préfère un scan directement relié au stop.
       * Pour compatibilité avec les anciens scans, on accepte
       * également un scan dont l'opération appartient à la
       * même commande du stop.
       */
      const [rows] = await connection.query(
        `
          SELECT
            se.id AS scan_event_id,
            se.order_id,
            se.package_id,
            se.operation_id,
            se.scanned_code,
            se.scan_type,
            p.current_status
          FROM scan_events se
          INNER JOIN order_packages p
            ON p.id = se.package_id
          LEFT JOIN order_operations scan_op
            ON scan_op.id = se.operation_id
          LEFT JOIN scan_cancellations sc
            ON sc.scan_event_id = se.id
          WHERE se.package_id = ?
            AND se.driver_id = ?
            AND se.scan_status = 'accepted'
            AND sc.id IS NULL
            AND (
              scan_op.dispatch_task_id = ?
              OR EXISTS (
                SELECT 1
                FROM order_operations task_op
                WHERE task_op.dispatch_task_id = ?
                  AND task_op.driver_id = ?
                  AND task_op.order_id = se.order_id
              )
            )
          ORDER BY
            CASE
              WHEN scan_op.dispatch_task_id = ? THEN 0
              ELSE 1
            END,
            se.id DESC
          LIMIT 1
          FOR UPDATE
        `,
        [
          packageId,
          driverId,
          dispatchTaskId,
          dispatchTaskId,
          driverId,
          dispatchTaskId
        ]
      );

      const scan = rows[0];

      if (!scan) {
        const error = new Error(
          "Aucun scan actif trouvé pour ce colis."
        );
        error.statusCode = 404;
        throw error;
      }

      const resultingStatus = {
        pickup: "picked_up",
        warehouse_in: "warehouse_in",
        warehouse_storage: "warehouse_storage",
        warehouse_out: "warehouse_out",
        load_vehicle: "out_for_delivery",
        delivery: "delivered",
        incident: "incident",
      };

      const fallbackPrevious = {
        pickup: "created",
        warehouse_in: "picked_up",
        warehouse_storage: "warehouse_in",
        warehouse_out: "warehouse_storage",
        load_vehicle: "warehouse_out",
        delivery: "picked_up",
        incident: "created",
      };

      const scannedStatus =
        resultingStatus[scan.scan_type];

      if (!scannedStatus) {
        const error = new Error(
          "Ce type de scan ne peut pas être annulé."
        );
        error.statusCode = 409;
        throw error;
      }

      /*
       * Important : si le colis a déjà progressé depuis
       * ce scan, on refuse le rollback.
       */
      if (scan.current_status !== scannedStatus) {
        const error = new Error(
          "Ce colis a déjà changé d'état. Ce scan ne peut plus être annulé."
        );
        error.statusCode = 409;
        throw error;
      }

      /*
       * Scanner V4 :
       * retrouver le véritable état du colis AVANT ce scan.
       */
      const [scanAuditRows] = await connection.query(
        `
          SELECT
            from_status,
            to_status
          FROM package_status_audit
          WHERE package_id = ?
            AND action = 'SCAN_ACCEPTED'
            AND JSON_UNQUOTE(
              JSON_EXTRACT(metadata, '$.scan_event_id')
            ) = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [packageId, String(scan.scan_event_id)]
      );

      let previousStatus =
        scanAuditRows[0]?.from_status || null;

      /*
       * Compatibilité uniquement avec les anciens scans
       * créés avant Scanner V4.
       */
      if (!previousStatus) {
        const [previous] = await connection.query(
          `
            SELECT se.scan_type
            FROM scan_events se
            LEFT JOIN scan_cancellations sc
              ON sc.scan_event_id = se.id
            WHERE se.package_id = ?
              AND se.id < ?
              AND se.scan_status = 'accepted'
              AND sc.id IS NULL
            ORDER BY se.id DESC
            LIMIT 1
          `,
          [packageId, scan.scan_event_id]
        );

        previousStatus =
          previous[0]
            ? resultingStatus[previous[0].scan_type]
            : fallbackPrevious[scan.scan_type];
      }

      if (!previousStatus) {
        const error = new Error(
          "Impossible de déterminer l'état précédent du colis."
        );
        error.statusCode = 409;
        throw error;
      }

      /* Conserver l'annulation */
      const [cancel] = await connection.query(
        `
          INSERT INTO scan_cancellations (
            scan_event_id,
            order_id,
            package_id,
            operation_id,
            dispatch_task_id,
            route_id,
            driver_id,
            cancelled_by_user_id,
            previous_package_status,
            scanned_package_status,
            reason
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          scan.scan_event_id,
          scan.order_id,
          scan.package_id,
          scan.operation_id,
          dispatchTaskId,
          task.route_id || null,
          driverId,
          userId || null,
          previousStatus,
          scannedStatus,
          cleanReason,
        ]
      );

      /* Restaurer le colis */
      await connection.query(
        `
          UPDATE order_packages
          SET current_status = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [previousStatus, packageId]
      );

      /* Audit colis */
      await connection.query(
        `
          INSERT INTO package_status_audit (
            package_id,
            order_id,
            operation_id,
            dispatch_task_id,
            route_id,
            actor_type,
            actor_id,
            action,
            from_status,
            to_status,
            reason,
            metadata
          )
          VALUES (
            ?, ?, ?, ?, ?,
            'driver', ?,
            'SCAN_CANCELLED',
            ?, ?, ?, ?
          )
        `,
        [
          packageId,
          scan.order_id,
          scan.operation_id,
          dispatchTaskId,
          task.route_id || null,
          driverId,
          scannedStatus,
          previousStatus,
          cleanReason,
          JSON.stringify({
            scan_event_id: scan.scan_event_id,
            cancellation_id: cancel.insertId,
          }),
        ]
      );

      /* Audit opérationnel */
      await connection.query(
        `
          INSERT INTO operational_audit_log (
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
          VALUES (
            'scan', ?, ?,
            'SCAN_CANCELLED',
            ?, ?, ?, ?, ?, ?, ?, ?
          )
        `,
        [
          scan.scan_event_id,
          scan.order_id,
          scannedStatus,
          previousStatus,
          task.route_id || null,
          dispatchTaskId,
          driverId,
          task.vehicle_id || null,
          userId || null,
          JSON.stringify({
            package_id: packageId,
            cancellation_id: cancel.insertId,
            reason: cleanReason,
          }),
        ]
      );

      await connection.commit();

      return {
        success: true,
        message: "Scan du colis annulé.",
        package_id: Number(packageId),
        scan_event_id: scan.scan_event_id,
        previous_status: scannedStatus,
        current_status: previousStatus,
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

};

module.exports = DriverModel;
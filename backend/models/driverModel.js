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
          WHERE UPPER(p.barcode) = ?
          LIMIT 1
        `,
        [cleanCode]
      );

      let packageRow = packageRows[0] || null;

      /* -------------------------------------------------
         2. Compatibilité immédiate :
            si le chauffeur scanne directement le numéro
            de commande, créer automatiquement P01.
      ------------------------------------------------- */

      if (!packageRow) {
        const [orderRows] = await connection.query(
          `
            SELECT id, order_number
            FROM orders
            WHERE UPPER(order_number) = ?
            LIMIT 1
          `,
          [cleanCode]
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
            op.route_position
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
          operationRows.find((item) =>
            ["warehouse_out", "delivery"].includes(
              item.operation_type
            )
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
        SELECT id, operation_id, scanned_at
        FROM scan_events
        WHERE package_id = ?
          AND driver_id = ?
          AND scan_type = ?
          AND scan_status = 'accepted'
      `;

      if (operation?.id) {
        duplicateSql += " AND operation_id = ?";
        duplicateParams.push(operation.id);
      }

      duplicateSql += " ORDER BY id DESC LIMIT 1";

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

      /* -------------------------------------------------
         8. Démarrer l'opération si nécessaire.
      ------------------------------------------------- */

      if (operation?.id && operation.status === "pending") {
        await connection.query(
          `
            UPDATE order_operations
            SET
              status = 'in_progress',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [operation.id]
        );
      }

      /* -------------------------------------------------
         9. Pour une opération normale, la terminer quand
            TOUS les colis connus de la commande ont été
            scannés pour cette opération.

            load_vehicle reste un événement supplémentaire
            et ne clôture pas automatiquement l'opération.
      ------------------------------------------------- */

      let operationCompleted = false;

      if (
        operation?.id &&
        finalScanType !== "load_vehicle" &&
        finalScanType !== "incident"
      ) {
        const [countRows] = await connection.query(
          `
            SELECT
              (SELECT COUNT(*)
               FROM order_packages
               WHERE order_id = ?) AS total_packages,

              (SELECT COUNT(DISTINCT package_id)
               FROM scan_events
               WHERE operation_id = ?
                 AND scan_status = 'accepted'
                 AND scan_type = ?) AS scanned_packages
          `,
          [
            packageRow.order_id,
            operation.id,
            finalScanType,
          ]
        );

        const totalPackages = Number(
          countRows[0]?.total_packages || 0
        );

        const scannedPackages = Number(
          countRows[0]?.scanned_packages || 0
        );

        if (
          totalPackages > 0 &&
          scannedPackages >= totalPackages
        ) {
          await connection.query(
            `
              UPDATE order_operations
              SET
                status = 'completed',
                completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            [operation.id]
          );

          operationCompleted = true;
        }
      }

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
              status: operationCompleted
                ? "completed"
                : operation.status === "pending"
                  ? "in_progress"
                  : operation.status,
            }
          : null,
        operation_completed: operationCompleted,
        scan_type: finalScanType,
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
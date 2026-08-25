const db = require("../config/db");

const TrackingModel = {
  /* =========================================================
     AJOUTER UNE POSITION GPS
  ========================================================= */

  async createLocation(data) {
    const {
      driver_id,
      order_id,
      latitude,
      longitude,
      speed,
      heading,
      accuracy,
      battery_level,
      recorded_at,
    } = data;

    const [result] = await db.query(
      `
      INSERT INTO driver_locations (
        driver_id,
        order_id,
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        battery_level,
        recorded_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        driver_id,
        order_id || null,
        latitude,
        longitude,
        speed ?? null,
        heading ?? null,
        accuracy ?? null,
        battery_level ?? null,
        recorded_at || new Date(),
      ],
    );

    return result.insertId;
  },

  /* =========================================================
     RÉCUPÉRER LA DERNIÈRE POSITION D’UN CHAUFFEUR
  ========================================================= */

  async getLatestDriverLocation(driverId) {
    const [rows] = await db.query(
      `
      SELECT
        dl.id,
        dl.driver_id,
        dl.order_id,
        dl.latitude,
        dl.longitude,
        dl.speed,
        dl.heading,
        dl.accuracy,
        dl.battery_level,
        dl.recorded_at,
        dl.created_at,

        u.first_name AS driver_first_name,
        u.last_name AS driver_last_name,
        u.email AS driver_email,

        d.phone AS driver_phone,
        d.availability_status,

        o.order_number,
        o.status AS order_status,
        o.pickup_address,
        o.delivery_address

      FROM driver_locations dl

      INNER JOIN drivers d
        ON d.id = dl.driver_id

      INNER JOIN users u
        ON u.id = d.user_id

      LEFT JOIN orders o
        ON o.id = dl.order_id

      WHERE dl.driver_id = ?

      ORDER BY
        dl.recorded_at DESC,
        dl.id DESC

      LIMIT 1
      `,
      [driverId],
    );

    return rows[0] || null;
  },

  /* =========================================================
     RÉCUPÉRER LES DERNIÈRES POSITIONS DE TOUS LES CHAUFFEURS
  ========================================================= */

  async getLatestLocations() {
    const [rows] = await db.query(
      `
      SELECT
        dl.id,
        dl.driver_id,
        dl.order_id,
        dl.latitude,
        dl.longitude,
        dl.speed,
        dl.heading,
        dl.accuracy,
        dl.battery_level,
        dl.recorded_at,
        dl.created_at,

        u.first_name AS driver_first_name,
        u.last_name AS driver_last_name,
        u.email AS driver_email,

        COALESCE(
          d.phone,
          u.phone
        ) AS driver_phone,

        d.availability_status,
        d.vehicle_name,
        d.vehicle_plate,
        d.last_seen_at,

        o.order_number,
        o.status AS order_status,
        o.pickup_address,
        o.delivery_address,
        o.pickup_date,
        o.pickup_time,
        o.delivery_date,
        o.delivery_time

      FROM driver_locations dl

      INNER JOIN (
        SELECT
          driver_id,
          MAX(recorded_at) AS max_recorded_at

        FROM driver_locations

        GROUP BY driver_id
      ) latest
        ON latest.driver_id = dl.driver_id
        AND latest.max_recorded_at = dl.recorded_at

      INNER JOIN drivers d
        ON d.id = dl.driver_id

      INNER JOIN users u
        ON u.id = d.user_id

      LEFT JOIN orders o
        ON o.id = dl.order_id

      ORDER BY dl.recorded_at DESC
      `,
    );

    return rows;
  },

  /* =========================================================
     HISTORIQUE GPS D’UN CHAUFFEUR
  ========================================================= */

  async getDriverLocationHistory(
    driverId,
    limit = 100,
  ) {
    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 100,
        1,
      ),
      1000,
    );

    const [rows] = await db.query(
      `
      SELECT
        id,
        driver_id,
        order_id,
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        battery_level,
        recorded_at,
        created_at

      FROM driver_locations

      WHERE driver_id = ?

      ORDER BY
        recorded_at DESC,
        id DESC

      LIMIT ?
      `,
      [
        driverId,
        safeLimit,
      ],
    );

    return rows;
  },

  /* =========================================================
     HISTORIQUE GPS D’UNE COMMANDE
  ========================================================= */

  async getOrderLocationHistory(
    orderId,
    limit = 500,
  ) {
    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 500,
        1,
      ),
      2000,
    );

    const [rows] = await db.query(
      `
      SELECT
        dl.id,
        dl.driver_id,
        dl.order_id,
        dl.latitude,
        dl.longitude,
        dl.speed,
        dl.heading,
        dl.accuracy,
        dl.battery_level,
        dl.recorded_at,
        dl.created_at,

        u.first_name AS driver_first_name,
        u.last_name AS driver_last_name

      FROM driver_locations dl

      INNER JOIN drivers d
        ON d.id = dl.driver_id

      INNER JOIN users u
        ON u.id = d.user_id

      WHERE dl.order_id = ?

      ORDER BY
        dl.recorded_at ASC,
        dl.id ASC

      LIMIT ?
      `,
      [
        orderId,
        safeLimit,
      ],
    );

    return rows;
  },

  /* =========================================================
     RÉCUPÉRER LA DERNIÈRE POSITION D’UNE COMMANDE
  ========================================================= */

  async getLatestOrderLocation(orderId) {
    const [rows] = await db.query(
      `
      SELECT
        dl.id,
        dl.driver_id,
        dl.order_id,
        dl.latitude,
        dl.longitude,
        dl.speed,
        dl.heading,
        dl.accuracy,
        dl.battery_level,
        dl.recorded_at,
        dl.created_at,

        u.first_name AS driver_first_name,
        u.last_name AS driver_last_name,

        o.order_number,
        o.status AS order_status,
        o.pickup_address,
        o.delivery_address

      FROM driver_locations dl

      INNER JOIN drivers d
        ON d.id = dl.driver_id

      INNER JOIN users u
        ON u.id = d.user_id

      INNER JOIN orders o
        ON o.id = dl.order_id

      WHERE dl.order_id = ?

      ORDER BY
        dl.recorded_at DESC,
        dl.id DESC

      LIMIT 1
      `,
      [orderId],
    );

    return rows[0] || null;
  },

  /* =========================================================
     VÉRIFIER QU’UN CHAUFFEUR EXISTE
  ========================================================= */

  async driverExists(driverId) {
    const [rows] = await db.query(
      `
      SELECT
        id,
        user_id,
        availability_status

      FROM drivers

      WHERE id = ?

      LIMIT 1
      `,
      [driverId],
    );

    return rows[0] || null;
  },

  /* =========================================================
     VÉRIFIER QU’UNE COMMANDE EXISTE
  ========================================================= */

  async orderExists(orderId) {
    const [rows] = await db.query(
      `
      SELECT
        id,
        order_number,
        driver_id,
        status

      FROM orders

      WHERE id = ?

      LIMIT 1
      `,
      [orderId],
    );

    return rows[0] || null;
  },

  /* =========================================================
     METTRE À JOUR LA DERNIÈRE ACTIVITÉ DU CHAUFFEUR
  ========================================================= */

  async updateDriverLastSeen(driverId) {
    const [result] = await db.query(
      `
      UPDATE drivers

      SET
        last_seen_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP

      WHERE id = ?
      `,
      [driverId],
    );

    return result;
  },

  /* =========================================================
     SUPPRIMER LES ANCIENNES POSITIONS GPS

     Exemple :
     olderThanDays = 30
  ========================================================= */

  async deleteOldLocations(
    olderThanDays = 30,
  ) {
    const days = Math.max(
      Number(
        olderThanDays,
      ) || 30,
      1,
    );

    const [result] = await db.query(
      `
      DELETE FROM driver_locations

      WHERE recorded_at <
        DATE_SUB(
          CURRENT_TIMESTAMP,
          INTERVAL ? DAY
        )
      `,
      [days],
    );

    return result;
  },
};

module.exports = TrackingModel;
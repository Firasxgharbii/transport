const db = require("../config/db");

const VehicleModel = {
  /* =====================================================
     RÉCUPÉRER TOUS LES VÉHICULES
  ===================================================== */

  async getAllVehicles() {
    const [rows] = await db.query(`
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
        v.updated_at,

        u.first_name AS driver_first_name,
        u.last_name AS driver_last_name,

        COALESCE(
          d.phone,
          u.phone
        ) AS driver_phone

      FROM vehicles v

      LEFT JOIN drivers d
        ON d.id = v.driver_id

      LEFT JOIN users u
        ON u.id = d.user_id

      ORDER BY v.id DESC
    `);

    return rows;
  },

  /* =====================================================
     RÉCUPÉRER UN VÉHICULE
  ===================================================== */

  async getVehicleById(id) {
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
          v.updated_at,

          u.first_name AS driver_first_name,
          u.last_name AS driver_last_name,

          COALESCE(
            d.phone,
            u.phone
          ) AS driver_phone

        FROM vehicles v

        LEFT JOIN drivers d
          ON d.id = v.driver_id

        LEFT JOIN users u
          ON u.id = d.user_id

        WHERE v.id = ?

        LIMIT 1
      `,
      [id]
    );

    return rows[0] || null;
  },

  /* =====================================================
     CRÉER UN VÉHICULE
  ===================================================== */

  async createVehicle(data) {
    const {
      driver_id,

      make,
      model,
      year,

      plate,
      vin,

      vehicle_type,

      capacity_kg,
      capacity_pallets,

      fuel_type,
      mileage,

      status,

      insurance_number,
      insurance_expiry,

      registration_number,
      registration_expiry,

      notes,
    } = data;

    const [result] = await db.query(
      `
        INSERT INTO vehicles (
          driver_id,

          make,
          model,
          year,

          plate,
          vin,

          vehicle_type,

          capacity_kg,
          capacity_pallets,

          fuel_type,
          mileage,

          status,

          insurance_number,
          insurance_expiry,

          registration_number,
          registration_expiry,

          notes
        )
        VALUES (
          ?,
          ?, ?, ?,
          ?, ?,
          ?,
          ?, ?,
          ?, ?,
          ?,
          ?, ?,
          ?, ?,
          ?
        )
      `,
      [
        driver_id || null,

        make,
        model,
        year || null,

        plate,
        vin || null,

        vehicle_type || null,

        capacity_kg || null,
        capacity_pallets || null,

        fuel_type || "gasoline",
        mileage || 0,

        status || "available",

        insurance_number || null,
        insurance_expiry || null,

        registration_number || null,
        registration_expiry || null,

        notes || null,
      ]
    );

    return result.insertId;
  },

  /* =====================================================
     MODIFIER UN VÉHICULE
  ===================================================== */

  async updateVehicle(id, data) {
    const allowedFields = [
      "driver_id",

      "make",
      "model",
      "year",

      "plate",
      "vin",

      "vehicle_type",

      "capacity_kg",
      "capacity_pallets",

      "fuel_type",
      "mileage",

      "status",

      "insurance_number",
      "insurance_expiry",

      "registration_number",
      "registration_expiry",

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

    values.push(id);

    const [result] = await db.query(
      `
        UPDATE vehicles
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
     SUPPRIMER UN VÉHICULE
  ===================================================== */

  async deleteVehicle(id) {
    const [result] = await db.query(
      `
        DELETE FROM vehicles
        WHERE id = ?
      `,
      [id]
    );

    return result;
  },
};

module.exports = VehicleModel;
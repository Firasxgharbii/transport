const db = require("../config/db");

const DriverModel = {
  async getAllDrivers() {
    const [rows] = await db.query(`
      SELECT 
        drivers.id,
        drivers.user_id,
        users.first_name,
        users.last_name,
        users.email,
        users.phone,
        users.status,
        drivers.profile_photo_url,
        drivers.created_at
      FROM drivers
      JOIN users ON drivers.user_id = users.id
      ORDER BY drivers.id DESC
    `);

    return rows;
  },

  async getDriverById(id) {
    const [rows] = await db.query(
      `
      SELECT 
        drivers.id,
        drivers.user_id,
        users.first_name,
        users.last_name,
        users.email,
        users.phone,
        users.status,
        drivers.profile_photo_url,
        drivers.created_at
      FROM drivers
      JOIN users ON drivers.user_id = users.id
      WHERE drivers.id = ?
      `,
      [id]
    );

    return rows[0];
  },

  async createDriver(data) {
    const { user_id, phone, profile_photo_url } = data;

    const [result] = await db.query(
      `
      INSERT INTO drivers (user_id, phone, profile_photo_url)
      VALUES (?, ?, ?)
      `,
      [user_id, phone || null, profile_photo_url || null]
    );

    return result.insertId;
  },

  async updateDriver(id, data) {
    const { phone, profile_photo_url } = data;

    const [result] = await db.query(
      `
      UPDATE drivers
      SET
        phone = COALESCE(?, phone),
        profile_photo_url = COALESCE(?, profile_photo_url)
      WHERE id = ?
      `,
      [phone, profile_photo_url, id]
    );

    return result;
  },

  async deleteDriver(id) {
    const [result] = await db.query("DELETE FROM drivers WHERE id = ?", [id]);
    return result;
  },

  async checkUserIsDriver(user_id) {
    const [rows] = await db.query(
      `
      SELECT users.id, roles.name AS role
      FROM users
      JOIN roles ON users.role_id = roles.id
      WHERE users.id = ?
      `,
      [user_id]
    );

    return rows[0];
  },

  async checkDriverExistsForUser(user_id) {
    const [rows] = await db.query(
      "SELECT id FROM drivers WHERE user_id = ?",
      [user_id]
    );

    return rows[0];
  },
};

module.exports = DriverModel;
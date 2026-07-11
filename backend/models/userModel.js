const db = require("../config/db");

const UserModel = {
  async getAllUsers() {
    const [rows] = await db.query(`
      SELECT 
        users.id,
        users.first_name,
        users.last_name,
        users.email,
        users.phone,
        users.status,
        roles.name AS role,
        users.created_at,
        users.updated_at
      FROM users
      JOIN roles ON users.role_id = roles.id
      ORDER BY users.id DESC
    `);

    return rows;
  },

  async getUserById(id) {
    const [rows] = await db.query(
      `
      SELECT 
        users.id,
        users.first_name,
        users.last_name,
        users.email,
        users.phone,
        users.status,
        roles.name AS role,
        users.created_at,
        users.updated_at
      FROM users
      JOIN roles ON users.role_id = roles.id
      WHERE users.id = ?
      `,
      [id]
    );

    return rows[0];
  },

  async updateUser(id, data) {
    const { first_name, last_name, phone, status } = data;

    const [result] = await db.query(
      `
      UPDATE users
      SET 
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        phone = COALESCE(?, phone),
        status = COALESCE(?, status)
      WHERE id = ?
      `,
      [first_name, last_name, phone, status, id]
    );

    return result;
  },

  async deleteUser(id) {
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [id]);
    return result;
  },
};

module.exports = UserModel;
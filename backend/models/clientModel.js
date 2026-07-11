const db = require("../config/db");

const ClientModel = {
  async getAllClients() {
    const [rows] = await db.query(`
      SELECT 
        id,
        company_id,
        user_id,
        first_name,
        last_name,
        company_name,
        phone,
        email,
        address,
        city,
        province,
        postal_code,
        notes,
        created_at
      FROM clients
      ORDER BY id DESC
    `);

    return rows;
  },

  async getClientById(id) {
    const [rows] = await db.query(
      `
      SELECT 
        id,
        company_id,
        user_id,
        first_name,
        last_name,
        company_name,
        phone,
        email,
        address,
        city,
        province,
        postal_code,
        notes,
        created_at
      FROM clients
      WHERE id = ?
      `,
      [id]
    );

    return rows[0];
  },

  async createClient(data) {
    const {
      company_id,
      user_id,
      first_name,
      last_name,
      company_name,
      phone,
      email,
      address,
      city,
      province,
      postal_code,
      notes,
    } = data;

    const [result] = await db.query(
      `
      INSERT INTO clients
      (
        company_id,
        user_id,
        first_name,
        last_name,
        company_name,
        phone,
        email,
        address,
        city,
        province,
        postal_code,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        company_id || null,
        user_id || null,
        first_name,
        last_name,
        company_name || null,
        phone,
        email || null,
        address || null,
        city || null,
        province || null,
        postal_code || null,
        notes || null,
      ]
    );

    return result.insertId;
  },

  async updateClient(id, data) {
    const {
      first_name,
      last_name,
      company_name,
      phone,
      email,
      address,
      city,
      province,
      postal_code,
      notes,
    } = data;

    const [result] = await db.query(
      `
      UPDATE clients
      SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        company_name = COALESCE(?, company_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        province = COALESCE(?, province),
        postal_code = COALESCE(?, postal_code),
        notes = COALESCE(?, notes)
      WHERE id = ?
      `,
      [
        first_name,
        last_name,
        company_name,
        phone,
        email,
        address,
        city,
        province,
        postal_code,
        notes,
        id,
      ]
    );

    return result;
  },

  async deleteClient(id) {
    const [result] = await db.query("DELETE FROM clients WHERE id = ?", [id]);
    return result;
  },
};

module.exports = ClientModel;
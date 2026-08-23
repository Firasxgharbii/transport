const db = require("../config/db");

const ClientModel = {
  /* =========================================================
     RÉCUPÉRER TOUS LES CLIENTS
  ========================================================= */

  async getAllClients() {
    const [rows] = await db.query(`
      SELECT
        clients.id,
        clients.company_id,
        clients.user_id,

        clients.first_name,
        clients.last_name,
        clients.company_name,

        clients.phone,
        clients.email,

        clients.address,
        clients.city,
        clients.province,
        clients.postal_code,

        clients.notes,
        clients.created_at

      FROM clients

      ORDER BY clients.id DESC
    `);

    return rows;
  },

  /* =========================================================
     RÉCUPÉRER UN CLIENT PAR ID
  ========================================================= */

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

        LIMIT 1
      `,
      [id]
    );

    return rows[0] || null;
  },

  /* =========================================================
     RÉCUPÉRER UN CLIENT PAR USER ID
  ========================================================= */

  async getClientByUserId(userId) {
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

        WHERE user_id = ?

        LIMIT 1
      `,
      [userId]
    );

    return rows[0] || null;
  },

  /* =========================================================
     RÉCUPÉRER UN CLIENT PAR COURRIEL
  ========================================================= */

  async getClientByEmail(email) {
    if (!email) {
      return null;
    }

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

        WHERE email = ?

        LIMIT 1
      `,
      [email]
    );

    return rows[0] || null;
  },

  /* =========================================================
     CRÉER UN CLIENT
  ========================================================= */

  async createClient(data) {
    const {
      company_id = null,
      user_id = null,

      first_name = "",
      last_name = "",
      company_name = null,

      phone = null,
      email = null,

      address = null,
      city = null,
      province = null,
      postal_code = null,

      notes = null,
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

        VALUES
        (
          ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?
        )
      `,
      [
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
      ]
    );

    return result.insertId;
  },

  /* =========================================================
     CRÉER UN CLIENT À PARTIR D'UN UTILISATEUR
  ========================================================= */

  async createClientFromUser(user) {
    const existingByUser =
      await this.getClientByUserId(
        user.id
      );

    if (existingByUser) {
      return existingByUser.id;
    }

    const existingByEmail =
      user.email
        ? await this.getClientByEmail(
            user.email
          )
        : null;

    if (existingByEmail) {
      if (!existingByEmail.user_id) {
        await db.query(
          `
            UPDATE clients

            SET
              user_id = ?,
              first_name =
                COALESCE(NULLIF(?, ''), first_name),

              last_name =
                COALESCE(NULLIF(?, ''), last_name),

              phone =
                COALESCE(NULLIF(?, ''), phone)

            WHERE id = ?
          `,
          [
            user.id,
            user.first_name || null,
            user.last_name || null,
            user.phone || null,
            existingByEmail.id,
          ]
        );
      }

      return existingByEmail.id;
    }

    return this.createClient({
      user_id: user.id,

      first_name:
        user.first_name || "",

      last_name:
        user.last_name || "",

      email:
        user.email || null,

      phone:
        user.phone || null,

      notes:
        "Client créé automatiquement après approbation de l'inscription.",
    });
  },

  /* =========================================================
     MODIFIER UN CLIENT
  ========================================================= */

  async updateClient(id, data) {
    const {
      first_name = null,
      last_name = null,
      company_name = null,

      phone = null,
      email = null,

      address = null,
      city = null,
      province = null,
      postal_code = null,

      notes = null,
    } = data;

    const [result] = await db.query(
      `
        UPDATE clients

        SET
          first_name =
            COALESCE(?, first_name),

          last_name =
            COALESCE(?, last_name),

          company_name =
            COALESCE(?, company_name),

          phone =
            COALESCE(?, phone),

          email =
            COALESCE(?, email),

          address =
            COALESCE(?, address),

          city =
            COALESCE(?, city),

          province =
            COALESCE(?, province),

          postal_code =
            COALESCE(?, postal_code),

          notes =
            COALESCE(?, notes)

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

  /* =========================================================
     SUPPRIMER UN CLIENT
  ========================================================= */

  async deleteClient(id) {
    const [result] =
      await db.query(
        `
          DELETE FROM clients
          WHERE id = ?
        `,
        [id]
      );

    return result;
  },
};

module.exports = ClientModel;
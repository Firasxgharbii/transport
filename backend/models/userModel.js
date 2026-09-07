const db = require("../config/db");

const ALLOWED_STATUSES = [
  "pending",
  "active",
  "rejected",
  "suspended",
  "inactive",
  "blocked",
];

const ALLOWED_ACCOUNT_TYPES = [
  "individual",
  "company",
];

function normalizeAccountType(value) {
  return value === "company"
    ? "company"
    : "individual";
}

function normalizeCompanyName(
  accountType,
  value
) {
  if (accountType !== "company") {
    return null;
  }

  const companyName =
    typeof value === "string"
      ? value.trim()
      : "";

  return companyName || null;
}

const UserModel = {
  /* =====================================================
     RÉCUPÉRER TOUS LES UTILISATEURS
  ===================================================== */

  async getAllUsers() {
    const [rows] =
      await db.query(`
        SELECT
          users.id,
          users.role_id,
          users.first_name,
          users.last_name,
          users.email,
          users.phone,
          users.account_type,
          users.company_name,
          users.status,
          roles.name AS role,
          roles.name AS role_name,

          clients.address,
          clients.city,
          clients.province,
          clients.postal_code,

          users.created_at,
          users.updated_at,

          users.updated_at
            AS last_seen_at

        FROM users

        INNER JOIN roles
          ON users.role_id =
             roles.id

        LEFT JOIN clients
          ON clients.user_id =
             users.id

        ORDER BY
          users.updated_at DESC,
          users.id DESC
      `);

    return rows;
  },

  /* =====================================================
     RÉCUPÉRER UN UTILISATEUR PAR ID
  ===================================================== */

  async getUserById(id) {
    const [rows] =
      await db.query(
        `
          SELECT
            users.id,
            users.role_id,
            users.first_name,
            users.last_name,
            users.email,
            users.phone,
            users.account_type,
            users.company_name,
            users.status,
            roles.name AS role,
            roles.name AS role_name,

            clients.address,
            clients.city,
            clients.province,
            clients.postal_code,

            users.created_at,
            users.updated_at,

            users.updated_at
              AS last_seen_at

          FROM users

          INNER JOIN roles
            ON users.role_id =
               roles.id

          LEFT JOIN clients
            ON clients.user_id =
               users.id

          WHERE users.id = ?
          LIMIT 1
        `,
        [id]
      );

    return rows[0] || null;
  },

  /* =====================================================
     RÉCUPÉRER UN UTILISATEUR PAR EMAIL
  ===================================================== */

  async getUserByEmail(email) {
    const [rows] =
      await db.query(
        `
          SELECT
            users.id,
            users.role_id,
            users.first_name,
            users.last_name,
            users.email,
            users.phone,
            users.password,
            users.account_type,
            users.company_name,
            users.status,
            users.created_at,
            users.updated_at,
            roles.name AS role,
            roles.name AS role_name
          FROM users
          INNER JOIN roles
            ON users.role_id =
               roles.id
          WHERE LOWER(users.email) =
                LOWER(?)
          LIMIT 1
        `,
        [email]
      );

    return rows[0] || null;
  },

  /* =====================================================
     VÉRIFIER SI UN EMAIL EXISTE
  ===================================================== */

  async emailExists(email) {
    const [rows] =
      await db.query(
        `
          SELECT id
          FROM users
          WHERE LOWER(email) =
                LOWER(?)
          LIMIT 1
        `,
        [email]
      );

    return rows.length > 0;
  },

  /* =====================================================
     RÉCUPÉRER UN RÔLE
  ===================================================== */

  async getRoleByName(roleName) {
    const [rows] =
      await db.query(
        `
          SELECT id, name
          FROM roles
          WHERE name = ?
          LIMIT 1
        `,
        [roleName]
      );

    return rows[0] || null;
  },

  /* =====================================================
     CRÉER / SYNCHRONISER LE CLIENT
  ===================================================== */

  async syncClientForUser(
    connection,
    userId,
    {
      firstName,
      lastName,
      email,
      phone,
      accountType,
      companyName,
      address = null,
      city = null,
      province = null,
      postalCode = null,
    }
  ) {
    const normalizedAccountType =
      normalizeAccountType(
        accountType
      );

    const normalizedCompanyName =
      normalizeCompanyName(
        normalizedAccountType,
        companyName
      );

    const [existing] =
      await connection.query(
        `
          SELECT id
          FROM clients
          WHERE user_id = ?
          LIMIT 1
        `,
        [userId]
      );

    if (existing.length) {
      await connection.query(
        `
          UPDATE clients
          SET
            first_name = ?,
            last_name = ?,
            company_name = ?,
            phone = ?,
            email = ?,
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            province = COALESCE(?, province),
            postal_code = COALESCE(?, postal_code)
          WHERE user_id = ?
        `,
        [
          firstName,
          lastName,
          normalizedCompanyName,
          phone,
          email,
          address,
          city,
          province,
          postalCode,
          userId,
        ]
      );

      return existing[0].id;
    }

    const [result] =
      await connection.query(
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
            NULL,
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
          userId,
          firstName,
          lastName,
          normalizedCompanyName,
          phone,
          email,
          address,
          city,
          province,
          postalCode,
          "Client synchronisé automatiquement depuis le compte utilisateur.",
        ]
      );

    return result.insertId;
  },

  /* =====================================================
     CRÉER UN UTILISATEUR
  ===================================================== */

  async createUser({
    roleId,
    firstName,
    lastName,
    email,
    phone = null,
    passwordHash,
    status = "pending",
    accountType = "individual",
    companyName = null,
    address = null,
    city = null,
    province = null,
    postalCode = null,
  }) {
    if (
      !ALLOWED_STATUSES.includes(
        status
      )
    ) {
      throw new Error(
        "Statut utilisateur invalide."
      );
    }

    if (
      !ALLOWED_ACCOUNT_TYPES.includes(
        accountType
      )
    ) {
      throw new Error(
        "Type de compte invalide."
      );
    }

    const normalizedCompanyName =
      normalizeCompanyName(
        accountType,
        companyName
      );

    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      const [result] =
        await connection.query(
          `
            INSERT INTO users
            (
              role_id,
              first_name,
              last_name,
              email,
              phone,
              password,
              account_type,
              company_name,
              status
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            roleId,
            firstName,
            lastName,
            email,
            phone,
            passwordHash,
            accountType,
            normalizedCompanyName,
            status,
          ]
        );

      const userId =
        result.insertId;

      const [roleRows] =
        await connection.query(
          `
            SELECT name
            FROM roles
            WHERE id = ?
            LIMIT 1
          `,
          [roleId]
        );

      if (
        roleRows[0]?.name ===
        "client"
      ) {
        await this.syncClientForUser(
          connection,
          userId,
          {
            firstName,
            lastName,
            email,
            phone,
            accountType,
            companyName:
              normalizedCompanyName,
            address,
            city,
            province,
            postalCode,
          }
        );
      }

      await connection.commit();

      return userId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /* =====================================================
     METTRE À JOUR UN UTILISATEUR
  ===================================================== */

  async updateUser(id, data) {
    const current =
      await this.getUserById(id);

    if (!current) {
      return {
        affectedRows: 0,
      };
    }

    const nextStatus =
      data.status !== undefined
        ? data.status
        : current.status;

    if (
      !ALLOWED_STATUSES.includes(
        nextStatus
      )
    ) {
      throw new Error(
        "Statut utilisateur invalide."
      );
    }

    const nextAccountType =
      data.account_type !== undefined
        ? normalizeAccountType(
            data.account_type
          )
        : normalizeAccountType(
            current.account_type
          );

    if (
      !ALLOWED_ACCOUNT_TYPES.includes(
        nextAccountType
      )
    ) {
      throw new Error(
        "Type de compte invalide."
      );
    }

    const nextCompanyName =
      normalizeCompanyName(
        nextAccountType,
        data.company_name !==
          undefined
          ? data.company_name
          : current.company_name
      );

    const nextFirstName =
      data.first_name !== undefined
        ? String(
            data.first_name || ""
          ).trim()
        : current.first_name;

    const nextLastName =
      data.last_name !== undefined
        ? String(
            data.last_name || ""
          ).trim()
        : current.last_name;

    const nextEmail =
      data.email !== undefined
        ? String(
            data.email || ""
          )
            .trim()
            .toLowerCase()
        : current.email;

    const nextPhone =
      data.phone !== undefined
        ? (
            String(
              data.phone || ""
            ).trim() || null
          )
        : current.phone;

    const nextRoleId =
      data.role_id !== undefined
        ? Number(data.role_id)
        : current.role_id;

    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      const fields = [
        "first_name = ?",
        "last_name = ?",
        "email = ?",
        "phone = ?",
        "role_id = ?",
        "account_type = ?",
        "company_name = ?",
        "status = ?",
        "updated_at = CURRENT_TIMESTAMP",
      ];

      const values = [
        nextFirstName,
        nextLastName,
        nextEmail,
        nextPhone,
        nextRoleId,
        nextAccountType,
        nextCompanyName,
        nextStatus,
      ];

      if (
        data.password_hash
      ) {
        fields.push(
          "password = ?"
        );

        values.push(
          data.password_hash
        );
      }

      values.push(id);

      const [result] =
        await connection.query(
          `
            UPDATE users
            SET
              ${fields.join(",\n              ")}
            WHERE id = ?
          `,
          values
        );

      const [roleRows] =
        await connection.query(
          `
            SELECT name
            FROM roles
            WHERE id = ?
            LIMIT 1
          `,
          [nextRoleId]
        );

      if (
        roleRows[0]?.name ===
        "client"
      ) {
        await this.syncClientForUser(
          connection,
          id,
          {
            firstName:
              nextFirstName,
            lastName:
              nextLastName,
            email:
              nextEmail,
            phone:
              nextPhone,
            accountType:
              nextAccountType,
            companyName:
              nextCompanyName,
            address:
              data.address !==
              undefined
                ? data.address
                : current.address,
            city:
              data.city !== undefined
                ? data.city
                : current.city,
            province:
              data.province !==
              undefined
                ? data.province
                : current.province,
            postalCode:
              data.postal_code !==
              undefined
                ? data.postal_code
                : current.postal_code,
          }
        );
      }

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
     MODIFIER LE STATUT
  ===================================================== */

  async updateUserStatus(
    id,
    status
  ) {
    if (
      !ALLOWED_STATUSES.includes(
        status
      )
    ) {
      throw new Error(
        "Statut utilisateur invalide."
      );
    }

    const [result] =
      await db.query(
        `
          UPDATE users
          SET
            status = ?,
            updated_at =
              CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [status, id]
      );

    return result;
  },

  /* =====================================================
     SUPPRIMER UN UTILISATEUR
  ===================================================== */

  async deleteUser(id) {
    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `
          UPDATE clients
          SET user_id = NULL
          WHERE user_id = ?
        `,
        [id]
      );

      const [result] =
        await connection.query(
          `
            DELETE FROM users
            WHERE id = ?
          `,
          [id]
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
};

module.exports = UserModel;
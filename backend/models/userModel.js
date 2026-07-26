const db = require("../config/db");

const ALLOWED_STATUSES = [
  "pending",
  "active",
  "rejected",
  "suspended",
  "inactive",
];

const UserModel = {
  /* =====================================================
     RÉCUPÉRER TOUS LES UTILISATEURS
  ===================================================== */

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
      INNER JOIN roles
        ON users.role_id = roles.id
      ORDER BY users.id DESC
    `);

    return rows;
  },

  /* =====================================================
     RÉCUPÉRER UN UTILISATEUR PAR ID
  ===================================================== */

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
        INNER JOIN roles
          ON users.role_id = roles.id
        WHERE users.id = ?
        LIMIT 1
      `,
      [id]
    );

    return rows[0] || null;
  },

  /* =====================================================
     RÉCUPÉRER UN UTILISATEUR PAR EMAIL
     AVEC LE MOT DE PASSE POUR LE LOGIN
  ===================================================== */

  async getUserByEmail(email) {
    const [rows] = await db.query(
      `
        SELECT
          users.id,
          users.role_id,
          users.first_name,
          users.last_name,
          users.email,
          users.phone,
          users.password,
          users.status,
          users.created_at,
          users.updated_at,
          roles.name AS role_name
        FROM users
        INNER JOIN roles
          ON users.role_id = roles.id
        WHERE LOWER(users.email) = LOWER(?)
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
    const [rows] = await db.query(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER(?)
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
    const [rows] = await db.query(
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
  }) {
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new Error("Statut utilisateur invalide.");
    }

    const [result] = await db.query(
      `
        INSERT INTO users (
          role_id,
          first_name,
          last_name,
          email,
          phone,
          password,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        roleId,
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
        status,
      ]
    );

    return result.insertId;
  },

  /* =====================================================
     METTRE À JOUR UN UTILISATEUR
  ===================================================== */

  async updateUser(id, data) {
    const {
      first_name = null,
      last_name = null,
      phone = null,
      status = null,
    } = data;

    if (
      status !== null &&
      !ALLOWED_STATUSES.includes(status)
    ) {
      throw new Error("Statut utilisateur invalide.");
    }

    const [result] = await db.query(
      `
        UPDATE users
        SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          phone = COALESCE(?, phone),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        first_name,
        last_name,
        phone,
        status,
        id,
      ]
    );

    return result;
  },

  /* =====================================================
     MODIFIER LE STATUT
  ===================================================== */

  async updateUserStatus(id, status) {
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new Error("Statut utilisateur invalide.");
    }

    const [result] = await db.query(
      `
        UPDATE users
        SET
          status = ?,
          updated_at = CURRENT_TIMESTAMP
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
    const [result] = await db.query(
      `
        DELETE FROM users
        WHERE id = ?
      `,
      [id]
    );

    return result;
  },
};

module.exports = UserModel;
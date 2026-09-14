const db = require("../config/db");

/* =========================================================
   HELPERS
========================================================= */

function normalizePositiveId(
  value,
  fieldName = "id"
) {
  const raw = String(value ?? "").trim();

  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error(
      `${fieldName} invalide.`
    );
  }

  const id = Number(raw);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      `${fieldName} invalide.`
    );
  }

  return id;
}

function normalizeOptionalPositiveId(
  value,
  fieldName
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return normalizePositiveId(
    value,
    fieldName
  );
}

/* =========================================================
   CLIENT MODEL
========================================================= */

const ClientModel = {
  /* =======================================================
     RÉCUPÉRER TOUS LES CLIENTS
  ======================================================= */

  async getAllClients() {
    const [rows] = await db.query(`
      SELECT
        c.id,
        c.company_id,
        c.user_id,

        c.first_name,
        c.last_name,
        c.company_name,

        c.phone,
        c.email,

        c.address,
        c.city,
        c.province,
        c.postal_code,

        c.notes,
        c.created_at

      FROM clients c

      ORDER BY
        c.created_at DESC,
        c.id DESC
    `);

    return rows;
  },

  /* =======================================================
     RÉCUPÉRER UN CLIENT PAR ID
  ======================================================= */

  async getClientById(id) {
    const clientId =
      normalizePositiveId(
        id,
        "clientId"
      );

    const [rows] =
      await db.query(
        `
          SELECT
            c.id,
            c.company_id,
            c.user_id,

            c.first_name,
            c.last_name,
            c.company_name,

            c.phone,
            c.email,

            c.address,
            c.city,
            c.province,
            c.postal_code,

            c.notes,
            c.created_at

          FROM clients c

          WHERE c.id = ?

          LIMIT 1
        `,
        [clientId]
      );

    return rows[0] || null;
  },

  /* =======================================================
     RÉCUPÉRER UN CLIENT PAR USER ID

     IMPORTANT :
     utilisé par :
     - GET /api/clients/me
     - PUT /api/clients/me
     - création sécurisée d'une commande client
  ======================================================= */

  async getClientByUserId(userId) {
    const normalizedUserId =
      normalizePositiveId(
        userId,
        "userId"
      );

    const [rows] =
      await db.query(
        `
          SELECT
            c.id,
            c.company_id,
            c.user_id,

            c.first_name,
            c.last_name,
            c.company_name,

            c.phone,
            c.email,

            c.address,
            c.city,
            c.province,
            c.postal_code,

            c.notes,
            c.created_at

          FROM clients c

          WHERE c.user_id = ?

          LIMIT 1
        `,
        [normalizedUserId]
      );

    return rows[0] || null;
  },

  /* =======================================================
     RÉCUPÉRER UN CLIENT PAR COURRIEL
  ======================================================= */

  async getClientByEmail(email) {
    if (!email) {
      return null;
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      return null;
    }

    const [rows] =
      await db.query(
        `
          SELECT
            c.id,
            c.company_id,
            c.user_id,

            c.first_name,
            c.last_name,
            c.company_name,

            c.phone,
            c.email,

            c.address,
            c.city,
            c.province,
            c.postal_code,

            c.notes,
            c.created_at

          FROM clients c

          WHERE LOWER(c.email) = ?

          LIMIT 1
        `,
        [normalizedEmail]
      );

    return rows[0] || null;
  },

  /* =======================================================
     CRÉER UN CLIENT
  ======================================================= */

  async createClient(data = {}) {
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

    const normalizedCompanyId =
      normalizeOptionalPositiveId(
        company_id,
        "company_id"
      );

    const normalizedUserId =
      normalizeOptionalPositiveId(
        user_id,
        "user_id"
      );

    const normalizedEmail =
      email
        ? String(email)
            .trim()
            .toLowerCase()
        : null;

    const [result] =
      await db.query(
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
          normalizedCompanyId,
          normalizedUserId,

          first_name || "",
          last_name || "",
          company_name || null,

          phone || null,
          normalizedEmail,

          address || null,
          city || null,
          province || null,
          postal_code || null,

          notes || null,
        ]
      );

    return result.insertId;
  },

  /* =======================================================
     CRÉER / LIER UN CLIENT À PARTIR D'UN USER

     Utilisé notamment après approbation d'un compte.
  ======================================================= */

  async createClientFromUser(
    user
  ) {
    if (!user?.id) {
      throw new Error(
        "Utilisateur invalide."
      );
    }

    const userId =
      normalizePositiveId(
        user.id,
        "user.id"
      );

    /*
     * 1. Vérifier si le user possède déjà
     * un profil client.
     */
    const existingByUser =
      await this.getClientByUserId(
        userId
      );

    if (existingByUser) {
      return existingByUser.id;
    }

    /*
     * 2. Chercher un profil existant
     * avec la même adresse email.
     */
    const existingByEmail =
      user.email
        ? await this.getClientByEmail(
            user.email
          )
        : null;

    /*
     * 3. Si le client existe déjà
     * mais n'a pas encore de user_id,
     * on le lie au compte.
     */
    if (existingByEmail) {
      if (!existingByEmail.user_id) {
        await db.query(
          `
            UPDATE clients

            SET
              user_id = ?,

              first_name =
                COALESCE(
                  NULLIF(?, ''),
                  first_name
                ),

              last_name =
                COALESCE(
                  NULLIF(?, ''),
                  last_name
                ),

              phone =
                COALESCE(
                  NULLIF(?, ''),
                  phone
                )

            WHERE id = ?
          `,
          [
            userId,
            user.first_name || null,
            user.last_name || null,
            user.phone || null,
            existingByEmail.id,
          ]
        );
      }

      return existingByEmail.id;
    }

    /*
     * 4. Aucun profil existant :
     * créer automatiquement un client.
     */
    return this.createClient({
      user_id: userId,

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

  /* =======================================================
     MODIFIER UN CLIENT

     Important :
     - seuls les champs présents dans data sont modifiés
     - undefined = ne pas modifier
     - null = effacer le champ si la DB l'autorise

     Cela évite le problème de COALESCE qui empêchait
     par exemple de vider company_name.
  ======================================================= */

  async updateClient(
    id,
    data = {}
  ) {
    const clientId =
      normalizePositiveId(
        id,
        "clientId"
      );

    const allowedFields = [
      "first_name",
      "last_name",
      "company_name",
      "phone",
      "email",
      "address",
      "city",
      "province",
      "postal_code",
      "notes",
    ];

    const fields = [];
    const values = [];

    for (
      const field of allowedFields
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          data,
          field
        ) &&
        data[field] !== undefined
      ) {
        let value = data[field];

        if (
          field === "email" &&
          value
        ) {
          value =
            String(value)
              .trim()
              .toLowerCase();
        }

        fields.push(
          `${field} = ?`
        );

        values.push(
          value === ""
            ? null
            : value
        );
      }
    }

    if (fields.length === 0) {
      return {
        affectedRows: 0,
        changedRows: 0,
      };
    }

    values.push(clientId);

    const [result] =
      await db.query(
        `
          UPDATE clients

          SET
            ${fields.join(", ")}

          WHERE id = ?
        `,
        values
      );

    return result;
  },

  /* =======================================================
     METTRE À JOUR UNIQUEMENT LE PROFIL DU CLIENT

     Cette méthode peut être utilisée par /clients/me.
     Les champs sensibles sont volontairement exclus.
  ======================================================= */

  async updateClientProfile(
    clientId,
    data = {}
  ) {
    const id =
      normalizePositiveId(
        clientId,
        "clientId"
      );

    const safeData = {};

    const allowedProfileFields = [
      "first_name",
      "last_name",
      "company_name",
      "phone",
      "address",
      "city",
      "province",
      "postal_code",
    ];

    for (
      const field of
      allowedProfileFields
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          data,
          field
        )
      ) {
        safeData[field] =
          data[field];
      }
    }

    /*
     * Sécurité :
     *
     * Cette méthode ne permet PAS
     * de modifier :
     *
     * - id
     * - user_id
     * - company_id
     * - email
     * - notes
     * - role
     */
    return this.updateClient(
      id,
      safeData
    );
  },

  /* =======================================================
     VÉRIFIER SI L'ADRESSE CLIENT EST COMPLÈTE

     Utile avant création d'une commande.
  ======================================================= */

  async hasCompleteAddress(
    clientId
  ) {
    const client =
      await this.getClientById(
        clientId
      );

    if (!client) {
      return false;
    }

    return Boolean(
      String(
        client.address || ""
      ).trim() &&

      String(
        client.city || ""
      ).trim() &&

      String(
        client.province || ""
      ).trim() &&

      String(
        client.postal_code || ""
      ).trim()
    );
  },

  /* =======================================================
     SUPPRIMER UN CLIENT
  ======================================================= */

  async deleteClient(id) {
    const clientId =
      normalizePositiveId(
        id,
        "clientId"
      );

    const [result] =
      await db.query(
        `
          DELETE FROM clients
          WHERE id = ?
        `,
        [clientId]
      );

    return result;
  },
};

module.exports = ClientModel;
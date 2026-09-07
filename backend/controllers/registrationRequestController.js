const db = require("../config/db");

/* =========================================================
   NORMALISER LES DONNÉES CLIENT
========================================================= */

function normalizeClientData(user) {
  const accountType =
    user.account_type === "company"
      ? "company"
      : "individual";

  return {
    firstName: String(user.first_name || "").trim(),
    lastName: String(user.last_name || "").trim(),
    email: user.email
      ? String(user.email).trim().toLowerCase()
      : null,
    phone: user.phone
      ? String(user.phone).trim() || null
      : null,
    accountType,
    companyName:
      accountType === "company" && user.company_name
        ? String(user.company_name).trim() || null
        : null,
  };
}

/* =========================================================
   CRÉER / SYNCHRONISER LE CLIENT D'UN UTILISATEUR

   Évite les doublons :
   - recherche d'abord avec user_id
   - puis avec email
   - sinon crée un nouveau client

   IMPORTANT :
   Les informations du client sont toujours synchronisées
   avec les informations actuelles du compte utilisateur.
========================================================= */

async function ensureClientForUser(user) {
  if (!user || !user.id) {
    throw new Error(
      "Utilisateur invalide pour la création du client."
    );
  }

  const clientData = normalizeClientData(user);

  /* ---------------------------------------------------------
     1. Client déjà relié à ce user_id
  --------------------------------------------------------- */

  const [existingByUserId] = await db.query(
    `
      SELECT id
      FROM clients
      WHERE user_id = ?
      LIMIT 1
    `,
    [user.id]
  );

  if (existingByUserId.length) {
    const clientId = existingByUserId[0].id;

    await db.query(
      `
        UPDATE clients
        SET
          first_name = ?,
          last_name = ?,
          company_name = ?,
          phone = ?,
          email = ?
        WHERE id = ?
      `,
      [
        clientData.firstName,
        clientData.lastName,
        clientData.companyName,
        clientData.phone,
        clientData.email,
        clientId,
      ]
    );

    return {
      clientId,
      created: false,
      synchronized: true,
    };
  }

  /* ---------------------------------------------------------
     2. Client existant avec le même courriel
  --------------------------------------------------------- */

  if (clientData.email) {
    const [existingByEmail] = await db.query(
      `
        SELECT
          id,
          user_id
        FROM clients
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `,
      [clientData.email]
    );

    if (existingByEmail.length) {
      const existingClient = existingByEmail[0];

      /*
       * Si ce client est déjà relié à un autre utilisateur,
       * on ne vole jamais cette liaison.
       */
      if (
        existingClient.user_id &&
        Number(existingClient.user_id) !==
          Number(user.id)
      ) {
        throw new Error(
          "Un profil client avec ce courriel est déjà relié à un autre utilisateur."
        );
      }

      await db.query(
        `
          UPDATE clients
          SET
            user_id = ?,
            first_name = ?,
            last_name = ?,
            company_name = ?,
            phone = ?,
            email = ?
          WHERE id = ?
        `,
        [
          user.id,
          clientData.firstName,
          clientData.lastName,
          clientData.companyName,
          clientData.phone,
          clientData.email,
          existingClient.id,
        ]
      );

      return {
        clientId: existingClient.id,
        created: false,
        synchronized: true,
      };
    }
  }

  /* ---------------------------------------------------------
     3. Aucun client trouvé → création automatique
  --------------------------------------------------------- */

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
        NULL,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        NULL,
        NULL,
        NULL,
        NULL,
        ?
      )
    `,
    [
      user.id,
      clientData.firstName,
      clientData.lastName,
      clientData.companyName,
      clientData.phone,
      clientData.email,
      "Client créé automatiquement après approbation de l'inscription.",
    ]
  );

  return {
    clientId: result.insertId,
    created: true,
    synchronized: true,
  };
}

/* =========================================================
   RÉCUPÉRER TOUTES LES DEMANDES
========================================================= */

exports.getRegistrationRequests = async (
  req,
  res
) => {
  try {
    const [rows] = await db.query(`
      SELECT
        users.id,
        users.first_name,
        users.last_name,
        users.email,
        users.phone,
        users.account_type,
        users.company_name,
        users.status,
        users.created_at,
        users.updated_at
      FROM users
      WHERE users.status IN (
        'pending',
        'active',
        'rejected'
      )
      ORDER BY users.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      requests: rows,
      data: rows,
      total: rows.length,
    });
  } catch (error) {
    console.error(
      "Erreur récupération demandes :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les demandes d'inscription.",
    });
  }
};

/* =========================================================
   APPROUVER UNE DEMANDE

   Lors de l'approbation :
   1. user devient active
   2. client est créé ou retrouvé
   3. clients.user_id = users.id
   4. toutes les informations sont synchronisées
========================================================= */

exports.approveRegistrationRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      `
        SELECT
          id,
          first_name,
          last_name,
          email,
          phone,
          account_type,
          company_name,
          status
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    const user = users[0];
    const wasAlreadyActive =
      user.status === "active";

    if (!wasAlreadyActive) {
      const [result] = await db.query(
        `
          UPDATE users
          SET
            status = 'active',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [id]
      );

      if (!result.affectedRows) {
        return res.status(404).json({
          success: false,
          message:
            "Impossible de trouver cette demande.",
        });
      }
    }

    const clientResult =
      await ensureClientForUser(user);

    return res.status(200).json({
      success: true,
      status: "active",
      message: wasAlreadyActive
        ? "Utilisateur déjà approuvé. Le profil client a été vérifié et synchronisé."
        : clientResult.created
          ? "La demande a été approuvée et le client a été créé avec succès."
          : "La demande a été approuvée et le profil client a été synchronisé avec succès.",
      client: {
        id: clientResult.clientId,
        created: clientResult.created,
        synchronized:
          clientResult.synchronized,
      },
    });
  } catch (error) {
    console.error(
      "Erreur approbation demande :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible d'approuver cette demande.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/* =========================================================
   REFUSER UNE DEMANDE
========================================================= */

exports.rejectRegistrationRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      `
        SELECT
          id,
          email,
          status
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    const user = users[0];

    if (user.status === "rejected") {
      return res.status(200).json({
        success: true,
        status: "rejected",
        message:
          "Cette demande est déjà refusée.",
      });
    }

    const [result] = await db.query(
      `
        UPDATE users
        SET
          status = 'rejected',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message:
          "Impossible de trouver cette demande.",
      });
    }

    return res.status(200).json({
      success: true,
      status: "rejected",
      message:
        "La demande a été refusée avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur refus demande :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de refuser cette demande.",
    });
  }
};

/* =========================================================
   SUPPRIMER UNE DEMANDE
========================================================= */

exports.deleteRegistrationRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      `
        SELECT
          id,
          email,
          status
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    /*
     * On détache d'abord le client éventuel afin
     * d'éviter une erreur de clé étrangère.
     */
    await db.query(
      `
        UPDATE clients
        SET user_id = NULL
        WHERE user_id = ?
      `,
      [id]
    );

    const [result] = await db.query(
      `
        DELETE FROM users
        WHERE id = ?
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message:
          "Impossible de supprimer cette demande.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "La demande a été supprimée avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur suppression demande :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de supprimer cette demande.",
    });
  }
};
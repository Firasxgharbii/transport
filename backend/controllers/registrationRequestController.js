const db = require("../config/db");

/* =========================================================
   CRÉER / SYNCHRONISER LE CLIENT D'UN UTILISATEUR

   Évite les doublons :
   - recherche d'abord avec user_id
   - puis avec email
========================================================= */

async function ensureClientForUser(user) {
  if (!user || !user.id) {
    throw new Error(
      "Utilisateur invalide pour la création du client."
    );
  }

  /* ---------------------------------------------------------
     1. Vérifier si un client existe déjà avec ce user_id
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
    return {
      clientId: existingByUserId[0].id,
      created: false,
    };
  }

  /* ---------------------------------------------------------
     2. Vérifier si le courriel existe déjà dans clients
  --------------------------------------------------------- */

  if (user.email) {
    const [existingByEmail] = await db.query(
      `
        SELECT
          id,
          user_id
        FROM clients
        WHERE email = ?
        LIMIT 1
      `,
      [user.email]
    );

    if (existingByEmail.length) {
      const existingClient =
        existingByEmail[0];

      /*
       * Le client existe déjà mais n'est pas encore
       * relié à cet utilisateur.
       */
      if (!existingClient.user_id) {
        await db.query(
          `
            UPDATE clients
            SET
              user_id = ?,
              first_name = COALESCE(NULLIF(?, ''), first_name),
              last_name = COALESCE(NULLIF(?, ''), last_name),
              phone = COALESCE(NULLIF(?, ''), phone),
              email = COALESCE(NULLIF(?, ''), email)
            WHERE id = ?
          `,
          [
            user.id,
            user.first_name || null,
            user.last_name || null,
            user.phone || null,
            user.email || null,
            existingClient.id,
          ]
        );
      }

      return {
        clientId: existingClient.id,
        created: false,
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
        NULL,
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
      user.first_name || "",
      user.last_name || "",
      user.phone || null,
      user.email || null,
      "Client créé automatiquement après approbation de l'inscription.",
    ]
  );

  return {
    clientId: result.insertId,
    created: true,
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

   IMPORTANT :
   Lors de l'approbation :
   1. user devient active
   2. client est créé automatiquement
   3. clients.user_id = users.id
========================================================= */

exports.approveRegistrationRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    /* -------------------------------------------------------
       Récupérer toutes les informations nécessaires
    ------------------------------------------------------- */

    const [users] = await db.query(
      `
        SELECT
          id,
          first_name,
          last_name,
          email,
          phone,
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
        message:
          "Utilisateur introuvable.",
      });
    }

    const user = users[0];

    /* -------------------------------------------------------
       Même s'il est déjà actif, on vérifie quand même
       qu'un client correspondant existe.

       C'est important pour tes anciens utilisateurs approuvés.
    ------------------------------------------------------- */

    if (user.status !== "active") {
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

    /* -------------------------------------------------------
       Créer ou relier automatiquement le client
    ------------------------------------------------------- */

    const clientResult =
      await ensureClientForUser(user);

    return res.status(200).json({
      success: true,
      status: "active",

      message:
        user.status === "active"
          ? "Utilisateur déjà approuvé. Le profil client a été vérifié et synchronisé."
          : "La demande a été approuvée et le client a été créé avec succès.",

      client: {
        id: clientResult.clientId,
        created: clientResult.created,
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
        process.env.NODE_ENV ===
        "development"
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
        message:
          "Utilisateur introuvable.",
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
        message:
          "Utilisateur introuvable.",
      });
    }

    /*
     * On détache d'abord le client éventuel.
     *
     * Cela évite une erreur de clé étrangère
     * si clients.user_id référence users.id.
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
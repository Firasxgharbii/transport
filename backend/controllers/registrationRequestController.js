const db = require("../config/db");

/* =========================================================
   RÉCUPÉRER TOUTES LES DEMANDES
========================================================= */

exports.getRegistrationRequests = async (req, res) => {
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

    if (user.status === "active") {
      return res.status(200).json({
        success: true,
        status: "active",
        message:
          "Cette demande est déjà approuvée.",
      });
    }

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

    return res.status(200).json({
      success: true,
      status: "active",
      message:
        "La demande a été approuvée avec succès.",
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
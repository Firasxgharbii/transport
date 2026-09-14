const ClientModel = require("../models/clientModel");

/* =========================================================
   HELPERS
========================================================= */

function getAuthenticatedUserId(req) {
  const value =
    req.user?.id ??
    req.user?.user_id ??
    req.user?.userId;

  const id = Number(value);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

function normalizePositiveId(value) {
  const id = Number(value);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

function cleanText(
  value,
  maxLength = 255
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const text = String(value).trim();

  if (text.length > maxLength) {
    throw new Error(
      `Valeur trop longue. Maximum ${maxLength} caractères.`
    );
  }

  return text || null;
}

function normalizeEmail(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return value === undefined
      ? undefined
      : null;
  }

  const email =
    String(value)
      .trim()
      .toLowerCase();

  if (email.length > 190) {
    throw new Error(
      "Adresse courriel trop longue."
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    throw new Error(
      "Adresse courriel invalide."
    );
  }

  return email;
}

/* =========================================================
   ADMIN / DISPATCHER
   RÉCUPÉRER TOUS LES CLIENTS
========================================================= */

exports.getClients = async (
  req,
  res
) => {
  try {
    const clients =
      await ClientModel.getAllClients();

    return res.status(200).json({
      success: true,
      message:
        "Liste des clients récupérée avec succès.",
      data: clients,
      clients,
    });
  } catch (error) {
    console.error(
      "Erreur getClients :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération des clients.",
    });
  }
};

/* =========================================================
   ADMIN / DISPATCHER
   RÉCUPÉRER UN CLIENT
========================================================= */

exports.getClient = async (
  req,
  res
) => {
  try {
    const clientId =
      normalizePositiveId(
        req.params.id
      );

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant client invalide.",
      });
    }

    const client =
      await ClientModel.getClientById(
        clientId
      );

    if (!client) {
      return res.status(404).json({
        success: false,
        message:
          "Client introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Client récupéré avec succès.",
      data: client,
      client,
    });
  } catch (error) {
    console.error(
      "Erreur getClient :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération du client.",
    });
  }
};

/* =========================================================
   ADMIN / DISPATCHER
   CRÉER UN CLIENT
========================================================= */

exports.createClient = async (
  req,
  res
) => {
  try {
    let firstName;
    let lastName;
    let phone;
    let email;

    try {
      firstName =
        cleanText(
          req.body?.first_name,
          100
        );

      lastName =
        cleanText(
          req.body?.last_name,
          100
        );

      phone =
        cleanText(
          req.body?.phone,
          30
        );

      email =
        normalizeEmail(
          req.body?.email
        );
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message:
          validationError.message,
      });
    }

    if (
      !firstName ||
      !lastName ||
      !phone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le prénom, le nom et le téléphone sont obligatoires.",
      });
    }

    let clientData;

    try {
      clientData = {
        company_id:
          req.body?.company_id ??
          null,

        user_id:
          req.body?.user_id ??
          null,

        first_name:
          firstName,

        last_name:
          lastName,

        company_name:
          cleanText(
            req.body?.company_name,
            150
          ) ?? null,

        phone,

        email:
          email ?? null,

        address:
          cleanText(
            req.body?.address,
            255
          ) ?? null,

        city:
          cleanText(
            req.body?.city,
            100
          ) ?? null,

        province:
          cleanText(
            req.body?.province,
            100
          ) ?? null,

        postal_code:
          cleanText(
            req.body?.postal_code,
            20
          ) ?? null,

        notes:
          cleanText(
            req.body?.notes,
            1000
          ) ?? null,
      };
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message:
          validationError.message,
      });
    }

    const clientId =
      await ClientModel.createClient(
        clientData
      );

    const client =
      await ClientModel.getClientById(
        clientId
      );

    return res.status(201).json({
      success: true,
      message:
        "Client créé avec succès.",
      data: client,
      client,
    });
  } catch (error) {
    console.error(
      "Erreur createClient :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la création du client.",
    });
  }
};

/* =========================================================
   ADMIN / DISPATCHER
   MODIFIER UN CLIENT
========================================================= */

exports.updateClient = async (
  req,
  res
) => {
  try {
    const clientId =
      normalizePositiveId(
        req.params.id
      );

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant client invalide.",
      });
    }

    const existingClient =
      await ClientModel.getClientById(
        clientId
      );

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        message:
          "Client introuvable.",
      });
    }

    let updateData;

    try {
      updateData = {
        first_name:
          cleanText(
            req.body?.first_name,
            100
          ),

        last_name:
          cleanText(
            req.body?.last_name,
            100
          ),

        company_name:
          cleanText(
            req.body?.company_name,
            150
          ),

        phone:
          cleanText(
            req.body?.phone,
            30
          ),

        email:
          normalizeEmail(
            req.body?.email
          ),

        address:
          cleanText(
            req.body?.address,
            255
          ),

        city:
          cleanText(
            req.body?.city,
            100
          ),

        province:
          cleanText(
            req.body?.province,
            100
          ),

        postal_code:
          cleanText(
            req.body?.postal_code,
            20
          ),

        notes:
          cleanText(
            req.body?.notes,
            1000
          ),
      };
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message:
          validationError.message,
      });
    }

    const result =
      await ClientModel.updateClient(
        clientId,
        updateData
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Client introuvable.",
      });
    }

    const updatedClient =
      await ClientModel.getClientById(
        clientId
      );

    return res.status(200).json({
      success: true,
      message:
        "Client modifié avec succès.",
      data: updatedClient,
      client: updatedClient,
    });
  } catch (error) {
    console.error(
      "Erreur updateClient :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la modification du client.",
    });
  }
};

/* =========================================================
   SUPER ADMIN
   SUPPRIMER UN CLIENT
========================================================= */

exports.deleteClient = async (
  req,
  res
) => {
  try {
    const clientId =
      normalizePositiveId(
        req.params.id
      );

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant client invalide.",
      });
    }

    const result =
      await ClientModel.deleteClient(
        clientId
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Client introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Client supprimé avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur deleteClient :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la suppression du client.",
    });
  }
};

/* =========================================================
   CLIENT CONNECTÉ
   RÉCUPÉRER SON PROPRE PROFIL
========================================================= */

exports.getMyProfile = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    const client =
      await ClientModel.getClientByUserId(
        userId
      );

    if (!client) {
      return res.status(404).json({
        success: false,
        message:
          "Profil client introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      data: client,
      client,
    });
  } catch (error) {
    console.error(
      "Erreur getMyProfile :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer le profil.",
    });
  }
};

/* =========================================================
   CLIENT CONNECTÉ
   MODIFIER SON PROPRE PROFIL
========================================================= */

exports.updateMyProfile = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    const client =
      await ClientModel.getClientByUserId(
        userId
      );

    if (!client) {
      return res.status(404).json({
        success: false,
        message:
          "Profil client introuvable.",
      });
    }

    let updateData;

    try {
      updateData = {
        first_name:
          cleanText(
            req.body?.first_name,
            100
          ),

        last_name:
          cleanText(
            req.body?.last_name,
            100
          ),

        company_name:
          cleanText(
            req.body?.company_name,
            150
          ),

        phone:
          cleanText(
            req.body?.phone,
            30
          ),

        address:
          cleanText(
            req.body?.address,
            255
          ),

        city:
          cleanText(
            req.body?.city,
            100
          ),

        province:
          cleanText(
            req.body?.province,
            100
          ),

        postal_code:
          cleanText(
            req.body?.postal_code,
            20
          ),
      };
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message:
          validationError.message,
      });
    }

    /*
     * SÉCURITÉ
     *
     * Le client ne peut pas choisir un client_id.
     * Son profil est déterminé par req.user.
     *
     * Il ne peut pas modifier ici :
     * - id
     * - user_id
     * - client_id
     * - company_id
     * - email
     * - role
     * - notes
     */

    await ClientModel.updateClient(
      client.id,
      updateData
    );

    const updatedClient =
      await ClientModel.getClientByUserId(
        userId
      );

    return res.status(200).json({
      success: true,
      message:
        "Profil enregistré avec succès.",
      data: updatedClient,
      client: updatedClient,
    });
  } catch (error) {
    console.error(
      "Erreur updateMyProfile :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de modifier le profil.",
    });
  }
};
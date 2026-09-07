const bcrypt = require("bcrypt");
const UserModel = require("../models/userModel");

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

const ALLOWED_ROLES = [
  "super_admin",
  "dispatcher",
  "driver",
  "client",
];

function normalizeAccountType(value) {
  return value === "company"
    ? "company"
    : "individual";
}

function normalizeCompanyName(accountType, value) {
  if (accountType !== "company") {
    return null;
  }

  const companyName =
    typeof value === "string"
      ? value.trim()
      : "";

  return companyName || null;
}

/* =========================================================
   RÉCUPÉRER TOUS LES UTILISATEURS
========================================================= */

exports.getUsers = async (req, res) => {
  try {
    const users =
      await UserModel.getAllUsers();

    return res.status(200).json({
      success: true,
      message:
        "Liste des utilisateurs récupérée avec succès.",
      users,
      data: users,
      total: users.length,
      refreshed_at:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Erreur getUsers :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération des utilisateurs.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

/* =========================================================
   RÉCUPÉRER UN UTILISATEUR
========================================================= */

exports.getUser = async (req, res) => {
  try {
    const userId =
      Number(req.params.id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant utilisateur invalide.",
      });
    }

    if (
      req.user.role !==
        "super_admin" &&
      req.user.id !== userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Accès refusé. Vous pouvez consulter uniquement votre propre profil.",
      });
    }

    const user =
      await UserModel.getUserById(
        userId
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Utilisateur récupéré avec succès.",
      user,
      data: user,
      refreshed_at:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Erreur getUser :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération de l'utilisateur.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

/* =========================================================
   CRÉER UN UTILISATEUR
========================================================= */

exports.createUser = async (req, res) => {
  try {
    if (
      req.user.role !==
        "super_admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Seul le super_admin peut créer un utilisateur depuis cette page.",
      });
    }

    const {
      first_name,
      last_name,
      email,
      phone = null,
      password,
      role_name = "client",
      status = "active",
      account_type = "individual",
      company_name = null,
      address = null,
      city = null,
      province = null,
      postal_code = null,
    } = req.body || {};

    if (
      !String(first_name || "").trim() ||
      !String(last_name || "").trim() ||
      !String(email || "").trim() ||
      !String(password || "")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Prénom, nom, courriel et mot de passe sont obligatoires.",
      });
    }

    if (
      String(password).length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le mot de passe doit contenir au moins 8 caractères.",
      });
    }

    if (
      !ALLOWED_ROLES.includes(
        role_name
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rôle utilisateur invalide.",
      });
    }

    if (
      !ALLOWED_STATUSES.includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Statut utilisateur invalide.",
      });
    }

    const normalizedAccountType =
      normalizeAccountType(
        account_type
      );

    if (
      account_type &&
      !ALLOWED_ACCOUNT_TYPES.includes(
        account_type
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Type de compte invalide.",
      });
    }

    const normalizedCompanyName =
      normalizeCompanyName(
        normalizedAccountType,
        company_name
      );

    if (
      normalizedAccountType ===
        "company" &&
      !normalizedCompanyName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le nom de l'entreprise est obligatoire pour un compte Entreprise.",
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    if (
      await UserModel.emailExists(
        normalizedEmail
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Cette adresse courriel est déjà utilisée.",
      });
    }

    const role =
      await UserModel.getRoleByName(
        role_name
      );

    if (!role) {
      return res.status(400).json({
        success: false,
        message:
          "Rôle introuvable.",
      });
    }

    const passwordHash =
      await bcrypt.hash(
        String(password),
        12
      );

    const userId =
      await UserModel.createUser({
        roleId: role.id,
        firstName:
          String(first_name).trim(),
        lastName:
          String(last_name).trim(),
        email: normalizedEmail,
        phone:
          String(phone || "").trim() ||
          null,
        passwordHash,
        status,
        accountType:
          normalizedAccountType,
        companyName:
          normalizedCompanyName,
        address,
        city,
        province,
        postalCode:
          postal_code,
      });

    const user =
      await UserModel.getUserById(
        userId
      );

    return res.status(201).json({
      success: true,
      message:
        "Utilisateur créé avec succès.",
      user,
      data: user,
    });
  } catch (error) {
    console.error(
      "Erreur createUser :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la création de l'utilisateur.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

/* =========================================================
   MODIFIER UN UTILISATEUR
========================================================= */

exports.updateUser = async (req, res) => {
  try {
    const userId =
      Number(req.params.id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant utilisateur invalide.",
      });
    }

    const isSuperAdmin =
      req.user.role ===
      "super_admin";

    if (
      !isSuperAdmin &&
      req.user.id !== userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Accès refusé. Vous pouvez modifier uniquement votre propre profil.",
      });
    }

    const currentUser =
      await UserModel.getUserById(
        userId
      );

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable.",
      });
    }

    const data = {
      ...req.body,
    };

    if (
      data.status !== undefined &&
      !ALLOWED_STATUSES.includes(
        data.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Statut invalide.",
      });
    }

    if (
      data.account_type !== undefined &&
      !ALLOWED_ACCOUNT_TYPES.includes(
        data.account_type
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Type de compte invalide.",
      });
    }

    if (
      data.role_name !== undefined &&
      !ALLOWED_ROLES.includes(
        data.role_name
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rôle utilisateur invalide.",
      });
    }

    if (
      !isSuperAdmin &&
      (
        data.status !== undefined ||
        data.role_name !== undefined
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Seul le super_admin peut modifier le rôle ou le statut.",
      });
    }

    const accountType =
      data.account_type !==
      undefined
        ? normalizeAccountType(
            data.account_type
          )
        : normalizeAccountType(
            currentUser.account_type
          );

    data.account_type =
      accountType;

    if (
      data.company_name !==
        undefined ||
      data.account_type !==
        undefined
    ) {
      data.company_name =
        normalizeCompanyName(
          accountType,
          data.company_name !==
            undefined
            ? data.company_name
            : currentUser.company_name
        );

      if (
        accountType === "company" &&
        !data.company_name
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Le nom de l'entreprise est obligatoire pour un compte Entreprise.",
        });
      }
    }

    if (
      data.email !== undefined
    ) {
      const normalizedEmail =
        String(data.email || "")
          .trim()
          .toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message:
            "Le courriel ne peut pas être vide.",
        });
      }

      const emailOwner =
        await UserModel.getUserByEmail(
          normalizedEmail
        );

      if (
        emailOwner &&
        Number(emailOwner.id) !==
          userId
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Cette adresse courriel est déjà utilisée.",
        });
      }

      data.email =
        normalizedEmail;
    }

    if (
      data.role_name !== undefined
    ) {
      const role =
        await UserModel.getRoleByName(
          data.role_name
        );

      if (!role) {
        return res.status(400).json({
          success: false,
          message:
            "Rôle introuvable.",
        });
      }

      data.role_id = role.id;
    }

    if (
      data.password
    ) {
      if (
        String(data.password).length <
        8
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Le mot de passe doit contenir au moins 8 caractères.",
        });
      }

      data.password_hash =
        await bcrypt.hash(
          String(data.password),
          12
        );
    }

    const result =
      await UserModel.updateUser(
        userId,
        data
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable.",
      });
    }

    const updatedUser =
      await UserModel.getUserById(
        userId
      );

    return res.status(200).json({
      success: true,
      message:
        "Utilisateur modifié avec succès.",
      user: updatedUser,
      data: updatedUser,
      refreshed_at:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Erreur updateUser :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la modification de l'utilisateur.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

/* =========================================================
   SUPPRIMER UN UTILISATEUR
========================================================= */

exports.deleteUser = async (req, res) => {
  try {
    const userId =
      Number(req.params.id);

    if (
      req.user.id === userId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Vous ne pouvez pas supprimer votre propre compte administrateur.",
      });
    }

    const result =
      await UserModel.deleteUser(
        userId
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Utilisateur supprimé avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur deleteUser :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la suppression de l'utilisateur.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const db = require("../config/db");
const { transporter } = require("../config/mailer");

/* =====================================================
   CONFIGURATION
===================================================== */

const PASSWORD_MIN_LENGTH = 8;

const INTERNAL_ROLES = [
  "super_admin",
  "dispatcher",
  "driver",
];

/* =====================================================
   NORMALISER UN TEXTE
===================================================== */

const normalizeText = (value) => {
  return String(value || "").trim();
};

/* =====================================================
   NORMALISER UN EMAIL
===================================================== */

const normalizeEmail = (email) => {
  return String(email || "")
    .trim()
    .toLowerCase();
};

/* =====================================================
   VALIDER UNE ADRESSE EMAIL
===================================================== */

const isValidEmail = (email) => {
  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailPattern.test(email);
};

/* =====================================================
   VALIDER UN MOT DE PASSE
===================================================== */

const validatePassword = (password) => {
  if (typeof password !== "string") {
    return "Le mot de passe est invalide.";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }

  if (!/[A-Z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une majuscule.";
  }

  if (!/[a-z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une minuscule.";
  }

  if (!/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins un caractère spécial.";
  }

  return null;
};

/* =====================================================
   GÉNÉRER UN TOKEN JWT
===================================================== */

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "La variable JWT_SECRET est manquante dans le fichier .env."
    );
  }

  return jwt.sign(
    {
      id: user.id,
      role: user.role_name,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
      issuer: "glory-solutions",
      audience: "transport-platform",
    }
  );
};

/* =====================================================
   RETIRER LES DONNÉES SENSIBLES
===================================================== */

const sanitizeUser = (user) => {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone || null,
    status: user.status,
    role: user.role_name || user.role,
  };
};

/* =====================================================
   INSCRIPTION PUBLIQUE D’UN CLIENT
   POST /api/auth/client-register
===================================================== */

exports.registerClient = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      company_name,
    } = req.body;

    const normalizedFirstName =
      normalizeText(first_name);

    const normalizedLastName =
      normalizeText(last_name);

    const normalizedEmail =
      normalizeEmail(email);

    const normalizedPhone =
      normalizeText(phone) || null;

    const normalizedCompanyName =
      normalizeText(company_name) || null;

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedEmail ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message:
          "Le prénom, le nom, le courriel et le mot de passe sont obligatoires.",
      });
    }

    if (
      normalizedFirstName.length < 2 ||
      normalizedLastName.length < 2
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_NAME",
        message:
          "Le prénom et le nom doivent contenir au moins deux caractères.",
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message:
          "Veuillez entrer une adresse courriel valide.",
      });
    }

    const passwordError =
      validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        code: "WEAK_PASSWORD",
        message: passwordError,
      });
    }

    const [existingUsers] = await db.query(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `,
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_EXISTS",
        message:
          "Un compte existe déjà avec cette adresse courriel.",
      });
    }

    const [roleRows] = await db.query(
      `
        SELECT id
        FROM roles
        WHERE name = 'client'
        LIMIT 1
      `
    );

    if (roleRows.length === 0) {
      return res.status(500).json({
        success: false,
        code: "CLIENT_ROLE_NOT_FOUND",
        message:
          "Le rôle client n’existe pas dans la base de données.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

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
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `,
      [
        roleRows[0].id,
        normalizedFirstName,
        normalizedLastName,
        normalizedEmail,
        normalizedPhone,
        hashedPassword,
      ]
    );

    console.log(
      "Nouvelle demande d’inscription :",
      {
        userId: result.insertId,
        email: normalizedEmail,
        companyName: normalizedCompanyName,
      }
    );

    return res.status(201).json({
      success: true,
      code: "ACCOUNT_PENDING_APPROVAL",
      message:
        "Votre demande a été envoyée. Votre compte doit maintenant être approuvé par Glory Solutions.",
      data: {
        userId: result.insertId,
        email: normalizedEmail,
        companyName: normalizedCompanyName,
        accountStatus: "pending",
      },
    });
  } catch (error) {
    console.error(
      "Erreur registerClient :",
      error
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_EXISTS",
        message:
          "Un compte existe déjà avec cette adresse courriel.",
      });
    }

    return res.status(500).json({
      success: false,
      code: "REGISTER_CLIENT_ERROR",
      message:
        "Une erreur est survenue pendant la création du compte.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/* =====================================================
   CRÉER UN UTILISATEUR INTERNE
   POST /api/auth/register
===================================================== */

exports.register = async (req, res) => {
  try {
    if (
      !req.user ||
      req.user.role !== "super_admin"
    ) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message:
          "Seul le Super Admin peut créer un utilisateur interne.",
      });
    }

    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      role_name,
    } = req.body;

    const normalizedFirstName =
      normalizeText(first_name);

    const normalizedLastName =
      normalizeText(last_name);

    const normalizedEmail =
      normalizeEmail(email);

    const normalizedPhone =
      normalizeText(phone) || null;

    const normalizedRole =
      normalizeText(role_name);

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedEmail ||
      !password ||
      !normalizedRole
    ) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message:
          "Tous les champs obligatoires sont requis.",
      });
    }

    if (
      !INTERNAL_ROLES.includes(
        normalizedRole
      )
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ROLE",
        message:
          "Le rôle sélectionné est invalide.",
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message:
          "Veuillez entrer une adresse courriel valide.",
      });
    }

    const passwordError =
      validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        code: "WEAK_PASSWORD",
        message: passwordError,
      });
    }

    const [existingUsers] = await db.query(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `,
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_EXISTS",
        message:
          "Un compte existe déjà avec cette adresse courriel.",
      });
    }

    const [roleRows] = await db.query(
      `
        SELECT id
        FROM roles
        WHERE name = ?
        LIMIT 1
      `,
      [normalizedRole]
    );

    if (roleRows.length === 0) {
      return res.status(400).json({
        success: false,
        code: "ROLE_NOT_FOUND",
        message:
          "Le rôle demandé n’existe pas.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

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
        VALUES (?, ?, ?, ?, ?, ?, 'active')
      `,
      [
        roleRows[0].id,
        normalizedFirstName,
        normalizedLastName,
        normalizedEmail,
        normalizedPhone,
        hashedPassword,
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        "L’utilisateur interne a été créé avec succès.",
      data: {
        userId: result.insertId,
        email: normalizedEmail,
        role: normalizedRole,
        status: "active",
      },
    });
  } catch (error) {
    console.error("Erreur register :", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_EXISTS",
        message:
          "Un compte existe déjà avec cette adresse courriel.",
      });
    }

    return res.status(500).json({
      success: false,
      code: "REGISTER_ERROR",
      message:
        "Une erreur est survenue pendant la création de l’utilisateur.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/* =====================================================
   CONNEXION
   POST /api/auth/login
===================================================== */

exports.login = async (req, res) => {
  try {
    const email =
      normalizeEmail(req.body.email);

    const password =
      String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message:
          "Le courriel et le mot de passe sont obligatoires.",
      });
    }

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

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message:
          "Adresse courriel ou mot de passe incorrect.",
      });
    }

    const user = rows[0];

    const isPasswordValid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message:
          "Adresse courriel ou mot de passe incorrect.",
      });
    }

    switch (user.status) {
      case "pending":
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_PENDING_APPROVAL",
          message:
            "Votre compte est en attente d’approbation par Glory Solutions.",
        });

      case "rejected":
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_REJECTED",
          message:
            "Votre demande d’inscription n’a pas été approuvée.",
        });

      case "suspended":
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_SUSPENDED",
          message:
            "Votre compte est temporairement suspendu.",
        });

      case "inactive":
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_INACTIVE",
          message:
            "Votre compte est actuellement inactif.",
        });

      case "active":
        break;

      default:
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_NOT_ACTIVE",
          message:
            "Votre compte n’est pas actif.",
        });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Connexion réussie.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Erreur login :", error);

    return res.status(500).json({
      success: false,
      code: "LOGIN_ERROR",
      message:
        "Une erreur est survenue pendant la connexion.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/* =====================================================
   UTILISATEUR CONNECTÉ
   GET /api/auth/me
===================================================== */

exports.me = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message:
          "Utilisateur non authentifié.",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          users.id,
          users.first_name,
          users.last_name,
          users.email,
          users.phone,
          users.status,
          users.created_at,
          users.updated_at,
          roles.name AS role
        FROM users
        INNER JOIN roles
          ON users.role_id = roles.id
        WHERE users.id = ?
        LIMIT 1
      `,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message:
          "Utilisateur introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      user: rows[0],
    });
  } catch (error) {
    console.error("Erreur me :", error);

    return res.status(500).json({
      success: false,
      code: "ME_ERROR",
      message:
        "Impossible de récupérer les informations du compte.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/* =====================================================
   MOT DE PASSE OUBLIÉ
   POST /api/auth/forgot-password
===================================================== */

exports.forgotPassword = async (req, res) => {
  try {
    const email =
      normalizeEmail(req.body.email);

    const genericMessage =
      "Si un compte correspond à cette adresse, un courriel de réinitialisation sera envoyé.";

    if (!email) {
      return res.status(400).json({
        success: false,
        code: "EMAIL_REQUIRED",
        message:
          "L’adresse courriel est obligatoire.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message:
          "Veuillez entrer une adresse courriel valide.",
      });
    }

    const [rows] = await db.query(
      `
        SELECT
          id,
          first_name,
          last_name,
          email,
          status
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `,
      [email]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    const user = rows[0];

    if (user.status !== "active") {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    const rawToken = crypto
      .randomBytes(32)
      .toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    /*
      CORRECTION :
      MySQL calcule directement l’expiration.
      Cela évite les problèmes de fuseau horaire.
    */

    await db.query(
      `
        UPDATE users
        SET
          reset_password_token = ?,
          reset_password_expires =
            DATE_ADD(NOW(), INTERVAL 30 MINUTE),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        hashedToken,
        user.id,
      ]
    );

    const frontendUrl = (
      process.env.FRONTEND_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");

    const resetUrl =
      `${frontendUrl}/reset-password?token=${encodeURIComponent(
        rawToken
      )}`;

    await transporter.sendMail({
      from: {
        name:
          process.env.MAIL_FROM_NAME ||
          "Glory Solutions",

        address:
          process.env.MAIL_FROM_EMAIL ||
          process.env.SMTP_USER,
      },

      to: user.email,

      subject:
        "Réinitialisation de votre mot de passe – Glory Solutions",

      text: `
Bonjour ${user.first_name},

Une demande de réinitialisation de votre mot de passe a été reçue.

Cliquez sur le lien suivant dans les 30 prochaines minutes :

${resetUrl}

Si vous n’avez pas demandé cette modification, ignorez ce courriel.

Glory Solutions
      `.trim(),

      html: `
        <div
          style="
            margin: 0;
            padding: 32px 16px;
            background: #f5f6f8;
            font-family: Arial, sans-serif;
            color: #17191f;
          "
        >
          <div
            style="
              max-width: 560px;
              margin: auto;
              overflow: hidden;
              border: 1px solid #e5e7ec;
              border-radius: 18px;
              background: #ffffff;
            "
          >
            <div
              style="
                padding: 25px 30px;
                background: #11131d;
                color: #ffffff;
              "
            >
              <h1
                style="
                  margin: 0;
                  font-size: 22px;
                "
              >
                Glory Solutions
              </h1>
            </div>

            <div
              style="
                padding: 32px 30px;
              "
            >
              <p style="margin-top: 0;">
                Bonjour ${user.first_name},
              </p>

              <h2
                style="
                  margin: 16px 0;
                  font-size: 25px;
                "
              >
                Réinitialisation du mot de passe
              </h2>

              <p
                style="
                  color: #6f727c;
                  line-height: 1.7;
                "
              >
                Nous avons reçu une demande de
                réinitialisation pour votre compte
                Glory Solutions.
              </p>

              <a
                href="${resetUrl}"
                style="
                  display: inline-block;
                  margin: 18px 0;
                  padding: 15px 24px;
                  border-radius: 12px;
                  background: #dc143c;
                  color: #ffffff;
                  font-weight: 700;
                  text-decoration: none;
                "
              >
                Créer un nouveau mot de passe
              </a>

              <p
                style="
                  color: #6f727c;
                  line-height: 1.7;
                "
              >
                Ce lien expirera dans 30 minutes.
              </p>

              <p
                style="
                  color: #6f727c;
                  line-height: 1.7;
                "
              >
                Si vous n’avez pas demandé cette
                modification, vous pouvez ignorer ce
                courriel.
              </p>
            </div>

            <div
              style="
                padding: 20px 30px;
                border-top: 1px solid #e5e7ec;
                color: #9698a1;
                font-size: 12px;
              "
            >
              © ${new Date().getFullYear()}
              Glory Solutions
            </div>
          </div>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error(
      "Erreur forgotPassword :",
      error
    );

    return res.status(500).json({
      success: false,
      code: "FORGOT_PASSWORD_ERROR",
      message:
        "Impossible d’envoyer le courriel de réinitialisation.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/* =====================================================
   RÉINITIALISER LE MOT DE PASSE
   POST /api/auth/reset-password
===================================================== */

exports.resetPassword = async (req, res) => {
  try {
    const token =
      normalizeText(req.body.token);

    const password =
      String(req.body.password || "");

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message:
          "Le lien et le nouveau mot de passe sont obligatoires.",
      });
    }

    const passwordError =
      validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        code: "WEAK_PASSWORD",
        message: passwordError,
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    /*
      MySQL vérifie lui-même l’expiration.
    */

    const [rows] = await db.query(
      `
        SELECT
          id,
          email,
          reset_password_expires
        FROM users
        WHERE reset_password_token = ?
          AND reset_password_expires IS NOT NULL
          AND reset_password_expires > NOW()
        LIMIT 1
      `,
      [hashedToken]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        code: "INVALID_OR_EXPIRED_TOKEN",
        message:
          "Le lien de réinitialisation est invalide ou expiré.",
      });
    }

    const userId = rows[0].id;

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    const [updateResult] = await db.query(
      `
        UPDATE users
        SET
          password = ?,
          reset_password_token = NULL,
          reset_password_expires = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        hashedPassword,
        userId,
      ]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        code: "PASSWORD_NOT_UPDATED",
        message:
          "Le mot de passe n’a pas pu être modifié.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Votre mot de passe a été réinitialisé avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur resetPassword :",
      error
    );

    return res.status(500).json({
      success: false,
      code: "RESET_PASSWORD_ERROR",
      message:
        "Impossible de réinitialiser le mot de passe.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};
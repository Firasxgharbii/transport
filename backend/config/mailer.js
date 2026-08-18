const nodemailer = require("nodemailer");

/* =========================================================
   VARIABLES D'ENVIRONNEMENT REQUISES
========================================================= */

const requiredEnvironmentVariables = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "MAIL_FROM_EMAIL",
];

/* =========================================================
   VÉRIFICATION DES VARIABLES
========================================================= */

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    console.warn(
      `⚠️ Variable d’environnement manquante : ${variableName}`
    );
  }
}

/* =========================================================
   CONFIGURATION SMTP
========================================================= */

const smtpHost =
  process.env.SMTP_HOST ||
  "smtp.hostinger.com";

const smtpPort =
  Number(process.env.SMTP_PORT) ||
  465;

const smtpSecure =
  process.env.SMTP_SECURE !== undefined
    ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
    : smtpPort === 465;

/* =========================================================
   TRANSPORTER NODEMAILER
========================================================= */

const transporter = nodemailer.createTransport({
  host: smtpHost,

  port: smtpPort,

  secure: smtpSecure,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },

  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,

  pool: false,
});

/* =========================================================
   ADRESSE D'ENVOI PAR DÉFAUT
========================================================= */

const defaultFromEmail =
  process.env.MAIL_FROM_EMAIL ||
  process.env.SMTP_USER;

const defaultFromName =
  process.env.MAIL_FROM_NAME ||
  "Glory Solutions";

/* =========================================================
   VÉRIFICATION DE LA CONNEXION SMTP
========================================================= */

const verifyMailerConnection = async () => {
  try {
    await transporter.verify();

    console.log(
      `✅ Service courriel connecté avec succès : ${smtpHost}:${smtpPort}`
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Impossible de connecter le service courriel :",
      error?.message || error
    );

    return false;
  }
};

/* =========================================================
   FONCTION D'ENVOI GÉNÉRIQUE
========================================================= */

const sendMail = async ({
  to,
  subject,
  html,
  text,
  replyTo,
  cc,
  bcc,
}) => {
  if (!to) {
    throw new Error(
      "L’adresse du destinataire est obligatoire."
    );
  }

  if (!subject) {
    throw new Error(
      "Le sujet du courriel est obligatoire."
    );
  }

  try {
    const info =
      await transporter.sendMail({
        from: `"${defaultFromName}" <${defaultFromEmail}>`,

        to,

        subject,

        html,

        text,

        replyTo,

        cc,

        bcc,
      });

    console.log(
      `✅ Courriel envoyé avec succès : ${info.messageId}`
    );

    return info;
  } catch (error) {
    console.error(
      "❌ Erreur lors de l’envoi du courriel :",
      error?.message || error
    );

    throw error;
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  transporter,
  verifyMailerConnection,
  sendMail,
};
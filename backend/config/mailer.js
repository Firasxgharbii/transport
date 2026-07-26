const nodemailer = require("nodemailer");

const requiredEnvironmentVariables = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "MAIL_FROM_EMAIL",
];

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    console.warn(
      `⚠️ Variable d’environnement manquante : ${variableName}`
    );
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: String(process.env.SMTP_SECURE) === "true",

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },

  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

const verifyMailerConnection = async () => {
  try {
    await transporter.verify();

    console.log(
      "✅ Service courriel Gmail connecté avec succès."
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Impossible de connecter le service courriel :",
      error.message
    );

    return false;
  }
};

module.exports = {
  transporter,
  verifyMailerConnection,
};
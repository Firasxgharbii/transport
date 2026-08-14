const nodemailer =
  require("nodemailer");

/* =========================================================
   TRANSPORT SMTP
========================================================= */

const transporter =
  nodemailer.createTransport({
    host:
      process.env.SMTP_HOST,

    port:
      Number(
        process.env.SMTP_PORT ||
          465
      ),

    secure: true,

    auth: {
      user:
        process.env.SMTP_USER,

      pass:
        process.env.SMTP_PASSWORD,
    },
  });

/* =========================================================
   SEND CONTACT
========================================================= */

const sendContactMessage =
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        company,
        message,
      } = req.body;

      /* ===================================================
         VALIDATION
      =================================================== */

      if (
        !name ||
        !email ||
        !message
      ) {
        return res.status(400).json({
          error:
            "Le nom, l’adresse courriel et le message sont obligatoires.",
        });
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(email)
      ) {
        return res.status(400).json({
          error:
            "Veuillez entrer une adresse courriel valide.",
        });
      }

      /* ===================================================
         CHECK ENV
      =================================================== */

      if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASSWORD
      ) {
        console.error(
          "❌ Configuration SMTP manquante"
        );

        return res
          .status(500)
          .json({
            error:
              "Configuration SMTP manquante.",
          });
      }

      /* ===================================================
         SEND
      =================================================== */

      const info =
        await transporter.sendMail({
          from:
            `"Glory Solutions" <${process.env.SMTP_USER}>`,

          to:
            process.env.CONTACT_EMAIL ||
            process.env.SMTP_USER,

          replyTo:
            email,

          subject:
            `Nouvelle demande Glory Solutions - ${name}`,

          text: `
NOUVEAU MESSAGE GLORY SOLUTIONS

Nom : ${name}

Email : ${email}

Téléphone :
${phone || "Non fourni"}

Entreprise :
${company || "Non fournie"}

Message :

${message}
          `.trim(),

          html: `
<!DOCTYPE html>

<html lang="fr">

<head>
<meta charset="UTF-8">
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f5f5;
    font-family:Arial,Helvetica,sans-serif;
  "
>

<table
  width="100%"
  cellspacing="0"
  cellpadding="0"
  style="
    padding:40px 15px;
    background:#f5f5f5;
  "
>

<tr>

<td align="center">

<table
  width="620"
  cellspacing="0"
  cellpadding="0"
  style="
    width:100%;
    max-width:620px;
    background:#ffffff;
  "
>

<tr>

<td
  style="
    padding:30px;
    background:#dc143c;
    color:#ffffff;
  "
>

<h1
  style="
    margin:0;
    font-size:28px;
  "
>
GLORY SOLUTIONS
</h1>

<p
  style="
    margin:8px 0 0;
    opacity:.85;
  "
>
Nouveau message depuis le site web
</p>

</td>

</tr>

<tr>

<td
  style="
    padding:35px;
    color:#333333;
  "
>

<h2
  style="
    color:#171717;
  "
>
Nouvelle demande
</h2>

<p>
<strong>Nom :</strong><br>
${escapeHtml(name)}
</p>

<p>
<strong>Courriel :</strong><br>
${escapeHtml(email)}
</p>

<p>
<strong>Téléphone :</strong><br>
${
  phone
    ? escapeHtml(phone)
    : "Non fourni"
}
</p>

<p>
<strong>Entreprise :</strong><br>
${
  company
    ? escapeHtml(company)
    : "Non fournie"
}
</p>

<hr
  style="
    margin:30px 0;
    border:0;
    border-top:1px solid #dddddd;
  "
>

<p>
<strong>Message :</strong>
</p>

<p
  style="
    white-space:pre-wrap;
    line-height:1.7;
  "
>
${escapeHtml(message)}
</p>

</td>

</tr>

<tr>

<td
  style="
    padding:20px 35px;
    background:#171717;
    color:#999999;
    font-size:12px;
  "
>
Glory Solutions
<br>
glorysolutions.ca
</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>
          `,
        });

      console.log(
        "✅ Email envoyé :",
        info.messageId
      );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Votre message a été envoyé avec succès.",
        });
    } catch (error) {
      console.error(
        "❌ Erreur SMTP :",
        error
      );

      return res
        .status(500)
        .json({
          error:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : "Impossible d’envoyer le message.",
        });
    }
  };

/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
  value = ""
) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  sendContactMessage,
};
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const company = String(body.company || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        {
          error:
            "Le nom, l’adresse courriel et le message sont obligatoires.",
        },
        {
          status: 400,
        }
      );
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error:
            "Veuillez entrer une adresse courriel valide.",
        },
        {
          status: 400,
        }
      );
    }

    const smtpHost =
      process.env.SMTP_HOST;

    const smtpPort =
      Number(process.env.SMTP_PORT || 465);

    const smtpUser =
      process.env.SMTP_USER;

    const smtpPassword =
      process.env.SMTP_PASSWORD;

    const contactEmail =
      process.env.CONTACT_EMAIL;

    if (
      !smtpHost ||
      !smtpUser ||
      !smtpPassword ||
      !contactEmail
    ) {
      console.error(
        "Variables SMTP manquantes."
      );

      return NextResponse.json(
        {
          error:
            "Le service de courriel n’est pas configuré.",
        },
        {
          status: 500,
        }
      );
    }

    const transporter =
      nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,

        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

    await transporter.sendMail({
      from:
        `"Glory Solutions" <${smtpUser}>`,

      to: contactEmail,

      replyTo: email,

      subject:
        `Nouvelle demande - ${name}`,

      text: `
NOUVEAU MESSAGE - GLORY SOLUTIONS

Nom :
${name}

E-mail :
${email}

Téléphone :
${phone || "Non fourni"}

Entreprise :
${company || "Non fournie"}

Message :
${message}
      `.trim(),

      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            background:#f5f5f5;
            padding:40px 20px;
          "
        >
          <div
            style="
              max-width:650px;
              margin:auto;
              background:#ffffff;
              border-radius:4px;
              overflow:hidden;
            "
          >

            <div
              style="
                background:#dc143c;
                padding:30px;
                color:#ffffff;
              "
            >
              <h1 style="margin:0;">
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
            </div>

            <div
              style="
                padding:35px;
                color:#333333;
              "
            >

              <h2>
                Nouvelle demande
              </h2>

              <p>
                <strong>Nom :</strong><br>
                ${escapeHtml(name)}
              </p>

              <p>
                <strong>E-mail :</strong><br>
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
                  border:0;
                  border-top:1px solid #dddddd;
                  margin:30px 0;
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

            </div>

            <div
              style="
                background:#171717;
                color:#999999;
                padding:18px 35px;
                font-size:12px;
              "
            >
              Message envoyé depuis
              glorysolutions.ca
            </div>

          </div>
        </div>
      `,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Votre message a été envoyé avec succès.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Erreur API contact :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible d’envoyer le message.",
      },
      {
        status: 500,
      }
    );
  }
}

function escapeHtml(
  value: string
) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
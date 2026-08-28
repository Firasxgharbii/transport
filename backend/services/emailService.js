const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    return null;
  }

  const port = Number(
    process.env.SMTP_PORT || 465,
  );

  transporter =
    nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,

      auth: {
        user:
          process.env.SMTP_USER,

        pass:
          process.env.SMTP_PASSWORD,
      },
    });

  return transporter;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendNotificationEmail({
  to,
  title,
  message,
  level = "info",
  actionUrl = null,
}) {
  if (!to) {
    return {
      sent: false,
      skipped: true,
      error:
        "Adresse email absente.",
    };
  }

  const smtp = getTransporter();

  if (!smtp) {
    return {
      sent: false,
      skipped: true,
      error:
        "SMTP non configuré.",
    };
  }

  const frontendUrl =
    process.env.FRONTEND_URL ||
    "https://glorysolutions.ca";

  const finalActionUrl =
    actionUrl
      ? actionUrl.startsWith("http")
        ? actionUrl
        : `${frontendUrl}${actionUrl}`
      : null;

  const levelLabel = {
    info: "Information",
    success: "Confirmation",
    warning: "Attention",
    urgent: "Urgent",
  }[level] || "Notification";

  try {
    const info =
      await smtp.sendMail({
        from:
          process.env.EMAIL_FROM ||
          process.env.SMTP_USER,

        to,

        subject:
          `[Glory Solutions] ${title}`,

        text: [
          `${levelLabel} — ${title}`,
          "",
          message,
          "",
          finalActionUrl
            ? `Voir : ${finalActionUrl}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),

        html: `
          <div style="
            margin:0;
            padding:32px;
            background:#f5f5f7;
            font-family:Arial,Helvetica,sans-serif;
            color:#18181d;
          ">
            <div style="
              max-width:620px;
              margin:0 auto;
              overflow:hidden;
              border:1px solid #e7e7eb;
              border-radius:18px;
              background:#ffffff;
            ">
              <div style="
                padding:22px 24px;
                background:#111015;
                color:#ffffff;
              ">
                <div style="
                  font-size:18px;
                  font-weight:900;
                ">
                  GLORY
                  <span style="color:#dc143c;">
                    SOLUTIONS
                  </span>
                </div>

                <div style="
                  margin-top:5px;
                  color:#bdbdc5;
                  font-size:11px;
                  letter-spacing:.08em;
                  text-transform:uppercase;
                ">
                  ${escapeHtml(levelLabel)}
                </div>
              </div>

              <div style="padding:28px 24px;">
                <h1 style="
                  margin:0 0 12px;
                  font-size:22px;
                ">
                  ${escapeHtml(title)}
                </h1>

                <p style="
                  margin:0;
                  color:#666772;
                  font-size:14px;
                  line-height:1.7;
                ">
                  ${escapeHtml(message)}
                </p>

                ${
                  finalActionUrl
                    ? `
                      <a
                        href="${escapeHtml(finalActionUrl)}"
                        style="
                          display:inline-block;
                          margin-top:22px;
                          padding:12px 18px;
                          border-radius:10px;
                          background:#dc143c;
                          color:#ffffff;
                          font-size:12px;
                          font-weight:800;
                          text-decoration:none;
                        "
                      >
                        Ouvrir dans Glory Solutions
                      </a>
                    `
                    : ""
                }
              </div>

              <div style="
                padding:14px 24px;
                border-top:1px solid #ededf0;
                color:#999aa3;
                font-size:10px;
              ">
                Glory Solutions — notification automatique
              </div>
            </div>
          </div>
        `,
      });

    return {
      sent: true,
      messageId:
        info.messageId || null,
    };
  } catch (error) {
    console.error(
      "❌ Email notification :",
      error,
    );

    return {
      sent: false,
      error:
        error.message ||
        "Erreur SMTP.",
    };
  }
}

module.exports = {
  sendNotificationEmail,
};
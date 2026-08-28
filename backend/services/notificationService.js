const db = require("../config/db");
const NotificationModel = require(
  "../models/notificationModel"
);
const {
  sendNotificationEmail,
} = require("./emailService");

async function resolveUserEmail(
  userId,
) {
  if (!userId) {
    return null;
  }

  try {
    const [rows] = await db.query(
      `
        SELECT email
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [userId],
    );

    return rows[0]?.email || null;
  } catch (error) {
    console.error(
      "Erreur resolveUserEmail :",
      error.message,
    );

    return null;
  }
}

async function resolveAdminEmails() {
  const emails = new Set();

  if (process.env.ADMIN_EMAIL) {
    emails.add(
      process.env.ADMIN_EMAIL,
    );
  }

  try {
    const [rows] = await db.query(`
      SELECT DISTINCT u.email
      FROM users u
      LEFT JOIN roles r
        ON r.id = u.role_id
      WHERE
        u.email IS NOT NULL
        AND u.email <> ''
        AND (
          r.name IN (
            'super_admin',
            'dispatcher'
          )
          OR u.role IN (
            'super_admin',
            'dispatcher'
          )
        )
    `);

    for (const row of rows) {
      if (row.email) {
        emails.add(row.email);
      }
    }
  } catch (error) {
    /*
     * Certains schémas ne possèdent pas
     * users.role. ADMIN_EMAIL reste le fallback.
     */
    console.warn(
      "⚠️ Résolution emails admins :",
      error.message,
    );
  }

  return [...emails];
}

function emitNotification(
  io,
  notification,
) {
  if (!io || !notification) {
    return;
  }

  if (notification.user_id) {
    io.to(
      `user:${notification.user_id}`,
    ).emit(
      "notification:new",
      notification,
    );
  }

  if (
    notification.audience_role
  ) {
    io.to(
      `role:${notification.audience_role}`,
    ).emit(
      "notification:new",
      notification,
    );
  }

  if (
    notification.audience_role ===
    "admin"
  ) {
    io.to(
      "notifications:admin",
    ).emit(
      "notification:new",
      notification,
    );
  }
}

async function createNotification({
  io = null,

  userId = null,
  audienceRole = null,

  type = "general",
  level = "info",

  title,
  message,

  entityType = null,
  entityId = null,
  actionUrl = null,

  email = false,
  emailTo = null,
}) {
  if (!title || !message) {
    throw new Error(
      "title et message sont requis.",
    );
  }

  const notification =
    await NotificationModel.create({
      userId,
      audienceRole,
      type,
      level,
      title,
      message,
      entityType,
      entityId,
      actionUrl,
    });

  emitNotification(
    io,
    notification,
  );

  if (!email) {
    return notification;
  }

  let recipients = [];

  if (emailTo) {
    recipients = Array.isArray(
      emailTo,
    )
      ? emailTo
      : [emailTo];
  } else if (userId) {
    const userEmail =
      await resolveUserEmail(
        userId,
      );

    if (userEmail) {
      recipients.push(
        userEmail,
      );
    }
  } else if (
    audienceRole === "admin"
  ) {
    recipients =
      await resolveAdminEmails();
  }

  recipients = [
    ...new Set(
      recipients.filter(Boolean),
    ),
  ];

  if (!recipients.length) {
    await NotificationModel.setEmailResult(
      notification.id,
      {
        sent: false,
        error:
          "Aucun destinataire email.",
      },
    );

    return notification;
  }

  const results =
    await Promise.allSettled(
      recipients.map((to) =>
        sendNotificationEmail({
          to,
          title,
          message,
          level,
          actionUrl,
        }),
      ),
    );

  const successful =
    results.filter(
      (result) =>
        result.status ===
          "fulfilled" &&
        result.value?.sent,
    );

  const errors =
    results
      .map((result) => {
        if (
          result.status ===
          "rejected"
        ) {
          return String(
            result.reason?.message ||
              result.reason,
          );
        }

        if (
          !result.value?.sent
        ) {
          return (
            result.value?.error ||
            "Email non envoyé."
          );
        }

        return null;
      })
      .filter(Boolean)
      .join(" | ");

  await NotificationModel.setEmailResult(
    notification.id,
    {
      sent:
        successful.length > 0,

      error:
        errors || null,
    },
  );

  return notification;
}

async function notifyAdmin(payload) {
  return createNotification({
    ...payload,
    audienceRole: "admin",
  });
}

async function notifyUser(
  userId,
  payload,
) {
  return createNotification({
    ...payload,
    userId,
  });
}

module.exports = {
  createNotification,
  notifyAdmin,
  notifyUser,
  emitNotification,
};
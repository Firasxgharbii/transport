const db = require("../config/db");

const NotificationModel = {
  async ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

        user_id BIGINT NULL,
        audience_role VARCHAR(50) NULL,

        type VARCHAR(80) NOT NULL DEFAULT 'general',
        level ENUM(
          'info',
          'success',
          'warning',
          'urgent'
        ) NOT NULL DEFAULT 'info',

        title VARCHAR(180) NOT NULL,
        message TEXT NOT NULL,

        entity_type VARCHAR(80) NULL,
        entity_id BIGINT NULL,

        action_url VARCHAR(500) NULL,

        is_read TINYINT(1) NOT NULL DEFAULT 0,
        read_at DATETIME NULL,

        email_sent TINYINT(1) NOT NULL DEFAULT 0,
        email_error VARCHAR(500) NULL,

        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL
          DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,

        PRIMARY KEY (id),

        INDEX idx_notifications_user_read (
          user_id,
          is_read,
          created_at
        ),

        INDEX idx_notifications_role_read (
          audience_role,
          is_read,
          created_at
        ),

        INDEX idx_notifications_entity (
          entity_type,
          entity_id
        )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
    `);
  },

  async create(payload) {
    const {
      userId = null,
      audienceRole = null,
      type = "general",
      level = "info",
      title,
      message,
      entityType = null,
      entityId = null,
      actionUrl = null,
    } = payload;

    const [result] = await db.query(
      `
        INSERT INTO notifications (
          user_id,
          audience_role,
          type,
          level,
          title,
          message,
          entity_type,
          entity_id,
          action_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        audienceRole,
        type,
        level,
        title,
        message,
        entityType,
        entityId,
        actionUrl,
      ],
    );

    return this.findById(
      result.insertId,
    );
  },

  async findById(id) {
    const [rows] = await db.query(
      `
        SELECT
          id,
          user_id,
          audience_role,
          type,
          level,
          title,
          message,
          entity_type,
          entity_id,
          action_url,
          is_read,
          read_at,
          email_sent,
          email_error,
          created_at,
          updated_at
        FROM notifications
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  },

  async listForUser({
    userId,
    role,
    limit = 50,
    offset = 0,
    unreadOnly = false,
  }) {
    const params = [
      userId,
      role || "",
    ];

    let where = `
      (
        user_id = ?
        OR (
          user_id IS NULL
          AND audience_role = ?
        )
      )
    `;

    if (
      role === "super_admin" ||
      role === "dispatcher"
    ) {
      where = `
        (
          user_id = ?
          OR (
            user_id IS NULL
            AND (
              audience_role = ?
              OR audience_role = 'admin'
            )
          )
        )
      `;
    }

    if (unreadOnly) {
      where += `
        AND is_read = 0
      `;
    }

    const safeLimit = Math.min(
      Math.max(Number(limit) || 50, 1),
      100,
    );

    const safeOffset = Math.max(
      Number(offset) || 0,
      0,
    );

    const [rows] = await db.query(
      `
        SELECT
          id,
          user_id,
          audience_role,
          type,
          level,
          title,
          message,
          entity_type,
          entity_id,
          action_url,
          is_read,
          read_at,
          email_sent,
          created_at
        FROM notifications
        WHERE ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        OFFSET ?
      `,
      [
        ...params,
        safeLimit,
        safeOffset,
      ],
    );

    return rows;
  },

  async unreadCount({
    userId,
    role,
  }) {
    const params = [
      userId,
      role || "",
    ];

    let roleClause = `
      audience_role = ?
    `;

    if (
      role === "super_admin" ||
      role === "dispatcher"
    ) {
      roleClause = `
        (
          audience_role = ?
          OR audience_role = 'admin'
        )
      `;
    }

    const [rows] = await db.query(
      `
        SELECT
          COUNT(*) AS unread_count
        FROM notifications
        WHERE
          is_read = 0
          AND (
            user_id = ?
            OR (
              user_id IS NULL
              AND ${roleClause}
            )
          )
      `,
      params,
    );

    return Number(
      rows[0]?.unread_count || 0,
    );
  },

  async markRead({
    id,
    userId,
    role,
  }) {
    const roleValues =
      role === "super_admin" ||
      role === "dispatcher"
        ? [role || "", "admin"]
        : [role || ""];

    const rolePlaceholders =
      roleValues.map(() => "?").join(",");

    const [result] = await db.query(
      `
        UPDATE notifications
        SET
          is_read = 1,
          read_at = COALESCE(
            read_at,
            NOW()
          )
        WHERE
          id = ?
          AND (
            user_id = ?
            OR (
              user_id IS NULL
              AND audience_role IN (
                ${rolePlaceholders}
              )
            )
          )
      `,
      [
        id,
        userId,
        ...roleValues,
      ],
    );

    return result.affectedRows > 0;
  },

  async markAllRead({
    userId,
    role,
  }) {
    const roleValues =
      role === "super_admin" ||
      role === "dispatcher"
        ? [role || "", "admin"]
        : [role || ""];

    const rolePlaceholders =
      roleValues.map(() => "?").join(",");

    const [result] = await db.query(
      `
        UPDATE notifications
        SET
          is_read = 1,
          read_at = COALESCE(
            read_at,
            NOW()
          )
        WHERE
          is_read = 0
          AND (
            user_id = ?
            OR (
              user_id IS NULL
              AND audience_role IN (
                ${rolePlaceholders}
              )
            )
          )
      `,
      [
        userId,
        ...roleValues,
      ],
    );

    return result.affectedRows;
  },

  async setEmailResult(
    id,
    {
      sent,
      error = null,
    },
  ) {
    await db.query(
      `
        UPDATE notifications
        SET
          email_sent = ?,
          email_error = ?
        WHERE id = ?
      `,
      [
        sent ? 1 : 0,
        error,
        id,
      ],
    );
  },
};

module.exports = NotificationModel;
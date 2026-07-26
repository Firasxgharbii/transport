const db = require("../config/db");

const DashboardModel = {
  /* =====================================================
     STATISTIQUES GÉNÉRALES
  ===================================================== */

  async getStats() {
    const [userStatsRows] = await db.query(`
      SELECT
        COUNT(*) AS total_users,

        SUM(
          CASE
            WHEN status = 'active' THEN 1
            ELSE 0
          END
        ) AS active_users,

        SUM(
          CASE
            WHEN status = 'pending' THEN 1
            ELSE 0
          END
        ) AS pending_users,

        SUM(
          CASE
            WHEN status = 'rejected' THEN 1
            ELSE 0
          END
        ) AS rejected_users,

        SUM(
          CASE
            WHEN status = 'suspended' THEN 1
            ELSE 0
          END
        ) AS suspended_users,

        SUM(
          CASE
            WHEN status = 'inactive' THEN 1
            ELSE 0
          END
        ) AS inactive_users
      FROM users
    `);

    const [roleStatsRows] = await db.query(`
      SELECT
        SUM(
          CASE
            WHEN roles.name = 'client' THEN 1
            ELSE 0
          END
        ) AS total_clients,

        SUM(
          CASE
            WHEN roles.name = 'driver' THEN 1
            ELSE 0
          END
        ) AS total_drivers,

        SUM(
          CASE
            WHEN roles.name = 'dispatcher' THEN 1
            ELSE 0
          END
        ) AS total_dispatchers,

        SUM(
          CASE
            WHEN roles.name = 'super_admin' THEN 1
            ELSE 0
          END
        ) AS total_admins
      FROM users
      INNER JOIN roles
        ON users.role_id = roles.id
    `);

    const [companyStatsRows] = await db.query(`
      SELECT COUNT(*) AS total_companies
      FROM companies
    `);

    const [orderStatsRows] = await db.query(`
      SELECT
        COUNT(*) AS total_orders,

        SUM(
          CASE
            WHEN status = 'pending' THEN 1
            ELSE 0
          END
        ) AS pending_orders,

        SUM(
          CASE
            WHEN status = 'assigned' THEN 1
            ELSE 0
          END
        ) AS assigned_orders,

        SUM(
          CASE
            WHEN status IN (
              'pickup_in_progress',
              'picked_up',
              'delivery_in_progress',
              'arrived'
            )
            THEN 1
            ELSE 0
          END
        ) AS active_orders,

        SUM(
          CASE
            WHEN status = 'completed' THEN 1
            ELSE 0
          END
        ) AS completed_orders,

        SUM(
          CASE
            WHEN status = 'cancelled' THEN 1
            ELSE 0
          END
        ) AS cancelled_orders,

        SUM(
          CASE
            WHEN status = 'incident' THEN 1
            ELSE 0
          END
        ) AS incident_orders
      FROM orders
    `);

    const [paymentStatsRows] = await db.query(`
      SELECT
        COUNT(*) AS total_payments,

        SUM(
          CASE
            WHEN status = 'paid' THEN 1
            ELSE 0
          END
        ) AS paid_payments,

        SUM(
          CASE
            WHEN status = 'pending' THEN 1
            ELSE 0
          END
        ) AS pending_payments,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'paid'
              THEN amount
              ELSE 0
            END
          ),
          0
        ) AS total_revenue
      FROM payments
    `);

    const [invoiceStatsRows] = await db.query(`
      SELECT
        COUNT(*) AS total_invoices
      FROM invoices
    `);

    return {
      users: userStatsRows[0],
      roles: roleStatsRows[0],
      companies: companyStatsRows[0],
      orders: orderStatsRows[0],
      payments: paymentStatsRows[0],
      invoices: invoiceStatsRows[0],
    };
  },

  /* =====================================================
     DERNIERS UTILISATEURS
  ===================================================== */

  async getRecentUsers(limit = 5) {
    const normalizedLimit = Number(limit);

    const safeLimit =
      Number.isInteger(normalizedLimit) &&
      normalizedLimit > 0 &&
      normalizedLimit <= 20
        ? normalizedLimit
        : 5;

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
          roles.name AS role
        FROM users
        INNER JOIN roles
          ON users.role_id = roles.id
        ORDER BY users.created_at DESC
        LIMIT ?
      `,
      [safeLimit]
    );

    return rows;
  },

  /* =====================================================
     UTILISATEURS EN ATTENTE
  ===================================================== */

  async getPendingUsers(limit = 6) {
    const normalizedLimit = Number(limit);

    const safeLimit =
      Number.isInteger(normalizedLimit) &&
      normalizedLimit > 0 &&
      normalizedLimit <= 50
        ? normalizedLimit
        : 6;

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
          roles.name AS role
        FROM users
        INNER JOIN roles
          ON users.role_id = roles.id
        WHERE users.status = 'pending'
        ORDER BY users.created_at DESC
        LIMIT ?
      `,
      [safeLimit]
    );

    return rows;
  },

  /* =====================================================
     DERNIÈRES COMMANDES
  ===================================================== */

  async getRecentOrders(limit = 6) {
    const normalizedLimit = Number(limit);

    const safeLimit =
      Number.isInteger(normalizedLimit) &&
      normalizedLimit > 0 &&
      normalizedLimit <= 20
        ? normalizedLimit
        : 6;

    const [rows] = await db.query(
      `
        SELECT
          orders.id,
          orders.order_number,
          orders.status,
          orders.pickup_address,
          orders.delivery_address,
          orders.created_at,
          orders.updated_at
        FROM orders
        ORDER BY orders.created_at DESC
        LIMIT ?
      `,
      [safeLimit]
    );

    return rows;
  },

  /* =====================================================
     COMMANDES DES 7 DERNIERS JOURS
  ===================================================== */

  async getWeeklyOrders() {
    const [rows] = await db.query(`
      SELECT
        DATE(created_at) AS order_date,
        COUNT(*) AS total
      FROM orders
      WHERE created_at >= CURDATE() - INTERVAL 6 DAY
      GROUP BY DATE(created_at)
      ORDER BY order_date ASC
    `);

    return rows;
  },
};

module.exports = DashboardModel;
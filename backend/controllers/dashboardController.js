const DashboardModel = require(
  "../models/dashboardModel"
);

/* =====================================================
   CONVERTIR UNE VALEUR EN NOMBRE
===================================================== */

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

/* =====================================================
   STATISTIQUES PRINCIPALES
===================================================== */

exports.getStats = async (req, res) => {
  try {
    const stats =
      await DashboardModel.getStats();

    const userStats = stats.users || {};
    const roleStats = stats.roles || {};
    const companyStats =
      stats.companies || {};
    const orderStats = stats.orders || {};
    const paymentStats =
      stats.payments || {};
    const invoiceStats =
      stats.invoices || {};

    return res.status(200).json({
      success: true,
      message:
        "Statistiques du dashboard récupérées avec succès.",

      data: {
        users: {
          total: toNumber(
            userStats.total_users
          ),

          active: toNumber(
            userStats.active_users
          ),

          pending: toNumber(
            userStats.pending_users
          ),

          rejected: toNumber(
            userStats.rejected_users
          ),

          suspended: toNumber(
            userStats.suspended_users
          ),

          inactive: toNumber(
            userStats.inactive_users
          ),
        },

        roles: {
          clients: toNumber(
            roleStats.total_clients
          ),

          drivers: toNumber(
            roleStats.total_drivers
          ),

          dispatchers: toNumber(
            roleStats.total_dispatchers
          ),

          admins: toNumber(
            roleStats.total_admins
          ),
        },

        companies: {
          total: toNumber(
            companyStats.total_companies
          ),
        },

        orders: {
          total: toNumber(
            orderStats.total_orders
          ),

          pending: toNumber(
            orderStats.pending_orders
          ),

          assigned: toNumber(
            orderStats.assigned_orders
          ),

          active: toNumber(
            orderStats.active_orders
          ),

          completed: toNumber(
            orderStats.completed_orders
          ),

          cancelled: toNumber(
            orderStats.cancelled_orders
          ),

          incidents: toNumber(
            orderStats.incident_orders
          ),
        },

        payments: {
          total: toNumber(
            paymentStats.total_payments
          ),

          paid: toNumber(
            paymentStats.paid_payments
          ),

          pending: toNumber(
            paymentStats.pending_payments
          ),

          revenue: toNumber(
            paymentStats.total_revenue
          ),
        },

        invoices: {
          total: toNumber(
            invoiceStats.total_invoices
          ),
        },
      },
    });
  } catch (error) {
    console.error(
      "Erreur getStats dashboard :",
      error
    );

    return res.status(500).json({
      success: false,
      code: "DASHBOARD_STATS_ERROR",
      message:
        "Impossible de récupérer les statistiques du dashboard.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

/* =====================================================
   VUE D’ENSEMBLE COMPLÈTE
===================================================== */

exports.getOverview = async (req, res) => {
  try {
    const [
      stats,
      recentUsers,
      pendingUsers,
      recentOrders,
      weeklyOrders,
    ] = await Promise.all([
      DashboardModel.getStats(),
      DashboardModel.getRecentUsers(5),
      DashboardModel.getPendingUsers(6),
      DashboardModel.getRecentOrders(6),
      DashboardModel.getWeeklyOrders(),
    ]);

    const userStats = stats.users || {};
    const roleStats = stats.roles || {};
    const companyStats =
      stats.companies || {};
    const orderStats = stats.orders || {};
    const paymentStats =
      stats.payments || {};
    const invoiceStats =
      stats.invoices || {};

    return res.status(200).json({
      success: true,
      message:
        "Vue d’ensemble récupérée avec succès.",

      data: {
        stats: {
          users: {
            total: toNumber(
              userStats.total_users
            ),

            active: toNumber(
              userStats.active_users
            ),

            pending: toNumber(
              userStats.pending_users
            ),

            rejected: toNumber(
              userStats.rejected_users
            ),

            suspended: toNumber(
              userStats.suspended_users
            ),

            inactive: toNumber(
              userStats.inactive_users
            ),
          },

          roles: {
            clients: toNumber(
              roleStats.total_clients
            ),

            drivers: toNumber(
              roleStats.total_drivers
            ),

            dispatchers: toNumber(
              roleStats.total_dispatchers
            ),

            admins: toNumber(
              roleStats.total_admins
            ),
          },

          companies: {
            total: toNumber(
              companyStats.total_companies
            ),
          },

          orders: {
            total: toNumber(
              orderStats.total_orders
            ),

            pending: toNumber(
              orderStats.pending_orders
            ),

            assigned: toNumber(
              orderStats.assigned_orders
            ),

            active: toNumber(
              orderStats.active_orders
            ),

            completed: toNumber(
              orderStats.completed_orders
            ),

            cancelled: toNumber(
              orderStats.cancelled_orders
            ),

            incidents: toNumber(
              orderStats.incident_orders
            ),
          },

          payments: {
            total: toNumber(
              paymentStats.total_payments
            ),

            paid: toNumber(
              paymentStats.paid_payments
            ),

            pending: toNumber(
              paymentStats.pending_payments
            ),

            revenue: toNumber(
              paymentStats.total_revenue
            ),
          },

          invoices: {
            total: toNumber(
              invoiceStats.total_invoices
            ),
          },
        },

        recentUsers,
        pendingUsers,
        recentOrders,

        weeklyOrders: weeklyOrders.map(
          (item) => ({
            date: item.order_date,
            total: toNumber(item.total),
          })
        ),
      },
    });
  } catch (error) {
    console.error(
      "Erreur getOverview dashboard :",
      error
    );

    return res.status(500).json({
      success: false,
      code: "DASHBOARD_OVERVIEW_ERROR",
      message:
        "Impossible de récupérer la vue d’ensemble du dashboard.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};
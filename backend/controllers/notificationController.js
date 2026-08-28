const NotificationModel = require(
  "../models/notificationModel"
);

function currentUser(req) {
  return {
    id:
      req.user?.id ||
      req.user?.user_id ||
      req.user?.sub ||
      null,

    role:
      req.user?.role ||
      req.user?.role_name ||
      null,
  };
}

exports.getNotifications =
  async (req, res) => {
    try {
      const user =
        currentUser(req);

      if (!user.id) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Utilisateur non authentifié.",
          });
      }

      const notifications =
        await NotificationModel.listForUser({
          userId: user.id,
          role: user.role,

          limit:
            req.query.limit,

          offset:
            req.query.offset,

          unreadOnly:
            String(
              req.query.unreadOnly ||
                "false",
            ) === "true",
        });

      const unreadCount =
        await NotificationModel.unreadCount({
          userId: user.id,
          role: user.role,
        });

      return res
        .status(200)
        .json({
          success: true,

          data:
            notifications,

          notifications,

          unreadCount,
        });
    } catch (error) {
      console.error(
        "getNotifications :",
        error,
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Impossible de récupérer les notifications.",
        });
    }
  };

exports.getUnreadCount =
  async (req, res) => {
    try {
      const user =
        currentUser(req);

      if (!user.id) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Utilisateur non authentifié.",
          });
      }

      const unreadCount =
        await NotificationModel.unreadCount({
          userId: user.id,
          role: user.role,
        });

      return res
        .status(200)
        .json({
          success: true,
          unreadCount,
        });
    } catch (error) {
      console.error(
        "getUnreadCount :",
        error,
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Impossible de récupérer le compteur.",
        });
    }
  };

exports.markAsRead =
  async (req, res) => {
    try {
      const user =
        currentUser(req);

      const id =
        Number(req.params.id);

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Notification invalide.",
          });
      }

      const updated =
        await NotificationModel.markRead({
          id,
          userId: user.id,
          role: user.role,
        });

      if (!updated) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Notification introuvable.",
          });
      }

      const unreadCount =
        await NotificationModel.unreadCount({
          userId: user.id,
          role: user.role,
        });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Notification marquée comme lue.",
          unreadCount,
        });
    } catch (error) {
      console.error(
        "markAsRead :",
        error,
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Impossible de modifier la notification.",
        });
    }
  };

exports.markAllAsRead =
  async (req, res) => {
    try {
      const user =
        currentUser(req);

      const updated =
        await NotificationModel.markAllRead({
          userId: user.id,
          role: user.role,
        });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Toutes les notifications ont été marquées comme lues.",
          updated,
          unreadCount: 0,
        });
    } catch (error) {
      console.error(
        "markAllAsRead :",
        error,
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Impossible de modifier les notifications.",
        });
    }
  };
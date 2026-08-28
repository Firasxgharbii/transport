const express = require("express");

const router = express.Router();

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const notificationController = require(
  "../controllers/notificationController"
);

/* ============================================================
   Toutes les routes sont protégées
============================================================ */

router.use(
  authMiddleware
);

/* ============================================================
   GET /api/notifications
============================================================ */

router.get(
  "/",
  notificationController.getNotifications
);

/* ============================================================
   GET /api/notifications/unread-count
============================================================ */

router.get(
  "/unread-count",
  notificationController.getUnreadCount
);

/* ============================================================
   PATCH /api/notifications/read-all
   IMPORTANT : avant "/:id/read"
============================================================ */

router.patch(
  "/read-all",
  notificationController.markAllAsRead
);

/* ============================================================
   PATCH /api/notifications/:id/read
============================================================ */

router.patch(
  "/:id/read",
  notificationController.markAsRead
);

module.exports = router;
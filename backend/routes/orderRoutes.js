const express = require("express");

const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  assignDriver,
  updateOrderStatus,
} = require("../controllers/orderController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

/* Toutes les routes Orders nécessitent une connexion */
router.use(authMiddleware);

/* ============================================================
   LISTER TOUTES LES COMMANDES
============================================================ */

router.get(
  "/",
  roleMiddleware("super_admin", "dispatcher"),
  getAllOrders
);

/* ============================================================
   CRÉER UNE COMMANDE
============================================================ */

router.post(
  "/",
  roleMiddleware("super_admin", "dispatcher"),
  createOrder
);

/* ============================================================
   ASSIGNER UN CHAUFFEUR
============================================================ */

router.patch(
  "/:id/assign-driver",
  roleMiddleware("super_admin", "dispatcher"),
  assignDriver
);

/* ============================================================
   MODIFIER LE STATUT
============================================================ */

router.patch(
  "/:id/status",
  roleMiddleware("super_admin", "dispatcher", "driver"),
  updateOrderStatus
);

/* ============================================================
   RÉCUPÉRER UNE COMMANDE
============================================================ */

router.get(
  "/:id",
  roleMiddleware("super_admin", "dispatcher", "driver", "client"),
  getOrderById
);

/* ============================================================
   MODIFIER UNE COMMANDE
============================================================ */

router.put(
  "/:id",
  roleMiddleware("super_admin", "dispatcher"),
  updateOrder
);

/* ============================================================
   SUPPRIMER UNE COMMANDE
============================================================ */

router.delete(
  "/:id",
  roleMiddleware("super_admin"),
  deleteOrder
);

module.exports = router;
const express = require("express");

const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,

  assignDriver,
  assignVehicle,

  updateOrderStatus,

  getDriverOrders,

  getOrderStops,
  addOrderStop,
  updateOrderStop,
  deleteOrderStop,

  getOrderTimeline,

  getDeliveryProofs,
  createDeliveryProof,

  // Bons de livraison
  getAllDeliveryNotes,
  getDeliveryNoteByOrderId,
} = require("../controllers/orderController");

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const roleMiddleware = require(
  "../middleware/roleMiddleware"
);

const router = express.Router();

/* ============================================================
   AUTHENTIFICATION
============================================================ */

router.use(authMiddleware);

/* ============================================================
   BONS DE LIVRAISON

   IMPORTANT :
   Ces routes doivent rester AVANT "/:id".
============================================================ */

// Tous les bons de livraison
// Admin / Dispatcher
router.get(
  "/delivery-notes",
  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),
  getAllDeliveryNotes
);

// Un bon de livraison précis
// Accessible également au chauffeur et au client
router.get(
  "/delivery-notes/:id",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver",
    "client"
  ),
  getDeliveryNoteByOrderId
);

/* ============================================================
   COMMANDES D'UN CHAUFFEUR
============================================================ */

router.get(
  "/driver/:driverId",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),
  getDriverOrders
);

/* ============================================================
   LISTER TOUTES LES COMMANDES
============================================================ */

router.get(
  "/",
  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),
  getAllOrders
);

/* ============================================================
   CRÉER UNE COMMANDE
============================================================ */

router.post(
  "/",
  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),
  createOrder
);

/* ============================================================
   ASSIGNER UN CHAUFFEUR
============================================================ */

router.patch(
  "/:id/assign-driver",
  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),
  assignDriver
);

/* ============================================================
   ASSIGNER UN VÉHICULE
============================================================ */

router.patch(
  "/:id/assign-vehicle",
  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),
  assignVehicle
);

/* ============================================================
   MODIFIER LE STATUT D'UNE COMMANDE
============================================================ */

router.patch(
  "/:id/status",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),
  updateOrderStatus
);

/* ============================================================
   ARRÊTS D'UNE COMMANDE
============================================================ */

// Récupérer les arrêts
router.get(
  "/:id/stops",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver",
    "client"
  ),
  getOrderStops
);

// Ajouter un arrêt
router.post(
  "/:id/stops",
  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),
  addOrderStop
);

// Modifier un arrêt
router.put(
  "/stops/:stopId",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),
  updateOrderStop
);

// Supprimer un arrêt
router.delete(
  "/stops/:stopId",
  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),
  deleteOrderStop
);

/* ============================================================
   PREUVES DE LIVRAISON
============================================================ */

// Récupérer les preuves
router.get(
  "/:id/proofs",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver",
    "client"
  ),
  getDeliveryProofs
);

// Ajouter une preuve
router.post(
  "/:id/proofs",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),
  createDeliveryProof
);

/* ============================================================
   HISTORIQUE DES STATUTS
============================================================ */

router.get(
  "/:id/timeline",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver",
    "client"
  ),
  getOrderTimeline
);

/* ============================================================
   RÉCUPÉRER UNE COMMANDE PAR ID
============================================================ */

router.get(
  "/:id",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver",
    "client"
  ),
  getOrderById
);

/* ============================================================
   MODIFIER UNE COMMANDE
============================================================ */

router.put(
  "/:id",
  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),
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

/* ============================================================
   EXPORT
============================================================ */

module.exports = router;
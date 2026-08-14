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

   Toutes les routes ci-dessous nécessitent un utilisateur
   authentifié.
============================================================ */

router.use(authMiddleware);

/* ============================================================
   COMMANDES D’UN CHAUFFEUR

   Cette route est placée avant les routes avec /:id pour
   garder une organisation claire.
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
   MODIFIER LE STATUT D’UNE COMMANDE
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
   RÉCUPÉRER LES ARRÊTS D’UNE COMMANDE
============================================================ */

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

/* ============================================================
   AJOUTER UN ARRÊT À UNE COMMANDE
============================================================ */

router.post(
  "/:id/stops",
  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),
  addOrderStop
);

/* ============================================================
   MODIFIER UN ARRÊT

   stopId correspond à l’identifiant dans order_stops.
============================================================ */

router.put(
  "/stops/:stopId",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),
  updateOrderStop
);

/* ============================================================
   SUPPRIMER UN ARRÊT
============================================================ */

router.delete(
  "/stops/:stopId",
  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),
  deleteOrderStop
);

/* ============================================================
   RÉCUPÉRER LES PREUVES DE LIVRAISON
============================================================ */

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

/* ============================================================
   AJOUTER UNE PREUVE DE LIVRAISON

   Peut contenir :
   - photo
   - signature
   - code de confirmation
   - document
============================================================ */

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

module.exports = router;
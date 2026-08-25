const express = require("express");

const trackingController = require(
  "../controllers/trackingController"
);

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
   ENREGISTRER UNE POSITION GPS

   Accessible au chauffeur, dispatcher et super admin.
   Le chauffeur enverra sa position depuis son téléphone.
============================================================ */

router.post(
  "/location",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),
  trackingController.createLocation
);

/* ============================================================
   DERNIÈRES POSITIONS DE TOUS LES CHAUFFEURS

   Utilisé principalement par la carte admin / dispatcher.
============================================================ */

router.get(
  "/drivers",
  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),
  trackingController.getLatestLocations
);

/* ============================================================
   DERNIÈRE POSITION D'UN CHAUFFEUR
============================================================ */

router.get(
  "/drivers/:driverId/latest",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),
  trackingController.getLatestDriverLocation
);

/* ============================================================
   HISTORIQUE GPS D'UN CHAUFFEUR

   Exemple :
   GET /api/tracking/drivers/1/history
   GET /api/tracking/drivers/1/history?limit=200
============================================================ */

router.get(
  "/drivers/:driverId/history",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),
  trackingController.getDriverLocationHistory
);

/* ============================================================
   DERNIÈRE POSITION ASSOCIÉE À UNE COMMANDE
============================================================ */

router.get(
  "/orders/:orderId/latest",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver",
    "client"
  ),
  trackingController.getLatestOrderLocation
);

/* ============================================================
   HISTORIQUE GPS D'UNE COMMANDE

   Exemple :
   GET /api/tracking/orders/15/history
   GET /api/tracking/orders/15/history?limit=500
============================================================ */

router.get(
  "/orders/:orderId/history",
  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver",
    "client"
  ),
  trackingController.getOrderLocationHistory
);

/* ============================================================
   NETTOYAGE DES ANCIENNES POSITIONS GPS

   Exemple :
   DELETE /api/tracking/cleanup?days=30

   Réservé au super admin.
============================================================ */

router.delete(
  "/cleanup",
  roleMiddleware("super_admin"),
  trackingController.deleteOldLocations
);

/* ============================================================
   EXPORT
============================================================ */

module.exports = router;
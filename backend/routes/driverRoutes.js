const express = require("express");

const router = express.Router();

const driverController = require(
  "../controllers/driverController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const roleMiddleware = require(
  "../middleware/roleMiddleware"
);

/* =========================================================
   RÉCUPÉRER LE CHAUFFEUR CONNECTÉ
   GET /api/drivers/me
========================================================= */

router.get(
  "/me",

  authMiddleware,

  roleMiddleware("driver"),

  driverController.getCurrentDriver
);

/* =========================================================
   RÉCUPÉRER LES COMMANDES D'UN CHAUFFEUR
   GET /api/drivers/:id/orders
========================================================= */

router.get(
  "/:id/orders",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),

  driverController.getDriverOrders
);

/* =========================================================
   RÉCUPÉRER LE VÉHICULE D'UN CHAUFFEUR
   GET /api/drivers/:id/vehicle
========================================================= */

router.get(
  "/:id/vehicle",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),

  driverController.getDriverVehicle
);

/* =========================================================
   ASSIGNER UN VÉHICULE À UN CHAUFFEUR
   PUT /api/drivers/:id/vehicle
========================================================= */

router.put(
  "/:id/vehicle",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  driverController.assignVehicle
);

/* =========================================================
   DÉSAFFECTER LE VÉHICULE D'UN CHAUFFEUR
   DELETE /api/drivers/:id/vehicle
========================================================= */

router.delete(
  "/:id/vehicle",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  driverController.unassignVehicle
);

/* =========================================================
   RÉCUPÉRER TOUS LES CHAUFFEURS
   GET /api/drivers
========================================================= */

router.get(
  "/",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  driverController.getDrivers
);

/* =========================================================
   RÉCUPÉRER UN CHAUFFEUR
   GET /api/drivers/:id
========================================================= */

router.get(
  "/:id",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  driverController.getDriver
);

/* =========================================================
   CRÉER UN CHAUFFEUR
   POST /api/drivers
========================================================= */

router.post(
  "/",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  driverController.createDriver
);

/* =========================================================
   MODIFIER UN CHAUFFEUR
   PUT /api/drivers/:id
========================================================= */

router.put(
  "/:id",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  driverController.updateDriver
);

/* =========================================================
   SUPPRIMER UN CHAUFFEUR
   DELETE /api/drivers/:id
========================================================= */

router.delete(
  "/:id",

  authMiddleware,

  roleMiddleware("super_admin"),

  driverController.deleteDriver
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;
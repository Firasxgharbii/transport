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
   RÉCUPÉRER TOUS LES CHAUFFEURS
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
========================================================= */

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("super_admin"),
  driverController.deleteDriver
);

module.exports = router;
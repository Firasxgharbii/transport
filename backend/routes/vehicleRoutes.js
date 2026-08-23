const express = require("express");

const router = express.Router();

const vehicleController = require("../controllers/vehicleController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

/* =====================================================
   GET - RÉCUPÉRER TOUS LES VÉHICULES
===================================================== */

router.get(
  "/",
  authMiddleware,
  roleMiddleware("super_admin", "dispatcher"),
  vehicleController.getVehicles
);

/* =====================================================
   GET - RÉCUPÉRER UN VÉHICULE
===================================================== */

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("super_admin", "dispatcher"),
  vehicleController.getVehicle
);

/* =====================================================
   POST - CRÉER UN VÉHICULE
===================================================== */

router.post(
  "/",
  authMiddleware,
  roleMiddleware("super_admin", "dispatcher"),
  vehicleController.createVehicle
);

/* =====================================================
   PUT - MODIFIER UN VÉHICULE
===================================================== */

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("super_admin", "dispatcher"),
  vehicleController.updateVehicle
);

/* =====================================================
   DELETE - SUPPRIMER UN VÉHICULE
===================================================== */

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("super_admin"),
  vehicleController.deleteVehicle
);

module.exports = router;
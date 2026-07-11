const express = require("express");
const router = express.Router();

const driverController = require("../controllers/driverController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get(
  "/",
  authMiddleware,
  roleMiddleware("super_admin", "dispatcher"),
  driverController.getDrivers
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("super_admin", "dispatcher"),
  driverController.getDriver
);

router.post(
  "/",
  authMiddleware,
  roleMiddleware("super_admin", "dispatcher"),
  driverController.createDriver
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("super_admin", "dispatcher"),
  driverController.updateDriver
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("super_admin"),
  driverController.deleteDriver
);

module.exports = router;
const express = require("express");
const router = express.Router();

const clientController = require("../controllers/clientController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get(
  "/",
  authMiddleware,
  roleMiddleware("super_admin", "dispatcher"),
  clientController.getClients
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("super_admin", "dispatcher"),
  clientController.getClient
);

router.post(
  "/",
  authMiddleware,
  roleMiddleware("super_admin", "dispatcher"),
  clientController.createClient
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("super_admin", "dispatcher"),
  clientController.updateClient
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("super_admin"),
  clientController.deleteClient
);

module.exports = router;
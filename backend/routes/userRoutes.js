const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get(
  "/",
  authMiddleware,
  roleMiddleware("super_admin"),
  userController.getUsers
);

router.get(
  "/:id",
  authMiddleware,
  userController.getUser
);

router.put(
  "/:id",
  authMiddleware,
  userController.updateUser
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("super_admin"),
  userController.deleteUser
);

module.exports = router;
const express = require("express");

const router = express.Router();

const userController = require(
  "../controllers/userController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const roleMiddleware = require(
  "../middleware/roleMiddleware"
);

/* =========================================================
   LISTE DES UTILISATEURS
========================================================= */

router.get(
  "/",
  authMiddleware,
  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),
  userController.getUsers
);

/* =========================================================
   CRÉER UN UTILISATEUR
========================================================= */

router.post(
  "/",
  authMiddleware,
  roleMiddleware(
    "super_admin"
  ),
  userController.createUser
);

/* =========================================================
   RÉCUPÉRER UN UTILISATEUR
========================================================= */

router.get(
  "/:id",
  authMiddleware,
  userController.getUser
);

/* =========================================================
   MODIFIER UN UTILISATEUR
========================================================= */

router.put(
  "/:id",
  authMiddleware,
  userController.updateUser
);

/* =========================================================
   SUPPRIMER UN UTILISATEUR
========================================================= */

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(
    "super_admin"
  ),
  userController.deleteUser
);

module.exports = router;
const express = require("express");

const router = express.Router();

const authController = require(
  "../controllers/authController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

/*
|--------------------------------------------------------------------------
| ROUTES PUBLIQUES
|--------------------------------------------------------------------------
*/

// Connexion
router.post(
  "/login",
  authController.login
);

// Inscription d’un client depuis le site
router.post(
  "/client-register",
  authController.registerClient
);

// Demande de réinitialisation du mot de passe
router.post(
  "/forgot-password",
  authController.forgotPassword
);

// Enregistrer le nouveau mot de passe
router.post(
  "/reset-password",
  authController.resetPassword
);

/*
|--------------------------------------------------------------------------
| ROUTES PROTÉGÉES
|--------------------------------------------------------------------------
*/

// Informations du compte connecté
router.get(
  "/me",
  authMiddleware,
  authController.me
);

// Création d’un employé par un administrateur
router.post(
  "/register",
  authMiddleware,
  authController.register
);

module.exports = router;
const express = require("express");

const router = express.Router();

const authController = require(
  "../controllers/authController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

/* ============================================================
   ROUTES PUBLIQUES
============================================================ */

/* ------------------------------------------------------------
   CONNEXION
   POST /api/auth/login
------------------------------------------------------------ */

router.post(
  "/login",
  authController.login
);

/* ------------------------------------------------------------
   INSCRIPTION PUBLIQUE CLIENT
   POST /api/auth/client-register

   Important :
   cette route est destinée uniquement aux clients.

   Le rôle "driver" ne doit pas être sélectionnable
   depuis la page publique d'inscription.
------------------------------------------------------------ */

router.post(
  "/client-register",
  authController.registerClient
);

/* ------------------------------------------------------------
   MOT DE PASSE OUBLIÉ
   POST /api/auth/forgot-password
------------------------------------------------------------ */

router.post(
  "/forgot-password",
  authController.forgotPassword
);

/* ------------------------------------------------------------
   RÉINITIALISER LE MOT DE PASSE
   POST /api/auth/reset-password
------------------------------------------------------------ */

router.post(
  "/reset-password",
  authController.resetPassword
);

/* ============================================================
   ROUTES PROTÉGÉES
============================================================ */

/* ------------------------------------------------------------
   UTILISATEUR CONNECTÉ
   GET /api/auth/me

   Retourne les informations du compte connecté
   à partir du JWT.
------------------------------------------------------------ */

router.get(
  "/me",
  authMiddleware,
  authController.me
);

/* ------------------------------------------------------------
   CRÉER UN UTILISATEUR INTERNE
   POST /api/auth/register

   Accessible uniquement à un utilisateur authentifié.

   La vérification "super_admin" est également faite
   dans authController.register.

   Rôles internes possibles :
   - super_admin
   - dispatcher
   - driver
------------------------------------------------------------ */

router.post(
  "/register",
  authMiddleware,
  authController.register
);

/* ============================================================
   EXPORT
============================================================ */

module.exports = router;
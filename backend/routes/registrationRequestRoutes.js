const express = require("express");

const router = express.Router();

const registrationRequestController = require(
  "../controllers/registrationRequestController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const roleMiddleware = require(
  "../middleware/roleMiddleware"
);

/* =========================================================
   DEMANDES D'INSCRIPTION
   ACCÈS SUPER ADMIN
========================================================= */

/* ---------------------------------------------------------
   GET
   /api/registration-requests
--------------------------------------------------------- */

router.get(
  "/",
  authMiddleware,
  roleMiddleware("super_admin"),
  registrationRequestController.getRegistrationRequests
);

/* ---------------------------------------------------------
   PATCH
   /api/registration-requests/:id/approve
--------------------------------------------------------- */

router.patch(
  "/:id/approve",
  authMiddleware,
  roleMiddleware("super_admin"),
  registrationRequestController.approveRegistrationRequest
);

/* ---------------------------------------------------------
   PATCH
   /api/registration-requests/:id/reject
--------------------------------------------------------- */

router.patch(
  "/:id/reject",
  authMiddleware,
  roleMiddleware("super_admin"),
  registrationRequestController.rejectRegistrationRequest
);

/* ---------------------------------------------------------
   DELETE
   /api/registration-requests/:id
--------------------------------------------------------- */

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("super_admin"),
  registrationRequestController.deleteRegistrationRequest
);

module.exports = router;
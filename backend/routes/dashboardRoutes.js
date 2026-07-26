const express = require("express");

const dashboardController = require(
  "../controllers/dashboardController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

/* =====================================================
   VÉRIFIER LE RÔLE SUPER ADMIN
===================================================== */

const requireSuperAdmin = (
  req,
  res,
  next
) => {
  if (
    !req.user ||
    req.user.role !== "super_admin"
  ) {
    return res.status(403).json({
      success: false,
      code: "FORBIDDEN",
      message:
        "Cette route est réservée au Super Admin.",
    });
  }

  next();
};

/* =====================================================
   ROUTES DASHBOARD
===================================================== */

router.get(
  "/stats",
  authMiddleware,
  requireSuperAdmin,
  dashboardController.getStats
);

router.get(
  "/overview",
  authMiddleware,
  requireSuperAdmin,
  dashboardController.getOverview
);

module.exports = router;
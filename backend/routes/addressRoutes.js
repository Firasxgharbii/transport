const express = require("express");

const {
  autocomplete,
  details,
} = require("../controllers/addressController");

const router = express.Router();

/**
 * Recherche d'adresses
 *
 * GET:
 * /api/addresses/autocomplete?input=5975
 */
router.get(
  "/autocomplete",
  autocomplete
);

/**
 * Détails d'une adresse Google sélectionnée
 *
 * GET:
 * /api/addresses/details?placeId=...
 */
router.get(
  "/details",
  details
);

module.exports = router;
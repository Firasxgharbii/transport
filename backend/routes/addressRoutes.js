const express = require("express");

const {
  autocomplete,
  details,
} = require("../controllers/addressController");

const router = express.Router();

/**
 * ============================================================
 * GLORY SOLUTIONS
 * Routes Google Places API (New)
 * ============================================================
 *
 * Route principale montée dans server.js :
 *
 * app.use("/api/addresses", addressRoutes);
 *
 * Ce qui donne :
 *
 * GET /api/addresses/autocomplete?input=5975&country=ca
 * GET /api/addresses/details?placeId=PLACE_ID
 *
 * Optionnel :
 * &sessionToken=...
 */

/**
 * ------------------------------------------------------------
 * AUTOCOMPLETE D'ADRESSE
 * ------------------------------------------------------------
 *
 * Exemple :
 * GET /api/addresses/autocomplete?input=5975&country=ca
 *
 * Réponse :
 * {
 *   "success": true,
 *   "predictions": [
 *     {
 *       "place_id": "...",
 *       "description": "5975 ...",
 *       "main_text": "5975 ...",
 *       "secondary_text": "Montréal, QC, Canada"
 *     }
 *   ]
 * }
 */
router.get("/autocomplete", autocomplete);

/**
 * ------------------------------------------------------------
 * DÉTAILS D'UNE ADRESSE
 * ------------------------------------------------------------
 *
 * Une fois que le client sélectionne une suggestion Google,
 * le frontend envoie son placeId.
 *
 * Exemple :
 * GET /api/addresses/details?placeId=ChIJ...
 *
 * Réponse :
 * {
 *   "success": true,
 *   "result": {
 *     "place_id": "...",
 *     "formatted_address": "...",
 *     "street_number": "5975",
 *     "route": "...",
 *     "city": "Montréal",
 *     "province": "QC",
 *     "province_name": "Québec",
 *     "postal_code": "...",
 *     "country": "CA",
 *     "country_name": "Canada",
 *     "latitude": 45.XXXX,
 *     "longitude": -73.XXXX
 *   }
 * }
 */
router.get("/details", details);

/**
 * ------------------------------------------------------------
 * EXPORT
 * ------------------------------------------------------------
 */
module.exports = router;
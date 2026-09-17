const {
  autocompleteAddress,
  getAddressDetails,
} = require("../services/googlePlacesService");

/**
 * ============================================================
 * GLORY SOLUTIONS
 * Address Controller
 * Google Places API (New)
 * ============================================================
 *
 * Routes utilisées :
 *
 * GET /api/addresses/autocomplete
 * GET /api/addresses/details
 */

/**
 * ============================================================
 * AUTOCOMPLETE
 * ============================================================
 *
 * Recherche intelligente d'une adresse.
 *
 * Exemple :
 *
 * GET /api/addresses/autocomplete?input=5975&country=ca
 *
 * Optionnel :
 *
 * GET /api/addresses/autocomplete
 *     ?input=5975
 *     &country=ca
 *     &sessionToken=xxxxx
 */
async function autocomplete(req, res) {
  try {
    /**
     * --------------------------------------------------------
     * INPUT
     * --------------------------------------------------------
     */

    const input = String(
      req.query.input || ""
    ).trim();

    /**
     * --------------------------------------------------------
     * COUNTRY
     * --------------------------------------------------------
     *
     * Par défaut :
     * Canada
     */

    const country = String(
      req.query.country || "ca"
    )
      .trim()
      .toLowerCase();

    /**
     * --------------------------------------------------------
     * SESSION TOKEN
     * --------------------------------------------------------
     *
     * Optionnel pour le moment.
     *
     * Il pourra être envoyé par le frontend pour associer
     * une recherche Autocomplete à la sélection de l'adresse.
     */

    const sessionToken = String(
      req.query.sessionToken || ""
    ).trim() || null;

    /**
     * --------------------------------------------------------
     * VALIDATION
     * --------------------------------------------------------
     */

    if (!input) {
      return res.status(400).json({
        success: false,

        message:
          "Le paramètre input est obligatoire.",
      });
    }

    /**
     * On évite d'appeler Google pour 1 ou 2 caractères.
     */

    if (input.length < 3) {
      return res.status(200).json({
        success: true,

        predictions: [],
      });
    }

    /**
     * --------------------------------------------------------
     * GOOGLE PLACES API (NEW)
     * --------------------------------------------------------
     */

    const predictions =
      await autocompleteAddress(
        input,
        country,
        sessionToken
      );

    /**
     * --------------------------------------------------------
     * SUCCESS
     * --------------------------------------------------------
     */

    return res.status(200).json({
      success: true,

      predictions,
    });
  } catch (error) {
    /**
     * --------------------------------------------------------
     * ERROR
     * --------------------------------------------------------
     */

    console.error(
      "[addressController.autocomplete]",
      error
    );

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,

        message:
          error.message ||
          "Impossible de rechercher les adresses.",
      });
  }
}

/**
 * ============================================================
 * ADDRESS DETAILS
 * ============================================================
 *
 * Après sélection d'une suggestion Google,
 * le frontend envoie le placeId.
 *
 * Exemple :
 *
 * GET /api/addresses/details?placeId=ChIJxxxx
 *
 * Optionnel :
 *
 * GET /api/addresses/details
 *     ?placeId=ChIJxxxx
 *     &sessionToken=xxxxx
 */
async function details(req, res) {
  try {
    /**
     * --------------------------------------------------------
     * PLACE ID
     * --------------------------------------------------------
     */

    const placeId = String(
      req.query.placeId || ""
    ).trim();

    /**
     * --------------------------------------------------------
     * SESSION TOKEN
     * --------------------------------------------------------
     */

    const sessionToken = String(
      req.query.sessionToken || ""
    ).trim() || null;

    /**
     * --------------------------------------------------------
     * VALIDATION
     * --------------------------------------------------------
     */

    if (!placeId) {
      return res.status(400).json({
        success: false,

        message:
          "Le paramètre placeId est obligatoire.",
      });
    }

    /**
     * --------------------------------------------------------
     * GOOGLE PLACE DETAILS (NEW)
     * --------------------------------------------------------
     */

    const address =
      await getAddressDetails(
        placeId,
        sessionToken
      );

    /**
     * --------------------------------------------------------
     * SUCCESS
     * --------------------------------------------------------
     */

    return res.status(200).json({
      success: true,

      result: address,
    });
  } catch (error) {
    /**
     * --------------------------------------------------------
     * ERROR
     * --------------------------------------------------------
     */

    console.error(
      "[addressController.details]",
      error
    );

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,

        message:
          error.message ||
          "Impossible de récupérer l'adresse.",
      });
  }
}

/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {
  autocomplete,
  details,
};
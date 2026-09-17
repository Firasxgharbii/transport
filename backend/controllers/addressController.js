const {
  autocompleteAddress,
  getAddressDetails,
} = require("../services/googlePlacesService");

/**
 * GET /api/addresses/autocomplete
 *
 * Exemple :
 * /api/addresses/autocomplete?input=5975&country=ca
 */
async function autocomplete(req, res) {
  try {
    const input =
      String(req.query.input || "").trim();

    const country =
      String(req.query.country || "ca")
        .trim()
        .toLowerCase();

    if (!input) {
      return res.status(400).json({
        success: false,
        message:
          "Le paramètre input est obligatoire.",
      });
    }

    if (input.length < 3) {
      return res.json({
        success: true,
        predictions: [],
      });
    }

    const predictions =
      await autocompleteAddress(
        input,
        country
      );

    return res.json({
      success: true,
      predictions,
    });
  } catch (error) {
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
 * GET /api/addresses/details
 *
 * Exemple :
 * /api/addresses/details?placeId=xxxxx
 */
async function details(req, res) {
  try {
    const placeId =
      String(req.query.placeId || "").trim();

    if (!placeId) {
      return res.status(400).json({
        success: false,
        message:
          "Le paramètre placeId est obligatoire.",
      });
    }

    const address =
      await getAddressDetails(placeId);

    return res.json({
      success: true,
      result: address,
    });
  } catch (error) {
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

module.exports = {
  autocomplete,
  details,
};
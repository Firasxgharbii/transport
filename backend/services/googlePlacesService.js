/**
 * ============================================================
 * GLORY SOLUTIONS
 * Google Places API (New)
 * ============================================================
 *
 * Fichier :
 * backend/services/googlePlacesService.js
 *
 * Utilise :
 * - Autocomplete (New)
 * - Place Details (New)
 *
 * La clé reste uniquement côté backend dans :
 * GOOGLE_MAPS_API_KEY
 */

const GOOGLE_PLACES_BASE_URL =
  "https://places.googleapis.com/v1";

/**
 * Récupère la clé Google depuis l'environnement.
 *
 * On la lit au moment de la requête plutôt qu'au chargement
 * du fichier afin de rester propre avec PM2 / dotenv.
 */
function getApiKey() {
  const apiKey = String(
    process.env.GOOGLE_MAPS_API_KEY || ""
  ).trim();

  if (!apiKey) {
    const error = new Error(
      "GOOGLE_MAPS_API_KEY n'est pas configurée sur le serveur."
    );

    error.statusCode = 500;
    throw error;
  }

  return apiKey;
}

/**
 * Lecture et gestion centralisée des réponses Google.
 */
async function readGoogleResponse(response) {
  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const googleMessage =
      data?.error?.message ||
      data?.message ||
      `Erreur Google Places HTTP ${response.status}.`;

    console.error(
      "[Google Places API]",
      response.status,
      googleMessage
    );

    const error = new Error(googleMessage);

    error.statusCode =
      response.status >= 400 &&
      response.status < 500
        ? 400
        : 502;

    error.googleStatus = response.status;

    throw error;
  }

  return data || {};
}

/**
 * Normalise le code pays.
 *
 * Exemple :
 * CA -> ca
 * Canada -> ca (les deux premières lettres)
 *
 * Dans notre application on utilise normalement "ca".
 */
function normalizeCountry(country) {
  const normalized = String(country || "ca")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 2);

  return normalized || "ca";
}

/**
 * ============================================================
 * AUTOCOMPLETE
 * ============================================================
 *
 * Exemple :
 *
 * autocompleteAddress("5975", "ca")
 *
 * Google Places API (New) :
 *
 * POST
 * https://places.googleapis.com/v1/places:autocomplete
 */
async function autocompleteAddress(
  input,
  country = "ca",
  sessionToken = null
) {
  const apiKey = getApiKey();

  const query = String(input || "").trim();

  if (query.length < 3) {
    return [];
  }

  const normalizedCountry =
    normalizeCountry(country);

  const body = {
    input: query,

    // Glory Solutions travaille actuellement au Canada.
    includedRegionCodes: [
      normalizedCountry,
    ],

    languageCode: "fr",
  };

  /**
   * Session token optionnel.
   *
   * Le frontend actuel peut fonctionner sans lui.
   * On pourra ensuite générer un token par session
   * de recherche d'adresse.
   */
  if (sessionToken) {
    body.sessionToken =
      String(sessionToken).trim();
  }

  const response = await fetch(
    `${GOOGLE_PLACES_BASE_URL}/places:autocomplete`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "X-Goog-Api-Key":
          apiKey,

        /**
         * On demande uniquement les champs
         * dont notre frontend a besoin.
         */
        "X-Goog-FieldMask": [
          "suggestions.placePrediction.placeId",
          "suggestions.placePrediction.text",
          "suggestions.placePrediction.structuredFormat",
        ].join(","),
      },

      body: JSON.stringify(body),
    }
  );

  const data =
    await readGoogleResponse(response);

  const suggestions =
    Array.isArray(data.suggestions)
      ? data.suggestions
      : [];

  /**
   * On transforme la réponse Google New
   * pour garder exactement la structure
   * attendue par ton frontend actuel.
   */
  return suggestions
    .map(
      (suggestion) =>
        suggestion?.placePrediction
    )
    .filter(Boolean)
    .filter(
      (prediction) =>
        prediction.placeId
    )
    .map((prediction) => ({
      place_id:
        prediction.placeId,

      description:
        prediction.text?.text || "",

      main_text:
        prediction
          .structuredFormat
          ?.mainText
          ?.text ||
        prediction.text?.text ||
        "",

      secondary_text:
        prediction
          .structuredFormat
          ?.secondaryText
          ?.text ||
        "",
    }));
}

/**
 * ============================================================
 * PLACE DETAILS
 * ============================================================
 *
 * Récupère :
 *
 * - adresse complète
 * - numéro civique
 * - rue
 * - ville
 * - province
 * - code postal
 * - pays
 * - latitude
 * - longitude
 *
 * Google Places API (New) :
 *
 * GET
 * https://places.googleapis.com/v1/places/{PLACE_ID}
 */
async function getAddressDetails(
  placeId,
  sessionToken = null
) {
  const apiKey = getApiKey();

  const normalizedPlaceId =
    String(placeId || "").trim();

  if (!normalizedPlaceId) {
    const error = new Error(
      "placeId est obligatoire."
    );

    error.statusCode = 400;

    throw error;
  }

  const params =
    new URLSearchParams({
      languageCode: "fr",
      regionCode: "CA",
    });

  /**
   * Session token optionnel.
   */
  if (sessionToken) {
    params.set(
      "sessionToken",
      String(sessionToken).trim()
    );
  }

  const url =
    `${GOOGLE_PLACES_BASE_URL}/places/` +
    `${encodeURIComponent(
      normalizedPlaceId
    )}?${params.toString()}`;

  const response = await fetch(
    url,
    {
      method: "GET",

      headers: {
        "X-Goog-Api-Key":
          apiKey,

        /**
         * On limite les champs demandés.
         */
        "X-Goog-FieldMask": [
          "id",
          "formattedAddress",
          "addressComponents",
          "location",
        ].join(","),
      },
    }
  );

  const result =
    await readGoogleResponse(response);

  const components =
    Array.isArray(
      result.addressComponents
    )
      ? result.addressComponents
      : [];

  /**
   * Trouve une composante d'adresse Google.
   *
   * Exemples :
   * street_number
   * route
   * locality
   * administrative_area_level_1
   * postal_code
   * country
   */
  function getComponent(
    types,
    short = false
  ) {
    const component =
      components.find(
        (item) =>
          Array.isArray(item.types) &&
          item.types.some((type) =>
            types.includes(type)
          )
      );

    if (!component) {
      return "";
    }

    if (short) {
      return (
        component.shortText ||
        component.longText ||
        ""
      );
    }

    return (
      component.longText ||
      component.shortText ||
      ""
    );
  }

  /**
   * Certaines adresses Google n'utilisent pas
   * forcément "locality".
   *
   * On prévoit plusieurs niveaux.
   */
  const city =
    getComponent([
      "locality",
    ]) ||
    getComponent([
      "postal_town",
    ]) ||
    getComponent([
      "administrative_area_level_3",
    ]) ||
    getComponent([
      "administrative_area_level_2",
    ]);

  /**
   * IMPORTANT :
   *
   * On garde les mêmes noms de propriétés
   * que dans ton ancienne API.
   *
   * Ton frontend n'a donc pas besoin
   * d'être réécrit pour ces champs.
   */
  return {
    place_id:
      result.id ||
      normalizedPlaceId,

    formatted_address:
      result.formattedAddress ||
      "",

    street_number:
      getComponent([
        "street_number",
      ]),

    route:
      getComponent([
        "route",
      ]),

    city,

    province:
      getComponent(
        [
          "administrative_area_level_1",
        ],
        true
      ),

    province_name:
      getComponent([
        "administrative_area_level_1",
      ]),

    postal_code:
      getComponent([
        "postal_code",
      ]),

    country:
      getComponent(
        ["country"],
        true
      ),

    country_name:
      getComponent([
        "country",
      ]),

    latitude:
      result.location
        ?.latitude ??
      null,

    longitude:
      result.location
        ?.longitude ??
      null,
  };
}

/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {
  autocompleteAddress,
  getAddressDetails,
};
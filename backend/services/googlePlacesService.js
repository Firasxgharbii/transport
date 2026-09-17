const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

function ensureApiKey() {
  if (!GOOGLE_API_KEY) {
    const error = new Error(
      "GOOGLE_MAPS_API_KEY n'est pas configurée sur le serveur."
    );
    error.statusCode = 500;
    throw error;
  }
}

async function googleRequest(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error(
      `Erreur Google Maps HTTP ${response.status}.`
    );
    error.statusCode = 502;
    throw error;
  }

  return response.json();
}

/**
 * Recherche intelligente d'adresses.
 * Par défaut : Canada uniquement.
 */
async function autocompleteAddress(input, country = "ca") {
  ensureApiKey();

  const query = String(input || "").trim();

  if (query.length < 3) {
    return [];
  }

  const normalizedCountry =
    String(country || "ca")
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, 2) || "ca";

  const params = new URLSearchParams({
    input: query,
    key: GOOGLE_API_KEY,
    components: `country:${normalizedCountry}`,
    types: "address",
    language: "fr",
  });

  const url =
    "https://maps.googleapis.com/maps/api/place/autocomplete/json?" +
    params.toString();

  const data = await googleRequest(url);

  if (data.status === "ZERO_RESULTS") {
    return [];
  }

  if (data.status !== "OK") {
    console.error(
      "[Google Places Autocomplete]",
      data.status,
      data.error_message || ""
    );

    const error = new Error(
      data.error_message ||
        "Google Places n'a pas pu effectuer la recherche."
    );

    error.statusCode = 502;
    throw error;
  }

  return (data.predictions || []).map((prediction) => ({
    place_id: prediction.place_id,
    description: prediction.description,
    main_text:
      prediction.structured_formatting?.main_text || "",
    secondary_text:
      prediction.structured_formatting?.secondary_text || "",
  }));
}

/**
 * Retourne les détails structurés d'une adresse sélectionnée.
 */
async function getAddressDetails(placeId) {
  ensureApiKey();

  const normalizedPlaceId =
    String(placeId || "").trim();

  if (!normalizedPlaceId) {
    const error = new Error("placeId est obligatoire.");
    error.statusCode = 400;
    throw error;
  }

  const params = new URLSearchParams({
    place_id: normalizedPlaceId,
    key: GOOGLE_API_KEY,
    fields:
      "place_id,formatted_address,address_components,geometry",
    language: "fr",
  });

  const url =
    "https://maps.googleapis.com/maps/api/place/details/json?" +
    params.toString();

  const data = await googleRequest(url);

  if (data.status !== "OK" || !data.result) {
    console.error(
      "[Google Place Details]",
      data.status,
      data.error_message || ""
    );

    const error = new Error(
      data.error_message ||
        "Impossible de récupérer cette adresse."
    );

    error.statusCode =
      data.status === "NOT_FOUND" ? 404 : 502;

    throw error;
  }

  const result = data.result;
  const components =
    Array.isArray(result.address_components)
      ? result.address_components
      : [];

  function getComponent(types, short = false) {
    const component = components.find((item) =>
      item.types?.some((type) =>
        types.includes(type)
      )
    );

    if (!component) {
      return "";
    }

    return short
      ? component.short_name || ""
      : component.long_name || "";
  }

  const city =
    getComponent(["locality"]) ||
    getComponent(["postal_town"]) ||
    getComponent([
      "administrative_area_level_3",
    ]) ||
    getComponent([
      "administrative_area_level_2",
    ]);

  return {
    place_id:
      result.place_id || normalizedPlaceId,

    formatted_address:
      result.formatted_address || "",

    street_number:
      getComponent(["street_number"]),

    route:
      getComponent(["route"]),

    city,

    province:
      getComponent(
        ["administrative_area_level_1"],
        true
      ),

    province_name:
      getComponent([
        "administrative_area_level_1",
      ]),

    postal_code:
      getComponent(["postal_code"]),

    country:
      getComponent(["country"], true),

    country_name:
      getComponent(["country"]),

    latitude:
      result.geometry?.location?.lat ?? null,

    longitude:
      result.geometry?.location?.lng ?? null,
  };
}

module.exports = {
  autocompleteAddress,
  getAddressDetails,
};
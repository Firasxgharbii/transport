"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ============================================================
 * GLORY SOLUTIONS
 * Address Autocomplete
 * ============================================================
 *
 * Backend utilisé :
 *
 * GET /api/addresses/autocomplete
 * GET /api/addresses/details
 *
 * Google Places API (New) est appelé uniquement par le backend.
 * La clé Google n'est donc jamais exposée dans le navigateur.
 */

export type SelectedAddress = {
  formattedAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string;
};

type Suggestion = {
  place_id: string;
  description: string;
  main_text?: string;
  secondary_text?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: SelectedAddress) => void;
  country?: string;
  placeholder?: string;
  inputStyle?: React.CSSProperties;
};

/**
 * ============================================================
 * API URL
 * ============================================================
 *
 * Exemple production :
 *
 * NEXT_PUBLIC_API_URL=https://api.glorysolutions.ca
 *
 * Le replace retire les "/" à la fin pour éviter :
 *
 * https://api.glorysolutions.ca//api/...
 */
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || ""
).replace(/\/+$/, "");

/**
 * Construit une URL vers le backend.
 *
 * Si NEXT_PUBLIC_API_URL est vide, on utilise une URL relative.
 * Cela reste utile si le reverse proxy de production envoie
 * /api vers Express.
 */
function buildApiUrl(path: string) {
  if (API_URL) {
    return `${API_URL}${path}`;
  }

  return path;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  country = "ca",
  placeholder = "Commencez à taper une adresse...",
  inputStyle,
}: Props) {
  /**
   * Suggestions Google
   */
  const [suggestions, setSuggestions] =
    useState<Suggestion[]>([]);

  /**
   * État de chargement
   */
  const [loading, setLoading] =
    useState(false);

  /**
   * Affichage / fermeture du menu
   */
  const [open, setOpen] =
    useState(false);

  /**
   * Message d'erreur
   */
  const [errorMessage, setErrorMessage] =
    useState("");

  /**
   * Permet d'ignorer une ancienne requête
   * lorsqu'une nouvelle recherche est lancée.
   */
  const requestId = useRef(0);

  /**
   * ==========================================================
   * AUTOCOMPLETE
   * ==========================================================
   */
  useEffect(() => {
    const query = value.trim();

    /**
     * Pas de requête Google avant 3 caractères.
     */
    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setErrorMessage("");
      setLoading(false);

      return;
    }

    /**
     * Numéro unique de cette recherche.
     */
    const currentRequest =
      ++requestId.current;

    /**
     * Debounce.
     *
     * On attend 300 ms avant d'envoyer la requête.
     * Cela évite d'appeler Google à chaque frappe.
     */
    const timer = window.setTimeout(
      async () => {
        try {
          setLoading(true);
          setErrorMessage("");

          /**
           * IMPORTANT
           *
           * Ancienne route :
           *
           * /api/address-autocomplete
           *
           * Nouvelle route Express :
           *
           * /api/addresses/autocomplete
           */
          const url = buildApiUrl(
            `/api/addresses/autocomplete?input=${encodeURIComponent(
              query
            )}&country=${encodeURIComponent(
              country
            )}`
          );

          const response =
            await fetch(url, {
              method: "GET",

              headers: {
                Accept:
                  "application/json",
              },

              cache: "no-store",
            });

          /**
           * Si une nouvelle requête a déjà commencé,
           * on ignore cette ancienne réponse.
           */
          if (
            currentRequest !==
            requestId.current
          ) {
            return;
          }

          let payload: any = null;

          try {
            payload =
              await response.json();
          } catch {
            payload = null;
          }

          /**
           * Erreur backend.
           */
          if (!response.ok) {
            console.error(
              "[AddressAutocomplete]",
              response.status,
              payload
            );

            setSuggestions([]);
            setOpen(false);

            setErrorMessage(
              payload?.message ||
                "Impossible de rechercher les adresses."
            );

            return;
          }

          /**
           * Le backend retourne :
           *
           * {
           *   success: true,
           *   predictions: [...]
           * }
           */
          const items: Suggestion[] =
            Array.isArray(
              payload?.predictions
            )
              ? payload.predictions
              : [];

          setSuggestions(items);

          setOpen(
            items.length > 0
          );
        } catch (error) {
          if (
            currentRequest ===
            requestId.current
          ) {
            console.error(
              "[AddressAutocomplete fetch]",
              error
            );

            setSuggestions([]);
            setOpen(false);

            setErrorMessage(
              "Impossible de contacter le service d'adresses."
            );
          }
        } finally {
          if (
            currentRequest ===
            requestId.current
          ) {
            setLoading(false);
          }
        }
      },
      300
    );

    /**
     * Annule le timer si l'utilisateur continue
     * à écrire avant les 300 ms.
     */
    return () => {
      window.clearTimeout(timer);
    };
  }, [value, country]);

  /**
   * ==========================================================
   * SÉLECTION D'UNE ADRESSE
   * ==========================================================
   */
  async function chooseSuggestion(
    suggestion: Suggestion
  ) {
    try {
      setLoading(true);
      setErrorMessage("");

      /**
       * Nouvelle route Express :
       *
       * /api/addresses/details
       */
      const url = buildApiUrl(
        `/api/addresses/details?placeId=${encodeURIComponent(
          suggestion.place_id
        )}`
      );

      const response =
        await fetch(url, {
          method: "GET",

          headers: {
            Accept:
              "application/json",
          },

          cache: "no-store",
        });

      let payload: any = null;

      try {
        payload =
          await response.json();
      } catch {
        payload = null;
      }

      if (
        !response.ok ||
        !payload?.result
      ) {
        console.error(
          "[Address details]",
          response.status,
          payload
        );

        setErrorMessage(
          payload?.message ||
            "Impossible de récupérer les détails de cette adresse."
        );

        return;
      }

      /**
       * ======================================================
       * FORMAT RETOURNÉ PAR NOTRE BACKEND
       * ======================================================
       *
       * {
       *   place_id,
       *   formatted_address,
       *   street_number,
       *   route,
       *   city,
       *   province,
       *   province_name,
       *   postal_code,
       *   country,
       *   country_name,
       *   latitude,
       *   longitude
       * }
       *
       * On n'a donc PLUS besoin de parser
       * address_components dans le frontend.
       */
      const result =
        payload.result;

      const selected: SelectedAddress =
        {
          formattedAddress:
            result.formatted_address ||
            suggestion.description,

          city:
            result.city || "",

          province:
            result.province || "",

          postalCode:
            result.postal_code || "",

          country:
            result.country || "",

          latitude:
            typeof result.latitude ===
            "number"
              ? result.latitude
              : null,

          longitude:
            typeof result.longitude ===
            "number"
              ? result.longitude
              : null,

          placeId:
            result.place_id ||
            suggestion.place_id,
        };

      /**
       * Met à jour le parent.
       */
      onSelect(selected);

      /**
       * Ferme les suggestions.
       */
      setSuggestions([]);
      setOpen(false);
      setErrorMessage("");
    } catch (error) {
      console.error(
        "[Address details fetch]",
        error
      );

      setErrorMessage(
        "Impossible de récupérer les détails de cette adresse."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * UI
   * ==========================================================
   */
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      <input
        value={value}
        onChange={(e) => {
          /**
           * Lorsque l'utilisateur recommence à écrire,
           * l'adresse précédemment sélectionnée n'est
           * plus considérée comme définitive.
           */
          onChange(
            e.target.value
          );

          setErrorMessage("");

          if (
            e.target.value.trim()
              .length >= 3
          ) {
            setOpen(true);
          }
        }}
        onFocus={() => {
          if (
            suggestions.length > 0
          ) {
            setOpen(true);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        style={inputStyle}
      />

      {/* =====================================================
          CHARGEMENT
         ===================================================== */}

      {loading && (
        <span
          style={{
            position: "absolute",
            right: 14,
            top: 16,
            color: "#8a8a94",
            fontSize: 12,
            pointerEvents: "none",
          }}
        >
          Recherche...
        </span>
      )}

      {/* =====================================================
          SUGGESTIONS
         ===================================================== */}

      {open &&
        suggestions.length > 0 && (
          <div
            style={{
              position:
                "absolute",

              zIndex: 9999,

              top:
                "calc(100% + 6px)",

              left: 0,
              right: 0,

              background:
                "#ffffff",

              border:
                "1px solid #e1e1e7",

              borderRadius: 12,

              boxShadow:
                "0 14px 35px rgba(0,0,0,.12)",

              overflow:
                "hidden",

              maxHeight: 300,

              overflowY:
                "auto",
            }}
          >
            {suggestions.map(
              (
                suggestion,
                index
              ) => (
                <button
                  key={
                    suggestion.place_id
                  }
                  type="button"
                  onMouseDown={(
                    event
                  ) => {
                    /**
                     * Empêche le champ de perdre
                     * le focus avant le click.
                     */
                    event.preventDefault();
                  }}
                  onClick={() =>
                    chooseSuggestion(
                      suggestion
                    )
                  }
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "flex-start",

                    gap: 10,

                    width:
                      "100%",

                    padding:
                      "13px 15px",

                    border: 0,

                    borderBottom:
                      index ===
                      suggestions.length -
                        1
                        ? "none"
                        : "1px solid #f0f0f3",

                    background:
                      "#ffffff",

                    color:
                      "#202026",

                    textAlign:
                      "left",

                    cursor:
                      "pointer",

                    fontSize:
                      13,

                    lineHeight:
                      1.45,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                    }}
                  >
                    📍
                  </span>

                  <span
                    style={{
                      display:
                        "flex",

                      flexDirection:
                        "column",

                      minWidth: 0,
                    }}
                  >
                    <strong
                      style={{
                        fontWeight:
                          600,
                      }}
                    >
                      {suggestion.main_text ||
                        suggestion.description}
                    </strong>

                    {suggestion.secondary_text && (
                      <span
                        style={{
                          marginTop:
                            2,

                          color:
                            "#777780",

                          fontSize:
                            12,
                        }}
                      >
                        {
                          suggestion.secondary_text
                        }
                      </span>
                    )}
                  </span>
                </button>
              )
            )}
          </div>
        )}

      {/* =====================================================
          ERREUR
         ===================================================== */}

      {errorMessage && (
        <div
          style={{
            marginTop: 6,
            color: "#d92d20",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
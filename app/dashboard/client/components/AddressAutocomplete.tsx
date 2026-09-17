"use client";

import { useEffect, useRef, useState } from "react";

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
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: SelectedAddress) => void;
  country?: string;
  placeholder?: string;
  inputStyle?: React.CSSProperties;
};

function getPart(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
  types: string[],
  short = false
) {
  const part = components.find((item) =>
    item.types.some((type) => types.includes(type))
  );
  if (!part) return "";
  return short ? part.short_name : part.long_name;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  country = "ca",
  placeholder = "Commencez à taper une adresse...",
  inputStyle,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const query = value.trim();

    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/address-autocomplete?input=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}`
        );
        const payload = await response.json();

        if (currentRequest !== requestId.current) return;

        if (!response.ok) {
          setSuggestions([]);
          setOpen(false);
          return;
        }

        const items = Array.isArray(payload?.predictions)
          ? payload.predictions
          : [];

        setSuggestions(items);
        setOpen(items.length > 0);
      } catch {
        if (currentRequest === requestId.current) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [value, country]);

  async function chooseSuggestion(suggestion: Suggestion) {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/address-details?placeId=${encodeURIComponent(suggestion.place_id)}`
      );
      const payload = await response.json();

      if (!response.ok || !payload?.result) {
        alert("Impossible de récupérer les détails de cette adresse.");
        return;
      }

      const result = payload.result;
      const components = Array.isArray(result.address_components)
        ? result.address_components
        : [];

      const city =
        getPart(components, ["locality"]) ||
        getPart(components, ["postal_town"]) ||
        getPart(components, ["administrative_area_level_2"]);

      const selected: SelectedAddress = {
        formattedAddress: result.formatted_address || suggestion.description,
        city,
        province: getPart(components, ["administrative_area_level_1"], true),
        postalCode: getPart(components, ["postal_code"]),
        country: getPart(components, ["country"], true),
        latitude: result.geometry?.location?.lat ?? null,
        longitude: result.geometry?.location?.lng ?? null,
        placeId: result.place_id || suggestion.place_id,
      };

      onSelect(selected);
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => suggestions.length && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        style={inputStyle}
      />

      {loading && (
        <span
          style={{
            position: "absolute",
            right: 14,
            top: 16,
            color: "#8a8a94",
            fontSize: 12,
          }}
        >
          Recherche...
        </span>
      )}

      {open && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e1e1e7",
            borderRadius: 12,
            boxShadow: "0 14px 35px rgba(0,0,0,.12)",
            overflow: "hidden",
          }}
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => chooseSuggestion(suggestion)}
              style={{
                display: "block",
                width: "100%",
                padding: "13px 15px",
                border: 0,
                borderBottom: "1px solid #f0f0f3",
                background: "#fff",
                color: "#202026",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              📍 {suggestion.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
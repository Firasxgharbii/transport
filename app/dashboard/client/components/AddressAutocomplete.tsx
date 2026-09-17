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

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

function buildApiUrl(path: string) {
  return API_URL ? `${API_URL}${path}` : path;
}

function LocationIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  country = "ca",
  placeholder = "Ex. 5975 Avenue de l'Authion, Montréal",
  inputStyle,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const requestId = useRef(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    const query = value.trim();

    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setErrorMessage("");
      setLoading(false);
      return;
    }

    const currentRequest = ++requestId.current;

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const url = buildApiUrl(
          `/api/addresses/autocomplete?input=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}`
        );

        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (currentRequest !== requestId.current) return;

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setSuggestions([]);
          setOpen(false);
          setErrorMessage(payload?.message || "Impossible de rechercher les adresses.");
          return;
        }

        const items: Suggestion[] = Array.isArray(payload?.predictions)
          ? payload.predictions.slice(0, 5)
          : [];

        setSuggestions(items);
        setOpen(items.length > 0);
      } catch (error) {
        if (currentRequest === requestId.current) {
          console.error("[AddressAutocomplete]", error);
          setSuggestions([]);
          setOpen(false);
          setErrorMessage("Le service d’adresses est temporairement indisponible.");
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [value, country]);

  async function chooseSuggestion(suggestion: Suggestion) {
    try {
      setLoading(true);
      setErrorMessage("");
      setOpen(false);

      const url = buildApiUrl(
        `/api/addresses/details?placeId=${encodeURIComponent(suggestion.place_id)}`
      );

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.result) {
        setErrorMessage(payload?.message || "Impossible de vérifier cette adresse.");
        return;
      }

      const result = payload.result;

      onSelect({
        formattedAddress: result.formatted_address || suggestion.description,
        city: result.city || "",
        province: result.province || "",
        postalCode: result.postal_code || "",
        country: result.country || "",
        latitude: typeof result.latitude === "number" ? result.latitude : null,
        longitude: typeof result.longitude === "number" ? result.longitude : null,
        placeId: result.place_id || suggestion.place_id,
      });

      setSuggestions([]);
    } catch (error) {
      console.error("[Address details]", error);
      setErrorMessage("Impossible de vérifier cette adresse.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={inputShellStyle}>
        <span style={searchIconStyle}><SearchIcon /></span>

        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setErrorMessage("");
            if (e.target.value.trim().length >= 3) setOpen(true);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-label="Adresse de livraison"
          style={{
            ...(inputStyle || {}),
            border: "none",
            boxShadow: "none",
            outline: "none",
            paddingLeft: 44,
            paddingRight: loading ? 108 : 42,
            minHeight: 54,
            borderRadius: 14,
          }}
        />

        {loading ? (
          <span style={loadingStyle}>
            <span style={spinnerStyle} />
            Recherche
          </span>
        ) : value ? (
          <button
            type="button"
            aria-label="Effacer l'adresse"
            onClick={() => {
              onChange("");
              setSuggestions([]);
              setOpen(false);
              setErrorMessage("");
            }}
            style={clearButtonStyle}
          >
            ×
          </button>
        ) : null}
      </div>

      {open && suggestions.length > 0 && (
        <div style={menuStyle}>
          <div style={menuHeaderStyle}>
            <span>Adresses suggérées</span>
            <span style={poweredStyle}>Canada</span>
          </div>

          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => chooseSuggestion(suggestion)}
              style={{
                ...suggestionStyle,
                borderBottom:
                  index === suggestions.length - 1 ? "none" : "1px solid #f0f1f4",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8f9fb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
              }}
            >
              <span style={pinStyle}><LocationIcon size={17} /></span>

              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={mainTextStyle}>
                  {suggestion.main_text || suggestion.description}
                </span>
                {suggestion.secondary_text && (
                  <span style={secondaryTextStyle}>{suggestion.secondary_text}</span>
                )}
              </span>

              <span style={chevronStyle}><ChevronIcon /></span>
            </button>
          ))}
        </div>
      )}

      {errorMessage && <div style={errorStyle}>{errorMessage}</div>}
    </div>
  );
}

const inputShellStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  width: "100%",
  border: "1px solid #dfe1e7",
  borderRadius: 14,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16,24,40,.03)",
  overflow: "hidden",
};

const searchIconStyle: React.CSSProperties = {
  position: "absolute",
  left: 16,
  zIndex: 2,
  display: "flex",
  color: "#777b86",
  pointerEvents: "none",
};

const loadingStyle: React.CSSProperties = {
  position: "absolute",
  right: 14,
  display: "flex",
  alignItems: "center",
  gap: 7,
  color: "#747783",
  fontSize: 11,
  fontWeight: 700,
};

const spinnerStyle: React.CSSProperties = {
  width: 13,
  height: 13,
  border: "2px solid #e6e7eb",
  borderTopColor: "#ff003d",
  borderRadius: "50%",
};

const clearButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: 10,
  width: 30,
  height: 30,
  border: 0,
  borderRadius: 8,
  background: "transparent",
  color: "#9a9da6",
  fontSize: 20,
  cursor: "pointer",
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 9999,
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  overflow: "hidden",
  background: "#fff",
  border: "1px solid #e2e4e9",
  borderRadius: 14,
  boxShadow: "0 18px 45px rgba(16,24,40,.13)",
};

const menuHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 14px",
  background: "#fafbfc",
  borderBottom: "1px solid #eef0f3",
  color: "#777b86",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: ".08em",
  textTransform: "uppercase",
};

const poweredStyle: React.CSSProperties = {
  color: "#a0a3ac",
  fontSize: 9,
  letterSpacing: ".04em",
};

const suggestionStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  border: 0,
  background: "#fff",
  textAlign: "left",
  cursor: "pointer",
  transition: "background .15s ease",
};

const pinStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  minWidth: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  background: "#fff2f5",
  color: "#ff003d",
};

const mainTextStyle: React.CSSProperties = {
  display: "block",
  overflow: "hidden",
  color: "#202126",
  fontSize: 13,
  fontWeight: 750,
  lineHeight: 1.35,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const secondaryTextStyle: React.CSSProperties = {
  display: "block",
  marginTop: 3,
  overflow: "hidden",
  color: "#818590",
  fontSize: 11.5,
  lineHeight: 1.35,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const chevronStyle: React.CSSProperties = {
  display: "flex",
  color: "#b0b3bb",
};

const errorStyle: React.CSSProperties = {
  marginTop: 7,
  color: "#c93434",
  fontSize: 11.5,
  lineHeight: 1.45,
};
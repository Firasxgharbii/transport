"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type Profile = {
  first_name: string;
  last_name: string;
  company_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
};

type MessageState = {
  type: "success" | "error" | "";
  text: string;
};

/* =========================================================
   PROFIL VIDE
========================================================= */

const emptyProfile: Profile = {
  first_name: "",
  last_name: "",
  company_name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  province: "",
  postal_code: "",
};

/* =========================================================
   HELPERS
========================================================= */

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem(
      "glory_token"
    ) || ""
  );
}

function getApiUrl() {
  return (
    process.env
      .NEXT_PUBLIC_API_URL || ""
  );
}

function normalizePostalCode(
  value: string
) {
  return value
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trimStart()
    .slice(0, 7);
}

/* =========================================================
   PAGE
========================================================= */

export default function ProfilePage() {
  const [profile, setProfile] =
    useState<Profile>(
      emptyProfile
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState<MessageState>({
      type: "",
      text: "",
    });

  /* =======================================================
     VÉRIFIER SI L'ADRESSE EST COMPLÈTE
  ======================================================= */

  const addressComplete =
    useMemo(() => {
      return Boolean(
        profile.address.trim() &&
          profile.city.trim() &&
          profile.province.trim() &&
          profile.postal_code.trim()
      );
    }, [
      profile.address,
      profile.city,
      profile.province,
      profile.postal_code,
    ]);

  /* =======================================================
     CHARGER LE PROFIL
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);

        setMessage({
          type: "",
          text: "",
        });

        const token =
          getToken();

        if (!token) {
          window.location.href =
            "/login";
          return;
        }

        const apiUrl =
          getApiUrl();

        const response =
          await fetch(
            `${apiUrl}/api/clients/me`,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              cache: "no-store",
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Impossible de charger le profil."
          );
        }

        const client =
          data?.data ||
          data?.client;

        if (!client) {
          throw new Error(
            "Profil client introuvable."
          );
        }

        if (cancelled) {
          return;
        }

        setProfile({
          first_name:
            client.first_name || "",

          last_name:
            client.last_name || "",

          company_name:
            client.company_name ||
            "",

          phone:
            client.phone || "",

          email:
            client.email || "",

          address:
            client.address || "",

          city:
            client.city || "",

          province:
            client.province || "",

          postal_code:
            client.postal_code ||
            "",
        });
      } catch (error) {
        console.error(
          "Erreur chargement profil :",
          error
        );

        if (!cancelled) {
          setMessage({
            type: "error",

            text:
              error instanceof Error
                ? error.message
                : "Erreur lors du chargement du profil.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     MODIFIER UN CHAMP
  ======================================================= */

  function updateField(
    field: keyof Profile,
    value: string
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    if (message.text) {
      setMessage({
        type: "",
        text: "",
      });
    }
  }

  /* =======================================================
     VALIDER LE PROFIL
  ======================================================= */

  function validateProfile() {
    if (
      !profile.first_name.trim()
    ) {
      return "Le prénom est obligatoire.";
    }

    if (
      !profile.last_name.trim()
    ) {
      return "Le nom est obligatoire.";
    }

    if (!profile.address.trim()) {
      return "L'adresse de ramassage est obligatoire.";
    }

    if (!profile.city.trim()) {
      return "La ville est obligatoire.";
    }

    if (
      !profile.province.trim()
    ) {
      return "La province est obligatoire.";
    }

    if (
      !profile.postal_code.trim()
    ) {
      return "Le code postal est obligatoire.";
    }

    return "";
  }

  /* =======================================================
     ENREGISTRER LE PROFIL
  ======================================================= */

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const validationError =
      validateProfile();

    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });

      return;
    }

    try {
      setSaving(true);

      setMessage({
        type: "",
        text: "",
      });

      const token =
        getToken();

      if (!token) {
        window.location.href =
          "/login";

        return;
      }

      const apiUrl =
        getApiUrl();

      const response =
        await fetch(
          `${apiUrl}/api/clients/me`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              first_name:
                profile.first_name.trim(),

              last_name:
                profile.last_name.trim(),

              company_name:
                profile.company_name
                  .trim() || null,

              phone:
                profile.phone.trim() ||
                null,

              address:
                profile.address.trim(),

              city:
                profile.city.trim(),

              province:
                profile.province.trim(),

              postal_code:
                profile.postal_code
                  .trim()
                  .toUpperCase(),
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Impossible d'enregistrer le profil."
        );
      }

      const updatedClient =
        data?.data ||
        data?.client;

      /*
       * On recharge les données retournées
       * par le backend pour rester synchronisé
       * avec la base de données.
       */
      if (updatedClient) {
        setProfile({
          first_name:
            updatedClient.first_name ||
            "",

          last_name:
            updatedClient.last_name ||
            "",

          company_name:
            updatedClient.company_name ||
            "",

          phone:
            updatedClient.phone || "",

          email:
            updatedClient.email || "",

          address:
            updatedClient.address || "",

          city:
            updatedClient.city || "",

          province:
            updatedClient.province ||
            "",

          postal_code:
            updatedClient.postal_code ||
            "",
        });
      }

      setMessage({
        type: "success",
        text:
          "Profil enregistré avec succès.",
      });
    } catch (error) {
      console.error(
        "Erreur sauvegarde profil :",
        error
      );

      setMessage({
        type: "error",

        text:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'enregistrement du profil.",
      });
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     CHARGEMENT
  ======================================================= */

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>
            <div
              style={
                loadingContainerStyle
              }
            >
              <div
                style={brandStyle}
              >
                Glory Solutions
              </div>

              <div
                style={{
                  fontWeight: 800,
                  color: "#17141d",
                }}
              >
                Chargement du
                profil...
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     AFFICHAGE
  ======================================================= */

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        {/* ================================================
            ENTÊTE
        ================================================= */}

        <section
          style={{
            ...cardStyle,
            marginBottom: 18,
          }}
        >
          <div style={brandStyle}>
            Glory Solutions
          </div>

          <div
            style={headerRowStyle}
          >
            <div>
              <h1 style={titleStyle}>
                Mon profil
              </h1>

              <p
                style={
                  subtitleStyle
                }
              >
                Ces informations
                sont utilisées pour
                votre compte et pour
                déterminer
                automatiquement
                l’adresse de
                ramassage de vos
                commandes.
              </p>
            </div>

            {/* STATUT ADRESSE */}

            <div
              style={{
                ...statusBadgeStyle,

                background:
                  addressComplete
                    ? "#ecfdf3"
                    : "#fff1f2",

                color:
                  addressComplete
                    ? "#067647"
                    : "#b42318",
              }}
            >
              {addressComplete
                ? "✓ Adresse complète"
                : "Adresse à compléter"}
            </div>
          </div>
        </section>

        {/* ================================================
            FORMULAIRE
        ================================================= */}

        <form
          onSubmit={handleSave}
          style={cardStyle}
        >
          {/* INFORMATIONS */}

          <h2
            style={
              sectionTitleStyle
            }
          >
            Informations du compte
          </h2>

          <div style={gridStyle}>
            <Field
              label="Prénom"
              value={
                profile.first_name
              }
              required
              maxLength={100}
              autoComplete="given-name"
              onChange={(value) =>
                updateField(
                  "first_name",
                  value
                )
              }
            />

            <Field
              label="Nom"
              value={
                profile.last_name
              }
              required
              maxLength={100}
              autoComplete="family-name"
              onChange={(value) =>
                updateField(
                  "last_name",
                  value
                )
              }
            />

            <Field
              label="Entreprise"
              value={
                profile.company_name
              }
              maxLength={150}
              autoComplete="organization"
              onChange={(value) =>
                updateField(
                  "company_name",
                  value
                )
              }
            />

            <Field
              label="Téléphone"
              value={
                profile.phone
              }
              maxLength={30}
              autoComplete="tel"
              placeholder="514 555-1234"
              onChange={(value) =>
                updateField(
                  "phone",
                  value
                )
              }
            />

            <Field
              label="Courriel"
              value={
                profile.email
              }
              disabled
              autoComplete="email"
              onChange={() => {}}
            />
          </div>

          {/* SÉPARATEUR */}

          <div
            style={dividerStyle}
          />

          {/* ADRESSE */}

          <h2
            style={
              sectionTitleStyle
            }
          >
            Adresse de ramassage
          </h2>

          <p
            style={helpTextStyle}
          >
            Cette adresse sera
            automatiquement utilisée
            comme lieu de ramassage
            lorsque vous créerez une
            nouvelle commande.
          </p>

          <div style={gridStyle}>
            <div
              style={{
                gridColumn:
                  "1 / -1",
              }}
            >
              <Field
                label="Adresse"
                value={
                  profile.address
                }
                required
                maxLength={255}
                autoComplete="street-address"
                placeholder="1234 Rue Example"
                onChange={(value) =>
                  updateField(
                    "address",
                    value
                  )
                }
              />
            </div>

            <Field
              label="Ville"
              value={profile.city}
              required
              maxLength={100}
              autoComplete="address-level2"
              placeholder="Montréal"
              onChange={(value) =>
                updateField(
                  "city",
                  value
                )
              }
            />

            <Field
              label="Province"
              value={
                profile.province
              }
              required
              maxLength={100}
              autoComplete="address-level1"
              placeholder="Québec"
              onChange={(value) =>
                updateField(
                  "province",
                  value
                )
              }
            />

            <Field
              label="Code postal"
              value={
                profile.postal_code
              }
              required
              maxLength={7}
              autoComplete="postal-code"
              placeholder="H1A 1A1"
              onChange={(value) =>
                updateField(
                  "postal_code",
                  normalizePostalCode(
                    value
                  )
                )
              }
            />
          </div>

          {/* MESSAGE */}

          {message.text ? (
            <div
              role="alert"
              style={{
                ...messageStyle,

                background:
                  message.type ===
                  "success"
                    ? "#ecfdf3"
                    : "#fff1f2",

                color:
                  message.type ===
                  "success"
                    ? "#067647"
                    : "#b42318",

                borderColor:
                  message.type ===
                  "success"
                    ? "#abefc6"
                    : "#fecdd3",
              }}
            >
              {message.type ===
              "success"
                ? "✓ "
                : ""}

              {message.text}
            </div>
          ) : null}

          {/* ACTION */}

          <div
            style={
              actionContainerStyle
            }
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                ...saveButtonStyle,

                background:
                  saving
                    ? "#9f9ca3"
                    : "#ff003d",

                cursor:
                  saving
                    ? "not-allowed"
                    : "pointer",

                boxShadow:
                  saving
                    ? "none"
                    : "0 12px 28px rgba(255, 0, 61, .18)",
              }}
            >
              {saving
                ? "Enregistrement..."
                : "Enregistrer le profil"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

/* =========================================================
   FIELD COMPONENT
========================================================= */

function Field({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder,
  autoComplete,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: 7,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#55515d",
        }}
      >
        {label}

        {required ? (
          <span
            style={{
              color: "#ff003d",
            }}
          >
            {" "}
            *
          </span>
        ) : null}
      </span>

      <input
        type="text"
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={
          autoComplete
        }
        maxLength={maxLength}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        style={{
          width: "100%",
          boxSizing:
            "border-box",

          border:
            "1px solid #dedce2",

          borderRadius: 10,

          padding:
            "12px 13px",

          fontSize: 14,

          background:
            disabled
              ? "#f4f4f6"
              : "#fff",

          color:
            disabled
              ? "#77737f"
              : "#17141d",

          outline: "none",
        }}
      />
    </label>
  );
}

/* =========================================================
   STYLES
========================================================= */

const pageStyle:
  React.CSSProperties = {
  minHeight: "100vh",

  background: "#f6f6f8",

  padding:
    "40px clamp(18px, 4vw, 48px)",
};

const containerStyle:
  React.CSSProperties = {
  maxWidth: 1050,

  margin: "0 auto",
};

const cardStyle:
  React.CSSProperties = {
  background: "#ffffff",

  border:
    "1px solid #e9e8ed",

  borderRadius: 18,

  padding:
    "clamp(22px, 3vw, 32px)",

  boxShadow:
    "0 14px 35px rgba(26,22,37,.06)",
};

const brandStyle:
  React.CSSProperties = {
  color: "#ff003d",

  fontWeight: 900,

  fontSize: 12,

  letterSpacing: ".14em",

  textTransform: "uppercase",

  marginBottom: 8,
};

const headerRowStyle:
  React.CSSProperties = {
  display: "flex",

  alignItems: "flex-start",

  justifyContent:
    "space-between",

  gap: 20,

  flexWrap: "wrap",
};

const titleStyle:
  React.CSSProperties = {
  margin: "0 0 10px",

  color: "#17141d",

  fontSize:
    "clamp(30px, 4vw, 44px)",

  lineHeight: 1.1,
};

const subtitleStyle:
  React.CSSProperties = {
  color: "#6f6b76",

  margin: 0,

  lineHeight: 1.6,

  maxWidth: 680,
};

const statusBadgeStyle:
  React.CSSProperties = {
  padding: "9px 13px",

  borderRadius: 999,

  fontSize: 12,

  fontWeight: 900,

  whiteSpace: "nowrap",
};

const sectionTitleStyle:
  React.CSSProperties = {
  margin: "0 0 18px",

  color: "#17141d",

  fontSize: 20,

  fontWeight: 900,
};

const helpTextStyle:
  React.CSSProperties = {
  color: "#77737f",

  margin: "-7px 0 20px",

  lineHeight: 1.6,

  fontSize: 14,
};

const gridStyle:
  React.CSSProperties = {
  display: "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",

  gap: 16,
};

const dividerStyle:
  React.CSSProperties = {
  height: 1,

  background: "#eceaf0",

  margin: "30px 0",
};

const messageStyle:
  React.CSSProperties = {
  marginTop: 22,

  padding: "13px 15px",

  borderRadius: 10,

  border: "1px solid",

  fontSize: 14,

  fontWeight: 800,

  lineHeight: 1.5,
};

const actionContainerStyle:
  React.CSSProperties = {
  display: "flex",

  justifyContent:
    "flex-end",

  marginTop: 24,
};

const saveButtonStyle:
  React.CSSProperties = {
  border: 0,

  borderRadius: 12,

  padding:
    "14px 22px",

  color: "#fff",

  fontWeight: 900,

  fontSize: 14,

  transition:
    "all .2s ease",
};

const loadingContainerStyle:
  React.CSSProperties = {
  minHeight: 100,

  display: "flex",

  flexDirection: "column",

  justifyContent:
    "center",
};
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Stop = {
  id: number;
  stop_order?: number | null;
  stop_type?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  status?: string | null;
};

type TimelineEntry = {
  id: number;
  status?: string | null;
  comment?: string | null;
  created_at?: string | null;
};

type Package = {
  id: number;
  barcode?: string | null;
  package_number?: number | null;
  package_type?: string | null;
  weight?: number | string | null;
  weight_unit?: string | null;
  length?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  dimension_unit?: string | null;
  current_status?: string | null;
};

type Proof = {
  id: number;
  signature_url?: string | null;
  photo_url?: string | null;
  receiver_first_name?: string | null;
  receiver_last_name?: string | null;
  delivered_at?: string | null;
};

type Order = {
  id: number;
  order_number?: string | null;
  status?: string | null;

  pickup_address?: string | null;
  delivery_address?: string | null;

  delivery_unit?: string | null;
  destination_type?: string | null;

  company_name?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;

  signature_required?: boolean | number | string | null;

  pickup_date?: string | null;
  delivery_date?: string | null;

  notes?: string | null;
  created_at?: string | null;

  stops?: Stop[];
  timeline?: TimelineEntry[];
  packages?: Package[];
  proofs?: Proof[];
};

type TrackingStep = {
  number: number;
  title: string;
  description: string;
};

const trackingSteps: TrackingStep[] = [
  {
    number: 1,
    title: "Commande reçue",
    description: "Votre demande de transport a été enregistrée.",
  },
  {
    number: 2,
    title: "Ramassage effectué",
    description: "Votre marchandise a été prise en charge.",
  },
  {
    number: 3,
    title: "En transit",
    description: "Votre marchandise est en cours d'acheminement.",
  },
  {
    number: 4,
    title: "Livrée",
    description: "La livraison a été complétée.",
  },
];

const statusLabels: Record<string, string> = {
  pending: "En attente",
  assigned: "Assignée",
  pickup_in_progress: "Ramassage en cours",
  picked_up: "Ramassée",
  warehouse_in: "En entrepôt",
  warehouse_storage: "En entrepôt",
  warehouse_out: "En transit",
  out_for_delivery: "En livraison",
  delivery_in_progress: "Livraison en cours",
  arrived: "Arrivée",
  delivered: "Livrée",
  completed: "Terminée",
  cancelled: "Annulée",
  incident: "Incident",
};

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("glory_token") || "";
}

function normalizeStatus(status?: string | null) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(date);
}

function getTrackingStep(status?: string | null) {
  const currentStatus = normalizeStatus(status);

  if (
    [
      "",
      "pending",
      "assigned",
      "pickup_in_progress",
    ].includes(currentStatus)
  ) {
    return 1;
  }

  if (
    [
      "picked_up",
      "warehouse_in",
      "warehouse_storage",
    ].includes(currentStatus)
  ) {
    return 2;
  }

  if (
    [
      "warehouse_out",
      "out_for_delivery",
      "delivery_in_progress",
      "arrived",
    ].includes(currentStatus)
  ) {
    return 3;
  }

  if (
    [
      "delivered",
      "completed",
    ].includes(currentStatus)
  ) {
    return 4;
  }

  if (
    currentStatus === "incident" ||
    currentStatus === "cancelled"
  ) {
    return 1;
  }

  return 1;
}

function getStatusAppearance(status?: string | null) {
  const currentStatus = normalizeStatus(status);

  if (
    currentStatus === "completed" ||
    currentStatus === "delivered"
  ) {
    return {
      background: "#eaf8ef",
      color: "#17763b",
      border: "#ccebd7",
    };
  }

  if (currentStatus === "incident") {
    return {
      background: "#fff4e5",
      color: "#9a5b00",
      border: "#ffe0ad",
    };
  }

  if (currentStatus === "cancelled") {
    return {
      background: "#fff0f0",
      color: "#b42318",
      border: "#ffd2d2",
    };
  }

  return {
    background: "#17141d",
    color: "#ffffff",
    border: "#17141d",
  };
}

function getPackageStatusLabel(status?: string | null) {
  const currentStatus = normalizeStatus(status);

  const packageLabels: Record<string, string> = {
    created: "Créé",
    picked_up: "Ramassé",
    warehouse_in: "Entré en entrepôt",
    warehouse_storage: "En entrepôt",
    warehouse_out: "Sorti de l'entrepôt",
    out_for_delivery: "En livraison",
    delivered: "Livré",
    incident: "Incident",
  };

  return (
    packageLabels[currentStatus] ||
    statusLabels[currentStatus] ||
    status ||
    "Créé"
  );
}

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      if (!orderId) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const token = getToken();

        if (!token) {
          window.location.href = "/login";
          return;
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "";

        const response = await fetch(
          `${apiUrl}/api/orders/${orderId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const payload = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload?.message ||
              "Impossible de récupérer cette commande."
          );
        }

        const receivedOrder =
          payload?.order ||
          payload?.data ||
          null;

        if (!cancelled) {
          setOrder(receivedOrder);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Une erreur est survenue."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const signatureRequired = useMemo(() => {
    return Boolean(
      Number(order?.signature_required)
    );
  }, [order?.signature_required]);

  const currentStep = useMemo(() => {
    return getTrackingStep(order?.status);
  }, [order?.status]);

  const statusAppearance = useMemo(() => {
    return getStatusAppearance(order?.status);
  }, [order?.status]);

  const normalizedOrderStatus =
    normalizeStatus(order?.status);

  const isCancelled =
    normalizedOrderStatus === "cancelled";

  const hasIncident =
    normalizedOrderStatus === "incident";

  if (loading) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
          }}
        >
          <div style={panelStyle}>
            Chargement de votre commande…
          </div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
          }}
        >
          <div style={panelStyle}>
            <h1
              style={{
                marginTop: 0,
                color: "#17141d",
              }}
            >
              Commande introuvable
            </h1>

            <p
              style={{
                color: "#6b6973",
                lineHeight: 1.6,
              }}
            >
              {error || "Accès impossible."}
            </p>

            <Link
              href="/dashboard/client/orders"
              style={primaryButtonStyle}
            >
              Retour à mes commandes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
        }}
      >
        {/* RETOUR */}

        <Link
          href="/dashboard/client/orders"
          style={{
            color: "#6b6973",
            textDecoration: "none",
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 22,
          }}
        >
          ← Mes commandes
        </Link>

        {/* HEADER COMMANDE */}

        <section
          style={{
            ...panelStyle,
            padding: 30,
            marginBottom: 18,
            background:
              "linear-gradient(135deg, #ffffff 0%, #fff8fa 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#ff003d",
                  fontWeight: 900,
                  letterSpacing: ".15em",
                  fontSize: 11,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Glory Solutions
              </div>

              <h1
                style={{
                  margin: 0,
                  color: "#17141d",
                  fontSize: "clamp(28px,4vw,46px)",
                  lineHeight: 1.1,
                }}
              >
                {order.order_number ||
                  `Commande #${order.id}`}
              </h1>

              <p
                style={{
                  color: "#7b7781",
                  margin: "10px 0 0",
                  fontSize: 14,
                }}
              >
                Créée le {formatDate(order.created_at)}
              </p>
            </div>

            <div
              style={{
                padding: "9px 14px",
                borderRadius: 999,
                background:
                  statusAppearance.background,
                color: statusAppearance.color,
                border: `1px solid ${statusAppearance.border}`,
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              {statusLabels[
                normalizedOrderStatus
              ] ||
                order.status ||
                "En attente"}
            </div>
          </div>
        </section>

        {/* SUIVI 4 ETAPES */}

        <section
          style={{
            ...panelStyle,
            padding: 28,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 20,
              flexWrap: "wrap",
              marginBottom: 30,
            }}
          >
            <div>
              <div
                style={{
                  color: "#ff003d",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  marginBottom: 7,
                }}
              >
                Suivi
              </div>

              <h2
                style={{
                  margin: 0,
                  color: "#17141d",
                  fontSize: 24,
                }}
              >
                Suivi de votre commande
              </h2>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#77737f",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Consultez l&apos;avancement de votre
                transport en quatre étapes.
              </p>
            </div>

            {!isCancelled && !hasIncident ? (
              <div
                style={{
                  padding: "7px 11px",
                  background: "#f7f5f8",
                  border: "1px solid #ebe8ef",
                  borderRadius: 999,
                  color: "#77737f",
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                Étape {currentStep} sur 4
              </div>
            ) : null}
          </div>

          {isCancelled ? (
            <div style={alertErrorStyle}>
              Cette commande a été annulée.
            </div>
          ) : null}

          {hasIncident ? (
            <div style={alertWarningStyle}>
              Un incident a été signalé sur cette
              commande. Glory Solutions assure le
              suivi de la situation.
            </div>
          ) : null}

          <div
            style={{
              overflowX: "auto",
              paddingBottom: 6,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(180px, 1fr))",
                gap: 20,
                minWidth: 760,
              }}
            >
              {trackingSteps.map((step, index) => {
                const completed =
                  step.number < currentStep;

                const active =
                  step.number === currentStep;

                const reached =
                  step.number <= currentStep;

                return (
                  <div
                    key={step.number}
                    style={{
                      position: "relative",
                      minWidth: 0,
                    }}
                  >
                    {index <
                    trackingSteps.length - 1 ? (
                      <div
                        style={{
                          position: "absolute",
                          top: 21,
                          left: "calc(50% + 24px)",
                          right: "calc(-50% + 24px)",
                          height: 3,
                          borderRadius: 999,
                          background: completed
                            ? "#ff003d"
                            : "#ebe9ef",
                          zIndex: 0,
                        }}
                      />
                    ) : null}

                    <div
                      style={{
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: 14,
                          boxSizing: "border-box",

                          background: reached
                            ? "#ff003d"
                            : "#f1eff3",

                          color: reached
                            ? "#ffffff"
                            : "#99959f",

                          border: active
                            ? "5px solid #ffd4df"
                            : "5px solid transparent",

                          fontWeight: 900,
                          fontSize: 14,

                          boxShadow: active
                            ? "0 8px 24px rgba(255,0,61,.18)"
                            : "none",
                        }}
                      >
                        {completed
                          ? "✓"
                          : step.number}
                      </div>

                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          color: reached
                            ? "#17141d"
                            : "#96929c",
                          marginBottom: 5,
                        }}
                      >
                        {step.title}
                      </div>

                      <div
                        style={{
                          color: reached
                            ? "#77737f"
                            : "#aaa7af",
                          fontSize: 12,
                          lineHeight: 1.5,
                          maxWidth: 210,
                        }}
                      >
                        {step.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* RAMASSAGE + LIVRAISON */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
            marginBottom: 18,
          }}
        >
          <section style={panelStyle}>
            <div style={smallLabelStyle}>
              Départ
            </div>

            <h2 style={sectionTitleStyle}>
              Ramassage
            </h2>

            <p style={mainTextStyle}>
              {order.pickup_address || "—"}
            </p>

            <p style={mutedTextStyle}>
              Date : {formatDate(order.pickup_date)}
            </p>
          </section>

          <section style={panelStyle}>
            <div style={smallLabelStyle}>
              Destination
            </div>

            <h2 style={sectionTitleStyle}>
              Livraison
            </h2>

            <p style={mainTextStyle}>
              {order.delivery_address || "—"}

              {order.delivery_unit
                ? `, unité ${order.delivery_unit}`
                : ""}
            </p>

            {order.delivery_date ? (
              <p style={mutedTextStyle}>
                Date :{" "}
                {formatDate(order.delivery_date)}
              </p>
            ) : null}

            {order.destination_type ? (
              <p style={mutedTextStyle}>
                {order.destination_type ===
                "commercial"
                  ? "Adresse commerciale"
                  : "Adresse résidentielle"}
              </p>
            ) : null}

            {order.contact_name ? (
              <p style={mutedTextStyle}>
                Contact : {order.contact_name}
                {order.contact_phone
                  ? ` · ${order.contact_phone}`
                  : ""}
              </p>
            ) : null}
          </section>
        </div>

        {/* COLIS */}

        <section
          style={{
            ...panelStyle,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div>
              <div style={smallLabelStyle}>
                Marchandise
              </div>

              <h2
                style={{
                  ...sectionTitleStyle,
                  marginBottom: 0,
                }}
              >
                Colis
              </h2>
            </div>

            <div
              style={{
                padding: "7px 11px",
                background: "#f7f5f8",
                borderRadius: 999,
                color: "#77737f",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {order.packages?.length || 0} colis
            </div>
          </div>

          {order.packages?.length ? (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {order.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  style={{
                    border:
                      "1px solid #eceaf0",
                    borderRadius: 14,
                    padding: 15,

                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(140px, 1fr))",

                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={smallLabelStyle}>
                      Code
                    </div>

                    <strong
                      style={{
                        color: "#17141d",
                        wordBreak: "break-word",
                      }}
                    >
                      {pkg.barcode ||
                        `Colis ${
                          pkg.package_number || ""
                        }`}
                    </strong>
                  </div>

                  <div>
                    <div style={smallLabelStyle}>
                      Type
                    </div>

                    <span style={packageValueStyle}>
                      {pkg.package_type === "pallet"
                        ? "Palette"
                        : pkg.package_type === "box"
                          ? "Boîte"
                          : pkg.package_type || "—"}
                    </span>
                  </div>

                  <div>
                    <div style={smallLabelStyle}>
                      Poids
                    </div>

                    <span style={packageValueStyle}>
                      {pkg.weight ?? "—"}{" "}
                      {pkg.weight_unit || ""}
                    </span>
                  </div>

                  <div>
                    <div style={smallLabelStyle}>
                      Dimensions
                    </div>

                    <span style={packageValueStyle}>
                      {pkg.length &&
                      pkg.width &&
                      pkg.height
                        ? `${pkg.length} × ${pkg.width} × ${pkg.height} ${
                            pkg.dimension_unit || ""
                          }`
                        : "—"}
                    </span>
                  </div>

                  <div>
                    <div style={smallLabelStyle}>
                      État
                    </div>

                    <span
                      style={{
                        ...packageValueStyle,
                        fontWeight: 850,
                      }}
                    >
                      {getPackageStatusLabel(
                        pkg.current_status
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyBoxStyle}>
              Aucun colis enregistré pour cette
              commande.
            </div>
          )}
        </section>

        {/* PREUVE DE LIVRAISON */}

        <section
          style={{
            ...panelStyle,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div>
              <div style={smallLabelStyle}>
                POD
              </div>

              <h2
                style={{
                  ...sectionTitleStyle,
                  marginBottom: 5,
                }}
              >
                Preuve de livraison
              </h2>

              <p
                style={{
                  ...mutedTextStyle,
                  marginTop: 0,
                }}
              >
                {signatureRequired
                  ? "Une signature est requise pour cette livraison."
                  : "La preuve sera disponible après la livraison."}
              </p>
            </div>
          </div>

          {order.proofs?.length ? (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {order.proofs.map((proof) => {
                const receiverName = [
                  proof.receiver_first_name,
                  proof.receiver_last_name,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div
                    key={proof.id}
                    style={{
                      border:
                        "1px solid #eceaf0",
                      background: "#faf9fb",
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 900,
                        color: "#17141d",
                      }}
                    >
                      {receiverName ||
                        "Destinataire"}
                    </div>

                    <div
                      style={{
                        ...mutedTextStyle,
                        fontSize: 13,
                      }}
                    >
                      Livraison :{" "}
                      {formatDate(
                        proof.delivered_at
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 12,
                      }}
                    >
                      {proof.photo_url ? (
                        <a
                          href={proof.photo_url}
                          target="_blank"
                          rel="noreferrer"
                          style={
                            secondaryButtonStyle
                          }
                        >
                          Voir la photo
                        </a>
                      ) : null}

                      {proof.signature_url ? (
                        <a
                          href={
                            proof.signature_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          style={
                            secondaryButtonStyle
                          }
                        >
                          Voir la signature
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={emptyBoxStyle}>
              La preuve de livraison apparaîtra
              automatiquement ici lorsque la
              commande sera livrée.
            </div>
          )}
        </section>

        {/* NOTES */}

        {order.notes ? (
          <section style={panelStyle}>
            <div style={smallLabelStyle}>
              Informations
            </div>

            <h2 style={sectionTitleStyle}>
              Notes de la commande
            </h2>

            <p
              style={{
                margin: 0,
                color: "#55515d",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {order.notes}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  padding: "36px",
  background: "#f6f6f8",
  boxSizing: "border-box",
};

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e9e8ed",
  borderRadius: 18,
  padding: 22,
  boxShadow:
    "0 14px 35px rgba(26,22,37,.06)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 18,
  color: "#17141d",
  fontWeight: 900,
};

const mainTextStyle: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#28242f",
  fontWeight: 750,
  lineHeight: 1.5,
};

const mutedTextStyle: React.CSSProperties = {
  margin: "6px 0",
  color: "#77737f",
  lineHeight: 1.5,
};

const smallLabelStyle: React.CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: ".08em",
  color: "#8b8791",
  fontWeight: 900,
  marginBottom: 6,
};

const packageValueStyle: React.CSSProperties = {
  color: "#39353f",
  fontSize: 14,
  lineHeight: 1.5,
};

const emptyBoxStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 14,
  background: "#faf9fb",
  border: "1px solid #eeecf1",
  color: "#77737f",
  lineHeight: 1.6,
  fontSize: 14,
};

const alertWarningStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: "13px 15px",
  borderRadius: 12,
  background: "#fff7e8",
  border: "1px solid #ffe0ad",
  color: "#8a5200",
  fontWeight: 700,
  fontSize: 13,
  lineHeight: 1.5,
};

const alertErrorStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: "13px 15px",
  borderRadius: 12,
  background: "#fff0f0",
  border: "1px solid #ffd2d2",
  color: "#b42318",
  fontWeight: 700,
  fontSize: 13,
  lineHeight: 1.5,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#ff003d",
  color: "#ffffff",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: 10,
  fontWeight: 900,
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#ffffff",
  color: "#ff003d",
  border: "1px solid #ffd0dc",
  textDecoration: "none",
  padding: "9px 12px",
  borderRadius: 9,
  fontWeight: 850,
  fontSize: 13,
};
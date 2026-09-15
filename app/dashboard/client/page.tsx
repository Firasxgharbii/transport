"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Order = {
  id: number;
  order_number?: string | null;
  status?: string | null;
  pickup_address?: string | null;
  delivery_address?: string | null;
  pickup_date?: string | null;
  delivery_date?: string | null;
  package_count?: number | string | null;
  created_at?: string | null;
};

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
  }).format(date);
}

function getStatusStyle(status?: string | null) {
  const currentStatus = normalizeStatus(status);

  if (
    currentStatus === "delivered" ||
    currentStatus === "completed"
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

  if (
    currentStatus === "out_for_delivery" ||
    currentStatus === "delivery_in_progress" ||
    currentStatus === "warehouse_out"
  ) {
    return {
      background: "#fff0f4",
      color: "#d90035",
      border: "#ffd1dc",
    };
  }

  return {
    background: "#f3f2f5",
    color: "#55515d",
    border: "#e6e4e9",
  };
}

function isDelivered(status?: string | null) {
  const currentStatus = normalizeStatus(status);

  return (
    currentStatus === "delivered" ||
    currentStatus === "completed"
  );
}

function isIncident(status?: string | null) {
  return normalizeStatus(status) === "incident";
}

function isCancelled(status?: string | null) {
  return normalizeStatus(status) === "cancelled";
}

function isActive(status?: string | null) {
  const currentStatus = normalizeStatus(status);

  return (
    !isDelivered(currentStatus) &&
    !isCancelled(currentStatus)
  );
}

export default function ClientDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
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
          `${apiUrl}/api/orders/my`,
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
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            localStorage.removeItem("glory_token");
            window.location.href = "/login";
            return;
          }

          throw new Error(
            payload?.message ||
              "Impossible de récupérer vos commandes."
          );
        }

        const receivedOrders = Array.isArray(
          payload?.orders
        )
          ? payload.orders
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        if (!cancelled) {
          setOrders(receivedOrders);
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

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  const statistics = useMemo(() => {
    const total = orders.length;

    const active = orders.filter((order) =>
      isActive(order.status)
    ).length;

    const delivered = orders.filter((order) =>
      isDelivered(order.status)
    ).length;

    const incidents = orders.filter((order) =>
      isIncident(order.status)
    ).length;

    return {
      total,
      active,
      delivered,
      incidents,
    };
  }, [orders]);

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const dateA = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;

        const dateB = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;

        return dateB - dateA;
      })
      .slice(0, 5);
  }, [orders]);

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        {/* ======================================================
            HEADER
        ====================================================== */}

        <section style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>
              Glory Solutions
            </p>

            <h1 style={mainTitleStyle}>
              Espace client
            </h1>

            <p style={descriptionStyle}>
              Consultez vos commandes, suivez vos
              livraisons et accédez rapidement à
              vos documents et factures.
            </p>
          </div>

          <Link
            href="/dashboard/client/requests"
            style={primaryButtonStyle}
          >
            + Nouvelle demande
          </Link>
        </section>

        {/* ======================================================
            ERREUR
        ====================================================== */}

        {error ? (
          <div style={errorBoxStyle}>
            <div>
              <strong>
                Impossible de charger les commandes
              </strong>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            </div>
          </div>
        ) : null}

        {/* ======================================================
            STATISTIQUES
        ====================================================== */}

        <section style={statsGridStyle}>
          <Link
            href="/dashboard/client/orders"
            style={statCardStyle}
          >
            <div style={statTopStyle}>
              <span style={statLabelStyle}>
                Total
              </span>

              <span style={statNumberStyle}>
                01
              </span>
            </div>

            <div style={statValueStyle}>
              {loading ? "—" : statistics.total}
            </div>

            <div style={statDescriptionStyle}>
              Commandes enregistrées
            </div>
          </Link>

          <Link
            href="/dashboard/client/orders"
            style={statCardStyle}
          >
            <div style={statTopStyle}>
              <span style={statLabelStyle}>
                En cours
              </span>

              <span style={statNumberStyle}>
                02
              </span>
            </div>

            <div style={statValueStyle}>
              {loading ? "—" : statistics.active}
            </div>

            <div style={statDescriptionStyle}>
              Commandes actives
            </div>
          </Link>

          <Link
            href="/dashboard/client/orders"
            style={statCardStyle}
          >
            <div style={statTopStyle}>
              <span style={statLabelStyle}>
                Livrées
              </span>

              <span style={statNumberStyle}>
                03
              </span>
            </div>

            <div style={statValueStyle}>
              {loading
                ? "—"
                : statistics.delivered}
            </div>

            <div style={statDescriptionStyle}>
              Livraisons complétées
            </div>
          </Link>

          <Link
            href="/dashboard/client/orders"
            style={{
              ...statCardStyle,
              ...(statistics.incidents > 0
                ? {
                    borderColor: "#ffd6ad",
                    background: "#fffaf4",
                  }
                : {}),
            }}
          >
            <div style={statTopStyle}>
              <span style={statLabelStyle}>
                Incidents
              </span>

              <span style={statNumberStyle}>
                04
              </span>
            </div>

            <div
              style={{
                ...statValueStyle,
                color:
                  statistics.incidents > 0
                    ? "#b45b00"
                    : "#17171c",
              }}
            >
              {loading
                ? "—"
                : statistics.incidents}
            </div>

            <div style={statDescriptionStyle}>
              Commandes nécessitant un suivi
            </div>
          </Link>
        </section>

        {/* ======================================================
            CONTENU PRINCIPAL
        ====================================================== */}

        <div style={mainGridStyle}>
          {/* ====================================================
              COMMANDES RÉCENTES
          ==================================================== */}

          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <p style={smallLabelStyle}>
                  Activité récente
                </p>

                <h2 style={sectionTitleStyle}>
                  Mes dernières commandes
                </h2>
              </div>

              <Link
                href="/dashboard/client/orders"
                style={textLinkStyle}
              >
                Voir toutes →
              </Link>
            </div>

            {loading ? (
              <div style={emptyStyle}>
                Chargement de vos commandes…
              </div>
            ) : recentOrders.length === 0 ? (
              <div style={emptyStyle}>
                <div
                  style={{
                    fontWeight: 900,
                    color: "#17171c",
                    marginBottom: 6,
                  }}
                >
                  Aucune commande
                </div>

                <div>
                  Vos prochaines commandes
                  apparaîtront ici.
                </div>
              </div>
            ) : (
              <div style={ordersListStyle}>
                {recentOrders.map((order) => {
                  const appearance =
                    getStatusStyle(order.status);

                  return (
                    <Link
                      key={order.id}
                      href={`/dashboard/client/orders/${order.id}`}
                      style={orderRowStyle}
                    >
                      <div style={orderMainStyle}>
                        <div
                          style={orderReferenceStyle}
                        >
                          {order.order_number ||
                            `Commande #${order.id}`}
                        </div>

                        <div
                          style={routeStyle}
                        >
                          <span>
                            {order.pickup_address ||
                              "Départ non indiqué"}
                          </span>

                          <span
                            style={{
                              color: "#c5c2ca",
                              fontWeight: 900,
                            }}
                          >
                            →
                          </span>

                          <span>
                            {order.delivery_address ||
                              "Destination non indiquée"}
                          </span>
                        </div>
                      </div>

                      <div style={orderMetaStyle}>
                        <div
                          style={{
                            ...statusBadgeStyle,
                            background:
                              appearance.background,
                            color: appearance.color,
                            border: `1px solid ${appearance.border}`,
                          }}
                        >
                          {statusLabels[
                            normalizeStatus(
                              order.status
                            )
                          ] ||
                            order.status ||
                            "En attente"}
                        </div>

                        <div style={dateStyle}>
                          {formatDate(
                            order.created_at
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* ====================================================
              RACCOURCIS
          ==================================================== */}

          <aside style={sidePanelStyle}>
            <p style={smallLabelStyle}>
              Accès rapide
            </p>

            <h2 style={sectionTitleStyle}>
              Mon espace
            </h2>

            <div style={quickLinksStyle}>
              <Link
                href="/dashboard/client/orders"
                style={quickLinkStyle}
              >
                <div>
                  <div style={quickTitleStyle}>
                    Mes commandes
                  </div>

                  <div style={quickTextStyle}>
                    Consultez toutes vos
                    commandes.
                  </div>
                </div>

                <span style={arrowStyle}>
                  →
                </span>
              </Link>

              <Link
                href="/dashboard/client/invoices"
                style={quickLinkStyle}
              >
                <div>
                  <div style={quickTitleStyle}>
                    Mes factures
                  </div>

                  <div style={quickTextStyle}>
                    Consultez votre facturation.
                  </div>
                </div>

                <span style={arrowStyle}>
                  →
                </span>
              </Link>

              <Link
                href="/dashboard/client/documents"
                style={quickLinkStyle}
              >
                <div>
                  <div style={quickTitleStyle}>
                    Mes documents
                  </div>

                  <div style={quickTextStyle}>
                    Retrouvez vos documents.
                  </div>
                </div>

                <span style={arrowStyle}>
                  →
                </span>
              </Link>

              <Link
                href="/dashboard/client/requests"
                style={quickLinkStyle}
              >
                <div>
                  <div style={quickTitleStyle}>
                    Nouvelle demande
                  </div>

                  <div style={quickTextStyle}>
                    Créez une nouvelle demande
                    de transport.
                  </div>
                </div>

                <span style={arrowStyle}>
                  →
                </span>
              </Link>

              <Link
                href="/dashboard/client/profile"
                style={quickLinkStyle}
              >
                <div>
                  <div style={quickTitleStyle}>
                    Mon profil
                  </div>

                  <div style={quickTextStyle}>
                    Gérez les informations de
                    votre compte.
                  </div>
                </div>

                <span style={arrowStyle}>
                  →
                </span>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   STYLES
============================================================ */

const pageStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  padding: "40px",
  background: "#f6f6f8",
  boxSizing: "border-box",
};

const containerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "1400px",
  margin: "0 auto",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "24px",
  flexWrap: "wrap",
  marginBottom: "32px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#ff003d",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "2px",
  textTransform: "uppercase",
};

const mainTitleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#17171c",
  fontSize: "clamp(32px, 4vw, 44px)",
  lineHeight: 1.1,
  fontWeight: 900,
};

const descriptionStyle: React.CSSProperties = {
  maxWidth: "700px",
  margin: 0,
  color: "#73737d",
  fontSize: "15px",
  lineHeight: 1.7,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "46px",
  padding: "0 20px",
  background: "#ff003d",
  color: "#ffffff",
  borderRadius: "12px",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 900,
  boxShadow:
    "0 10px 24px rgba(255, 0, 61, 0.18)",
};

const errorBoxStyle: React.CSSProperties = {
  marginBottom: "22px",
  padding: "16px 18px",
  background: "#fff1f1",
  color: "#a52626",
  border: "1px solid #ffd0d0",
  borderRadius: "14px",
  lineHeight: 1.5,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "16px",
  marginBottom: "24px",
};

const statCardStyle: React.CSSProperties = {
  display: "block",
  padding: "22px",
  background: "#ffffff",
  border: "1px solid #e9e9ed",
  borderRadius: "16px",
  textDecoration: "none",
  boxShadow:
    "0 8px 28px rgba(0,0,0,0.04)",
};

const statTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "20px",
};

const statLabelStyle: React.CSSProperties = {
  color: "#77737f",
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: ".08em",
};

const statNumberStyle: React.CSSProperties = {
  color: "#ff003d",
  fontSize: "10px",
  fontWeight: 900,
};

const statValueStyle: React.CSSProperties = {
  color: "#17171c",
  fontSize: "36px",
  lineHeight: 1,
  fontWeight: 900,
};

const statDescriptionStyle: React.CSSProperties = {
  marginTop: "9px",
  color: "#8a8790",
  fontSize: "12px",
  lineHeight: 1.5,
};

const mainGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 2fr) minmax(280px, 0.8fr)",
  gap: "20px",
  alignItems: "start",
};

const panelStyle: React.CSSProperties = {
  minWidth: 0,
  padding: "24px",
  background: "#ffffff",
  border: "1px solid #e9e9ed",
  borderRadius: "18px",
  boxShadow:
    "0 10px 35px rgba(0,0,0,0.045)",
};

const sidePanelStyle: React.CSSProperties = {
  padding: "24px",
  background: "#ffffff",
  border: "1px solid #e9e9ed",
  borderRadius: "18px",
  boxShadow:
    "0 10px 35px rgba(0,0,0,0.045)",
};

const panelHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const smallLabelStyle: React.CSSProperties = {
  margin: "0 0 6px",
  color: "#ff003d",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: ".1em",
  textTransform: "uppercase",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#17171c",
  fontSize: "19px",
  fontWeight: 900,
};

const textLinkStyle: React.CSSProperties = {
  color: "#ff003d",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: 900,
};

const emptyStyle: React.CSSProperties = {
  padding: "34px 18px",
  background: "#faf9fb",
  border: "1px solid #eeecf1",
  borderRadius: "14px",
  color: "#77737f",
  textAlign: "center",
  fontSize: "13px",
  lineHeight: 1.6,
};

const ordersListStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const orderRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "16px",
  border: "1px solid #eceaf0",
  borderRadius: "14px",
  color: "#17171c",
  textDecoration: "none",
  background: "#ffffff",
};

const orderMainStyle: React.CSSProperties = {
  minWidth: 0,
  flex: 1,
};

const orderReferenceStyle: React.CSSProperties = {
  marginBottom: "7px",
  color: "#17171c",
  fontSize: "14px",
  fontWeight: 900,
};

const routeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  color: "#7a7780",
  fontSize: "12px",
  lineHeight: 1.5,
};

const orderMetaStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "7px",
  flexShrink: 0,
};

const statusBadgeStyle: React.CSSProperties = {
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const dateStyle: React.CSSProperties = {
  color: "#9a969f",
  fontSize: "10px",
  fontWeight: 700,
};

const quickLinksStyle: React.CSSProperties = {
  display: "grid",
  gap: "9px",
  marginTop: "20px",
};

const quickLinkStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  padding: "14px",
  color: "#17171c",
  textDecoration: "none",
  border: "1px solid #eceaf0",
  borderRadius: "13px",
  background: "#ffffff",
};

const quickTitleStyle: React.CSSProperties = {
  marginBottom: "3px",
  color: "#17171c",
  fontSize: "13px",
  fontWeight: 900,
};

const quickTextStyle: React.CSSProperties = {
  color: "#8a8790",
  fontSize: "11px",
  lineHeight: 1.5,
};

const arrowStyle: React.CSSProperties = {
  color: "#ff003d",
  fontSize: "17px",
  fontWeight: 900,
  flexShrink: 0,
};
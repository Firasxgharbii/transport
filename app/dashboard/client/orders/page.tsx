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

type FilterType =
  | "all"
  | "active"
  | "delivered"
  | "incident"
  | "cancelled";

const statusLabels: Record<string, string> = {
  pending: "Commande reçue",
  assigned: "Commande reçue",
  pickup_in_progress: "Ramassage en cours",

  picked_up: "Ramassage effectué",
  warehouse_in: "Ramassage effectué",
  warehouse_storage: "Ramassage effectué",

  warehouse_out: "En transit",
  out_for_delivery: "En transit",
  delivery_in_progress: "En transit",
  arrived: "En transit",

  delivered: "Livrée",
  completed: "Livrée",

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
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function isDelivered(status?: string | null) {
  const value = normalizeStatus(status);

  return (
    value === "delivered" ||
    value === "completed"
  );
}

function isIncident(status?: string | null) {
  return normalizeStatus(status) === "incident";
}

function isCancelled(status?: string | null) {
  return normalizeStatus(status) === "cancelled";
}

function isActive(status?: string | null) {
  return (
    !isDelivered(status) &&
    !isCancelled(status) &&
    !isIncident(status)
  );
}

function getStatusLabel(status?: string | null) {
  const value = normalizeStatus(status);

  return (
    statusLabels[value] ||
    status ||
    "Commande reçue"
  );
}

function getStatusAppearance(status?: string | null) {
  const value = normalizeStatus(status);

  if (
    value === "delivered" ||
    value === "completed"
  ) {
    return {
      background: "#eaf8ef",
      color: "#17763b",
      border: "#ccebd7",
    };
  }

  if (value === "incident") {
    return {
      background: "#fff6e8",
      color: "#9a5b00",
      border: "#ffe0ad",
    };
  }

  if (value === "cancelled") {
    return {
      background: "#fff0f0",
      color: "#b42318",
      border: "#ffd2d2",
    };
  }

  if (
    value === "warehouse_out" ||
    value === "out_for_delivery" ||
    value === "delivery_in_progress" ||
    value === "arrived"
  ) {
    return {
      background: "#fff0f4",
      color: "#d90035",
      border: "#ffd1dc",
    };
  }

  if (
    value === "picked_up" ||
    value === "warehouse_in" ||
    value === "warehouse_storage"
  ) {
    return {
      background: "#f1f4ff",
      color: "#3b4d9a",
      border: "#dce2ff",
    };
  }

  return {
    background: "#f3f2f5",
    color: "#55515d",
    border: "#e6e4e9",
  };
}

function getProgress(status?: string | null) {
  const value = normalizeStatus(status);

  if (
    [
      "pending",
      "assigned",
      "pickup_in_progress",
    ].includes(value)
  ) {
    return 1;
  }

  if (
    [
      "picked_up",
      "warehouse_in",
      "warehouse_storage",
    ].includes(value)
  ) {
    return 2;
  }

  if (
    [
      "warehouse_out",
      "out_for_delivery",
      "delivery_in_progress",
      "arrived",
    ].includes(value)
  ) {
    return 3;
  }

  if (
    value === "delivered" ||
    value === "completed"
  ) {
    return 4;
  }

  return 1;
}

export default function ClientOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<FilterType>("all");

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
            localStorage.removeItem(
              "glory_token"
            );

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
    return {
      total: orders.length,

      active: orders.filter((order) =>
        isActive(order.status)
      ).length,

      delivered: orders.filter((order) =>
        isDelivered(order.status)
      ).length,

      incident: orders.filter((order) =>
        isIncident(order.status)
      ).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const searchValue = search
      .trim()
      .toLowerCase();

    return [...orders]
      .filter((order) => {
        if (filter === "active") {
          return isActive(order.status);
        }

        if (filter === "delivered") {
          return isDelivered(order.status);
        }

        if (filter === "incident") {
          return isIncident(order.status);
        }

        if (filter === "cancelled") {
          return isCancelled(order.status);
        }

        return true;
      })
      .filter((order) => {
        if (!searchValue) {
          return true;
        }

        const searchableValues = [
          order.order_number,
          order.status,
          getStatusLabel(order.status),
          order.pickup_address,
          order.delivery_address,
        ];

        return searchableValues
          .filter(Boolean)
          .some((item) =>
            String(item)
              .toLowerCase()
              .includes(searchValue)
          );
      })
      .sort((a, b) => {
        const dateA = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;

        const dateB = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;

        return dateB - dateA;
      });
  }, [orders, search, filter]);

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        {/* HEADER */}

        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>
              Glory Solutions
            </p>

            <h1 style={mainTitleStyle}>
              Mes commandes
            </h1>

            <p style={descriptionStyle}>
              Consultez vos transports et suivez
              simplement leur progression, du
              ramassage jusqu&apos;à la livraison.
            </p>
          </div>

          <Link
            href="/dashboard/client/requests"
            style={primaryButtonStyle}
          >
            + Nouvelle demande
          </Link>
        </header>

        {/* STATISTIQUES */}

        <section style={statsGridStyle}>
          <button
            type="button"
            onClick={() => setFilter("all")}
            style={{
              ...statCardStyle,
              ...(filter === "all"
                ? activeStatCardStyle
                : {}),
            }}
          >
            <span style={statLabelStyle}>
              Toutes
            </span>

            <strong style={statValueStyle}>
              {loading ? "—" : statistics.total}
            </strong>
          </button>

          <button
            type="button"
            onClick={() => setFilter("active")}
            style={{
              ...statCardStyle,
              ...(filter === "active"
                ? activeStatCardStyle
                : {}),
            }}
          >
            <span style={statLabelStyle}>
              En cours
            </span>

            <strong style={statValueStyle}>
              {loading ? "—" : statistics.active}
            </strong>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter("delivered")
            }
            style={{
              ...statCardStyle,
              ...(filter === "delivered"
                ? activeStatCardStyle
                : {}),
            }}
          >
            <span style={statLabelStyle}>
              Livrées
            </span>

            <strong style={statValueStyle}>
              {loading
                ? "—"
                : statistics.delivered}
            </strong>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter("incident")
            }
            style={{
              ...statCardStyle,
              ...(filter === "incident"
                ? activeStatCardStyle
                : {}),
            }}
          >
            <span style={statLabelStyle}>
              Incidents
            </span>

            <strong
              style={{
                ...statValueStyle,
                color:
                  statistics.incident > 0
                    ? "#b45b00"
                    : "#17171c",
              }}
            >
              {loading
                ? "—"
                : statistics.incident}
            </strong>
          </button>
        </section>

        {/* RECHERCHE */}

        <section style={searchPanelStyle}>
          <div style={searchWrapperStyle}>
            <div style={searchLabelStyle}>
              Rechercher
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Référence, adresse ou statut…"
              style={searchInputStyle}
            />
          </div>

          <div style={filterInfoStyle}>
            {filteredOrders.length}{" "}
            {filteredOrders.length > 1
              ? "commandes"
              : "commande"}
          </div>
        </section>

        {/* ERREUR */}

        {error ? (
          <div style={errorStyle}>
            <strong>
              Impossible de charger vos commandes.
            </strong>

            <div
              style={{
                marginTop: 5,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          </div>
        ) : null}

        {/* CHARGEMENT */}

        {loading ? (
          <div style={emptyPanelStyle}>
            Chargement de vos commandes…
          </div>
        ) : null}

        {/* AUCUNE COMMANDE */}

        {!loading &&
        !error &&
        filteredOrders.length === 0 ? (
          <div style={emptyPanelStyle}>
            <div style={emptyTitleStyle}>
              Aucune commande trouvée
            </div>

            <p style={emptyTextStyle}>
              {search || filter !== "all"
                ? "Aucune commande ne correspond à votre recherche ou au filtre sélectionné."
                : "Vous n'avez actuellement aucune commande."}
            </p>

            {!search && filter === "all" ? (
              <Link
                href="/dashboard/client/requests"
                style={emptyButtonStyle}
              >
                Faire une demande
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                style={resetButtonStyle}
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : null}

        {/* COMMANDES */}

        {!loading &&
        !error &&
        filteredOrders.length > 0 ? (
          <section style={ordersGridStyle}>
            {filteredOrders.map((order) => {
              const appearance =
                getStatusAppearance(order.status);

              const progress =
                getProgress(order.status);

              const cancelled =
                isCancelled(order.status);

              const incident =
                isIncident(order.status);

              return (
                <Link
                  key={order.id}
                  href={`/dashboard/client/orders/${order.id}`}
                  style={orderCardStyle}
                >
                  {/* TOP */}

                  <div style={orderTopStyle}>
                    <div>
                      <div style={labelStyle}>
                        Référence
                      </div>

                      <div
                        style={referenceStyle}
                      >
                        {order.order_number ||
                          `Commande #${order.id}`}
                      </div>
                    </div>

                    <div
                      style={{
                        ...statusBadgeStyle,
                        background:
                          appearance.background,
                        color: appearance.color,
                        border: `1px solid ${appearance.border}`,
                      }}
                    >
                      {getStatusLabel(
                        order.status
                      )}
                    </div>
                  </div>

                  {/* ROUTE */}

                  <div style={routeContainerStyle}>
                    <div style={routeItemStyle}>
                      <div
                        style={routeMarkerStyle}
                      />

                      <div>
                        <div style={labelStyle}>
                          Ramassage
                        </div>

                        <div style={addressStyle}>
                          {order.pickup_address ||
                            "Adresse non indiquée"}
                        </div>

                        <div style={dateTextStyle}>
                          {formatDate(
                            order.pickup_date
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={routeLineStyle} />

                    <div style={routeItemStyle}>
                      <div
                        style={{
                          ...routeMarkerStyle,
                          background: "#ff003d",
                        }}
                      />

                      <div>
                        <div style={labelStyle}>
                          Livraison
                        </div>

                        <div style={addressStyle}>
                          {order.delivery_address ||
                            "Adresse non indiquée"}
                        </div>

                        <div style={dateTextStyle}>
                          {formatDate(
                            order.delivery_date
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PROGRESSION */}

                  {!cancelled && !incident ? (
                    <div style={progressSectionStyle}>
                      <div
                        style={progressHeaderStyle}
                      >
                        <span>
                          Progression
                        </span>

                        <strong>
                          Étape {progress}/4
                        </strong>
                      </div>

                      <div style={progressBarStyle}>
                        {[1, 2, 3, 4].map(
                          (step) => (
                            <div
                              key={step}
                              style={{
                                ...progressPartStyle,
                                background:
                                  step <= progress
                                    ? "#ff003d"
                                    : "#ebe9ef",
                              }}
                            />
                          )
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* FOOTER */}

                  <div style={orderFooterStyle}>
                    <div style={footerMetaStyle}>
                      <span>
                        Créée le{" "}
                        {formatDate(
                          order.created_at
                        )}
                      </span>

                      <span>•</span>

                      <span>
                        {Number(
                          order.package_count || 0
                        )}{" "}
                        colis
                      </span>
                    </div>

                    <span style={viewStyle}>
                      Voir la commande →
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        ) : null}
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
  padding: "36px",
  background: "#f6f6f8",
  boxSizing: "border-box",
};

const containerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1320,
  margin: "0 auto",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 20,
  flexWrap: "wrap",
  marginBottom: 26,
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#ff003d",
  fontWeight: 900,
  fontSize: 11,
  letterSpacing: ".16em",
  textTransform: "uppercase",
};

const mainTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#15131b",
  fontSize: "clamp(30px, 4vw, 46px)",
  lineHeight: 1.1,
  fontWeight: 900,
};

const descriptionStyle: React.CSSProperties = {
  maxWidth: 680,
  margin: "10px 0 0",
  color: "#6b6973",
  fontSize: 14,
  lineHeight: 1.6,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: 46,
  padding: "0 18px",
  background: "#ff003d",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 900,
  boxShadow:
    "0 12px 28px rgba(255,0,61,.18)",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const statCardStyle: React.CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
  textAlign: "left",
  cursor: "pointer",
  padding: 18,
  background: "#ffffff",
  border: "1px solid #e9e8ed",
  borderRadius: 14,
  boxShadow:
    "0 8px 24px rgba(26,22,37,.035)",
};

const activeStatCardStyle: React.CSSProperties = {
  border: "1px solid #ff003d",
  boxShadow:
    "0 8px 26px rgba(255,0,61,.08)",
};

const statLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 10,
  color: "#88848e",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform: "uppercase",
};

const statValueStyle: React.CSSProperties = {
  display: "block",
  color: "#17171c",
  fontSize: 27,
  lineHeight: 1,
  fontWeight: 900,
};

const searchPanelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 20,
  padding: 16,
  background: "#ffffff",
  border: "1px solid #e9e8ed",
  borderRadius: 16,
  boxShadow:
    "0 10px 28px rgba(26,22,37,.04)",
};

const searchWrapperStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 240,
};

const searchLabelStyle: React.CSSProperties = {
  marginBottom: 7,
  color: "#8b8791",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: ".08em",
};

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  background: "#ffffff",
  border: "1px solid #dfdde4",
  borderRadius: 11,
  color: "#17171c",
  outline: "none",
  fontSize: 14,
};

const filterInfoStyle: React.CSSProperties = {
  paddingBottom: 11,
  color: "#8a8790",
  fontSize: 12,
  fontWeight: 800,
};

const errorStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: 18,
  background: "#fff0f0",
  border: "1px solid #ffd2d2",
  borderRadius: 14,
  color: "#b42318",
};

const emptyPanelStyle: React.CSSProperties = {
  padding: "44px 24px",
  background: "#ffffff",
  border: "1px solid #e9e8ed",
  borderRadius: 18,
  color: "#77737f",
  textAlign: "center",
  boxShadow:
    "0 14px 35px rgba(26,22,37,.05)",
};

const emptyTitleStyle: React.CSSProperties = {
  marginBottom: 8,
  color: "#17171c",
  fontSize: 18,
  fontWeight: 900,
};

const emptyTextStyle: React.CSSProperties = {
  maxWidth: 520,
  margin: "0 auto 18px",
  color: "#77737f",
  fontSize: 13,
  lineHeight: 1.6,
};

const emptyButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  background: "#ff003d",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 900,
};

const resetButtonStyle: React.CSSProperties = {
  padding: "11px 15px",
  background: "#ffffff",
  color: "#17171c",
  border: "1px solid #ddd9e2",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 900,
};

const ordersGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 430px), 1fr))",
  gap: 16,
};

const orderCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  padding: 21,
  background: "#ffffff",
  border: "1px solid #ebe9ef",
  borderRadius: 18,
  color: "#17171c",
  textDecoration: "none",
  boxShadow:
    "0 12px 30px rgba(31,25,44,.05)",
};

const orderTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  marginBottom: 22,
};

const labelStyle: React.CSSProperties = {
  marginBottom: 5,
  color: "#8b8791",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform: "uppercase",
};

const referenceStyle: React.CSSProperties = {
  color: "#17141d",
  fontSize: 16,
  fontWeight: 900,
};

const statusBadgeStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: "6px 9px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 900,
};

const routeContainerStyle: React.CSSProperties = {
  flex: 1,
};

const routeItemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "14px minmax(0, 1fr)",
  gap: 10,
};

const routeMarkerStyle: React.CSSProperties = {
  width: 9,
  height: 9,
  marginTop: 3,
  borderRadius: "50%",
  background: "#17171c",
};

const routeLineStyle: React.CSSProperties = {
  width: 1,
  height: 22,
  margin: "4px 0 4px 4px",
  background: "#ddd9e1",
};

const addressStyle: React.CSSProperties = {
  color: "#2d2933",
  fontSize: 13,
  fontWeight: 750,
  lineHeight: 1.45,
};

const dateTextStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#99959f",
  fontSize: 10,
  fontWeight: 700,
};

const progressSectionStyle: React.CSSProperties = {
  marginTop: 22,
  paddingTop: 16,
  borderTop: "1px solid #f0eef2",
};

const progressHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 9,
  color: "#8b8791",
  fontSize: 10,
  fontWeight: 800,
};

const progressBarStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 5,
};

const progressPartStyle: React.CSSProperties = {
  height: 4,
  borderRadius: 999,
};

const orderFooterStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  marginTop: 18,
  paddingTop: 14,
  borderTop: "1px solid #f0eef2",
};

const footerMetaStyle: React.CSSProperties = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap",
  color: "#99959f",
  fontSize: 10,
  fontWeight: 700,
};

const viewStyle: React.CSSProperties = {
  color: "#ff003d",
  fontSize: 11,
  fontWeight: 900,
};
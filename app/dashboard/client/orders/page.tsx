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
  delivery_in_progress: "Livraison en cours",
  arrived: "Arrivé",
  completed: "Terminée",
  cancelled: "Annulée",
  incident: "Incident",
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("glory_token") || "";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export default function ClientOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const response = await fetch(`${apiUrl}/api/orders/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload?.message || "Impossible de récupérer vos commandes."
          );
        }

        if (!cancelled) {
          setOrders(
            Array.isArray(payload?.orders)
              ? payload.orders
              : Array.isArray(payload?.data)
                ? payload.data
                : []
          );
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
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return orders;

    return orders.filter((order) =>
      [
        order.order_number,
        order.status,
        order.pickup_address,
        order.delivery_address,
      ]
        .filter(Boolean)
        .some((item) => String(item).toLowerCase().includes(value))
    );
  }, [orders, search]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f6f8",
        padding: "36px",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            alignItems: "end",
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                color: "#ff003d",
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Glory Solutions
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(30px, 4vw, 48px)",
                color: "#15131b",
              }}
            >
              Mes commandes
            </h1>
            <p style={{ color: "#6b6973", margin: "10px 0 0" }}>
              Suivez toutes vos demandes de transport et leur progression.
            </p>
          </div>

          <Link
            href="/dashboard/client/requests"
            style={{
              background: "#ff003d",
              color: "#fff",
              textDecoration: "none",
              padding: "13px 18px",
              borderRadius: 12,
              fontWeight: 800,
              boxShadow: "0 12px 28px rgba(255,0,61,.18)",
            }}
          >
            + Nouvelle commande
          </Link>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e9e8ed",
            borderRadius: 18,
            padding: 16,
            boxShadow: "0 14px 35px rgba(26,22,37,.06)",
            marginBottom: 20,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par référence, statut ou adresse…"
            style={{
              width: "100%",
              border: "1px solid #dfdde4",
              borderRadius: 12,
              padding: "13px 14px",
              outline: "none",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>

        {loading ? (
          <div style={panelStyle}>Chargement de vos commandes…</div>
        ) : error ? (
          <div style={{ ...panelStyle, color: "#b42318" }}>{error}</div>
        ) : filteredOrders.length === 0 ? (
          <div style={panelStyle}>
            <strong>Aucune commande trouvée.</strong>
            <div style={{ marginTop: 8, color: "#77737f" }}>
              Créez votre première demande de transport.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filteredOrders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/client/orders/${order.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  background: "#fff",
                  border: "1px solid #ebe9ef",
                  borderRadius: 18,
                  padding: 20,
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(160px,.9fr) minmax(180px,1.2fr) minmax(180px,1.2fr) 120px 110px",
                  gap: 18,
                  alignItems: "center",
                  boxShadow: "0 12px 30px rgba(31,25,44,.05)",
                }}
              >
                <div>
                  <div style={labelStyle}>Référence</div>
                  <div style={{ fontWeight: 900, color: "#17141d" }}>
                    {order.order_number || `#${order.id}`}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      marginTop: 8,
                      padding: "5px 9px",
                      borderRadius: 999,
                      background: "#f2f0f4",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {statusLabels[order.status || ""] ||
                      order.status ||
                      "En attente"}
                  </div>
                </div>

                <div>
                  <div style={labelStyle}>Ramassage</div>
                  <div style={valueStyle}>
                    {order.pickup_address || "—"}
                  </div>
                </div>

                <div>
                  <div style={labelStyle}>Livraison</div>
                  <div style={valueStyle}>
                    {order.delivery_address || "—"}
                  </div>
                </div>

                <div>
                  <div style={labelStyle}>Date</div>
                  <div style={valueStyle}>
                    {formatDate(order.pickup_date || order.created_at)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={labelStyle}>Colis</div>
                  <div style={{ fontWeight: 900 }}>
                    {Number(order.package_count || 0)}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#ff003d",
                      fontWeight: 900,
                      fontSize: 13,
                    }}
                  >
                    Voir →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const panelStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e9e8ed",
  borderRadius: 18,
  padding: 26,
  boxShadow: "0 14px 35px rgba(26,22,37,.06)",
};

const labelStyle: React.CSSProperties = {
  color: "#8b8791",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const valueStyle: React.CSSProperties = {
  color: "#2d2933",
  fontWeight: 650,
  lineHeight: 1.45,
};
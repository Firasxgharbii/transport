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
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(date);
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
      if (!orderId) return;

      try {
        setLoading(true);
        setError("");

        const token = getToken();
        if (!token) {
          window.location.href = "/login";
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const response = await fetch(`${apiUrl}/api/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload?.message || "Commande introuvable."
          );
        }

        if (!cancelled) {
          setOrder(payload?.order || payload?.data || null);
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

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const signatureRequired = useMemo(
    () => Boolean(Number(order?.signature_required)),
    [order?.signature_required]
  );

  if (loading) {
    return <main style={pageStyle}><div style={panelStyle}>Chargement…</div></main>;
  }

  if (error || !order) {
    return (
      <main style={pageStyle}>
        <div style={panelStyle}>
          <h1 style={{ marginTop: 0 }}>Commande introuvable</h1>
          <p style={{ color: "#6b6973" }}>{error || "Accès impossible."}</p>
          <Link href="/dashboard/client/orders" style={linkButtonStyle}>
            Retour à mes commandes
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <Link
          href="/dashboard/client/orders"
          style={{
            color: "#6b6973",
            textDecoration: "none",
            fontWeight: 800,
            display: "inline-block",
            marginBottom: 22,
          }}
        >
          ← Mes commandes
        </Link>

        <div
          style={{
            ...panelStyle,
            padding: 28,
            marginBottom: 18,
            background:
              "linear-gradient(135deg,#ffffff 0%,#fff8fa 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              flexWrap: "wrap",
              alignItems: "start",
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
                  fontSize: "clamp(30px,4vw,48px)",
                  color: "#17141d",
                }}
              >
                {order.order_number || `Commande #${order.id}`}
              </h1>
              <p style={{ color: "#7b7781", marginBottom: 0 }}>
                Créée le {formatDate(order.created_at)}
              </p>
            </div>

            <div
              style={{
                padding: "9px 13px",
                borderRadius: 999,
                background: "#17141d",
                color: "#fff",
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              {statusLabels[order.status || ""] ||
                order.status ||
                "En attente"}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 18,
            marginBottom: 18,
          }}
        >
          <section style={panelStyle}>
            <h2 style={sectionTitleStyle}>Ramassage</h2>
            <p style={mainTextStyle}>{order.pickup_address || "—"}</p>
            <p style={mutedTextStyle}>
              Date : {formatDate(order.pickup_date)}
            </p>
          </section>

          <section style={panelStyle}>
            <h2 style={sectionTitleStyle}>Livraison</h2>
            <p style={mainTextStyle}>
              {order.delivery_address || "—"}
              {order.delivery_unit ? `, unité ${order.delivery_unit}` : ""}
            </p>
            <p style={mutedTextStyle}>
              {order.destination_type === "commercial"
                ? "Adresse commerciale"
                : "Adresse résidentielle"}
            </p>
            {order.contact_name ? (
              <p style={mutedTextStyle}>
                Contact : {order.contact_name}
                {order.contact_phone ? ` · ${order.contact_phone}` : ""}
              </p>
            ) : null}
          </section>
        </div>

        <section style={{ ...panelStyle, marginBottom: 18 }}>
          <h2 style={sectionTitleStyle}>Colis</h2>

          {order.packages?.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {order.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  style={{
                    border: "1px solid #eceaf0",
                    borderRadius: 14,
                    padding: 14,
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(150px,1fr) 100px 120px minmax(180px,1fr)",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={smallLabelStyle}>Code</div>
                    <strong>{pkg.barcode || `Colis ${pkg.package_number}`}</strong>
                  </div>
                  <div>
                    <div style={smallLabelStyle}>Type</div>
                    <span>{pkg.package_type === "pallet" ? "Palette" : "Boîte"}</span>
                  </div>
                  <div>
                    <div style={smallLabelStyle}>Poids</div>
                    <span>
                      {pkg.weight ?? "—"} {pkg.weight_unit || ""}
                    </span>
                  </div>
                  <div>
                    <div style={smallLabelStyle}>Dimensions</div>
                    <span>
                      {pkg.length && pkg.width && pkg.height
                        ? `${pkg.length} × ${pkg.width} × ${pkg.height} ${pkg.dimension_unit || ""}`
                        : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={mutedTextStyle}>Aucun colis enregistré.</p>
          )}
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
            gap: 18,
          }}
        >
          <section style={panelStyle}>
            <h2 style={sectionTitleStyle}>Suivi</h2>
            {order.timeline?.length ? (
              <div style={{ display: "grid", gap: 14 }}>
                {order.timeline.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      borderLeft: "3px solid #ff003d",
                      paddingLeft: 12,
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>
                      {statusLabels[entry.status || ""] ||
                        entry.status ||
                        "Mise à jour"}
                    </div>
                    {entry.comment ? (
                      <div style={mutedTextStyle}>{entry.comment}</div>
                    ) : null}
                    <div style={{ ...mutedTextStyle, fontSize: 12 }}>
                      {formatDate(entry.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={mutedTextStyle}>Aucun historique disponible.</p>
            )}
          </section>

          <section style={panelStyle}>
            <h2 style={sectionTitleStyle}>Preuve de livraison</h2>
            <p style={mainTextStyle}>
              {signatureRequired
                ? "Signature obligatoire"
                : "Photo obligatoire"}
            </p>

            {order.proofs?.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {order.proofs.map((proof) => (
                  <div
                    key={proof.id}
                    style={{
                      border: "1px solid #eceaf0",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>
                      {[proof.receiver_first_name, proof.receiver_last_name]
                        .filter(Boolean)
                        .join(" ") || "Destinataire"}
                    </div>
                    <div style={mutedTextStyle}>
                      {formatDate(proof.delivered_at)}
                    </div>
                    {proof.photo_url ? (
                      <a
                        href={proof.photo_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#ff003d", fontWeight: 800 }}
                      >
                        Voir la photo
                      </a>
                    ) : null}
                    {proof.signature_url ? (
                      <a
                        href={proof.signature_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#ff003d",
                          fontWeight: 800,
                          marginLeft: proof.photo_url ? 12 : 0,
                        }}
                      >
                        Voir la signature
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p style={mutedTextStyle}>
                La preuve apparaîtra ici après la livraison.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f6f6f8",
  padding: "36px",
};

const panelStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e9e8ed",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 14px 35px rgba(26,22,37,.06)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 18,
  color: "#17141d",
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
  marginBottom: 4,
};

const linkButtonStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#ff003d",
  color: "#fff",
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: 10,
  fontWeight: 900,
};
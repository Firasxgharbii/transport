"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.glorysolutions.ca";

type PackageItem = {
  id?: number;
  barcode?: string;
  current_status?: string;
  route_exclusion?: {
    reason?: string;
    created_at?: string;
  } | null;
};

type ExceptionItem = {
  package_id?: number;
  reason?: string;
  comment?: string;
  created_at?: string;
};

type Proof = {
  proof_type?: string;
  recipient_first_name?: string;
  recipient_last_name?: string;
  cloudinary_url?: string;
  closure_address?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  created_at?: string;
};

type Order = {
  id?: number;
  operation_id?: number;
  operation_type?: string;
  operation_status?: string;
  order_number?: string;
  pallets_count?: number;
  packages?: PackageItem[];
  exceptions?: ExceptionItem[];
  proof?: Proof | null;
};

type Stop = {
  id?: number;
  stop_position?: number;
  task_type?: string;
  status?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  total_orders?: number;
  total_packages?: number;
  total_pallets?: number;
  orders?: Order[];
  run?: {
    execution_status?: string;
    started_at?: string;
    closed_at?: string;
    close_latitude?: number;
    close_longitude?: number;
    close_accuracy?: number;
    close_address?: string;
  } | null;
};

type Route = {
  id?: number;
  route_code?: string;
  scheduled_date?: string;
  status?: string;
  driver_name?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  total_stops?: number;
  total_orders?: number;
  total_packages?: number;
  total_pallets?: number;
  stops?: Stop[];
};

type ArchiveResponse = {
  success: boolean;
  archive: {
    archive_id: number;
    route_id: number;
    route_code?: string;
    business_date?: string;
    archived_at?: string;
    snapshot?: unknown;
    route: Route;
  };
  route: Route;
};

function token() {
  return (
    localStorage.getItem("glory_token") ||
    sessionStorage.getItem("glory_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

function fmt(value?: string) {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function statusLabel(value?: string) {
  const labels: Record<string, string> = {
    draft: "À préparer",
    assigned: "Assignée",
    pending: "En attente",
    in_progress: "En cours",
    completed: "Terminée",
    cancelled: "Annulée",
    incident: "Incident",
    picked_up: "Ramassé",
    warehouse_in: "Entré entrepôt",
    warehouse_storage: "En entrepôt",
    warehouse_out: "Sorti entrepôt",
    out_for_delivery: "À livrer",
    delivered: "Livré",
  };

  return labels[String(value || "")] || value || "—";
}

export default function ArchivedRoutePage() {
  const params = useParams();
  const id = String(params.id || "");

  const [data, setData] = useState<ArchiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openStops, setOpenStops] = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${API}/api/dispatch/routes/archive/${id}`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token()}`,
            Accept: "application/json",
          },
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          json.message || `Erreur ${res.status}`
        );
      }

      setData(json);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Impossible de charger l'archive."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <main style={{ padding: 30 }}>
        Chargement de l'archive…
      </main>
    );
  }

  if (error || !data) {
    return (
      <main style={{ padding: 30 }}>
        <Link href="/dashboard/admin/dispatch/archive">
          ← Archives
        </Link>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: "#fee2e2",
            borderRadius: 12,
          }}
        >
          {error || "Archive introuvable."}
        </div>
      </main>
    );
  }

  const archive = data.archive;
  const route = data.route || archive.route || {};
  const stops = Array.isArray(route.stops)
    ? route.stops
    : [];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "28px 18px 60px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <Link href="/dashboard/admin/dispatch/archive">
            ← Retour aux archives
          </Link>

          <button onClick={() => void load()}>
            Actualiser
          </button>
        </div>

        <section
          style={{
            background: "#111827",
            color: "white",
            borderRadius: 18,
            padding: 24,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.7,
              letterSpacing: 1.2,
            }}
          >
            GLORY SOLUTIONS · ARCHIVE IMMUTABLE
          </div>

          <h1 style={{ marginBottom: 8 }}>
            {archive.route_code ||
              route.route_code ||
              `Route #${archive.route_id}`}
          </h1>

          <p>
            Journée : {fmt(archive.business_date)}
            {" · "}
            Archivée : {fmt(archive.archived_at)}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(140px,1fr))",
              gap: 10,
              marginTop: 20,
            }}
          >
            {[
              [route.total_stops ?? stops.length, "Stops"],
              [route.total_orders ?? 0, "Commandes"],
              [route.total_packages ?? 0, "Colis"],
              [route.total_pallets ?? 0, "Palettes"],
            ].map(([value, label]) => (
              <div
                key={String(label)}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(255,255,255,.08)",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    fontSize: 25,
                  }}
                >
                  {value}
                </strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            padding: 16,
            borderRadius: 14,
            marginBottom: 18,
          }}
        >
          <strong>Archive en lecture seule</strong>
          <p style={{ marginBottom: 0 }}>
            Cette page représente la journée archivée.
            Aucune action ici ne modifie la route active,
            les commandes, les colis ou les preuves.
          </p>
        </section>

        {stops.length === 0 ? (
          <section
            style={{
              background: "white",
              padding: 20,
              borderRadius: 14,
            }}
          >
            Aucun stop enregistré dans cette archive.
          </section>
        ) : (
          stops.map((stop, index) => {
            const stopId = Number(stop.id || index + 1);
            const opened = openStops.includes(stopId);

            return (
              <article
                key={`${stopId}-${index}`}
                style={{
                  background: "white",
                  borderRadius: 14,
                  padding: 18,
                  marginBottom: 12,
                  boxShadow:
                    "0 4px 18px rgba(0,0,0,.05)",
                }}
              >
                <button
                  onClick={() =>
                    setOpenStops((current) =>
                      current.includes(stopId)
                        ? current.filter(
                            (x) => x !== stopId
                          )
                        : [...current, stopId]
                    )
                  }
                  style={{
                    width: "100%",
                    border: 0,
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span>
                    <strong>
                      Stop #{index + 1} ·{" "}
                      {stop.task_type === "pickup"
                        ? "Ramassage"
                        : "Livraison"}
                    </strong>

                    <br />

                    <span>
                      {stop.address || "Adresse inconnue"}
                    </span>

                    <br />

                    <small>
                      {[
                        stop.city,
                        stop.province,
                        stop.postal_code,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {" · "}
                      {statusLabel(stop.status)}
                    </small>
                  </span>

                  <strong>{opened ? "−" : "+"}</strong>
                </button>

                {opened && (
                  <div style={{ marginTop: 18 }}>
                    {stop.run?.closed_at && (
                      <div
                        style={{
                          padding: 12,
                          background: "#f8fafc",
                          borderRadius: 10,
                          marginBottom: 12,
                        }}
                      >
                        <strong>
                          Fermeture chauffeur
                        </strong>
                        <div>
                          {fmt(stop.run.closed_at)}
                        </div>
                        <div>
                          {stop.run.close_address || ""}
                        </div>
                        {stop.run.close_latitude != null && (
                          <small>
                            GPS {stop.run.close_latitude},{" "}
                            {stop.run.close_longitude}
                            {stop.run.close_accuracy != null
                              ? ` ±${stop.run.close_accuracy}m`
                              : ""}
                          </small>
                        )}
                      </div>
                    )}

                    {(stop.orders || []).map((order) => (
                      <div
                        key={
                          order.operation_id ||
                          order.id
                        }
                        style={{
                          borderTop:
                            "1px solid #e5e7eb",
                          padding: "14px 0",
                        }}
                      >
                        <strong>
                          {order.order_number ||
                            `Commande #${order.id}`}
                        </strong>

                        <div>
                          {order.operation_type ===
                          "pickup"
                            ? "Ramassage"
                            : "Livraison"}
                          {" · "}
                          {statusLabel(
                            order.operation_status
                          )}
                        </div>

                        {(order.packages || []).map(
                          (pkg) => (
                            <div
                              key={pkg.id}
                              style={{
                                padding: 10,
                                marginTop: 7,
                                background: "#f8fafc",
                                borderRadius: 9,
                              }}
                            >
                              <strong>
                                {pkg.barcode ||
                                  `Colis #${pkg.id}`}
                              </strong>
                              {" · "}
                              {statusLabel(
                                pkg.current_status
                              )}

                              {pkg.route_exclusion && (
                                <div>
                                  Retiré de la route :{" "}
                                  {
                                    pkg.route_exclusion
                                      .reason
                                  }
                                </div>
                              )}
                            </div>
                          )
                        )}

                        {(order.exceptions || []).length >
                          0 && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: 10,
                              background: "#fff7ed",
                              borderRadius: 9,
                            }}
                          >
                            <strong>
                              Incidents / exceptions
                            </strong>

                            {order.exceptions?.map(
                              (incident, i) => (
                                <div key={i}>
                                  Colis #
                                  {incident.package_id ??
                                    "—"}{" "}
                                  ·{" "}
                                  {incident.reason ||
                                    "Incident"}
                                  {incident.comment
                                    ? ` — ${incident.comment}`
                                    : ""}
                                </div>
                              )
                            )}
                          </div>
                        )}

                        {order.proof && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: 10,
                              background: "#ecfdf3",
                              borderRadius: 9,
                            }}
                          >
                            <strong>
                              Preuve de livraison
                            </strong>

                            <div>
                              {order.proof
                                .recipient_first_name ||
                                ""}{" "}
                              {order.proof
                                .recipient_last_name ||
                                ""}
                            </div>

                            <div>
                              {fmt(
                                order.proof.created_at
                              )}
                            </div>

                            {order.proof
                              .closure_address && (
                              <div>
                                {
                                  order.proof
                                    .closure_address
                                }
                              </div>
                            )}

                            {order.proof
                              .cloudinary_url && (
                              <a
                                href={
                                  order.proof
                                    .cloudinary_url
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                Ouvrir la preuve
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileCheck2,
  Loader2,
  MapPin,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  X,
} from "lucide-react";

type DeliveryNote = {
  id: number | string;

  order_number?: string | null;
  reference?: string | null;

  status?: string | null;

  client_id?: number | string | null;
  client_name?: string | null;
  company_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;

  driver_id?: number | string | null;
  driver_name?: string | null;
  driver_phone?: string | null;

  vehicle_name?: string | null;
  vehicle_plate?: string | null;

  pickup_address?: string | null;
  pickup_city?: string | null;
  pickup_province?: string | null;
  pickup_postal_code?: string | null;

  delivery_address?: string | null;
  delivery_city?: string | null;
  delivery_province?: string | null;
  delivery_postal_code?: string | null;

  description?: string | null;
  notes?: string | null;

  quantity?: number | string | null;
  weight?: number | string | null;

  pickup_date?: string | null;
  delivery_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  [key: string]: unknown;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.glorysolutions.ca";

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("glory_token") || "";
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function getOrderNumber(note: DeliveryNote) {
  return (
    note.order_number ||
    note.reference ||
    `CMD-${String(note.id).padStart(5, "0")}`
  );
}

function getClientName(note: DeliveryNote) {
  return (
    note.company_name ||
    note.client_name ||
    "Client"
  );
}

function getDriverName(note: DeliveryNote) {
  return note.driver_name || "Non assigné";
}

function getStatusLabel(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "En attente";

    case "confirmed":
      return "Confirmée";

    case "assigned":
      return "Assignée";

    case "picked_up":
      return "Ramassée";

    case "in_transit":
      return "En transit";

    case "delivered":
      return "Livrée";

    case "cancelled":
      return "Annulée";

    case "completed":
      return "Terminée";

    default:
      return status || "En attente";
  }
}

function getStatusClass(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "delivered":
    case "completed":
      return "statusDelivered";

    case "in_transit":
    case "picked_up":
      return "statusTransit";

    case "cancelled":
      return "statusCancelled";

    default:
      return "statusPending";
  }
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildAddress(
  address?: string | null,
  city?: string | null,
  province?: string | null,
  postalCode?: string | null,
) {
  const parts = [
    address,
    city,
    province,
    postalCode,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "—";
}

function extractDeliveryNotes(result: unknown): DeliveryNote[] {
  if (Array.isArray(result)) {
    return result as DeliveryNote[];
  }

  if (!result || typeof result !== "object") {
    return [];
  }

  const object = result as Record<string, unknown>;

  if (Array.isArray(object.data)) {
    return object.data as DeliveryNote[];
  }

  if (Array.isArray(object.orders)) {
    return object.orders as DeliveryNote[];
  }

  if (Array.isArray(object.deliveryNotes)) {
    return object.deliveryNotes as DeliveryNote[];
  }

  if (Array.isArray(object.delivery_notes)) {
    return object.delivery_notes as DeliveryNote[];
  }

  return [];
}

export default function DeliveryNotesPage() {
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [selectedNote, setSelectedNote] =
    useState<DeliveryNote | null>(null);

  const loadDeliveryNotes = useCallback(
    async (refresh = false) => {
      const token = getToken();

      if (!token) {
        setError(
          "Session introuvable. Veuillez vous reconnecter.",
        );
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await fetch(
          `${API_URL}/api/orders/delivery-notes`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        let result: unknown = null;

        try {
          result = await response.json();
        } catch {
          result = null;
        }

        if (response.status === 401) {
          throw new Error(
            "Votre session a expiré. Veuillez vous reconnecter.",
          );
        }

        if (response.status === 403) {
          throw new Error(
            "Vous n’avez pas la permission d’accéder aux bons de livraison.",
          );
        }

        if (!response.ok) {
          const apiResult =
            result &&
            typeof result === "object"
              ? (result as Record<string, unknown>)
              : null;

          const message =
            apiResult &&
            typeof apiResult.message === "string"
              ? apiResult.message
              : `Erreur API (${response.status}).`;

          throw new Error(message);
        }

        setNotes(extractDeliveryNotes(result));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Impossible de récupérer les bons de livraison.";

        setError(message);
        setNotes([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadDeliveryNotes();
  }, [loadDeliveryNotes]);

  const filteredNotes = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return notes.filter((note) => {
      const status = (
        note.status || ""
      ).toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        getOrderNumber(note),
        getClientName(note),
        note.client_email,
        note.client_phone,
        note.driver_name,
        note.vehicle_name,
        note.vehicle_plate,
        note.pickup_address,
        note.pickup_city,
        note.delivery_address,
        note.delivery_city,
        note.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [notes, search, statusFilter]);

  const deliveredCount = useMemo(
    () =>
      notes.filter((note) =>
        ["delivered", "completed"].includes(
          (note.status || "").toLowerCase(),
        ),
      ).length,
    [notes],
  );

  const transitCount = useMemo(
    () =>
      notes.filter((note) =>
        [
          "in_transit",
          "picked_up",
          "assigned",
        ].includes(
          (note.status || "").toLowerCase(),
        ),
      ).length,
    [notes],
  );

  const printDeliveryNote = (
    note: DeliveryNote,
  ) => {
    const pickupAddress = buildAddress(
      note.pickup_address,
      note.pickup_city,
      note.pickup_province,
      note.pickup_postal_code,
    );

    const deliveryAddress = buildAddress(
      note.delivery_address,
      note.delivery_city,
      note.delivery_province,
      note.delivery_postal_code,
    );

    const printWindow = window.open(
      "",
      "_blank",
      "width=1000,height=800",
    );

    if (!printWindow) {
      setError(
        "Le navigateur a bloqué la fenêtre d’impression. Autorisez les fenêtres contextuelles.",
      );
      return;
    }

    const escapeHtml = (value: unknown) =>
      cleanText(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />

          <title>
            Bon de livraison ${escapeHtml(
              getOrderNumber(note),
            )}
          </title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 40px;
              font-family: Arial, Helvetica, sans-serif;
              color: #15131b;
              background: #ffffff;
            }

            .document {
              max-width: 900px;
              margin: 0 auto;
            }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 30px;
              padding-bottom: 25px;
              border-bottom: 3px solid #ff003c;
            }

            .brand h1 {
              margin: 0;
              font-size: 28px;
            }

            .brand p {
              margin: 5px 0 0;
              color: #6d6878;
            }

            .title {
              text-align: right;
            }

            .title h2 {
              margin: 0;
              color: #ff003c;
              font-size: 25px;
            }

            .title p {
              margin: 7px 0 0;
            }

            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 18px;
              margin-top: 28px;
            }

            .card {
              border: 1px solid #e8e5ec;
              border-radius: 12px;
              padding: 18px;
            }

            .card.full {
              grid-column: 1 / -1;
            }

            .card h3 {
              margin: 0 0 14px;
              font-size: 14px;
              color: #ff003c;
              text-transform: uppercase;
            }

            .row {
              margin: 9px 0;
              line-height: 1.5;
            }

            .label {
              display: block;
              color: #77717f;
              font-size: 12px;
              margin-bottom: 3px;
            }

            .value {
              font-weight: 600;
            }

            .footer {
              margin-top: 45px;
              padding-top: 18px;
              border-top: 1px solid #e8e5ec;
              color: #77717f;
              font-size: 12px;
              text-align: center;
            }

            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 70px;
              margin-top: 60px;
            }

            .signature {
              padding-top: 10px;
              border-top: 1px solid #333;
              text-align: center;
              font-size: 12px;
            }

            @media print {
              body {
                padding: 0;
              }

              .document {
                max-width: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="document">

            <div class="header">
              <div class="brand">
                <h1>Glory Solutions</h1>
                <p>Transport & logistique</p>
              </div>

              <div class="title">
                <h2>BON DE LIVRAISON</h2>
                <p>
                  ${escapeHtml(
                    getOrderNumber(note),
                  )}
                </p>
              </div>
            </div>

            <div class="grid">

              <div class="card">
                <h3>Client</h3>

                <div class="row">
                  <span class="label">
                    Nom / entreprise
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      getClientName(note),
                    )}
                  </span>
                </div>

                <div class="row">
                  <span class="label">
                    Courriel
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      note.client_email,
                    )}
                  </span>
                </div>

                <div class="row">
                  <span class="label">
                    Téléphone
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      note.client_phone,
                    )}
                  </span>
                </div>
              </div>

              <div class="card">
                <h3>Transport</h3>

                <div class="row">
                  <span class="label">
                    Chauffeur
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      getDriverName(note),
                    )}
                  </span>
                </div>

                <div class="row">
                  <span class="label">
                    Véhicule
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      note.vehicle_name,
                    )}
                  </span>
                </div>

                <div class="row">
                  <span class="label">
                    Plaque
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      note.vehicle_plate,
                    )}
                  </span>
                </div>
              </div>

              <div class="card">
                <h3>Ramassage</h3>

                <div class="row">
                  <span class="label">
                    Adresse
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      pickupAddress,
                    )}
                  </span>
                </div>

                <div class="row">
                  <span class="label">
                    Date
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      formatDate(
                        note.pickup_date,
                      ),
                    )}
                  </span>
                </div>
              </div>

              <div class="card">
                <h3>Livraison</h3>

                <div class="row">
                  <span class="label">
                    Adresse
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      deliveryAddress,
                    )}
                  </span>
                </div>

                <div class="row">
                  <span class="label">
                    Date
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      formatDate(
                        note.delivery_date,
                      ),
                    )}
                  </span>
                </div>
              </div>

              <div class="card full">
                <h3>Détails de la livraison</h3>

                <div class="row">
                  <span class="label">
                    Description
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      note.description,
                    )}
                  </span>
                </div>

                <div class="row">
                  <span class="label">
                    Quantité
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      note.quantity,
                    )}
                  </span>
                </div>

                <div class="row">
                  <span class="label">
                    Poids
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      note.weight,
                    )}
                  </span>
                </div>

                <div class="row">
                  <span class="label">
                    Notes
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      note.notes,
                    )}
                  </span>
                </div>

                <div class="row">
                  <span class="label">
                    Statut
                  </span>

                  <span class="value">
                    ${escapeHtml(
                      getStatusLabel(
                        note.status,
                      ),
                    )}
                  </span>
                </div>
              </div>

            </div>

            <div class="signatures">
              <div class="signature">
                Signature du chauffeur
              </div>

              <div class="signature">
                Signature du client
              </div>
            </div>

            <div class="footer">
              Glory Solutions — Bon de livraison
              ${escapeHtml(
                getOrderNumber(note),
              )}
            </div>

          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <>
      <style jsx>{`
        .page {
          padding: 30px;
          min-height: calc(100vh - 70px);
          background: #f7f7fb;
          color: #17131d;
        }

        .pageHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          color: #ff003c;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 40px);
          letter-spacing: -0.04em;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #777181;
        }

        .refreshButton {
          min-height: 44px;
          padding: 0 17px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #ffd0da;
          border-radius: 12px;
          background: white;
          color: #ff003c;
          font-weight: 700;
          cursor: pointer;
        }

        .refreshButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          margin-bottom: 20px;
          border: 1px solid #ffc5d1;
          border-radius: 12px;
          background: #fff0f3;
          color: #d70032;
          font-weight: 600;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .statCard {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px;
          border: 1px solid #eceaf0;
          border-radius: 17px;
          background: white;
        }

        .statIcon {
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #fff0f4;
          color: #ff003c;
        }

        .statCard span {
          display: block;
          color: #7d7785;
          font-size: 12px;
        }

        .statCard strong {
          display: block;
          margin-top: 3px;
          font-size: 24px;
        }

        .panel {
          overflow: hidden;
          border: 1px solid #eceaf0;
          border-radius: 18px;
          background: white;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 17px;
          border-bottom: 1px solid #eeecf1;
        }

        .search {
          position: relative;
          width: min(420px, 100%);
        }

        .search svg {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #9d98a5;
        }

        .search input {
          width: 100%;
          height: 43px;
          padding: 0 14px 0 40px;
          border: 1px solid #e4e1e8;
          border-radius: 11px;
          outline: none;
          font-size: 14px;
        }

        .search input:focus {
          border-color: #ff8aa5;
          box-shadow: 0 0 0 3px #fff0f4;
        }

        .filter {
          height: 43px;
          min-width: 170px;
          padding: 0 12px;
          border: 1px solid #e4e1e8;
          border-radius: 11px;
          background: white;
          outline: none;
        }

        .tableWrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }

        th {
          padding: 14px 16px;
          background: #fbfafc;
          color: #8a8492;
          font-size: 11px;
          text-align: left;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        td {
          padding: 16px;
          border-top: 1px solid #efedf2;
          vertical-align: middle;
          font-size: 13px;
        }

        .reference {
          font-weight: 800;
        }

        .secondary {
          display: block;
          margin-top: 4px;
          color: #9993a0;
          font-size: 11px;
        }

        .status {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .statusDelivered {
          background: #e2faef;
          color: #078554;
        }

        .statusTransit {
          background: #e9f3ff;
          color: #1769aa;
        }

        .statusCancelled {
          background: #ffe8ed;
          color: #d3163d;
        }

        .statusPending {
          background: #fff4d9;
          color: #a26800;
        }

        .actions {
          display: flex;
          gap: 7px;
        }

        .iconButton {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          border: 1px solid #e6e3e9;
          border-radius: 10px;
          background: white;
          color: #615b68;
          cursor: pointer;
        }

        .iconButton:hover {
          border-color: #ffb3c4;
          color: #ff003c;
        }

        .empty,
        .loading {
          min-height: 380px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #918b98;
        }

        .empty strong {
          margin-top: 13px;
          color: #27212c;
        }

        .empty p {
          margin: 6px 0;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(14, 8, 18, 0.58);
        }

        .modal {
          width: min(800px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 20px;
          background: white;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.22);
        }

        .modalHeader {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 20px 22px;
          border-bottom: 1px solid #eeeaf0;
          background: white;
        }

        .modalHeader h2 {
          margin: 0;
          font-size: 21px;
        }

        .modalClose {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 1px solid #e6e3e9;
          border-radius: 10px;
          background: white;
          cursor: pointer;
        }

        .modalBody {
          padding: 22px;
        }

        .detailGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .detailCard {
          padding: 17px;
          border: 1px solid #ece9ef;
          border-radius: 14px;
        }

        .detailCard h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 14px;
          color: #ff003c;
          font-size: 13px;
        }

        .detailCard p {
          margin: 8px 0;
          line-height: 1.5;
        }

        .detailCard span {
          display: block;
          color: #8a8491;
          font-size: 11px;
        }

        .detailCard strong {
          font-size: 13px;
        }

        .full {
          grid-column: 1 / -1;
        }

        .modalFooter {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 18px 22px;
          border-top: 1px solid #eeeaf0;
        }

        .printButton {
          min-height: 42px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          border-radius: 10px;
          background: #ff003c;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 850px) {
          .page {
            padding: 20px 14px;
          }

          .pageHeader,
          .toolbar {
            flex-direction: column;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .search,
          .filter {
            width: 100%;
          }

          .detailGrid {
            grid-template-columns: 1fr;
          }

          .full {
            grid-column: auto;
          }
        }
      `}</style>

      <main className="page">
        <header className="pageHeader">
          <div>
            <div className="eyebrow">
              <FileCheck2 size={15} />
              Gestion des livraisons
            </div>

            <h1>Bons de livraison</h1>

            <p className="subtitle">
              Consultez et imprimez les bons de livraison
              associés aux commandes.
            </p>
          </div>

          <button
            type="button"
            className="refreshButton"
            disabled={refreshing}
            onClick={() =>
              loadDeliveryNotes(true)
            }
          >
            <RefreshCw
              size={17}
              className={
                refreshing ? "spin" : ""
              }
            />

            Actualiser
          </button>
        </header>

        {error && (
          <div className="error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <section className="stats">
          <div className="statCard">
            <div className="statIcon">
              <FileCheck2 size={21} />
            </div>

            <div>
              <span>Total</span>
              <strong>{notes.length}</strong>
            </div>
          </div>

          <div className="statCard">
            <div className="statIcon">
              <Truck size={21} />
            </div>

            <div>
              <span>En cours</span>
              <strong>{transitCount}</strong>
            </div>
          </div>

          <div className="statCard">
            <div className="statIcon">
              <CheckCircle2 size={21} />
            </div>

            <div>
              <span>Livrées</span>
              <strong>{deliveredCount}</strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="toolbar">
            <div className="search">
              <Search size={17} />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Rechercher une commande, un client..."
              />
            </div>

            <select
              className="filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
            >
              <option value="all">
                Tous les statuts
              </option>

              <option value="pending">
                En attente
              </option>

              <option value="assigned">
                Assignée
              </option>

              <option value="picked_up">
                Ramassée
              </option>

              <option value="in_transit">
                En transit
              </option>

              <option value="delivered">
                Livrée
              </option>

              <option value="completed">
                Terminée
              </option>

              <option value="cancelled">
                Annulée
              </option>
            </select>
          </div>

          {loading ? (
            <div className="loading">
              <Loader2
                size={32}
                className="spin"
              />

              <p>
                Chargement des bons de
                livraison...
              </p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="empty">
              <PackageCheck size={42} />

              <strong>
                Aucun bon de livraison trouvé
              </strong>

              <p>
                Les bons de livraison
                apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="tableWrapper">
              <table>
                <thead>
                  <tr>
                    <th>Commande</th>
                    <th>Client</th>
                    <th>Chauffeur</th>
                    <th>Destination</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredNotes.map(
                    (note) => (
                      <tr key={note.id}>
                        <td>
                          <span className="reference">
                            {getOrderNumber(
                              note,
                            )}
                          </span>

                          <span className="secondary">
                            ID #{note.id}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {getClientName(
                              note,
                            )}
                          </strong>

                          <span className="secondary">
                            {cleanText(
                              note.client_email,
                            )}
                          </span>
                        </td>

                        <td>
                          {getDriverName(
                            note,
                          )}

                          <span className="secondary">
                            {cleanText(
                              note.vehicle_plate,
                            )}
                          </span>
                        </td>

                        <td>
                          {buildAddress(
                            note.delivery_address,
                            note.delivery_city,
                            note.delivery_province,
                            note.delivery_postal_code,
                          )}
                        </td>

                        <td>
                          {formatDate(
                            note.delivery_date ||
                              note.created_at,
                          )}
                        </td>

                        <td>
                          <span
                            className={`status ${getStatusClass(
                              note.status,
                            )}`}
                          >
                            {getStatusLabel(
                              note.status,
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="actions">
                            <button
                              type="button"
                              className="iconButton"
                              title="Voir le bon"
                              onClick={() =>
                                setSelectedNote(
                                  note,
                                )
                              }
                            >
                              <Eye size={17} />
                            </button>

                            <button
                              type="button"
                              className="iconButton"
                              title="Imprimer"
                              onClick={() =>
                                printDeliveryNote(
                                  note,
                                )
                              }
                            >
                              <Printer
                                size={17}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedNote && (
          <div
            className="modalOverlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setSelectedNote(null);
              }
            }}
          >
            <div className="modal">
              <div className="modalHeader">
                <div>
                  <h2>
                    Bon de livraison
                  </h2>

                  <span className="secondary">
                    {getOrderNumber(
                      selectedNote,
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  className="modalClose"
                  onClick={() =>
                    setSelectedNote(null)
                  }
                  aria-label="Fermer"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="modalBody">
                <div className="detailGrid">
                  <div className="detailCard">
                    <h3>
                      <UserRound
                        size={16}
                      />
                      Client
                    </h3>

                    <p>
                      <span>
                        Nom / entreprise
                      </span>
                      <strong>
                        {getClientName(
                          selectedNote,
                        )}
                      </strong>
                    </p>

                    <p>
                      <span>Courriel</span>
                      <strong>
                        {cleanText(
                          selectedNote.client_email,
                        )}
                      </strong>
                    </p>

                    <p>
                      <span>Téléphone</span>
                      <strong>
                        {cleanText(
                          selectedNote.client_phone,
                        )}
                      </strong>
                    </p>
                  </div>

                  <div className="detailCard">
                    <h3>
                      <Truck size={16} />
                      Transport
                    </h3>

                    <p>
                      <span>Chauffeur</span>
                      <strong>
                        {getDriverName(
                          selectedNote,
                        )}
                      </strong>
                    </p>

                    <p>
                      <span>Véhicule</span>
                      <strong>
                        {cleanText(
                          selectedNote.vehicle_name,
                        )}
                      </strong>
                    </p>

                    <p>
                      <span>Plaque</span>
                      <strong>
                        {cleanText(
                          selectedNote.vehicle_plate,
                        )}
                      </strong>
                    </p>
                  </div>

                  <div className="detailCard">
                    <h3>
                      <MapPin size={16} />
                      Ramassage
                    </h3>

                    <p>
                      <span>Adresse</span>
                      <strong>
                        {buildAddress(
                          selectedNote.pickup_address,
                          selectedNote.pickup_city,
                          selectedNote.pickup_province,
                          selectedNote.pickup_postal_code,
                        )}
                      </strong>
                    </p>

                    <p>
                      <span>Date</span>
                      <strong>
                        {formatDate(
                          selectedNote.pickup_date,
                        )}
                      </strong>
                    </p>
                  </div>

                  <div className="detailCard">
                    <h3>
                      <MapPin size={16} />
                      Livraison
                    </h3>

                    <p>
                      <span>Adresse</span>
                      <strong>
                        {buildAddress(
                          selectedNote.delivery_address,
                          selectedNote.delivery_city,
                          selectedNote.delivery_province,
                          selectedNote.delivery_postal_code,
                        )}
                      </strong>
                    </p>

                    <p>
                      <span>Date</span>
                      <strong>
                        {formatDate(
                          selectedNote.delivery_date,
                        )}
                      </strong>
                    </p>
                  </div>

                  <div className="detailCard full">
                    <h3>
                      <PackageCheck
                        size={16}
                      />
                      Détails
                    </h3>

                    <p>
                      <span>Description</span>
                      <strong>
                        {cleanText(
                          selectedNote.description,
                        )}
                      </strong>
                    </p>

                    <p>
                      <span>Quantité</span>
                      <strong>
                        {cleanText(
                          selectedNote.quantity,
                        )}
                      </strong>
                    </p>

                    <p>
                      <span>Poids</span>
                      <strong>
                        {cleanText(
                          selectedNote.weight,
                        )}
                      </strong>
                    </p>

                    <p>
                      <span>Notes</span>
                      <strong>
                        {cleanText(
                          selectedNote.notes,
                        )}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="modalFooter">
                <button
                  type="button"
                  className="printButton"
                  onClick={() =>
                    printDeliveryNote(
                      selectedNote,
                    )
                  }
                >
                  <Printer size={17} />
                  Imprimer le bon
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
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

    const reference = getOrderNumber(note);

    const cleanReference = reference
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    const printWindow = window.open(
      "",
      "_blank",
      "width=650,height=900",
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

    const quantity =
      note.quantity !== null &&
      note.quantity !== undefined
        ? escapeHtml(note.quantity)
        : "—";

    const weight =
      note.weight !== null &&
      note.weight !== undefined
        ? `${escapeHtml(note.weight)} kg`
        : "—";

    printWindow.document.write(`
      <!DOCTYPE html>

      <html lang="fr">
        <head>
          <meta charset="UTF-8" />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />

          <title>
            Bon de livraison ${escapeHtml(reference)}
          </title>

          <style>
            @page {
              size: 4in 6in;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              width: 4in;
              min-height: 6in;

              margin: 0;
              padding: 0;

              font-family:
                Arial,
                Helvetica,
                sans-serif;

              background: #ffffff;
              color: #090909;
            }

            body {
              display: flex;
              justify-content: center;
            }

            .label {
              width: 4in;
              min-height: 6in;

              display: flex;
              flex-direction: column;

              overflow: hidden;

              border: 2px solid #000;
              background: #fff;
            }

            .header {
              display: grid;
              grid-template-columns: 1fr auto;

              align-items: center;

              gap: 8px;

              padding: 10px 11px;

              border-bottom: 2px solid #000;
            }

            .brand {
              display: flex;
              flex-direction: column;
            }

            .brand-name {
              font-size: 20px;
              font-weight: 950;
              line-height: 0.95;
              letter-spacing: -0.03em;
            }

            .brand-name span {
              display: block;
              color: #dc143c;
            }

            .brand-subtitle {
              margin-top: 5px;

              font-size: 7px;
              font-weight: 800;
              letter-spacing: 0.12em;
              text-transform: uppercase;
            }

            .service {
              padding: 6px 8px;

              border: 2px solid #000;

              font-size: 9px;
              font-weight: 900;

              text-transform: uppercase;
            }

            .reference-block {
              padding: 9px 11px;

              border-bottom: 2px solid #000;
            }

            .reference-label {
              margin-bottom: 4px;

              font-size: 7px;
              font-weight: 900;
              letter-spacing: 0.11em;
              text-transform: uppercase;
            }

            .reference-number {
              font-size: 24px;
              font-weight: 950;
              line-height: 1;
              letter-spacing: -0.04em;
              word-break: break-word;
            }

            .route {
              display: grid;
              grid-template-columns: 1fr 1fr;

              border-bottom: 2px solid #000;
            }

            .route-card {
              min-height: 112px;

              padding: 9px 10px;
            }

            .route-card:first-child {
              border-right: 2px solid #000;
            }

            .route-title {
              margin-bottom: 7px;

              font-size: 8px;
              font-weight: 950;

              letter-spacing: 0.08em;
              text-transform: uppercase;
            }

            .route-name {
              margin-bottom: 5px;

              font-size: 12px;
              font-weight: 950;
              line-height: 1.15;
            }

            .route-address {
              font-size: 9px;
              font-weight: 700;
              line-height: 1.35;
            }

            .route-date {
              margin-top: 8px;

              font-size: 8px;
              font-weight: 800;
            }

            .transport {
              display: grid;
              grid-template-columns: 1.1fr 1fr 0.75fr;

              border-bottom: 2px solid #000;
            }

            .transport-item {
              min-height: 59px;

              padding: 7px 8px;

              border-right: 1px solid #000;
            }

            .transport-item:last-child {
              border-right: 0;
            }

            .mini-label {
              display: block;

              margin-bottom: 4px;

              font-size: 6.5px;
              font-weight: 900;

              letter-spacing: 0.07em;
              text-transform: uppercase;
            }

            .mini-value {
              display: block;

              font-size: 10px;
              font-weight: 900;
              line-height: 1.2;
            }

            .barcode-zone {
              padding: 8px 10px 9px;

              border-bottom: 2px solid #000;

              text-align: center;
            }

            .barcode {
              width: 100%;
              height: 46px;

              display: flex;
              align-items: stretch;
              justify-content: center;

              gap: 2px;

              overflow: hidden;
            }

            .barcode span {
              display: block;

              height: 100%;

              background: #000;
            }

            .b1 {
              width: 2px;
            }

            .b2 {
              width: 4px;
            }

            .b3 {
              width: 6px;
            }

            .barcode-text {
              margin-top: 5px;

              font-size: 8px;
              font-weight: 900;

              letter-spacing: 0.19em;
              word-break: break-all;
            }

            .details {
              display: grid;
              grid-template-columns: 1fr 1fr;

              border-bottom: 2px solid #000;
            }

            .detail {
              padding: 7px 9px;

              border-right: 1px solid #000;
            }

            .detail:last-child {
              border-right: 0;
            }

            .detail strong {
              display: block;

              margin-top: 3px;

              font-size: 9px;
              line-height: 1.25;
            }

            .proof {
              padding: 9px 10px 10px;

              flex: 1;
            }

            .proof-title {
              display: flex;
              justify-content: space-between;
              align-items: center;

              margin-bottom: 9px;
            }

            .proof-title strong {
              font-size: 10px;
              font-weight: 950;

              text-transform: uppercase;
            }

            .proof-title span {
              font-size: 6px;
              font-weight: 800;

              letter-spacing: 0.08em;
              text-transform: uppercase;
            }

            .proof-row {
              display: grid;
              grid-template-columns: 1fr 1fr;

              gap: 9px;

              margin-bottom: 9px;
            }

            .field {
              min-height: 29px;

              padding-top: 4px;

              border-bottom: 1px solid #000;
            }

            .field-label {
              font-size: 6px;
              font-weight: 900;

              letter-spacing: 0.05em;
              text-transform: uppercase;
            }

            .signature-box {
              height: 51px;

              margin-top: 4px;

              border: 1px solid #000;
            }

            .notes-box {
              height: 37px;

              margin-top: 4px;

              border: 1px solid #000;
            }

            .footer {
              display: flex;
              align-items: center;
              justify-content: space-between;

              gap: 8px;

              padding: 6px 9px;

              border-top: 2px solid #000;

              font-size: 6px;
              font-weight: 800;

              letter-spacing: 0.05em;
              text-transform: uppercase;
            }

            .footer strong {
              color: #dc143c;
            }

            @media print {
              html,
              body {
                width: 4in;
                height: 6in;
              }

              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>
          <main class="label">
            <section class="header">
              <div class="brand">
                <div class="brand-name">
                  GLORY
                  <span>SOLUTIONS</span>
                </div>

                <div class="brand-subtitle">
                  Transport & logistique
                </div>
              </div>

              <div class="service">
                Livraison
              </div>
            </section>

            <section class="reference-block">
              <div class="reference-label">
                Numéro de bon
              </div>

              <div class="reference-number">
                ${escapeHtml(reference)}
              </div>
            </section>

            <section class="route">
              <div class="route-card">
                <div class="route-title">
                  Ramassage
                </div>

                <div class="route-name">
                  Glory Solutions
                </div>

                <div class="route-address">
                  ${escapeHtml(pickupAddress)}
                </div>

                <div class="route-date">
                  ${escapeHtml(
                    formatDate(note.pickup_date),
                  )}
                </div>
              </div>

              <div class="route-card">
                <div class="route-title">
                  Livraison
                </div>

                <div class="route-name">
                  ${escapeHtml(
                    getClientName(note),
                  )}
                </div>

                <div class="route-address">
                  ${escapeHtml(deliveryAddress)}
                </div>

                <div class="route-date">
                  ${escapeHtml(
                    formatDate(
                      note.delivery_date ||
                        note.created_at,
                    ),
                  )}
                </div>
              </div>
            </section>

            <section class="transport">
              <div class="transport-item">
                <span class="mini-label">
                  Chauffeur
                </span>

                <span class="mini-value">
                  ${escapeHtml(
                    getDriverName(note),
                  )}
                </span>
              </div>

              <div class="transport-item">
                <span class="mini-label">
                  Véhicule
                </span>

                <span class="mini-value">
                  ${escapeHtml(
                    note.vehicle_name,
                  )}
                </span>

                <span
                  class="mini-label"
                  style="margin-top:4px;"
                >
                  Plaque
                </span>

                <span class="mini-value">
                  ${escapeHtml(
                    note.vehicle_plate,
                  )}
                </span>
              </div>

              <div class="transport-item">
                <span class="mini-label">
                  Colis
                </span>

                <span class="mini-value">
                  ${quantity}
                </span>

                <span
                  class="mini-label"
                  style="margin-top:4px;"
                >
                  Poids
                </span>

                <span class="mini-value">
                  ${weight}
                </span>
              </div>
            </section>

            <section class="barcode-zone">
              <div class="barcode">
                <span class="b2"></span>
                <span class="b1"></span>
                <span class="b3"></span>
                <span class="b1"></span>
                <span class="b2"></span>
                <span class="b3"></span>
                <span class="b1"></span>
                <span class="b1"></span>
                <span class="b3"></span>
                <span class="b2"></span>
                <span class="b1"></span>
                <span class="b3"></span>
                <span class="b2"></span>
                <span class="b1"></span>
                <span class="b1"></span>
                <span class="b3"></span>
                <span class="b2"></span>
                <span class="b3"></span>
                <span class="b1"></span>
                <span class="b2"></span>
                <span class="b1"></span>
                <span class="b3"></span>
                <span class="b2"></span>
                <span class="b1"></span>
                <span class="b3"></span>
                <span class="b1"></span>
                <span class="b2"></span>
              </div>

              <div class="barcode-text">
                ${escapeHtml(cleanReference)}
              </div>
            </section>

            <section class="details">
              <div class="detail">
                <span class="mini-label">
                  Description
                </span>

                <strong>
                  ${escapeHtml(
                    note.description,
                  )}
                </strong>
              </div>

              <div class="detail">
                <span class="mini-label">
                  Statut
                </span>

                <strong>
                  ${escapeHtml(
                    getStatusLabel(note.status),
                  )}
                </strong>
              </div>
            </section>

            <section class="proof">
              <div class="proof-title">
                <strong>
                  Preuve de livraison
                </strong>

                <span>
                  À compléter à la réception
                </span>
              </div>

              <div class="proof-row">
                <div class="field">
                  <div class="field-label">
                    Reçu par
                  </div>
                </div>

                <div class="field">
                  <div class="field-label">
                    Date / heure
                  </div>
                </div>
              </div>

              <div class="field-label">
                Signature du destinataire
              </div>

              <div class="signature-box"></div>

              <div
                class="field-label"
                style="margin-top:8px;"
              >
                Observations
              </div>

              <div class="notes-box"></div>
            </section>

            <footer class="footer">
              <span>
                glorysolutions.ca
              </span>

              <strong>
                ${escapeHtml(reference)}
              </strong>

              <span>
                Document logistique
              </span>
            </footer>
          </main>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 300);
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
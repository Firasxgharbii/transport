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
  client_first_name?: string | null;
  client_last_name?: string | null;
  company_name?: string | null;
  client_address?: string | null;
  client_city?: string | null;
  client_province?: string | null;
  client_postal_code?: string | null;
  client_email?: string | null;
  client_phone?: string | null;

  driver_id?: number | string | null;
  driver_name?: string | null;
  driver_first_name?: string | null;
  driver_last_name?: string | null;
  driver_phone?: string | null;
  vehicle_id?: number | string | null;

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

  pickup_time?: string | null;
  delivery_time?: string | null;

  stops?: unknown[];
  timeline?: OrderTimelineItem[];
  proofs?: DeliveryProof[];

  [key: string]: unknown;
};

type DeliveryProof = {
  id?: number | string | null;
  receiver_first_name?: string | null;
  receiver_last_name?: string | null;
  recipient_name?: string | null;
  signature_url?: string | null;
  photo_url?: string | null;
  notes?: string | null;
  delivered_at?: string | null;
  created_at?: string | null;
};

type OrderTimelineItem = {
  id?: number | string | null;
  status?: string | null;
  comment?: string | null;
  created_at?: string | null;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.glorysolutions.ca";

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("glory_token") ||
    sessionStorage.getItem("glory_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  );
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
  const personName = [
    note.client_first_name,
    note.client_last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const companyName =
    String(note.company_name || "").trim();

  const storedClientName =
    String(note.client_name || "").trim();

  // Ignore les placeholders génériques.
  const validStoredClientName =
    storedClientName &&
    !["client", "customer", "destinataire"].includes(
      storedClientName.toLowerCase(),
    )
      ? storedClientName
      : "";

  return (
    companyName ||
    personName ||
    validStoredClientName ||
    "Client non défini"
  );
}

function getClientContactLine(note: DeliveryNote) {
  return [
    note.client_phone,
    note.client_email,
  ]
    .filter(Boolean)
    .join(" • ");
}


function getDriverName(note: DeliveryNote) {
  const fullName = [
    note.driver_first_name,
    note.driver_last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return note.driver_name || fullName || "Non assigné";
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

function formatScheduledDate(
  dateValue?: string | null,
  timeValue?: string | null,
) {
  if (!dateValue) {
    return "—";
  }

  const rawDate = String(dateValue).slice(0, 10);
  const dateParts = rawDate.split("-").map(Number);

  if (
    dateParts.length !== 3 ||
    dateParts.some((part) => !Number.isFinite(part))
  ) {
    return formatDate(dateValue);
  }

  const [year, month, day] = dateParts;

  const safeTime =
    typeof timeValue === "string" && timeValue.trim()
      ? timeValue.trim().slice(0, 5)
      : "";

  const timeParts = safeTime
    ? safeTime.split(":").map(Number)
    : [];

  const hours =
    timeParts.length >= 1 && Number.isFinite(timeParts[0])
      ? timeParts[0]
      : 0;

  const minutes =
    timeParts.length >= 2 && Number.isFinite(timeParts[1])
      ? timeParts[1]
      : 0;

  const localDate = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    0,
  );

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
  };

  if (safeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return new Intl.DateTimeFormat("fr-CA", options).format(localDate);
}


function formatScheduledDateTime(
  dateValue?: string | null,
  timeValue?: string | null,
) {
  return formatScheduledDate(
    dateValue,
    timeValue,
  );
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


function extractSingleDeliveryNote(result: unknown): DeliveryNote | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const object = result as Record<string, unknown>;

  const candidates = [
    object.data,
    object.order,
    object.deliveryNote,
    object.delivery_note,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as DeliveryNote;
    }
  }

  if ("id" in object) {
    return object as DeliveryNote;
  }

  return null;
}

function getProofs(note: DeliveryNote): DeliveryProof[] {
  return Array.isArray(note.proofs)
    ? (note.proofs as DeliveryProof[])
    : [];
}

function getLatestProof(note: DeliveryNote): DeliveryProof | null {
  const proofs = getProofs(note);

  if (!proofs.length) {
    return null;
  }

  return [...proofs].sort((a, b) => {
    const aTime = new Date(
      a.delivered_at || a.created_at || 0,
    ).getTime();

    const bTime = new Date(
      b.delivered_at || b.created_at || 0,
    ).getTime();

    return bTime - aTime;
  })[0];
}

function getReceiverName(proof: DeliveryProof | null) {
  if (!proof) {
    return "—";
  }

  const fullName = [
    proof.receiver_first_name,
    proof.receiver_last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || proof.recipient_name || "—";
}

function getActualDeliveryDate(
  note: DeliveryNote,
  proof: DeliveryProof | null,
) {
  if (proof?.delivered_at) {
    return proof.delivered_at;
  }

  if (Array.isArray(note.timeline)) {
    const completed = [...note.timeline]
      .reverse()
      .find(
        (item) =>
          item &&
          typeof item === "object" &&
          ["completed", "delivered"].includes(
            String((item as OrderTimelineItem).status || "").toLowerCase(),
          ),
      ) as OrderTimelineItem | undefined;

    if (completed?.created_at) {
      return completed.created_at;
    }
  }

  return note.delivery_date || note.updated_at || null;
}


function unwrapObject(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return null;
  }

  const object = result as Record<string, unknown>;

  for (const key of [
    "data",
    "order",
    "client",
    "driver",
    "vehicle",
    "deliveryNote",
    "delivery_note",
  ]) {
    const value = object[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return object;
}

function mergeClientIntoNote(
  note: DeliveryNote,
  client: Record<string, unknown> | null,
): DeliveryNote {
  if (!client) return note;

  const firstName = String(client.first_name || client.client_first_name || "").trim();
  const lastName = String(client.last_name || client.client_last_name || "").trim();
  const company = String(client.company_name || "").trim();

  return {
    ...note,
    client_first_name:
      firstName || note.client_first_name || null,
    client_last_name:
      lastName || note.client_last_name || null,
    company_name:
      company || note.company_name || null,
    client_name:
      String(client.client_name || "").trim() ||
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      note.client_name ||
      null,
    client_email:
      String(client.email || client.client_email || "").trim() ||
      note.client_email ||
      null,
    client_phone:
      String(client.phone || client.client_phone || "").trim() ||
      note.client_phone ||
      null,
    client_address:
      String(client.address || client.client_address || "").trim() ||
      note.client_address ||
      null,
    client_city:
      String(client.city || client.client_city || "").trim() ||
      note.client_city ||
      null,
    client_province:
      String(client.province || client.client_province || "").trim() ||
      note.client_province ||
      null,
    client_postal_code:
      String(client.postal_code || client.client_postal_code || "").trim() ||
      note.client_postal_code ||
      null,
  };
}

function mergeDriverIntoNote(
  note: DeliveryNote,
  driver: Record<string, unknown> | null,
): DeliveryNote {
  if (!driver) return note;

  const firstName = String(driver.first_name || driver.driver_first_name || "").trim();
  const lastName = String(driver.last_name || driver.driver_last_name || "").trim();

  return {
    ...note,
    driver_first_name:
      firstName || note.driver_first_name || null,
    driver_last_name:
      lastName || note.driver_last_name || null,
    driver_name:
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      String(driver.driver_name || "").trim() ||
      note.driver_name ||
      null,
    driver_phone:
      String(driver.phone || driver.driver_phone || "").trim() ||
      note.driver_phone ||
      null,
    vehicle_name:
      String(driver.vehicle_name || "").trim() ||
      note.vehicle_name ||
      null,
    vehicle_plate:
      String(driver.vehicle_plate || "").trim() ||
      note.vehicle_plate ||
      null,
  };
}

function mergeVehicleIntoNote(
  note: DeliveryNote,
  vehicle: Record<string, unknown> | null,
): DeliveryNote {
  if (!vehicle) return note;

  const vehicleName =
    String(vehicle.name || "").trim() ||
    [vehicle.brand, vehicle.make, vehicle.model]
      .filter(Boolean)
      .map(String)
      .join(" ")
      .trim() ||
    String(vehicle.vehicle_number || "").trim();

  return {
    ...note,
    vehicle_name:
      vehicleName || note.vehicle_name || null,
    vehicle_plate:
      String(
        vehicle.plate_number ||
          vehicle.plate ||
          vehicle.license_plate ||
          "",
      ).trim() ||
      note.vehicle_plate ||
      null,
  };
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

  const [printingId, setPrintingId] =
    useState<string | number | null>(null);

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

  const fetchFreshDeliveryNote = useCallback(
    async (id: number | string) => {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Session introuvable. Veuillez vous reconnecter.",
        );
      }

      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };

      const getJson = async (
        path: string,
        required = false,
      ): Promise<unknown> => {
        try {
          const response = await fetch(
            `${API_URL}${path}`,
            {
              method: "GET",
              headers,
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

          if (response.status === 403 && required) {
            throw new Error(
              "Vous n’avez pas la permission d’accéder à cette commande.",
            );
          }

          if (!response.ok) {
            if (required) {
              const object =
                result && typeof result === "object"
                  ? (result as Record<string, unknown>)
                  : null;

              throw new Error(
                object && typeof object.message === "string"
                  ? object.message
                  : `Erreur API (${response.status}).`,
              );
            }

            return null;
          }

          return result;
        } catch (error) {
          if (required) throw error;
          return null;
        }
      };

      // Source principale du bon
      const deliveryResult = await getJson(
        `/api/orders/delivery-notes/${id}`,
        true,
      );

      let freshNote =
        extractSingleDeliveryNote(deliveryResult);

      if (!freshNote) {
        throw new Error(
          "Le serveur n’a retourné aucune commande valide.",
        );
      }

      // Source de secours : détail brut de la commande.
      // Cela garantit que le bon reste synchronisé même si
      // l’endpoint delivery-notes ne renvoie pas tous les champs.
      const orderResult = await getJson(
        `/api/orders/${id}`,
        false,
      );

      const rawOrder = unwrapObject(orderResult);

      if (rawOrder) {
        freshNote = {
          ...freshNote,
          ...(rawOrder as DeliveryNote),
          proofs:
            Array.isArray(rawOrder.proofs)
              ? (rawOrder.proofs as DeliveryProof[])
              : freshNote.proofs,
          timeline:
            Array.isArray(rawOrder.timeline)
              ? (rawOrder.timeline as OrderTimelineItem[])
              : freshNote.timeline,
        };
      }

      // Hydratation du client directement depuis la table clients.
      if (freshNote.client_id) {
        const clientResult = await getJson(
          `/api/clients/${freshNote.client_id}`,
          false,
        );

        freshNote = mergeClientIntoNote(
          freshNote,
          unwrapObject(clientResult),
        );
      }

      // Hydratation du chauffeur directement depuis la table drivers.
      if (freshNote.driver_id) {
        const driverResult = await getJson(
          `/api/drivers/${freshNote.driver_id}`,
          false,
        );

        freshNote = mergeDriverIntoNote(
          freshNote,
          unwrapObject(driverResult),
        );
      }

      // Hydratation du véhicule réellement assigné à la commande.
      if (freshNote.vehicle_id) {
        const vehicleResult = await getJson(
          `/api/vehicles/${freshNote.vehicle_id}`,
          false,
        );

        freshNote = mergeVehicleIntoNote(
          freshNote,
          unwrapObject(vehicleResult),
        );
      }

      return freshNote;
    },
    [],
  );

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

  const escapePrintHtml = (value: unknown) =>
    cleanText(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const openPrintWindow = (
    title: string,
    html: string,
    features = "width=900,height=900",
  ) => {
    const printWindow = window.open(
      "",
      "_blank",
      features,
    );

    if (!printWindow) {
      setError(
        "Le navigateur a bloqué la fenêtre d’impression. Autorisez les fenêtres contextuelles.",
      );
      return;
    }

    printWindow.document.open();
    printWindow.document.write(
      html.replaceAll(
        "__DOCUMENT_TITLE__",
        escapePrintHtml(title),
      ),
    );
    printWindow.document.close();
  };

  /* ==========================================================
     IMPRESSION 4 x 6 — ÉTIQUETTE / BON DE LIVRAISON
  ========================================================== */

  const printDeliveryNote = (
    note: DeliveryNote,
  ) => {
    const latestProof = getLatestProof(note);
    const receiverName = getReceiverName(latestProof);
    const actualDeliveryDate = getActualDeliveryDate(note, latestProof);
    const signatureUrl = latestProof?.signature_url || "";
    const proofNotes = latestProof?.notes || note.notes || "";
    const hasProof = Boolean(
      latestProof?.photo_url || latestProof?.signature_url,
    );

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

    const quantity =
      note.quantity !== null &&
      note.quantity !== undefined
        ? escapePrintHtml(note.quantity)
        : "—";

    const weight =
      note.weight !== null &&
      note.weight !== undefined
        ? `${escapePrintHtml(note.weight)} kg`
        : "—";

    const clientName = getClientName(note);
    const clientContact = getClientContactLine(note);

    const logoUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/images/logo1.png`
        : "/images/logo1.png";

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>__DOCUMENT_TITLE__</title>

          <style>
            @page { size: 4in 6in; margin: 0; }

            * { box-sizing: border-box; }

            html, body {
              width: 4in;
              min-height: 6in;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #111;
              font-family: Arial, Helvetica, sans-serif;
            }

            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .ticket {
              width: 4in;
              min-height: 6in;
              background: #fff;
              border: 1.7px solid #111;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }

            .top {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 11px;
              border-bottom: 1.7px solid #111;
            }

            .brand {
              display: flex;
              align-items: center;
              gap: 7px;
            }

            .brand img {
              width: 42px;
              height: 42px;
              object-fit: contain;
            }

            .brandName {
              font-size: 15px;
              font-weight: 950;
              line-height: .95;
              letter-spacing: -.02em;
            }

            .brandName span { color: #dc143c; }

            .brandSub {
              margin-top: 4px;
              font-size: 5.5px;
              font-weight: 800;
              letter-spacing: .12em;
              text-transform: uppercase;
            }

            .deliveryTag {
              padding: 6px 8px;
              border: 1.5px solid #111;
              border-radius: 3px;
              font-size: 6px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: .05em;
            }

            .ref {
              padding: 8px 11px;
              border-bottom: 1.7px solid #111;
            }

            .label {
              color: #666;
              font-size: 5.5px;
              font-weight: 900;
              letter-spacing: .08em;
              text-transform: uppercase;
            }

            .reference {
              margin-top: 3px;
              font-size: 20px;
              font-weight: 950;
              line-height: 1;
              letter-spacing: -.035em;
            }

            .clientBox {
              padding: 8px 11px;
              border-bottom: 1.7px solid #111;
              background: #fafafa;
            }

            .clientName {
              margin-top: 3px;
              font-size: 13px;
              font-weight: 950;
              line-height: 1.1;
            }

            .clientContact {
              margin-top: 4px;
              font-size: 6.5px;
              font-weight: 700;
              line-height: 1.3;
              color: #444;
            }

            .route {
              display: grid;
              grid-template-columns: 1fr 1fr;
              border-bottom: 1.7px solid #111;
            }

            .routeCard {
              min-height: 92px;
              padding: 8px 9px;
            }

            .routeCard:first-child {
              border-right: 1.7px solid #111;
            }

            .routeTitle {
              font-size: 6px;
              font-weight: 950;
              text-transform: uppercase;
              letter-spacing: .06em;
            }

            .routeName {
              margin-top: 5px;
              font-size: 9px;
              font-weight: 950;
              line-height: 1.15;
            }

            .routeAddress {
              margin-top: 4px;
              font-size: 7px;
              font-weight: 700;
              line-height: 1.3;
            }

            .routeDate {
              margin-top: 6px;
              padding-top: 5px;
              border-top: 1px solid #ddd;
              font-size: 6.5px;
              font-weight: 900;
            }

            .transport {
              display: grid;
              grid-template-columns: 1.2fr 1fr .7fr;
              border-bottom: 1.7px solid #111;
            }

            .cell {
              min-height: 51px;
              padding: 6px 7px;
              border-right: 1px solid #111;
            }

            .cell:last-child { border-right: 0; }

            .value {
              display: block;
              margin-top: 3px;
              font-size: 8px;
              font-weight: 900;
              line-height: 1.2;
            }

            .barcodeZone {
              padding: 6px 9px;
              border-bottom: 1.7px solid #111;
              text-align: center;
            }

            .barcode {
              height: 30px;
              display: flex;
              justify-content: center;
              align-items: stretch;
              gap: 1.7px;
              overflow: hidden;
            }

            .barcode span { display: block; background: #111; }
            .b1 { width: 2px; }
            .b2 { width: 4px; }
            .b3 { width: 6px; }

            .barcodeText {
              margin-top: 3px;
              font-size: 6px;
              font-weight: 900;
              letter-spacing: .14em;
            }

            .desc {
              display: grid;
              grid-template-columns: 1.2fr .8fr;
              border-bottom: 1.7px solid #111;
            }

            .descCell {
              min-height: 42px;
              padding: 6px 8px;
              border-right: 1px solid #111;
            }

            .descCell:last-child { border-right: 0; }

            .descValue {
              margin-top: 3px;
              font-size: 7.5px;
              font-weight: 800;
              line-height: 1.25;
            }

            .proof {
              flex: 1;
              padding: 7px 9px;
            }

            .proofHead {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 6px;
              margin-bottom: 6px;
            }

            .proofHead strong {
              font-size: 8px;
              font-weight: 950;
              text-transform: uppercase;
            }

            .proofBadge {
              font-size: 5px;
              font-weight: 900;
              text-transform: uppercase;
              color: ${hasProof ? "#078554" : "#a26800"};
            }

            .proofMeta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 7px;
              margin-bottom: 5px;
            }

            .proofField {
              min-height: 26px;
              padding: 4px 5px;
              border: 1px solid #bbb;
              border-radius: 3px;
            }

            .proofValue {
              margin-top: 2px;
              font-size: 6.5px;
              font-weight: 900;
              line-height: 1.2;
            }

            .proofBottom {
              display: grid;
              grid-template-columns: 1fr 1.15fr;
              gap: 7px;
            }

            .signature {
              height: 43px;
              margin-top: 3px;
              border: 1px solid #bbb;
              border-radius: 3px;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }

            .signature img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }

            .notes {
              height: 43px;
              margin-top: 3px;
              padding: 4px;
              border: 1px solid #bbb;
              border-radius: 3px;
              font-size: 5.8px;
              line-height: 1.25;
              overflow: hidden;
            }

            .footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 5px 8px;
              border-top: 1.7px solid #111;
              font-size: 4.8px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: .04em;
            }

            .footer strong { color: #dc143c; }

            @media print {
              html, body { width: 4in; height: 6in; }
            }
          </style>
        </head>

        <body>
          <main class="ticket">
            <section class="top">
              <div class="brand">
                <img src="${logoUrl}" alt="Glory Solutions" />
                <div>
                  <div class="brandName">
                    GLORY <span>SOLUTIONS</span>
                  </div>
                  <div class="brandSub">
                    Transport & logistique
                  </div>
                </div>
              </div>

              <div class="deliveryTag">
                Bon de livraison
              </div>
            </section>

            <section class="ref">
              <div class="label">Numéro de bon</div>
              <div class="reference">
                ${escapePrintHtml(reference)}
              </div>
            </section>

            <section class="clientBox">
              <div class="label">Client / destinataire</div>
              <div class="clientName">
                ${escapePrintHtml(clientName)}
              </div>
              ${
                clientContact
                  ? `<div class="clientContact">${escapePrintHtml(clientContact)}</div>`
                  : ""
              }
            </section>

            <section class="route">
              <div class="routeCard">
                <div class="routeTitle">Ramassage</div>
                <div class="routeName">Glory Solutions</div>
                <div class="routeAddress">
                  ${escapePrintHtml(pickupAddress)}
                </div>
                <div class="routeDate">
                  ${escapePrintHtml(formatScheduledDateTime(note.pickup_date, note.pickup_time))}
                </div>
              </div>

              <div class="routeCard">
                <div class="routeTitle">Livraison</div>
                <div class="routeName">
                  ${escapePrintHtml(clientName)}
                </div>
                <div class="routeAddress">
                  ${escapePrintHtml(deliveryAddress)}
                </div>
                <div class="routeDate">
                  ${escapePrintHtml(formatScheduledDateTime(note.delivery_date, note.delivery_time))}
                </div>
              </div>
            </section>

            <section class="transport">
              <div class="cell">
                <span class="label">Chauffeur</span>
                <span class="value">
                  ${escapePrintHtml(getDriverName(note))}
                </span>
              </div>

              <div class="cell">
                <span class="label">Véhicule</span>
                <span class="value">
                  ${escapePrintHtml(note.vehicle_name)}
                </span>
                <span class="label" style="display:block;margin-top:4px;">Plaque</span>
                <span class="value">
                  ${escapePrintHtml(note.vehicle_plate)}
                </span>
              </div>

              <div class="cell">
                <span class="label">Colis</span>
                <span class="value">${quantity}</span>
                <span class="label" style="display:block;margin-top:4px;">Poids</span>
                <span class="value">${weight}</span>
              </div>
            </section>

            <section class="barcodeZone">
              <div class="barcode">
                <span class="b2"></span><span class="b1"></span><span class="b3"></span>
                <span class="b1"></span><span class="b2"></span><span class="b3"></span>
                <span class="b1"></span><span class="b1"></span><span class="b3"></span>
                <span class="b2"></span><span class="b1"></span><span class="b3"></span>
                <span class="b2"></span><span class="b1"></span><span class="b1"></span>
                <span class="b3"></span><span class="b2"></span><span class="b3"></span>
                <span class="b1"></span><span class="b2"></span><span class="b1"></span>
                <span class="b3"></span><span class="b2"></span><span class="b1"></span>
              </div>
              <div class="barcodeText">
                ${escapePrintHtml(cleanReference)}
              </div>
            </section>

            <section class="desc">
              <div class="descCell">
                <div class="label">Description</div>
                <div class="descValue">
                  ${escapePrintHtml(note.description)}
                </div>
              </div>

              <div class="descCell">
                <div class="label">Statut</div>
                <div class="descValue">
                  ${escapePrintHtml(getStatusLabel(note.status))}
                </div>
              </div>
            </section>

            <section class="proof">
              <div class="proofHead">
                <strong>Preuve de livraison</strong>
                <span class="proofBadge">
                  ${hasProof ? "Preuve enregistrée" : "En attente"}
                </span>
              </div>

              <div class="proofMeta">
                <div class="proofField">
                  <div class="label">Reçu par</div>
                  <div class="proofValue">
                    ${escapePrintHtml(receiverName)}
                  </div>
                </div>

                <div class="proofField">
                  <div class="label">Date / heure réelle</div>
                  <div class="proofValue">
                    ${escapePrintHtml(formatDate(actualDeliveryDate))}
                  </div>
                </div>
              </div>

              <div class="proofBottom">
                <div>
                  <div class="label">Signature</div>
                  <div class="signature">
                    ${
                      signatureUrl
                        ? `<img src="${escapePrintHtml(signatureUrl)}" alt="Signature" />`
                        : ""
                    }
                  </div>
                </div>

                <div>
                  <div class="label">Observations</div>
                  <div class="notes">
                    ${escapePrintHtml(proofNotes)}
                  </div>
                </div>
              </div>
            </section>

            <footer class="footer">
              <span>glorysolutions.ca</span>
              <strong>${escapePrintHtml(reference)}</strong>
              <span>Document logistique</span>
            </footer>
          </main>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 350);
            };
          </script>
        </body>
      </html>
    `;

    openPrintWindow(
      `Bon de livraison ${reference}`,
      html,
      "width=650,height=900",
    );
  };

  /* ==========================================================
     IMPRESSION A4 — BILL OF LADING / CONNAISSEMENT
     Original Glory Solutions
  ========================================================== */

  const printBillOfLading = (
    note: DeliveryNote,
  ) => {
    const latestProof = getLatestProof(note);
    const receiverName = getReceiverName(latestProof);
    const actualDeliveryDate = getActualDeliveryDate(note, latestProof);
    const signatureUrl = latestProof?.signature_url || "";
    const proofNotes = latestProof?.notes || "";
    const hasProof = Boolean(
      latestProof?.photo_url || latestProof?.signature_url,
    );

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
    const bolNumber = `BOL-${String(note.id).padStart(6, "0")}`;

    const logoUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/images/logo1.png`
        : "/images/logo1.png";

    const quantity =
      note.quantity !== null &&
      note.quantity !== undefined
        ? escapePrintHtml(note.quantity)
        : "—";

    const weight =
      note.weight !== null &&
      note.weight !== undefined
        ? `${escapePrintHtml(note.weight)} kg`
        : "—";

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />
          <title>__DOCUMENT_TITLE__</title>

          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #111;
              font-family: Arial, Helvetica, sans-serif;
            }

            body {
              padding: 0;
            }

            .sheet {
              width: 100%;
              max-width: 190mm;
              margin: 0 auto;
              border: 1.5px solid #111;
              background: #fff;
            }

            .top {
              display: grid;
              grid-template-columns: 1.1fr .9fr;
              border-bottom: 1.5px solid #111;
            }

            .brand {
              display: flex;
              align-items: center;
              gap: 14px;
              min-height: 86px;
              padding: 14px 16px;
              border-right: 1.5px solid #111;
            }

            .logo {
              width: 64px;
              height: 64px;
              object-fit: contain;
            }

            .logo-fallback {
              display: none;
              font-size: 18px;
              font-weight: 950;
              line-height: .95;
            }

            .logo-fallback span {
              display: block;
              color: #dc143c;
            }

            .brand h1 {
              margin: 0;
              font-size: 27px;
              line-height: 1;
              letter-spacing: -.03em;
              text-transform: uppercase;
            }

            .brand h1 span {
              color: #dc143c;
            }

            .brand p {
              margin: 6px 0 0;
              color: #666;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: .08em;
              text-transform: uppercase;
            }

            .titleBox {
              display: grid;
              grid-template-rows: 1fr auto;
            }

            .title {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              padding: 13px 16px;
            }

            .title h2 {
              margin: 0;
              font-size: 25px;
              letter-spacing: -.03em;
              text-transform: uppercase;
            }

            .badge {
              padding: 7px 10px;
              border: 1.5px solid #111;
              font-size: 9px;
              font-weight: 900;
              text-transform: uppercase;
            }

            .docMeta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              border-top: 1px solid #111;
            }

            .metaCell {
              min-height: 52px;
              padding: 8px 10px;
              border-right: 1px solid #111;
            }

            .metaCell:last-child {
              border-right: 0;
            }

            .label {
              display: block;
              margin-bottom: 4px;
              color: #555;
              font-size: 7px;
              font-weight: 900;
              letter-spacing: .07em;
              text-transform: uppercase;
            }

            .value {
              display: block;
              font-size: 11px;
              font-weight: 800;
              line-height: 1.35;
            }

            .referenceStrip {
              display: grid;
              grid-template-columns: 1.2fr 1fr 1fr;
              border-bottom: 1.5px solid #111;
            }

            .refCell {
              min-height: 64px;
              padding: 10px 12px;
              border-right: 1px solid #111;
            }

            .refCell:last-child {
              border-right: 0;
            }

            .refBig {
              font-size: 17px;
              font-weight: 950;
              letter-spacing: -.02em;
            }

            .parties {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              border-bottom: 1.5px solid #111;
            }

            .party {
              min-height: 150px;
              padding: 12px;
              border-right: 1px solid #111;
            }

            .party:last-child {
              border-right: 0;
            }

            .partyTitle {
              margin-bottom: 8px;
              font-size: 8px;
              font-weight: 950;
              letter-spacing: .08em;
              text-transform: uppercase;
            }

            .partyName {
              margin-bottom: 6px;
              font-size: 12px;
              font-weight: 950;
            }

            .partyText {
              font-size: 10px;
              font-weight: 650;
              line-height: 1.45;
              white-space: pre-line;
            }

            .table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            .tableWrap {
              border-bottom: 1.5px solid #111;
            }

            .table th,
            .table td {
              padding: 8px 7px;
              border-right: 1px solid #111;
              border-bottom: 1px solid #111;
              text-align: left;
              vertical-align: top;
            }

            .table th:last-child,
            .table td:last-child {
              border-right: 0;
            }

            .table tr:last-child td {
              border-bottom: 0;
            }

            .table th {
              background: #f3f3f3;
              font-size: 7px;
              font-weight: 900;
              letter-spacing: .05em;
              text-transform: uppercase;
            }

            .table td {
              min-height: 44px;
              font-size: 9px;
              line-height: 1.35;
            }

            .summaryRow {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              border-bottom: 1.5px solid #111;
            }

            .summaryCell {
              min-height: 52px;
              padding: 9px 11px;
              border-right: 1px solid #111;
            }

            .summaryCell:last-child {
              border-right: 0;
            }

            .instructions {
              min-height: 78px;
              padding: 10px 12px;
              border-bottom: 1.5px solid #111;
            }

            .instructionsText {
              font-size: 9px;
              line-height: 1.45;
              white-space: pre-line;
            }

            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              border-bottom: 1.5px solid #111;
            }

            .signature {
              min-height: 96px;
              padding: 10px 12px;
              border-right: 1px solid #111;
            }

            .signature:last-child {
              border-right: 0;
            }

            .signatureLine {
              height: 42px;
              margin-top: 12px;
              border-bottom: 1px solid #111;
              display: flex;
              align-items: flex-end;
              justify-content: center;
              overflow: hidden;
            }

            .signatureLine img {
              display: block;
              max-width: 100%;
              max-height: 40px;
              object-fit: contain;
            }

            .proofInfo {
              margin-top: 6px;
              color: #333;
              font-size: 7px;
              font-weight: 750;
              line-height: 1.35;
            }

            .signatureMeta {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              margin-top: 5px;
              color: #555;
              font-size: 7px;
              font-weight: 800;
              text-transform: uppercase;
            }

            .terms {
              padding: 12px 14px 14px;
            }

            .terms h3 {
              margin: 0 0 7px;
              font-size: 9px;
              text-transform: uppercase;
            }

            .terms p {
              margin: 0;
              color: #555;
              font-size: 7.5px;
              line-height: 1.45;
            }

            .footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 12px;
              padding: 8px 12px;
              border-top: 1.5px solid #111;
              font-size: 7px;
              font-weight: 800;
              letter-spacing: .05em;
              text-transform: uppercase;
            }

            .footer strong {
              color: #dc143c;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>
          <main class="sheet">
            <section class="top">
              <div class="brand">
                <img
                  class="logo"
                  src="${logoUrl}"
                  alt="Glory Solutions"
                  onerror="
                    this.style.display='none';
                    this.nextElementSibling.style.display='block';
                  "
                />

                <div class="logo-fallback">
                  GLORY
                  <span>SOLUTIONS</span>
                </div>

                <div>
                  <h1>
                    Glory <span>Solutions</span>
                  </h1>

                  <p>
                    Transport & logistique
                  </p>
                </div>
              </div>

              <div class="titleBox">
                <div class="title">
                  <h2>Bill of Lading</h2>

                  <div class="badge">
                    Original
                  </div>
                </div>

                <div class="docMeta">
                  <div class="metaCell">
                    <span class="label">
                      BOL Number
                    </span>

                    <span class="value">
                      ${escapePrintHtml(bolNumber)}
                    </span>
                  </div>

                  <div class="metaCell">
                    <span class="label">
                      Order Number
                    </span>

                    <span class="value">
                      ${escapePrintHtml(reference)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section class="referenceStrip">
              <div class="refCell">
                <span class="label">
                  Pickup Date
                </span>

                <span class="refBig">
                  ${escapePrintHtml(
                    formatScheduledDate(note.pickup_date, note.pickup_time),
                  )}
                </span>
              </div>

              <div class="refCell">
                <span class="label">
                  Driver
                </span>

                <span class="value">
                  ${escapePrintHtml(
                    getDriverName(note),
                  )}
                </span>

                <span
                  class="label"
                  style="margin-top:8px;"
                >
                  Phone
                </span>

                <span class="value">
                  ${escapePrintHtml(
                    note.driver_phone,
                  )}
                </span>
              </div>

              <div class="refCell">
                <span class="label">
                  Vehicle
                </span>

                <span class="value">
                  ${escapePrintHtml(
                    note.vehicle_name,
                  )}
                </span>

                <span
                  class="label"
                  style="margin-top:8px;"
                >
                  Plate
                </span>

                <span class="value">
                  ${escapePrintHtml(
                    note.vehicle_plate,
                  )}
                </span>
              </div>
            </section>

            <section class="parties">
              <div class="party">
                <div class="partyTitle">
                  Shipper / Expéditeur
                </div>

                <div class="partyName">
                  Glory Solutions
                </div>

                <div class="partyText">
                  ${escapePrintHtml(pickupAddress)}
                </div>

                <span
                  class="label"
                  style="margin-top:10px;"
                >
                  Pickup
                </span>

                <div class="partyText">
                  ${escapePrintHtml(
                    formatScheduledDate(note.pickup_date, note.pickup_time),
                  )}
                </div>
              </div>

              <div class="party">
                <div class="partyTitle">
                  Consignee / Destinataire
                </div>

                <div class="partyName">
                  ${escapePrintHtml(
                    getClientName(note),
                  )}
                </div>

                <div class="partyText">
                  ${escapePrintHtml(deliveryAddress)}
                </div>

                <span
                  class="label"
                  style="margin-top:10px;"
                >
                  Contact
                </span>

                <div class="partyText">
                  ${escapePrintHtml(
                    note.client_phone,
                  )}
                  ${escapePrintHtml(
                    note.client_email,
                  )}
                </div>
              </div>

              <div class="party">
                <div class="partyTitle">
                  Bill Freight To / Facturation
                </div>

                <div class="partyName">
                  ${escapePrintHtml(
                    getClientName(note),
                  )}
                </div>

                <div class="partyText">
                  ${escapePrintHtml(deliveryAddress)}
                </div>

                <span
                  class="label"
                  style="margin-top:10px;"
                >
                  Status
                </span>

                <div class="partyText">
                  ${escapePrintHtml(
                    getStatusLabel(note.status),
                  )}
                </div>
              </div>
            </section>

            <section class="tableWrap">
              <table class="table">
                <thead>
                  <tr>
                    <th style="width:10%;">
                      Type
                    </th>

                    <th style="width:10%;">
                      Pieces
                    </th>

                    <th style="width:47%;">
                      Description / Special Marks
                    </th>

                    <th style="width:15%;">
                      Class
                    </th>

                    <th style="width:18%;">
                      Weight
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>
                      Freight
                    </td>

                    <td>
                      ${quantity}
                    </td>

                    <td>
                      ${escapePrintHtml(
                        note.description,
                      )}
                    </td>

                    <td>
                      General
                    </td>

                    <td>
                      ${weight}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section class="summaryRow">
              <div class="summaryCell">
                <span class="label">
                  Total Pieces
                </span>

                <span class="value">
                  ${quantity}
                </span>
              </div>

              <div class="summaryCell">
                <span class="label">
                  Total Weight
                </span>

                <span class="value">
                  ${weight}
                </span>
              </div>

              <div class="summaryCell">
                <span class="label">
                  Delivery Date
                </span>

                <span class="value">
                  ${escapePrintHtml(
                    formatDate(actualDeliveryDate),
                  )}
                </span>
              </div>
            </section>

            <section class="instructions">
              <span class="label">
                Special Instructions / Instructions spéciales
              </span>

              <div class="instructionsText">
                ${escapePrintHtml(note.notes)}
                ${
                  proofNotes
                    ? `<br /><strong>Preuve de livraison :</strong> ${escapePrintHtml(proofNotes)}`
                    : ""
                }
              </div>
            </section>

            <section class="signatures">
              <div class="signature">
                <span class="label">
                  Shipper / Expéditeur
                </span>

                <div class="signatureLine"></div>

                <div class="signatureMeta">
                  <span>Signature</span>
                  <span>Date</span>
                </div>
              </div>

              <div class="signature">
                <span class="label">
                  Carrier / Transporteur
                </span>

                <div class="signatureLine"></div>

                <div class="signatureMeta">
                  <span>Signature</span>
                  <span>Date</span>
                </div>
              </div>

              <div class="signature">
                <span class="label">
                  Consignee / Destinataire
                </span>

                <div class="signatureLine">
                  ${
                    signatureUrl
                      ? `<img src="${escapePrintHtml(signatureUrl)}" alt="Signature du destinataire" />`
                      : ""
                  }
                </div>

                <div class="signatureMeta">
                  <span>${escapePrintHtml(receiverName)}</span>
                  <span>${escapePrintHtml(formatDate(actualDeliveryDate))}</span>
                </div>

                <div class="proofInfo">
                  ${hasProof ? "Preuve électronique enregistrée" : "Preuve de livraison en attente"}
                </div>
              </div>
            </section>

            <section class="terms">
              <h3>
                Conditions de transport
              </h3>

              <p>
                Ce document confirme les renseignements de transport
                associés à la commande indiquée ci-dessus. Les marchandises,
                quantités, poids, adresses et instructions doivent être
                vérifiés par les parties avant l’acceptation. Les conditions
                commerciales, responsabilités, assurances, limitations et
                modalités applicables demeurent celles prévues par l’entente
                de transport en vigueur entre les parties. Toute anomalie
                apparente doit être signalée au moment de la prise en charge
                ou de la livraison.
              </p>
            </section>

            <footer class="footer">
              <span>
                glorysolutions.ca
              </span>

              <strong>
                ${escapePrintHtml(bolNumber)}
              </strong>

              <span>
                Glory Solutions • Transport & Logistique
              </span>
            </footer>
          </main>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 450);
            };
          </script>
        </body>
      </html>
    `;

    openPrintWindow(
      `Bill of Lading ${bolNumber}`,
      html,
      "width=1100,height=950",
    );
  };

  const handlePrintDeliveryNote = async (
    note: DeliveryNote,
  ) => {
    try {
      setPrintingId(note.id);
      setError("");

      const freshNote =
        await fetchFreshDeliveryNote(note.id);

      setNotes((current) =>
        current.map((item) =>
          String(item.id) === String(freshNote.id)
            ? { ...item, ...freshNote }
            : item,
        ),
      );

      if (
        selectedNote &&
        String(selectedNote.id) === String(freshNote.id)
      ) {
        setSelectedNote(freshNote);
      }

      printDeliveryNote(freshNote);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d’imprimer le bon de livraison.",
      );
    } finally {
      setPrintingId(null);
    }
  };

  const handlePrintBillOfLading = async (
    note: DeliveryNote,
  ) => {
    try {
      setPrintingId(note.id);
      setError("");

      const freshNote =
        await fetchFreshDeliveryNote(note.id);

      setNotes((current) =>
        current.map((item) =>
          String(item.id) === String(freshNote.id)
            ? { ...item, ...freshNote }
            : item,
        ),
      );

      if (
        selectedNote &&
        String(selectedNote.id) === String(freshNote.id)
      ) {
        setSelectedNote(freshNote);
      }

      printBillOfLading(freshNote);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d’imprimer le Bill of Lading.",
      );
    } finally {
      setPrintingId(null);
    }
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

        .bolIconButton {
          background: #17131d;
          border-color: #17131d;
          color: white;
        }

        .bolIconButton:hover {
          background: #2b2430;
          border-color: #2b2430;
          color: white;
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

        .secondaryPrintButton {
          min-height: 42px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #17131d;
          border-radius: 10px;
          background: #17131d;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        .secondaryPrintButton:hover {
          background: #2c2531;
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

                            <button
                              type="button"
                              className="iconButton bolIconButton"
                              title="Imprimer le Bill of Lading"
                              onClick={() =>
                                printBillOfLading(
                                  note,
                                )
                              }
                            >
                              <FileCheck2
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
                  className="secondaryPrintButton"
                  onClick={() =>
                    printBillOfLading(
                      selectedNote,
                    )
                  }
                >
                  <FileCheck2 size={17} />
                  Imprimer le BOL
                </button>

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
                  Imprimer le bon 4×6
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
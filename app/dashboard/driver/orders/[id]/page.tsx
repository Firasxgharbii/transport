"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  Truck,
  User,
} from "lucide-react";

import styles from "./order-details.module.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ============================================================
   TYPES
============================================================ */

type Order = {
  id: number;
  order_number?: string;

  status?: string;
  priority?: string;

  client_first_name?: string;
  client_last_name?: string;
  company_name?: string;
  client_phone?: string;
  client_email?: string;

  pickup_address?: string;
  delivery_address?: string;

  pickup_date?: string | null;
  pickup_time?: string | null;

  delivery_date?: string | null;
  delivery_time?: string | null;

  notes?: string;

  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
};

/* ============================================================
   HELPERS
============================================================ */

function statusLabel(status?: string) {
  switch (status) {
    case "pending":
      return "En attente";

    case "assigned":
      return "Assignée";

    case "pickup_in_progress":
      return "Ramassage en cours";

    case "picked_up":
      return "Ramassée";

    case "delivery_in_progress":
      return "Livraison en cours";

    case "arrived":
      return "Arrivé";

    case "completed":
      return "Terminée";

    case "cancelled":
      return "Annulée";

    case "incident":
      return "Incident";

    default:
      return status || "En attente";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Non définie";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  return value.slice(0, 5);
}

function clientName(order: Order) {
  if (order.company_name) {
    return order.company_name;
  }

  const name = [
    order.client_first_name,
    order.client_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return name || "Client";
}

/* ============================================================
   PROCHAIN STATUT
============================================================ */

function getNextAction(status?: string) {
  switch (status) {
    case "pending":
    case "assigned":
      return {
        status: "pickup_in_progress",
        label: "Commencer le ramassage",
        description: "Je pars vers le point de ramassage",
      };

    case "pickup_in_progress":
      return {
        status: "picked_up",
        label: "Colis ramassé",
        description: "Confirmer que la marchandise est chargée",
      };

    case "picked_up":
      return {
        status: "delivery_in_progress",
        label: "Commencer la livraison",
        description: "Je pars vers l'adresse de livraison",
      };

    case "delivery_in_progress":
      return {
        status: "arrived",
        label: "Je suis arrivé",
        description: "Confirmer l'arrivée chez le client",
      };

    case "arrived":
      return {
        status: "completed",
        label: "Terminer la livraison",
        description: "Confirmer que la livraison est terminée",
      };

    default:
      return null;
  }
}

/* ============================================================
   PAGE
============================================================ */

export default function DriverOrderDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const orderId = String(params.id || "");

  const [order, setOrder] = useState<Order | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [updating, setUpdating] = useState(false);

  const [sharingLocation, setSharingLocation] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  /* ==========================================================
     CHARGER LA COMMANDE
  ========================================================== */

  const loadOrder = useCallback(async () => {
    const token = localStorage.getItem("glory_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setError("");

      /*
       * Cette route suppose que ton backend possède :
       * GET /api/orders/:id
       */

      const response = await fetch(
        `${API_URL}/api/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("glory_token");
          localStorage.removeItem("glory_user");

          router.replace("/login");
          return;
        }

        throw new Error(
          result.message ||
            "Impossible de récupérer cette livraison.",
        );
      }

      const receivedOrder =
        result.order || result.data || result;

      setOrder(receivedOrder);
    } catch (err) {
      console.error("Erreur loadOrder :", err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger la livraison.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [loadOrder, orderId]);

  /* ==========================================================
     CHANGER LE STATUT
  ========================================================== */

  const updateStatus = async (newStatus: string) => {
    if (!order) return;

    const token = localStorage.getItem("glory_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setUpdating(true);
      setError("");
      setSuccess("");

      /*
       * Cette route doit correspondre à ton backend.
       *
       * Si ton orderRoutes utilise PATCH au lieu de PUT,
       * remplace simplement PUT par PATCH.
       */

      const response = await fetch(
        `${API_URL}/api/orders/${order.id}/status`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Impossible de modifier le statut.",
        );
      }

      setOrder((current) =>
        current
          ? {
              ...current,
              status: newStatus,
            }
          : current,
      );

      setSuccess("Statut de la livraison mis à jour.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error("Erreur updateStatus :", err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier le statut.",
      );
    } finally {
      setUpdating(false);
    }
  };

  /* ==========================================================
     GPS
  ========================================================== */

  const sendLocation = () => {
    if (!navigator.geolocation) {
      setError(
        "La géolocalisation n'est pas disponible sur cet appareil.",
      );

      return;
    }

    const token = localStorage.getItem("glory_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setSharingLocation(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `${API_URL}/api/tracking/location`,
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },

              body: JSON.stringify({
                order_id: order?.id || null,

                latitude: position.coords.latitude,
                longitude: position.coords.longitude,

                accuracy: position.coords.accuracy,

                speed:
                  position.coords.speed !== null
                    ? position.coords.speed
                    : null,

                heading:
                  position.coords.heading !== null
                    ? position.coords.heading
                    : null,

                recorded_at: new Date().toISOString(),
              }),
            },
          );

          const result = await response.json();

          if (!response.ok) {
            throw new Error(
              result.message ||
                "Impossible d'envoyer votre position.",
            );
          }

          setSuccess("Position GPS envoyée avec succès.");

          setTimeout(() => {
            setSuccess("");
          }, 3000);
        } catch (err) {
          console.error("Erreur GPS :", err);

          setError(
            err instanceof Error
              ? err.message
              : "Impossible d'envoyer votre position.",
          );
        } finally {
          setSharingLocation(false);
        }
      },

      (locationError) => {
        console.error("Erreur geolocation :", locationError);

        setSharingLocation(false);

        if (locationError.code === 1) {
          setError(
            "Vous devez autoriser Glory Solutions à utiliser votre position.",
          );

          return;
        }

        setError("Impossible d'obtenir votre position GPS.");
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      },
    );
  };

  /* ==========================================================
     GOOGLE / APPLE MAPS
  ========================================================== */

  const openNavigation = (address?: string) => {
    if (!address) return;

    const destination = encodeURIComponent(address);

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <Loader2 className={styles.spinner} size={38} />

        <p>Chargement de la livraison...</p>
      </main>
    );
  }

  /* ==========================================================
     NOT FOUND
  ========================================================== */

  if (!order) {
    return (
      <main className={styles.loadingPage}>
        <AlertTriangle size={40} />

        <h1>Livraison introuvable</h1>

        <p>{error || "Cette livraison n'existe pas."}</p>

        <button
          type="button"
          onClick={() =>
            router.push("/dashboard/driver/orders")
          }
        >
          Retour
        </button>
      </main>
    );
  }

  const nextAction = getNextAction(order.status);

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <main className={styles.page}>
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className={styles.header}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() =>
            router.push("/dashboard/driver/orders")
          }
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>

        <div className={styles.headerText}>
          <span>GLORY SOLUTIONS</span>

          <h1>
            {order.order_number || `Commande #${order.id}`}
          </h1>

          <p>Détails de votre livraison</p>
        </div>

        <button
          type="button"
          className={styles.iconButton}
          onClick={() => {
            setRefreshing(true);
            loadOrder();
          }}
          disabled={refreshing}
          aria-label="Actualiser"
        >
          <RefreshCw
            size={19}
            className={refreshing ? styles.spinner : ""}
          />
        </button>
      </header>

      {/* ======================================================
          STATUS
      ====================================================== */}

      <section className={styles.statusCard}>
        <div className={styles.statusIcon}>
          <Truck size={23} />
        </div>

        <div>
          <span>STATUT ACTUEL</span>

          <strong>{statusLabel(order.status)}</strong>
        </div>
      </section>

      {/* ======================================================
          SUCCESS / ERROR
      ====================================================== */}

      {success && (
        <div className={styles.success}>
          <CheckCircle2 size={18} />

          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <AlertTriangle size={18} />

          <span>{error}</span>
        </div>
      )}

      {/* ======================================================
          CLIENT
      ====================================================== */}

      <section className={styles.card}>
        <div className={styles.sectionTitle}>
          <User size={18} />

          <h2>Client</h2>
        </div>

        <div className={styles.clientRow}>
          <div>
            <span>Nom</span>

            <strong>{clientName(order)}</strong>
          </div>

          {order.client_phone && (
            <a
              href={`tel:${order.client_phone}`}
              className={styles.phoneButton}
            >
              <Phone size={17} />
              Appeler
            </a>
          )}
        </div>
      </section>

      {/* ======================================================
          RAMASSAGE
      ====================================================== */}

      <section className={styles.card}>
        <div className={styles.locationHeader}>
          <div className={styles.locationIcon}>
            <PackageCheck size={20} />
          </div>

          <div>
            <span>RAMASSAGE</span>

            <h2>Point de départ</h2>
          </div>
        </div>

        <div className={styles.address}>
          <MapPin size={18} />

          <strong>
            {order.pickup_address ||
              "Adresse de ramassage non disponible"}
          </strong>
        </div>

        <div className={styles.dateGrid}>
          <div>
            <CalendarDays size={16} />

            <span>{formatDate(order.pickup_date)}</span>
          </div>

          <div>
            <Clock3 size={16} />

            <span>{formatTime(order.pickup_time)}</span>
          </div>
        </div>

        {order.pickup_address && (
          <button
            type="button"
            className={styles.navigationButton}
            onClick={() =>
              openNavigation(order.pickup_address)
            }
          >
            <Navigation size={18} />

            Navigation vers le ramassage

            <ChevronRight size={17} />
          </button>
        )}
      </section>

      {/* ======================================================
          LIVRAISON
      ====================================================== */}

      <section className={styles.card}>
        <div className={styles.locationHeader}>
          <div className={styles.locationIcon}>
            <MapPin size={20} />
          </div>

          <div>
            <span>LIVRAISON</span>

            <h2>Destination</h2>
          </div>
        </div>

        <div className={styles.address}>
          <MapPin size={18} />

          <strong>
            {order.delivery_address ||
              "Adresse de livraison non disponible"}
          </strong>
        </div>

        <div className={styles.dateGrid}>
          <div>
            <CalendarDays size={16} />

            <span>{formatDate(order.delivery_date)}</span>
          </div>

          <div>
            <Clock3 size={16} />

            <span>{formatTime(order.delivery_time)}</span>
          </div>
        </div>

        {order.delivery_address && (
          <button
            type="button"
            className={styles.navigationButton}
            onClick={() =>
              openNavigation(order.delivery_address)
            }
          >
            <Navigation size={18} />

            Navigation vers le client

            <ChevronRight size={17} />
          </button>
        )}
      </section>

      {/* ======================================================
          VÉHICULE
      ====================================================== */}

      <section className={styles.card}>
        <div className={styles.sectionTitle}>
          <Truck size={18} />

          <h2>Véhicule</h2>
        </div>

        <div className={styles.vehicle}>
          <strong>
            {[order.vehicle_make, order.vehicle_model]
              .filter(Boolean)
              .join(" ") || "Véhicule non assigné"}
          </strong>

          {order.vehicle_plate && (
            <span>{order.vehicle_plate}</span>
          )}
        </div>
      </section>

      {/* ======================================================
          NOTES
      ====================================================== */}

      {order.notes && (
        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <AlertTriangle size={18} />

            <h2>Instructions</h2>
          </div>

          <p className={styles.notes}>{order.notes}</p>
        </section>
      )}

      {/* ======================================================
          GPS
      ====================================================== */}

      <section className={styles.card}>
        <div className={styles.sectionTitle}>
          <Navigation size={18} />

          <h2>Position GPS</h2>
        </div>

        <p className={styles.helperText}>
          Envoyez votre position afin que Glory Solutions puisse
          suivre la livraison.
        </p>

        <button
          type="button"
          className={styles.gpsButton}
          onClick={sendLocation}
          disabled={sharingLocation}
        >
          {sharingLocation ? (
            <>
              <Loader2 className={styles.spinner} size={18} />
              Localisation...
            </>
          ) : (
            <>
              <Navigation size={18} />
              Envoyer ma position
            </>
          )}
        </button>
      </section>

      {/* ======================================================
          ACTION PRINCIPALE
      ====================================================== */}

      {nextAction && (
        <section className={styles.actionCard}>
          <div>
            <span>PROCHAINE ÉTAPE</span>

            <h2>{nextAction.label}</h2>

            <p>{nextAction.description}</p>
          </div>

          <button
            type="button"
            className={styles.primaryButton}
            disabled={updating}
            onClick={() =>
              updateStatus(nextAction.status)
            }
          >
            {updating ? (
              <>
                <Loader2 className={styles.spinner} size={19} />
                Mise à jour...
              </>
            ) : (
              <>
                <CheckCircle2 size={19} />
                {nextAction.label}
              </>
            )}
          </button>
        </section>
      )}

      {order.status === "completed" && (
        <section className={styles.completedCard}>
          <CheckCircle2 size={30} />

          <div>
            <strong>Livraison terminée</strong>

            <p>
              Cette livraison a été complétée avec succès.
            </p>
          </div>
        </section>
      )}

      <div className={styles.bottomSpace} />
    </main>
  );
}
"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import styles from "./driver-details.module.css";

/* ============================================================
   CONFIGURATION
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* ============================================================
   TYPES
============================================================ */

type DriverAvailability =
  | "available"
  | "busy"
  | "on_break"
  | "offline";

type Driver = {
  id: number;
  user_id?: number;

  first_name?: string;
  last_name?: string;

  email?: string;
  phone?: string | null;

  status?: string;

  availability_status?:
    | DriverAvailability
    | string;

  profile_photo_url?: string | null;

  license_number?: string | null;
  license_expiry?: string | null;

  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;

  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;

  vehicle_id?: number | null;
  vehicle_name?: string | null;
  vehicle_plate?: string | null;

  current_orders?: number;
  completed_orders?: number;
  total_orders?: number;

  remaining_stops?: number;

  last_seen_at?: string | null;
  created_at?: string | null;
};

type Order = {
  id: number;

  order_number?: string;
  reference?: string;

  status?: string;

  pickup_address?: string;
  delivery_address?: string;

  pickup_date?: string | null;
  delivery_date?: string | null;

  client_name?: string;
  company_name?: string | null;
};

type DriverResponse = {
  success?: boolean;

  driver?: Driver;
  data?: Driver;

  message?: string;
};

type OrdersResponse = {
  success?: boolean;

  orders?: Order[];
  data?: Order[];

  message?: string;
};

/* ============================================================
   HELPERS
============================================================ */

function getToken() {
  if (
    typeof window === "undefined"
  ) {
    return "";
  }

  return (
    localStorage.getItem(
      "glory_token",
    ) || ""
  );
}

function driverName(
  driver: Driver,
) {
  const name = [
    driver.first_name,
    driver.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    name ||
    `Chauffeur #${driver.id}`
  );
}

function initials(
  driver: Driver,
) {
  const first =
    driver.first_name
      ?.charAt(0) || "";

  const last =
    driver.last_name
      ?.charAt(0) || "";

  return (
    `${first}${last}`.toUpperCase() ||
    "CH"
  );
}

function availabilityLabel(
  value?: string,
) {
  switch (value) {
    case "available":
      return "Disponible";

    case "busy":
      return "En livraison";

    case "on_break":
      return "En pause";

    case "offline":
      return "Hors ligne";

    default:
      return "Non défini";
  }
}

function orderStatusLabel(
  value?: string,
) {
  switch (value) {
    case "pending":
      return "En attente";

    case "assigned":
      return "Assignée";

    case "pickup_in_progress":
      return "Ramassage en cours";

    case "picked_up":
      return "Ramassée";

    case "delivery_in_progress":
      return "En livraison";

    case "arrived":
      return "Arrivé";

    case "completed":
      return "Terminée";

    case "incident":
      return "Incident";

    case "cancelled":
      return "Annulée";

    default:
      return (
        value ||
        "Non défini"
      );
  }
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Non disponible";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Non disponible";
  }

  return new Intl.DateTimeFormat(
    "fr-CA",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function simpleDate(
  value?: string | null,
) {
  if (!value) {
    return "Non définie";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-CA",
    {
      dateStyle: "medium",
    },
  ).format(date);
}

function fullAddress(
  driver: Driver,
) {
  return [
    driver.address,
    driver.city,
    driver.province,
    driver.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

/* ============================================================
   PAGE
============================================================ */

export default function AdminDriverDetailsPage() {
  const router =
    useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const driverId =
    Number(params.id);

  const [
    driver,
    setDriver,
  ] = useState<Driver | null>(
    null,
  );

  const [
    orders,
    setOrders,
  ] = useState<Order[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /* ==========================================================
     FETCH AUTHENTIFIÉ
  ========================================================== */

  const authenticatedFetch =
    useCallback(
      async <T,>(
        endpoint: string,
      ): Promise<T> => {
        const token =
          getToken();

        if (!token) {
          router.replace(
            "/login",
          );

          throw new Error(
            "Votre session a expiré.",
          );
        }

        const response =
          await fetch(
            `${API_URL}${endpoint}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              cache:
                "no-store",
            },
          );

        let result:
          | unknown = null;

        try {
          result =
            await response.json();
        } catch {
          result = null;
        }

        if (
          response.status ===
          401
        ) {
          localStorage.removeItem(
            "glory_token",
          );

          localStorage.removeItem(
            "glory_user",
          );

          router.replace(
            "/login",
          );

          throw new Error(
            "Votre session a expiré.",
          );
        }

        if (!response.ok) {
          throw new Error(
            (
              result as {
                message?: string;
              } | null
            )?.message ||
              "Une erreur est survenue.",
          );
        }

        return result as T;
      },
      [router],
    );

  /* ==========================================================
     CHARGER LE CHAUFFEUR
  ========================================================== */

  const loadDriver =
    useCallback(async () => {
      if (
        !Number.isInteger(
          driverId,
        ) ||
        driverId <= 0
      ) {
        setError(
          "Identifiant du chauffeur invalide.",
        );

        setLoading(false);
        setRefreshing(false);

        return;
      }

      try {
        setError("");

        /* ------------------------------------------------------
           PROFIL
        ------------------------------------------------------ */

        const driverResult =
          await authenticatedFetch<DriverResponse>(
            `/api/drivers/${driverId}`,
          );

        const receivedDriver =
          driverResult.driver ||
          driverResult.data ||
          null;

        if (!receivedDriver) {
          throw new Error(
            "Chauffeur introuvable.",
          );
        }

        setDriver(
          receivedDriver,
        );

        /* ------------------------------------------------------
           COMMANDES
        ------------------------------------------------------ */

        try {
          const orderResult =
            await authenticatedFetch<OrdersResponse>(
              `/api/orders/driver/${driverId}`,
            );

          const receivedOrders =
            Array.isArray(
              orderResult.orders,
            )
              ? orderResult.orders
              : Array.isArray(
                    orderResult.data,
                  )
                ? orderResult.data
                : [];

          setOrders(
            receivedOrders,
          );
        } catch (
          orderError
        ) {
          console.warn(
            "Commandes du chauffeur non disponibles :",
            orderError,
          );

          setOrders([]);
        }
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger le chauffeur.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [
      authenticatedFetch,
      driverId,
    ]);

  useEffect(() => {
    void loadDriver();
  }, [loadDriver]);

  /* ==========================================================
     STATS
  ========================================================== */

  const completedOrders =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            order.status ===
            "completed",
        ).length,
      [orders],
    );

  const activeOrders =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            ![
              "completed",
              "cancelled",
            ].includes(
              order.status || "",
            ),
        ).length,
      [orders],
    );

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <main
        className={
          styles.loadingPage
        }
      >
        <Loader2
          size={38}
          className={
            styles.spin
          }
        />

        <h1>
          Chargement du chauffeur
        </h1>

        <p>
          Récupération du profil...
        </p>
      </main>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (!driver) {
    return (
      <main
        className={
          styles.page
        }
      >
        <div
          className={
            styles.errorBanner
          }
        >
          <AlertTriangle
            size={18}
          />

          <span>
            {error ||
              "Chauffeur introuvable."}
          </span>
        </div>

        <Link
          href="/dashboard/admin/drivers"
          className={
            styles.backButton
          }
        >
          <ArrowLeft
            size={17}
          />

          Retour aux chauffeurs
        </Link>
      </main>
    );
  }

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <main
      className={
        styles.page
      }
    >
      {/* ======================================================
          TOP BAR
      ====================================================== */}

      <div
        className={
          styles.topBar
        }
      >
        <Link
          href="/dashboard/admin/drivers"
          className={
            styles.backButton
          }
        >
          <ArrowLeft
            size={18}
          />

          Retour aux chauffeurs
        </Link>

        <button
          type="button"
          className={
            styles.refreshButton
          }
          disabled={
            refreshing
          }
          onClick={() => {
            setRefreshing(
              true,
            );

            void loadDriver();
          }}
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? styles.spin
                : ""
            }
          />

          Actualiser
        </button>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div
          className={
            styles.errorBanner
          }
        >
          <AlertTriangle
            size={18}
          />

          <span>
            {error}
          </span>
        </div>
      )}

      {/* ======================================================
          PROFILE HERO
      ====================================================== */}

      <section
        className={
          styles.profileCard
        }
      >
        <div
          className={
            styles.avatar
          }
        >
          {initials(
            driver,
          )}
        </div>

        <div
          className={
            styles.profileInfo
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            <ShieldCheck
              size={14}
            />

            Profil chauffeur
          </span>

          <h1>
            {driverName(
              driver,
            )}
          </h1>

          <p>
            Chauffeur Glory Solutions · ID #{driver.id}
          </p>

          <div
            className={
              styles.profileBadges
            }
          >
            <span
              className={
                driver.availability_status ===
                "available"
                  ? styles.statusAvailable
                  : driver.availability_status ===
                      "busy"
                    ? styles.statusBusy
                    : driver.availability_status ===
                        "on_break"
                      ? styles.statusBreak
                      : styles.statusOffline
              }
            >
              {availabilityLabel(
                driver.availability_status,
              )}
            </span>

            <span
              className={
                styles.accountBadge
              }
            >
              Compte{" "}
              {driver.status ||
                "actif"}
            </span>
          </div>
        </div>

        <Link
          href={`/dashboard/admin/drivers/live-map`}
          className={
            styles.mapButton
          }
        >
          <MapPin
            size={17}
          />

          Voir sur la carte
        </Link>
      </section>

      {/* ======================================================
          STATS
      ====================================================== */}

      <section
        className={
          styles.statsGrid
        }
      >
        <StatCard
          label="Commandes"
          value={
            orders.length
          }
          icon={
            <Truck
              size={20}
            />
          }
        />

        <StatCard
          label="Actives"
          value={
            activeOrders
          }
          icon={
            <Clock3
              size={20}
            />
          }
        />

        <StatCard
          label="Terminées"
          value={
            completedOrders
          }
          icon={
            <CheckCircle2
              size={20}
            />
          }
        />

        <StatCard
          label="Arrêts restants"
          value={
            driver.remaining_stops ||
            0
          }
          icon={
            <MapPin
              size={20}
            />
          }
        />
      </section>

      {/* ======================================================
          INFORMATIONS
      ====================================================== */}

      <section
        className={
          styles.panel
        }
      >
        <div
          className={
            styles.panelHeader
          }
        >
          <div>
            <span>
              Profil
            </span>

            <h2>
              Informations personnelles
            </h2>
          </div>

          <UserRound
            size={21}
          />
        </div>

        <div
          className={
            styles.detailsGrid
          }
        >
          <DetailItem
            icon={
              <Mail
                size={17}
              />
            }
            label="Courriel"
            value={
              driver.email ||
              "Non fourni"
            }
          />

          <DetailItem
            icon={
              <Phone
                size={17}
              />
            }
            label="Téléphone"
            value={
              driver.phone ||
              "Non fourni"
            }
          />

          <DetailItem
            icon={
              <MapPin
                size={17}
              />
            }
            label="Adresse"
            value={
              fullAddress(
                driver,
              ) ||
              "Non fournie"
            }
          />

          <DetailItem
            icon={
              <Clock3
                size={17}
              />
            }
            label="Dernière activité"
            value={
              formatDate(
                driver.last_seen_at,
              )
            }
          />
        </div>
      </section>

      {/* ======================================================
          PERMIS
      ====================================================== */}

      <section
        className={
          styles.panel
        }
      >
        <div
          className={
            styles.panelHeader
          }
        >
          <div>
            <span>
              Documents
            </span>

            <h2>
              Permis de conduire
            </h2>
          </div>

          <ShieldCheck
            size={21}
          />
        </div>

        <div
          className={
            styles.detailsGrid
          }
        >
          <DetailItem
            icon={
              <ShieldCheck
                size={17}
              />
            }
            label="Numéro de permis"
            value={
              driver.license_number ||
              "Non fourni"
            }
          />

          <DetailItem
            icon={
              <CalendarDays
                size={17}
              />
            }
            label="Date d'expiration"
            value={
              simpleDate(
                driver.license_expiry,
              )
            }
          />
        </div>
      </section>

      {/* ======================================================
          VEHICLE
      ====================================================== */}

      <section
        className={
          styles.panel
        }
      >
        <div
          className={
            styles.panelHeader
          }
        >
          <div>
            <span>
              Véhicule
            </span>

            <h2>
              Véhicule assigné
            </h2>
          </div>

          <Truck
            size={21}
          />
        </div>

        <div
          className={
            styles.vehicleCard
          }
        >
          <div
            className={
              styles.vehicleIcon
            }
          >
            <Truck
              size={24}
            />
          </div>

          <div>
            <strong>
              {driver.vehicle_name ||
                "Aucun véhicule assigné"}
            </strong>

            <span>
              {driver.vehicle_plate ||
                "Plaque non disponible"}
            </span>
          </div>
        </div>
      </section>

      {/* ======================================================
          EMERGENCY
      ====================================================== */}

      <section
        className={
          styles.panel
        }
      >
        <div
          className={
            styles.panelHeader
          }
        >
          <div>
            <span>
              Sécurité
            </span>

            <h2>
              Contact d'urgence
            </h2>
          </div>

          <Phone
            size={21}
          />
        </div>

        <div
          className={
            styles.emergencyCard
          }
        >
          <div>
            <strong>
              {driver.emergency_contact_name ||
                "Non renseigné"}
            </strong>

            <span>
              Contact d'urgence
            </span>
          </div>

          {driver.emergency_contact_phone && (
            <a
              href={`tel:${driver.emergency_contact_phone}`}
              className={
                styles.callButton
              }
            >
              <Phone
                size={17}
              />

              Appeler
            </a>
          )}
        </div>
      </section>

      {/* ======================================================
          ORDERS
      ====================================================== */}

      <section
        className={
          styles.panel
        }
      >
        <div
          className={
            styles.panelHeader
          }
        >
          <div>
            <span>
              Activité
            </span>

            <h2>
              Commandes du chauffeur
            </h2>
          </div>

          <Truck
            size={21}
          />
        </div>

        {orders.length ===
        0 ? (
          <div
            className={
              styles.emptyState
            }
          >
            <Truck
              size={32}
            />

            <strong>
              Aucune commande
            </strong>

            <p>
              Ce chauffeur n'a aucune commande assignée.
            </p>
          </div>
        ) : (
          <div
            className={
              styles.ordersList
            }
          >
            {orders.map(
              (order) => (
                <article
                  key={
                    order.id
                  }
                  className={
                    styles.orderCard
                  }
                >
                  <div
                    className={
                      styles.orderHeader
                    }
                  >
                    <div>
                      <small>
                        COMMANDE
                      </small>

                      <strong>
                        {order.order_number ||
                          order.reference ||
                          `#${order.id}`}
                      </strong>
                    </div>

                    <span
                      className={
                        styles.orderStatus
                      }
                    >
                      {orderStatusLabel(
                        order.status,
                      )}
                    </span>
                  </div>

                  <div
                    className={
                      styles.orderRoute
                    }
                  >
                    <div>
                      <MapPin
                        size={15}
                      />

                      <span>
                        {order.pickup_address ||
                          "Ramassage non défini"}
                      </span>
                    </div>

                    <div>
                      <MapPin
                        size={15}
                      />

                      <span>
                        {order.delivery_address ||
                          "Livraison non définie"}
                      </span>
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <div
        className={
          styles.bottomSpace
        }
      />
    </main>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <article
      className={
        styles.statCard
      }
    >
      <span>
        {icon}
      </span>

      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>
      </div>
    </article>
  );
}

/* ============================================================
   DETAIL
============================================================ */

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className={
        styles.detailItem
      }
    >
      <span
        className={
          styles.detailIcon
        }
      >
        {icon}
      </span>

      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
}
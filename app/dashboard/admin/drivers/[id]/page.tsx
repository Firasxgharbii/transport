"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Battery,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  RefreshCw,
  Route,
  ShieldCheck,
  Truck,
  UserRound,
  X,
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

/* =====================================================
   TYPES
===================================================== */

type DriverAvailability =
  | "available"
  | "busy"
  | "offline"
  | "on_break";

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

  vehicle_name?: string | null;
  vehicle_plate?: string | null;

  onfleet_worker_id?: string | null;

  last_seen_at?: string | null;

  latitude?: number | string | null;
  longitude?: number | string | null;

  speed?: number | string | null;
  heading?: number | string | null;
  accuracy?: number | string | null;
  battery_level?: number | null;

  total_orders?: number;
  completed_orders?: number;
  active_orders?: number;
  remaining_stops?: number;

  created_at?: string;
  updated_at?: string;
};

type Order = {
  id: number;

  order_number?: string;

  client_id?: number;
  driver_id?: number | null;

  client_name?: string;
  client_first_name?: string;
  client_last_name?: string;
  company_name?: string | null;

  pickup_address?: string;
  delivery_address?: string;

  pickup_date?: string;
  scheduled_date?: string;

  status?: string;

  total_amount?: number | string | null;

  stop_count?: number;
  completed_stops?: number;

  created_at?: string;
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

type TabName =
  | "profile"
  | "orders"
  | "map"
  | "documents"
  | "performance";

/* =====================================================
   CONFIGURATION
===================================================== */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* =====================================================
   UTILITAIRES
===================================================== */

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.localStorage.getItem(
      "glory_token",
    ) || ""
  );
}

function getInitials(
  firstName?: string,
  lastName?: string,
) {
  const firstInitial =
    firstName?.charAt(0) || "";

  const lastInitial =
    lastName?.charAt(0) || "";

  return (
    `${firstInitial}${lastInitial}`.toUpperCase() ||
    "CH"
  );
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Non disponible";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
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

function getAvailabilityLabel(
  status?: string,
) {
  switch (status) {
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

function getOrderStatusLabel(
  status?: string,
) {
  switch (status) {
    case "pending":
      return "En attente";

    case "assigned":
      return "Assignée";

    case "pickup_in_progress":
      return "Ramassage";

    case "picked_up":
      return "Récupérée";

    case "delivery_in_progress":
      return "En livraison";

    case "arrived":
      return "Arrivée";

    case "completed":
      return "Terminée";

    case "cancelled":
      return "Annulée";

    case "incident":
      return "Incident";

    default:
      return status || "Inconnu";
  }
}

function getClientName(
  order: Order,
) {
  const composedName = [
    order.client_first_name,
    order.client_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    order.client_name ||
    order.company_name ||
    composedName ||
    `Client #${order.client_id || "—"}`
  );
}

function getOrderStatusClass(
  status?: string,
) {
  switch (status) {
    case "completed":
      return styles.orderCompleted;

    case "cancelled":
    case "incident":
      return styles.orderDanger;

    case "delivery_in_progress":
    case "pickup_in_progress":
    case "picked_up":
      return styles.orderProgress;

    default:
      return styles.orderPending;
  }
}

/* =====================================================
   PAGE
===================================================== */

export default function DriverDetailsPage() {
  const params =
    useParams<{ id: string }>();

  const router = useRouter();

  const driverId =
    Number(params.id);

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<TabName>("profile");

  const [driver, setDriver] =
    useState<Driver | null>(null);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /* =====================================================
     FETCH AUTHENTIFIÉ
  ===================================================== */

  const authenticatedFetch =
    useCallback(
      async <T,>(
        endpoint: string,
        options: RequestInit = {},
      ): Promise<T> => {
        const token = getToken();

        if (!token) {
          router.replace("/login");

          throw new Error(
            "Votre session a expiré.",
          );
        }

        const response =
          await fetch(
            `${API_URL}${endpoint}`,
            {
              ...options,

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,

                ...options.headers,
              },

              cache: "no-store",
            },
          );

        let responseData:
          | unknown = null;

        try {
          responseData =
            await response.json();
        } catch {
          responseData = null;
        }

        if (
          response.status === 401
        ) {
          window.localStorage.removeItem(
            "glory_token",
          );

          window.localStorage.removeItem(
            "glory_user",
          );

          router.replace("/login");

          throw new Error(
            "Votre session a expiré.",
          );
        }

        if (!response.ok) {
          const errorResponse =
            responseData as {
              message?: string;
            } | null;

          throw new Error(
            errorResponse?.message ||
              "Une erreur est survenue.",
          );
        }

        return responseData as T;
      },
      [router],
    );

  /* =====================================================
     CHARGER LE CHAUFFEUR
  ===================================================== */

  const loadDriverDetails =
    useCallback(async () => {
      if (
        !Number.isInteger(driverId) ||
        driverId <= 0
      ) {
        setError(
          "Identifiant du chauffeur invalide.",
        );

        setLoading(false);

        return;
      }

      setLoading(true);
      setError("");

      try {
        const [
          driverResult,
          ordersResult,
        ] =
          await Promise.allSettled([
            authenticatedFetch<DriverResponse>(
              `/api/drivers/${driverId}`,
            ),

            authenticatedFetch<OrdersResponse>(
              `/api/drivers/${driverId}/orders`,
            ),
          ]);

        if (
          driverResult.status ===
          "rejected"
        ) {
          throw driverResult.reason;
        }

        const receivedDriver =
          driverResult.value.driver ||
          driverResult.value.data ||
          null;

        if (!receivedDriver) {
          throw new Error(
            "Chauffeur introuvable.",
          );
        }

        setDriver(receivedDriver);

        if (
          ordersResult.status ===
          "fulfilled"
        ) {
          const receivedOrders =
            Array.isArray(
              ordersResult.value.orders,
            )
              ? ordersResult.value
                  .orders
              : Array.isArray(
                    ordersResult.value.data,
                  )
                ? ordersResult.value
                    .data
                : [];

          setOrders(receivedOrders);
        } else {
          setOrders([]);
        }
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger le profil.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      authenticatedFetch,
      driverId,
    ]);

  useEffect(() => {
    void loadDriverDetails();
  }, [loadDriverDetails]);

  /* =====================================================
     STATISTIQUES
  ===================================================== */

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

  const activeOrders = useMemo(
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

  const totalStops = useMemo(
    () =>
      orders.reduce(
        (total, order) =>
          total +
          Number(
            order.stop_count || 0,
          ),
        0,
      ),
    [orders],
  );

  const completedStops =
    useMemo(
      () =>
        orders.reduce(
          (total, order) =>
            total +
            Number(
              order.completed_stops ||
                0,
            ),
          0,
        ),
      [orders],
    );

  const remainingStops =
    Math.max(
      totalStops -
        completedStops,
      0,
    );

  /* =====================================================
     MODIFIER LA DISPONIBILITÉ
  ===================================================== */

  const updateAvailability =
    async (
      availabilityStatus:
        DriverAvailability,
    ) => {
      if (!driver) {
        return;
      }

      setActionLoading(true);
      setError("");
      setSuccess("");

      try {
        await authenticatedFetch(
          `/api/drivers/${driver.id}`,
          {
            method: "PUT",

            body: JSON.stringify({
              availability_status:
                availabilityStatus,
            }),
          },
        );

        setDriver(
          (currentDriver) =>
            currentDriver
              ? {
                  ...currentDriver,
                  availability_status:
                    availabilityStatus,
                }
              : currentDriver,
        );

        setSuccess(
          "La disponibilité du chauffeur a été mise à jour.",
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de modifier le statut.",
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* =====================================================
     CHARGEMENT
  ===================================================== */

  if (loading) {
    return (
      <main
        className={
          styles.loadingPage
        }
      >
        <Loader2
          className={styles.spin}
          size={38}
        />

        <h1>
          Chargement du chauffeur
        </h1>

        <p>
          Récupération du profil et
          des commandes...
        </p>
      </main>
    );
  }

  if (!driver) {
    return (
      <main
        className={styles.page}
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
          <ArrowLeft size={17} />
          Retour aux chauffeurs
        </Link>
      </main>
    );
  }

  /* =====================================================
     AFFICHAGE
  ===================================================== */

  return (
    <main
      className={styles.page}
    >
      <div
        className={styles.topBar}
      >
        <Link
          href="/dashboard/admin/drivers"
          className={
            styles.backButton
          }
        >
          <ArrowLeft size={17} />
          Retour
        </Link>

        <button
          type="button"
          className={
            styles.refreshButton
          }
          onClick={() =>
            void loadDriverDetails()
          }
        >
          <RefreshCw size={17} />
          Actualiser
        </button>
      </div>

      {error && (
        <div
          className={
            styles.errorBanner
          }
        >
          <AlertTriangle
            size={18}
          />

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div
          className={
            styles.successBanner
          }
        >
          <CheckCircle2
            size={18}
          />

          <span>{success}</span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section
        className={
          styles.profileHeader
        }
      >
        <div
          className={styles.identity}
        >
          <div
            className={styles.avatar}
          >
            {driver.profile_photo_url ? (
              <img
                src={
                  driver.profile_photo_url
                }
                alt={`${driver.first_name || ""} ${driver.last_name || ""}`}
              />
            ) : (
              getInitials(
                driver.first_name,
                driver.last_name,
              )
            )}
          </div>

          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              <ShieldCheck
                size={15}
              />
              Chauffeur #{driver.id}
            </span>

            <h1>
              {driver.first_name ||
                "Chauffeur"}{" "}
              {driver.last_name || ""}
            </h1>

            <p>
              {driver.vehicle_name ||
                "Aucun véhicule assigné"}

              {driver.vehicle_plate
                ? ` · ${driver.vehicle_plate}`
                : ""}
            </p>
          </div>
        </div>

        <div
          className={
            styles.profileActions
          }
        >
          <select
            value={
              driver.availability_status ||
              "offline"
            }
            onChange={(event) =>
              void updateAvailability(
                event.target
                  .value as DriverAvailability,
              )
            }
            disabled={actionLoading}
            className={
              styles.statusSelect
            }
          >
            <option value="available">
              Disponible
            </option>

            <option value="busy">
              En livraison
            </option>

            <option value="on_break">
              En pause
            </option>

            <option value="offline">
              Hors ligne
            </option>
          </select>

          <span
            className={`${styles.availabilityBadge} ${
              driver.availability_status ===
              "available"
                ? styles.available
                : driver.availability_status ===
                    "busy"
                  ? styles.busy
                  : driver.availability_status ===
                      "on_break"
                    ? styles.break
                    : styles.offline
            }`}
          >
            {getAvailabilityLabel(
              driver.availability_status,
            )}
          </span>
        </div>
      </section>

      <section
        className={
          styles.statsGrid
        }
      >
        <StatCard
          label="Commandes"
          value={orders.length}
          icon={
            <PackageCheck
              size={20}
            />
          }
        />

        <StatCard
          label="En cours"
          value={activeOrders}
          icon={<Truck size={20} />}
        />

        <StatCard
          label="Terminées"
          value={completedOrders}
          icon={
            <CheckCircle2
              size={20}
            />
          }
        />

        <StatCard
          label="Arrêts restants"
          value={remainingStops}
          icon={<Route size={20} />}
        />
      </section>

      <nav
        className={styles.tabs}
      >
        <TabButton
          active={
            activeTab === "profile"
          }
          onClick={() =>
            setActiveTab("profile")
          }
          icon={<UserRound size={17} />}
          label="Profil"
        />

        <TabButton
          active={
            activeTab === "orders"
          }
          onClick={() =>
            setActiveTab("orders")
          }
          icon={
            <PackageCheck
              size={17}
            />
          }
          label="Commandes"
        />

        <TabButton
          active={
            activeTab === "map"
          }
          onClick={() =>
            setActiveTab("map")
          }
          icon={<MapPin size={17} />}
          label="Carte en direct"
        />

        <TabButton
          active={
            activeTab ===
            "documents"
          }
          onClick={() =>
            setActiveTab(
              "documents",
            )
          }
          icon={<FileText size={17} />}
          label="Documents"
        />

        <TabButton
          active={
            activeTab ===
            "performance"
          }
          onClick={() =>
            setActiveTab(
              "performance",
            )
          }
          icon={<Route size={17} />}
          label="Performance"
        />
      </nav>

      {activeTab === "profile" && (
        <ProfileTab driver={driver} />
      )}

      {activeTab === "orders" && (
        <OrdersTab orders={orders} />
      )}

      {activeTab === "map" && (
        <MapTab
          driver={driver}
          remainingStops={
            remainingStops
          }
        />
      )}

      {activeTab ===
        "documents" && (
        <DocumentsTab
          driver={driver}
        />
      )}

      {activeTab ===
        "performance" && (
        <PerformanceTab
          totalOrders={orders.length}
          completedOrders={
            completedOrders
          }
          activeOrders={
            activeOrders
          }
          totalStops={totalStops}
          completedStops={
            completedStops
          }
        />
      )}
    </main>
  );
}

/* =====================================================
   ONGLET PROFIL
===================================================== */

function ProfileTab({
  driver,
}: {
  driver: Driver;
}) {
  return (
    <section
      className={styles.panel}
    >
      <div
        className={
          styles.panelHeader
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            Profil
          </span>

          <h2>
            Informations personnelles
          </h2>
        </div>
      </div>

      <div
        className={styles.infoGrid}
      >
        <InfoItem
          icon={<Mail size={17} />}
          label="Courriel"
          value={
            driver.email ||
            "Non fourni"
          }
        />

        <InfoItem
          icon={<Phone size={17} />}
          label="Téléphone"
          value={
            driver.phone ||
            "Non fourni"
          }
        />

        <InfoItem
          icon={<Truck size={17} />}
          label="Véhicule"
          value={
            driver.vehicle_name ||
            "Non assigné"
          }
        />

        <InfoItem
          icon={<Truck size={17} />}
          label="Plaque"
          value={
            driver.vehicle_plate ||
            "Non fournie"
          }
        />

        <InfoItem
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

        <InfoItem
          icon={<Clock3 size={17} />}
          label="Expiration du permis"
          value={formatDate(
            driver.license_expiry,
          )}
        />

        <InfoItem
          icon={<MapPin size={17} />}
          label="Adresse"
          value={
            [
              driver.address,
              driver.city,
              driver.province,
              driver.postal_code,
            ]
              .filter(Boolean)
              .join(", ") ||
            "Non fournie"
          }
        />

        <InfoItem
          icon={<Phone size={17} />}
          label="Contact d’urgence"
          value={
            [
              driver.emergency_contact_name,
              driver.emergency_contact_phone,
            ]
              .filter(Boolean)
              .join(" · ") ||
            "Non fourni"
          }
        />

        <InfoItem
          icon={<Clock3 size={17} />}
          label="Dernière activité"
          value={formatDate(
            driver.last_seen_at,
          )}
        />

        <InfoItem
          icon={
            <UserRound size={17} />
          }
          label="Date d’inscription"
          value={formatDate(
            driver.created_at,
          )}
        />

        <InfoItem
          icon={<Navigation size={17} />}
          label="Identifiant Onfleet"
          value={
            driver.onfleet_worker_id ||
            "Non connecté"
          }
        />

        <InfoItem
          icon={
            <ShieldCheck
              size={17}
            />
          }
          label="Statut du compte"
          value={
            driver.status ||
            "Non défini"
          }
        />
      </div>
    </section>
  );
}

/* =====================================================
   ONGLET COMMANDES
===================================================== */

function OrdersTab({
  orders,
}: {
  orders: Order[];
}) {
  return (
    <section
      className={styles.panel}
    >
      <div
        className={
          styles.panelHeader
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            Opérations
          </span>

          <h2>
            Commandes assignées
          </h2>
        </div>

        <span
          className={
            styles.countBadge
          }
        >
          {orders.length} commande
          {orders.length > 1
            ? "s"
            : ""}
        </span>
      </div>

      {orders.length === 0 ? (
        <div
          className={
            styles.emptyState
          }
        >
          <PackageCheck
            size={36}
          />

          <h3>
            Aucune commande assignée
          </h3>

          <p>
            Les commandes de ce
            chauffeur apparaîtront ici.
          </p>
        </div>
      ) : (
        <div
          className={
            styles.tableWrapper
          }
        >
          <table
            className={styles.table}
          >
            <thead>
              <tr>
                <th>Commande</th>
                <th>Client</th>
                <th>Ramassage</th>
                <th>Livraison</th>
                <th>Arrêts</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {orders.map(
                (order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/dashboard/admin/orders/${order.id}`}
                      >
                        {order.order_number ||
                          `CMD-${order.id}`}
                      </Link>
                    </td>

                    <td>
                      {getClientName(
                        order,
                      )}
                    </td>

                    <td>
                      <span
                        className={
                          styles.addressCell
                        }
                      >
                        {order.pickup_address ||
                          "Non définie"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          styles.addressCell
                        }
                      >
                        {order.delivery_address ||
                          "Non définie"}
                      </span>
                    </td>

                    <td>
                      {Number(
                        order.completed_stops ||
                          0,
                      )}{" "}
                      /{" "}
                      {Number(
                        order.stop_count ||
                          0,
                      )}
                    </td>

                    <td>
                      <span
                        className={`${styles.orderStatus} ${getOrderStatusClass(
                          order.status,
                        )}`}
                      >
                        {getOrderStatusLabel(
                          order.status,
                        )}
                      </span>
                    </td>

                    <td>
                      {formatDate(
                        order.pickup_date ||
                          order.scheduled_date ||
                          order.created_at,
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* =====================================================
   ONGLET CARTE
===================================================== */

function MapTab({
  driver,
  remainingStops,
}: {
  driver: Driver;
  remainingStops: number;
}) {
  const hasLocation =
    driver.latitude !== null &&
    driver.latitude !== undefined &&
    driver.longitude !== null &&
    driver.longitude !== undefined;

  return (
    <section
      className={styles.mapPanel}
    >
      <div
        className={
          styles.panelHeader
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            Suivi en direct
          </span>

          <h2>
            Localisation du chauffeur
          </h2>
        </div>

        <span
          className={
            styles.onfleetBadge
          }
        >
          {driver.onfleet_worker_id
            ? "Onfleet connecté"
            : "Onfleet non connecté"}
        </span>
      </div>

      <div
        className={
          styles.mapPlaceholder
        }
      >
        <MapPin size={48} />

        <h3>
          {hasLocation
            ? "Position GPS disponible"
            : "Aucune position GPS disponible"}
        </h3>

        <p>
          La carte interactive sera
          activée après la connexion
          avec Onfleet.
        </p>

        {hasLocation && (
          <a
            href={`https://www.google.com/maps?q=${driver.latitude},${driver.longitude}`}
            target="_blank"
            rel="noreferrer"
            className={
              styles.mapsLink
            }
          >
            <Navigation size={17} />
            Ouvrir dans Google Maps
          </a>
        )}
      </div>

      <div
        className={
          styles.liveStats
        }
      >
        <LiveStat
          icon={<MapPin size={17} />}
          label="Position"
          value={
            hasLocation
              ? `${driver.latitude}, ${driver.longitude}`
              : "Non disponible"
          }
        />

        <LiveStat
          icon={<Clock3 size={17} />}
          label="Dernière mise à jour"
          value={formatDate(
            driver.last_seen_at,
          )}
        />

        <LiveStat
          icon={
            <Navigation size={17} />
          }
          label="Vitesse"
          value={
            driver.speed !== null &&
            driver.speed !== undefined
              ? `${driver.speed} km/h`
              : "Non disponible"
          }
        />

        <LiveStat
          icon={<Battery size={17} />}
          label="Batterie"
          value={
            driver.battery_level !==
              null &&
            driver.battery_level !==
              undefined
              ? `${driver.battery_level}%`
              : "Non disponible"
          }
        />

        <LiveStat
          icon={<Route size={17} />}
          label="Arrêts restants"
          value={String(
            remainingStops,
          )}
        />

        <LiveStat
          icon={<Truck size={17} />}
          label="Véhicule"
          value={
            driver.vehicle_name ||
            "Non assigné"
          }
        />
      </div>
    </section>
  );
}

/* =====================================================
   ONGLET DOCUMENTS
===================================================== */

function DocumentsTab({
  driver,
}: {
  driver: Driver;
}) {
  return (
    <section
      className={styles.panel}
    >
      <div
        className={
          styles.panelHeader
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            Documents
          </span>

          <h2>
            Documents du chauffeur
          </h2>
        </div>
      </div>

      <div
        className={
          styles.documentsGrid
        }
      >
        <DocumentCard
          title="Permis de conduire"
          value={
            driver.license_number ||
            "Non fourni"
          }
          status={
            driver.license_number
              ? "Disponible"
              : "Manquant"
          }
        />

        <DocumentCard
          title="Expiration du permis"
          value={formatDate(
            driver.license_expiry,
          )}
          status={
            driver.license_expiry
              ? "Enregistrée"
              : "Manquante"
          }
        />

        <DocumentCard
          title="Assurance"
          value="Non téléchargée"
          status="À ajouter"
        />

        <DocumentCard
          title="Inspection du véhicule"
          value="Non téléchargée"
          status="À ajouter"
        />

        <DocumentCard
          title="Contrat"
          value="Non téléchargé"
          status="À ajouter"
        />

        <DocumentCard
          title="Formation"
          value="Aucun certificat"
          status="À ajouter"
        />
      </div>
    </section>
  );
}

/* =====================================================
   ONGLET PERFORMANCE
===================================================== */

function PerformanceTab({
  totalOrders,
  completedOrders,
  activeOrders,
  totalStops,
  completedStops,
}: {
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  totalStops: number;
  completedStops: number;
}) {
  const completionRate =
    totalOrders > 0
      ? Math.round(
          (completedOrders /
            totalOrders) *
            100,
        )
      : 0;

  return (
    <section
      className={styles.panel}
    >
      <div
        className={
          styles.panelHeader
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            Performance
          </span>

          <h2>
            Résultats du chauffeur
          </h2>
        </div>
      </div>

      <div
        className={
          styles.performanceGrid
        }
      >
        <PerformanceCard
          label="Commandes totales"
          value={String(totalOrders)}
        />

        <PerformanceCard
          label="Commandes terminées"
          value={String(
            completedOrders,
          )}
        />

        <PerformanceCard
          label="Commandes actives"
          value={String(activeOrders)}
        />

        <PerformanceCard
          label="Taux de réussite"
          value={`${completionRate}%`}
        />

        <PerformanceCard
          label="Arrêts totaux"
          value={String(totalStops)}
        />

        <PerformanceCard
          label="Arrêts terminés"
          value={String(
            completedStops,
          )}
        />
      </div>
    </section>
  );
}

/* =====================================================
   SOUS-COMPOSANTS
===================================================== */

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
      className={styles.statCard}
    >
      <span>{icon}</span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? styles.tabActive
          : styles.tabButton
      }
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoItem({
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
      className={styles.infoItem}
    >
      <span
        className={styles.infoIcon}
      >
        {icon}
      </span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function LiveStat({
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
      className={styles.liveStat}
    >
      <span>{icon}</span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function DocumentCard({
  title,
  value,
  status,
}: {
  title: string;
  value: string;
  status: string;
}) {
  return (
    <article
      className={
        styles.documentCard
      }
    >
      <span
        className={
          styles.documentIcon
        }
      >
        <FileText size={21} />
      </span>

      <div>
        <h3>{title}</h3>
        <p>{value}</p>
        <span>{status}</span>
      </div>
    </article>
  );
}

function PerformanceCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article
      className={
        styles.performanceCard
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
"use client";

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  LogOut,
  MapPin,
  Navigation,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import styles from "./driver.module.css";

/* ============================================================
   CONFIG
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const ITEMS_PER_PAGE = 6;

/* ============================================================
   TYPES
============================================================ */

type ConnectedUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  role: string;
};

type Driver = {
  id: number;
  user_id: number;

  availability_status?: string;

  first_name?: string;
  last_name?: string;

  email?: string;
  phone?: string;

  vehicle_id?: number | null;
  vehicle_name?: string | null;
  vehicle_plate?: string | null;
};

type DriverOrder = {
  id: number;

  order_number?: string;
  reference?: string;

  status?: string;

  priority?: string;

  pickup_address?: string;
  pickup_city?: string;

  delivery_address?: string;
  delivery_city?: string;

  scheduled_date?: string;
  scheduled_time?: string;

  client_name?: string;
};

type Position = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
};

type GpsState =
  | "loading"
  | "active"
  | "permission"
  | "denied"
  | "error"
  | "unsupported";

/* ============================================================
   HELPERS
============================================================ */

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("glory_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function statusLabel(value?: string) {
  switch (value) {
    case "pending":
      return "En attente";

    case "assigned":
      return "Assignée";

    case "accepted":
      return "Acceptée";

    case "pickup_in_progress":
      return "Ramassage";

    case "picked_up":
      return "Ramassée";

    case "in_transit":
    case "delivery_in_progress":
      return "En livraison";

    case "arrived":
      return "Arrivé";

    case "completed":
    case "delivered":
      return "Terminée";

    case "incident":
      return "Incident";

    case "cancelled":
      return "Annulée";

    default:
      return value || "Assignée";
  }
}

function statusClass(value?: string) {
  switch (value) {
    case "completed":
    case "delivered":
      return styles.statusCompleted;

    case "incident":
    case "cancelled":
      return styles.statusIncident;

    case "pickup_in_progress":
    case "picked_up":
    case "in_transit":
    case "delivery_in_progress":
      return styles.statusProgress;

    default:
      return styles.statusAssigned;
  }
}

function availabilityLabel(value?: string) {
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
      return "Disponible";
  }
}

/* ============================================================
   PAGE
============================================================ */

export default function DriverDashboardPage() {
  const router = useRouter();

  const watchIdRef =
    useRef<number | null>(null);

  const [user, setUser] =
    useState<ConnectedUser | null>(null);

  const [driver, setDriver] =
    useState<Driver | null>(null);

  const [orders, setOrders] =
    useState<DriverOrder[]>([]);

  const [position, setPosition] =
    useState<Position | null>(null);

  const [gpsState, setGpsState] =
    useState<GpsState>("loading");

  const [gpsError, setGpsError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [page, setPage] =
    useState(1);

  /* ==========================================================
     AUTH
  ========================================================== */

  useEffect(() => {
    const token =
      getToken();

    const storedUser =
      localStorage.getItem(
        "glory_user",
      );

    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    try {
      const parsedUser =
        JSON.parse(
          storedUser,
        ) as ConnectedUser;

      if (
        parsedUser.role !==
        "driver"
      ) {
        router.replace(
          "/dashboard",
        );

        return;
      }

      setUser(parsedUser);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  /* ==========================================================
     API
  ========================================================== */

  const apiFetch =
    useCallback(
      async <T,>(
        endpoint: string,
        options: RequestInit = {},
      ): Promise<T> => {
        const token =
          getToken();

        if (!token) {
          throw new Error(
            "Session expirée.",
          );
        }

        const response =
          await fetch(
            `${API_URL}${endpoint}`,
            {
              ...options,

              headers: {
                Accept:
                  "application/json",

                Authorization:
                  `Bearer ${token}`,

                ...(options.body
                  ? {
                      "Content-Type":
                        "application/json",
                    }
                  : {}),

                ...options.headers,
              },

              cache:
                "no-store",
            },
          );

        let result: any = {};

        try {
          result =
            await response.json();
        } catch {
          result = {};
        }

        if (
          response.status ===
          401
        ) {
          logout();

          throw new Error(
            "Session expirée.",
          );
        }

        if (!response.ok) {
          throw new Error(
            result?.message ||
              `Erreur API (${response.status}).`,
          );
        }

        return result;
      },
      [],
    );

  /* ==========================================================
     LOAD DATA
  ========================================================== */

  const loadDriverData =
    useCallback(async () => {
      try {
        setError("");

        const driverResult =
          await apiFetch<any>(
            "/api/drivers/me",
          );

        const currentDriver =
          driverResult.driver ||
          driverResult.data;

        if (!currentDriver) {
          throw new Error(
            "Profil chauffeur introuvable.",
          );
        }

        setDriver(
          currentDriver,
        );

        let receivedOrders:
          DriverOrder[] = [];

        try {
          const result =
            await apiFetch<any>(
              `/api/orders/driver/${currentDriver.id}`,
            );

          receivedOrders =
            Array.isArray(
              result.orders,
            )
              ? result.orders
              : Array.isArray(
                    result.data,
                  )
                ? result.data
                : [];
        } catch {
          /*
           * Fallback pour conserver la compatibilité
           * avec ton ancienne route.
           */
          const result =
            await apiFetch<any>(
              `/api/drivers/${currentDriver.id}/orders`,
            );

          receivedOrders =
            Array.isArray(
              result.orders,
            )
              ? result.orders
              : Array.isArray(
                    result.data,
                  )
                ? result.data
                : [];
        }

        setOrders(
          receivedOrders,
        );
      } catch (reason) {
        console.error(reason);

        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger votre espace.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [apiFetch]);

  useEffect(() => {
    if (!user) return;

    void loadDriverData();
  }, [
    user,
    loadDriverData,
  ]);

  /* ==========================================================
     GPS BACKEND
  ========================================================== */

  const sendPosition =
    useCallback(
      async (
        coords:
          GeolocationCoordinates,
      ) => {
        if (!driver) return;

        const gpsPosition: Position =
          {
            latitude:
              coords.latitude,

            longitude:
              coords.longitude,

            accuracy:
              coords.accuracy ??
              null,

            speed:
              coords.speed ??
              null,

            heading:
              coords.heading ??
              null,
          };

        setPosition(
          gpsPosition,
        );

        try {
          await apiFetch(
            "/api/tracking/location",
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  driver_id:
                    driver.id,

                  ...gpsPosition,
                }),
            },
          );
        } catch (reason) {
          console.error(
            "Erreur GPS backend:",
            reason,
          );
        }
      },
      [
        driver,
        apiFetch,
      ],
    );

  /* ==========================================================
     START GPS
  ========================================================== */

  const startGps =
    useCallback(() => {
      if (
        typeof navigator ===
          "undefined" ||
        !navigator.geolocation
      ) {
        setGpsState(
          "unsupported",
        );

        setGpsError(
          "La géolocalisation n'est pas disponible.",
        );

        return;
      }

      if (
        watchIdRef.current !==
        null
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current,
        );
      }

      setGpsState(
        "loading",
      );

      const watchId =
        navigator.geolocation.watchPosition(
          (gps) => {
            setGpsState(
              "active",
            );

            setGpsError("");

            void sendPosition(
              gps.coords,
            );
          },

          (gpsError) => {
            if (
              gpsError.code ===
              gpsError.PERMISSION_DENIED
            ) {
              setGpsState(
                "denied",
              );

              setGpsError(
                "L'accès à votre localisation a été refusé.",
              );

              return;
            }

            setGpsState(
              "error",
            );

            if (
              gpsError.code ===
              gpsError.POSITION_UNAVAILABLE
            ) {
              setGpsError(
                "Position GPS indisponible.",
              );
            } else if (
              gpsError.code ===
              gpsError.TIMEOUT
            ) {
              setGpsError(
                "Le GPS prend trop de temps à répondre.",
              );
            } else {
              setGpsError(
                "Impossible de récupérer votre position.",
              );
            }
          },

          {
            enableHighAccuracy:
              true,

            timeout: 15000,

            maximumAge: 5000,
          },
        );

      watchIdRef.current =
        watchId;
    }, [sendPosition]);

  /* ==========================================================
     AUTO GPS
  ========================================================== */

  useEffect(() => {
    if (!driver) return;

    if (
      typeof navigator ===
        "undefined" ||
      !navigator.geolocation
    ) {
      setGpsState(
        "unsupported",
      );

      return;
    }

    const initializeGps =
      async () => {
        try {
          if (
            !navigator.permissions
          ) {
            setGpsState(
              "permission",
            );

            return;
          }

          const permission =
            await navigator.permissions.query(
              {
                name:
                  "geolocation",
              },
            );

          if (
            permission.state ===
            "granted"
          ) {
            startGps();
          } else if (
            permission.state ===
            "prompt"
          ) {
            setGpsState(
              "permission",
            );
          } else {
            setGpsState(
              "denied",
            );
          }

          permission.onchange =
            () => {
              if (
                permission.state ===
                "granted"
              ) {
                startGps();
              }

              if (
                permission.state ===
                "denied"
              ) {
                setGpsState(
                  "denied",
                );
              }
            };
        } catch {
          setGpsState(
            "permission",
          );
        }
      };

    void initializeGps();

    return () => {
      if (
        watchIdRef.current !==
        null
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current,
        );

        watchIdRef.current =
          null;
      }
    };
  }, [
    driver,
    startGps,
  ]);

  /* ==========================================================
     LOGOUT
  ========================================================== */

  function logout() {
    localStorage.removeItem(
      "glory_token",
    );

    localStorage.removeItem(
      "token",
    );

    localStorage.removeItem(
      "glory_user",
    );

    router.replace("/login");
  }

  /* ==========================================================
     STATS
  ========================================================== */

  const activeOrders =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            [
              "assigned",
              "accepted",
              "pickup_in_progress",
              "picked_up",
              "in_transit",
              "delivery_in_progress",
              "arrived",
            ].includes(
              order.status || "",
            ),
        ).length,
      [orders],
    );

  const completedOrders =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            [
              "completed",
              "delivered",
            ].includes(
              order.status || "",
            ),
        ).length,
      [orders],
    );

  const incidentOrders =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            [
              "incident",
              "cancelled",
            ].includes(
              order.status || "",
            ),
        ).length,
      [orders],
    );

  const activeDelivery =
    useMemo(
      () =>
        orders.find(
          (order) =>
            [
              "pickup_in_progress",
              "picked_up",
              "in_transit",
              "delivery_in_progress",
              "arrived",
            ].includes(
              order.status || "",
            ),
        ) ||
        orders.find(
          (order) =>
            [
              "assigned",
              "accepted",
            ].includes(
              order.status || "",
            ),
        ) ||
        null,
      [orders],
    );

  /* ==========================================================
     FILTERING
  ========================================================== */

  const filteredOrders =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          const matchesSearch =
            !value ||
            [
              order.order_number,
              order.reference,
              order.client_name,
              order.pickup_address,
              order.delivery_address,
              order.pickup_city,
              order.delivery_city,
            ]
              .filter(Boolean)
              .some((item) =>
                String(
                  item,
                )
                  .toLowerCase()
                  .includes(
                    value,
                  ),
              );

          let matchesFilter =
            true;

          if (
            filter ===
            "active"
          ) {
            matchesFilter =
              [
                "assigned",
                "accepted",
                "pickup_in_progress",
                "picked_up",
                "in_transit",
                "delivery_in_progress",
                "arrived",
              ].includes(
                order.status || "",
              );
          }

          if (
            filter ===
            "completed"
          ) {
            matchesFilter =
              [
                "completed",
                "delivered",
              ].includes(
                order.status || "",
              );
          }

          if (
            filter ===
            "incident"
          ) {
            matchesFilter =
              [
                "incident",
                "cancelled",
              ].includes(
                order.status || "",
              );
          }

          return (
            matchesSearch &&
            matchesFilter
          );
        },
      );
    }, [
      orders,
      search,
      filter,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredOrders.length /
          ITEMS_PER_PAGE,
      ),
    );

  useEffect(() => {
    setPage(1);
  }, [
    search,
    filter,
  ]);

  const visibleOrders =
    filteredOrders.slice(
      (page - 1) *
        ITEMS_PER_PAGE,
      page *
        ITEMS_PER_PAGE,
    );

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <main
        className={
          styles.loading
        }
      >
        <div
          className={
            styles.loadingLogo
          }
        >
          GS
        </div>

        <div
          className={
            styles.spinner
          }
        />

        <strong>
          Glory Solutions
        </strong>

        <p>
          Chargement de votre espace chauffeur...
        </p>
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
          HEADER
      ====================================================== */}

      <header
        className={
          styles.header
        }
      >
        <div
          className={
            styles.headerIdentity
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            GLORY SOLUTIONS
          </span>

          <h1>
            Bonjour{" "}
            {user?.first_name ||
              driver?.first_name ||
              "Chauffeur"}
          </h1>

          <p>
            Votre espace de travail pour gérer vos livraisons.
          </p>
        </div>

        <div
          className={
            styles.headerActions
          }
        >
          <button
            type="button"
            className={
              styles.notificationButton
            }
            aria-label="Notifications"
          >
            <Bell
              size={19}
            />

            <span />
          </button>

          <div
            className={
              styles.driverMiniProfile
            }
          >
            <div
              className={
                styles.driverAvatar
              }
            >
              {(
                user?.first_name?.[0] ||
                "D"
              ).toUpperCase()}
            </div>

            <div>
              <strong>
                {[
                  user?.first_name,
                  user?.last_name,
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    " ",
                  ) ||
                  "Chauffeur"}
              </strong>

              <span>
                {availabilityLabel(
                  driver?.availability_status,
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={
              styles.logout
            }
            onClick={
              logout
            }
            aria-label="Déconnexion"
          >
            <LogOut
              size={18}
            />
          </button>
        </div>
      </header>

      {/* ======================================================
          GPS / STATUS
      ====================================================== */}

      <section
        className={`${styles.gpsCard} ${
          gpsState ===
          "active"
            ? styles.gpsOnline
            : styles.gpsOffline
        }`}
      >
        <div
          className={
            styles.gpsIcon
          }
        >
          {gpsState ===
          "active" ? (
            <Navigation
              size={21}
            />
          ) : (
            <WifiOff
              size={21}
            />
          )}
        </div>

        <div
          className={
            styles.gpsContent
          }
        >
          <div
            className={
              styles.gpsTitle
            }
          >
            <strong>
              {gpsState ===
              "active"
                ? "Suivi GPS actif"
                : gpsState ===
                    "permission"
                  ? "Activation GPS requise"
                  : gpsState ===
                      "loading"
                    ? "Connexion GPS..."
                    : "GPS inactif"}
            </strong>

            {gpsState ===
              "active" && (
              <span
                className={
                  styles.liveIndicator
                }
              >
                <span />

                EN DIRECT
              </span>
            )}
          </div>

          <p>
            {gpsState ===
            "active"
              ? position?.accuracy
                ? `Position synchronisée · précision ±${Math.round(
                    position.accuracy,
                  )} m`
                : "Votre position est transmise à Glory Solutions."
              : gpsError ||
                "Le suivi permet à l'équipe opérationnelle de connaître votre position pendant vos livraisons."}
          </p>
        </div>

        {gpsState ===
          "permission" && (
          <button
            type="button"
            className={
              styles.activateGps
            }
            onClick={
              startGps
            }
          >
            <Navigation
              size={16}
            />

            Activer le GPS
          </button>
        )}

        {gpsState ===
          "active" && (
          <div
            className={
              styles.gpsBadge
            }
          >
            <Wifi
              size={15}
            />

            Connecté
          </div>
        )}
      </section>

      {/* ======================================================
          STATS
      ====================================================== */}

      <section
        className={
          styles.stats
        }
      >
        <StatCard
          icon={
            <PackageCheck
              size={20}
            />
          }
          label="Commandes"
          value={
            orders.length
          }
          description="Total assigné"
        />

        <StatCard
          icon={
            <Truck
              size={20}
            />
          }
          label="En cours"
          value={
            activeOrders
          }
          description="À effectuer"
        />

        <StatCard
          icon={
            <CheckCircle2
              size={20}
            />
          }
          label="Terminées"
          value={
            completedOrders
          }
          description="Complétées"
        />

        <StatCard
          icon={
            <AlertTriangle
              size={20}
            />
          }
          label="Incidents"
          value={
            incidentOrders
          }
          description="À vérifier"
        />
      </section>

      {/* ======================================================
          ACTIVE DELIVERY
      ====================================================== */}

      {activeDelivery && (
        <section
          className={
            styles.activeDelivery
          }
        >
          <div
            className={
              styles.activeDeliveryHeader
            }
          >
            <div>
              <span
                className={
                  styles.sectionLabel
                }
              >
                LIVRAISON PRIORITAIRE
              </span>

              <h2>
                Votre prochaine opération
              </h2>
            </div>

            <span
              className={`${styles.orderStatus} ${statusClass(
                activeDelivery.status,
              )}`}
            >
              {statusLabel(
                activeDelivery.status,
              )}
            </span>
          </div>

          <div
            className={
              styles.activeDeliveryBody
            }
          >
            <div
              className={
                styles.activeOrderIdentity
              }
            >
              <span>
                COMMANDE
              </span>

              <strong>
                #
                {activeDelivery.order_number ||
                  activeDelivery.reference ||
                  activeDelivery.id}
              </strong>

              <p>
                {activeDelivery.client_name ||
                  "Livraison Glory Solutions"}
              </p>
            </div>

            <div
              className={
                styles.activeRoute
              }
            >
              <RoutePoint
                type="pickup"
                label="RAMASSAGE"
                address={
                  activeDelivery.pickup_address ||
                  "Adresse non disponible"
                }
                city={
                  activeDelivery.pickup_city
                }
              />

              <div
                className={
                  styles.activeRouteLine
                }
              />

              <RoutePoint
                type="delivery"
                label="LIVRAISON"
                address={
                  activeDelivery.delivery_address ||
                  "Adresse non disponible"
                }
                city={
                  activeDelivery.delivery_city
                }
              />
            </div>

            <button
              type="button"
              className={
                styles.activeDeliveryButton
              }
              onClick={() =>
                router.push(
                  `/dashboard/driver/orders/${activeDelivery.id}`,
                )
              }
            >
              Ouvrir la livraison

              <ChevronRight
                size={17}
              />
            </button>
          </div>
        </section>
      )}

      {/* ======================================================
          ORDERS HEADER
      ====================================================== */}

      <section
        className={
          styles.ordersSection
        }
      >
        <div
          className={
            styles.sectionHeader
          }
        >
          <div>
            <span
              className={
                styles.sectionLabel
              }
            >
              MES LIVRAISONS
            </span>

            <h2>
              Toutes mes commandes
            </h2>

            <p>
              Consultez, recherchez et gérez vos livraisons assignées.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.refresh
            }
            disabled={
              refreshing
            }
            onClick={() => {
              setRefreshing(
                true,
              );

              void loadDriverData();
            }}
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? styles.rotating
                  : ""
              }
            />

            <span>
              Actualiser
            </span>
          </button>
        </div>

        {/* FILTERS */}

        <div
          className={
            styles.commandBar
          }
        >
          <div
            className={
              styles.searchBox
            }
          >
            <Search
              size={17}
            />

            <input
              type="search"
              placeholder="Rechercher une commande, une adresse..."
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
            />
          </div>

          <div
            className={
              styles.filters
            }
          >
            <Filter
              size={15}
            />

            {[
              [
                "all",
                "Toutes",
              ],
              [
                "active",
                "En cours",
              ],
              [
                "completed",
                "Terminées",
              ],
              [
                "incident",
                "Incidents",
              ],
            ].map(
              ([
                value,
                label,
              ]) => (
                <button
                  key={
                    value
                  }
                  type="button"
                  className={
                    filter ===
                    value
                      ? styles.filterActive
                      : ""
                  }
                  onClick={() =>
                    setFilter(
                      value,
                    )
                  }
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </div>

        {error && (
          <div
            className={
              styles.error
            }
          >
            <AlertTriangle
              size={17}
            />

            {error}
          </div>
        )}

        {/* ====================================================
            ORDER LIST
        ==================================================== */}

        <div
          className={
            styles.orders
          }
        >
          {visibleOrders.length ===
          0 ? (
            <div
              className={
                styles.emptyState
              }
            >
              <div
                className={
                  styles.emptyIcon
                }
              >
                <Truck
                  size={29}
                />
              </div>

              <h3>
                Aucune commande
              </h3>

              <p>
                Aucune livraison ne correspond à votre recherche.
              </p>
            </div>
          ) : (
            visibleOrders.map(
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
                      styles.orderTop
                    }
                  >
                    <div
                      className={
                        styles.orderIdentity
                      }
                    >
                      <div
                        className={
                          styles.orderIcon
                        }
                      >
                        <PackageCheck
                          size={18}
                        />
                      </div>

                      <div>
                        <span
                          className={
                            styles.orderNumber
                          }
                        >
                          #
                          {order.order_number ||
                            order.reference ||
                            order.id}
                        </span>

                        <h3>
                          {order.client_name ||
                            "Livraison"}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`${styles.orderStatus} ${statusClass(
                        order.status,
                      )}`}
                    >
                      {statusLabel(
                        order.status,
                      )}
                    </span>
                  </div>

                  <div
                    className={
                      styles.orderRoute
                    }
                  >
                    <RoutePoint
                      type="pickup"
                      label="RAMASSAGE"
                      address={
                        order.pickup_address ||
                        "Adresse non disponible"
                      }
                      city={
                        order.pickup_city
                      }
                    />

                    <div
                      className={
                        styles.routeConnector
                      }
                    />

                    <RoutePoint
                      type="delivery"
                      label="LIVRAISON"
                      address={
                        order.delivery_address ||
                        "Adresse non disponible"
                      }
                      city={
                        order.delivery_city
                      }
                    />
                  </div>

                  <div
                    className={
                      styles.orderFooter
                    }
                  >
                    <div
                      className={
                        styles.schedule
                      }
                    >
                      <Clock3
                        size={15}
                      />

                      <span>
                        {order.scheduled_date ||
                          "Date non définie"}

                        {order.scheduled_time
                          ? ` · ${order.scheduled_time}`
                          : ""}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={
                        styles.orderButton
                      }
                      onClick={() =>
                        router.push(
                          `/dashboard/driver/orders/${order.id}`,
                        )
                      }
                    >
                      Voir la livraison

                      <ChevronRight
                        size={16}
                      />
                    </button>
                  </div>
                </article>
              ),
            )
          )}
        </div>

        {/* ====================================================
            PAGINATION
        ==================================================== */}

        {filteredOrders.length >
          0 && (
          <div
            className={
              styles.pagination
            }
          >
            <span>
              {filteredOrders.length} commande
              {filteredOrders.length >
              1
                ? "s"
                : ""}
            </span>

            <div>
              <button
                type="button"
                disabled={
                  page <= 1
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current -
                          1,
                      ),
                  )
                }
              >
                Précédent
              </button>

              <span>
                Page {page} /{" "}
                {totalPages}
              </span>

              <button
                type="button"
                disabled={
                  page >=
                  totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        totalPages,
                        current +
                          1,
                      ),
                  )
                }
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ======================================================
          DRIVER INFO
      ====================================================== */}

      <section
        className={
          styles.driverInfo
        }
      >
        <div
          className={
            styles.driverInfoIcon
          }
        >
          <ShieldCheck
            size={20}
          />
        </div>

        <div>
          <span>
            PROFIL OPÉRATIONNEL
          </span>

          <strong>
            {availabilityLabel(
              driver?.availability_status,
            )}
          </strong>

          <p>
            {driver?.vehicle_name
              ? `Véhicule : ${driver.vehicle_name}${
                  driver.vehicle_plate
                    ? ` · ${driver.vehicle_plate}`
                    : ""
                }`
              : "Aucun véhicule assigné actuellement."}
          </p>
        </div>
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
   SMALL COMPONENTS
============================================================ */

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon:
    React.ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <article
      className={
        styles.statCard
      }
    >
      <div
        className={
          styles.statIcon
        }
      >
        {icon}
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {description}
        </small>
      </div>
    </article>
  );
}

function RoutePoint({
  type,
  label,
  address,
  city,
}: {
  type:
    | "pickup"
    | "delivery";
  label: string;
  address: string;
  city?: string;
}) {
  return (
    <div
      className={
        styles.routeItem
      }
    >
      <span
        className={
          type ===
          "pickup"
            ? styles.pickupDot
            : styles.deliveryDot
        }
      >
        {type ===
          "delivery" && (
          <MapPin
            size={13}
          />
        )}
      </span>

      <div>
        <small>
          {label}
        </small>

        <strong>
          {address}
        </strong>

        {city && (
          <span>
            {city}
          </span>
        )}
      </div>
    </div>
  );
}
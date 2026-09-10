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
  ScanLine,
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
  "https://api.glorysolutions.ca";

const ITEMS_PER_PAGE = 6;

/*
 * Évite qu’un navigateur ou un appareil très bavard envoie
 * une rafale de positions au backend. La sécurité réelle reste
 * également contrôlée côté serveur.
 */
const GPS_SEND_INTERVAL_MS = 5000;

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

  route_position?: number | null;

  pickup_address?: string;
  pickup_city?: string;

  delivery_address?: string;
  delivery_city?: string;

  scheduled_date?: string;
  scheduled_time?: string;

  pickup_date?: string | null;
  pickup_time?: string | null;
  delivery_date?: string | null;
  delivery_time?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  client_name?: string;
  client_first_name?: string | null;
  client_last_name?: string | null;
  company_name?: string | null;

  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_plate?: string | null;

  stop_count?: number;
  completed_stops?: number;
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

type HistoryRange =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "3m"
  | "6m"
  | "12m";

/* ============================================================
   HELPERS
============================================================ */

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

function getOrderDate(order: DriverOrder) {
  const raw =
    order.scheduled_date ||
    order.pickup_date ||
    order.delivery_date ||
    order.created_at ||
    order.updated_at ||
    null;

  if (!raw) {
    return null;
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function subtractDays(date: Date, amount: number) {
  const value = new Date(date);
  value.setDate(value.getDate() - amount);
  return value;
}

function subtractMonths(date: Date, amount: number) {
  const value = new Date(date);
  value.setMonth(value.getMonth() - amount);
  return value;
}

function getHistoryBounds(range: HistoryRange) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (range) {
    case "today":
      return {
        from: todayStart,
        to: todayEnd,
      };

    case "yesterday": {
      const yesterday = subtractDays(now, 1);

      return {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
      };
    }

    case "7d":
      return {
        from: startOfDay(subtractDays(now, 6)),
        to: todayEnd,
      };

    case "30d":
      return {
        from: startOfDay(subtractDays(now, 29)),
        to: todayEnd,
      };

    case "3m":
      return {
        from: startOfDay(subtractMonths(now, 3)),
        to: todayEnd,
      };

    case "6m":
      return {
        from: startOfDay(subtractMonths(now, 6)),
        to: todayEnd,
      };

    case "12m":
    default:
      return {
        from: startOfDay(subtractMonths(now, 12)),
        to: todayEnd,
      };
  }
}

function formatOrderDate(value: Date) {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
}

function formatOrderDateShort(value?: string | null) {
  if (!value) {
    return "Date non définie";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date non définie";
  }

  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getClientLabel(order: DriverOrder) {
  return (
    order.client_name ||
    order.company_name ||
    [
      order.client_first_name,
      order.client_last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Livraison"
  );
}

function getVehicleLabel(order: DriverOrder) {
  const name = [
    order.vehicle_make,
    order.vehicle_model,
  ]
    .filter(Boolean)
    .join(" ");

  if (name && order.vehicle_plate) {
    return `${name} · ${order.vehicle_plate}`;
  }

  return (
    name ||
    order.vehicle_plate ||
    "Véhicule non défini"
  );
}


/* ============================================================
   PAGE
============================================================ */

export default function DriverDashboardPage() {
  const router = useRouter();

  const watchIdRef =
    useRef<number | null>(null);

  const gpsRequestInFlightRef =
    useRef(false);

  const lastGpsSendAtRef =
    useRef(0);

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

  const [historyRange, setHistoryRange] =
    useState<HistoryRange>("12m");

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
     AUTH — IDENTITÉ VÉRIFIÉE PAR LE BACKEND

     IMPORTANT :
     - le rôle stocké dans localStorage/sessionStorage n'est jamais
       utilisé comme preuve d'autorisation ;
     - le JWT est envoyé à /api/auth/me ;
     - seul le backend décide de l'identité et du rôle réels.
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    const verifySession =
      async () => {
        const token =
          getToken();

        if (!token) {
          router.replace(
            "/login",
          );

          return;
        }

        try {
          const result =
            await apiFetch<any>(
              "/api/auth/me",
            );

          if (cancelled) {
            return;
          }

          const verifiedUser =
            result?.user ||
            result?.data ||
            null;

          if (
            !verifiedUser ||
            verifiedUser.role !==
              "driver"
          ) {
            router.replace(
              "/dashboard",
            );

            return;
          }

          setUser(
            verifiedUser as ConnectedUser,
          );
        } catch (reason) {
          if (cancelled) {
            return;
          }

          console.error(
            "Vérification de session impossible :",
            reason,
          );

          /*
           * apiFetch gère déjà les 401 et supprime la session.
           * Pour toute autre erreur d'authentification, on évite
           * d'afficher des données chauffeur sans identité vérifiée.
           */
          setUser(null);

          setLoading(false);

          setError(
            reason instanceof Error
              ? reason.message
              : "Impossible de vérifier votre session.",
          );
        }
      };

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [
    apiFetch,
    router,
  ]);

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

        const dispatchOrdered = [...receivedOrders].sort(
          (a, b) => {
            const aPosition =
              typeof a.route_position === "number"
                ? a.route_position
                : Number.MAX_SAFE_INTEGER;

            const bPosition =
              typeof b.route_position === "number"
                ? b.route_position
                : Number.MAX_SAFE_INTEGER;

            if (aPosition !== bPosition) {
              return aPosition - bPosition;
            }

            return a.id - b.id;
          },
        );

        setOrders(
          dispatchOrdered,
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

  useEffect(() => {
    if (!user) {
      return;
    }

    const refreshSilently = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }

      void loadDriverData();
    };

    const intervalId =
      window.setInterval(
        refreshSilently,
        5000,
      );

    window.addEventListener(
      "focus",
      refreshSilently,
    );

    document.addEventListener(
      "visibilitychange",
      refreshSilently,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );

      window.removeEventListener(
        "focus",
        refreshSilently,
      );

      document.removeEventListener(
        "visibilitychange",
        refreshSilently,
      );
    };
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

        const latitude =
          Number(coords.latitude);

        const longitude =
          Number(coords.longitude);

        /*
         * Validation locale défensive.
         * Le backend refait obligatoirement les mêmes contrôles.
         */
        if (
          !Number.isFinite(
            latitude,
          ) ||
          !Number.isFinite(
            longitude,
          ) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          console.error(
            "Coordonnées GPS locales invalides.",
          );

          return;
        }

        const gpsPosition: Position =
          {
            latitude,

            longitude,

            accuracy:
              Number.isFinite(
                Number(
                  coords.accuracy,
                ),
              )
                ? Number(
                    coords.accuracy,
                  )
                : null,

            speed:
              coords.speed !==
                null &&
              Number.isFinite(
                Number(
                  coords.speed,
                ),
              )
                ? Math.max(
                    0,
                    Number(
                      coords.speed,
                    ),
                  )
                : null,

            heading:
              coords.heading !==
                null &&
              Number.isFinite(
                Number(
                  coords.heading,
                ),
              )
                ? Math.min(
                    360,
                    Math.max(
                      0,
                      Number(
                        coords.heading,
                      ),
                    ),
                  )
                : null,
          };

        setPosition(
          gpsPosition,
        );

        const now =
          Date.now();

        /*
         * Empêche :
         * - les requêtes GPS concurrentes ;
         * - les rafales de watchPosition ;
         * - une charge inutile sur l'API et MySQL.
         */
        if (
          gpsRequestInFlightRef.current ||
          now -
            lastGpsSendAtRef.current <
            GPS_SEND_INTERVAL_MS
        ) {
          return;
        }

        gpsRequestInFlightRef.current =
          true;

        lastGpsSendAtRef.current =
          now;

        try {
          /*
           * SÉCURITÉ :
           *
           * On n'envoie volontairement PLUS driver_id.
           * Le trackingController sécurisé détermine le chauffeur
           * avec le JWT -> users.id -> drivers.user_id.
           *
           * Le navigateur ne choisit donc jamais son identité chauffeur.
           */
          await apiFetch(
            "/api/tracking/location",
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  ...gpsPosition,
                }),
            },
          );
        } catch (reason) {
          console.error(
            "Erreur GPS backend:",
            reason,
          );
        } finally {
          gpsRequestInFlightRef.current =
            false;
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
            startGps();
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
            /*
             * Le navigateur affiche sa demande système
             * automatiquement à la première utilisation.
             * Après autorisation, les ouvertures suivantes
             * démarrent le suivi sans bouton supplémentaire.
             */
            startGps();
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
          startGps();
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
    if (
      typeof navigator !==
        "undefined" &&
      navigator.geolocation &&
      watchIdRef.current !==
        null
    ) {
      navigator.geolocation.clearWatch(
        watchIdRef.current,
      );

      watchIdRef.current =
        null;
    }

    gpsRequestInFlightRef.current =
      false;

    lastGpsSendAtRef.current =
      0;

    localStorage.removeItem(
      "glory_token",
    );

    localStorage.removeItem(
      "token",
    );

    localStorage.removeItem(
      "glory_user",
    );

    sessionStorage.removeItem(
      "glory_token",
    );

    sessionStorage.removeItem(
      "token",
    );

    sessionStorage.removeItem(
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
     FILTERING + HISTORIQUE 12 MOIS
  ========================================================== */

  const filteredOrders =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      const { from, to } =
        getHistoryBounds(
          historyRange,
        );

      return orders.filter(
        (order) => {
          const orderDate =
            getOrderDate(order);

          const matchesDate =
            orderDate !== null &&
            orderDate >= from &&
            orderDate <= to;

          const matchesSearch =
            !value ||
            [
              order.order_number,
              order.reference,
              order.client_name,
              order.company_name,
              order.client_first_name,
              order.client_last_name,
              order.pickup_address,
              order.delivery_address,
              order.pickup_city,
              order.delivery_city,
              order.vehicle_make,
              order.vehicle_model,
              order.vehicle_plate,
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
            matchesDate &&
            matchesSearch &&
            matchesFilter
          );
        },
      );
    }, [
      orders,
      search,
      filter,
      historyRange,
    ]);

  const sortedFilteredOrders =
    useMemo(
      () =>
        [...filteredOrders].sort(
          (a, b) => {
            const aDate =
              getOrderDate(a);

            const bDate =
              getOrderDate(b);

            const aTime =
              aDate?.getTime() || 0;

            const bTime =
              bDate?.getTime() || 0;

            if (aTime !== bTime) {
              return bTime - aTime;
            }

            const aPosition =
              typeof a.route_position ===
              "number"
                ? a.route_position
                : Number.MAX_SAFE_INTEGER;

            const bPosition =
              typeof b.route_position ===
              "number"
                ? b.route_position
                : Number.MAX_SAFE_INTEGER;

            if (
              aPosition !==
              bPosition
            ) {
              return (
                aPosition -
                bPosition
              );
            }

            return b.id - a.id;
          },
        ),
      [filteredOrders],
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        sortedFilteredOrders.length /
          ITEMS_PER_PAGE,
      ),
    );

  useEffect(() => {
    setPage(1);
  }, [
    search,
    filter,
    historyRange,
  ]);

  useEffect(() => {
    if (
      page >
      totalPages
    ) {
      setPage(
        totalPages,
      );
    }
  }, [
    page,
    totalPages,
  ]);

  const visibleOrders =
    sortedFilteredOrders.slice(
      (page - 1) *
        ITEMS_PER_PAGE,
      page *
        ITEMS_PER_PAGE,
    );

  const groupedVisibleOrders =
    useMemo(() => {
      const groups = new Map<
        string,
        {
          date: Date;
          orders: DriverOrder[];
        }
      >();

      for (
        const order of visibleOrders
      ) {
        const date =
          getOrderDate(order);

        if (!date) {
          continue;
        }

        const key =
          `${date.getFullYear()}-${String(
            date.getMonth() + 1,
          ).padStart(
            2,
            "0",
          )}-${String(
            date.getDate(),
          ).padStart(
            2,
            "0",
          )}`;

        const existing =
          groups.get(key);

        if (existing) {
          existing.orders.push(
            order,
          );
        } else {
          groups.set(
            key,
            {
              date,
              orders: [order],
            },
          );
        }
      }

      return Array.from(
        groups.values(),
      ).sort(
        (a, b) =>
          b.date.getTime() -
          a.date.getTime(),
      );
    }, [
      visibleOrders,
    ]);

  const yearOrderCount =
    useMemo(() => {
      const bounds =
        getHistoryBounds("12m");

      return orders.filter(
        (order) => {
          const date =
            getOrderDate(order);

          return (
            date !== null &&
            date >= bounds.from &&
            date <= bounds.to
          );
        },
      ).length;
    }, [orders]);

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
            yearOrderCount
          }
          description="12 derniers mois"
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
                {activeDelivery.route_position
                  ? `PROCHAINE LIVRAISON · #${activeDelivery.route_position}`
                  : "LIVRAISON PRIORITAIRE"}
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
              Historique des commandes
            </h2>

            <p>
              Consultez vos commandes des 12 derniers mois, séparées par date.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.refresh
            }
            onClick={() =>
              router.push(
                "/dashboard/driver/scanner",
              )
            }
          >
            <ScanLine
              size={17}
            />

            <span>
              Scanner un colis
            </span>
          </button>

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
            <Clock3
              size={15}
            />

            {[
              ["today", "Aujourd’hui"],
              ["yesterday", "Hier"],
              ["7d", "7 jours"],
              ["30d", "30 jours"],
              ["3m", "3 mois"],
              ["6m", "6 mois"],
              ["12m", "1 an"],
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    historyRange === value
                      ? styles.filterActive
                      : ""
                  }
                  onClick={() =>
                    setHistoryRange(
                      value as HistoryRange,
                    )
                  }
                >
                  {label}
                </button>
              ),
            )}
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
          style={{
            maxHeight: "72vh",
            overflowY: "auto",
            paddingRight: 4,
          }}
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
                Aucune livraison ne correspond à la période et aux filtres sélectionnés.
              </p>
            </div>
          ) : (
            groupedVisibleOrders.map(
              (group) => (
                <section
                  key={
                    group.date.toISOString()
                  }
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "space-between",
                      gap: 12,
                      padding:
                        "10px 12px",
                      borderRadius: 12,
                      background:
                        "rgba(255,255,255,0.96)",
                      border:
                        "1px solid rgba(15,23,42,0.08)",
                      backdropFilter:
                        "blur(12px)",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          display: "block",
                          textTransform:
                            "capitalize",
                        }}
                      >
                        {formatOrderDate(
                          group.date,
                        )}
                      </strong>

                      <span
                        style={{
                          fontSize: 12,
                          opacity: 0.65,
                        }}
                      >
                        {
                          group.orders
                            .length
                        }{" "}
                        commande
                        {group.orders
                          .length > 1
                          ? "s"
                          : ""}
                      </span>
                    </div>

                    <Clock3
                      size={17}
                    />
                  </div>

                  {group.orders.map(
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
                                {order.route_position
                                  ? `#${order.route_position} · `
                                  : ""}
                                {order.order_number ||
                                  order.reference ||
                                  order.id}
                              </span>

                              <h3>
                                {getClientLabel(
                                  order,
                                )}
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
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(150px, 1fr))",
                            gap: 8,
                            marginTop: 12,
                          }}
                        >
                          <div>
                            <small>
                              Ramassage
                            </small>
                            <div>
                              {formatOrderDateShort(
                                order.pickup_date ||
                                  order.scheduled_date,
                              )}
                              {order.pickup_time ||
                              order.scheduled_time
                                ? ` · ${
                                    order.pickup_time ||
                                    order.scheduled_time
                                  }`
                                : ""}
                            </div>
                          </div>

                          <div>
                            <small>
                              Livraison
                            </small>
                            <div>
                              {formatOrderDateShort(
                                order.delivery_date,
                              )}
                              {order.delivery_time
                                ? ` · ${order.delivery_time}`
                                : ""}
                            </div>
                          </div>

                          <div>
                            <small>
                              Véhicule
                            </small>
                            <div>
                              {getVehicleLabel(
                                order,
                              )}
                            </div>
                          </div>

                          <div>
                            <small>
                              Arrêts
                            </small>
                            <div>
                              {Number(
                                order.completed_stops ||
                                  0,
                              )}
                              {" / "}
                              {Number(
                                order.stop_count ||
                                  0,
                              )}
                            </div>
                          </div>
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
                              {formatOrderDateShort(
                                order.scheduled_date ||
                                  order.pickup_date ||
                                  order.created_at,
                              )}

                              {order.scheduled_time ||
                              order.pickup_time
                                ? ` · ${
                                    order.scheduled_time ||
                                    order.pickup_time
                                  }`
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
                  )}
                </section>
              ),
            )
          )}
        </div>

        {/* ====================================================
            PAGINATION
        ==================================================== */}

        {sortedFilteredOrders.length >
          0 && (
          <div
            className={
              styles.pagination
            }
          >
            <span>
              {sortedFilteredOrders.length} commande
              {sortedFilteredOrders.length >
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
"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Battery,
  CheckCircle2,
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  LayerGroup,
  Map as LeafletMap,
} from "leaflet";

import {
  io,
  type Socket,
} from "socket.io-client";

import "leaflet/dist/leaflet.css";

import styles from "./live-map.module.css";

/* ============================================================
   CONFIGURATION
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const DEFAULT_LATITUDE = 45.5019;
const DEFAULT_LONGITUDE = -73.5674;

const FALLBACK_REFRESH_INTERVAL =
  30000;

/* ============================================================
   TYPES
============================================================ */

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

  availability_status?:
    | DriverAvailability
    | string;

  vehicle_name?: string | null;
  vehicle_plate?: string | null;

  current_orders?: number;

  last_seen_at?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;

  battery_level?: number | null;

  order_id?: number | null;

  recorded_at?: string | null;
};

type DriversResponse = {
  success?: boolean;

  data?: Driver[];
  drivers?: Driver[];

  message?: string;
};

type TrackingLocation = {
  driver_id?: number;
  driverId?: number;

  order_id?: number | null;
  orderId?: number | null;

  latitude?: number | string | null;
  longitude?: number | string | null;

  speed?: number | string | null;
  heading?: number | string | null;
  accuracy?: number | string | null;

  battery_level?: number | string | null;
  batteryLevel?: number | string | null;

  recorded_at?: string | null;
  timestamp?: string | null;

  first_name?: string;
  last_name?: string;

  vehicle_name?: string | null;
  vehicle_plate?: string | null;
};

type TrackingResponse = {
  success?: boolean;

  data?: TrackingLocation[];
  drivers?: TrackingLocation[];
  locations?: TrackingLocation[];

  message?: string;
};

type Filter =
  | "all"
  | DriverAvailability;

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

function getDriverName(
  driver: Driver,
) {
  const completeName = [
    driver.first_name,
    driver.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    completeName ||
    `Chauffeur #${driver.id}`
  );
}

function getInitials(
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

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Aucune donnée";
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

function toNullableNumber(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function hasValidCoordinates(
  driver: Driver,
) {
  const latitude =
    toNullableNumber(
      driver.latitude,
    );

  const longitude =
    toNullableNumber(
      driver.longitude,
    );

  if (
    latitude === null ||
    longitude === null
  ) {
    return false;
  }

  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function normalizeLocation(
  location: TrackingLocation,
) {
  const driverId =
    Number(
      location.driver_id ??
        location.driverId,
    );

  if (
    !Number.isInteger(
      driverId,
    ) ||
    driverId <= 0
  ) {
    return null;
  }

  const latitude =
    toNullableNumber(
      location.latitude,
    );

  const longitude =
    toNullableNumber(
      location.longitude,
    );

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    driverId,

    latitude,
    longitude,

    orderId:
      toNullableNumber(
        location.order_id ??
          location.orderId,
      ),

    speed:
      toNullableNumber(
        location.speed,
      ),

    heading:
      toNullableNumber(
        location.heading,
      ),

    accuracy:
      toNullableNumber(
        location.accuracy,
      ),

    batteryLevel:
      toNullableNumber(
        location.battery_level ??
          location.batteryLevel,
      ),

    recordedAt:
      location.recorded_at ||
      location.timestamp ||
      new Date().toISOString(),

    firstName:
      location.first_name,

    lastName:
      location.last_name,

    vehicleName:
      location.vehicle_name,

    vehiclePlate:
      location.vehicle_plate,
  };
}

/* ============================================================
   PAGE
============================================================ */

export default function DriversLiveMapPage() {
  const router =
    useRouter();

  /* ==========================================================
     MAP REFS
  ========================================================== */

  const mapContainerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const mapRef =
    useRef<LeafletMap | null>(
      null,
    );

  const markersLayerRef =
    useRef<LayerGroup | null>(
      null,
    );

  const leafletRef =
    useRef<
      typeof import("leaflet") | null
    >(null);

  const socketRef =
    useRef<Socket | null>(
      null,
    );

  /*
    Empêche la carte de refaire fitBounds
    à chaque mouvement GPS.
  */
  const mapHasBeenCenteredRef =
    useRef(false);

  /* ==========================================================
     STATE
  ========================================================== */

  const [
    drivers,
    setDrivers,
  ] = useState<Driver[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    mapReady,
    setMapReady,
  ] = useState(false);

  const [
    socketConnected,
    setSocketConnected,
  ] = useState(false);

  const [
    trackingJoined,
    setTrackingJoined,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState<Filter>(
    "all",
  );

  const [
    selectedDriverId,
    setSelectedDriverId,
  ] = useState<
    number | null
  >(null);

  const [
    lastLiveUpdate,
    setLastLiveUpdate,
  ] = useState<
    string | null
  >(null);

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
              method: "GET",

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
              "Impossible de récupérer les données.",
          );
        }

        return result as T;
      },
      [router],
    );

  /* ==========================================================
     APPLIQUER UNE POSITION À UN CHAUFFEUR
  ========================================================== */

  const applyLocation =
    useCallback(
      (
        location:
          TrackingLocation,
      ) => {
        const normalized =
          normalizeLocation(
            location,
          );

        if (!normalized) {
          return;
        }

        setDrivers(
          (currentDrivers) =>
            currentDrivers.map(
              (driver) => {
                if (
                  driver.id !==
                  normalized.driverId
                ) {
                  return driver;
                }

                return {
                  ...driver,

                  latitude:
                    normalized.latitude,

                  longitude:
                    normalized.longitude,

                  speed:
                    normalized.speed,

                  heading:
                    normalized.heading,

                  accuracy:
                    normalized.accuracy,

                  battery_level:
                    normalized.batteryLevel,

                  order_id:
                    normalized.orderId,

                  recorded_at:
                    normalized.recordedAt,

                  last_seen_at:
                    normalized.recordedAt,

                  first_name:
                    driver.first_name ||
                    normalized.firstName,

                  last_name:
                    driver.last_name ||
                    normalized.lastName,

                  vehicle_name:
                    driver.vehicle_name ||
                    normalized.vehicleName,

                  vehicle_plate:
                    driver.vehicle_plate ||
                    normalized.vehiclePlate,
                };
              },
            ),
        );

        setLastLiveUpdate(
          normalized.recordedAt,
        );
      },
      [],
    );

  /* ==========================================================
     CHARGEMENT INITIAL
  ========================================================== */

  const loadData =
    useCallback(async () => {
      try {
        setError("");

        /* ------------------------------------------------------
           1. CHAUFFEURS
        ------------------------------------------------------ */

        const driverResult =
          await authenticatedFetch<DriversResponse>(
            "/api/drivers",
          );

        const driverList =
          Array.isArray(
            driverResult.data,
          )
            ? driverResult.data
            : Array.isArray(
                  driverResult.drivers,
                )
              ? driverResult.drivers
              : [];

        /*
          On conserve les positions déjà
          reçues par Socket lors d'un refresh.
        */
        setDrivers(
          (previousDrivers) =>
            driverList.map(
              (driver) => {
                const previous =
                  previousDrivers.find(
                    (item) =>
                      item.id ===
                      driver.id,
                  );

                if (
                  !previous ||
                  !hasValidCoordinates(
                    previous,
                  )
                ) {
                  return driver;
                }

                return {
                  ...driver,

                  latitude:
                    previous.latitude,

                  longitude:
                    previous.longitude,

                  speed:
                    previous.speed,

                  heading:
                    previous.heading,

                  accuracy:
                    previous.accuracy,

                  battery_level:
                    previous.battery_level,

                  order_id:
                    previous.order_id,

                  recorded_at:
                    previous.recorded_at,

                  last_seen_at:
                    previous.last_seen_at ||
                    driver.last_seen_at,
                };
              },
            ),
        );

        /* ------------------------------------------------------
           2. DERNIÈRES POSITIONS ENREGISTRÉES

           Cette route existe dans ton backend :
           GET /api/tracking/drivers

           Si elle retourne une structure légèrement
           différente, le code accepte :
           data / drivers / locations.
        ------------------------------------------------------ */

        try {
          const trackingResult =
            await authenticatedFetch<TrackingResponse>(
              "/api/tracking/drivers",
            );

          const positions =
            Array.isArray(
              trackingResult.data,
            )
              ? trackingResult.data
              : Array.isArray(
                    trackingResult.drivers,
                  )
                ? trackingResult.drivers
                : Array.isArray(
                      trackingResult.locations,
                    )
                  ? trackingResult.locations
                  : [];

          setDrivers(
            (currentDrivers) =>
              currentDrivers.map(
                (driver) => {
                  const location =
                    positions.find(
                      (item) =>
                        Number(
                          item.driver_id ??
                            item.driverId,
                        ) ===
                        driver.id,
                    );

                  if (
                    !location
                  ) {
                    return driver;
                  }

                  const normalized =
                    normalizeLocation(
                      location,
                    );

                  if (
                    !normalized
                  ) {
                    return driver;
                  }

                  return {
                    ...driver,

                    latitude:
                      normalized.latitude,

                    longitude:
                      normalized.longitude,

                    speed:
                      normalized.speed,

                    heading:
                      normalized.heading,

                    accuracy:
                      normalized.accuracy,

                    battery_level:
                      normalized.batteryLevel,

                    order_id:
                      normalized.orderId,

                    recorded_at:
                      normalized.recordedAt,

                    last_seen_at:
                      normalized.recordedAt,
                  };
                },
              ),
          );
        } catch (
          trackingError
        ) {
          /*
            La liste des chauffeurs reste utilisable
            même si l'historique GPS n'est pas
            encore disponible.
          */
          console.warn(
            "Positions GPS initiales non disponibles :",
            trackingError,
          );
        }
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger les chauffeurs.",
        );
      } finally {
        setLoading(false);

        setRefreshing(
          false,
        );
      }
    }, [
      authenticatedFetch,
    ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* ==========================================================
     FALLBACK 30 SECONDES
  ========================================================== */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          /*
            Socket.IO est le système principal.

            Ce refresh sert uniquement de
            sécurité/re-synchronisation.
          */
          void loadData();
        },
        FALLBACK_REFRESH_INTERVAL,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [loadData]);

  /* ==========================================================
     SOCKET.IO TEMPS RÉEL
  ========================================================== */

  useEffect(() => {
    const token =
      getToken();

    if (!token) {
      router.replace(
        "/login",
      );

      return;
    }

    const socket =
      io(API_URL, {
        transports: [
          "websocket",
          "polling",
        ],

        auth: {
          token,
        },

        reconnection: true,

        reconnectionAttempts:
          Infinity,

        reconnectionDelay:
          1000,

        reconnectionDelayMax:
          5000,

        timeout:
          10000,
      });

    socketRef.current =
      socket;

    /* --------------------------------------------------------
       CONNECT
    -------------------------------------------------------- */

    const handleConnect =
      () => {
        console.log(
          "✅ Socket.IO connecté :",
          socket.id,
        );

        setSocketConnected(
          true,
        );

        setError("");

        /*
          IMPORTANT :
          correspond exactement à ton server.js.
        */
        socket.emit(
          "join-tracking",
        );
      };

    /* --------------------------------------------------------
       ROOM TRACKING REJOINTE
    -------------------------------------------------------- */

    const handleTrackingJoined =
      (payload: {
        success?: boolean;
        room?: string;
      }) => {
        console.log(
          "🗺️ Room tracking :",
          payload,
        );

        setTrackingJoined(
          true,
        );
      };

    /* --------------------------------------------------------
       POSITION CHAUFFEUR
    -------------------------------------------------------- */

    const handleDriverLocation =
      (
        location:
          TrackingLocation,
      ) => {
        applyLocation(
          location,
        );
      };

    /* --------------------------------------------------------
       ERREUR SERVEUR SOCKET
    -------------------------------------------------------- */

    const handleSocketError =
      (payload: {
        message?: string;
      }) => {
        console.error(
          "Socket error :",
          payload,
        );

        if (
          payload?.message
        ) {
          setError(
            payload.message,
          );
        }
      };

    /* --------------------------------------------------------
       ERREUR DE CONNEXION
    -------------------------------------------------------- */

    const handleConnectError =
      (socketError: Error) => {
        console.error(
          "Erreur connexion Socket.IO :",
          socketError.message,
        );

        setSocketConnected(
          false,
        );

        setTrackingJoined(
          false,
        );
      };

    /* --------------------------------------------------------
       DISCONNECT
    -------------------------------------------------------- */

    const handleDisconnect =
      (reason: string) => {
        console.warn(
          "Socket déconnecté :",
          reason,
        );

        setSocketConnected(
          false,
        );

        setTrackingJoined(
          false,
        );
      };

    socket.on(
      "connect",
      handleConnect,
    );

    socket.on(
      "tracking:joined",
      handleTrackingJoined,
    );

    /*
      Le server.js envoie exactement :
      driver:location
    */
    socket.on(
      "driver:location",
      handleDriverLocation,
    );

    socket.on(
      "socket:error",
      handleSocketError,
    );

    socket.on(
      "connect_error",
      handleConnectError,
    );

    socket.on(
      "disconnect",
      handleDisconnect,
    );

    /* --------------------------------------------------------
       CLEANUP
    -------------------------------------------------------- */

    return () => {
      socket.off(
        "connect",
        handleConnect,
      );

      socket.off(
        "tracking:joined",
        handleTrackingJoined,
      );

      socket.off(
        "driver:location",
        handleDriverLocation,
      );

      socket.off(
        "socket:error",
        handleSocketError,
      );

      socket.off(
        "connect_error",
        handleConnectError,
      );

      socket.off(
        "disconnect",
        handleDisconnect,
      );

      socket.disconnect();

      socketRef.current =
        null;
    };
  }, [
    router,
    applyLocation,
  ]);

  /* ==========================================================
     INITIALISER LEAFLET
  ========================================================== */

  useEffect(() => {
    let cancelled =
      false;

    const initializeMap =
      async () => {
        if (
          !mapContainerRef.current ||
          mapRef.current
        ) {
          return;
        }

        const L =
          await import(
            "leaflet"
          );

        if (
          cancelled ||
          !mapContainerRef.current
        ) {
          return;
        }

        leafletRef.current =
          L;

        const map =
          L.map(
            mapContainerRef.current,
            {
              center: [
                DEFAULT_LATITUDE,
                DEFAULT_LONGITUDE,
              ],

              zoom: 11,

              zoomControl:
                true,

              attributionControl:
                true,
            },
          );

        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,

            attribution:
              '&copy; OpenStreetMap contributors',
          },
        ).addTo(map);

        const markerLayer =
          L.layerGroup();

        markerLayer.addTo(
          map,
        );

        markersLayerRef.current =
          markerLayer;

        mapRef.current =
          map;

        window.setTimeout(
          () => {
            map.invalidateSize();
          },
          150,
        );

        setMapReady(
          true,
        );
      };

    void initializeMap();

    return () => {
      cancelled = true;

      if (
        mapRef.current
      ) {
        mapRef.current.remove();

        mapRef.current =
          null;
      }

      markersLayerRef.current =
        null;

      leafletRef.current =
        null;
    };
  }, []);

  /* ==========================================================
     CHAUFFEURS AVEC GPS
  ========================================================== */

  const driversWithLocation =
    useMemo(
      () =>
        drivers.filter(
          hasValidCoordinates,
        ),
      [drivers],
    );

  /* ==========================================================
     MARQUEURS
  ========================================================== */

  useEffect(() => {
    const L =
      leafletRef.current;

    const map =
      mapRef.current;

    const markerLayer =
      markersLayerRef.current;

    if (
      !L ||
      !map ||
      !markerLayer ||
      !mapReady
    ) {
      return;
    }

    markerLayer.clearLayers();

    if (
      driversWithLocation.length ===
      0
    ) {
      return;
    }

    const bounds:
      [number, number][] = [];

    driversWithLocation.forEach(
      (driver) => {
        const latitude =
          Number(
            driver.latitude,
          );

        const longitude =
          Number(
            driver.longitude,
          );

        bounds.push([
          latitude,
          longitude,
        ]);

        const icon =
          L.divIcon({
            className:
              styles.markerWrapper,

            html: `
              <div class="${styles.marker}">
                <div class="${styles.markerPulse}"></div>

                <div class="${styles.markerInner}">
                  ${getInitials(driver)}
                </div>
              </div>
            `,

            iconSize: [
              46,
              46,
            ],

            iconAnchor: [
              23,
              23,
            ],

            popupAnchor: [
              0,
              -22,
            ],
          });

        const marker =
          L.marker(
            [
              latitude,
              longitude,
            ],
            {
              icon,
            },
          );

        const speed =
          driver.speed !==
            null &&
          driver.speed !==
            undefined
            ? `${Math.round(
                driver.speed,
              )} km/h`
            : "Non disponible";

        const accuracy =
          driver.accuracy !==
            null &&
          driver.accuracy !==
            undefined
            ? `±${Math.round(
                driver.accuracy,
              )} m`
            : "Non disponible";

        const battery =
          driver.battery_level !==
            null &&
          driver.battery_level !==
            undefined
            ? `${Math.round(
                driver.battery_level,
              )}%`
            : "Non disponible";

        marker.bindPopup(`
          <div style="
            min-width:220px;
            font-family:Arial,sans-serif;
            padding:4px;
          ">
            <strong
              style="
                display:block;
                font-size:15px;
                color:#20212a;
                margin-bottom:7px;
              "
            >
              ${getDriverName(driver)}
            </strong>

            <div
              style="
                font-size:11px;
                color:#dc143c;
                font-weight:700;
                margin-bottom:9px;
              "
            >
              ${getAvailabilityLabel(
                driver.availability_status,
              )}
            </div>

            <div
              style="
                font-size:11px;
                color:#656771;
                line-height:1.8;
              "
            >
              🚚 ${
                driver.vehicle_name ||
                "Véhicule non assigné"
              }

              ${
                driver.vehicle_plate
                  ? ` · ${driver.vehicle_plate}`
                  : ""
              }

              <br />

              🚀 Vitesse : ${speed}

              <br />

              🎯 Précision : ${accuracy}

              <br />

              🔋 Batterie : ${battery}

              <br />

              🕐 ${formatDate(
                driver.recorded_at ||
                  driver.last_seen_at,
              )}
            </div>
          </div>
        `);

        marker.on(
          "click",
          () => {
            setSelectedDriverId(
              driver.id,
            );
          },
        );

        marker.addTo(
          markerLayer,
        );
      },
    );

    /*
      On centre automatiquement uniquement
      la première fois.

      Après, les mouvements GPS ne font
      pas sauter la carte de l'utilisateur.
    */
    if (
      !mapHasBeenCenteredRef.current
    ) {
      if (
        bounds.length === 1
      ) {
        map.setView(
          bounds[0],
          15,
        );
      } else {
        map.fitBounds(
          bounds,
          {
            padding: [
              55,
              55,
            ],

            maxZoom: 15,
          },
        );
      }

      mapHasBeenCenteredRef.current =
        true;
    }
  }, [
    driversWithLocation,
    mapReady,
  ]);

  /* ==========================================================
     FILTRAGE
  ========================================================== */

  const filteredDrivers =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLowerCase();

      return drivers.filter(
        (driver) => {
          const matchesFilter =
            filter === "all" ||
            driver.availability_status ===
              filter;

          const searchable = [
            driver.first_name,
            driver.last_name,
            driver.email,
            driver.phone,
            driver.vehicle_name,
            driver.vehicle_plate,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return (
            matchesFilter &&
            (
              !needle ||
              searchable.includes(
                needle,
              )
            )
          );
        },
      );
    }, [
      drivers,
      search,
      filter,
    ]);

  /* ==========================================================
     STATISTIQUES
  ========================================================== */

  const availableCount =
    useMemo(
      () =>
        drivers.filter(
          (driver) =>
            driver.availability_status ===
            "available",
        ).length,
      [drivers],
    );

  const busyCount =
    useMemo(
      () =>
        drivers.filter(
          (driver) =>
            driver.availability_status ===
            "busy",
        ).length,
      [drivers],
    );

  /* ==========================================================
     FOCUS DRIVER
  ========================================================== */

  const focusDriver =
    (
      driver: Driver,
    ) => {
      setSelectedDriverId(
        driver.id,
      );

      if (
        !hasValidCoordinates(
          driver,
        )
      ) {
        return;
      }

      mapRef.current?.setView(
        [
          Number(
            driver.latitude,
          ),

          Number(
            driver.longitude,
          ),
        ],
        16,
        {
          animate: true,
        },
      );
    };

  /* ==========================================================
     RECENTRER TOUS
  ========================================================== */

  const focusAllDrivers =
    () => {
      const map =
        mapRef.current;

      const L =
        leafletRef.current;

      if (
        !map ||
        !L ||
        driversWithLocation.length ===
          0
      ) {
        return;
      }

      const bounds =
        driversWithLocation.map(
          (driver) =>
            [
              Number(
                driver.latitude,
              ),

              Number(
                driver.longitude,
              ),
            ] as [
              number,
              number,
            ],
        );

      if (
        bounds.length === 1
      ) {
        map.setView(
          bounds[0],
          15,
        );

        return;
      }

      map.fitBounds(
        bounds,
        {
          padding: [
            55,
            55,
          ],

          maxZoom: 15,
        },
      );
    };

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

      <section
        className={
          styles.heading
        }
      >
        <div>
          <Link
            href="/dashboard/admin/drivers"
            className={
              styles.backLink
            }
          >
            <ArrowLeft
              size={16}
            />

            Retour aux chauffeurs
          </Link>

          <span
            className={
              styles.eyebrow
            }
          >
            <Radio
              size={15}
            />

            Centre de suivi GPS
          </span>

          <h1>
            Carte globale des
            chauffeurs
          </h1>

          <p>
            Visualisez les chauffeurs,
            leurs véhicules et leurs
            dernières positions en
            temps réel.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "9px",
            flexWrap: "wrap",
          }}
        >
          {driversWithLocation.length >
            0 && (
            <button
              type="button"
              className={
                styles.refreshButton
              }
              onClick={
                focusAllDrivers
              }
            >
              <LocateFixed
                size={17}
              />

              Voir tous
            </button>
          )}

          <button
            type="button"
            className={
              styles.refreshButton
            }
            disabled={
              refreshing ||
              loading
            }
            onClick={() => {
              setRefreshing(
                true,
              );

              void loadData();
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
      </section>

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
          STATS
      ====================================================== */}

      <section
        className={
          styles.statsGrid
        }
      >
        <StatCard
          label="Total chauffeurs"
          value={
            drivers.length
          }
          icon={
            <UserRound
              size={20}
            />
          }
          variant="total"
        />

        <StatCard
          label="Disponibles"
          value={
            availableCount
          }
          icon={
            <CheckCircle2
              size={20}
            />
          }
          variant="available"
        />

        <StatCard
          label="En livraison"
          value={
            busyCount
          }
          icon={
            <Truck
              size={20}
            />
          }
          variant="busy"
        />

        <StatCard
          label="GPS actifs"
          value={
            driversWithLocation.length
          }
          icon={
            <LocateFixed
              size={20}
            />
          }
          variant="gps"
        />
      </section>

      {/* ======================================================
          WORKSPACE
      ====================================================== */}

      <section
        className={
          styles.workspace
        }
      >
        {/* ====================================================
            LISTE CHAUFFEURS
        ==================================================== */}

        <aside
          className={
            styles.driverPanel
          }
        >
          <div
            className={
              styles.panelHeader
            }
          >
            <div>
              <h2>
                Chauffeurs
              </h2>

              <p>
                {
                  filteredDrivers.length
                }{" "}
                chauffeur
                {filteredDrivers.length >
                1
                  ? "s"
                  : ""}
              </p>
            </div>

            <span
              className={
                styles.liveBadge
              }
            >
              <span />

              {trackingJoined
                ? "LIVE"
                : "SYNC"}
            </span>
          </div>

          {/* SEARCH */}

          <label
            className={
              styles.searchBox
            }
          >
            <Search
              size={17}
            />

            <input
              type="search"
              value={search}
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="Rechercher un chauffeur..."
            />
          </label>

          {/* FILTERS */}

          <div
            className={
              styles.filters
            }
          >
            {[
              [
                "all",
                "Tous",
              ],
              [
                "available",
                "Disponibles",
              ],
              [
                "busy",
                "Livraison",
              ],
              [
                "on_break",
                "Pause",
              ],
              [
                "offline",
                "Hors ligne",
              ],
            ].map(
              ([
                value,
                label,
              ]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    filter ===
                    value
                      ? styles.filterActive
                      : styles.filterButton
                  }
                  onClick={() =>
                    setFilter(
                      value as Filter,
                    )
                  }
                >
                  {label}
                </button>
              ),
            )}
          </div>

          {/* LIST */}

          <div
            className={
              styles.driverList
            }
          >
            {loading ? (
              <>
                <DriverSkeleton />
                <DriverSkeleton />
                <DriverSkeleton />
              </>
            ) : filteredDrivers.length ===
              0 ? (
              <div
                className={
                  styles.emptyDrivers
                }
              >
                <Truck
                  size={30}
                />

                <strong>
                  Aucun chauffeur
                </strong>

                <span>
                  Aucun résultat pour
                  cette recherche.
                </span>
              </div>
            ) : (
              filteredDrivers.map(
                (driver) => {
                  const hasGps =
                    hasValidCoordinates(
                      driver,
                    );

                  return (
                    <button
                      key={
                        driver.id
                      }
                      type="button"
                      className={`${styles.driverCard} ${
                        selectedDriverId ===
                        driver.id
                          ? styles.driverCardSelected
                          : ""
                      }`}
                      onClick={() =>
                        focusDriver(
                          driver,
                        )
                      }
                    >
                      <div
                        className={
                          styles.driverAvatar
                        }
                      >
                        {getInitials(
                          driver,
                        )}

                        <span
                          className={`${styles.presenceDot} ${
                            driver.availability_status ===
                            "available"
                              ? styles.presenceAvailable
                              : driver.availability_status ===
                                  "busy"
                                ? styles.presenceBusy
                                : styles.presenceOffline
                          }`}
                        />
                      </div>

                      <div
                        className={
                          styles.driverContent
                        }
                      >
                        <div
                          className={
                            styles.driverTop
                          }
                        >
                          <strong>
                            {getDriverName(
                              driver,
                            )}
                          </strong>

                          {hasGps ? (
                            <Navigation
                              size={
                                14
                              }
                            />
                          ) : (
                            <WifiOff
                              size={
                                13
                              }
                            />
                          )}
                        </div>

                        <span>
                          {getAvailabilityLabel(
                            driver.availability_status,
                          )}
                        </span>

                        <small>
                          <Truck
                            size={
                              12
                            }
                          />

                          {driver.vehicle_name ||
                            "Aucun véhicule"}

                          {driver.vehicle_plate
                            ? ` · ${driver.vehicle_plate}`
                            : ""}
                        </small>

                        {hasGps && (
                          <small>
                            <LocateFixed
                              size={
                                12
                              }
                            />

                            GPS disponible
                          </small>
                        )}

                        {driver.speed !==
                          null &&
                          driver.speed !==
                            undefined && (
                          <small>
                            <Navigation
                              size={
                                12
                              }
                            />

                            {Math.round(
                              driver.speed,
                            )}{" "}
                            km/h
                          </small>
                        )}

                        {driver.battery_level !==
                          null &&
                          driver.battery_level !==
                            undefined && (
                          <small>
                            <Battery
                              size={
                                12
                              }
                            />

                            Batterie{" "}
                            {Math.round(
                              driver.battery_level,
                            )}
                            %
                          </small>
                        )}

                        <small>
                          <Clock3
                            size={
                              12
                            }
                          />

                          {formatDate(
                            driver.recorded_at ||
                              driver.last_seen_at,
                          )}
                        </small>
                      </div>
                    </button>
                  );
                },
              )
            )}
          </div>
        </aside>

        {/* ====================================================
            MAP
        ==================================================== */}

        <div
          className={
            styles.mapCard
          }
        >
          <div
            className={
              styles.mapToolbar
            }
          >
            <div>
              <strong>
                Carte en direct
              </strong>

              <span>
                OpenStreetMap ·
                Positionnement GPS
              </span>
            </div>

            <div
              className={
                styles.mapStatus
              }
            >
              {socketConnected &&
              trackingJoined ? (
                <>
                  <Wifi
                    size={13}
                  />

                  Temps réel actif
                </>
              ) : (
                <>
                  <WifiOff
                    size={13}
                  />

                  Reconnexion...
                </>
              )}
            </div>
          </div>

          <div
            className={
              styles.mapContainer
            }
          >
            <div
              ref={
                mapContainerRef
              }
              className={
                styles.map
              }
            />

            {!loading &&
              driversWithLocation.length ===
                0 && (
                <div
                  className={
                    styles.noGpsOverlay
                  }
                >
                  <div
                    className={
                      styles.noGpsIcon
                    }
                  >
                    <LocateFixed
                      size={27}
                    />
                  </div>

                  <strong>
                    En attente de
                    positions GPS
                  </strong>

                  <p>
                    La carte est prête.
                    Lorsqu’un chauffeur
                    active le suivi GPS
                    depuis son téléphone,
                    sa position apparaîtra
                    automatiquement ici.
                  </p>
                </div>
              )}
          </div>

          {/* FOOTER MAP */}

          <footer
            className={
              styles.mapFooter
            }
          >
            <div>
              <span
                className={
                  styles.legendAvailable
                }
              />

              Disponible
            </div>

            <div>
              <span
                className={
                  styles.legendBusy
                }
              />

              En livraison
            </div>

            <div>
              <span
                className={
                  styles.legendOffline
                }
              />

              Hors ligne
            </div>

            <p>
              {lastLiveUpdate
                ? `Dernière position : ${formatDate(
                    lastLiveUpdate,
                  )}`
                : socketConnected
                  ? "Connexion temps réel active"
                  : "Connexion au serveur..."}
            </p>
          </footer>
        </div>
      </section>
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
  variant,
}: {
  label: string;

  value: number;

  icon:
    React.ReactNode;

  variant:
    | "total"
    | "available"
    | "busy"
    | "gps";
}) {
  return (
    <article
      className={
        styles.statCard
      }
    >
      <span
        className={
          styles[
            `stat_${variant}`
          ]
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
    </article>
  );
}

/* ============================================================
   SKELETON
============================================================ */

function DriverSkeleton() {
  return (
    <div
      className={
        styles.driverSkeleton
      }
    >
      <span />

      <div>
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
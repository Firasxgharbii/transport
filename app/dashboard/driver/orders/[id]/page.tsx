"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileCheck2,
  Loader2,
  MapPin,
  Navigation,
  PackageCheck,
  PenLine,
  Phone,
  RefreshCw,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  Truck,
  Upload,
  User,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import styles from "./order-details.module.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.glorysolutions.ca";

const GPS_SEND_INTERVAL_MS = 5000;

type ConnectedUser = {
  id: number;
  role: string;
  first_name?: string;
  last_name?: string;
  email?: string;
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

type PackageItem = {
  id: number;
  order_id?: number;
  barcode?: string;
  package_number?: number | string;
  description?: string | null;
  package_type?: string | null;
  weight?: number | string | null;
  weight_unit?: string | null;
  length?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  dimension_unit?: string | null;
  current_status?: string | null;
  scanned?: number | boolean;
  scanned_for_operation?: number | boolean;
  last_scan_at?: string | null;
};

type DriverTask = {
  id: number;
  order_id: number;
  operation_type:
    | "pickup"
    | "warehouse_in"
    | "storage"
    | "warehouse_storage"
    | "warehouse_out"
    | "load_vehicle"
    | "delivery"
    | "incident"
    | string;

  status?: string;
  operation_status?: string;

  driver_id?: number;
  vehicle_id?: number | null;

  warehouse_name?: string | null;

  scheduled_date?: string | null;
  scheduled_time?: string | null;
  completed_at?: string | null;
  route_position?: number | null;
  notes?: string | null;

  order_number?: string;
  priority?: string;

  pickup_address?: string | null;
  pickup_unit?: string | null;
  pickup_date?: string | null;
  pickup_time?: string | null;

  delivery_address?: string | null;
  delivery_unit?: string | null;
  delivery_date?: string | null;
  delivery_time?: string | null;

  destination_type?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_extension?: string | null;

  client_first_name?: string | null;
  client_last_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;

  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_name?: string | null;
  vehicle_plate?: string | null;

  signature_required?: boolean | number | null;

  package_count?: number;
  scanned_packages?: number;
  remaining_packages?: number;
  progress_percentage?: number;

  task_address?: string | null;
  task_date?: string | null;
  task_time?: string | null;

  packages?: PackageItem[];
  scans?: unknown[];
};

type ScanResult = {
  success?: boolean;
  duplicate?: boolean;
  rejected?: boolean;
  scan_status?: "accepted" | "duplicate" | "rejected";
  message?: string;
  operation_completed?: boolean;
};

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

function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  [
    "glory_token",
    "token",
    "glory_user",
  ].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function normalizeBoolean(value: unknown) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  );
}

function operationLabel(value?: string) {
  switch (value) {
    case "pickup":
      return "Ramassage";

    case "warehouse_in":
      return "Entrée entrepôt";

    case "storage":
    case "warehouse_storage":
      return "Entreposage";

    case "warehouse_out":
      return "Sortie entrepôt";

    case "load_vehicle":
      return "Chargement véhicule";

    case "delivery":
      return "Livraison";

    case "incident":
      return "Incident";

    default:
      return value || "Tâche";
  }
}

function operationEyebrow(value?: string) {
  return operationLabel(value).toUpperCase();
}

function statusLabel(value?: string) {
  switch (value) {
    case "pending":
      return "En attente";

    case "assigned":
      return "Assignée";

    case "accepted":
      return "Acceptée";

    case "in_progress":
      return "En cours";

    case "completed":
      return "Terminée";

    case "cancelled":
      return "Annulée";

    case "incident":
      return "Incident";

    default:
      return value || "Assignée";
  }
}

function statusClass(value?: string) {
  switch (value) {
    case "completed":
      return styles.statusCompleted;

    case "incident":
    case "cancelled":
      return styles.statusIncident;

    case "in_progress":
      return styles.statusProgress;

    default:
      return styles.statusAssigned;
  }
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Non définie";
  }

  const plainDate =
    /^\d{4}-\d{2}-\d{2}/.test(value)
      ? value.slice(0, 10)
      : value;

  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(plainDate)
      ? new Date(`${plainDate}T12:00:00`)
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-CA",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

function formatTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  return value.slice(0, 5);
}

function clientName(task: DriverTask) {
  if (task.company_name) {
    return task.company_name;
  }

  const name = [
    task.client_first_name,
    task.client_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return name || "Client";
}

function getTaskAddress(task: DriverTask) {
  switch (task.operation_type) {
    case "pickup":
      return task.pickup_address || "";

    case "delivery":
      return task.delivery_address || "";

    case "warehouse_in":
    case "storage":
    case "warehouse_storage":
    case "warehouse_out":
    case "load_vehicle":
      return (
        task.warehouse_name ||
        task.task_address ||
        ""
      );

    default:
      return (
        task.task_address ||
        task.delivery_address ||
        task.pickup_address ||
        ""
      );
  }
}

function getTaskDate(task: DriverTask) {
  return (
    task.scheduled_date ||
    task.task_date ||
    (
      task.operation_type === "delivery"
        ? task.delivery_date
        : task.pickup_date
    ) ||
    null
  );
}

function getTaskTime(task: DriverTask) {
  return (
    task.scheduled_time ||
    task.task_time ||
    (
      task.operation_type === "delivery"
        ? task.delivery_time
        : task.pickup_time
    ) ||
    null
  );
}

function getPackageNumber(
  item: PackageItem,
  index: number,
) {
  return (
    item.package_number ||
    `P${String(index + 1).padStart(2, "0")}`
  );
}

function packageIsScanned(item: PackageItem) {
  return normalizeBoolean(
    item.scanned_for_operation ??
      item.scanned,
  );
}

export default function DriverTaskDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const operationId =
    String(params.id || "");

  const watchIdRef =
    useRef<number | null>(null);

  const gpsRequestInFlightRef =
    useRef(false);

  const lastGpsSendAtRef =
    useRef(0);

  const signatureCanvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const signatureDrawingRef =
    useRef(false);

  const photoInputRef =
    useRef<HTMLInputElement | null>(null);

  const [
    user,
    setUser,
  ] = useState<ConnectedUser | null>(null);

  const [
    task,
    setTask,
  ] = useState<DriverTask | null>(null);

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

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    gpsState,
    setGpsState,
  ] = useState<GpsState>("loading");

  const [
    gpsError,
    setGpsError,
  ] = useState("");

  const [
    position,
    setPosition,
  ] = useState<Position | null>(null);

  const [
    navigationOpen,
    setNavigationOpen,
  ] = useState(false);

  const [
    navigationAddress,
    setNavigationAddress,
  ] = useState("");

  const [
    proofOpen,
    setProofOpen,
  ] = useState(false);

  const [
    proofSaving,
    setProofSaving,
  ] = useState(false);

  const [
    receiverFirstName,
    setReceiverFirstName,
  ] = useState("");

  const [
    receiverLastName,
    setReceiverLastName,
  ] = useState("");

  const [
    proofNotes,
    setProofNotes,
  ] = useState("");

  const [
    proofPhoto,
    setProofPhoto,
  ] = useState<File | null>(null);

  const [
    proofPhotoPreview,
    setProofPhotoPreview,
  ] = useState("");

  const [
    signatureReady,
    setSignatureReady,
  ] = useState(false);

  const [
    incidentOpen,
    setIncidentOpen,
  ] = useState(false);

  const [
    incidentReason,
    setIncidentReason,
  ] = useState("");

  const [
    incidentSaving,
    setIncidentSaving,
  ] = useState(false);

  const apiFetch =
    useCallback(
      async <T,>(
        endpoint: string,
        options: RequestInit = {},
      ): Promise<T> => {
        const token =
          getToken();

        if (!token) {
          clearSession();

          router.replace(
            "/login",
          );

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

        if (response.status === 401) {
          clearSession();

          router.replace(
            "/login",
          );

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
      [router],
    );

  const verifySession =
    useCallback(async () => {
      const result =
        await apiFetch<any>(
          "/api/auth/me",
        );

      const verifiedUser =
        result?.user ||
        result?.data ||
        null;

      if (
        !verifiedUser ||
        verifiedUser.role !== "driver"
      ) {
        router.replace(
          "/dashboard",
        );

        return null;
      }

      setUser(
        verifiedUser as ConnectedUser,
      );

      return verifiedUser as ConnectedUser;
    }, [
      apiFetch,
      router,
    ]);

  const loadTask =
    useCallback(async () => {
      const numericOperationId =
        Number(operationId);

      if (
        !Number.isInteger(
          numericOperationId,
        ) ||
        numericOperationId <= 0
      ) {
        setTask(null);
        setError(
          "Identifiant de tâche invalide.",
        );
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        setError("");

        const result =
          await apiFetch<any>(
            `/api/drivers/me/operations/${numericOperationId}`,
          );

        const receivedTask =
          result?.task ||
          result?.operation ||
          result?.data ||
          null;

        if (!receivedTask) {
          throw new Error(
            "Tâche introuvable.",
          );
        }

        setTask(
          receivedTask as DriverTask,
        );
      } catch (reason) {
        console.error(
          "Erreur loadTask:",
          reason,
        );

        setTask(null);

        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger cette tâche.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [
      apiFetch,
      operationId,
    ]);

  useEffect(() => {
    let cancelled = false;

    const initialize =
      async () => {
        try {
          const verifiedUser =
            await verifySession();

          if (
            cancelled ||
            !verifiedUser
          ) {
            return;
          }

          await loadTask();
        } catch (reason) {
          if (cancelled) {
            return;
          }

          console.error(reason);

          setError(
            reason instanceof Error
              ? reason.message
              : "Impossible de charger votre tâche.",
          );

          setLoading(false);
        }
      };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [
    verifySession,
    loadTask,
  ]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const refreshSilently =
      () => {
        if (
          typeof document !== "undefined" &&
          document.visibilityState !== "visible"
        ) {
          return;
        }

        void loadTask();
      };

    const intervalId =
      window.setInterval(
        refreshSilently,
        10000,
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
    loadTask,
  ]);

  const sendPosition =
    useCallback(
      async (
        coords:
          GeolocationCoordinates,
      ) => {
        if (!task) {
          return;
        }

        const latitude =
          Number(coords.latitude);

        const longitude =
          Number(coords.longitude);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return;
        }

        const gpsPosition: Position = {
          latitude,
          longitude,

          accuracy:
            Number.isFinite(
              Number(coords.accuracy),
            )
              ? Number(
                  coords.accuracy,
                )
              : null,

          speed:
            coords.speed !== null &&
            Number.isFinite(
              Number(coords.speed),
            )
              ? Math.max(
                  0,
                  Number(coords.speed),
                )
              : null,

          heading:
            coords.heading !== null &&
            Number.isFinite(
              Number(coords.heading),
            )
              ? Math.min(
                  360,
                  Math.max(
                    0,
                    Number(coords.heading),
                  ),
                )
              : null,
        };

        setPosition(
          gpsPosition,
        );

        const now =
          Date.now();

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
           * aucun driver_id n'est envoyé.
           * Le backend détermine le chauffeur depuis le JWT.
           */
          await apiFetch(
            "/api/tracking/location",
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  order_id:
                    task.order_id,

                  operation_id:
                    task.id,

                  ...gpsPosition,
                }),
            },
          );
        } catch (reason) {
          console.error(
            "Erreur tracking:",
            reason,
          );
        } finally {
          gpsRequestInFlightRef.current =
            false;
        }
      },
      [
        task,
        apiFetch,
      ],
    );

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

          (locationError) => {
            if (
              locationError.code ===
              locationError.PERMISSION_DENIED
            ) {
              setGpsState(
                "denied",
              );

              setGpsError(
                "Autorisation GPS refusée.",
              );

              return;
            }

            setGpsState(
              "error",
            );

            setGpsError(
              "Impossible d'obtenir la position GPS.",
            );
          },

          {
            enableHighAccuracy:
              true,

            timeout:
              15000,

            maximumAge:
              5000,
          },
        );

      watchIdRef.current =
        watchId;
    }, [
      sendPosition,
    ]);

  useEffect(() => {
    if (!task) {
      return;
    }

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

    const init =
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

    void init();

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
    task,
    startGps,
  ]);

  const taskStatus =
    task?.operation_status ||
    task?.status ||
    "assigned";

  const packages =
    useMemo(
      () =>
        Array.isArray(
          task?.packages,
        )
          ? task?.packages || []
          : [],
      [task?.packages],
    );

  const packageCount =
    useMemo(() => {
      const serverCount =
        Number(
          task?.package_count,
        );

      if (
        Number.isFinite(
          serverCount,
        ) &&
        serverCount >= 0
      ) {
        return serverCount;
      }

      return packages.length;
    }, [
      task?.package_count,
      packages.length,
    ]);

  const scannedPackages =
    useMemo(() => {
      const serverCount =
        Number(
          task?.scanned_packages,
        );

      if (
        Number.isFinite(
          serverCount,
        ) &&
        serverCount >= 0
      ) {
        return Math.min(
          serverCount,
          packageCount,
        );
      }

      return packages.filter(
        packageIsScanned,
      ).length;
    }, [
      task?.scanned_packages,
      packages,
      packageCount,
    ]);

  const progressPercentage =
    useMemo(() => {
      if (
        task?.progress_percentage !==
          undefined &&
        Number.isFinite(
          Number(
            task.progress_percentage,
          ),
        )
      ) {
        return Math.max(
          0,
          Math.min(
            100,
            Number(
              task.progress_percentage,
            ),
          ),
        );
      }

      if (packageCount <= 0) {
        return taskStatus ===
          "completed"
          ? 100
          : 0;
      }

      return Math.round(
        (
          scannedPackages /
          packageCount
        ) * 100,
      );
    }, [
      task?.progress_percentage,
      packageCount,
      scannedPackages,
      taskStatus,
    ]);

  const remainingPackages =
    Math.max(
      0,
      packageCount -
        scannedPackages,
    );

  const currentAddress =
    task
      ? getTaskAddress(task)
      : "";

  const currentTaskDate =
    task
      ? getTaskDate(task)
      : null;

  const currentTaskTime =
    task
      ? getTaskTime(task)
      : null;

  const isPickup =
    task?.operation_type ===
    "pickup";

  const isDelivery =
    task?.operation_type ===
    "delivery";

  const isCompleted =
    taskStatus ===
    "completed";

  const isCancelled =
    taskStatus ===
    "cancelled";

  const signatureRequired =
    normalizeBoolean(
      task?.signature_required,
    );

  const openNavigation =
    (
      address?: string | null,
    ) => {
      const cleanedAddress =
        String(address || "")
          .trim();

      if (!cleanedAddress) {
        return;
      }

      setNavigationAddress(
        cleanedAddress,
      );

      setNavigationOpen(
        true,
      );
    };

  const launchNavigation =
    (
      provider:
        | "google"
        | "waze"
        | "apple",
    ) => {
      if (!navigationAddress) {
        return;
      }

      const destination =
        encodeURIComponent(
          navigationAddress,
        );

      const urls = {
        google:
          `https://www.google.com/maps/dir/?api=1&destination=${destination}`,

        waze:
          `https://waze.com/ul?q=${destination}&navigate=yes`,

        apple:
          `https://maps.apple.com/?daddr=${destination}&dirflg=d`,
      };

      window.open(
        urls[provider],
        "_blank",
        "noopener,noreferrer",
      );

      setNavigationOpen(
        false,
      );
    };

  const openScanner =
    () => {
      router.push(
        "/dashboard/driver/scanner",
      );
    };

  const resetProofForm =
    useCallback(() => {
      setReceiverFirstName("");
      setReceiverLastName("");
      setProofNotes("");
      setProofPhoto(null);
      setSignatureReady(false);

      setProofPhotoPreview(
        (current) => {
          if (current) {
            URL.revokeObjectURL(
              current,
            );
          }

          return "";
        },
      );

      const canvas =
        signatureCanvasRef.current;

      if (canvas) {
        const context =
          canvas.getContext("2d");

        if (context) {
          context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height,
          );
        }
      }

      if (
        photoInputRef.current
      ) {
        photoInputRef.current.value =
          "";
      }
    }, []);

  const openProofModal =
    useCallback(() => {
      if (!isDelivery) {
        setError(
          "La preuve de livraison est disponible uniquement pour une tâche de livraison.",
        );

        return;
      }

      setError("");
      setSuccess("");
      setProofOpen(true);
    }, [
      isDelivery,
    ]);

  const closeProofModal =
    useCallback(() => {
      if (proofSaving) {
        return;
      }

      setProofOpen(false);
    }, [
      proofSaving,
    ]);

  useEffect(() => {
    if (!proofOpen) {
      return;
    }

    const canvas =
      signatureCanvasRef.current;

    if (!canvas) {
      return;
    }

    const setupCanvas =
      () => {
        const rect =
          canvas.getBoundingClientRect();

        const ratio =
          Math.max(
            window.devicePixelRatio ||
              1,
            1,
          );

        canvas.width =
          Math.max(
            Math.round(
              rect.width *
                ratio,
            ),
            1,
          );

        canvas.height =
          Math.max(
            Math.round(
              rect.height *
                ratio,
            ),
            1,
          );

        const context =
          canvas.getContext("2d");

        if (!context) {
          return;
        }

        context.setTransform(
          ratio,
          0,
          0,
          ratio,
          0,
          0,
        );

        context.lineCap =
          "round";

        context.lineJoin =
          "round";

        context.lineWidth =
          2.4;

        context.strokeStyle =
          "#20212a";
      };

    const frame =
      window.requestAnimationFrame(
        setupCanvas,
      );

    window.addEventListener(
      "resize",
      setupCanvas,
    );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );

      window.removeEventListener(
        "resize",
        setupCanvas,
      );
    };
  }, [
    proofOpen,
  ]);

  useEffect(() => {
    return () => {
      if (
        proofPhotoPreview
      ) {
        URL.revokeObjectURL(
          proofPhotoPreview,
        );
      }
    };
  }, [
    proofPhotoPreview,
  ]);

  const getCanvasPoint =
    (
      event:
        React.PointerEvent<HTMLCanvasElement>,
    ) => {
      const canvas =
        signatureCanvasRef.current;

      if (!canvas) {
        return null;
      }

      const rect =
        canvas.getBoundingClientRect();

      return {
        x:
          event.clientX -
          rect.left,

        y:
          event.clientY -
          rect.top,
      };
    };

  const startSignature =
    (
      event:
        React.PointerEvent<HTMLCanvasElement>,
    ) => {
      const canvas =
        signatureCanvasRef.current;

      const point =
        getCanvasPoint(
          event,
        );

      if (
        !canvas ||
        !point
      ) {
        return;
      }

      event.preventDefault();

      canvas.setPointerCapture(
        event.pointerId,
      );

      const context =
        canvas.getContext("2d");

      if (!context) {
        return;
      }

      signatureDrawingRef.current =
        true;

      context.beginPath();

      context.moveTo(
        point.x,
        point.y,
      );
    };

  const drawSignature =
    (
      event:
        React.PointerEvent<HTMLCanvasElement>,
    ) => {
      if (
        !signatureDrawingRef.current
      ) {
        return;
      }

      const canvas =
        signatureCanvasRef.current;

      const point =
        getCanvasPoint(
          event,
        );

      if (
        !canvas ||
        !point
      ) {
        return;
      }

      event.preventDefault();

      const context =
        canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.lineTo(
        point.x,
        point.y,
      );

      context.stroke();

      setSignatureReady(
        true,
      );
    };

  const endSignature =
    (
      event:
        React.PointerEvent<HTMLCanvasElement>,
    ) => {
      const canvas =
        signatureCanvasRef.current;

      if (
        canvas?.hasPointerCapture(
          event.pointerId,
        )
      ) {
        canvas.releasePointerCapture(
          event.pointerId,
        );
      }

      signatureDrawingRef.current =
        false;
    };

  const clearSignature =
    () => {
      const canvas =
        signatureCanvasRef.current;

      if (!canvas) {
        return;
      }

      const context =
        canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      setSignatureReady(
        false,
      );
    };

  const canvasToBlob =
    (
      canvas:
        HTMLCanvasElement,
    ) =>
      new Promise<Blob | null>(
        (resolve) => {
          canvas.toBlob(
            resolve,
            "image/png",
            0.95,
          );
        },
      );

  const handlePhotoChange =
    (
      event:
        React.ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[0] ||
        null;

      if (!file) {
        setProofPhoto(null);

        setProofPhotoPreview(
          (current) => {
            if (current) {
              URL.revokeObjectURL(
                current,
              );
            }

            return "";
          },
        );

        return;
      }

      if (
        !file.type.startsWith(
          "image/",
        )
      ) {
        setError(
          "Veuillez sélectionner une image.",
        );

        event.target.value = "";

        return;
      }

      if (
        file.size >
        10 * 1024 * 1024
      ) {
        setError(
          "La photo ne doit pas dépasser 10 Mo.",
        );

        event.target.value = "";

        return;
      }

      setError("");
      setProofPhoto(file);

      setProofPhotoPreview(
        (current) => {
          if (current) {
            URL.revokeObjectURL(
              current,
            );
          }

          return URL.createObjectURL(
            file,
          );
        },
      );
    };

  const submitDeliveryProof =
    async () => {
      if (
        !task ||
        !isDelivery
      ) {
        return;
      }

      const firstName =
        receiverFirstName.trim();

      const lastName =
        receiverLastName.trim();

      if (!firstName) {
        setError(
          "Le prénom du destinataire est obligatoire.",
        );

        return;
      }

      if (!lastName) {
        setError(
          "Le nom du destinataire est obligatoire.",
        );

        return;
      }

      /*
       * RÈGLE POD GLORY :
       * - signature_required = true  -> signature obligatoire
       * - signature_required = false -> photo obligatoire
       */
      if (
        signatureRequired &&
        !signatureReady
      ) {
        setError(
          "La signature du destinataire est obligatoire pour cette livraison.",
        );

        return;
      }

      if (
        !signatureRequired &&
        !proofPhoto
      ) {
        setError(
          "La photo de livraison est obligatoire pour cette livraison.",
        );

        return;
      }

      if (
        gpsState !== "active" ||
        !position
      ) {
        setError(
          "Le GPS doit être actif avant de confirmer la livraison.",
        );

        return;
      }

      try {
        setProofSaving(true);
        setError("");
        setSuccess("");

        const formData =
          new FormData();

        /*
         * SÉCURITÉ :
         * aucun driver_id n'est transmis.
         * Le backend doit l'obtenir depuis le JWT.
         */
        formData.append(
          "operation_id",
          String(task.id),
        );

        formData.append(
          "receiver_first_name",
          firstName,
        );

        formData.append(
          "receiver_last_name",
          lastName,
        );

        formData.append(
          "notes",
          proofNotes.trim(),
        );

        formData.append(
          "latitude",
          String(
            position.latitude,
          ),
        );

        formData.append(
          "longitude",
          String(
            position.longitude,
          ),
        );

        if (
          position.accuracy !==
          null
        ) {
          formData.append(
            "accuracy",
            String(
              position.accuracy,
            ),
          );
        }

        if (proofPhoto) {
          formData.append(
            "photo",
            proofPhoto,
            proofPhoto.name ||
              `delivery-${task.order_id}.jpg`,
          );
        }

        if (
          signatureRequired
        ) {
          const canvas =
            signatureCanvasRef.current;

          if (!canvas) {
            throw new Error(
              "Impossible de récupérer la signature.",
            );
          }

          const signatureBlob =
            await canvasToBlob(
              canvas,
            );

          if (!signatureBlob) {
            throw new Error(
              "Impossible de préparer la signature.",
            );
          }

          formData.append(
            "signature",
            signatureBlob,
            `signature-${task.order_id}.png`,
          );
        }

        const token =
          getToken();

        if (!token) {
          clearSession();

          router.replace(
            "/login",
          );

          throw new Error(
            "Session expirée.",
          );
        }

        const response =
          await fetch(
            `${API_URL}/api/orders/${task.order_id}/proofs`,
            {
              method:
                "POST",

              headers: {
                Accept:
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                formData,

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
          clearSession();

          router.replace(
            "/login",
          );

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

        setProofOpen(false);

        resetProofForm();

        setSuccess(
          "Preuve de livraison enregistrée avec succès.",
        );

        await loadTask();

        window.setTimeout(
          () => {
            setSuccess("");
          },
          4500,
        );
      } catch (reason) {
        console.error(
          "Erreur preuve de livraison:",
          reason,
        );

        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible d'enregistrer la preuve de livraison.",
        );
      } finally {
        setProofSaving(false);
      }
    };

  const reportIncident =
    async () => {
      if (!task) {
        return;
      }

      const reason =
        incidentReason.trim();

      if (!reason) {
        setError(
          "La raison de l'incident est obligatoire.",
        );

        return;
      }

      const scanCode =
        packages.find(
          (item) =>
            Boolean(
              item.barcode,
            ),
        )?.barcode ||
        task.order_number ||
        "";

      if (!scanCode) {
        setError(
          "Aucun code de colis ou numéro de commande n'est disponible pour enregistrer l'incident.",
        );

        return;
      }

      try {
        setIncidentSaving(
          true,
        );

        setError("");
        setSuccess("");

        const result =
          await apiFetch<ScanResult>(
            "/api/drivers/me/scan",
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  scanned_code:
                    scanCode,

                  scan_type:
                    "incident",

                  scan_source:
                    "manual",

                  notes:
                    reason,

                  latitude:
                    position?.latitude ??
                    null,

                  longitude:
                    position?.longitude ??
                    null,

                  accuracy:
                    position?.accuracy ??
                    null,

                  device_type:
                    "driver_task",

                  device_name:
                    typeof navigator !==
                    "undefined"
                      ? navigator.userAgent.slice(
                          0,
                          140,
                        )
                      : null,
                }),
            },
          );

        if (
          result.success ===
          false
        ) {
          throw new Error(
            result.message ||
              "Impossible d'enregistrer l'incident.",
          );
        }

        setIncidentOpen(
          false,
        );

        setIncidentReason("");

        setSuccess(
          "Incident enregistré et transmis à Glory Solutions.",
        );

        await loadTask();

        window.setTimeout(
          () => {
            setSuccess("");
          },
          4500,
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible d'enregistrer l'incident.",
        );
      } finally {
        setIncidentSaving(
          false,
        );
      }
    };

  if (loading) {
    return (
      <main
        className={
          styles.loadingPage
        }
      >
        <div
          className={
            styles.loadingIcon
          }
        >
          <Loader2
            size={30}
            className={
              styles.spinner
            }
          />
        </div>

        <h1>
          Chargement de la tâche
        </h1>

        <p>
          Préparation de votre opération...
        </p>
      </main>
    );
  }

  if (!task) {
    return (
      <main
        className={
          styles.loadingPage
        }
      >
        <AlertTriangle
          size={38}
        />

        <h1>
          Tâche introuvable
        </h1>

        <p>
          {error ||
            "Cette tâche n'existe pas ou ne vous est pas assignée."}
        </p>

        <button
          type="button"
          className={
            styles.backPrimary
          }
          onClick={() =>
            router.push(
              "/dashboard/driver",
            )
          }
        >
          <ArrowLeft
            size={17}
          />

          Retour au dashboard
        </button>
      </main>
    );
  }

  return (
    <main
      className={
        styles.page
      }
    >
      <header
        className={
          styles.header
        }
      >
        <button
          type="button"
          className={
            styles.iconButton
          }
          onClick={() =>
            router.push(
              "/dashboard/driver",
            )
          }
          aria-label="Retour"
        >
          <ArrowLeft
            size={19}
          />
        </button>

        <div
          className={
            styles.headerText
          }
        >
          <span>
            GLORY SOLUTIONS ·{" "}
            {operationEyebrow(
              task.operation_type,
            )}
          </span>

          <h1>
            {task.order_number ||
              `Commande #${task.order_id}`}
          </h1>

          <p>
            Tâche #{task.id}
            {task.route_position
              ? ` · Position ${task.route_position}`
              : ""}
          </p>
        </div>

        <button
          type="button"
          className={
            styles.iconButton
          }
          disabled={
            refreshing
          }
          onClick={() => {
            setRefreshing(
              true,
            );

            void loadTask();
          }}
          aria-label="Actualiser"
        >
          <RefreshCw
            size={18}
            className={
              refreshing
                ? styles.spinner
                : ""
            }
          />
        </button>
      </header>

      <section
        className={
          styles.statusHero
        }
      >
        <div
          className={
            styles.statusHeroMain
          }
        >
          <div
            className={
              styles.statusHeroIcon
            }
          >
            {isPickup ? (
              <PackageCheck
                size={25}
              />
            ) : isDelivery ? (
              <Truck
                size={25}
              />
            ) : (
              <Navigation
                size={25}
              />
            )}
          </div>

          <div>
            <span
              className={
                styles.heroLabel
              }
            >
              {operationEyebrow(
                task.operation_type,
              )}
            </span>

            <h2>
              {statusLabel(
                taskStatus,
              )}
            </h2>

            <p>
              {clientName(
                task,
              )}
            </p>
          </div>
        </div>

        <span
          className={`${styles.statusBadge} ${statusClass(
            taskStatus,
          )}`}
        >
          {statusLabel(
            taskStatus,
          )}
        </span>
      </section>

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
              size={20}
            />
          ) : (
            <WifiOff
              size={20}
            />
          )}
        </div>

        <div
          className={
            styles.gpsText
          }
        >
          <strong>
            {gpsState ===
            "active"
              ? "Suivi GPS actif"
              : gpsState ===
                  "permission"
                ? "GPS à activer"
                : "GPS inactif"}
          </strong>

          <span>
            {gpsState ===
            "active"
              ? position?.accuracy
                ? `Position en direct · précision ±${Math.round(
                    position.accuracy,
                  )} m`
                : "Position synchronisée avec Glory Solutions."
              : gpsError ||
                "Activez le GPS pour transmettre votre position."}
          </span>
        </div>

        {gpsState ===
        "active" ? (
          <div
            className={
              styles.gpsLive
            }
          >
            <Wifi
              size={14}
            />

            EN DIRECT
          </div>
        ) : (
          <button
            type="button"
            className={
              styles.gpsActivate
            }
            onClick={
              startGps
            }
          >
            Activer
          </button>
        )}
      </section>

      {success && (
        <div
          className={
            styles.success
          }
        >
          <CheckCircle2
            size={17}
          />

          {success}
        </div>
      )}

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

      <section
        className={
          styles.progressCard
        }
      >
        <div
          className={
            styles.sectionHead
          }
        >
          <div>
            <span>
              PROGRESSION COLIS
            </span>

            <h2>
              {scannedPackages} /{" "}
              {packageCount} colis scannés
            </h2>
          </div>

          <strong>
            {progressPercentage}%
          </strong>
        </div>

        <div
          className={
            styles.progressBar
          }
        >
          <span
            style={{
              width:
                `${progressPercentage}%`,
            }}
          />
        </div>

        <div
          className={
            styles.progressSummary
          }
        >
          <span>
            {remainingPackages} restant
            {remainingPackages > 1
              ? "s"
              : ""}
          </span>

          <span>
            {statusLabel(
              taskStatus,
            )}
          </span>
        </div>
      </section>

      <section
        className={
          styles.contentGrid
        }
      >
        <div
          className={
            styles.mainColumn
          }
        >
          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.locationHeader
              }
            >
              <div
                className={
                  styles.locationIcon
                }
              >
                <MapPin
                  size={19}
                />
              </div>

              <div>
                <span>
                  {operationEyebrow(
                    task.operation_type,
                  )}
                </span>

                <h2>
                  Destination de la tâche
                </h2>
              </div>
            </div>

            <div
              className={
                styles.address
              }
            >
              <MapPin
                size={17}
              />

              <strong>
                {currentAddress ||
                  "Adresse non disponible"}
              </strong>
            </div>

            <div
              className={
                styles.dateGrid
              }
            >
              <div>
                <CalendarDays
                  size={15}
                />

                <span>
                  {formatDate(
                    currentTaskDate,
                  )}
                </span>
              </div>

              <div>
                <Clock3
                  size={15}
                />

                <span>
                  {formatTime(
                    currentTaskTime,
                  )}
                </span>
              </div>
            </div>

            {currentAddress && (
              <button
                type="button"
                className={
                  styles.navigationButton
                }
                onClick={() =>
                  openNavigation(
                    currentAddress,
                  )
                }
              >
                <Navigation
                  size={17}
                />

                Ouvrir la navigation

                <ChevronRight
                  size={16}
                />
              </button>
            )}
          </section>

          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <PackageCheck
                size={18}
              />

              <h2>
                Colis de la tâche
              </h2>
            </div>

            {packages.length ===
            0 ? (
              <p
                className={
                  styles.helperText
                }
              >
                Aucun détail de colis disponible.
              </p>
            ) : (
              <div
                className={
                  styles.packageList
                }
              >
                {packages.map(
                  (
                    item,
                    index,
                  ) => {
                    const scanned =
                      packageIsScanned(
                        item,
                      );

                    return (
                      <article
                        key={
                          item.id
                        }
                        className={`${styles.packageItem} ${
                          scanned
                            ? styles.packageScanned
                            : ""
                        }`}
                      >
                        <div
                          className={
                            styles.packageIcon
                          }
                        >
                          {scanned ? (
                            <CheckCircle2
                              size={18}
                            />
                          ) : (
                            <PackageCheck
                              size={18}
                            />
                          )}
                        </div>

                        <div
                          className={
                            styles.packageContent
                          }
                        >
                          <span>
                            Colis{" "}
                            {getPackageNumber(
                              item,
                              index,
                            )}
                          </span>

                          <strong>
                            {item.barcode ||
                              "Code non disponible"}
                          </strong>

                          <small>
                            {item.package_type ||
                              "Colis"}
                            {item.weight
                              ? ` · ${item.weight} ${item.weight_unit || ""}`
                              : ""}
                          </small>
                        </div>

                        <span
                          className={
                            styles.packageStatus
                          }
                        >
                          {scanned
                            ? "Scanné"
                            : "À scanner"}
                        </span>
                      </article>
                    );
                  },
                )}
              </div>
            )}

            {!isCompleted &&
              !isCancelled && (
                <button
                  type="button"
                  className={
                    styles.primaryButton
                  }
                  onClick={
                    openScanner
                  }
                >
                  <ScanLine
                    size={18}
                  />

                  Scanner les colis
                </button>
              )}
          </section>

          {task.notes && (
            <section
              className={
                styles.card
              }
            >
              <div
                className={
                  styles.sectionTitle
                }
              >
                <AlertTriangle
                  size={18}
                />

                <h2>
                  Instructions
                </h2>
              </div>

              <p
                className={
                  styles.notes
                }
              >
                {task.notes}
              </p>
            </section>
          )}
        </div>

        <aside
          className={
            styles.sideColumn
          }
        >
          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <User
                size={18}
              />

              <h2>
                Client
              </h2>
            </div>

            <div
              className={
                styles.clientBlock
              }
            >
              <span>
                CLIENT / ENTREPRISE
              </span>

              <strong>
                {clientName(
                  task,
                )}
              </strong>

              {task.client_email && (
                <small>
                  {task.client_email}
                </small>
              )}
            </div>

            {(task.contact_name ||
              task.contact_phone) && (
              <div
                className={
                  styles.contactBlock
                }
              >
                {task.contact_name && (
                  <strong>
                    {task.contact_name}
                  </strong>
                )}

                {task.contact_phone && (
                  <span>
                    {task.contact_phone}
                    {task.contact_extension
                      ? ` poste ${task.contact_extension}`
                      : ""}
                  </span>
                )}
              </div>
            )}

            {(task.contact_phone ||
              task.client_phone) && (
              <a
                href={`tel:${
                  task.contact_phone ||
                  task.client_phone
                }`}
                className={
                  styles.phoneButton
                }
              >
                <Phone
                  size={16}
                />

                Appeler le contact
              </a>
            )}
          </section>

          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <Truck
                size={18}
              />

              <h2>
                Véhicule
              </h2>
            </div>

            <div
              className={
                styles.vehicle
              }
            >
              <div
                className={
                  styles.vehicleIcon
                }
              >
                <Truck
                  size={22}
                />
              </div>

              <div>
                <span>
                  VÉHICULE ASSIGNÉ
                </span>

                <strong>
                  {[
                    task.vehicle_name,
                    task.vehicle_make,
                    task.vehicle_model,
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(" ") ||
                    "Aucun véhicule"}
                </strong>

                <small>
                  {task.vehicle_plate ||
                    "Plaque non disponible"}
                </small>
              </div>
            </div>
          </section>

          {isDelivery && (
            <section
              className={
                styles.card
              }
            >
              <div
                className={
                  styles.sectionTitle
                }
              >
                <FileCheck2
                  size={18}
                />

                <h2>
                  Preuve de livraison
                </h2>
              </div>

              <p
                className={
                  styles.helperText
                }
              >
                {signatureRequired
                  ? "Cette livraison exige la signature du destinataire."
                  : "Cette livraison exige une photo comme preuve."}
              </p>

              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                onClick={
                  openProofModal
                }
                disabled={
                  proofSaving
                }
              >
                {signatureRequired ? (
                  <PenLine
                    size={17}
                  />
                ) : (
                  <Camera
                    size={17}
                  />
                )}

                Ajouter la preuve
              </button>
            </section>
          )}

          {!isCompleted &&
            !isCancelled && (
              <section
                className={
                  styles.incidentCard
                }
              >
                <div
                  className={
                    styles.incidentTitle
                  }
                >
                  <ShieldAlert
                    size={18}
                  />

                  <div>
                    <strong>
                      Problème pendant la tâche ?
                    </strong>

                    <span>
                      Signalez immédiatement l'incident.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIncidentOpen(
                      true,
                    )
                  }
                >
                  Signaler un incident
                </button>
              </section>
            )}
        </aside>
      </section>

      {!isCompleted &&
        !isCancelled && (
          <section
            className={
              styles.actionCard
            }
          >
            <div>
              <span>
                ACTION PRINCIPALE
              </span>

              <h2>
                {remainingPackages > 0
                  ? "Scanner les colis de cette tâche"
                  : isDelivery
                    ? "Ajouter la preuve de livraison"
                    : "Tâche scannée"}
              </h2>

              <p>
                {remainingPackages > 0
                  ? `${remainingPackages} colis restent à scanner.`
                  : isDelivery
                    ? "Tous les colis sont scannés. Enregistrez la preuve de livraison."
                    : "Tous les colis ont été scannés pour cette opération."}
              </p>
            </div>

            <button
              type="button"
              className={
                styles.primaryButton
              }
              onClick={
                remainingPackages > 0
                  ? openScanner
                  : isDelivery
                    ? openProofModal
                    : () =>
                        void loadTask()
              }
            >
              {remainingPackages > 0 ? (
                <>
                  <ScanLine
                    size={18}
                  />

                  Scanner
                </>
              ) : isDelivery ? (
                <>
                  <FileCheck2
                    size={18}
                  />

                  Ajouter la preuve
                </>
              ) : (
                <>
                  <RefreshCw
                    size={18}
                  />

                  Actualiser
                </>
              )}
            </button>
          </section>
        )}

      {isCompleted && (
        <section
          className={
            styles.completedCard
          }
        >
          <CheckCircle2
            size={28}
          />

          <div>
            <strong>
              Tâche terminée
            </strong>

            <p>
              Cette opération a été complétée avec succès.
            </p>
          </div>
        </section>
      )}

      {navigationOpen && (
        <div
          className={
            styles.modalOverlay
          }
          onClick={() =>
            setNavigationOpen(
              false,
            )
          }
        >
          <div
            className={
              styles.navigationModal
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className={
                styles.modalClose
              }
              onClick={() =>
                setNavigationOpen(
                  false,
                )
              }
              aria-label="Fermer"
            >
              <X
                size={18}
              />
            </button>

            <div
              className={
                styles.modalIcon
              }
            >
              <Navigation
                size={25}
              />
            </div>

            <h2>
              Choisir la navigation
            </h2>

            <p>
              Ouvrez l'adresse dans l'application de votre choix.
            </p>

            <div
              className={
                styles.navigationChoices
              }
            >
              <button
                type="button"
                onClick={() =>
                  launchNavigation(
                    "google",
                  )
                }
              >
                <MapPin
                  size={18}
                />

                Google Maps

                <ExternalLink
                  size={15}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  launchNavigation(
                    "waze",
                  )
                }
              >
                <Navigation
                  size={18}
                />

                Waze

                <ExternalLink
                  size={15}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  launchNavigation(
                    "apple",
                  )
                }
              >
                <MapPin
                  size={18}
                />

                Apple Maps

                <ExternalLink
                  size={15}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {proofOpen && (
        <div
          className={
            styles.modalOverlay
          }
          onClick={
            closeProofModal
          }
        >
          <div
            className={
              styles.proofModal
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className={
                styles.modalClose
              }
              disabled={
                proofSaving
              }
              onClick={
                closeProofModal
              }
              aria-label="Fermer"
            >
              <X
                size={18}
              />
            </button>

            <div
              className={
                styles.proofModalHeader
              }
            >
              <div
                className={
                  styles.modalIcon
                }
              >
                <FileCheck2
                  size={25}
                />
              </div>

              <div>
                <span>
                  PREUVE DE LIVRAISON
                </span>

                <h2>
                  Confirmer la livraison
                </h2>

                <p>
                  {signatureRequired
                    ? "Signature obligatoire pour cette livraison."
                    : "Photo obligatoire pour cette livraison."}
                </p>
              </div>
            </div>

            <div
              className={
                styles.proofGpsStatus
              }
            >
              <Navigation
                size={17}
              />

              <div>
                <strong>
                  {gpsState ===
                  "active"
                    ? "Position GPS confirmée"
                    : "GPS requis"}
                </strong>

                <span>
                  {gpsState ===
                    "active" &&
                  position
                    ? `${position.latitude.toFixed(
                        5,
                      )}, ${position.longitude.toFixed(
                        5,
                      )}${
                        position.accuracy
                          ? ` · ±${Math.round(
                              position.accuracy,
                            )} m`
                          : ""
                      }`
                    : "Activez la géolocalisation avant de confirmer."}
                </span>
              </div>
            </div>

            <div
              className={
                styles.proofFormGrid
              }
            >
              <label>
                <span>
                  Prénom du destinataire *
                </span>

                <input
                  type="text"
                  value={
                    receiverFirstName
                  }
                  onChange={(event) =>
                    setReceiverFirstName(
                      event.target.value,
                    )
                  }
                  placeholder="Prénom"
                  autoComplete="given-name"
                  disabled={
                    proofSaving
                  }
                />
              </label>

              <label>
                <span>
                  Nom du destinataire *
                </span>

                <input
                  type="text"
                  value={
                    receiverLastName
                  }
                  onChange={(event) =>
                    setReceiverLastName(
                      event.target.value,
                    )
                  }
                  placeholder="Nom"
                  autoComplete="family-name"
                  disabled={
                    proofSaving
                  }
                />
              </label>
            </div>

            {!signatureRequired && (
              <div
                className={
                  styles.proofSection
                }
              >
                <div
                  className={
                    styles.proofSectionHeader
                  }
                >
                  <div>
                    <Camera
                      size={18}
                    />

                    <strong>
                      Photo de livraison *
                    </strong>
                  </div>

                  {proofPhoto && (
                    <span>
                      Photo prête
                    </span>
                  )}
                </div>

                <input
                  ref={
                    photoInputRef
                  }
                  className={
                    styles.hiddenFileInput
                  }
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={
                    handlePhotoChange
                  }
                  disabled={
                    proofSaving
                  }
                />

                {proofPhotoPreview ? (
                  <div
                    className={
                      styles.photoPreview
                    }
                  >
                    <img
                      src={
                        proofPhotoPreview
                      }
                      alt="Aperçu de la preuve de livraison"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        photoInputRef.current?.click()
                      }
                      disabled={
                        proofSaving
                      }
                    >
                      <Camera
                        size={16}
                      />

                      Reprendre
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={
                      styles.photoCaptureButton
                    }
                    onClick={() =>
                      photoInputRef.current?.click()
                    }
                    disabled={
                      proofSaving
                    }
                  >
                    <Camera
                      size={24}
                    />

                    <strong>
                      Prendre une photo
                    </strong>

                    <span>
                      Utilisez la caméra arrière du téléphone.
                    </span>
                  </button>
                )}
              </div>
            )}

            {signatureRequired && (
              <div
                className={
                  styles.proofSection
                }
              >
                <div
                  className={
                    styles.proofSectionHeader
                  }
                >
                  <div>
                    <PenLine
                      size={18}
                    />

                    <strong>
                      Signature du destinataire *
                    </strong>
                  </div>

                  {signatureReady && (
                    <span>
                      Signature prête
                    </span>
                  )}
                </div>

                <div
                  className={
                    styles.signatureBox
                  }
                >
                  <canvas
                    ref={
                      signatureCanvasRef
                    }
                    onPointerDown={
                      startSignature
                    }
                    onPointerMove={
                      drawSignature
                    }
                    onPointerUp={
                      endSignature
                    }
                    onPointerCancel={
                      endSignature
                    }
                    onPointerLeave={
                      endSignature
                    }
                  />

                  {!signatureReady && (
                    <div
                      className={
                        styles.signaturePlaceholder
                      }
                    >
                      Signez ici avec le doigt
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={
                    styles.clearSignatureButton
                  }
                  onClick={
                    clearSignature
                  }
                  disabled={
                    proofSaving ||
                    !signatureReady
                  }
                >
                  <RotateCcw
                    size={15}
                  />

                  Effacer la signature
                </button>
              </div>
            )}

            <label
              className={
                styles.proofNotesLabel
              }
            >
              <span>
                Notes de livraison
              </span>

              <textarea
                value={
                  proofNotes
                }
                onChange={(event) =>
                  setProofNotes(
                    event.target.value,
                  )
                }
                rows={3}
                placeholder="Ex. livré à la réception, palette intacte..."
                disabled={
                  proofSaving
                }
              />
            </label>

            <div
              className={
                styles.proofSummary
              }
            >
              <FileCheck2
                size={17}
              />

              <div>
                <strong>
                  Confirmation finale
                </strong>

                <span>
                  L'heure réelle de livraison sera enregistrée automatiquement par le serveur.
                </span>
              </div>
            </div>

            <button
              type="button"
              className={
                styles.proofSubmit
              }
              disabled={
                proofSaving
              }
              onClick={() =>
                void submitDeliveryProof()
              }
            >
              {proofSaving ? (
                <>
                  <Loader2
                    size={18}
                    className={
                      styles.spinner
                    }
                  />

                  Enregistrement...
                </>
              ) : (
                <>
                  <Upload
                    size={18}
                  />

                  Confirmer la livraison
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {incidentOpen && (
        <div
          className={
            styles.modalOverlay
          }
          onClick={() =>
            setIncidentOpen(
              false,
            )
          }
        >
          <div
            className={
              styles.modal
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className={
                styles.modalClose
              }
              onClick={() =>
                setIncidentOpen(
                  false,
                )
              }
              aria-label="Fermer"
            >
              <X
                size={18}
              />
            </button>

            <div
              className={
                styles.modalIcon
              }
            >
              <ShieldAlert
                size={25}
              />
            </div>

            <h2>
              Signaler un incident
            </h2>

            <p>
              Expliquez précisément ce qui s'est passé.
            </p>

            <textarea
              value={
                incidentReason
              }
              onChange={(event) =>
                setIncidentReason(
                  event.target.value,
                )
              }
              rows={5}
              maxLength={1000}
              placeholder="Ex. client absent, accès impossible, colis endommagé..."
            />

            <button
              type="button"
              className={
                styles.incidentSubmit
              }
              disabled={
                incidentSaving
              }
              onClick={() =>
                void reportIncident()
              }
            >
              {incidentSaving ? (
                <Loader2
                  size={17}
                  className={
                    styles.spinner
                  }
                />
              ) : (
                <ShieldAlert
                  size={17}
                />
              )}

              Envoyer l'incident
            </button>
          </div>
        </div>
      )}

      <div
        className={
          styles.bottomSpace
        }
      />
    </main>
  );
}
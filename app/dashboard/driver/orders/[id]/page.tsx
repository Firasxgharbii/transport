"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  Loader2,
  MapPin,
  Navigation,
  PackageCheck,
  PenLine,
  RotateCcw,
  Upload,
  ExternalLink,
  Phone,
  RefreshCw,
  ShieldAlert,
  Truck,
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
  "http://localhost:5000";

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
  pickup_date?: string | null;
  pickup_time?: string | null;

  delivery_address?: string;
  delivery_date?: string | null;
  delivery_time?: string | null;

  notes?: string;

  driver_id?: number | null;

  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_name?: string;
  vehicle_plate?: string;

  incident_reason?: string | null;
  cancellation_reason?: string | null;
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

type NextAction = {
  status: string;
  label: string;
  description: string;
} | null;

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

function statusClass(status?: string) {
  switch (status) {
    case "completed":
      return styles.statusCompleted;

    case "incident":
    case "cancelled":
      return styles.statusIncident;

    case "pickup_in_progress":
    case "picked_up":
    case "delivery_in_progress":
    case "arrived":
      return styles.statusProgress;

    default:
      return styles.statusAssigned;
  }
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Non définie";
  }

  const date =
    new Date(`${value}T12:00:00`);

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

function getNextAction(
  status?: string,
): NextAction {
  switch (status) {
    case "pending":
    case "assigned":
      return {
        status:
          "pickup_in_progress",

        label:
          "Commencer le ramassage",

        description:
          "Confirmer que vous partez vers le point de ramassage.",
      };

    case "pickup_in_progress":
      return {
        status:
          "picked_up",

        label:
          "Confirmer le ramassage",

        description:
          "Confirmer que la marchandise est chargée dans le véhicule.",
      };

    case "picked_up":
      return {
        status:
          "delivery_in_progress",

        label:
          "Commencer la livraison",

        description:
          "Confirmer votre départ vers l'adresse de livraison.",
      };

    case "delivery_in_progress":
      return {
        status:
          "arrived",

        label:
          "Je suis arrivé",

        description:
          "Confirmer votre arrivée à destination.",
      };

    case "arrived":
      return {
        status:
          "completed",

        label:
          "Terminer la livraison",

        description:
          "Confirmer que la livraison a été effectuée.",
      };

    default:
      return null;
  }
}

/* ============================================================
   PAGE
============================================================ */

export default function DriverOrderDetailsPage() {
  const router =
    useRouter();

  const params =
    useParams();

  const orderId =
    String(params.id || "");

  const watchIdRef =
    useRef<number | null>(null);

  const signatureCanvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const signatureDrawingRef =
    useRef(false);

  const photoInputRef =
    useRef<HTMLInputElement | null>(null);

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
    navigationOpen,
    setNavigationOpen,
  ] = useState(false);

  const [
    navigationAddress,
    setNavigationAddress,
  ] = useState("");

  const [
    order,
    setOrder,
  ] = useState<Order | null>(
    null,
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
    updating,
    setUpdating,
  ] = useState(false);

  const [
    gpsState,
    setGpsState,
  ] = useState<GpsState>(
    "loading",
  );

  const [
    gpsError,
    setGpsError,
  ] = useState("");

  const [
    position,
    setPosition,
  ] = useState<Position | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

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
            "Session expirée.",
          );
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              `Erreur API (${response.status}).`,
          );
        }

        return result;
      },
      [router],
    );

  /* ==========================================================
     LOAD ORDER
  ========================================================== */

  const loadOrder =
    useCallback(async () => {
      try {
        setError("");

        const result =
          await apiFetch<any>(
            `/api/orders/${orderId}`,
          );

        const receivedOrder =
          result.order ||
          result.data ||
          result;

        if (!receivedOrder) {
          throw new Error(
            "Livraison introuvable.",
          );
        }

        setOrder(
          receivedOrder,
        );
      } catch (reason) {
        console.error(
          "Erreur loadOrder:",
          reason,
        );

        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger cette livraison.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [
      apiFetch,
      orderId,
    ]);

  useEffect(() => {
    if (!orderId) return;

    void loadOrder();
  }, [
    orderId,
    loadOrder,
  ]);

  /* ==========================================================
     UPDATE STATUS
  ========================================================== */

  const updateStatus =
    async (
      newStatus: string,
      reason?: string,
    ) => {
      if (!order) return;

      try {
        setUpdating(true);
        setError("");
        setSuccess("");

        await apiFetch(
          `/api/orders/${order.id}/status`,
          {
            method: "PATCH",

            body:
              JSON.stringify({
                status:
                  newStatus,

                reason:
                  reason || null,

                status_reason:
                  reason || null,
              }),
          },
        );

        setOrder(
          (current) =>
            current
              ? {
                  ...current,
                  status:
                    newStatus,
                }
              : current,
        );

        setSuccess(
          `Statut mis à jour : ${statusLabel(
            newStatus,
          )}.`,
        );

        window.setTimeout(
          () => {
            setSuccess("");
          },
          3000,
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de modifier le statut.",
        );
      } finally {
        setUpdating(false);
      }
    };

  /* ==========================================================
     INCIDENT
  ========================================================== */

  const reportIncident =
    async () => {
      const reason =
        incidentReason.trim();

      if (!reason) {
        setError(
          "La raison de l'incident est obligatoire.",
        );

        return;
      }

      try {
        setIncidentSaving(
          true,
        );

        await updateStatus(
          "incident",
          reason,
        );

        setIncidentOpen(
          false,
        );

        setIncidentReason("");
      } finally {
        setIncidentSaving(
          false,
        );
      }
    };

  /* ==========================================================
     GPS SEND
  ========================================================== */

  const sendPosition =
    useCallback(
      async (
        coords:
          GeolocationCoordinates,
      ) => {
        if (!order) return;

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
                  order_id:
                    order.id,

                  ...gpsPosition,

                  recorded_at:
                    new Date().toISOString(),
                }),
            },
          );
        } catch (reason) {
          console.error(
            "Erreur tracking:",
            reason,
          );
        }
      },
      [
        order,
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
    }, [sendPosition]);

  /* ==========================================================
     AUTO GPS AFTER PERMISSION
  ========================================================== */

  useEffect(() => {
    if (!order) return;

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
    order,
    startGps,
  ]);

  /* ==========================================================
     PREUVE DE LIVRAISON
  ========================================================== */

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

      if (photoInputRef.current) {
        photoInputRef.current.value =
          "";
      }
    }, []);

  const openProofModal =
    useCallback(() => {
      setError("");
      setSuccess("");
      setProofOpen(true);
    }, []);

  const closeProofModal =
    useCallback(() => {
      if (proofSaving) {
        return;
      }

      setProofOpen(false);
    }, [proofSaving]);

  useEffect(() => {
    if (!proofOpen) {
      return;
    }

    const canvas =
      signatureCanvasRef.current;

    if (!canvas) {
      return;
    }

    const setupCanvas = () => {
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
            rect.width * ratio,
          ),
          1,
        );

      canvas.height =
        Math.max(
          Math.round(
            rect.height * ratio,
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
  }, [proofOpen]);

  useEffect(() => {
    return () => {
      if (proofPhotoPreview) {
        URL.revokeObjectURL(
          proofPhotoPreview,
        );
      }
    };
  }, [proofPhotoPreview]);

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
        getCanvasPoint(event);

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
        getCanvasPoint(event);

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

      setSignatureReady(true);
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

      setSignatureReady(false);
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
      if (!order) {
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

      if (!proofPhoto) {
        setError(
          "La photo de livraison est obligatoire.",
        );
        return;
      }

      if (!signatureReady) {
        setError(
          "La signature du destinataire est obligatoire.",
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

      const driverId =
        Number(order.driver_id);

      if (
        !Number.isInteger(
          driverId,
        ) ||
        driverId <= 0
      ) {
        setError(
          "Aucun chauffeur valide n'est associé à cette commande.",
        );
        return;
      }

      const canvas =
        signatureCanvasRef.current;

      if (!canvas) {
        setError(
          "Impossible de récupérer la signature.",
        );
        return;
      }

      try {
        setProofSaving(true);
        setError("");
        setSuccess("");

        const signatureBlob =
          await canvasToBlob(
            canvas,
          );

        if (!signatureBlob) {
          throw new Error(
            "Impossible de préparer la signature.",
          );
        }

        const formData =
          new FormData();

        formData.append(
          "driver_id",
          String(driverId),
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

        formData.append(
          "photo",
          proofPhoto,
          proofPhoto.name ||
            `delivery-${order.id}.jpg`,
        );

        formData.append(
          "signature",
          signatureBlob,
          `signature-${order.id}.png`,
        );

        const token =
          getToken();

        if (!token) {
          router.replace(
            "/login",
          );

          throw new Error(
            "Session expirée.",
          );
        }

        const response =
          await fetch(
            `${API_URL}/api/orders/${order.id}/proofs`,
            {
              method: "POST",

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
          response.status === 401
        ) {
          localStorage.removeItem(
            "glory_token",
          );

          sessionStorage.removeItem(
            "glory_token",
          );

          router.replace(
            "/login",
          );

          throw new Error(
            "Session expirée.",
          );
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              `Erreur API (${response.status}).`,
          );
        }

        setProofOpen(false);
        resetProofForm();

        setSuccess(
          "Preuve enregistrée. La livraison est maintenant terminée.",
        );

        setOrder(
          (current) =>
            current
              ? {
                  ...current,
                  status:
                    result.order
                      ?.status ||
                    result.data
                      ?.order
                      ?.status ||
                    "completed",
                }
              : current,
        );

        await loadOrder();

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

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const openNavigation =
    (
      address?: string,
    ) => {
      if (!address) return;

      setNavigationAddress(
        address,
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

  const nextAction =
    useMemo(
      () =>
        getNextAction(
          order?.status,
        ),
      [order?.status],
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
          Chargement de la livraison
        </h1>

        <p>
          Préparation de votre opération...
        </p>
      </main>
    );
  }

  if (!order) {
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
          Livraison introuvable
        </h1>

        <p>
          {error ||
            "Cette livraison n'existe pas."}
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

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <main
      className={
        styles.page
      }
    >
      {/* TOPBAR */}

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
            GLORY SOLUTIONS
          </span>

          <h1>
            {order.order_number ||
              `Commande #${order.id}`}
          </h1>

          <p>
            Gestion de la livraison
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

            void loadOrder();
          }}
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

      {/* STATUS HERO */}

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
            <Truck
              size={25}
            />
          </div>

          <div>
            <span
              className={
                styles.heroLabel
              }
            >
              LIVRAISON EN COURS
            </span>

            <h2>
              {statusLabel(
                order.status,
              )}
            </h2>

            <p>
              {clientName(
                order,
              )}
            </p>
          </div>
        </div>

        <span
          className={`${styles.statusBadge} ${statusClass(
            order.status,
          )}`}
        >
          {statusLabel(
            order.status,
          )}
        </span>
      </section>

      {/* GPS */}

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
        ) : gpsState ===
          "permission" ? (
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
        ) : null}
      </section>

      {/* MESSAGES */}

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

      {/* PROGRESS */}

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
              PROGRESSION
            </span>

            <h2>
              Étapes de livraison
            </h2>
          </div>
        </div>

        <div
          className={
            styles.progressSteps
          }
        >
          {[
            [
              "assigned",
              "Assignée",
            ],

            [
              "pickup_in_progress",
              "Ramassage",
            ],

            [
              "picked_up",
              "Ramassée",
            ],

            [
              "delivery_in_progress",
              "En livraison",
            ],

            [
              "arrived",
              "Arrivé",
            ],

            [
              "completed",
              "Terminée",
            ],
          ].map(
            (
              [
                value,
                label,
              ],
              index,
            ) => {
              const orderFlow = [
                "assigned",
                "pickup_in_progress",
                "picked_up",
                "delivery_in_progress",
                "arrived",
                "completed",
              ];

              const currentIndex =
                orderFlow.indexOf(
                  order.status ||
                    "assigned",
                );

              const active =
                index <=
                currentIndex;

              return (
                <div
                  key={
                    value
                  }
                  className={`${styles.progressStep} ${
                    active
                      ? styles.progressStepActive
                      : ""
                  }`}
                >
                  <span>
                    {active ? (
                      <CheckCircle2
                        size={15}
                      />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <small>
                    {label}
                  </small>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* GRID */}

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
          {/* PICKUP */}

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
                <PackageCheck
                  size={19}
                />
              </div>

              <div>
                <span>
                  RAMASSAGE
                </span>

                <h2>
                  Point de départ
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
                {order.pickup_address ||
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
                    order.pickup_date,
                  )}
                </span>
              </div>

              <div>
                <Clock3
                  size={15}
                />

                <span>
                  {formatTime(
                    order.pickup_time,
                  )}
                </span>
              </div>
            </div>

            {order.pickup_address && (
              <button
                type="button"
                className={
                  styles.navigationButton
                }
                onClick={() =>
                  openNavigation(
                    order.pickup_address,
                  )
                }
              >
                <Navigation
                  size={17}
                />

                Navigation vers le ramassage

                <ChevronRight
                  size={16}
                />
              </button>
            )}
          </section>

          {/* DELIVERY */}

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
                  LIVRAISON
                </span>

                <h2>
                  Destination
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
                {order.delivery_address ||
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
                    order.delivery_date,
                  )}
                </span>
              </div>

              <div>
                <Clock3
                  size={15}
                />

                <span>
                  {formatTime(
                    order.delivery_time,
                  )}
                </span>
              </div>
            </div>

            {order.delivery_address && (
              <button
                type="button"
                className={
                  styles.navigationButton
                }
                onClick={() =>
                  openNavigation(
                    order.delivery_address,
                  )
                }
              >
                <Navigation
                  size={17}
                />

                Navigation vers le client

                <ChevronRight
                  size={16}
                />
              </button>
            )}
          </section>

          {/* NOTES */}

          {order.notes && (
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
                {order.notes}
              </p>
            </section>
          )}
        </div>

        {/* SIDEBAR */}

        <aside
          className={
            styles.sideColumn
          }
        >
          {/* CLIENT */}

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
                  order,
                )}
              </strong>

              {order.client_email && (
                <small>
                  {
                    order.client_email
                  }
                </small>
              )}
            </div>

            {order.client_phone && (
              <a
                href={`tel:${order.client_phone}`}
                className={
                  styles.phoneButton
                }
              >
                <Phone
                  size={16}
                />

                Appeler le client
              </a>
            )}
          </section>

          {/* VEHICLE */}

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
                    order.vehicle_name,
                    order.vehicle_make,
                    order.vehicle_model,
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      " ",
                    ) ||
                    "Aucun véhicule"}
                </strong>

                <small>
                  {order.vehicle_plate ||
                    "Plaque non disponible"}
                </small>
              </div>
            </div>
          </section>

          {/* PROOF */}

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
              La livraison finale exige une photo, la signature du destinataire et son nom.
            </p>

            <button
              type="button"
              className={
                styles.secondaryButton
              }
              disabled={
                order.status ===
                  "completed" ||
                proofSaving
              }
              onClick={
                openProofModal
              }
            >
              <Camera
                size={17}
              />

              {order.status ===
              "completed"
                ? "Preuve enregistrée"
                : "Ajouter la preuve"}
            </button>
          </section>

          {/* INCIDENT */}

          {order.status !==
            "completed" &&
            order.status !==
              "cancelled" && (
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
                      Problème pendant la livraison ?
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

      {/* NEXT ACTION */}

      {nextAction && (
        <section
          className={
            styles.actionCard
          }
        >
          <div>
            <span>
              PROCHAINE ÉTAPE
            </span>

            <h2>
              {nextAction.label}
            </h2>

            <p>
              {nextAction.description}
            </p>
          </div>

          <button
            type="button"
            className={
              styles.primaryButton
            }
            disabled={
              updating
            }
            onClick={() => {
              if (
                nextAction.status ===
                "completed"
              ) {
                openProofModal();
                return;
              }

              void updateStatus(
                nextAction.status,
              );
            }}
          >
            {updating ? (
              <>
                <Loader2
                  size={18}
                  className={
                    styles.spinner
                  }
                />

                Mise à jour...
              </>
            ) : (
              <>
                <CheckCircle2
                  size={18}
                />

                {nextAction.label}
              </>
            )}
          </button>
        </section>
      )}

      {order.status ===
        "completed" && (
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
              Livraison terminée
            </strong>

            <p>
              Cette livraison a été complétée avec succès.
            </p>
          </div>
        </section>
      )}

      {/* NAVIGATION MODAL */}

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
              <X size={18} />
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
                <MapPin size={18} />
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
                <MapPin size={18} />
                Apple Maps
                <ExternalLink
                  size={15}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREUVE DE LIVRAISON MODAL */}

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
              <X size={18} />
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
                  Photo, identité du destinataire et signature obligatoires.
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
                    : "Activez la géolocalisation avant de terminer."}
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
                      event.target
                        .value,
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
                      event.target
                        .value,
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
                    event.target
                      .value,
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

      {/* INCIDENT MODAL */}

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
            onClick={(
              event,
            ) =>
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
              onChange={(
                event,
              ) =>
                setIncidentReason(
                  event.target
                    .value,
                )
              }
              rows={5}
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
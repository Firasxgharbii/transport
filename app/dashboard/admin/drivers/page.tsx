"use client";

import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  UserRoundCog,
  Unlink,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import Link from "next/link";


import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import styles from "./drivers.module.css";

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

  current_orders?: number;
  today_orders?: number;
  yesterday_orders?: number;
  remaining_stops?: number;

  completed_orders?: number;
  total_orders?: number;

  last_seen_at?: string | null;
  created_at?: string;
};

type DriverOrder = {
  id: number;
  order_number?: string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
  company_name?: string | null;
  pickup_address?: string | null;
  delivery_address?: string | null;
  pickup_date?: string | null;
  pickup_time?: string | null;
  delivery_date?: string | null;
  delivery_time?: string | null;
  status?: string | null;
  priority?: string | null;
  route_position?: number | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_plate?: string | null;

  stop_count?: number | null;
  completed_stops?: number | null;
  remaining_stops?: number | null;

  package_count?: number | null;
  delivered_packages?: number | null;
  remaining_packages?: number | null;
  last_scan_at?: string | null;

  created_at?: string | null;
};

type ApiResponse<T> = {
  success?: boolean;

  data?: T;
  drivers?: T;

  message?: string;
};

type RegisterResponse = {
  success?: boolean;

  message?: string;

  data?: {
    userId?: number;
    email?: string;
    role?: string;
    status?: string;
  };
};

type CreateDriverResponse = {
  success?: boolean;

  message?: string;

  driver?: Driver;
  data?: Driver;
};

type Filter =
  | "all"
  | DriverAvailability;

type HistoryFilter =
  | "all"
  | "today"
  | "tomorrow"
  | "7days"
  | "30days"
  | "custom";

type DriverForm = {
  firstName: string;
  lastName: string;

  email: string;
  phone: string;

  password: string;
  confirmPassword: string;

  licenseNumber: string;
  licenseExpiry: string;

  address: string;
  city: string;
  province: string;
  postalCode: string;

  emergencyContactName: string;
  emergencyContactPhone: string;
};

/* ============================================================
   CONFIGURATION
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const ITEMS_PER_PAGE = 8;

const initialDriverForm: DriverForm = {
  firstName: "",
  lastName: "",

  email: "",
  phone: "",

  password: "",
  confirmPassword: "",

  licenseNumber: "",
  licenseExpiry: "",

  address: "",
  city: "",
  province: "Québec",
  postalCode: "",

  emergencyContactName: "",
  emergencyContactPhone: "",
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
    localStorage.getItem("glory_token") ||
    sessionStorage.getItem("glory_token") ||
    ""
  );
}

function getInitials(
  firstName?: string,
  lastName?: string,
) {
  return (
    `${firstName?.charAt(0) || ""}${
      lastName?.charAt(0) || ""
    }`.toUpperCase() || "CH"
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

function getOrderDateValue(order: DriverOrder) {
  return order.pickup_date || order.delivery_date || order.created_at || null;
}

function toDateKey(value?: string | null) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateKeyOffset(days: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function yesterdayKey() {
  return dateKeyOffset(-1);
}

function tomorrowKey() {
  return dateKeyOffset(1);
}

function formatDayTitle(key: string) {
  if (key === todayKey()) return "Aujourd’hui";
  if (key === tomorrowKey()) return "Demain";
  if (key === yesterdayKey()) return "Hier";
  if (key === "unknown") return "Date non disponible";

  const date = new Date(`${key}T12:00:00`);

  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatShortDate(key: string) {
  if (key === todayKey()) return "Aujourd’hui";
  if (key === tomorrowKey()) return "Demain";
  if (key === yesterdayKey()) return "Hier";

  const date = new Date(`${key}T12:00:00`);

  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function isDateKeyInRange(
  key: string,
  startKey: string,
  endKey: string,
) {
  if (key === "unknown") return false;
  return key >= startKey && key <= endKey;
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function getOrderStatusLabel(status?: string | null) {
  switch (status) {
    case "pending": return "En attente";
    case "assigned": return "Assignée";
    case "pickup_in_progress": return "Ramassage en cours";
    case "picked_up": return "Ramassée";
    case "delivery_in_progress": return "En livraison";
    case "arrived": return "Arrivé";
    case "completed": return "Terminée";
    case "cancelled": return "Annulée";
    case "incident": return "Incident";
    default: return status || "Non défini";
  }
}

/* ============================================================
   PAGE
============================================================ */

export default function DriversPage() {
  const router = useRouter();

  const [
    drivers,
    setDrivers,
  ] = useState<Driver[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionId,
    setActionId,
  ] = useState<number | null>(
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
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState<Filter>("all");

  const [
    page,
    setPage,
  ] = useState(1);

  const [historyDriver, setHistoryDriver] =
    useState<Driver | null>(null);

  const [historyOrders, setHistoryOrders] =
    useState<DriverOrder[]>([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [historyFilter, setHistoryFilter] =
    useState<HistoryFilter>("today");

  const [customHistoryDate, setCustomHistoryDate] =
    useState(todayKey());

  const [expandedOrderId, setExpandedOrderId] =
    useState<number | null>(null);

  const [orderActionId, setOrderActionId] =
    useState<number | null>(null);

  /* ==========================================================
     MODAL CRÉATION
  ========================================================== */

  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false);

  const [
    creatingDriver,
    setCreatingDriver,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    driverForm,
    setDriverForm,
  ] = useState<DriverForm>(
    initialDriverForm,
  );

  /* ==========================================================
     FETCH AUTHENTIFIÉ
  ========================================================== */

  const authenticatedFetch =
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

              cache:
                "no-store",
            },
          );

        let data:
          | unknown = null;

        try {
          data =
            await response.json();
        } catch {
          data = null;
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
              data as {
                message?: string;
              } | null
            )?.message ||
              "Une erreur est survenue.",
          );
        }

        return data as T;
      },
      [router],
    );

  /* ==========================================================
     CHARGER CHAUFFEURS
  ========================================================== */

  const loadDrivers =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await authenticatedFetch<
            ApiResponse<Driver[]>
          >(
            "/api/drivers",
          );

        const receivedDrivers =
          Array.isArray(
            result.data,
          )
            ? result.data
            : Array.isArray(
                  result.drivers,
                )
              ? result.drivers
              : [];

        setDrivers(
          receivedDrivers,
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger les chauffeurs.",
        );
      } finally {
        setLoading(false);
      }
    }, [authenticatedFetch]);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  useEffect(() => {
    // Évite que le rafraîchissement automatique perturbe
    // le formulaire pendant l’ajout d’un chauffeur.
    if (createModalOpen) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadDrivers();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadDrivers, createModalOpen]);

  /* ==========================================================
     FORMULAIRE
  ========================================================== */

  const handleDriverFormChange = (
    event: ChangeEvent<
      HTMLInputElement
    >,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setDriverForm(
      (previous) => ({
        ...previous,

        [name]: value,
      }),
    );

    if (error) {
      setError("");
    }
  };

  const closeCreateModal =
    () => {
      if (creatingDriver) {
        return;
      }

      setCreateModalOpen(
        false,
      );

      setDriverForm(
        initialDriverForm,
      );

      setShowPassword(
        false,
      );

      setShowConfirmPassword(
        false,
      );
    };

  /* ==========================================================
     VALIDATION
  ========================================================== */

  function validateDriverForm() {
    const firstName =
      driverForm.firstName.trim();

    const lastName =
      driverForm.lastName.trim();

    const email =
      driverForm.email
        .trim()
        .toLowerCase();

    if (
      firstName.length < 2
    ) {
      return "Veuillez entrer un prénom valide.";
    }

    if (
      lastName.length < 2
    ) {
      return "Veuillez entrer un nom valide.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      return "Veuillez entrer une adresse courriel valide.";
    }

    if (
      driverForm.password
        .length < 8
    ) {
      return "Le mot de passe doit contenir au moins 8 caractères.";
    }

    if (
      !/[A-Z]/.test(
        driverForm.password,
      )
    ) {
      return "Le mot de passe doit contenir une majuscule.";
    }

    if (
      !/[a-z]/.test(
        driverForm.password,
      )
    ) {
      return "Le mot de passe doit contenir une minuscule.";
    }

    if (
      !/[0-9]/.test(
        driverForm.password,
      )
    ) {
      return "Le mot de passe doit contenir un chiffre.";
    }

    if (
      !/[^A-Za-z0-9]/.test(
        driverForm.password,
      )
    ) {
      return "Le mot de passe doit contenir un caractère spécial.";
    }

    if (
      driverForm.password !==
      driverForm.confirmPassword
    ) {
      return "Les deux mots de passe ne correspondent pas.";
    }

    return "";
  }

  /* ==========================================================
     CRÉER CHAUFFEUR
  ========================================================== */

  const createDriver =
    async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      const validationError =
        validateDriverForm();

      if (validationError) {
        setError(
          validationError,
        );

        return;
      }

      setCreatingDriver(
        true,
      );

      setError("");
      setSuccess("");

      try {
        /* ====================================================
           ÉTAPE 1
           CRÉER USER ROLE DRIVER
        ==================================================== */

        const registerResult =
          await authenticatedFetch<RegisterResponse>(
            "/api/auth/register",
            {
              method: "POST",

              body: JSON.stringify({
                first_name:
                  driverForm.firstName.trim(),

                last_name:
                  driverForm.lastName.trim(),

                email:
                  driverForm.email
                    .trim()
                    .toLowerCase(),

                phone:
                  driverForm.phone.trim() ||
                  null,

                password:
                  driverForm.password,

                role_name:
                  "driver",
              }),
            },
          );

        const userId =
          Number(
            registerResult.data
              ?.userId,
          );

        if (
          !Number.isInteger(
            userId,
          ) ||
          userId <= 0
        ) {
          throw new Error(
            "Le compte utilisateur a été créé mais son identifiant est invalide.",
          );
        }

        /* ====================================================
           ÉTAPE 2
           CRÉER PROFIL DRIVER
        ==================================================== */

        await authenticatedFetch<CreateDriverResponse>(
          "/api/drivers",
          {
            method: "POST",

            body: JSON.stringify({
              user_id:
                userId,

              phone:
                driverForm.phone.trim() ||
                null,

              availability_status:
                "offline",

              license_number:
                driverForm.licenseNumber.trim() ||
                null,

              license_expiry:
                driverForm.licenseExpiry ||
                null,

              address:
                driverForm.address.trim() ||
                null,

              city:
                driverForm.city.trim() ||
                null,

              province:
                driverForm.province.trim() ||
                null,

              postal_code:
                driverForm.postalCode.trim() ||
                null,

              emergency_contact_name:
                driverForm.emergencyContactName.trim() ||
                null,

              emergency_contact_phone:
                driverForm.emergencyContactPhone.trim() ||
                null,
            }),
          },
        );

        setSuccess(
          `Le compte chauffeur de ${driverForm.firstName.trim()} ${driverForm.lastName.trim()} a été créé avec succès.`,
        );

        setCreateModalOpen(
          false,
        );

        setDriverForm(
          initialDriverForm,
        );

        await loadDrivers();
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de créer le chauffeur.",
        );
      } finally {
        setCreatingDriver(
          false,
        );
      }
    };

  const loadHistoryOrders = useCallback(
    async (
      driver: Driver,
      options?: {
        silent?: boolean;
      },
    ) => {
      if (!options?.silent) {
        setHistoryLoading(true);
      }

      try {
        const result =
          await authenticatedFetch<
            ApiResponse<DriverOrder[]>
          >(
            `/api/drivers/${driver.id}/orders`,
          );

        const orders = Array.isArray(
          result.data,
        )
          ? result.data
          : Array.isArray(
                result.drivers,
              )
            ? (result.drivers as unknown as DriverOrder[])
            : [];

        setHistoryOrders(orders);
      } catch (reason) {
        if (!options?.silent) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Impossible de charger le planning du chauffeur.",
          );
        }
      } finally {
        if (!options?.silent) {
          setHistoryLoading(false);
        }
      }
    },
    [authenticatedFetch],
  );

  const openHistory = async (
    driver: Driver,
  ) => {
    setHistoryDriver(driver);
    setHistoryOrders([]);
    setHistoryFilter("today");
    setCustomHistoryDate(
      todayKey(),
    );
    setExpandedOrderId(null);
    setError("");

    await loadHistoryOrders(
      driver,
    );
  };

  useEffect(() => {
    if (!historyDriver) {
      return;
    }

    const interval =
      window.setInterval(() => {
        void loadHistoryOrders(
          historyDriver,
          {
            silent: true,
          },
        );
      }, 5000);

    return () =>
      window.clearInterval(
        interval,
      );
  }, [
    historyDriver,
    loadHistoryOrders,
  ]);

  const historyCounts =
    useMemo(() => {
      const today = todayKey();
      const tomorrow =
        tomorrowKey();

      const end7 =
        dateKeyOffset(6);

      const end30 =
        dateKeyOffset(29);

      return {
        today:
          historyOrders.filter(
            (order) =>
              toDateKey(
                getOrderDateValue(
                  order,
                ),
              ) === today,
          ).length,

        tomorrow:
          historyOrders.filter(
            (order) =>
              toDateKey(
                getOrderDateValue(
                  order,
                ),
              ) === tomorrow,
          ).length,

        sevenDays:
          historyOrders.filter(
            (order) =>
              isDateKeyInRange(
                toDateKey(
                  getOrderDateValue(
                    order,
                  ),
                ),
                today,
                end7,
              ),
          ).length,

        thirtyDays:
          historyOrders.filter(
            (order) =>
              isDateKeyInRange(
                toDateKey(
                  getOrderDateValue(
                    order,
                  ),
                ),
                today,
                end30,
              ),
          ).length,
      };
    }, [historyOrders]);

  const visibleHistoryOrders =
    useMemo(() => {
      const today =
        todayKey();

      const orderDateMatches = (
        order: DriverOrder,
      ) => {
        const key =
          toDateKey(
            getOrderDateValue(
              order,
            ),
          );

        switch (
          historyFilter
        ) {
          case "today":
            return key === today;

          case "tomorrow":
            return (
              key ===
              tomorrowKey()
            );

          case "7days":
            return isDateKeyInRange(
              key,
              today,
              dateKeyOffset(6),
            );

          case "30days":
            return isDateKeyInRange(
              key,
              today,
              dateKeyOffset(29),
            );

          case "custom":
            return (
              key ===
              customHistoryDate
            );

          case "all":
          default:
            return true;
        }
      };

      return historyOrders.filter(
        orderDateMatches,
      );
    }, [
      historyOrders,
      historyFilter,
      customHistoryDate,
    ]);

  const groupedHistory =
    useMemo(() => {
      const map =
        new Map<
          string,
          DriverOrder[]
        >();

      for (
        const order of
          visibleHistoryOrders
      ) {
        const key =
          toDateKey(
            getOrderDateValue(
              order,
            ),
          );

        const current =
          map.get(key) || [];

        current.push(order);

        map.set(
          key,
          current,
        );
      }

      for (
        const orders of
          map.values()
      ) {
        orders.sort(
          (a, b) => {
            const timeA =
              a.pickup_time ||
              a.delivery_time ||
              "23:59:59";

            const timeB =
              b.pickup_time ||
              b.delivery_time ||
              "23:59:59";

            return timeA.localeCompare(
              timeB,
            );
          },
        );
      }

      return Array.from(
        map.entries(),
      ).sort(([a], [b]) => {
        if (
          historyFilter ===
          "all"
        ) {
          return b.localeCompare(
            a,
          );
        }

        return a.localeCompare(
          b,
        );
      });
    }, [
      visibleHistoryOrders,
      historyFilter,
    ]);

  const reassignOrder =
    async (
      order: DriverOrder,
      nextDriverId: number,
    ) => {
      if (
        !Number.isInteger(
          nextDriverId,
        ) ||
        nextDriverId <= 0
      ) {
        return;
      }

      if (
        historyDriver &&
        nextDriverId ===
          historyDriver.id
      ) {
        return;
      }

      setOrderActionId(
        order.id,
      );

      setError("");
      setSuccess("");

      try {
        await authenticatedFetch(
          `/api/orders/${order.id}/assign-driver`,
          {
            method: "PATCH",

            body: JSON.stringify({
              driver_id:
                nextDriverId,

              comment:
                historyDriver
                  ? `Commande réassignée depuis le planning de ${historyDriver.first_name || "chauffeur"} ${historyDriver.last_name || ""}`.trim()
                  : "Commande réassignée depuis le planning chauffeur",
            }),
          },
        );

        setSuccess(
          `${order.order_number || `Commande #${order.id}`} a été réassignée.`,
        );

        if (
          historyDriver
        ) {
          await loadHistoryOrders(
            historyDriver,
          );
        }

        await loadDrivers();
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de réassigner la commande.",
        );
      } finally {
        setOrderActionId(
          null,
        );
      }
    };

  const unassignOrder =
    async (
      order: DriverOrder,
    ) => {
      if (
        !window.confirm(
          `Retirer ${order.order_number || `la commande #${order.id}`} de ce chauffeur ? La commande ne sera pas supprimée.`,
        )
      ) {
        return;
      }

      setOrderActionId(
        order.id,
      );

      setError("");
      setSuccess("");

      try {
        await authenticatedFetch(
          `/api/orders/${order.id}`,
          {
            method: "PUT",

            body: JSON.stringify({
              driver_id: null,
            }),
          },
        );

        setSuccess(
          `${order.order_number || `Commande #${order.id}`} a été retirée du chauffeur.`,
        );

        if (
          historyDriver
        ) {
          await loadHistoryOrders(
            historyDriver,
          );
        }

        await loadDrivers();
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de retirer la commande du chauffeur.",
        );
      } finally {
        setOrderActionId(
          null,
        );
      }
    };

  const editOrderSchedule =
    async (
      order: DriverOrder,
    ) => {
      const pickupDate =
        window.prompt(
          "Date de ramassage (AAAA-MM-JJ)",
          order.pickup_date
            ? String(
                order.pickup_date,
              ).slice(0, 10)
            : "",
        );

      if (
        pickupDate === null
      ) {
        return;
      }

      const pickupTime =
        window.prompt(
          "Heure de ramassage (HH:MM)",
          formatTime(
            order.pickup_time,
          ) === "—"
            ? ""
            : formatTime(
                order.pickup_time,
              ),
        );

      if (
        pickupTime === null
      ) {
        return;
      }

      const deliveryDate =
        window.prompt(
          "Date de livraison (AAAA-MM-JJ)",
          order.delivery_date
            ? String(
                order.delivery_date,
              ).slice(0, 10)
            : "",
        );

      if (
        deliveryDate === null
      ) {
        return;
      }

      const deliveryTime =
        window.prompt(
          "Heure de livraison (HH:MM)",
          formatTime(
            order.delivery_time,
          ) === "—"
            ? ""
            : formatTime(
                order.delivery_time,
              ),
        );

      if (
        deliveryTime === null
      ) {
        return;
      }

      setOrderActionId(
        order.id,
      );

      setError("");
      setSuccess("");

      try {
        await authenticatedFetch(
          `/api/orders/${order.id}`,
          {
            method: "PUT",

            body: JSON.stringify({
              pickup_date:
                pickupDate || null,

              pickup_time:
                pickupTime || null,

              delivery_date:
                deliveryDate || null,

              delivery_time:
                deliveryTime || null,
            }),
          },
        );

        setSuccess(
          `${order.order_number || `Commande #${order.id}`} a été mise à jour.`,
        );

        if (
          historyDriver
        ) {
          await loadHistoryOrders(
            historyDriver,
          );
        }

        await loadDrivers();
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de modifier la commande.",
        );
      } finally {
        setOrderActionId(
          null,
        );
      }
    };

  /* ==========================================================
     PAGINATION / FILTRES
  ========================================================== */

  useEffect(() => {
    setPage(1);
  }, [
    search,
    filter,
  ]);

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

  const offlineCount =
    useMemo(
      () =>
        drivers.filter(
          (driver) =>
            !driver.availability_status ||
            driver.availability_status ===
              "offline",
        ).length,
      [drivers],
    );

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

  const totalPages =
    Math.max(
      1,

      Math.ceil(
        filteredDrivers.length /
          ITEMS_PER_PAGE,
      ),
    );

  useEffect(() => {
    if (
      page > totalPages
    ) {
      setPage(
        totalPages,
      );
    }
  }, [
    page,
    totalPages,
  ]);

  const visibleDrivers =
    useMemo(() => {
      const start =
        (page - 1) *
        ITEMS_PER_PAGE;

      return filteredDrivers.slice(
        start,
        start +
          ITEMS_PER_PAGE,
      );
    }, [
      filteredDrivers,
      page,
    ]);

  /* ==========================================================
     DISPONIBILITÉ
  ========================================================== */

  const updateAvailability =
    async (
      driver: Driver,

      availability_status:
        DriverAvailability,
    ) => {
      setActionId(
        driver.id,
      );

      setError("");
      setSuccess("");

      try {
        await authenticatedFetch(
          `/api/drivers/${driver.id}`,
          {
            method: "PUT",

            body: JSON.stringify({
              availability_status,
            }),
          },
        );

        setDrivers(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                driver.id
                  ? {
                      ...item,

                      availability_status,
                    }
                  : item,
            ),
        );

        setSuccess(
          `Le statut de ${
            driver.first_name ||
            "ce chauffeur"
          } a été mis à jour.`,
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de modifier le chauffeur.",
        );
      } finally {
        setActionId(
          null,
        );
      }
    };

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <main
      className={styles.page}
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
          <span
            className={
              styles.eyebrow
            }
          >
            <Truck size={16} />
            Gestion des chauffeurs
          </span>

          <h1>
            Chauffeurs
          </h1>

          <p>
            Consultez la disponibilité,
            les commandes, les véhicules
            et le profil de chaque
            chauffeur.
          </p>
        </div>

        <div
          className={
            styles.headingActions
          }
        >
          <button
            type="button"
            className={
              styles.addDriverButton
            }
            onClick={() => {
              setError("");
              setSuccess("");

              setCreateModalOpen(
                true,
              );
            }}
          >
            <Plus size={18} />

            Ajouter un chauffeur
          </button>

          <button
            type="button"
            className={
              styles.refreshButton
            }
            onClick={() =>
              void loadDrivers()
            }
            disabled={loading}
          >
            <RefreshCw
              className={
                loading
                  ? styles.spin
                  : ""
              }
              size={17}
            />

            Actualiser
          </button>
        </div>
      </section>

      {/* ======================================================
          MESSAGES
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

          <span>
            {success}
          </span>

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
          value={drivers.length}
          icon={
            <UserRound
              size={20}
            />
          }
          variant="total"
        />

        <StatCard
          label="Disponibles"
          value={availableCount}
          icon={
            <CheckCircle2
              size={20}
            />
          }
          variant="available"
        />

        <StatCard
          label="En livraison"
          value={busyCount}
          icon={
            <Truck size={20} />
          }
          variant="busy"
        />

        <StatCard
          label="Hors ligne"
          value={offlineCount}
          icon={
            <Clock3 size={20} />
          }
          variant="offline"
        />
      </section>

      {/* ======================================================
          PANEL TABLE
      ====================================================== */}

      <section
        className={styles.panel}
      >
        <div
          className={
            styles.toolbar
          }
        >
          <label
            className={
              styles.searchBox
            }
          >
            <Search size={18} />

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
              placeholder="Rechercher un chauffeur, un véhicule..."
            />
          </label>

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
                "En livraison",
              ],
              [
                "on_break",
                "En pause",
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
        </div>

        <div
          className={
            styles.tableWrapper
          }
        >
          <table
            className={
              styles.table
            }
          >
            <thead>
              <tr>
                <th>
                  Chauffeur
                </th>

                <th>
                  Contact
                </th>

                <th>
                  Disponibilité
                </th>

                <th>
                  Commandes actives
                </th>

                <th>
                  Arrêts restants
                </th>

                <th>
                  Véhicule
                </th>

                <th>
                  Dernière activité
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({
                  length: 5,
                }).map(
                  (
                    _,
                    index,
                  ) => (
                    <tr
                      key={
                        index
                      }
                    >
                      <td
                        colSpan={
                          8
                        }
                      >
                        <div
                          className={
                            styles.skeleton
                          }
                        />
                      </td>
                    </tr>
                  ),
                )
              ) : visibleDrivers.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={8}
                  >
                    <div
                      className={
                        styles.emptyState
                      }
                    >
                      <Truck
                        size={36}
                      />

                      <h2>
                        Aucun
                        chauffeur
                        trouvé
                      </h2>

                      <p>
                        Modifiez les
                        filtres ou
                        ajoutez votre
                        premier
                        chauffeur.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleDrivers.map(
                  (driver) => (
                    <tr
                      key={
                        driver.id
                      }
                    >
                      <td>
                        <div
                          className={
                            styles.identity
                          }
                        >
                          <span>
                            {getInitials(
                              driver.first_name,
                              driver.last_name,
                            )}
                          </span>

                          <div>
                            <strong>
                              {driver.first_name ||
                                "Chauffeur"}{" "}
                              {driver.last_name ||
                                ""}
                            </strong>

                            <small>
                              ID #
                              {
                                driver.id
                              }
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            styles.contact
                          }
                        >
                          <span>
                            <Phone
                              size={
                                14
                              }
                            />

                            {driver.phone ||
                              "Non fourni"}
                          </span>

                          <span>
                            {driver.email ||
                              "Courriel non fourni"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${
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
                          }`}
                        >
                          {getAvailabilityLabel(
                            driver.availability_status,
                          )}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <strong>{driver.current_orders ?? 0}</strong>
                          <small style={{ color: "#8b8d98", fontSize: 10 }}>
                            {driver.today_orders ?? 0} aujourd’hui · {driver.yesterday_orders ?? 0} hier
                          </small>
                        </div>
                      </td>

                      <td>
                        {driver.remaining_stops ??
                          0}
                      </td>

                      <td>
                        <div
                          className={
                            styles.vehicleCell
                          }
                        >
                          <Truck
                            size={
                              15
                            }
                          />

                          <span>
                            {driver.vehicle_name ||
                              "Non assigné"}

                            {driver.vehicle_plate
                              ? ` · ${driver.vehicle_plate}`
                              : ""}
                          </span>
                        </div>
                      </td>

                      <td>
                        {formatDate(
                          driver.last_seen_at,
                        )}
                      </td>

                      <td>
                        <div
                          className={
                            styles.actions
                          }
                        >
                          <Link
                            href={`/dashboard/admin/drivers/${driver.id}`}
                            className={
                              styles.viewButton
                            }
                            title="Voir le profil"
                          >
                            <Eye
                              size={
                                16
                              }
                            />
                          </Link>

                          <button
                            type="button"
                            className={styles.moreButton}
                            title="Voir le planning"
                            onClick={() => void openHistory(driver)}
                          >
                            <CalendarDays size={16} />
                          </button>

                          <select
                            value={(driver.availability_status as DriverAvailability) || "offline"}
                            onChange={(event) =>
                              void updateAvailability(
                                driver,
                                event.target.value as DriverAvailability,
                              )
                            }
                            disabled={actionId === driver.id}
                            title="Changer la disponibilité"
                            style={{
                              minWidth: 126,
                              height: 36,
                              border: "1px solid #e5e7eb",
                              borderRadius: 10,
                              background: "#fff",
                              padding: "0 10px",
                              fontSize: 11,
                              fontWeight: 800,
                              color: "#262833",
                              cursor: actionId === driver.id ? "wait" : "pointer",
                            }}
                          >
                            <option value="available">Disponible</option>
                            <option value="busy">En livraison</option>
                            <option value="on_break">En pause</option>
                            <option value="offline">Hors ligne</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>

        <footer
          className={
            styles.pagination
          }
        >
          <span>
            {
              filteredDrivers.length
            }{" "}
            chauffeur
            {filteredDrivers.length >
            1
              ? "s"
              : ""}
          </span>

          <div>
            <button
              type="button"
              onClick={() =>
                setPage(
                  (
                    current,
                  ) =>
                    Math.max(
                      1,
                      current -
                        1,
                    ),
                )
              }
              disabled={
                page === 1
              }
            >
              Précédent
            </button>

            <span>
              Page {page} sur{" "}
              {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage(
                  (
                    current,
                  ) =>
                    Math.min(
                      totalPages,
                      current +
                        1,
                    ),
                )
              }
              disabled={
                page ===
                totalPages
              }
            >
              Suivant
            </button>
          </div>
        </footer>
      </section>

      {/* ======================================================
          TRACKING
      ====================================================== */}

      <section
        className={
          styles.liveMapPreview
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            <MapPin size={16} />
            Suivi en direct
          </span>

          <h2>
            Carte globale des
            chauffeurs
          </h2>

          <p>
            Consultez les positions
            GPS et l'activité de vos
            chauffeurs.
          </p>
        </div>

        <Link
          href="/dashboard/admin/drivers/live-map"
          className={
            styles.mapButton
          }
        >
          Ouvrir la carte
        </Link>
      </section>

      {historyDriver && (
        <div
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setHistoryDriver(
                null,
              );
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            background:
              "rgba(15, 16, 22, 0.50)",
            display: "flex",
            justifyContent:
              "flex-end",
            padding: 16,
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Planning du chauffeur"
            style={{
              width:
                "min(760px, 100%)",
              height: "100%",
              maxHeight:
                "calc(100vh - 32px)",
              background: "#fff",
              borderRadius: 22,
              boxShadow:
                "0 24px 80px rgba(0,0,0,.24)",
              display: "flex",
              flexDirection:
                "column",
              overflow: "hidden",
            }}
          >
            <header
              style={{
                padding: 20,
                borderBottom:
                  "1px solid #ececf1",
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 16,
              }}
            >
              <div>
                <span
                  style={{
                    color:
                      "#dc143c",
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      ".08em",
                  }}
                >
                  Planning chauffeur
                </span>

                <h2
                  style={{
                    margin:
                      "5px 0 0",
                    fontSize: 24,
                  }}
                >
                  {
                    historyDriver.first_name
                  }{" "}
                  {
                    historyDriver.last_name
                  }
                </h2>

                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color:
                      "#7b7d87",
                    fontSize: 13,
                  }}
                >
                  {
                    historyDriver.current_orders ??
                    0
                  }{" "}
                  actives ·{" "}
                  {
                    historyDriver.total_orders ??
                    0
                  }{" "}
                  au total · véhicule{" "}
                  {historyDriver.vehicle_name ||
                    "non assigné"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setHistoryDriver(
                    null,
                  )
                }
                aria-label="Fermer"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border:
                    "1px solid #e6e7eb",
                  background: "#fff",
                  display: "grid",
                  placeItems:
                    "center",
                  cursor:
                    "pointer",
                }}
              >
                <X size={18} />
              </button>
            </header>

            <div
              style={{
                padding:
                  "14px 20px",
                borderBottom:
                  "1px solid #ececf1",
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {(
                  [
                    [
                      "today",
                      `Aujourd’hui (${historyCounts.today})`,
                    ],
                    [
                      "tomorrow",
                      `Demain (${historyCounts.tomorrow})`,
                    ],
                    [
                      "7days",
                      `7 jours (${historyCounts.sevenDays})`,
                    ],
                    [
                      "30days",
                      `30 jours (${historyCounts.thirtyDays})`,
                    ],
                    [
                      "all",
                      `Tout (${historyOrders.length})`,
                    ],
                  ] as const
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <button
                      key={
                        value
                      }
                      type="button"
                      onClick={() =>
                        setHistoryFilter(
                          value,
                        )
                      }
                      style={{
                        border:
                          historyFilter ===
                          value
                            ? "1px solid #dc143c"
                            : "1px solid #e5e7eb",
                        background:
                          historyFilter ===
                          value
                            ? "#fff0f3"
                            : "#fff",
                        color:
                          historyFilter ===
                          value
                            ? "#dc143c"
                            : "#555762",
                        borderRadius:
                          999,
                        padding:
                          "9px 14px",
                        fontSize:
                          11,
                        fontWeight:
                          850,
                        cursor:
                          "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  title="Jour précédent"
                  onClick={() => {
                    const source =
                      historyFilter ===
                      "custom"
                        ? customHistoryDate
                        : todayKey();

                    const date =
                      new Date(
                        `${source}T12:00:00`,
                      );

                    date.setDate(
                      date.getDate() -
                        1,
                    );

                    const key =
                      `${date.getFullYear()}-${String(
                        date.getMonth() +
                          1,
                      ).padStart(
                        2,
                        "0",
                      )}-${String(
                        date.getDate(),
                      ).padStart(
                        2,
                        "0",
                      )}`;

                    setCustomHistoryDate(
                      key,
                    );

                    setHistoryFilter(
                      "custom",
                    );
                  }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius:
                      10,
                    border:
                      "1px solid #e5e7eb",
                    background:
                      "#fff",
                    display:
                      "grid",
                    placeItems:
                      "center",
                    cursor:
                      "pointer",
                  }}
                >
                  <ChevronLeft
                    size={17}
                  />
                </button>

                <label
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 8,
                    border:
                      historyFilter ===
                      "custom"
                        ? "1px solid #dc143c"
                        : "1px solid #e5e7eb",
                    background:
                      historyFilter ===
                      "custom"
                        ? "#fff7f8"
                        : "#fff",
                    borderRadius:
                      10,
                    padding:
                      "0 10px",
                    height: 38,
                  }}
                >
                  <CalendarDays
                    size={16}
                  />

                  <input
                    type="date"
                    value={
                      customHistoryDate
                    }
                    onChange={(
                      event,
                    ) => {
                      setCustomHistoryDate(
                        event
                          .target
                          .value ||
                          todayKey(),
                      );

                      setHistoryFilter(
                        "custom",
                      );
                    }}
                    style={{
                      border: 0,
                      outline: 0,
                      background:
                        "transparent",
                      fontSize:
                        12,
                      fontWeight:
                        800,
                    }}
                  />
                </label>

                <button
                  type="button"
                  title="Jour suivant"
                  onClick={() => {
                    const source =
                      historyFilter ===
                      "custom"
                        ? customHistoryDate
                        : todayKey();

                    const date =
                      new Date(
                        `${source}T12:00:00`,
                      );

                    date.setDate(
                      date.getDate() +
                        1,
                    );

                    const key =
                      `${date.getFullYear()}-${String(
                        date.getMonth() +
                          1,
                      ).padStart(
                        2,
                        "0",
                      )}-${String(
                        date.getDate(),
                      ).padStart(
                        2,
                        "0",
                      )}`;

                    setCustomHistoryDate(
                      key,
                    );

                    setHistoryFilter(
                      "custom",
                    );
                  }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius:
                      10,
                    border:
                      "1px solid #e5e7eb",
                    background:
                      "#fff",
                    display:
                      "grid",
                    placeItems:
                      "center",
                    cursor:
                      "pointer",
                  }}
                >
                  <ChevronRight
                    size={17}
                  />
                </button>

                <span
                  style={{
                    fontSize:
                      11,
                    color:
                      "#8b8d98",
                  }}
                >
                  Mise à jour
                  automatique
                  toutes les 5
                  secondes
                </span>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY:
                  "auto",
                padding: 20,
              }}
            >
              {historyLoading ? (
                <div
                  style={{
                    minHeight:
                      180,
                    display:
                      "grid",
                    placeItems:
                      "center",
                  }}
                >
                  <Loader2
                    className={
                      styles.spin
                    }
                    size={28}
                  />
                </div>
              ) : groupedHistory.length ===
                0 ? (
                <div
                  style={{
                    minHeight:
                      220,
                    display:
                      "grid",
                    placeItems:
                      "center",
                    textAlign:
                      "center",
                    color:
                      "#858792",
                  }}
                >
                  <div>
                    <CalendarDays
                      size={34}
                    />

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          10,
                        color:
                          "#30323a",
                      }}
                    >
                      Aucune commande
                    </strong>

                    <span
                      style={{
                        display:
                          "block",
                        marginTop:
                          5,
                        fontSize:
                          12,
                      }}
                    >
                      Aucune
                      commande
                      planifiée pour
                      cette période.
                    </span>
                  </div>
                </div>
              ) : (
                groupedHistory.map(
                  ([
                    dateKey,
                    orders,
                  ]) => (
                    <section
                      key={
                        dateKey
                      }
                      style={{
                        marginBottom:
                          24,
                      }}
                    >
                      <div
                        style={{
                          position:
                            "sticky",
                          top: 0,
                          zIndex: 2,
                          background:
                            "#fff",
                          padding:
                            "8px 0 10px",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          borderBottom:
                            "1px solid #f0f0f3",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              display:
                                "block",
                              fontSize:
                                13,
                              textTransform:
                                "capitalize",
                            }}
                          >
                            {formatDayTitle(
                              dateKey,
                            )}
                          </strong>

                          <small
                            style={{
                              color:
                                "#9597a1",
                              fontSize:
                                10,
                            }}
                          >
                            {formatShortDate(
                              dateKey,
                            )}
                          </small>
                        </div>

                        <span
                          style={{
                            fontSize:
                              11,
                            color:
                              "#8b8d98",
                          }}
                        >
                          {
                            orders.length
                          }{" "}
                          commande
                          {orders.length >
                          1
                            ? "s"
                            : ""}
                        </span>
                      </div>

                      <div
                        style={{
                          display:
                            "grid",
                          gap: 12,
                          paddingTop:
                            12,
                        }}
                      >
                        {orders.map(
                          (
                            order,
                          ) => {
                            const isWorking =
                              orderActionId ===
                              order.id;

                            const stopCount =
                              Number(
                                order.stop_count ||
                                  0,
                              );

                            const completedStops =
                              Number(
                                order.completed_stops ||
                                  0,
                              );

                            const remainingStops =
                              order.remaining_stops !==
                              null &&
                              order.remaining_stops !==
                                undefined
                                ? Number(
                                    order.remaining_stops,
                                  )
                                : Math.max(
                                    0,
                                    stopCount -
                                      completedStops,
                                  );

                            const packageCount =
                              Number(
                                order.package_count ||
                                  0,
                              );

                            const remainingPackages =
                              order.remaining_packages !==
                              null &&
                              order.remaining_packages !==
                                undefined
                                ? Number(
                                    order.remaining_packages,
                                  )
                                : Math.max(
                                    0,
                                    packageCount -
                                      Number(
                                        order.delivered_packages ||
                                          0,
                                      ),
                                  );

                            const expanded =
                              expandedOrderId ===
                              order.id;

                            return (
                              <article
                                key={
                                  order.id
                                }
                                style={{
                                  border:
                                    "1px solid #ececf1",
                                  borderRadius:
                                    16,
                                  padding:
                                    16,
                                  background:
                                    "#fff",
                                  boxShadow:
                                    "0 8px 24px rgba(20, 22, 30, .04)",
                                }}
                              >
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    justifyContent:
                                      "space-between",
                                    gap: 12,
                                    alignItems:
                                      "flex-start",
                                    flexWrap:
                                      "wrap",
                                  }}
                                >
                                  <div>
                                    <strong
                                      style={{
                                        fontSize:
                                          14,
                                      }}
                                    >
                                      {order.order_number ||
                                        `Commande #${order.id}`}
                                    </strong>

                                    <div
                                      style={{
                                        color:
                                          "#777985",
                                        fontSize:
                                          11,
                                        marginTop:
                                          4,
                                      }}
                                    >
                                      {[order.company_name, [order.client_first_name, order.client_last_name].filter(Boolean).join(" ")]
                                        .filter(
                                          Boolean,
                                        )
                                        .join(
                                          " · ",
                                        ) ||
                                        "Client non disponible"}
                                    </div>
                                  </div>

                                  <span
                                    style={{
                                      borderRadius:
                                        999,
                                      padding:
                                        "6px 9px",
                                      background:
                                        order.status ===
                                        "incident"
                                          ? "#fff2f2"
                                          : order.status ===
                                              "completed"
                                            ? "#edf9f1"
                                            : "#f5f5f7",
                                      color:
                                        order.status ===
                                        "incident"
                                          ? "#b42318"
                                          : order.status ===
                                              "completed"
                                            ? "#18794e"
                                            : "#4d4f59",
                                      fontSize:
                                        10,
                                      fontWeight:
                                        850,
                                    }}
                                  >
                                    {getOrderStatusLabel(
                                      order.status,
                                    )}
                                  </span>
                                </div>

                                <div
                                  style={{
                                    marginTop:
                                      12,
                                    display:
                                      "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(120px, 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  <div
                                    style={{
                                      padding:
                                        "10px 11px",
                                      borderRadius:
                                        12,
                                      background:
                                        "#f8f8fa",
                                    }}
                                  >
                                    <small
                                      style={{
                                        color:
                                          "#888a95",
                                        fontSize:
                                          10,
                                      }}
                                    >
                                      Heure
                                    </small>

                                    <strong
                                      style={{
                                        display:
                                          "block",
                                        marginTop:
                                          3,
                                        fontSize:
                                          12,
                                      }}
                                    >
                                      {formatTime(
                                        order.pickup_time ||
                                          order.delivery_time,
                                      )}
                                    </strong>
                                  </div>

                                  <div
                                    style={{
                                      padding:
                                        "10px 11px",
                                      borderRadius:
                                        12,
                                      background:
                                        "#f8f8fa",
                                    }}
                                  >
                                    <small
                                      style={{
                                        color:
                                          "#888a95",
                                        fontSize:
                                          10,
                                      }}
                                    >
                                      Colis
                                    </small>

                                    <strong
                                      style={{
                                        display:
                                          "flex",
                                        alignItems:
                                          "center",
                                        gap: 5,
                                        marginTop:
                                          3,
                                        fontSize:
                                          12,
                                      }}
                                    >
                                      <Package
                                        size={
                                          13
                                        }
                                      />
                                      {
                                        packageCount
                                      }
                                      {" · "}
                                      {
                                        remainingPackages
                                      }{" "}
                                      restant
                                      {remainingPackages >
                                      1
                                        ? "s"
                                        : ""}
                                    </strong>
                                  </div>

                                  <div
                                    style={{
                                      padding:
                                        "10px 11px",
                                      borderRadius:
                                        12,
                                      background:
                                        "#f8f8fa",
                                    }}
                                  >
                                    <small
                                      style={{
                                        color:
                                          "#888a95",
                                        fontSize:
                                          10,
                                      }}
                                    >
                                      Arrêts
                                    </small>

                                    <strong
                                      style={{
                                        display:
                                          "block",
                                        marginTop:
                                          3,
                                        fontSize:
                                          12,
                                      }}
                                    >
                                      {
                                        stopCount
                                      }
                                      {" · "}
                                      {
                                        remainingStops
                                      }{" "}
                                      restant
                                      {remainingStops >
                                      1
                                        ? "s"
                                        : ""}
                                    </strong>
                                  </div>
                                </div>

                                <div
                                  style={{
                                    marginTop:
                                      12,
                                    display:
                                      "grid",
                                    gap: 6,
                                    fontSize:
                                      11,
                                    color:
                                      "#60626d",
                                  }}
                                >
                                  <span>
                                    <strong>
                                      Ramassage :
                                    </strong>{" "}
                                    {order.pickup_address ||
                                      "Non disponible"}
                                  </span>

                                  <span>
                                    <strong>
                                      Livraison :
                                    </strong>{" "}
                                    {order.delivery_address ||
                                      "Non disponible"}
                                  </span>

                                  <span>
                                    <strong>
                                      Véhicule :
                                    </strong>{" "}
                                    {[order.vehicle_make, order.vehicle_model]
                                      .filter(
                                        Boolean,
                                      )
                                      .join(
                                        " ",
                                      ) ||
                                      historyDriver.vehicle_name ||
                                      "Non assigné"}

                                    {order.vehicle_plate
                                      ? ` · ${order.vehicle_plate}`
                                      : ""}
                                  </span>
                                </div>

                                {expanded && (
                                  <div
                                    style={{
                                      marginTop:
                                        12,
                                      padding:
                                        12,
                                      border:
                                        "1px solid #ececf1",
                                      borderRadius:
                                        12,
                                      background:
                                        "#fbfbfc",
                                      display:
                                        "grid",
                                      gap: 7,
                                      fontSize:
                                        11,
                                      color:
                                        "#565862",
                                    }}
                                  >
                                    <span>
                                      <strong>
                                        Ramassage :
                                      </strong>{" "}
                                      {order.pickup_date ||
                                        "—"}{" "}
                                      {formatTime(
                                        order.pickup_time,
                                      )}
                                    </span>

                                    <span>
                                      <strong>
                                        Livraison :
                                      </strong>{" "}
                                      {order.delivery_date ||
                                        "—"}{" "}
                                      {formatTime(
                                        order.delivery_time,
                                      )}
                                    </span>

                                    <span>
                                      <strong>
                                        Progression :
                                      </strong>{" "}
                                      {
                                        completedStops
                                      }
                                      /
                                      {
                                        stopCount
                                      }{" "}
                                      arrêts
                                      complétés
                                    </span>

                                    <span>
                                      <strong>
                                        Dernier scan :
                                      </strong>{" "}
                                      {formatDate(
                                        order.last_scan_at,
                                      )}
                                    </span>

                                    <span>
                                      <strong>
                                        Priorité :
                                      </strong>{" "}
                                      {order.priority ||
                                        "normal"}
                                    </span>
                                  </div>
                                )}

                                <div
                                  style={{
                                    marginTop:
                                      14,
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    gap: 8,
                                    flexWrap:
                                      "wrap",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedOrderId(
                                        (
                                          current,
                                        ) =>
                                          current ===
                                          order.id
                                            ? null
                                            : order.id,
                                      )
                                    }
                                    style={{
                                      minHeight:
                                        36,
                                      borderRadius:
                                        10,
                                      border:
                                        "1px solid #e3e4e8",
                                      background:
                                        "#fff",
                                      padding:
                                        "0 12px",
                                      display:
                                        "inline-flex",
                                      alignItems:
                                        "center",
                                      gap: 6,
                                      fontSize:
                                        11,
                                      fontWeight:
                                        800,
                                      cursor:
                                        "pointer",
                                    }}
                                  >
                                    <Eye
                                      size={
                                        14
                                      }
                                    />
                                    {expanded
                                      ? "Fermer"
                                      : "Voir"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void editOrderSchedule(
                                        order,
                                      )
                                    }
                                    disabled={
                                      isWorking
                                    }
                                    style={{
                                      minHeight:
                                        36,
                                      borderRadius:
                                        10,
                                      border:
                                        "1px solid #e3e4e8",
                                      background:
                                        "#fff",
                                      padding:
                                        "0 12px",
                                      display:
                                        "inline-flex",
                                      alignItems:
                                        "center",
                                      gap: 6,
                                      fontSize:
                                        11,
                                      fontWeight:
                                        800,
                                      cursor:
                                        isWorking
                                          ? "wait"
                                          : "pointer",
                                    }}
                                  >
                                    <Pencil
                                      size={
                                        14
                                      }
                                    />
                                    Modifier
                                  </button>

                                  <label
                                    style={{
                                      minHeight:
                                        36,
                                      borderRadius:
                                        10,
                                      border:
                                        "1px solid #e3e4e8",
                                      background:
                                        "#fff",
                                      display:
                                        "inline-flex",
                                      alignItems:
                                        "center",
                                      gap: 6,
                                      padding:
                                        "0 8px 0 10px",
                                    }}
                                  >
                                    <UserRoundCog
                                      size={
                                        14
                                      }
                                    />

                                    <select
                                      defaultValue=""
                                      disabled={
                                        isWorking
                                      }
                                      onChange={(
                                        event,
                                      ) => {
                                        const nextId =
                                          Number(
                                            event
                                              .target
                                              .value,
                                          );

                                        if (
                                          nextId
                                        ) {
                                          void reassignOrder(
                                            order,
                                            nextId,
                                          );
                                        }

                                        event.target.value =
                                          "";
                                      }}
                                      style={{
                                        border:
                                          0,
                                        outline:
                                          0,
                                        background:
                                          "transparent",
                                        fontSize:
                                          11,
                                        fontWeight:
                                          800,
                                        cursor:
                                          isWorking
                                            ? "wait"
                                            : "pointer",
                                      }}
                                    >
                                      <option value="">
                                        Réassigner
                                      </option>

                                      {drivers
                                        .filter(
                                          (
                                            driver,
                                          ) =>
                                            driver.id !==
                                            historyDriver.id,
                                        )
                                        .map(
                                          (
                                            driver,
                                          ) => (
                                            <option
                                              key={
                                                driver.id
                                              }
                                              value={
                                                driver.id
                                              }
                                            >
                                              {driver.first_name ||
                                                "Chauffeur"}{" "}
                                              {driver.last_name ||
                                                ""}
                                            </option>
                                          ),
                                        )}
                                    </select>
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void unassignOrder(
                                        order,
                                      )
                                    }
                                    disabled={
                                      isWorking
                                    }
                                    style={{
                                      minHeight:
                                        36,
                                      borderRadius:
                                        10,
                                      border:
                                        "1px solid #ffd6dd",
                                      background:
                                        "#fff7f8",
                                      color:
                                        "#b4233d",
                                      padding:
                                        "0 12px",
                                      display:
                                        "inline-flex",
                                      alignItems:
                                        "center",
                                      gap: 6,
                                      fontSize:
                                        11,
                                      fontWeight:
                                        850,
                                      cursor:
                                        isWorking
                                          ? "wait"
                                          : "pointer",
                                    }}
                                  >
                                    {isWorking ? (
                                      <Loader2
                                        className={
                                          styles.spin
                                        }
                                        size={
                                          14
                                        }
                                      />
                                    ) : (
                                      <Unlink
                                        size={
                                          14
                                        }
                                      />
                                    )}

                                    Retirer
                                  </button>
                                </div>
                              </article>
                            );
                          },
                        )}
                      </div>
                    </section>
                  ),
                )
              )}
            </div>
          </section>
        </div>
      )}

      {/* ======================================================
          MODAL CRÉATION DRIVER
      ====================================================== */}

      {createModalOpen && (
        <div
          className={
            styles.modalOverlay
          }
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreateModal();
            }
          }}
        >
          <section
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-driver-title"
          >
            <header
              className={
                styles.modalHeader
              }
            >
              <div>
                <span
                  className={
                    styles.modalEyebrow
                  }
                >
                  <ShieldCheck
                    size={15}
                  />
                  Compte chauffeur
                </span>

                <h2
                  id="create-driver-title"
                >
                  Ajouter un chauffeur
                </h2>

                <p>
                  Créez le compte et
                  le profil chauffeur
                  Glory Solutions.
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.modalClose
                }
                onClick={
                  closeCreateModal
                }
                disabled={
                  creatingDriver
                }
                aria-label="Fermer"
              >
                <X size={19} />
              </button>
            </header>

            <form
              onSubmit={
                createDriver
              }
              className={
                styles.driverForm
              }
            >
              <div
                className={
                  styles.formSection
                }
              >
                <div
                  className={
                    styles.formSectionHeading
                  }
                >
                  <UserRound
                    size={18}
                  />

                  <div>
                    <strong>
                      Informations
                      personnelles
                    </strong>

                    <span>
                      Identité et
                      coordonnées du
                      chauffeur.
                    </span>
                  </div>
                </div>

                <div
                  className={
                    styles.formGrid
                  }
                >
                  <FormField
                    label="Prénom *"
                    name="firstName"
                    value={
                      driverForm.firstName
                    }
                    onChange={
                      handleDriverFormChange
                    }
                    disabled={
                      creatingDriver
                    }
                  />

                  <FormField
                    label="Nom *"
                    name="lastName"
                    value={
                      driverForm.lastName
                    }
                    onChange={
                      handleDriverFormChange
                    }
                    disabled={
                      creatingDriver
                    }
                  />

                  <FormField
                    label="Courriel *"
                    name="email"
                    type="email"
                    value={
                      driverForm.email
                    }
                    onChange={
                      handleDriverFormChange
                    }
                    disabled={
                      creatingDriver
                    }
                  />

                  <FormField
                    label="Téléphone"
                    name="phone"
                    type="tel"
                    value={
                      driverForm.phone
                    }
                    onChange={
                      handleDriverFormChange
                    }
                    disabled={
                      creatingDriver
                    }
                  />
                </div>
              </div>

              <div
                className={
                  styles.formSection
                }
              >
                <div
                  className={
                    styles.formSectionHeading
                  }
                >
                  <ShieldCheck
                    size={18}
                  />

                  <div>
                    <strong>
                      Accès au compte
                    </strong>

                    <span>
                      Mot de passe
                      temporaire du
                      chauffeur.
                    </span>
                  </div>
                </div>

                <div
                  className={
                    styles.formGrid
                  }
                >
                  <div
                    className={
                      styles.formField
                    }
                  >
                    <label>
                      Mot de passe *
                    </label>

                    <div
                      className={
                        styles.passwordField
                      }
                    >
                      <input
                        name="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          driverForm.password
                        }
                        onChange={
                          handleDriverFormChange
                        }
                        disabled={
                          creatingDriver
                        }
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (
                              current,
                            ) =>
                              !current,
                          )
                        }
                      >
                        {showPassword ? (
                          <EyeOff
                            size={
                              17
                            }
                          />
                        ) : (
                          <Eye
                            size={
                              17
                            }
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  <div
                    className={
                      styles.formField
                    }
                  >
                    <label>
                      Confirmation *
                    </label>

                    <div
                      className={
                        styles.passwordField
                      }
                    >
                      <input
                        name="confirmPassword"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          driverForm.confirmPassword
                        }
                        onChange={
                          handleDriverFormChange
                        }
                        disabled={
                          creatingDriver
                        }
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (
                              current,
                            ) =>
                              !current,
                          )
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff
                            size={
                              17
                            }
                          />
                        ) : (
                          <Eye
                            size={
                              17
                            }
                          />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <p
                  className={
                    styles.passwordHint
                  }
                >
                  8 caractères minimum,
                  avec majuscule,
                  minuscule, chiffre et
                  caractère spécial.
                </p>
              </div>

              <div
                className={
                  styles.formSection
                }
              >
                <div
                  className={
                    styles.formSectionHeading
                  }
                >
                  <Truck
                    size={18}
                  />

                  <div>
                    <strong>
                      Permis de conduire
                    </strong>

                    <span>
                      Informations
                      professionnelles.
                    </span>
                  </div>
                </div>

                <div
                  className={
                    styles.formGrid
                  }
                >
                  <FormField
                    label="Numéro de permis"
                    name="licenseNumber"
                    value={
                      driverForm.licenseNumber
                    }
                    onChange={
                      handleDriverFormChange
                    }
                    disabled={
                      creatingDriver
                    }
                  />

                  <FormField
                    label="Expiration"
                    name="licenseExpiry"
                    type="date"
                    value={
                      driverForm.licenseExpiry
                    }
                    onChange={
                      handleDriverFormChange
                    }
                    disabled={
                      creatingDriver
                    }
                  />
                </div>
              </div>

              <div
                className={
                  styles.formSection
                }
              >
                <div
                  className={
                    styles.formSectionHeading
                  }
                >
                  <Building2
                    size={18}
                  />

                  <div>
                    <strong>
                      Adresse
                    </strong>

                    <span>
                      Coordonnées du
                      chauffeur.
                    </span>
                  </div>
                </div>

                <div
                  className={
                    styles.formGrid
                  }
                >
                  <div
                    className={
                      styles.formFieldFull
                    }
                  >
                    <FormField
                      label="Adresse"
                      name="address"
                      value={
                        driverForm.address
                      }
                      onChange={
                        handleDriverFormChange
                      }
                      disabled={
                        creatingDriver
                      }
                    />
                  </div>

                  <FormField
                    label="Ville"
                    name="city"
                    value={
                      driverForm.city
                    }
                    onChange={
                      handleDriverFormChange
                    }
                    disabled={
                      creatingDriver
                    }
                  />

                  <FormField
                    label="Province"
                    name="province"
                    value={
                      driverForm.province
                    }
                    onChange={
                      handleDriverFormChange
                    }
                    disabled={
                      creatingDriver
                    }
                  />

                  <FormField
                    label="Code postal"
                    name="postalCode"
                    value={
                      driverForm.postalCode
                    }
                    onChange={
                      handleDriverFormChange
                    }
                    disabled={
                      creatingDriver
                    }
                  />
                </div>
              </div>

              <div
                className={
                  styles.formSection
                }
              >
                <div
                  className={
                    styles.formSectionHeading
                  }
                >
                  <Phone
                    size={18}
                  />

                  <div>
                    <strong>
                      Contact d'urgence
                    </strong>

                    <span>
                      Personne à joindre
                      en cas de besoin.
                    </span>
                  </div>
                </div>

                <div
                  className={
                    styles.formGrid
                  }
                >
                  <FormField
                    label="Nom du contact"
                    name="emergencyContactName"
                    value={
                      driverForm.emergencyContactName
                    }
                    onChange={
                      handleDriverFormChange
                    }
                    disabled={
                      creatingDriver
                    }
                  />

                  <FormField
                    label="Téléphone"
                    name="emergencyContactPhone"
                    type="tel"
                    value={
                      driverForm.emergencyContactPhone
                    }
                    onChange={
                      handleDriverFormChange
                    }
                    disabled={
                      creatingDriver
                    }
                  />
                </div>
              </div>

              <footer
                className={
                  styles.modalFooter
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
                  onClick={
                    closeCreateModal
                  }
                  disabled={
                    creatingDriver
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className={
                    styles.createButton
                  }
                  disabled={
                    creatingDriver
                  }
                >
                  {creatingDriver ? (
                    <>
                      <Loader2
                        size={18}
                        className={
                          styles.spin
                        }
                      />

                      Création...
                    </>
                  ) : (
                    <>
                      <Plus
                        size={18}
                      />

                      Créer le chauffeur
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

/* ============================================================
   FORM FIELD
============================================================ */

function FormField({
  label,
  name,
  value,
  type = "text",
  disabled,
  onChange,
}: {
  label: string;
  name: keyof DriverForm;
  value: string;
  type?: string;
  disabled?: boolean;

  onChange: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <div
      className={
        styles.formField
      }
    >
      <label
        htmlFor={`driver-${name}`}
      >
        {label}
      </label>

      <input
        id={`driver-${name}`}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

/* ============================================================
   STAT
============================================================ */

function StatCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;

  variant:
    | "total"
    | "available"
    | "busy"
    | "offline";
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
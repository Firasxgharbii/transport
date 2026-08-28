"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Route,
  Save,
  ShieldAlert,
  Trash2,
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

import styles from "./order-details.module.css";

/* ============================================================
   CONFIG
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* ============================================================
   TYPES
============================================================ */

type OrderStatus =
  | "pending"
  | "assigned"
  | "pickup_in_progress"
  | "picked_up"
  | "delivery_in_progress"
  | "arrived"
  | "completed"
  | "incident"
  | "cancelled";

type Order = {
  id: number;

  order_number?: string;
  reference?: string;

  client_id?: number | null;
  client_name?: string | null;
  company_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;

  driver_id?: number | null;
  driver_name?: string | null;
  driver_first_name?: string | null;
  driver_last_name?: string | null;
  driver_phone?: string | null;

  vehicle_id?: number | null;
  vehicle_name?: string | null;
  vehicle_plate?: string | null;

  pickup_address?: string | null;
  delivery_address?: string | null;

  pickup_date?: string | null;
  delivery_date?: string | null;

  status?: OrderStatus | string;

  priority?: string | null;

  amount?: number | string | null;
  total_amount?: number | string | null;

  description?: string | null;
  notes?: string | null;

  status_reason?: string | null;
  failure_reason?: string | null;
  cancellation_reason?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type Driver = {
  id: number;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  availability_status?: string;
  vehicle_id?: number | null;
  vehicle_name?: string | null;
};

type Vehicle = {
  id: number;
  name?: string | null;
  make?: string | null;
  model?: string | null;
  plate?: string | null;
  license_plate?: string | null;
  status?: string | null;
};

type Stop = {
  id: number;

  order_id?: number;

  stop_order?: number;
  sequence?: number;

  type?: string;
  stop_type?: string;

  address?: string;
  notes?: string | null;

  status?: string | null;
};

type TimelineItem = {
  id?: number;

  status?: string;
  old_status?: string | null;
  new_status?: string | null;

  reason?: string | null;

  created_at?: string | null;

  changed_by_name?: string | null;
  user_name?: string | null;
};

type DeliveryProof = {
  id: number;

  type?: string;
  proof_type?: string;

  file_url?: string | null;
  image_url?: string | null;

  notes?: string | null;

  created_at?: string | null;
};

type OrderResponse = {
  success?: boolean;
  order?: Order;
  data?: Order;
  message?: string;
};

type DriversResponse = {
  success?: boolean;
  drivers?: Driver[];
  data?: Driver[];
};

type VehiclesResponse = {
  success?: boolean;
  vehicles?: Vehicle[];
  data?: Vehicle[];
};

type StopsResponse = {
  success?: boolean;
  stops?: Stop[];
  data?: Stop[];
};

type TimelineResponse = {
  success?: boolean;
  timeline?: TimelineItem[];
  history?: TimelineItem[];
  data?: TimelineItem[];
};

type ProofsResponse = {
  success?: boolean;
  proofs?: DeliveryProof[];
  data?: DeliveryProof[];
};

/* ============================================================
   CONSTANTS
============================================================ */

const ORDER_STATUSES: {
  value: OrderStatus;
  label: string;
}[] = [
  {
    value: "pending",
    label: "En attente",
  },
  {
    value: "assigned",
    label: "Assignée",
  },
  {
    value: "pickup_in_progress",
    label: "Ramassage",
  },
  {
    value: "picked_up",
    label: "Ramassée",
  },
  {
    value: "delivery_in_progress",
    label: "En livraison",
  },
  {
    value: "arrived",
    label: "Arrivé",
  },
  {
    value: "completed",
    label: "Terminée",
  },
  {
    value: "incident",
    label: "Incident",
  },
  {
    value: "cancelled",
    label: "Annulée",
  },
];

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
    ) ||
    localStorage.getItem(
      "token",
    ) ||
    ""
  );
}

function statusLabel(
  value?: string | null,
) {
  return (
    ORDER_STATUSES.find(
      (item) =>
        item.value === value,
    )?.label ||
    value ||
    "Non défini"
  );
}

function formatDate(
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
      timeStyle: "short",
    },
  ).format(date);
}

function formatMoney(
  value?:
    | number
    | string
    | null,
) {
  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    "fr-CA",
    {
      style: "currency",
      currency: "CAD",
    },
  ).format(
    Number.isFinite(amount)
      ? amount
      : 0,
  );
}

function driverFullName(
  driver: Driver,
) {
  return (
    [
      driver.first_name,
      driver.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    `Chauffeur #${driver.id}`
  );
}

function vehicleLabel(
  vehicle: Vehicle,
) {
  const main =
    vehicle.name ||
    [
      vehicle.make,
      vehicle.model,
    ]
      .filter(Boolean)
      .join(" ");

  const plate =
    vehicle.plate ||
    vehicle.license_plate;

  if (
    main &&
    plate
  ) {
    return `${main} · ${plate}`;
  }

  return (
    main ||
    plate ||
    `Véhicule #${vehicle.id}`
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function OrderDetailsPage() {
  const router =
    useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const orderId =
    Number(params.id);

  const [
    order,
    setOrder,
  ] = useState<Order | null>(
    null,
  );

  const [
    drivers,
    setDrivers,
  ] = useState<Driver[]>([]);

  const [
    vehicles,
    setVehicles,
  ] = useState<Vehicle[]>([]);

  const [
    stops,
    setStops,
  ] = useState<Stop[]>([]);

  const [
    timeline,
    setTimeline,
  ] = useState<
    TimelineItem[]
  >([]);

  const [
    proofs,
    setProofs,
  ] = useState<
    DeliveryProof[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    saving,
    setSaving,
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
    selectedDriver,
    setSelectedDriver,
  ] = useState("");

  const [
    selectedVehicle,
    setSelectedVehicle,
  ] = useState("");

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<OrderStatus>(
    "pending",
  );

  const [
    statusReason,
    setStatusReason,
  ] = useState("");

  const [
    newStopAddress,
    setNewStopAddress,
  ] = useState("");

  const [
    newStopNotes,
    setNewStopNotes,
  ] = useState("");

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
            "Session expirée.",
          );
        }

        if (!response.ok) {
          throw new Error(
            (
              result as {
                message?: string;
              } | null
            )?.message ||
              `Erreur API (${response.status}).`,
          );
        }

        return result as T;
      },
      [router],
    );

  /* ==========================================================
     LOAD ORDER
  ========================================================== */

  const loadOrder =
    useCallback(async () => {
      if (
        !Number.isInteger(
          orderId,
        ) ||
        orderId <= 0
      ) {
        setError(
          "Identifiant de commande invalide.",
        );

        setLoading(false);
        setRefreshing(false);

        return;
      }

      try {
        setError("");

        const orderResult =
          await apiFetch<OrderResponse>(
            `/api/orders/${orderId}`,
          );

        const receivedOrder =
          orderResult.order ||
          orderResult.data ||
          null;

        if (!receivedOrder) {
          throw new Error(
            "Commande introuvable.",
          );
        }

        setOrder(
          receivedOrder,
        );

        setSelectedDriver(
          receivedOrder.driver_id
            ? String(
                receivedOrder.driver_id,
              )
            : "",
        );

        setSelectedVehicle(
          receivedOrder.vehicle_id
            ? String(
                receivedOrder.vehicle_id,
              )
            : "",
        );

        setSelectedStatus(
          (receivedOrder.status ||
            "pending") as OrderStatus,
        );

        setStatusReason(
          receivedOrder.status_reason ||
            receivedOrder.failure_reason ||
            receivedOrder.cancellation_reason ||
            "",
        );

        const results =
          await Promise.allSettled([
            apiFetch<DriversResponse>(
              "/api/drivers",
            ),

            apiFetch<VehiclesResponse>(
              "/api/vehicles",
            ),

            apiFetch<StopsResponse>(
              `/api/orders/${orderId}/stops`,
            ),

            apiFetch<TimelineResponse>(
              `/api/orders/${orderId}/timeline`,
            ),

            apiFetch<ProofsResponse>(
              `/api/orders/${orderId}/proofs`,
            ),
          ]);

        /* DRIVERS */

        if (
          results[0].status ===
          "fulfilled"
        ) {
          const value =
            results[0].value;

          setDrivers(
            Array.isArray(
              value.drivers,
            )
              ? value.drivers
              : Array.isArray(
                    value.data,
                  )
                ? value.data
                : [],
          );
        }

        /* VEHICLES */

        if (
          results[1].status ===
          "fulfilled"
        ) {
          const value =
            results[1].value;

          setVehicles(
            Array.isArray(
              value.vehicles,
            )
              ? value.vehicles
              : Array.isArray(
                    value.data,
                  )
                ? value.data
                : [],
          );
        }

        /* STOPS */

        if (
          results[2].status ===
          "fulfilled"
        ) {
          const value =
            results[2].value;

          setStops(
            Array.isArray(
              value.stops,
            )
              ? value.stops
              : Array.isArray(
                    value.data,
                  )
                ? value.data
                : [],
          );
        }

        /* TIMELINE */

        if (
          results[3].status ===
          "fulfilled"
        ) {
          const value =
            results[3].value;

          const list =
            value.timeline ||
            value.history ||
            value.data ||
            [];

          setTimeline(
            Array.isArray(list)
              ? list
              : [],
          );
        }

        /* PROOFS */

        if (
          results[4].status ===
          "fulfilled"
        ) {
          const value =
            results[4].value;

          setProofs(
            Array.isArray(
              value.proofs,
            )
              ? value.proofs
              : Array.isArray(
                    value.data,
                  )
                ? value.data
                : [],
          );
        }
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger la commande.",
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
    void loadOrder();
  }, [loadOrder]);

  /* ==========================================================
     ASSIGN DRIVER
  ========================================================== */

  const assignDriver =
    async () => {
      if (!selectedDriver) {
        setError(
          "Sélectionnez un chauffeur.",
        );

        return;
      }

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        await apiFetch(
          `/api/orders/${orderId}/assign-driver`,
          {
            method: "PATCH",

            body:
              JSON.stringify({
                driver_id:
                  Number(
                    selectedDriver,
                  ),
              }),
          },
        );

        setSuccess(
          "Chauffeur assigné avec succès.",
        );

        await loadOrder();
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible d'assigner le chauffeur.",
        );
      } finally {
        setSaving(false);
      }
    };

  /* ==========================================================
     ASSIGN VEHICLE
  ========================================================== */

  const assignVehicle =
    async () => {
      if (!selectedVehicle) {
        setError(
          "Sélectionnez un véhicule.",
        );

        return;
      }

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        await apiFetch(
          `/api/orders/${orderId}/assign-vehicle`,
          {
            method: "PATCH",

            body:
              JSON.stringify({
                vehicle_id:
                  Number(
                    selectedVehicle,
                  ),
              }),
          },
        );

        setSuccess(
          "Véhicule assigné avec succès.",
        );

        await loadOrder();
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible d'assigner le véhicule.",
        );
      } finally {
        setSaving(false);
      }
    };

  /* ==========================================================
     UPDATE STATUS
  ========================================================== */

  const updateStatus =
    async () => {
      if (
        (
          selectedStatus ===
            "incident" ||
          selectedStatus ===
            "cancelled"
        ) &&
        !statusReason.trim()
      ) {
        setError(
          "Veuillez saisir une raison pour cet incident ou cette annulation.",
        );

        return;
      }

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        await apiFetch(
          `/api/orders/${orderId}/status`,
          {
            method: "PATCH",

            body:
              JSON.stringify({
                status:
                  selectedStatus,

                reason:
                  statusReason.trim() ||
                  null,

                status_reason:
                  statusReason.trim() ||
                  null,
              }),
          },
        );

        setSuccess(
          `Statut changé : ${statusLabel(
            selectedStatus,
          )}.`,
        );

        await loadOrder();
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de modifier le statut.",
        );
      } finally {
        setSaving(false);
      }
    };

  /* ==========================================================
     ADD STOP
  ========================================================== */

  const addStop =
    async () => {
      const address =
        newStopAddress.trim();

      if (!address) {
        setError(
          "L'adresse de l'arrêt est obligatoire.",
        );

        return;
      }

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        await apiFetch(
          `/api/orders/${orderId}/stops`,
          {
            method: "POST",

            body:
              JSON.stringify({
                address,

                notes:
                  newStopNotes.trim() ||
                  null,

                stop_order:
                  stops.length + 1,

                type:
                  "intermediate",
              }),
          },
        );

        setNewStopAddress("");
        setNewStopNotes("");

        setSuccess(
          "Nouvel arrêt ajouté.",
        );

        await loadOrder();
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible d'ajouter l'arrêt.",
        );
      } finally {
        setSaving(false);
      }
    };

  /* ==========================================================
     DELETE STOP
  ========================================================== */

  const deleteStop =
    async (
      stopId: number,
    ) => {
      const confirmed =
        window.confirm(
          "Supprimer cet arrêt ?",
        );

      if (!confirmed) {
        return;
      }

      try {
        setSaving(true);

        await apiFetch(
          `/api/orders/stops/${stopId}`,
          {
            method:
              "DELETE",
          },
        );

        setSuccess(
          "Arrêt supprimé.",
        );

        await loadOrder();
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de supprimer l'arrêt.",
        );
      } finally {
        setSaving(false);
      }
    };

  /* ==========================================================
     DERIVED VALUES
  ========================================================== */

  const reasonRequired =
    selectedStatus ===
      "incident" ||
    selectedStatus ===
      "cancelled";

  const orderAmount =
    order?.total_amount ??
    order?.amount ??
    0;

  const sortedStops =
    useMemo(
      () =>
        [...stops].sort(
          (a, b) =>
            Number(
              a.stop_order ??
                a.sequence ??
                0,
            ) -
            Number(
              b.stop_order ??
                b.sequence ??
                0,
            ),
        ),
      [stops],
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
          size={34}
          className={
            styles.spin
          }
        />

        <h1>
          Chargement de la commande
        </h1>

        <p>
          Récupération des informations...
        </p>
      </main>
    );
  }

  /* ==========================================================
     ERROR / NOT FOUND
  ========================================================== */

  if (!order) {
    return (
      <main
        className={
          styles.page
        }
      >
        <div
          className={
            styles.notFound
          }
        >
          <AlertTriangle
            size={34}
          />

          <h1>
            Commande introuvable
          </h1>

          <p>
            {error ||
              "Cette commande n'existe pas."}
          </p>

          <Link
            href="/dashboard/admin/orders"
          >
            <ArrowLeft
              size={17}
            />

            Retour aux commandes
          </Link>
        </div>
      </main>
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main
      className={
        styles.page
      }
    >
      {/* TOPBAR */}

      <div
        className={
          styles.topBar
        }
      >
        <Link
          href="/dashboard/admin/orders"
          className={
            styles.backButton
          }
        >
          <ArrowLeft
            size={17}
          />

          Retour aux commandes
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
            setRefreshing(true);
            void loadOrder();
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

      {/* ALERTS */}

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
            onClick={() =>
              setSuccess("")
            }
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* HERO */}

      <section
        className={
          styles.hero
        }
      >
        <div
          className={
            styles.heroIdentity
          }
        >
          <div
            className={
              styles.heroIcon
            }
          >
            <Package
              size={27}
            />
          </div>

          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              GESTION DE COMMANDE
            </span>

            <h1>
              {order.order_number ||
                order.reference ||
                `Commande #${order.id}`}
            </h1>

            <p>
              ID #{order.id} · Créée{" "}
              {formatDate(
                order.created_at,
              )}
            </p>

            <div
              className={
                styles.heroBadges
              }
            >
              <span
                className={
                  styles.statusBadge
                }
              >
                {statusLabel(
                  order.status,
                )}
              </span>

              <span
                className={
                  styles.priorityBadge
                }
              >
                {order.priority ||
                  "Priorité normale"}
              </span>
            </div>
          </div>
        </div>

        <div
          className={
            styles.heroAmount
          }
        >
          <small>
            MONTANT
          </small>

          <strong>
            {formatMoney(
              orderAmount,
            )}
          </strong>
        </div>
      </section>

      {/* STATS */}

      <section
        className={
          styles.statsGrid
        }
      >
        <StatCard
          icon={
            <UserRound
              size={20}
            />
          }
          label="Chauffeur"
          value={
            order.driver_name ||
            [
              order.driver_first_name,
              order.driver_last_name,
            ]
              .filter(Boolean)
              .join(" ") ||
            "Non assigné"
          }
        />

        <StatCard
          icon={
            <Truck
              size={20}
            />
          }
          label="Véhicule"
          value={
            order.vehicle_name ||
            "Non assigné"
          }
        />

        <StatCard
          icon={
            <Route
              size={20}
            />
          }
          label="Arrêts"
          value={`${stops.length}`}
        />

        <StatCard
          icon={
            <Clock3
              size={20}
            />
          }
          label="Statut"
          value={
            statusLabel(
              order.status,
            )
          }
        />
      </section>

      {/* GRID */}

      <section
        className={
          styles.mainGrid
        }
      >
        {/* LEFT */}

        <div
          className={
            styles.mainColumn
          }
        >
          {/* ROUTE */}

          <section
            className={
              styles.panel
            }
          >
            <PanelHeader
              icon={
                <Navigation
                  size={20}
                />
              }
              eyebrow="Trajet"
              title="Itinéraire de la commande"
              description="Point de départ, destination et arrêts intermédiaires."
            />

            <div
              className={
                styles.route
              }
            >
              <RoutePoint
                type="pickup"
                label="RAMASSAGE"
                address={
                  order.pickup_address ||
                  "Adresse non définie"
                }
                date={
                  formatDate(
                    order.pickup_date,
                  )
                }
              />

              {sortedStops.map(
                (
                  stop,
                  index,
                ) => (
                  <div
                    key={
                      stop.id
                    }
                    className={
                      styles.stopRow
                    }
                  >
                    <span
                      className={
                        styles.stopNumber
                      }
                    >
                      {index + 1}
                    </span>

                    <div>
                      <small>
                        ARRÊT INTERMÉDIAIRE
                      </small>

                      <strong>
                        {stop.address ||
                          "Adresse non définie"}
                      </strong>

                      {stop.notes && (
                        <p>
                          {stop.notes}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void deleteStop(
                          stop.id,
                        )
                      }
                    >
                      <Trash2
                        size={15}
                      />
                    </button>
                  </div>
                ),
              )}

              <RoutePoint
                type="delivery"
                label="LIVRAISON"
                address={
                  order.delivery_address ||
                  "Adresse non définie"
                }
                date={
                  formatDate(
                    order.delivery_date,
                  )
                }
              />
            </div>

            <div
              className={
                styles.addStop
              }
            >
              <div
                className={
                  styles.addStopTitle
                }
              >
                <Plus
                  size={16}
                />

                Ajouter un arrêt
              </div>

              <input
                value={
                  newStopAddress
                }
                onChange={(
                  event,
                ) =>
                  setNewStopAddress(
                    event.target
                      .value,
                  )
                }
                placeholder="Adresse de l'arrêt"
              />

              <textarea
                value={
                  newStopNotes
                }
                onChange={(
                  event,
                ) =>
                  setNewStopNotes(
                    event.target
                      .value,
                  )
                }
                placeholder="Notes facultatives"
                rows={2}
              />

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={() =>
                  void addStop()
                }
              >
                <Plus
                  size={16}
                />

                Ajouter l'arrêt
              </button>
            </div>
          </section>

          {/* CLIENT */}

          <section
            className={
              styles.panel
            }
          >
            <PanelHeader
              icon={
                <Building2
                  size={20}
                />
              }
              eyebrow="Client"
              title="Informations client"
            />

            <div
              className={
                styles.infoGrid
              }
            >
              <InfoItem
                label="Client"
                value={
                  order.client_name ||
                  "Non renseigné"
                }
              />

              <InfoItem
                label="Entreprise"
                value={
                  order.company_name ||
                  "Particulier"
                }
              />

              <InfoItem
                label="Téléphone"
                value={
                  order.client_phone ||
                  "Non renseigné"
                }
              />

              <InfoItem
                label="Courriel"
                value={
                  order.client_email ||
                  "Non renseigné"
                }
              />
            </div>
          </section>

          {/* TIMELINE */}

          <section
            className={
              styles.panel
            }
          >
            <PanelHeader
              icon={
                <Clock3
                  size={20}
                />
              }
              eyebrow="Historique"
              title="Timeline de la commande"
            />

            {timeline.length ===
            0 ? (
              <div
                className={
                  styles.emptyState
                }
              >
                Aucun historique disponible.
              </div>
            ) : (
              <div
                className={
                  styles.timeline
                }
              >
                {timeline.map(
                  (
                    item,
                    index,
                  ) => {
                    const status =
                      item.new_status ||
                      item.status;

                    return (
                      <article
                        key={
                          item.id ||
                          index
                        }
                      >
                        <span
                          className={
                            styles.timelineDot
                          }
                        />

                        <div>
                          <strong>
                            {statusLabel(
                              status,
                            )}
                          </strong>

                          {item.reason && (
                            <p>
                              {
                                item.reason
                              }
                            </p>
                          )}

                          <small>
                            {formatDate(
                              item.created_at,
                            )}
                            {item.changed_by_name ||
                            item.user_name
                              ? ` · ${
                                  item.changed_by_name ||
                                  item.user_name
                                }`
                              : ""}
                          </small>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </section>

          {/* PROOFS */}

          <section
            className={
              styles.panel
            }
          >
            <PanelHeader
              icon={
                <FileCheck2
                  size={20}
                />
              }
              eyebrow="Livraison"
              title="Preuves de livraison"
            />

            {proofs.length ===
            0 ? (
              <div
                className={
                  styles.emptyState
                }
              >
                Aucune preuve de livraison enregistrée.
              </div>
            ) : (
              <div
                className={
                  styles.proofsGrid
                }
              >
                {proofs.map(
                  (proof) => {
                    const url =
                      proof.file_url ||
                      proof.image_url;

                    return (
                      <article
                        key={
                          proof.id
                        }
                        className={
                          styles.proofCard
                        }
                      >
                        <FileCheck2
                          size={21}
                        />

                        <div>
                          <strong>
                            {proof.type ||
                              proof.proof_type ||
                              "Preuve de livraison"}
                          </strong>

                          <span>
                            {formatDate(
                              proof.created_at,
                            )}
                          </span>
                        </div>

                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ouvrir
                          </a>
                        )}
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT */}

        <aside
          className={
            styles.sideColumn
          }
        >
          {/* STATUS */}

          <section
            className={
              styles.sidePanel
            }
          >
            <PanelHeader
              icon={
                <ShieldAlert
                  size={20}
                />
              }
              eyebrow="Opération"
              title="Statut de la commande"
            />

            <label
              className={
                styles.field
              }
            >
              <span>
                Statut
              </span>

              <div
                className={
                  styles.selectWrapper
                }
              >
                <select
                  value={
                    selectedStatus
                  }
                  onChange={(
                    event,
                  ) =>
                    setSelectedStatus(
                      event.target
                        .value as OrderStatus,
                    )
                  }
                >
                  {ORDER_STATUSES.map(
                    (
                      status,
                    ) => (
                      <option
                        key={
                          status.value
                        }
                        value={
                          status.value
                        }
                      >
                        {
                          status.label
                        }
                      </option>
                    ),
                  )}
                </select>

                <ChevronDown
                  size={16}
                />
              </div>
            </label>

            <label
              className={
                styles.field
              }
            >
              <span>
                {reasonRequired
                  ? "Raison obligatoire"
                  : "Note / raison"}
              </span>

              <textarea
                value={
                  statusReason
                }
                onChange={(
                  event,
                ) =>
                  setStatusReason(
                    event.target
                      .value,
                  )
                }
                placeholder={
                  selectedStatus ===
                  "incident"
                    ? "Ex. Client absent, marchandise endommagée..."
                    : selectedStatus ===
                        "cancelled"
                      ? "Indiquez la raison de l'annulation..."
                      : "Note facultative..."
                }
                rows={4}
              />
            </label>

            <button
              type="button"
              className={
                styles.primaryButton
              }
              disabled={
                saving
              }
              onClick={() =>
                void updateStatus()
              }
            >
              {saving ? (
                <Loader2
                  size={16}
                  className={
                    styles.spin
                  }
                />
              ) : (
                <Save
                  size={16}
                />
              )}

              Enregistrer le statut
            </button>
          </section>

          {/* DRIVER */}

          <section
            className={
              styles.sidePanel
            }
          >
            <PanelHeader
              icon={
                <UserRound
                  size={20}
                />
              }
              eyebrow="Affectation"
              title="Chauffeur"
            />

            <label
              className={
                styles.field
              }
            >
              <span>
                Chauffeur assigné
              </span>

              <div
                className={
                  styles.selectWrapper
                }
              >
                <select
                  value={
                    selectedDriver
                  }
                  onChange={(
                    event,
                  ) =>
                    setSelectedDriver(
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    Non assigné
                  </option>

                  {drivers.map(
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
                        {driverFullName(
                          driver,
                        )}
                        {" · "}
                        {driver.availability_status ||
                          "statut inconnu"}
                      </option>
                    ),
                  )}
                </select>

                <ChevronDown
                  size={16}
                />
              </div>
            </label>

            <button
              type="button"
              className={
                styles.secondaryButton
              }
              disabled={
                saving ||
                !selectedDriver
              }
              onClick={() =>
                void assignDriver()
              }
            >
              <UserRound
                size={16}
              />

              Assigner le chauffeur
            </button>

            {order.driver_id && (
              <Link
                href={`/dashboard/admin/drivers/${order.driver_id}`}
                className={
                  styles.viewLink
                }
              >
                Voir le profil chauffeur
              </Link>
            )}
          </section>

          {/* VEHICLE */}

          <section
            className={
              styles.sidePanel
            }
          >
            <PanelHeader
              icon={
                <Truck
                  size={20}
                />
              }
              eyebrow="Affectation"
              title="Véhicule"
            />

            <label
              className={
                styles.field
              }
            >
              <span>
                Véhicule assigné
              </span>

              <div
                className={
                  styles.selectWrapper
                }
              >
                <select
                  value={
                    selectedVehicle
                  }
                  onChange={(
                    event,
                  ) =>
                    setSelectedVehicle(
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    Non assigné
                  </option>

                  {vehicles.map(
                    (
                      vehicle,
                    ) => (
                      <option
                        key={
                          vehicle.id
                        }
                        value={
                          vehicle.id
                        }
                      >
                        {vehicleLabel(
                          vehicle,
                        )}
                      </option>
                    ),
                  )}
                </select>

                <ChevronDown
                  size={16}
                />
              </div>
            </label>

            <button
              type="button"
              className={
                styles.secondaryButton
              }
              disabled={
                saving ||
                !selectedVehicle
              }
              onClick={() =>
                void assignVehicle()
              }
            >
              <Truck
                size={16}
              />

              Assigner le véhicule
            </button>
          </section>

          {/* SUMMARY */}

          <section
            className={
              styles.sidePanel
            }
          >
            <PanelHeader
              icon={
                <CircleDollarSign
                  size={20}
                />
              }
              eyebrow="Résumé"
              title="Informations"
            />

            <div
              className={
                styles.summaryList
              }
            >
              <SummaryRow
                label="Priorité"
                value={
                  order.priority ||
                  "Normale"
                }
              />

              <SummaryRow
                label="Montant"
                value={
                  formatMoney(
                    orderAmount,
                  )
                }
              />

              <SummaryRow
                label="Création"
                value={
                  formatDate(
                    order.created_at,
                  )
                }
              />

              <SummaryRow
                label="Dernière mise à jour"
                value={
                  formatDate(
                    order.updated_at,
                  )
                }
              />
            </div>

            {(order.description ||
              order.notes) && (
              <div
                className={
                  styles.notesBox
                }
              >
                <span>
                  NOTES
                </span>

                <p>
                  {order.description ||
                    order.notes}
                </p>
              </div>
            )}
          </section>
        </aside>
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
   COMPONENTS
============================================================ */

function PanelHeader({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div
      className={
        styles.panelHeader
      }
    >
      <div>
        <span>
          {eyebrow}
        </span>

        <h2>
          {title}
        </h2>

        {description && (
          <p>
            {description}
          </p>
        )}
      </div>

      <div
        className={
          styles.panelIcon
        }
      >
        {icon}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
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

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={
        styles.infoItem
      }
    >
      <small>
        {label}
      </small>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function RoutePoint({
  type,
  label,
  address,
  date,
}: {
  type:
    | "pickup"
    | "delivery";
  label: string;
  address: string;
  date: string;
}) {
  return (
    <div
      className={
        styles.routePoint
      }
    >
      <span
        className={
          type ===
          "pickup"
            ? styles.pickupMarker
            : styles.deliveryMarker
        }
      >
        <MapPin
          size={17}
        />
      </span>

      <div>
        <small>
          {label}
        </small>

        <strong>
          {address}
        </strong>

        <span>
          <CalendarDays
            size={13}
          />

          {date}
        </span>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={
        styles.summaryRow
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}
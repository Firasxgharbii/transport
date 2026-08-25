"use client";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./orders.module.css";

/* ============================================================
   CONFIGURATION
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.glorysolutions.ca";

/* ============================================================
   TYPES
============================================================ */

type Order = {
  id: number;

  order_number?: string | null;
  reference?: string | null;

  client_id?: number | null;

  client_first_name?: string | null;
  client_last_name?: string | null;
  client_name?: string | null;

  company_name?: string | null;
  client_company_name?: string | null;

  pickup_address?: string | null;
  pickup_city?: string | null;
  pickup_province?: string | null;
  pickup_postal_code?: string | null;

  delivery_address?: string | null;
  delivery_city?: string | null;
  delivery_province?: string | null;
  delivery_postal_code?: string | null;

  pickup_date?: string | null;
  delivery_date?: string | null;

  driver_id?: number | null;

  driver_first_name?: string | null;
  driver_last_name?: string | null;
  driver_name?: string | null;

  vehicle_name?: string | null;
  vehicle_plate?: string | null;

  stops_count?: number | string | null;
  stop_count?: number | string | null;

  priority?: string | null;
  status?: string | null;

  amount?: number | string | null;

  quantity?: number | string | null;
  weight?: number | string | null;

  created_at?: string | null;
};

type Driver = {
  id: number;

  first_name?: string | null;
  last_name?: string | null;

  email?: string | null;
  phone?: string | null;

  availability_status?: string | null;

  vehicle_name?: string | null;
  vehicle_plate?: string | null;
};

type OrdersResponse = {
  success?: boolean;

  data?: Order[];
  orders?: Order[];

  message?: string;
};

type DriversResponse = {
  success?: boolean;

  data?: Driver[];
  drivers?: Driver[];

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

function getOrderNumber(
  order: Order,
) {
  return (
    order.order_number ||
    order.reference ||
    `CMD-${order.id}`
  );
}

function getClientName(
  order: Order,
) {
  const fullName = [
    order.client_first_name,
    order.client_last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    order.company_name ||
    order.client_company_name ||
    order.client_name ||
    fullName ||
    `Client #${order.client_id || "—"}`
  );
}

function getDriverName(
  order: Order,
) {
  const fullName = [
    order.driver_first_name,
    order.driver_last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    order.driver_name ||
    fullName ||
    ""
  );
}

function getDriverOptionName(
  driver: Driver,
) {
  const fullName = [
    driver.first_name,
    driver.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    driver.email ||
    `Chauffeur #${driver.id}`
  );
}

function formatMoney(
  value?: number | string | null,
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

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—";
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
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function normalizeStatus(
  status?: string | null,
) {
  return (
    status ||
    "pending"
  )
    .trim()
    .toLowerCase();
}

function statusLabel(
  status?: string | null,
) {
  switch (
    normalizeStatus(status)
  ) {
    case "pending":
      return "En attente";

    case "assigned":
      return "Assignée";

    case "pickup_in_progress":
      return "Ramassage";

    case "picked_up":
      return "Ramassée";

    case "delivery_in_progress":
      return "En livraison";

    case "arrived":
      return "Arrivé";

    case "completed":
    case "delivered":
      return "Terminée";

    case "cancelled":
    case "canceled":
      return "Annulée";

    case "incident":
      return "Incident";

    default:
      return (
        status ||
        "En attente"
      );
  }
}

function priorityLabel(
  priority?: string | null,
) {
  switch (
    (
      priority ||
      "normal"
    ).toLowerCase()
  ) {
    case "low":
      return "Basse";

    case "high":
      return "Haute";

    case "urgent":
      return "Urgente";

    default:
      return "Normale";
  }
}

function driverStatusLabel(
  status?: string | null,
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
      return "Statut inconnu";
  }
}

/* ============================================================
   PAGE
============================================================ */

export default function OrdersPage() {
  const router =
    useRouter();

  const [
    orders,
    setOrders,
  ] = useState<Order[]>([]);

  const [
    drivers,
    setDrivers,
  ] = useState<Driver[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    loadingDrivers,
    setLoadingDrivers,
  ] = useState(false);

  const [
    assigning,
    setAssigning,
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
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState("all");

  /* ==========================================================
     MODAL ASSIGNATION
  ========================================================== */

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState<Order | null>(
    null,
  );

  const [
    selectedDriverId,
    setSelectedDriverId,
  ] = useState("");

  /* ==========================================================
     FETCH AUTH
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
          | any = {};

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
            "Votre session a expiré.",
          );
        }

        if (
          !response.ok
        ) {
          throw new Error(
            result?.message ||
              "Une erreur est survenue.",
          );
        }

        return result as T;
      },
      [router],
    );

  /* ==========================================================
     COMMANDES
  ========================================================== */

  const loadOrders =
    useCallback(async () => {
      try {
        setError("");

        const result =
          await authenticatedFetch<OrdersResponse>(
            "/api/orders",
          );

        const receivedOrders =
          Array.isArray(
            result.orders,
          )
            ? result.orders
            : Array.isArray(
                  result.data,
                )
              ? result.data
              : [];

        setOrders(
          receivedOrders,
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger les commandes.",
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
    void loadOrders();
  }, [loadOrders]);

  /* ==========================================================
     CHAUFFEURS
  ========================================================== */

  const loadDrivers =
    useCallback(async () => {
      try {
        setLoadingDrivers(
          true,
        );

        const result =
          await authenticatedFetch<DriversResponse>(
            "/api/drivers",
          );

        const receivedDrivers =
          Array.isArray(
            result.drivers,
          )
            ? result.drivers
            : Array.isArray(
                  result.data,
                )
              ? result.data
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
        setLoadingDrivers(
          false,
        );
      }
    }, [
      authenticatedFetch,
    ]);

  /* ==========================================================
     OUVRIR MODAL
  ========================================================== */

  const openAssignModal =
    async (
      order: Order,
    ) => {
      setError("");
      setSuccess("");

      setSelectedOrder(
        order,
      );

      setSelectedDriverId(
        order.driver_id
          ? String(
              order.driver_id,
            )
          : "",
      );

      if (
        drivers.length ===
        0
      ) {
        await loadDrivers();
      }
    };

  /* ==========================================================
     FERMER MODAL
  ========================================================== */

  const closeAssignModal =
    () => {
      if (assigning) {
        return;
      }

      setSelectedOrder(
        null,
      );

      setSelectedDriverId(
        "",
      );
    };

  /* ==========================================================
     ASSIGNER CHAUFFEUR
  ========================================================== */

  const assignDriver =
    async () => {
      if (
        !selectedOrder
      ) {
        return;
      }

      if (
        !selectedDriverId
      ) {
        setError(
          "Veuillez sélectionner un chauffeur.",
        );

        return;
      }

      try {
        setAssigning(
          true,
        );

        setError("");
        setSuccess("");

        await authenticatedFetch(
          `/api/orders/${selectedOrder.id}/assign-driver`,
          {
            method:
              "PATCH",

            body:
              JSON.stringify({
                driver_id:
                  Number(
                    selectedDriverId,
                  ),
              }),
          },
        );

        setSuccess(
          "Chauffeur assigné avec succès.",
        );

        setSelectedOrder(
          null,
        );

        setSelectedDriverId(
          "",
        );

        await loadOrders();

        window.setTimeout(
          () => {
            setSuccess("");
          },
          3500,
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible d'assigner le chauffeur.",
        );
      } finally {
        setAssigning(
          false,
        );
      }
    };

  /* ==========================================================
     FILTRES
  ========================================================== */

  const filteredOrders =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          const status =
            normalizeStatus(
              order.status,
            );

          const priority =
            (
              order.priority ||
              "normal"
            ).toLowerCase();

          const matchStatus =
            statusFilter ===
              "all" ||
            status ===
              statusFilter;

          const matchPriority =
            priorityFilter ===
              "all" ||
            priority ===
              priorityFilter;

          const searchable = [
            getOrderNumber(
              order,
            ),

            getClientName(
              order,
            ),

            order.pickup_address,
            order.pickup_city,

            order.delivery_address,
            order.delivery_city,

            getDriverName(
              order,
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return (
            matchStatus &&
            matchPriority &&
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
      orders,
      search,
      statusFilter,
      priorityFilter,
    ]);

  /* ==========================================================
     STATISTIQUES
  ========================================================== */

  const stats =
    useMemo(() => {
      const pending =
        orders.filter(
          (order) =>
            normalizeStatus(
              order.status,
            ) === "pending",
        ).length;

      const active =
        orders.filter(
          (order) =>
            [
              "assigned",
              "pickup_in_progress",
              "picked_up",
              "delivery_in_progress",
              "arrived",
            ].includes(
              normalizeStatus(
                order.status,
              ),
            ),
        ).length;

      const completed =
        orders.filter(
          (order) =>
            [
              "completed",
              "delivered",
            ].includes(
              normalizeStatus(
                order.status,
              ),
            ),
        ).length;

      const cancelled =
        orders.filter(
          (order) =>
            [
              "cancelled",
              "canceled",
              "incident",
            ].includes(
              normalizeStatus(
                order.status,
              ),
            ),
        ).length;

      const revenue =
        orders
          .filter(
            (order) =>
              [
                "completed",
                "delivered",
              ].includes(
                normalizeStatus(
                  order.status,
                ),
              ),
          )
          .reduce(
            (
              total,
              order,
            ) =>
              total +
              Number(
                order.amount ||
                  0,
              ),
            0,
          );

      return {
        pending,
        active,
        completed,
        cancelled,
        revenue,
      };
    }, [orders]);

  /* ==========================================================
     CLASSES BADGES
  ========================================================== */

  const getPriorityClass =
    (
      priority?: string | null,
    ) => {
      switch (
        (
          priority ||
          "normal"
        ).toLowerCase()
      ) {
        case "low":
          return styles.priorityLow;

        case "high":
          return styles.priorityHigh;

        case "urgent":
          return styles.priorityUrgent;

        default:
          return styles.priorityNormal;
      }
    };

  const getStatusClass =
    (
      status?: string | null,
    ) => {
      const value =
        normalizeStatus(
          status,
        );

      if (
        [
          "completed",
          "delivered",
        ].includes(value)
      ) {
        return styles.statusCompleted;
      }

      if (
        [
          "cancelled",
          "canceled",
          "incident",
        ].includes(value)
      ) {
        return styles.statusDanger;
      }

      if (
        [
          "assigned",
          "pickup_in_progress",
          "picked_up",
          "delivery_in_progress",
          "arrived",
        ].includes(value)
      ) {
        return styles.statusActive;
      }

      return styles.statusPending;
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
          <span
            className={
              styles.eyebrow
            }
          >
            <Package
              size={15}
            />

            Gestion des commandes
          </span>

          <h1>
            Commandes
          </h1>

          <p>
            Créez, assignez et suivez toutes les opérations de transport.
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
              styles.refreshButton
            }
            disabled={
              refreshing
            }
            onClick={() => {
              setRefreshing(
                true,
              );

              void loadOrders();
            }}
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? styles.spin
                  : ""
              }
            />

            Actualiser
          </button>

          <Link
            href="/dashboard/admin/orders/new"
            className={
              styles.createButton
            }
          >
            <Plus
              size={17}
            />

            Nouvelle commande
          </Link>
        </div>
      </section>

      {/* ======================================================
          ALERTES
      ====================================================== */}

      {error && (
        <div
          className={
            styles.errorBanner
          }
        >
          <AlertCircle
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
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            marginBottom: "18px",
            padding: "14px 15px",
            border:
              "1px solid #b9ead6",
            borderRadius:
              "13px",
            background:
              "#effcf7",
            color: "#087a55",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          <CheckCircle2
            size={18}
          />

          {success}
        </div>
      )}

      {/* ======================================================
          STATISTIQUES
      ====================================================== */}

      <section
        className={
          styles.statsGrid
        }
      >
        <article
          className={
            styles.statCard
          }
        >
          <span
            className={
              styles.stat_total
            }
          >
            <Package
              size={20}
            />
          </span>

          <div>
            <small>
              Total commandes
            </small>

            <strong>
              {orders.length}
            </strong>
          </div>
        </article>

        <article
          className={
            styles.statCard
          }
        >
          <span
            className={
              styles.stat_pending
            }
          >
            <Clock3
              size={20}
            />
          </span>

          <div>
            <small>
              En attente
            </small>

            <strong>
              {stats.pending}
            </strong>
          </div>
        </article>

        <article
          className={
            styles.statCard
          }
        >
          <span
            className={
              styles.stat_active
            }
          >
            <Truck
              size={20}
            />
          </span>

          <div>
            <small>
              En cours
            </small>

            <strong>
              {stats.active}
            </strong>
          </div>
        </article>

        <article
          className={
            styles.statCard
          }
        >
          <span
            className={
              styles.stat_completed
            }
          >
            <CheckCircle2
              size={20}
            />
          </span>

          <div>
            <small>
              Terminées
            </small>

            <strong>
              {stats.completed}
            </strong>
          </div>
        </article>

        <article
          className={
            styles.statCard
          }
        >
          <span
            className={
              styles.stat_cancelled
            }
          >
            <AlertCircle
              size={20}
            />
          </span>

          <div>
            <small>
              Annulées / incidents
            </small>

            <strong>
              {stats.cancelled}
            </strong>
          </div>
        </article>

        <article
          className={
            styles.revenueCard
          }
        >
          <span>
            <CircleDollarSign
              size={20}
            />
          </span>

          <div>
            <small>
              Revenus terminés
            </small>

            <strong>
              {formatMoney(
                stats.revenue,
              )}
            </strong>
          </div>
        </article>
      </section>

      {/* ======================================================
          TABLEAU
      ====================================================== */}

      <section
        className={
          styles.panel
        }
      >
        {/* TOOLBAR */}

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
              placeholder="Rechercher une commande, un client, une entreprise..."
            />
          </label>

          <div
            className={
              styles.filterGroup
            }
          >
            <select
              value={
                statusFilter
              }
              onChange={(
                event,
              ) =>
                setStatusFilter(
                  event.target
                    .value,
                )
              }
            >
              <option value="all">
                Tous les statuts
              </option>

              <option value="pending">
                En attente
              </option>

              <option value="assigned">
                Assignée
              </option>

              <option value="pickup_in_progress">
                Ramassage
              </option>

              <option value="delivery_in_progress">
                En livraison
              </option>

              <option value="completed">
                Terminée
              </option>

              <option value="cancelled">
                Annulée
              </option>
            </select>

            <select
              value={
                priorityFilter
              }
              onChange={(
                event,
              ) =>
                setPriorityFilter(
                  event.target
                    .value,
                )
              }
            >
              <option value="all">
                Toutes les priorités
              </option>

              <option value="low">
                Basse
              </option>

              <option value="normal">
                Normale
              </option>

              <option value="high">
                Haute
              </option>

              <option value="urgent">
                Urgente
              </option>
            </select>
          </div>
        </div>

        {/* TABLE */}

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
                  Commande
                </th>

                <th>
                  Client
                </th>

                <th>
                  Trajet
                </th>

                <th>
                  Chauffeur
                </th>

                <th>
                  Arrêts
                </th>

                <th>
                  Priorité
                </th>

                <th>
                  Statut
                </th>

                <th>
                  Montant
                </th>

                <th>
                  Date
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading
                ? Array.from({
                    length: 4,
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
                            10
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
                : filteredOrders.map(
                    (
                      order,
                    ) => {
                      const driverName =
                        getDriverName(
                          order,
                        );

                      return (
                        <tr
                          key={
                            order.id
                          }
                        >
                          {/* COMMANDE */}

                          <td>
                            <div
                              className={
                                styles.orderIdentity
                              }
                            >
                              <span>
                                <Package
                                  size={
                                    17
                                  }
                                />
                              </span>

                              <div>
                                <strong>
                                  {getOrderNumber(
                                    order,
                                  )}
                                </strong>

                                <small>
                                  ID #
                                  {
                                    order.id
                                  }
                                </small>
                              </div>
                            </div>
                          </td>

                          {/* CLIENT */}

                          <td>
                            <div
                              className={
                                styles.clientCell
                              }
                            >
                              <strong>
                                {getClientName(
                                  order,
                                )}
                              </strong>

                              <small>
                                Client #
                                {order.client_id ||
                                  "—"}
                              </small>
                            </div>
                          </td>

                          {/* ROUTE */}

                          <td>
                            <div
                              className={
                                styles.routeCell
                              }
                            >
                              <span>
                                <MapPin
                                  size={
                                    14
                                  }
                                />

                                <strong>
                                  Départ
                                </strong>

                                <em>
                                  {[
                                    order.pickup_address,
                                    order.pickup_city,
                                  ]
                                    .filter(
                                      Boolean,
                                    )
                                    .join(
                                      ", ",
                                    ) ||
                                    "Non défini"}
                                </em>
                              </span>

                              <span>
                                <MapPin
                                  size={
                                    14
                                  }
                                />

                                <strong>
                                  Arrivée
                                </strong>

                                <em>
                                  {[
                                    order.delivery_address,
                                    order.delivery_city,
                                  ]
                                    .filter(
                                      Boolean,
                                    )
                                    .join(
                                      ", ",
                                    ) ||
                                    "Non défini"}
                                </em>
                              </span>
                            </div>
                          </td>

                          {/* CHAUFFEUR */}

                          <td>
                            <div
                              className={
                                styles.driverCell
                              }
                            >
                              <Truck
                                size={
                                  17
                                }
                              />

                              <div>
                                <strong>
                                  {driverName ||
                                    "Non assigné"}
                                </strong>

                                <small>
                                  {order.vehicle_name ||
                                    (
                                      driverName
                                        ? "Véhicule non assigné"
                                        : "Aucun véhicule"
                                    )}
                                </small>
                              </div>

                              <button
                                type="button"
                                className={
                                  styles.actionButton
                                }
                                style={{
                                  marginLeft:
                                    "7px",
                                }}
                                title={
                                  driverName
                                    ? "Changer le chauffeur"
                                    : "Assigner un chauffeur"
                                }
                                onClick={() =>
                                  void openAssignModal(
                                    order,
                                  )
                                }
                              >
                                <UserRound
                                  size={
                                    15
                                  }
                                />
                              </button>
                            </div>
                          </td>

                          {/* STOPS */}

                          <td>
                            <span
                              className={
                                styles.stopsBadge
                              }
                            >
                              {Number(
                                order.stops_count ??
                                  order.stop_count ??
                                  0,
                              )}
                            </span>
                          </td>

                          {/* PRIORITY */}

                          <td>
                            <span
                              className={`${styles.priorityBadge} ${getPriorityClass(
                                order.priority,
                              )}`}
                            >
                              {priorityLabel(
                                order.priority,
                              )}
                            </span>
                          </td>

                          {/* STATUS */}

                          <td>
                            <span
                              className={`${styles.statusBadge} ${getStatusClass(
                                order.status,
                              )}`}
                            >
                              {statusLabel(
                                order.status,
                              )}
                            </span>
                          </td>

                          {/* AMOUNT */}

                          <td>
                            <strong
                              className={
                                styles.amount
                              }
                            >
                              {formatMoney(
                                order.amount,
                              )}
                            </strong>
                          </td>

                          {/* DATE */}

                          <td>
                            <div
                              className={
                                styles.dateCell
                              }
                            >
                              <CalendarDays
                                size={
                                  15
                                }
                              />

                              {formatDate(
                                order.pickup_date ||
                                  order.created_at,
                              )}
                            </div>
                          </td>

                          {/* ACTIONS */}

                          <td>
                            <div
                              className={
                                styles.actions
                              }
                            >
                              <Link
                                href={`/dashboard/admin/orders/${order.id}`}
                                className={
                                  styles.actionButton
                                }
                                title="Voir la commande"
                              >
                                <Eye
                                  size={
                                    15
                                  }
                                />
                              </Link>

                              <button
                                type="button"
                                className={
                                  styles.actionButton
                                }
                                title="Assigner un chauffeur"
                                onClick={() =>
                                  void openAssignModal(
                                    order,
                                  )
                                }
                              >
                                <UserRound
                                  size={
                                    15
                                  }
                                />
                              </button>

                              <button
                                type="button"
                                className={
                                  styles.actionButton
                                }
                                title="Imprimer"
                                onClick={() =>
                                  window.print()
                                }
                              >
                                <Printer
                                  size={
                                    15
                                  }
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
            </tbody>
          </table>

          {/* EMPTY */}

          {!loading &&
            filteredOrders.length ===
              0 && (
              <div
                className={
                  styles.emptyState
                }
              >
                <Package
                  size={36}
                />

                <h2>
                  Aucune commande
                </h2>

                <p>
                  Aucune commande ne correspond à votre recherche.
                </p>

                <Link
                  href="/dashboard/admin/orders/new"
                  className={
                    styles.emptyButton
                  }
                >
                  <Plus
                    size={16}
                  />

                  Nouvelle commande
                </Link>
              </div>
            )}
        </div>

        {/* PAGINATION */}

        <div
          className={
            styles.pagination
          }
        >
          <span>
            {
              filteredOrders.length
            }{" "}
            commande
            {filteredOrders.length >
            1
              ? "s"
              : ""}
          </span>

          <div>
            <button
              type="button"
              disabled
            >
              Précédent
            </button>

            <span>
              Page 1 sur 1
            </span>

            <button
              type="button"
              disabled
            >
              Suivant
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================
          MODAL ASSIGNATION
      ====================================================== */}

      {selectedOrder && (
        <div
          style={{
            position:
              "fixed",
            zIndex: 9999,
            inset: 0,

            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",

            padding: "20px",

            background:
              "rgba(15, 13, 20, 0.55)",

            backdropFilter:
              "blur(6px)",
          }}
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAssignModal();
            }
          }}
        >
          <section
            style={{
              width:
                "min(520px, 100%)",

              overflow:
                "hidden",

              border:
                "1px solid #e4e5ea",

              borderRadius:
                "20px",

              background:
                "#ffffff",

              boxShadow:
                "0 30px 80px rgba(20, 18, 28, 0.25)",
            }}
          >
            {/* HEADER MODAL */}

            <header
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                gap: "20px",

                padding:
                  "22px",

                borderBottom:
                  "1px solid #ececf1",
              }}
            >
              <div>
                <span
                  style={{
                    display:
                      "block",

                    marginBottom:
                      "5px",

                    color:
                      "#dc143c",

                    fontSize:
                      "9px",

                    fontWeight:
                      900,

                    letterSpacing:
                      ".1em",

                    textTransform:
                      "uppercase",
                  }}
                >
                  Gestion de la commande
                </span>

                <h2
                  style={{
                    margin: 0,

                    color:
                      "#24252d",

                    fontSize:
                      "21px",
                  }}
                >
                  Assigner un chauffeur
                </h2>

                <p
                  style={{
                    margin:
                      "6px 0 0",

                    color:
                      "#858791",

                    fontSize:
                      "11px",
                  }}
                >
                  {getOrderNumber(
                    selectedOrder,
                  )}
                </p>
              </div>

              <button
                type="button"
                disabled={
                  assigning
                }
                onClick={
                  closeAssignModal
                }
                style={{
                  display:
                    "grid",

                  width:
                    "36px",
                  height:
                    "36px",

                  flex:
                    "0 0 36px",

                  placeItems:
                    "center",

                  border:
                    "1px solid #e1e2e7",

                  borderRadius:
                    "10px",

                  background:
                    "#fff",

                  cursor:
                    "pointer",
                }}
              >
                <X
                  size={18}
                />
              </button>
            </header>

            {/* CONTENT */}

            <div
              style={{
                padding:
                  "22px",
              }}
            >
              <label
                style={{
                  display:
                    "block",

                  marginBottom:
                    "7px",

                  color:
                    "#555761",

                  fontSize:
                    "11px",

                  fontWeight:
                    900,
                }}
              >
                Chauffeur
              </label>

              <select
                value={
                  selectedDriverId
                }
                disabled={
                  loadingDrivers ||
                  assigning
                }
                onChange={(
                  event,
                ) =>
                  setSelectedDriverId(
                    event.target
                      .value,
                  )
                }
                style={{
                  width:
                    "100%",

                  minHeight:
                    "47px",

                  padding:
                    "0 12px",

                  border:
                    "1px solid #dedfe5",

                  borderRadius:
                    "11px",

                  outline:
                    "none",

                  background:
                    "#fafafd",

                  color:
                    "#292a32",
                }}
              >
                <option value="">
                  {loadingDrivers
                    ? "Chargement des chauffeurs..."
                    : "Sélectionner un chauffeur"}
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
                      {getDriverOptionName(
                        driver,
                      )}
                      {" — "}
                      {driverStatusLabel(
                        driver.availability_status,
                      )}
                    </option>
                  ),
                )}
              </select>

              {/* INFOS COMMANDE */}

              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap: "11px",

                  marginTop:
                    "16px",

                  padding:
                    "13px",

                  border:
                    "1px solid #ececf1",

                  borderRadius:
                    "12px",

                  background:
                    "#f9f9fb",
                }}
              >
                <Truck
                  size={19}
                  color="#dc143c"
                />

                <div>
                  <strong
                    style={{
                      display:
                        "block",

                      color:
                        "#30313a",

                      fontSize:
                        "11px",
                    }}
                  >
                    {getClientName(
                      selectedOrder,
                    )}
                  </strong>

                  <span
                    style={{
                      display:
                        "block",

                      marginTop:
                        "3px",

                      color:
                        "#898b95",

                      fontSize:
                        "9px",
                    }}
                  >
                    {selectedOrder.pickup_city ||
                      "Départ"}{" "}
                    →{" "}
                    {selectedOrder.delivery_city ||
                      "Arrivée"}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTIONS MODAL */}

            <footer
              style={{
                display:
                  "flex",

                justifyContent:
                  "flex-end",

                gap: "9px",

                padding:
                  "16px 22px",

                borderTop:
                  "1px solid #ececf1",
              }}
            >
              <button
                type="button"
                disabled={
                  assigning
                }
                onClick={
                  closeAssignModal
                }
                style={{
                  minHeight:
                    "42px",

                  padding:
                    "0 15px",

                  border:
                    "1px solid #dedfe5",

                  borderRadius:
                    "11px",

                  background:
                    "#fff",

                  color:
                    "#666873",

                  fontWeight:
                    800,

                  cursor:
                    "pointer",
                }}
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={
                  assigning ||
                  !selectedDriverId
                }
                onClick={() =>
                  void assignDriver()
                }
                style={{
                  display:
                    "inline-flex",

                  minHeight:
                    "42px",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  gap: "7px",

                  padding:
                    "0 16px",

                  border:
                    "1px solid #dc143c",

                  borderRadius:
                    "11px",

                  background:
                    "#dc143c",

                  color:
                    "#fff",

                  fontWeight:
                    900,

                  cursor:
                    assigning
                      ? "not-allowed"
                      : "pointer",

                  opacity:
                    assigning ||
                    !selectedDriverId
                      ? 0.6
                      : 1,
                }}
              >
                {assigning ? (
                  <>
                    <Loader2
                      size={16}
                      className={
                        styles.spin
                      }
                    />

                    Assignation...
                  </>
                ) : (
                  <>
                    <UserRound
                      size={16}
                    />

                    Assigner le chauffeur
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
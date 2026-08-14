"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  MapPin,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Truck,
  X,
  XCircle,
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
  | "cancelled"
  | "incident";

type OrderPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

type Order = {
  id: number;
  order_number?: string;

  client_id?: number;
  driver_id?: number | null;
  vehicle_id?: number | null;

  client_first_name?: string;
  client_last_name?: string;
  company_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;

  driver_first_name?: string | null;
  driver_last_name?: string | null;
  driver_phone?: string | null;

  vehicle_name?: string | null;
  vehicle_plate?: string | null;

  pickup_address?: string;
  delivery_address?: string;

  pickup_date?: string | null;
  pickup_time?: string | null;

  delivery_date?: string | null;
  delivery_time?: string | null;

  pallets_count?: number;

  description?: string | null;
  notes?: string | null;

  subtotal?: number | string;
  taxes?: number | string;
  total_amount?: number | string;

  estimated_distance?:
    | number
    | string
    | null;

  estimated_duration?: number | null;

  priority?: OrderPriority;
  status?: OrderStatus;

  stop_count?: number;
  completed_stops?: number;

  created_at?: string;
  updated_at?: string;
};

type OrdersResponse = {
  success?: boolean;
  count?: number;
  data?: Order[];
  orders?: Order[];
  message?: string;
};

type StatusFilter =
  | "all"
  | OrderStatus;

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://192.168.2.22:5000";

const ITEMS_PER_PAGE = 8;

/* ============================================================
   UTILITAIRES
============================================================ */

function getToken() {
  if (
    typeof window === "undefined"
  ) {
    return "";
  }

  return (
    window.localStorage.getItem(
      "glory_token",
    ) || ""
  );
}

function getClientName(
  order: Order,
) {
  if (order.company_name) {
    return order.company_name;
  }

  const personName = [
    order.client_first_name,
    order.client_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    personName ||
    `Client #${order.client_id || "—"}`
  );
}

function getClientContact(
  order: Order,
) {
  if (!order.company_name) {
    return null;
  }

  return [
    order.client_first_name,
    order.client_last_name,
  ]
    .filter(Boolean)
    .join(" ");
}

function getDriverName(
  order: Order,
) {
  const driverName = [
    order.driver_first_name,
    order.driver_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    driverName || "Non assigné"
  );
}

function getStatusLabel(
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
      return "Inconnu";
  }
}

function getPriorityLabel(
  priority?: string,
) {
  switch (priority) {
    case "low":
      return "Faible";

    case "high":
      return "Élevée";

    case "urgent":
      return "Urgente";

    default:
      return "Normale";
  }
}

function formatMoney(
  value?: number | string,
) {
  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    "fr-CA",
    {
      style: "currency",
      currency: "CAD",
    },
  ).format(amount);
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Non définie";
  }

  const normalizedValue =
    value.includes("T")
      ? value
      : `${value}T00:00:00`;

  const date =
    new Date(normalizedValue);

  if (
    Number.isNaN(date.getTime())
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

function formatTime(
  value?: string | null,
) {
  if (!value) {
    return "";
  }

  return value
    .split(":")
    .slice(0, 2)
    .join(":");
}

function getStatusClass(
  status?: OrderStatus,
) {
  if (status === "completed") {
    return styles.statusCompleted;
  }

  if (
    status === "cancelled" ||
    status === "incident"
  ) {
    return styles.statusDanger;
  }

  if (
    status === "pending" ||
    status === "assigned"
  ) {
    return styles.statusPending;
  }

  return styles.statusActive;
}

function getPriorityClass(
  priority?: OrderPriority,
) {
  switch (priority) {
    case "urgent":
      return styles.priorityUrgent;

    case "high":
      return styles.priorityHigh;

    case "low":
      return styles.priorityLow;

    default:
      return styles.priorityNormal;
  }
}

/* ============================================================
   PAGE
============================================================ */

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>("all");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState("all");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  /* ============================================================
     FETCH AUTHENTIFIÉ
  ============================================================ */

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
          const apiError =
            responseData as {
              message?: string;
            } | null;

          throw new Error(
            apiError?.message ||
              "Une erreur est survenue.",
          );
        }

        return responseData as T;
      },
      [router],
    );

  /* ============================================================
     CHARGEMENT DES COMMANDES
  ============================================================ */

  const loadOrders =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await authenticatedFetch<OrdersResponse>(
            "/api/orders",
          );

        const receivedOrders =
          Array.isArray(response.data)
            ? response.data
            : Array.isArray(
                  response.orders,
                )
              ? response.orders
              : [];

        setOrders(receivedOrders);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger les commandes.",
        );
      } finally {
        setLoading(false);
      }
    }, [authenticatedFetch]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
    priorityFilter,
  ]);

  /* ============================================================
     STATISTIQUES
  ============================================================ */

  const pendingCount = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "pending" ||
          order.status === "assigned",
      ).length,
    [orders],
  );

  const activeCount = useMemo(
    () =>
      orders.filter((order) =>
        [
          "pickup_in_progress",
          "picked_up",
          "delivery_in_progress",
          "arrived",
        ].includes(
          order.status || "",
        ),
      ).length,
    [orders],
  );

  const completedCount = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status ===
          "completed",
      ).length,
    [orders],
  );

  const cancelledCount = useMemo(
    () =>
      orders.filter((order) =>
        [
          "cancelled",
          "incident",
        ].includes(
          order.status || "",
        ),
      ).length,
    [orders],
  );

  const totalRevenue = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            order.status ===
            "completed",
        )
        .reduce(
          (total, order) =>
            total +
            Number(
              order.total_amount || 0,
            ),
          0,
        ),
    [orders],
  );

  /* ============================================================
     FILTRAGE
  ============================================================ */

  const filteredOrders =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          const searchableContent = [
            order.order_number,
            order.company_name,
            order.client_first_name,
            order.client_last_name,
            order.client_phone,
            order.client_email,
            order.driver_first_name,
            order.driver_last_name,
            order.pickup_address,
            order.delivery_address,
            order.vehicle_name,
            order.vehicle_plate,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !normalizedSearch ||
            searchableContent.includes(
              normalizedSearch,
            );

          const matchesStatus =
            statusFilter === "all" ||
            order.status ===
              statusFilter;

          const matchesPriority =
            priorityFilter === "all" ||
            order.priority ===
              priorityFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPriority
          );
        },
      );
    }, [
      orders,
      search,
      statusFilter,
      priorityFilter,
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredOrders.length /
        ITEMS_PER_PAGE,
    ),
  );

  useEffect(() => {
    if (
      currentPage > totalPages
    ) {
      setCurrentPage(totalPages);
    }
  }, [
    currentPage,
    totalPages,
  ]);

  const visibleOrders =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) *
        ITEMS_PER_PAGE;

      return filteredOrders.slice(
        startIndex,
        startIndex +
          ITEMS_PER_PAGE,
      );
    }, [
      filteredOrders,
      currentPage,
    ]);

  return (
    <main className={styles.page}>
      {/* =====================================================
          EN-TÊTE
      ====================================================== */}

      <section
        className={styles.heading}
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            <Package size={16} />
            Gestion des commandes
          </span>

          <h1>Commandes</h1>

          <p>
            Créez, assignez et
            suivez toutes les
            opérations de transport.
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
            onClick={() =>
              void loadOrders()
            }
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={
                loading
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
            <Plus size={18} />
            Nouvelle commande
          </Link>
        </div>
      </section>

      {/* =====================================================
          ERREUR
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

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =====================================================
          CARTES STATISTIQUES
      ====================================================== */}

      <section
        className={
          styles.statsGrid
        }
      >
        <StatCard
          label="Total commandes"
          value={orders.length}
          icon={
            <Package size={20} />
          }
          variant="total"
        />

        <StatCard
          label="En attente"
          value={pendingCount}
          icon={
            <Clock3 size={20} />
          }
          variant="pending"
        />

        <StatCard
          label="En cours"
          value={activeCount}
          icon={<Truck size={20} />}
          variant="active"
        />

        <StatCard
          label="Terminées"
          value={completedCount}
          icon={
            <CheckCircle2
              size={20}
            />
          }
          variant="completed"
        />

        <StatCard
          label="Annulées / incidents"
          value={cancelledCount}
          icon={
            <XCircle size={20} />
          }
          variant="cancelled"
        />

        <article
          className={
            styles.revenueCard
          }
        >
          <span>
            <FileText size={20} />
          </span>

          <div>
            <small>
              Revenus terminés
            </small>

            <strong>
              {formatMoney(
                totalRevenue,
              )}
            </strong>
          </div>
        </article>
      </section>

      {/* =====================================================
          TABLEAU
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
              onChange={(event) =>
                setSearch(
                  event.target.value,
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
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
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

              <option value="picked_up">
                Récupérée
              </option>

              <option value="delivery_in_progress">
                En livraison
              </option>

              <option value="arrived">
                Arrivée
              </option>

              <option value="completed">
                Terminée
              </option>

              <option value="cancelled">
                Annulée
              </option>

              <option value="incident">
                Incident
              </option>
            </select>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value,
                )
              }
            >
              <option value="all">
                Toutes les priorités
              </option>

              <option value="low">
                Faible
              </option>

              <option value="normal">
                Normale
              </option>

              <option value="high">
                Élevée
              </option>

              <option value="urgent">
                Urgente
              </option>
            </select>
          </div>
        </div>

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
                <th>Trajet</th>
                <th>Chauffeur</th>
                <th>Arrêts</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th>Montant</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({
                  length: 5,
                }).map(
                  (_, index) => (
                    <tr key={index}>
                      <td colSpan={10}>
                        <div
                          className={
                            styles.skeleton
                          }
                        />
                      </td>
                    </tr>
                  ),
                )
              ) : visibleOrders.length ===
                0 ? (
                <tr>
                  <td colSpan={10}>
                    <div
                      className={
                        styles.emptyState
                      }
                    >
                      <Package
                        size={40}
                      />

                      <h2>
                        Aucune commande
                        trouvée
                      </h2>

                      <p>
                        Créez votre première
                        commande ou modifiez
                        les filtres.
                      </p>

                      <Link
                        href="/dashboard/admin/orders/new"
                        className={
                          styles.emptyButton
                        }
                      >
                        <Plus
                          size={17}
                        />

                        Créer une commande
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleOrders.map(
                  (order) => {
                    const clientContact =
                      getClientContact(
                        order,
                      );

                    return (
                      <tr
                        key={
                          order.id
                        }
                      >
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
                                {order.order_number ||
                                  `CMD-${order.id}`}
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

                            {clientContact && (
                              <small>
                                Contact :{" "}
                                {
                                  clientContact
                                }
                              </small>
                            )}

                            <small>
                              {order.client_phone ||
                                order.client_email ||
                                "Coordonnées non disponibles"}
                            </small>
                          </div>
                        </td>

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
                                {order.pickup_address ||
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
                                {order.delivery_address ||
                                  "Non définie"}
                              </em>
                            </span>
                          </div>
                        </td>

                        <td>
                          <div
                            className={
                              styles.driverCell
                            }
                          >
                            <Truck
                              size={15}
                            />

                            <div>
                              <strong>
                                {getDriverName(
                                  order,
                                )}
                              </strong>

                              <small>
                                {order.vehicle_name ||
                                  "Aucun véhicule"}

                                {order.vehicle_plate
                                  ? ` · ${order.vehicle_plate}`
                                  : ""}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              styles.stopsBadge
                            }
                          >
                            {Number(
                              order.completed_stops ||
                                0,
                            )}
                            /
                            {Number(
                              order.stop_count ||
                                0,
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`${styles.priorityBadge} ${getPriorityClass(
                              order.priority,
                            )}`}
                          >
                            {getPriorityLabel(
                              order.priority,
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`${styles.statusBadge} ${getStatusClass(
                              order.status,
                            )}`}
                          >
                            {getStatusLabel(
                              order.status,
                            )}
                          </span>
                        </td>

                        <td>
                          <strong
                            className={
                              styles.amount
                            }
                          >
                            {formatMoney(
                              order.total_amount,
                            )}
                          </strong>
                        </td>

                        <td>
                          <div
                            className={
                              styles.dateCell
                            }
                          >
                            <CalendarDays
                              size={14}
                            />

                            <span>
                              {formatDate(
                                order.pickup_date,
                              )}

                              {order.pickup_time
                                ? ` · ${formatTime(
                                    order.pickup_time,
                                  )}`
                                : ""}
                            </span>
                          </div>
                        </td>

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
                              title="Voir les détails"
                            >
                              <Eye
                                size={
                                  16
                                }
                              />
                            </Link>

                            <Link
                              href={`/dashboard/admin/orders/${order.id}/print`}
                              className={
                                styles.actionButton
                              }
                              title="Imprimer"
                            >
                              <Printer
                                size={
                                  16
                                }
                              />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  },
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
            {filteredOrders.length}{" "}
            commande
            {filteredOrders.length >
            1
              ? "s"
              : ""}
          </span>

          <div>
            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                )
              }
              disabled={
                currentPage === 1
              }
            >
              Précédent
            </button>

            <span>
              Page {currentPage} sur{" "}
              {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  (current) =>
                    Math.min(
                      totalPages,
                      current + 1,
                    ),
                )
              }
              disabled={
                currentPage ===
                totalPages
              }
            >
              Suivant
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

/* ============================================================
   COMPOSANT STATISTIQUE
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
    | "pending"
    | "active"
    | "completed"
    | "cancelled";
}) {
  return (
    <article
      className={styles.statCard}
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
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
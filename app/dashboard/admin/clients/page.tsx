"use client";

import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./clients.module.css";

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

type Client = {
  id: number;

  company_id?: number | null;
  user_id?: number | null;

  first_name: string;
  last_name: string;

  company_name?: string | null;

  phone?: string | null;
  email?: string | null;

  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;

  notes?: string | null;

  created_at?: string | null;
};

type Order = {
  id: number;

  order_number?: string;

  client_id: number;
  driver_id?: number | null;
  vehicle_id?: number | null;

  client_first_name?: string;
  client_last_name?: string;
  company_name?: string | null;

  driver_first_name?: string | null;
  driver_last_name?: string | null;

  vehicle_name?: string | null;
  vehicle_plate?: string | null;

  pickup_address?: string | null;
  delivery_address?: string | null;

  pickup_date?: string | null;
  pickup_time?: string | null;

  delivery_date?: string | null;
  delivery_time?: string | null;

  pallets_count?: number | string | null;

  subtotal?: number | string | null;
  taxes?: number | string | null;
  total_amount?: number | string | null;

  status?: OrderStatus;

  stop_count?: number | string | null;
  completed_stops?: number | string | null;

  created_at?: string | null;
};

type ClientsResponse = {
  success?: boolean;
  data?: Client[];
  clients?: Client[];
  message?: string;
};

type OrdersResponse = {
  success?: boolean;
  data?: Order[];
  orders?: Order[];
  message?: string;
};

type ClientTypeFilter =
  | "all"
  | "company"
  | "individual";

type ActivityFilter =
  | "all"
  | "active"
  | "completed"
  | "without_orders";

type ClientSummary = Client & {
  client_type: "company" | "individual";

  orders: Order[];

  total_orders: number;
  active_orders: number;
  completed_orders: number;
  cancelled_orders: number;

  total_pallets: number;

  total_revenue: number;
  completed_revenue: number;

  total_stops: number;
  completed_stops: number;

  last_order: Order | null;
};

/* ============================================================
   CONFIGURATION
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://192.168.2.22:5000";

const ITEMS_PER_PAGE = 8;

/* ============================================================
   UTILITAIRES
============================================================ */

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

function getClientDisplayName(
  client: Client,
) {
  if (client.company_name?.trim()) {
    return client.company_name.trim();
  }

  const personName = [
    client.first_name,
    client.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    personName ||
    `Client #${client.id}`
  );
}

function getContactName(client: Client) {
  return [
    client.first_name,
    client.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getClientAddress(
  client: Client,
) {
  return [
    client.address,
    client.city,
    client.province,
    client.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function getDriverName(order: Order) {
  const name = [
    order.driver_first_name,
    order.driver_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return name || "Non assigné";
}

function getStatusLabel(
  status?: OrderStatus,
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

function formatMoney(
  value?: number | string | null,
) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat(
    "fr-CA",
    {
      style: "currency",
      currency: "CAD",
    },
  ).format(amount);
}

function formatNumber(
  value?: number | string | null,
) {
  return new Intl.NumberFormat(
    "fr-CA",
  ).format(Number(value || 0));
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

function getOrderDate(order: Order) {
  const value =
    order.pickup_date ||
    order.created_at;

  if (!value) {
    return 0;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 0
    : date.getTime();
}

function isActiveOrder(
  order: Order,
) {
  return [
    "pending",
    "assigned",
    "pickup_in_progress",
    "picked_up",
    "delivery_in_progress",
    "arrived",
  ].includes(order.status || "");
}

/* ============================================================
   PAGE CLIENTS
============================================================ */

export default function ClientsPage() {
  const router = useRouter();

  const [clients, setClients] =
    useState<Client[]>([]);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    clientTypeFilter,
    setClientTypeFilter,
  ] =
    useState<ClientTypeFilter>("all");

  const [
    activityFilter,
    setActivityFilter,
  ] =
    useState<ActivityFilter>("all");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    selectedClient,
    setSelectedClient,
  ] =
    useState<ClientSummary | null>(
      null,
    );

  /* ============================================================
     FETCH AUTHENTIFIÉ
  ============================================================ */

  const authenticatedFetch =
    useCallback(
      async <T,>(
        endpoint: string,
      ): Promise<T> => {
        const token = getToken();

        if (!token) {
          router.replace("/login");

          throw new Error(
            "Votre session a expiré.",
          );
        }

        const response = await fetch(
          `${API_URL}${endpoint}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
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
     CHARGEMENT DES DONNÉES
  ============================================================ */

  const loadData =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const [
          clientsResponse,
          ordersResponse,
        ] = await Promise.all([
          authenticatedFetch<ClientsResponse>(
            "/api/clients",
          ),

          authenticatedFetch<OrdersResponse>(
            "/api/orders",
          ),
        ]);

        const receivedClients =
          Array.isArray(
            clientsResponse.data,
          )
            ? clientsResponse.data
            : Array.isArray(
                  clientsResponse.clients,
                )
              ? clientsResponse.clients
              : [];

        const receivedOrders =
          Array.isArray(
            ordersResponse.data,
          )
            ? ordersResponse.data
            : Array.isArray(
                  ordersResponse.orders,
                )
              ? ordersResponse.orders
              : [];

        setClients(receivedClients);
        setOrders(receivedOrders);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger les clients.",
        );
      } finally {
        setLoading(false);
      }
    }, [authenticatedFetch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* ============================================================
     RÉSUMÉ COMPLET DES CLIENTS
  ============================================================ */

  const clientSummaries =
    useMemo<ClientSummary[]>(() => {
      return clients.map((client) => {
        const clientOrders = orders
          .filter(
            (order) =>
              Number(order.client_id) ===
              Number(client.id),
          )
          .sort(
            (firstOrder, secondOrder) =>
              getOrderDate(secondOrder) -
              getOrderDate(firstOrder),
          );

        const activeOrders =
          clientOrders.filter(
            isActiveOrder,
          );

        const completedOrders =
          clientOrders.filter(
            (order) =>
              order.status ===
              "completed",
          );

        const cancelledOrders =
          clientOrders.filter(
            (order) =>
              order.status ===
                "cancelled" ||
              order.status ===
                "incident",
          );

        const totalPallets =
          clientOrders.reduce(
            (total, order) =>
              total +
              Number(
                order.pallets_count || 0,
              ),
            0,
          );

        const totalRevenue =
          clientOrders.reduce(
            (total, order) =>
              total +
              Number(
                order.total_amount || 0,
              ),
            0,
          );

        const completedRevenue =
          completedOrders.reduce(
            (total, order) =>
              total +
              Number(
                order.total_amount || 0,
              ),
            0,
          );

        const totalStops =
          clientOrders.reduce(
            (total, order) =>
              total +
              Number(
                order.stop_count || 0,
              ),
            0,
          );

        const completedStops =
          clientOrders.reduce(
            (total, order) =>
              total +
              Number(
                order.completed_stops ||
                  0,
              ),
            0,
          );

        return {
          ...client,

          client_type:
            client.company_name?.trim()
              ? "company"
              : "individual",

          orders: clientOrders,

          total_orders:
            clientOrders.length,

          active_orders:
            activeOrders.length,

          completed_orders:
            completedOrders.length,

          cancelled_orders:
            cancelledOrders.length,

          total_pallets:
            totalPallets,

          total_revenue:
            totalRevenue,

          completed_revenue:
            completedRevenue,

          total_stops:
            totalStops,

          completed_stops:
            completedStops,

          last_order:
            clientOrders[0] || null,
        };
      });
    }, [clients, orders]);

  /* ============================================================
     STATISTIQUES GLOBALES
  ============================================================ */

  const companyCount = useMemo(
    () =>
      clientSummaries.filter(
        (client) =>
          client.client_type ===
          "company",
      ).length,
    [clientSummaries],
  );

  const individualCount = useMemo(
    () =>
      clientSummaries.filter(
        (client) =>
          client.client_type ===
          "individual",
      ).length,
    [clientSummaries],
  );

  const activeClientCount = useMemo(
    () =>
      clientSummaries.filter(
        (client) =>
          client.active_orders > 0,
      ).length,
    [clientSummaries],
  );

  const globalPallets = useMemo(
    () =>
      clientSummaries.reduce(
        (total, client) =>
          total +
          client.total_pallets,
        0,
      ),
    [clientSummaries],
  );

  const globalRevenue = useMemo(
    () =>
      clientSummaries.reduce(
        (total, client) =>
          total +
          client.completed_revenue,
        0,
      ),
    [clientSummaries],
  );

  /* ============================================================
     FILTRES
  ============================================================ */

  const filteredClients =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return clientSummaries.filter(
        (client) => {
          const searchableContent = [
            client.company_name,
            client.first_name,
            client.last_name,
            client.phone,
            client.email,
            client.address,
            client.city,
            client.province,
            client.postal_code,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !normalizedSearch ||
            searchableContent.includes(
              normalizedSearch,
            );

          const matchesType =
            clientTypeFilter === "all" ||
            client.client_type ===
              clientTypeFilter;

          let matchesActivity = true;

          if (
            activityFilter === "active"
          ) {
            matchesActivity =
              client.active_orders > 0;
          }

          if (
            activityFilter ===
            "completed"
          ) {
            matchesActivity =
              client.completed_orders > 0;
          }

          if (
            activityFilter ===
            "without_orders"
          ) {
            matchesActivity =
              client.total_orders === 0;
          }

          return (
            matchesSearch &&
            matchesType &&
            matchesActivity
          );
        },
      );
    }, [
      clientSummaries,
      search,
      clientTypeFilter,
      activityFilter,
    ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    clientTypeFilter,
    activityFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredClients.length /
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

  const visibleClients = useMemo(
    () => {
      const startIndex =
        (currentPage - 1) *
        ITEMS_PER_PAGE;

      return filteredClients.slice(
        startIndex,
        startIndex +
          ITEMS_PER_PAGE,
      );
    },
    [
      filteredClients,
      currentPage,
    ],
  );

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
            <Users size={16} />
            Gestion de la clientèle
          </span>

          <h1>Clients</h1>

          <p>
            Consultez les particuliers,
            les entreprises, leurs
            commandes, palettes et
            revenus.
          </p>
        </div>

        <button
          type="button"
          className={
            styles.refreshButton
          }
          onClick={() =>
            void loadData()
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
          STATISTIQUES
      ====================================================== */}

      <section
        className={
          styles.statsGrid
        }
      >
        <StatCard
          label="Total clients"
          value={formatNumber(
            clientSummaries.length,
          )}
          icon={<Users size={20} />}
          variant="total"
        />

        <StatCard
          label="Entreprises"
          value={formatNumber(
            companyCount,
          )}
          icon={
            <Building2 size={20} />
          }
          variant="company"
        />

        <StatCard
          label="Particuliers"
          value={formatNumber(
            individualCount,
          )}
          icon={
            <UserRound size={20} />
          }
          variant="individual"
        />

        <StatCard
          label="Clients actifs"
          value={formatNumber(
            activeClientCount,
          )}
          icon={<Truck size={20} />}
          variant="active"
        />

        <StatCard
          label="Palettes transportées"
          value={formatNumber(
            globalPallets,
          )}
          icon={
            <Package size={20} />
          }
          variant="pallets"
        />

        <article
          className={
            styles.revenueCard
          }
        >
          <span>
            <CheckCircle2
              size={20}
            />
          </span>

          <div>
            <small>
              Revenus terminés
            </small>

            <strong>
              {formatMoney(
                globalRevenue,
              )}
            </strong>
          </div>
        </article>
      </section>

      {/* =====================================================
          LISTE CLIENTS
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
              placeholder="Rechercher un particulier, une entreprise, un courriel..."
            />
          </label>

          <div
            className={
              styles.filters
            }
          >
            <select
              value={
                clientTypeFilter
              }
              onChange={(event) =>
                setClientTypeFilter(
                  event.target
                    .value as ClientTypeFilter,
                )
              }
            >
              <option value="all">
                Tous les clients
              </option>

              <option value="company">
                Entreprises
              </option>

              <option value="individual">
                Particuliers
              </option>
            </select>

            <select
              value={activityFilter}
              onChange={(event) =>
                setActivityFilter(
                  event.target
                    .value as ActivityFilter,
                )
              }
            >
              <option value="all">
                Toute l’activité
              </option>

              <option value="active">
                Commandes actives
              </option>

              <option value="completed">
                Commandes terminées
              </option>

              <option value="without_orders">
                Sans commande
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
                <th>Client</th>
                <th>Type</th>
                <th>Coordonnées</th>
                <th>Adresse</th>
                <th>Commandes</th>
                <th>Palettes</th>
                <th>Arrêts</th>
                <th>Revenus</th>
                <th>Dernière activité</th>
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
              ) : visibleClients.length ===
                0 ? (
                <tr>
                  <td colSpan={10}>
                    <div
                      className={
                        styles.emptyState
                      }
                    >
                      <Users size={42} />

                      <h2>
                        Aucun client
                        trouvé
                      </h2>

                      <p>
                        Modifiez les filtres
                        ou ajoutez un client
                        depuis la gestion des
                        utilisateurs.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleClients.map(
                  (client) => (
                    <tr
                      key={client.id}
                    >
                      <td>
                        <div
                          className={
                            styles.clientIdentity
                          }
                        >
                          <span
                            className={
                              client.client_type ===
                              "company"
                                ? styles.companyAvatar
                                : styles.individualAvatar
                            }
                          >
                            {client.client_type ===
                            "company" ? (
                              <Building2
                                size={18}
                              />
                            ) : (
                              <UserRound
                                size={18}
                              />
                            )}
                          </span>

                          <div>
                            <strong>
                              {getClientDisplayName(
                                client,
                              )}
                            </strong>

                            {client.client_type ===
                              "company" && (
                              <small>
                                Contact :{" "}
                                {getContactName(
                                  client,
                                ) ||
                                  "Non défini"}
                              </small>
                            )}

                            <small>
                              Client #
                              {client.id}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`${styles.typeBadge} ${
                            client.client_type ===
                            "company"
                              ? styles.typeCompany
                              : styles.typeIndividual
                          }`}
                        >
                          {client.client_type ===
                          "company"
                            ? "Entreprise"
                            : "Particulier"}
                        </span>
                      </td>

                      <td>
                        <div
                          className={
                            styles.contactCell
                          }
                        >
                          <span>
                            <Phone
                              size={13}
                            />

                            {client.phone ||
                              "Non fourni"}
                          </span>

                          <span>
                            <Mail
                              size={13}
                            />

                            {client.email ||
                              "Non fourni"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            styles.addressCell
                          }
                        >
                          <MapPin
                            size={14}
                          />

                          <span>
                            {getClientAddress(
                              client,
                            ) ||
                              "Adresse non fournie"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            styles.orderStats
                          }
                        >
                          <strong>
                            {
                              client.total_orders
                            }
                          </strong>

                          <small>
                            {
                              client.active_orders
                            }{" "}
                            en cours
                          </small>

                          <small>
                            {
                              client.completed_orders
                            }{" "}
                            terminées
                          </small>
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            styles.palletCell
                          }
                        >
                          <Package
                            size={15}
                          />

                          <strong>
                            {formatNumber(
                              client.total_pallets,
                            )}
                          </strong>
                        </div>
                      </td>

                      <td>
                        <span
                          className={
                            styles.stopsBadge
                          }
                        >
                          {
                            client.completed_stops
                          }
                          /
                          {
                            client.total_stops
                          }
                        </span>
                      </td>

                      <td>
                        <div
                          className={
                            styles.revenueCell
                          }
                        >
                          <strong>
                            {formatMoney(
                              client.completed_revenue,
                            )}
                          </strong>

                          <small>
                            Total enregistré :{" "}
                            {formatMoney(
                              client.total_revenue,
                            )}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            styles.lastActivity
                          }
                        >
                          <CalendarDays
                            size={14}
                          />

                          <div>
                            <strong>
                              {client.last_order
                                ? formatDate(
                                    client
                                      .last_order
                                      .pickup_date ||
                                      client
                                        .last_order
                                        .created_at,
                                  )
                                : "Aucune commande"}
                            </strong>

                            {client.last_order && (
                              <small>
                                {client
                                  .last_order
                                  .order_number ||
                                  `CMD-${client.last_order.id}`}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={
                            styles.viewButton
                          }
                          onClick={() =>
                            setSelectedClient(
                              client,
                            )
                          }
                          title="Voir le dossier client"
                        >
                          <Eye size={16} />
                        </button>
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
            {filteredClients.length}{" "}
            client
            {filteredClients.length >
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
              <ChevronLeft
                size={16}
              />

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

              <ChevronRight
                size={16}
              />
            </button>
          </div>
        </footer>
      </section>

      {/* =====================================================
          DOSSIER CLIENT
      ====================================================== */}

      {selectedClient && (
        <div
          className={
            styles.modalOverlay
          }
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedClient(null);
            }
          }}
        >
          <section
            className={
              styles.clientModal
            }
            role="dialog"
            aria-modal="true"
          >
            <header
              className={
                styles.modalHeader
              }
            >
              <div
                className={
                  styles.modalIdentity
                }
              >
                <span>
                  {selectedClient.client_type ===
                  "company" ? (
                    <Building2
                      size={24}
                    />
                  ) : (
                    <UserRound
                      size={24}
                    />
                  )}
                </span>

                <div>
                  <small>
                    {selectedClient.client_type ===
                    "company"
                      ? "Dossier entreprise"
                      : "Dossier particulier"}
                  </small>

                  <h2>
                    {getClientDisplayName(
                      selectedClient,
                    )}
                  </h2>

                  {selectedClient.client_type ===
                    "company" && (
                    <p>
                      Personne-ressource :{" "}
                      {getContactName(
                        selectedClient,
                      ) || "Non définie"}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={() =>
                  setSelectedClient(null)
                }
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </header>

            <div
              className={
                styles.modalContent
              }
            >
              <section
                className={
                  styles.clientInfoGrid
                }
              >
                <InfoCard
                  icon={
                    <Phone size={18} />
                  }
                  label="Téléphone"
                  value={
                    selectedClient.phone ||
                    "Non fourni"
                  }
                />

                <InfoCard
                  icon={
                    <Mail size={18} />
                  }
                  label="Courriel"
                  value={
                    selectedClient.email ||
                    "Non fourni"
                  }
                />

                <InfoCard
                  icon={
                    <MapPin size={18} />
                  }
                  label="Adresse"
                  value={
                    getClientAddress(
                      selectedClient,
                    ) ||
                    "Non fournie"
                  }
                />

                <InfoCard
                  icon={
                    <CalendarDays
                      size={18}
                    />
                  }
                  label="Client depuis"
                  value={formatDate(
                    selectedClient.created_at,
                  )}
                />
              </section>

              <section
                className={
                  styles.modalStats
                }
              >
                <MiniStat
                  label="Commandes"
                  value={
                    selectedClient.total_orders
                  }
                  icon={
                    <Truck size={18} />
                  }
                />

                <MiniStat
                  label="En cours"
                  value={
                    selectedClient.active_orders
                  }
                  icon={
                    <Clock3 size={18} />
                  }
                />

                <MiniStat
                  label="Terminées"
                  value={
                    selectedClient.completed_orders
                  }
                  icon={
                    <CheckCircle2
                      size={18}
                    />
                  }
                />

                <MiniStat
                  label="Palettes"
                  value={
                    selectedClient.total_pallets
                  }
                  icon={
                    <Package size={18} />
                  }
                />
              </section>

              <section
                className={
                  styles.financialSummary
                }
              >
                <div>
                  <small>
                    Revenus des commandes
                    terminées
                  </small>

                  <strong>
                    {formatMoney(
                      selectedClient.completed_revenue,
                    )}
                  </strong>
                </div>

                <div>
                  <small>
                    Valeur totale de toutes
                    les commandes
                  </small>

                  <strong>
                    {formatMoney(
                      selectedClient.total_revenue,
                    )}
                  </strong>
                </div>

                <div>
                  <small>
                    Progression des arrêts
                  </small>

                  <strong>
                    {
                      selectedClient.completed_stops
                    }
                    /
                    {
                      selectedClient.total_stops
                    }
                  </strong>
                </div>
              </section>

              {selectedClient.notes && (
                <section
                  className={
                    styles.notesSection
                  }
                >
                  <h3>
                    Notes du client
                  </h3>

                  <p>
                    {selectedClient.notes}
                  </p>
                </section>
              )}

              <section
                className={
                  styles.ordersSection
                }
              >
                <header>
                  <div>
                    <span>
                      Historique
                    </span>

                    <h3>
                      Commandes du client
                    </h3>
                  </div>

                  <strong>
                    {
                      selectedClient.total_orders
                    }{" "}
                    commande
                    {selectedClient.total_orders >
                    1
                      ? "s"
                      : ""}
                  </strong>
                </header>

                {selectedClient.orders
                  .length === 0 ? (
                  <div
                    className={
                      styles.modalEmpty
                    }
                  >
                    <Package
                      size={36}
                    />

                    <h4>
                      Aucune commande
                    </h4>

                    <p>
                      Ce client ne possède
                      encore aucune commande.
                    </p>
                  </div>
                ) : (
                  <div
                    className={
                      styles.ordersList
                    }
                  >
                    {selectedClient.orders.map(
                      (order) => (
                        <article
                          key={order.id}
                          className={
                            styles.orderCard
                          }
                        >
                          <div
                            className={
                              styles.orderCardHeader
                            }
                          >
                            <div>
                              <strong>
                                {order.order_number ||
                                  `CMD-${order.id}`}
                              </strong>

                              <small>
                                {formatDate(
                                  order.pickup_date ||
                                    order.created_at,
                                )}

                                {order.pickup_time
                                  ? ` · ${formatTime(
                                      order.pickup_time,
                                    )}`
                                  : ""}
                              </small>
                            </div>

                            <span
                              className={`${styles.statusBadge} ${getStatusClass(
                                order.status,
                              )}`}
                            >
                              {getStatusLabel(
                                order.status,
                              )}
                            </span>
                          </div>

                          <div
                            className={
                              styles.orderRoute
                            }
                          >
                            <span>
                              <MapPin
                                size={14}
                              />

                              <div>
                                <small>
                                  Ramassage
                                </small>

                                <strong>
                                  {order.pickup_address ||
                                    "Non défini"}
                                </strong>
                              </div>
                            </span>

                            <span>
                              <MapPin
                                size={14}
                              />

                              <div>
                                <small>
                                  Livraison
                                </small>

                                <strong>
                                  {order.delivery_address ||
                                    "Non définie"}
                                </strong>
                              </div>
                            </span>
                          </div>

                          <div
                            className={
                              styles.orderDetails
                            }
                          >
                            <span>
                              <Truck
                                size={14}
                              />

                              {getDriverName(
                                order,
                              )}
                            </span>

                            <span>
                              <Package
                                size={14}
                              />

                              {formatNumber(
                                order.pallets_count,
                              )}{" "}
                              palette
                              {Number(
                                order.pallets_count ||
                                  0,
                              ) > 1
                                ? "s"
                                : ""}
                            </span>

                            <span>
                              Arrêts :{" "}
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

                            <strong>
                              {formatMoney(
                                order.total_amount,
                              )}
                            </strong>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

/* ============================================================
   COMPOSANTS
============================================================ */

function StatCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;

  variant:
    | "total"
    | "company"
    | "individual"
    | "active"
    | "pallets";
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

function InfoCard({
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
      className={styles.infoCard}
    >
      <span>{icon}</span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function MiniStat({
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
      className={styles.miniStat}
    >
      <span>{icon}</span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
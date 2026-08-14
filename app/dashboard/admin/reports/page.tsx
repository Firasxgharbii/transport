"use client";

import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  Download,
  Package,
  RefreshCw,
  Route,
  TrendingUp,
  Truck,
  Users,
  X,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import styles from "./reports.module.css";

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

type Order = {
  id: number;
  order_number?: string;

  client_id?: number;
  driver_id?: number | null;

  company_name?: string | null;
  client_first_name?: string;
  client_last_name?: string;

  driver_first_name?: string | null;
  driver_last_name?: string | null;

  pickup_address?: string;
  delivery_address?: string;

  pickup_date?: string | null;
  delivery_date?: string | null;

  status?: OrderStatus;

  total_amount?: number | string;
  estimated_distance?: number | string | null;
  estimated_duration?: number | null;

  stop_count?: number;
  completed_stops?: number;

  created_at?: string;
};

type Driver = {
  id: number;
  first_name?: string;
  last_name?: string;
  availability_status?: string;

  total_orders?: number;
  completed_orders?: number;
  current_orders?: number;
};

type Client = {
  id: number;
  first_name?: string;
  last_name?: string;
  company_name?: string | null;
  created_at?: string;
};

type OrdersResponse = {
  success?: boolean;
  data?: Order[];
  orders?: Order[];
};

type DriversResponse = {
  success?: boolean;
  data?: Driver[];
  drivers?: Driver[];
};

type ClientsResponse = {
  success?: boolean;
  data?: Client[];
  clients?: Client[];
};

type DateFilter =
  | "all"
  | "today"
  | "week"
  | "month"
  | "year";

/* ============================================================
   CONFIGURATION
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://192.168.2.22:5000";

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

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    "fr-CA",
    {
      style: "currency",
      currency: "CAD",
    },
  ).format(value);
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "fr-CA",
  ).format(value);
}

function getDateValue(
  order: Order,
) {
  const value =
    order.pickup_date ||
    order.created_at;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date;
}

function isSameDay(
  firstDate: Date,
  secondDate: Date,
) {
  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  );
}

function isDateInFilter(
  date: Date,
  filter: DateFilter,
) {
  if (filter === "all") {
    return true;
  }

  const now = new Date();

  if (filter === "today") {
    return isSameDay(date, now);
  }

  if (filter === "week") {
    const weekStart =
      new Date(now);

    weekStart.setHours(0, 0, 0, 0);

    weekStart.setDate(
      now.getDate() -
        now.getDay(),
    );

    return date >= weekStart;
  }

  if (filter === "month") {
    return (
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() ===
        now.getMonth()
    );
  }

  return (
    date.getFullYear() ===
    now.getFullYear()
  );
}

function getClientName(
  order: Order,
) {
  if (order.company_name) {
    return order.company_name;
  }

  return (
    [
      order.client_first_name,
      order.client_last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    `Client #${order.client_id || "—"}`
  );
}

function getDriverName(
  order: Order,
) {
  return (
    [
      order.driver_first_name,
      order.driver_last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Non assigné"
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

/* ============================================================
   PAGE
============================================================ */

export default function ReportsPage() {
  const router = useRouter();

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [drivers, setDrivers] =
    useState<Driver[]>([]);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    dateFilter,
    setDateFilter,
  ] =
    useState<DateFilter>("month");

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

        const response =
          await fetch(
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
     CHARGEMENT
  ============================================================ */

  const loadReports =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const [
          ordersResult,
          driversResult,
          clientsResult,
        ] =
          await Promise.allSettled([
            authenticatedFetch<OrdersResponse>(
              "/api/orders",
            ),

            authenticatedFetch<DriversResponse>(
              "/api/drivers",
            ),

            authenticatedFetch<ClientsResponse>(
              "/api/clients",
            ),
          ]);

        if (
          ordersResult.status ===
          "rejected"
        ) {
          throw ordersResult.reason;
        }

        const receivedOrders =
          Array.isArray(
            ordersResult.value.data,
          )
            ? ordersResult.value.data
            : Array.isArray(
                  ordersResult.value
                    .orders,
                )
              ? ordersResult.value
                  .orders
              : [];

        setOrders(receivedOrders);

        if (
          driversResult.status ===
          "fulfilled"
        ) {
          const receivedDrivers =
            Array.isArray(
              driversResult.value.data,
            )
              ? driversResult.value.data
              : Array.isArray(
                    driversResult.value
                      .drivers,
                  )
                ? driversResult.value
                    .drivers
                : [];

          setDrivers(
            receivedDrivers,
          );
        }

        if (
          clientsResult.status ===
          "fulfilled"
        ) {
          const receivedClients =
            Array.isArray(
              clientsResult.value.data,
            )
              ? clientsResult.value.data
              : Array.isArray(
                    clientsResult.value
                      .clients,
                  )
                ? clientsResult.value
                    .clients
                : [];

          setClients(
            receivedClients,
          );
        }
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger les rapports.",
        );
      } finally {
        setLoading(false);
      }
    }, [authenticatedFetch]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  /* ============================================================
     COMMANDES FILTRÉES
  ============================================================ */

  const filteredOrders =
    useMemo(
      () =>
        orders.filter((order) => {
          const date =
            getDateValue(order);

          if (!date) {
            return (
              dateFilter === "all"
            );
          }

          return isDateInFilter(
            date,
            dateFilter,
          );
        }),
      [orders, dateFilter],
    );

  /* ============================================================
     STATISTIQUES
  ============================================================ */

  const completedOrders =
    useMemo(
      () =>
        filteredOrders.filter(
          (order) =>
            order.status ===
            "completed",
        ),
      [filteredOrders],
    );

  const activeOrders =
    useMemo(
      () =>
        filteredOrders.filter(
          (order) =>
            [
              "assigned",
              "pickup_in_progress",
              "picked_up",
              "delivery_in_progress",
              "arrived",
            ].includes(
              order.status || "",
            ),
        ),
      [filteredOrders],
    );

  const cancelledOrders =
    useMemo(
      () =>
        filteredOrders.filter(
          (order) =>
            [
              "cancelled",
              "incident",
            ].includes(
              order.status || "",
            ),
        ),
      [filteredOrders],
    );

  const totalRevenue =
    useMemo(
      () =>
        completedOrders.reduce(
          (total, order) =>
            total +
            Number(
              order.total_amount || 0,
            ),
          0,
        ),
      [completedOrders],
    );

  const totalDistance =
    useMemo(
      () =>
        filteredOrders.reduce(
          (total, order) =>
            total +
            Number(
              order.estimated_distance ||
                0,
            ),
          0,
        ),
      [filteredOrders],
    );

  const totalStops =
    useMemo(
      () =>
        filteredOrders.reduce(
          (total, order) =>
            total +
            Number(
              order.stop_count || 0,
            ),
          0,
        ),
      [filteredOrders],
    );

  const completedStops =
    useMemo(
      () =>
        filteredOrders.reduce(
          (total, order) =>
            total +
            Number(
              order.completed_stops ||
                0,
            ),
          0,
        ),
      [filteredOrders],
    );

  const completionRate =
    filteredOrders.length > 0
      ? Math.round(
          (completedOrders.length /
            filteredOrders.length) *
            100,
        )
      : 0;

  /* ============================================================
     RÉPARTITION PAR STATUT
  ============================================================ */

  const statusDistribution =
    useMemo(() => {
      const statusList: {
        key: OrderStatus;
        label: string;
      }[] = [
        {
          key: "pending",
          label: "En attente",
        },
        {
          key: "assigned",
          label: "Assignées",
        },
        {
          key: "pickup_in_progress",
          label: "Ramassage",
        },
        {
          key: "delivery_in_progress",
          label: "En livraison",
        },
        {
          key: "completed",
          label: "Terminées",
        },
        {
          key: "cancelled",
          label: "Annulées",
        },
        {
          key: "incident",
          label: "Incidents",
        },
      ];

      return statusList.map(
        (statusItem) => {
          const count =
            filteredOrders.filter(
              (order) =>
                order.status ===
                statusItem.key,
            ).length;

          const percentage =
            filteredOrders.length >
            0
              ? Math.round(
                  (count /
                    filteredOrders.length) *
                    100,
                )
              : 0;

          return {
            ...statusItem,
            count,
            percentage,
          };
        },
      );
    }, [filteredOrders]);

  /* ============================================================
     PERFORMANCE CHAUFFEURS
  ============================================================ */

  const driverPerformance =
    useMemo(() => {
      const performanceMap =
        new Map<
          string,
          {
            name: string;
            total: number;
            completed: number;
            revenue: number;
          }
        >();

      for (const order of filteredOrders) {
        const name =
          getDriverName(order);

        if (
          name === "Non assigné"
        ) {
          continue;
        }

        const current =
          performanceMap.get(name) || {
            name,
            total: 0,
            completed: 0,
            revenue: 0,
          };

        current.total += 1;

        if (
          order.status ===
          "completed"
        ) {
          current.completed += 1;

          current.revenue += Number(
            order.total_amount || 0,
          );
        }

        performanceMap.set(
          name,
          current,
        );
      }

      return Array.from(
        performanceMap.values(),
      )
        .sort(
          (firstDriver, secondDriver) =>
            secondDriver.completed -
            firstDriver.completed,
        )
        .slice(0, 6);
    }, [filteredOrders]);

  /* ============================================================
     EXPORT CSV
  ============================================================ */

  const exportCsv = () => {
    const headers = [
      "Commande",
      "Client",
      "Chauffeur",
      "Statut",
      "Ramassage",
      "Livraison",
      "Montant",
      "Distance",
    ];

    const rows =
      filteredOrders.map(
        (order) => [
          order.order_number ||
            `CMD-${order.id}`,

          getClientName(order),

          getDriverName(order),

          getStatusLabel(
            order.status,
          ),

          order.pickup_address ||
            "",

          order.delivery_address ||
            "",

          String(
            order.total_amount || 0,
          ),

          String(
            order.estimated_distance ||
              0,
          ),
        ],
      );

    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${String(
                cell,
              ).replaceAll(
                '"',
                '""',
              )}"`,
          )
          .join(","),
      )
      .join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type:
          "text/csv;charset=utf-8;",
      },
    );

    const downloadUrl =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = downloadUrl;

    link.download =
      `glory-solutions-rapport-${dateFilter}.csv`;

    link.click();

    URL.revokeObjectURL(
      downloadUrl,
    );
  };

  return (
    <main className={styles.page}>
      <section
        className={styles.heading}
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            <BarChart3 size={16} />
            Analyse des opérations
          </span>

          <h1>Rapports</h1>

          <p>
            Consultez les revenus,
            les commandes, les
            performances et l’activité
            de la plateforme.
          </p>
        </div>

        <div
          className={
            styles.headingActions
          }
        >
          <select
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(
                event.target
                  .value as DateFilter,
              )
            }
          >
            <option value="all">
              Toutes les périodes
            </option>

            <option value="today">
              Aujourd’hui
            </option>

            <option value="week">
              Cette semaine
            </option>

            <option value="month">
              Ce mois
            </option>

            <option value="year">
              Cette année
            </option>
          </select>

          <button
            type="button"
            className={
              styles.refreshButton
            }
            onClick={() =>
              void loadReports()
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

          <button
            type="button"
            className={
              styles.exportButton
            }
            onClick={exportCsv}
          >
            <Download size={17} />
            Exporter CSV
          </button>
        </div>
      </section>

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
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section
        className={
          styles.statsGrid
        }
      >
        <ReportCard
          label="Commandes"
          value={formatNumber(
            filteredOrders.length,
          )}
          helper={`${activeOrders.length} en cours`}
          icon={<Package size={20} />}
          variant="purple"
        />

        <ReportCard
          label="Revenus"
          value={formatMoney(
            totalRevenue,
          )}
          helper="Commandes terminées"
          icon={
            <DollarSign size={20} />
          }
          variant="green"
        />

        <ReportCard
          label="Livraisons terminées"
          value={formatNumber(
            completedOrders.length,
          )}
          helper={`${completionRate}% de réussite`}
          icon={
            <CheckCircle2
              size={20}
            />
          }
          variant="blue"
        />

        <ReportCard
          label="Annulées / incidents"
          value={formatNumber(
            cancelledOrders.length,
          )}
          helper="À surveiller"
          icon={<XCircle size={20} />}
          variant="red"
        />

        <ReportCard
          label="Distance estimée"
          value={`${formatNumber(
            Math.round(totalDistance),
          )} km`}
          helper="Toutes les commandes"
          icon={<Route size={20} />}
          variant="orange"
        />

        <ReportCard
          label="Arrêts terminés"
          value={`${completedStops}/${totalStops}`}
          helper="Progression globale"
          icon={<Truck size={20} />}
          variant="pink"
        />
      </section>

      <section
        className={
          styles.mainGrid
        }
      >
        <article
          className={styles.panel}
        >
          <header
            className={
              styles.panelHeader
            }
          >
            <div>
              <span
                className={
                  styles.panelEyebrow
                }
              >
                Activité
              </span>

              <h2>
                Répartition des
                commandes
              </h2>
            </div>

            <span
              className={
                styles.panelBadge
              }
            >
              {
                filteredOrders.length
              }{" "}
              commandes
            </span>
          </header>

          <div
            className={
              styles.distributionList
            }
          >
            {statusDistribution.map(
              (statusItem) => (
                <div
                  key={
                    statusItem.key
                  }
                  className={
                    styles.distributionItem
                  }
                >
                  <div
                    className={
                      styles.distributionHeader
                    }
                  >
                    <span>
                      {
                        statusItem.label
                      }
                    </span>

                    <strong>
                      {
                        statusItem.count
                      }
                    </strong>
                  </div>

                  <div
                    className={
                      styles.progressTrack
                    }
                  >
                    <span
                      style={{
                        width:
                          `${statusItem.percentage}%`,
                      }}
                    />
                  </div>

                  <small>
                    {
                      statusItem.percentage
                    }
                    %
                  </small>
                </div>
              ),
            )}
          </div>
        </article>

        <article
          className={styles.panel}
        >
          <header
            className={
              styles.panelHeader
            }
          >
            <div>
              <span
                className={
                  styles.panelEyebrow
                }
              >
                Ressources
              </span>

              <h2>
                Vue générale
              </h2>
            </div>
          </header>

          <div
            className={
              styles.resourceGrid
            }
          >
            <ResourceCard
              label="Chauffeurs"
              value={drivers.length}
              icon={
                <Truck size={20} />
              }
            />

            <ResourceCard
              label="Chauffeurs disponibles"
              value={
                drivers.filter(
                  (driver) =>
                    driver.availability_status ===
                    "available",
                ).length
              }
              icon={
                <CheckCircle2
                  size={20}
                />
              }
            />

            <ResourceCard
              label="Clients"
              value={clients.length}
              icon={
                <Users size={20} />
              }
            />

            <ResourceCard
              label="Commandes actives"
              value={
                activeOrders.length
              }
              icon={
                <Clock3 size={20} />
              }
            />
          </div>
        </article>
      </section>

      <section
        className={
          styles.lowerGrid
        }
      >
        <article
          className={styles.panel}
        >
          <header
            className={
              styles.panelHeader
            }
          >
            <div>
              <span
                className={
                  styles.panelEyebrow
                }
              >
                Chauffeurs
              </span>

              <h2>
                Performance des
                chauffeurs
              </h2>
            </div>
          </header>

          {driverPerformance.length ===
          0 ? (
            <div
              className={
                styles.emptyState
              }
            >
              <Truck size={36} />

              <h3>
                Aucune donnée
                disponible
              </h3>

              <p>
                Les performances
                apparaîtront après
                l’assignation de
                commandes.
              </p>
            </div>
          ) : (
            <div
              className={
                styles.driverTable
              }
            >
              <div
                className={
                  styles.driverTableHeader
                }
              >
                <span>Chauffeur</span>
                <span>Commandes</span>
                <span>Terminées</span>
                <span>Taux</span>
                <span>Revenus</span>
              </div>

              {driverPerformance.map(
                (driver) => {
                  const rate =
                    driver.total > 0
                      ? Math.round(
                          (driver.completed /
                            driver.total) *
                            100,
                        )
                      : 0;

                  return (
                    <div
                      key={
                        driver.name
                      }
                      className={
                        styles.driverRow
                      }
                    >
                      <strong>
                        {driver.name}
                      </strong>

                      <span>
                        {driver.total}
                      </span>

                      <span>
                        {
                          driver.completed
                        }
                      </span>

                      <span>
                        {rate}%
                      </span>

                      <span>
                        {formatMoney(
                          driver.revenue,
                        )}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </article>

        <article
          className={styles.panel}
        >
          <header
            className={
              styles.panelHeader
            }
          >
            <div>
              <span
                className={
                  styles.panelEyebrow
                }
              >
                Indicateurs
              </span>

              <h2>
                Résumé opérationnel
              </h2>
            </div>
          </header>

          <div
            className={
              styles.kpiList
            }
          >
            <KpiRow
              icon={
                <TrendingUp
                  size={18}
                />
              }
              label="Taux de réussite"
              value={`${completionRate}%`}
            />

            <KpiRow
              icon={
                <DollarSign
                  size={18}
                />
              }
              label="Valeur moyenne"
              value={
                completedOrders.length >
                0
                  ? formatMoney(
                      totalRevenue /
                        completedOrders.length,
                    )
                  : formatMoney(0)
              }
            />

            <KpiRow
              icon={
                <Route size={18} />
              }
              label="Distance moyenne"
              value={
                filteredOrders.length >
                0
                  ? `${Math.round(
                      totalDistance /
                        filteredOrders.length,
                    )} km`
                  : "0 km"
              }
            />

            <KpiRow
              icon={
                <CalendarDays
                  size={18}
                />
              }
              label="Période sélectionnée"
              value={
                dateFilter === "today"
                  ? "Aujourd’hui"
                  : dateFilter ===
                      "week"
                    ? "Cette semaine"
                    : dateFilter ===
                        "month"
                      ? "Ce mois"
                      : dateFilter ===
                          "year"
                        ? "Cette année"
                        : "Toutes"
              }
            />
          </div>
        </article>
      </section>
    </main>
  );
}

/* ============================================================
   COMPOSANTS
============================================================ */

function ReportCard({
  label,
  value,
  helper,
  icon,
  variant,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  variant:
    | "purple"
    | "green"
    | "blue"
    | "red"
    | "orange"
    | "pink";
}) {
  return (
    <article
      className={styles.reportCard}
    >
      <span
        className={
          styles[
            `icon_${variant}`
          ]
        }
      >
        {icon}
      </span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{helper}</p>
      </div>
    </article>
  );
}

function ResourceCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={
        styles.resourceCard
      }
    >
      <span>{icon}</span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function KpiRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.kpiRow}>
      <span>{icon}</span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
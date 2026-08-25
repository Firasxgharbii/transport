"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";

import styles from "./orders.module.css";

/* ============================================================
   TYPES
============================================================ */

type Driver = {
  id: number;
  user_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  availability_status?: string;
};

type DriverOrder = {
  id: number;
  order_number?: string;

  client_id?: number;
  driver_id?: number;
  vehicle_id?: number | null;

  pickup_address?: string;
  delivery_address?: string;

  pickup_date?: string | null;
  pickup_time?: string | null;

  delivery_date?: string | null;
  delivery_time?: string | null;

  status?: string;
  priority?: string;

  total_amount?: number | string;

  client_first_name?: string;
  client_last_name?: string;
  company_name?: string;

  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_plate?: string;

  created_at?: string;
  updated_at?: string;
};

/* ============================================================
   API
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* ============================================================
   HELPERS
============================================================ */

function getStatusLabel(status?: string) {
  switch (status) {
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
      return "Terminée";

    case "cancelled":
      return "Annulée";

    case "incident":
      return "Incident";

    default:
      return status || "En attente";
  }
}

function getPriorityLabel(priority?: string) {
  switch (priority) {
    case "low":
      return "Faible";

    case "normal":
      return "Normale";

    case "high":
      return "Élevée";

    case "urgent":
      return "Urgente";

    default:
      return "Normale";
  }
}

function getClientName(order: DriverOrder) {
  if (order.company_name) {
    return order.company_name;
  }

  const fullName = [
    order.client_first_name,
    order.client_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return fullName || "Client";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Date non définie";
  }

  const date = new Date(
    `${value}T12:00:00`,
  );

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

  return value.slice(
    0,
    5,
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function DriverOrdersPage() {
  const router = useRouter();

  const [
    driver,
    setDriver,
  ] = useState<Driver | null>(
    null,
  );

  const [
    orders,
    setOrders,
  ] = useState<
    DriverOrder[]
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
  ] = useState("active");

  /* ==========================================================
     CHARGER LE CHAUFFEUR + COMMANDES
  ========================================================== */

  const loadData =
    useCallback(async () => {
      const token =
        localStorage.getItem(
          "glory_token",
        );

      if (!token) {
        router.replace(
          "/login",
        );

        return;
      }

      try {
        setError("");

        /* ------------------------------------------------------
           PROFIL CHAUFFEUR
        ------------------------------------------------------ */

        const driverResponse =
          await fetch(
            `${API_URL}/api/drivers/me`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              cache:
                "no-store",
            },
          );

        const driverResult =
          await driverResponse.json();

        if (
          !driverResponse.ok
        ) {
          if (
            driverResponse.status ===
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

            return;
          }

          throw new Error(
            driverResult.message ||
              "Impossible de récupérer le profil chauffeur.",
          );
        }

        const currentDriver:
          Driver | null =
          driverResult.driver ||
          driverResult.data ||
          null;

        if (
          !currentDriver?.id
        ) {
          throw new Error(
            "Profil chauffeur invalide.",
          );
        }

        setDriver(
          currentDriver,
        );

        /* ------------------------------------------------------
           COMMANDES
        ------------------------------------------------------ */

        const ordersResponse =
          await fetch(
            `${API_URL}/api/drivers/${currentDriver.id}/orders`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              cache:
                "no-store",
            },
          );

        const ordersResult =
          await ordersResponse.json();

        if (
          !ordersResponse.ok
        ) {
          throw new Error(
            ordersResult.message ||
              "Impossible de récupérer les commandes.",
          );
        }

        const receivedOrders =
          Array.isArray(
            ordersResult.orders,
          )
            ? ordersResult.orders
            : Array.isArray(
                  ordersResult.data,
                )
              ? ordersResult.data
              : [];

        setOrders(
          receivedOrders,
        );
      } catch (err) {
        console.error(
          "Erreur DriverOrdersPage :",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ==========================================================
     FILTRAGE
  ========================================================== */

  const filteredOrders =
    useMemo(() => {
      let result = [
        ...orders,
      ];

      if (
        filter ===
        "active"
      ) {
        result =
          result.filter(
            (order) =>
              ![
                "completed",
                "cancelled",
              ].includes(
                order.status ||
                  "",
              ),
          );
      }

      if (
        filter ===
        "completed"
      ) {
        result =
          result.filter(
            (order) =>
              order.status ===
              "completed",
          );
      }

      if (
        filter ===
        "cancelled"
      ) {
        result =
          result.filter(
            (order) =>
              order.status ===
              "cancelled",
          );
      }

      const term =
        search
          .trim()
          .toLowerCase();

      if (term) {
        result =
          result.filter(
            (order) => {
              const content = [
                order.order_number,
                getClientName(
                  order,
                ),
                order.pickup_address,
                order.delivery_address,
                order.vehicle_make,
                order.vehicle_model,
                order.vehicle_plate,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              return content.includes(
                term,
              );
            },
          );
      }

      return result;
    }, [
      orders,
      search,
      filter,
    ]);

  /* ==========================================================
     STATS
  ========================================================== */

  const activeCount =
    orders.filter(
      (order) =>
        ![
          "completed",
          "cancelled",
        ].includes(
          order.status || "",
        ),
    ).length;

  const completedCount =
    orders.filter(
      (order) =>
        order.status ===
        "completed",
    ).length;

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
            styles.spinner
          }
        />

        <p>
          Chargement des
          livraisons...
        </p>
      </main>
    );
  }

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <main
      className={styles.page}
    >
      {/* HEADER */}

      <header
        className={
          styles.header
        }
      >
        <button
          type="button"
          className={
            styles.backButton
          }
          onClick={() =>
            router.push(
              "/dashboard/driver",
            )
          }
          aria-label="Retour"
        >
          <ArrowLeft
            size={20}
          />
        </button>

        <div
          className={
            styles.headerContent
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
            Mes livraisons
          </h1>

          <p>
            Bonjour{" "}
            {driver?.first_name ||
              "chauffeur"}
            , consultez vos
            commandes assignées.
          </p>
        </div>

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

            loadData();
          }}
          aria-label="Actualiser"
        >
          <RefreshCw
            size={19}
            className={
              refreshing
                ? styles.rotating
                : ""
            }
          />
        </button>
      </header>

      {/* STATS */}

      <section
        className={styles.stats}
      >
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
            <PackageCheck
              size={20}
            />
          </div>

          <div>
            <span>
              Total
            </span>

            <strong>
              {
                orders.length
              }
            </strong>
          </div>
        </article>

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
            <Truck
              size={20}
            />
          </div>

          <div>
            <span>
              Actives
            </span>

            <strong>
              {
                activeCount
              }
            </strong>
          </div>
        </article>

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
            <CalendarDays
              size={20}
            />
          </div>

          <div>
            <span>
              Terminées
            </span>

            <strong>
              {
                completedCount
              }
            </strong>
          </div>
        </article>
      </section>

      {/* SEARCH */}

      <section
        className={
          styles.toolbar
        }
      >
        <div
          className={
            styles.searchBox
          }
        >
          <Search
            size={18}
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
            placeholder="Rechercher une commande..."
          />
        </div>

        <div
          className={
            styles.filters
          }
        >
          <button
            type="button"
            className={
              filter ===
              "active"
                ? styles.filterActive
                : styles.filterButton
            }
            onClick={() =>
              setFilter(
                "active",
              )
            }
          >
            Actives
          </button>

          <button
            type="button"
            className={
              filter ===
              "all"
                ? styles.filterActive
                : styles.filterButton
            }
            onClick={() =>
              setFilter("all")
            }
          >
            Toutes
          </button>

          <button
            type="button"
            className={
              filter ===
              "completed"
                ? styles.filterActive
                : styles.filterButton
            }
            onClick={() =>
              setFilter(
                "completed",
              )
            }
          >
            Terminées
          </button>
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <div
          className={
            styles.error
          }
        >
          {error}
        </div>
      )}

      {/* LIST */}

      <section
        className={
          styles.orderList
        }
      >
        {filteredOrders.length ===
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
                size={32}
              />
            </div>

            <h2>
              Aucune livraison
            </h2>

            <p>
              Aucune commande
              correspondant à votre
              recherche n'est
              disponible.
            </p>
          </div>
        ) : (
          filteredOrders.map(
            (order) => (
              <article
                key={
                  order.id
                }
                className={
                  styles.orderCard
                }
                onClick={() =>
                  router.push(
                    `/dashboard/driver/orders/${order.id}`,
                  )
                }
              >
                {/* TOP */}

                <div
                  className={
                    styles.orderTop
                  }
                >
                  <div>
                    <span
                      className={
                        styles.orderNumber
                      }
                    >
                      {order.order_number ||
                        `Commande #${order.id}`}
                    </span>

                    <h2>
                      {getClientName(
                        order,
                      )}
                    </h2>
                  </div>

                  <span
                    className={`${styles.status} ${styles[`status_${order.status || "pending"}`] || ""}`}
                  >
                    {getStatusLabel(
                      order.status,
                    )}
                  </span>
                </div>

                {/* ROUTE */}

                <div
                  className={
                    styles.route
                  }
                >
                  <div
                    className={
                      styles.routeItem
                    }
                  >
                    <span
                      className={
                        styles.pickupDot
                      }
                    />

                    <div>
                      <small>
                        RAMASSAGE
                      </small>

                      <strong>
                        {order.pickup_address ||
                          "Adresse non disponible"}
                      </strong>
                    </div>
                  </div>

                  <div
                    className={
                      styles.routeLine
                    }
                  />

                  <div
                    className={
                      styles.routeItem
                    }
                  >
                    <MapPin
                      size={18}
                    />

                    <div>
                      <small>
                        LIVRAISON
                      </small>

                      <strong>
                        {order.delivery_address ||
                          "Adresse non disponible"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* INFO */}

                <div
                  className={
                    styles.orderInfo
                  }
                >
                  <div>
                    <CalendarDays
                      size={16}
                    />

                    <span>
                      {formatDate(
                        order.pickup_date,
                      )}
                    </span>
                  </div>

                  <div>
                    <Clock3
                      size={16}
                    />

                    <span>
                      {formatTime(
                        order.pickup_time,
                      )}
                    </span>
                  </div>

                  <div>
                    <Truck
                      size={16}
                    />

                    <span>
                      {[
                        order.vehicle_make,
                        order.vehicle_model,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                        "Véhicule non défini"}
                    </span>
                  </div>
                </div>

                {/* FOOTER */}

                <div
                  className={
                    styles.orderFooter
                  }
                >
                  <div>
                    <span>
                      Priorité
                    </span>

                    <strong>
                      {getPriorityLabel(
                        order.priority,
                      )}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.detailsButton
                    }
                    onClick={(
                      event,
                    ) => {
                      event.stopPropagation();

                      router.push(
                        `/dashboard/driver/orders/${order.id}`,
                      );
                    }}
                  >
                    Voir la livraison

                    <ChevronRight
                      size={17}
                    />
                  </button>
                </div>
              </article>
            ),
          )
        )}
      </section>

      <div
        className={
          styles.bottomSpace
        }
      />
    </main>
  );
}
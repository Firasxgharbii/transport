"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Route,
  ShieldCheck,
  Truck,
  UserRound,
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

import styles from "./driver-details.module.css";

/* ============================================================
   CONFIG
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* ============================================================
   TYPES
============================================================ */

type DriverAvailability =
  | "available"
  | "busy"
  | "on_break"
  | "offline";

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

  vehicle_id?: number | null;
  vehicle_name?: string | null;
  vehicle_plate?: string | null;

  current_orders?: number;
  completed_orders?: number;
  total_orders?: number;

  remaining_stops?: number;

  last_seen_at?: string | null;
  created_at?: string | null;
};

type Order = {
  id: number;

  order_number?: string;
  reference?: string;

  status?: string;

  pickup_address?: string;
  delivery_address?: string;

  pickup_date?: string | null;
  delivery_date?: string | null;

  client_name?: string;
  company_name?: string | null;
};

type DriverResponse = {
  success?: boolean;
  driver?: Driver;
  data?: Driver;
  message?: string;
};

type OrdersResponse = {
  success?: boolean;
  orders?: Order[];
  data?: Order[];
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

function driverName(
  driver: Driver,
) {
  const name = [
    driver.first_name,
    driver.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    name ||
    `Chauffeur #${driver.id}`
  );
}

function initials(
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

function availabilityLabel(
  value?: string,
) {
  switch (value) {
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

function orderStatusLabel(
  value?: string,
) {
  switch (value) {
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

    case "incident":
      return "Incident";

    case "cancelled":
      return "Annulée";

    default:
      return (
        value ||
        "Non défini"
      );
  }
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Non disponible";
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

function simpleDate(
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
    },
  ).format(date);
}

function fullAddress(
  driver: Driver,
) {
  return [
    driver.address,
    driver.city,
    driver.province,
    driver.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

/* ============================================================
   PAGE
============================================================ */

export default function AdminDriverDetailsPage() {
  const router =
    useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const driverId =
    Number(params.id);

  const [
    driver,
    setDriver,
  ] = useState<Driver | null>(
    null,
  );

  const [
    orders,
    setOrders,
  ] = useState<Order[]>([]);

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

  /* ==========================================================
     AUTH FETCH
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
              "Une erreur est survenue.",
          );
        }

        return result as T;
      },
      [router],
    );

  /* ==========================================================
     LOAD DRIVER
  ========================================================== */

  const loadDriver =
    useCallback(async () => {
      if (
        !Number.isInteger(
          driverId,
        ) ||
        driverId <= 0
      ) {
        setError(
          "Identifiant du chauffeur invalide.",
        );

        setLoading(false);
        setRefreshing(false);

        return;
      }

      try {
        setError("");

        const driverResult =
          await authenticatedFetch<DriverResponse>(
            `/api/drivers/${driverId}`,
          );

        const receivedDriver =
          driverResult.driver ||
          driverResult.data ||
          null;

        if (!receivedDriver) {
          throw new Error(
            "Chauffeur introuvable.",
          );
        }

        setDriver(
          receivedDriver,
        );

        try {
          const orderResult =
            await authenticatedFetch<OrdersResponse>(
              `/api/orders/driver/${driverId}`,
            );

          const receivedOrders =
            Array.isArray(
              orderResult.orders,
            )
              ? orderResult.orders
              : Array.isArray(
                    orderResult.data,
                  )
                ? orderResult.data
                : [];

          setOrders(
            receivedOrders,
          );
        } catch (
          orderError
        ) {
          console.warn(
            "Commandes du chauffeur non disponibles :",
            orderError,
          );

          setOrders([]);
        }
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger le chauffeur.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [
      authenticatedFetch,
      driverId,
    ]);

  useEffect(() => {
    void loadDriver();
  }, [loadDriver]);

  /* ==========================================================
     STATS
  ========================================================== */

  const completedOrders =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            order.status ===
            "completed",
        ).length,
      [orders],
    );

  const activeOrders =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            ![
              "completed",
              "cancelled",
            ].includes(
              order.status || "",
            ),
        ).length,
      [orders],
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
              styles.spin
            }
          />
        </div>

        <h1>
          Chargement du chauffeur
        </h1>

        <p>
          Préparation de la fiche chauffeur...
        </p>
      </main>
    );
  }

  /* ==========================================================
     NOT FOUND
  ========================================================== */

  if (!driver) {
    return (
      <main
        className={
          styles.page
        }
      >
        <div
          className={
            styles.errorState
          }
        >
          <div
            className={
              styles.errorIcon
            }
          >
            <AlertTriangle
              size={28}
            />
          </div>

          <h1>
            Chauffeur introuvable
          </h1>

          <p>
            {error ||
              "Impossible de retrouver ce chauffeur."}
          </p>

          <Link
            href="/dashboard/admin/drivers"
            className={
              styles.primaryBackButton
            }
          >
            <ArrowLeft
              size={17}
            />

            Retour aux chauffeurs
          </Link>
        </div>
      </main>
    );
  }

  const address =
    fullAddress(driver);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main
      className={
        styles.page
      }
    >
      {/* ======================================================
          TOP ACTIONS
      ====================================================== */}

      <div
        className={
          styles.topBar
        }
      >
        <Link
          href="/dashboard/admin/drivers"
          className={
            styles.backButton
          }
        >
          <ArrowLeft
            size={17}
          />

          <span>
            Retour aux chauffeurs
          </span>
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
            void loadDriver();
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

          <span>
            {refreshing
              ? "Actualisation..."
              : "Actualiser"}
          </span>
        </button>
      </div>

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
          PROFILE HERO
      ====================================================== */}

      <section
        className={
          styles.profileHero
        }
      >
        <div
          className={
            styles.profileMain
          }
        >
          <div
            className={
              styles.avatar
            }
          >
            {driver.profile_photo_url ? (
              <img
                src={
                  driver.profile_photo_url
                }
                alt={
                  driverName(driver)
                }
              />
            ) : (
              initials(driver)
            )}
          </div>

          <div
            className={
              styles.profileContent
            }
          >
            <div
              className={
                styles.profileLabel
              }
            >
              <ShieldCheck
                size={14}
              />

              PROFIL CHAUFFEUR
            </div>

            <h1>
              {driverName(
                driver,
              )}
            </h1>

            <p
              className={
                styles.profileMeta
              }
            >
              Chauffeur Glory Solutions
              <span />
              ID #{driver.id}
            </p>

            <div
              className={
                styles.badges
              }
            >
              <span
                className={`${styles.statusBadge} ${
                  driver.availability_status ===
                  "available"
                    ? styles.available
                    : driver.availability_status ===
                        "busy"
                      ? styles.busy
                      : driver.availability_status ===
                          "on_break"
                        ? styles.breakStatus
                        : styles.offline
                }`}
              >
                <span
                  className={
                    styles.statusDot
                  }
                />

                {availabilityLabel(
                  driver.availability_status,
                )}
              </span>

              <span
                className={
                  styles.accountBadge
                }
              >
                <CheckCircle2
                  size={13}
                />

                Compte{" "}
                {driver.status ||
                  "actif"}
              </span>
            </div>
          </div>
        </div>

        <div
          className={
            styles.heroActions
          }
        >
          {driver.phone && (
            <a
              href={`tel:${driver.phone}`}
              className={
                styles.secondaryAction
              }
            >
              <Phone
                size={17}
              />

              Appeler
            </a>
          )}

          <Link
            href="/dashboard/admin/drivers/live-map"
            className={
              styles.mapButton
            }
          >
            <Navigation
              size={17}
            />

            Voir sur la carte
          </Link>
        </div>
      </section>

      {/* ======================================================
          STATS
      ====================================================== */}

      <section
        className={
          styles.statsGrid
        }
      >
        <StatCard
          label="Commandes"
          value={orders.length}
          description="Total assigné"
          icon={
            <Truck size={20} />
          }
        />

        <StatCard
          label="Actives"
          value={activeOrders}
          description="En opération"
          icon={
            <Clock3 size={20} />
          }
        />

        <StatCard
          label="Terminées"
          value={completedOrders}
          description="Livraisons complétées"
          icon={
            <CheckCircle2
              size={20}
            />
          }
        />

        <StatCard
          label="Arrêts restants"
          value={
            driver.remaining_stops ||
            0
          }
          description="À effectuer"
          icon={
            <Route size={20} />
          }
        />
      </section>

      {/* ======================================================
          TWO COLUMN CONTENT
      ====================================================== */}

      <section
        className={
          styles.contentGrid
        }
      >
        {/* LEFT */}

        <div
          className={
            styles.mainColumn
          }
        >
          {/* PERSONAL */}

          <section
            className={
              styles.panel
            }
          >
            <PanelHeader
              eyebrow="Profil"
              title="Informations personnelles"
              description="Coordonnées et informations principales du chauffeur."
              icon={
                <UserRound
                  size={20}
                />
              }
            />

            <div
              className={
                styles.detailsGrid
              }
            >
              <DetailItem
                icon={
                  <Mail
                    size={17}
                  />
                }
                label="Courriel"
                value={
                  driver.email ||
                  "Non fourni"
                }
              />

              <DetailItem
                icon={
                  <Phone
                    size={17}
                  />
                }
                label="Téléphone"
                value={
                  driver.phone ||
                  "Non fourni"
                }
              />

              <DetailItem
                icon={
                  <MapPin
                    size={17}
                  />
                }
                label="Adresse"
                value={
                  address ||
                  "Non fournie"
                }
                fullWidth
              />

              <DetailItem
                icon={
                  <Clock3
                    size={17}
                  />
                }
                label="Dernière activité"
                value={
                  formatDate(
                    driver.last_seen_at,
                  )
                }
              />
            </div>
          </section>

          {/* ORDERS */}

          <section
            className={
              styles.panel
            }
          >
            <PanelHeader
              eyebrow="Activité"
              title="Commandes du chauffeur"
              description={`${orders.length} commande${
                orders.length > 1
                  ? "s"
                  : ""
              } associée${
                orders.length > 1
                  ? "s"
                  : ""
              } à ce chauffeur.`}
              icon={
                <Truck
                  size={20}
                />
              }
            />

            {orders.length ===
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
                    size={27}
                  />
                </div>

                <strong>
                  Aucune commande
                </strong>

                <p>
                  Ce chauffeur n’a actuellement
                  aucune commande assignée.
                </p>
              </div>
            ) : (
              <div
                className={
                  styles.ordersList
                }
              >
                {orders.map(
                  (order) => (
                    <article
                      key={
                        order.id
                      }
                      className={
                        styles.orderCard
                      }
                    >
                      <div
                        className={
                          styles.orderTop
                        }
                      >
                        <div>
                          <span
                            className={
                              styles.orderEyebrow
                            }
                          >
                            COMMANDE
                          </span>

                          <strong>
                            {order.order_number ||
                              order.reference ||
                              `#${order.id}`}
                          </strong>
                        </div>

                        <span
                          className={
                            styles.orderStatus
                          }
                        >
                          {orderStatusLabel(
                            order.status,
                          )}
                        </span>
                      </div>

                      <div
                        className={
                          styles.routeBox
                        }
                      >
                        <div
                          className={
                            styles.routeRow
                          }
                        >
                          <span
                            className={
                              styles.pickupDot
                            }
                          />

                          <div>
                            <small>
                              DÉPART
                            </small>

                            <strong>
                              {order.pickup_address ||
                                "Ramassage non défini"}
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
                            styles.routeRow
                          }
                        >
                          <span
                            className={
                              styles.deliveryDot
                            }
                          />

                          <div>
                            <small>
                              LIVRAISON
                            </small>

                            <strong>
                              {order.delivery_address ||
                                "Livraison non définie"}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div
                        className={
                          styles.orderFooter
                        }
                      >
                        <span>
                          <CalendarDays
                            size={14}
                          />

                          {simpleDate(
                            order.delivery_date ||
                              order.pickup_date,
                          )}
                        </span>

                        <Link
                          href={`/dashboard/admin/orders/${order.id}`}
                        >
                          Voir la commande

                          <ExternalLink
                            size={14}
                          />
                        </Link>
                      </div>
                    </article>
                  ),
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
          {/* LICENSE */}

          <section
            className={
              styles.sidePanel
            }
          >
            <PanelHeader
              eyebrow="Documents"
              title="Permis de conduire"
              icon={
                <IdCard
                  size={20}
                />
              }
            />

            <div
              className={
                styles.documentBlock
              }
            >
              <div
                className={
                  styles.documentIcon
                }
              >
                <ShieldCheck
                  size={22}
                />
              </div>

              <div
                className={
                  styles.documentContent
                }
              >
                <small>
                  NUMÉRO DE PERMIS
                </small>

                <strong>
                  {driver.license_number ||
                    "Non fourni"}
                </strong>

                <div
                  className={
                    styles.expiry
                  }
                >
                  <CalendarDays
                    size={15}
                  />

                  Expire le{" "}
                  {simpleDate(
                    driver.license_expiry,
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* VEHICLE */}

          <section
            className={
              styles.sidePanel
            }
          >
            <PanelHeader
              eyebrow="Transport"
              title="Véhicule assigné"
              icon={
                <Truck
                  size={20}
                />
              }
            />

            {driver.vehicle_id ||
            driver.vehicle_name ? (
              <div
                className={
                  styles.vehicleCard
                }
              >
                <div
                  className={
                    styles.vehicleVisual
                  }
                >
                  <Truck
                    size={27}
                  />
                </div>

                <div>
                  <small>
                    VÉHICULE ACTUEL
                  </small>

                  <strong>
                    {driver.vehicle_name ||
                      "Véhicule assigné"}
                  </strong>

                  <span>
                    {driver.vehicle_plate ||
                      "Plaque non disponible"}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={
                  styles.noVehicle
                }
              >
                <Truck
                  size={24}
                />

                <div>
                  <strong>
                    Aucun véhicule
                  </strong>

                  <span>
                    Aucun véhicule n’est
                    actuellement assigné.
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* EMERGENCY */}

          <section
            className={
              styles.sidePanel
            }
          >
            <PanelHeader
              eyebrow="Sécurité"
              title="Contact d’urgence"
              icon={
                <Phone
                  size={20}
                />
              }
            />

            <div
              className={
                styles.emergencyCard
              }
            >
              <div
                className={
                  styles.emergencyAvatar
                }
              >
                <UserRound
                  size={19}
                />
              </div>

              <div
                className={
                  styles.emergencyInfo
                }
              >
                <small>
                  CONTACT
                </small>

                <strong>
                  {driver.emergency_contact_name ||
                    "Non renseigné"}
                </strong>

                <span>
                  {driver.emergency_contact_phone ||
                    "Téléphone non renseigné"}
                </span>
              </div>
            </div>

            {driver.emergency_contact_phone && (
              <a
                href={`tel:${driver.emergency_contact_phone}`}
                className={
                  styles.callButton
                }
              >
                <Phone
                  size={16}
                />

                Appeler le contact
              </a>
            )}
          </section>

          {/* ACTIVITY */}

          <section
            className={
              styles.sidePanel
            }
          >
            <PanelHeader
              eyebrow="Compte"
              title="Activité du chauffeur"
              icon={
                <Clock3
                  size={20}
                />
              }
            />

            <div
              className={
                styles.activityList
              }
            >
              <ActivityRow
                label="Création du profil"
                value={
                  simpleDate(
                    driver.created_at,
                  )
                }
              />

              <ActivityRow
                label="Dernière activité"
                value={
                  formatDate(
                    driver.last_seen_at,
                  )
                }
              />

              <ActivityRow
                label="Statut du compte"
                value={
                  driver.status ||
                  "Actif"
                }
              />
            </div>
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

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <article
      className={
        styles.statCard
      }
    >
      <span
        className={
          styles.statIcon
        }
      >
        {icon}
      </span>

      <div
        className={
          styles.statContent
        }
      >
        <small>
          {label}
        </small>

        <div
          className={
            styles.statValue
          }
        >
          {value}
        </div>

        <span>
          {description}
        </span>
      </div>
    </article>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
}) {
  return (
    <div
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

      <span
        className={
          styles.panelHeaderIcon
        }
      >
        {icon}
      </span>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
  fullWidth = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`${styles.detailItem} ${
        fullWidth
          ? styles.detailFull
          : ""
      }`}
    >
      <span
        className={
          styles.detailIcon
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
    </div>
  );
}

function ActivityRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={
        styles.activityRow
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
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  Clock3,
  LogOut,
  MapPin,
  Navigation,
  PackageCheck,
  RefreshCw,
  Truck,
} from "lucide-react";

import styles from "./driver.module.css";

/* ============================================================
   TYPES
============================================================ */

type ConnectedUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  role: string;
};

type Driver = {
  id: number;
  user_id: number;
  availability_status?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
};

type DriverOrder = {
  id: number;
  order_number?: string;
  reference?: string;

  status?: string;

  pickup_address?: string;
  pickup_city?: string;

  delivery_address?: string;
  delivery_city?: string;

  scheduled_date?: string;
  scheduled_time?: string;

  client_name?: string;
};

type Position = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
};

/* ============================================================
   API
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* ============================================================
   PAGE
============================================================ */

export default function DriverDashboardPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<ConnectedUser | null>(null);

  const [driver, setDriver] =
    useState<Driver | null>(null);

  const [orders, setOrders] =
    useState<DriverOrder[]>([]);

  const [position, setPosition] =
    useState<Position | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [gpsActive, setGpsActive] =
    useState(false);

  const [gpsError, setGpsError] =
    useState("");

  const [error, setError] =
    useState("");

  /* ==========================================================
     AUTH
  ========================================================== */

  useEffect(() => {
    const token =
      localStorage.getItem("glory_token");

    const storedUser =
      localStorage.getItem("glory_user");

    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    try {
      const parsedUser =
        JSON.parse(storedUser) as ConnectedUser;

      if (parsedUser.role !== "driver") {
        router.replace("/dashboard");
        return;
      }

      setUser(parsedUser);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  /* ==========================================================
     CHARGER DONNÉES
  ========================================================== */

  const loadDriverData =
    useCallback(async () => {
      const token =
        localStorage.getItem("glory_token");

      if (!token) return;

      try {
        setError("");

        /*
         * Adapte cette route si ton backend utilise
         * une autre URL pour récupérer le chauffeur connecté.
         */
        const driverResponse = await fetch(
          `${API_URL}/api/drivers/me`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const driverResult =
          await driverResponse.json();

        if (!driverResponse.ok) {
          throw new Error(
            driverResult.message ||
              "Impossible de récupérer le profil chauffeur."
          );
        }

        const currentDriver =
          driverResult.driver ||
          driverResult.data;

        setDriver(currentDriver);

        /*
         * Commandes du chauffeur
         */
        const ordersResponse = await fetch(
          `${API_URL}/api/drivers/${currentDriver.id}/orders`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const ordersResult =
          await ordersResponse.json();

        if (ordersResponse.ok) {
          const receivedOrders =
            Array.isArray(ordersResult.orders)
              ? ordersResult.orders
              : Array.isArray(ordersResult.data)
                ? ordersResult.data
                : [];

          setOrders(receivedOrders);
        }
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  useEffect(() => {
    if (!user) return;

    loadDriverData();
  }, [user, loadDriverData]);

  /* ==========================================================
     ENVOYER POSITION AU BACKEND
  ========================================================== */

  const sendPosition =
    useCallback(
      async (
        coords: GeolocationCoordinates
      ) => {
        const token =
          localStorage.getItem(
            "glory_token"
          );

        if (!token || !driver) {
          return;
        }

        const gpsPosition: Position = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy:
            coords.accuracy ?? null,
          speed:
            coords.speed ?? null,
          heading:
            coords.heading ?? null,
        };

        setPosition(gpsPosition);

        try {
          const response = await fetch(
            `${API_URL}/api/tracking/location`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                driver_id: driver.id,

                latitude:
                  gpsPosition.latitude,

                longitude:
                  gpsPosition.longitude,

                accuracy:
                  gpsPosition.accuracy,

                speed:
                  gpsPosition.speed,

                heading:
                  gpsPosition.heading,
              }),
            }
          );

          const result =
            await response.json();

          if (!response.ok) {
            console.error(
              "Tracking error:",
              result
            );
          }
        } catch (err) {
          console.error(
            "Erreur envoi GPS:",
            err
          );
        }
      },
      [driver]
    );

  /* ==========================================================
     GPS
  ========================================================== */

  useEffect(() => {
    if (!driver) return;

    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      setGpsError(
        "La géolocalisation n'est pas disponible sur cet appareil."
      );

      return;
    }

    const watchId =
      navigator.geolocation.watchPosition(
        (gps) => {
          setGpsActive(true);
          setGpsError("");

          sendPosition(gps.coords);
        },

        (gpsError) => {
          console.error(gpsError);

          setGpsActive(false);

          switch (gpsError.code) {
            case 1:
              setGpsError(
                "Autorisation GPS refusée."
              );
              break;

            case 2:
              setGpsError(
                "Position GPS indisponible."
              );
              break;

            case 3:
              setGpsError(
                "La localisation prend trop de temps."
              );
              break;

            default:
              setGpsError(
                "Impossible d'obtenir votre position."
              );
          }
        },

        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      );

    return () => {
      navigator.geolocation.clearWatch(
        watchId
      );
    };
  }, [driver, sendPosition]);

  /* ==========================================================
     LOGOUT
  ========================================================== */

  function logout() {
    localStorage.removeItem(
      "glory_token"
    );

    localStorage.removeItem(
      "glory_user"
    );

    router.replace("/login");
  }

  /* ==========================================================
     STATS
  ========================================================== */

  const activeOrders =
    orders.filter((order) =>
      [
        "assigned",
        "accepted",
        "picked_up",
        "in_transit",
      ].includes(order.status || "")
    ).length;

  const completedOrders =
    orders.filter(
      (order) =>
        order.status === "delivered"
    ).length;

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <main className={styles.loading}>
        <div
          className={styles.spinner}
        />

        <p>
          Chargement de votre espace
          chauffeur...
        </p>
      </main>
    );
  }

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <main className={styles.page}>
      {/* HEADER */}

      <header className={styles.header}>
        <div>
          <span
            className={styles.eyebrow}
          >
            GLORY SOLUTIONS
          </span>

          <h1>
            Bonjour{" "}
            {user?.first_name ||
              "Chauffeur"}
          </h1>

          <p>
            Gérez vos livraisons et
            votre disponibilité.
          </p>
        </div>

        <button
          type="button"
          className={styles.logout}
          onClick={logout}
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* GPS */}

      <section
        className={`${styles.gpsCard} ${
          gpsActive
            ? styles.gpsOnline
            : styles.gpsOffline
        }`}
      >
        <div
          className={styles.gpsIcon}
        >
          <Navigation size={22} />
        </div>

        <div
          className={styles.gpsContent}
        >
          <strong>
            {gpsActive
              ? "Localisation active"
              : "Localisation inactive"}
          </strong>

          <span>
            {gpsActive
              ? "Votre position est transmise à Glory Solutions."
              : gpsError ||
                "Activation du GPS..."}
          </span>
        </div>

        <span
          className={styles.liveBadge}
        >
          {gpsActive
            ? "EN DIRECT"
            : "GPS"}
        </span>
      </section>

      {/* STATS */}

      <section
        className={styles.stats}
      >
        <article
          className={styles.statCard}
        >
          <div
            className={styles.statIcon}
          >
            <PackageCheck
              size={21}
            />
          </div>

          <span>Commandes</span>

          <strong>
            {orders.length}
          </strong>
        </article>

        <article
          className={styles.statCard}
        >
          <div
            className={styles.statIcon}
          >
            <Truck size={21} />
          </div>

          <span>En cours</span>

          <strong>
            {activeOrders}
          </strong>
        </article>

        <article
          className={styles.statCard}
        >
          <div
            className={styles.statIcon}
          >
            <CheckCircle2
              size={21}
            />
          </div>

          <span>Terminées</span>

          <strong>
            {completedOrders}
          </strong>
        </article>
      </section>

      {/* TITLE */}

      <div
        className={styles.sectionHeader}
      >
        <div>
          <span
            className={styles.sectionLabel}
          >
            MES LIVRAISONS
          </span>

          <h2>
            Commandes du jour
          </h2>
        </div>

        <button
          type="button"
          className={styles.refresh}
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true);
            loadDriverData();
          }}
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? styles.rotating
                : ""
            }
          />
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div
          className={styles.error}
        >
          {error}
        </div>
      )}

      {/* ORDERS */}

      <section
        className={styles.orders}
      >
        {orders.length === 0 ? (
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
              <Truck size={30} />
            </div>

            <h3>
              Aucune livraison
            </h3>

            <p>
              Vous n'avez aucune
              commande assignée pour
              le moment.
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <article
              key={order.id}
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
                      styles.orderNumber
                    }
                  >
                    #
                    {order.order_number ||
                      order.reference ||
                      order.id}
                  </span>

                  <h3>
                    {order.client_name ||
                      "Livraison"}
                  </h3>
                </div>

                <span
                  className={
                    styles.status
                  }
                >
                  {order.status ||
                    "Assignée"}
                </span>
              </div>

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

                    {order.pickup_city && (
                      <span>
                        {
                          order.pickup_city
                        }
                      </span>
                    )}
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

                    {order.delivery_city && (
                      <span>
                        {
                          order.delivery_city
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(order.scheduled_date ||
                order.scheduled_time) && (
                <div
                  className={
                    styles.schedule
                  }
                >
                  <Clock3
                    size={17}
                  />

                  <span>
                    {order.scheduled_date}

                    {order.scheduled_time
                      ? ` • ${order.scheduled_time}`
                      : ""}
                  </span>
                </div>
              )}

              <button
                type="button"
                className={
                  styles.orderButton
                }
                onClick={() =>
                  router.push(
                    `/dashboard/driver/orders/${order.id}`
                  )
                }
              >
                Voir la livraison
              </button>
            </article>
          ))
        )}
      </section>

      {/* GPS DETAILS */}

      {position && (
        <section
          className={
            styles.positionInfo
          }
        >
          <Navigation size={17} />

          <span>
            GPS connecté • précision{" "}
            {position.accuracy
              ? `${Math.round(
                  position.accuracy
                )} m`
              : "—"}
          </span>
        </section>
      )}

      <div
        className={styles.bottomSpace}
      />
    </main>
  );
}
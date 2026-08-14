"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./drivers.module.css";

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
  availability_status?: DriverAvailability | string;
  profile_photo_url?: string | null;
  vehicle_name?: string | null;
  vehicle_plate?: string | null;
  current_orders?: number;
  remaining_stops?: number;
  completed_orders?: number;
  total_orders?: number;
  last_seen_at?: string | null;
  created_at?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  drivers?: T;
  message?: string;
};

type Filter = "all" | DriverAvailability;

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const ITEMS_PER_PAGE = 8;

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("glory_token") || "";
}

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "CH";
}

function formatDate(value?: string | null) {
  if (!value) return "Non disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Non disponible";
  }

  return new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getAvailabilityLabel(status?: string) {
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

export default function DriversPage() {
  const router = useRouter();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const authenticatedFetch = useCallback(
    async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        throw new Error("Votre session a expiré.");
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
        cache: "no-store",
      });

      let data: unknown = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.status === 401) {
        localStorage.removeItem("glory_token");
        localStorage.removeItem("glory_user");
        router.replace("/login");
        throw new Error("Votre session a expiré.");
      }

      if (!response.ok) {
        throw new Error(
          (data as { message?: string } | null)?.message ||
            "Une erreur est survenue.",
        );
      }

      return data as T;
    },
    [router],
  );

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await authenticatedFetch<ApiResponse<Driver[]>>(
        "/api/drivers",
      );

      const receivedDrivers = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.drivers)
          ? result.drivers
          : [];

      setDrivers(receivedDrivers);
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
    setPage(1);
  }, [search, filter]);

  const availableCount = useMemo(
    () =>
      drivers.filter(
        (driver) => driver.availability_status === "available",
      ).length,
    [drivers],
  );

  const busyCount = useMemo(
    () =>
      drivers.filter((driver) => driver.availability_status === "busy").length,
    [drivers],
  );

  const offlineCount = useMemo(
    () =>
      drivers.filter(
        (driver) =>
          !driver.availability_status ||
          driver.availability_status === "offline",
      ).length,
    [drivers],
  );

  const filteredDrivers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return drivers.filter((driver) => {
      const matchesFilter =
        filter === "all" || driver.availability_status === filter;

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

      return matchesFilter && (!needle || searchable.includes(needle));
    });
  }, [drivers, search, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDrivers.length / ITEMS_PER_PAGE),
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visibleDrivers = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredDrivers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDrivers, page]);

  const updateAvailability = async (
    driver: Driver,
    availability_status: DriverAvailability,
  ) => {
    setActionId(driver.id);
    setError("");
    setSuccess("");

    try {
      await authenticatedFetch(`/api/drivers/${driver.id}`, {
        method: "PUT",
        body: JSON.stringify({
          availability_status,
        }),
      });

      setDrivers((current) =>
        current.map((item) =>
          item.id === driver.id
            ? {
                ...item,
                availability_status,
              }
            : item,
        ),
      );

      setSuccess(
        `Le statut de ${driver.first_name || "ce chauffeur"} a été mis à jour.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible de modifier le chauffeur.",
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>
            <Truck size={16} />
            Gestion des chauffeurs
          </span>

          <h1>Chauffeurs</h1>

          <p>
            Consultez la disponibilité, les commandes, les arrêts et le profil
            de chaque chauffeur.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void loadDrivers()}
          disabled={loading}
        >
          <RefreshCw className={loading ? styles.spin : ""} size={17} />
          Actualiser
        </button>
      </section>

      {error && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className={styles.successBanner}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")}>
            <X size={16} />
          </button>
        </div>
      )}

      <section className={styles.statsGrid}>
        <StatCard
          label="Total chauffeurs"
          value={drivers.length}
          icon={<UserRound size={20} />}
          variant="total"
        />

        <StatCard
          label="Disponibles"
          value={availableCount}
          icon={<CheckCircle2 size={20} />}
          variant="available"
        />

        <StatCard
          label="En livraison"
          value={busyCount}
          icon={<Truck size={20} />}
          variant="busy"
        />

        <StatCard
          label="Hors ligne"
          value={offlineCount}
          icon={<Clock3 size={20} />}
          variant="offline"
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <Search size={18} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un chauffeur, un véhicule..."
            />
          </label>

          <div className={styles.filters}>
            {[
              ["all", "Tous"],
              ["available", "Disponibles"],
              ["busy", "En livraison"],
              ["on_break", "En pause"],
              ["offline", "Hors ligne"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  filter === value ? styles.filterActive : styles.filterButton
                }
                onClick={() => setFilter(value as Filter)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Chauffeur</th>
                <th>Contact</th>
                <th>Disponibilité</th>
                <th>Commandes du jour</th>
                <th>Arrêts restants</th>
                <th>Véhicule</th>
                <th>Dernière activité</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={8}>
                      <div className={styles.skeleton} />
                    </td>
                  </tr>
                ))
              ) : visibleDrivers.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className={styles.emptyState}>
                      <Truck size={36} />
                      <h2>Aucun chauffeur trouvé</h2>
                      <p>Modifiez les filtres ou actualisez les données.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleDrivers.map((driver) => (
                  <tr key={driver.id}>
                    <td>
                      <div className={styles.identity}>
                        <span>
                          {getInitials(driver.first_name, driver.last_name)}
                        </span>

                        <div>
                          <strong>
                            {driver.first_name || "Chauffeur"}{" "}
                            {driver.last_name || ""}
                          </strong>

                          <small>ID #{driver.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className={styles.contact}>
                        <span>
                          <Phone size={14} />
                          {driver.phone || "Non fourni"}
                        </span>

                        <span>{driver.email || "Courriel non fourni"}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          driver.availability_status === "available"
                            ? styles.statusAvailable
                            : driver.availability_status === "busy"
                              ? styles.statusBusy
                              : driver.availability_status === "on_break"
                                ? styles.statusBreak
                                : styles.statusOffline
                        }`}
                      >
                        {getAvailabilityLabel(driver.availability_status)}
                      </span>
                    </td>

                    <td>{driver.current_orders ?? 0}</td>

                    <td>{driver.remaining_stops ?? 0}</td>

                    <td>
                      <div className={styles.vehicleCell}>
                        <Truck size={15} />
                        <span>
                          {driver.vehicle_name || "Non assigné"}
                          {driver.vehicle_plate
                            ? ` · ${driver.vehicle_plate}`
                            : ""}
                        </span>
                      </div>
                    </td>

                    <td>{formatDate(driver.last_seen_at)}</td>

                    <td>
                      <div className={styles.actions}>
                        <Link
                          href={`/dashboard/admin/drivers/${driver.id}`}
                          className={styles.viewButton}
                          title="Voir le profil"
                        >
                          <Eye size={16} />
                        </Link>

                        <div className={styles.statusMenu}>
                          <button
                            type="button"
                            className={styles.moreButton}
                            title="Changer le statut"
                          >
                            {actionId === driver.id ? (
                              <Loader2 className={styles.spin} size={16} />
                            ) : (
                              <MoreHorizontal size={16} />
                            )}
                          </button>

                          <div className={styles.statusDropdown}>
                            <button
                              type="button"
                              onClick={() =>
                                void updateAvailability(driver, "available")
                              }
                            >
                              Disponible
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void updateAvailability(driver, "busy")
                              }
                            >
                              En livraison
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void updateAvailability(driver, "on_break")
                              }
                            >
                              En pause
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void updateAvailability(driver, "offline")
                              }
                            >
                              Hors ligne
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className={styles.pagination}>
          <span>
            {filteredDrivers.length} chauffeur
            {filteredDrivers.length > 1 ? "s" : ""}
          </span>

          <div>
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Précédent
            </button>

            <span>
              Page {page} sur {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page === totalPages}
            >
              Suivant
            </button>
          </div>
        </footer>
      </section>

      <section className={styles.liveMapPreview}>
        <div>
          <span className={styles.eyebrow}>
            <MapPin size={16} />
            Suivi en direct
          </span>

          <h2>Carte globale des chauffeurs</h2>

          <p>
            Cette section est prête pour la future intégration GPS ou Onfleet.
          </p>
        </div>

        <Link
          href="/dashboard/admin/drivers/live-map"
          className={styles.mapButton}
        >
          Ouvrir la carte
        </Link>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant: "total" | "available" | "busy" | "offline";
}) {
  return (
    <article className={styles.statCard}>
      <span className={styles[`stat_${variant}`]}>{icon}</span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  MoreHorizontal,
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
    localStorage.getItem(
      "glory_token",
    ) || ""
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
                  Commandes du jour
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
                        {driver.current_orders ??
                          0}
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

                          <div
                            className={
                              styles.statusMenu
                            }
                          >
                            <button
                              type="button"
                              className={
                                styles.moreButton
                              }
                              title="Changer le statut"
                            >
                              {actionId ===
                              driver.id ? (
                                <Loader2
                                  className={
                                    styles.spin
                                  }
                                  size={
                                    16
                                  }
                                />
                              ) : (
                                <MoreHorizontal
                                  size={
                                    16
                                  }
                                />
                              )}
                            </button>

                            <div
                              className={
                                styles.statusDropdown
                              }
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  void updateAvailability(
                                    driver,
                                    "available",
                                  )
                                }
                              >
                                Disponible
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void updateAvailability(
                                    driver,
                                    "busy",
                                  )
                                }
                              >
                                En
                                livraison
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void updateAvailability(
                                    driver,
                                    "on_break",
                                  )
                                }
                              >
                                En pause
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void updateAvailability(
                                    driver,
                                    "offline",
                                  )
                                }
                              >
                                Hors ligne
                              </button>
                            </div>
                          </div>
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
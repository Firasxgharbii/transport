"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Fuel,
  Gauge,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
  Wrench,
  X,
  XCircle,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import styles from "./vehicles.module.css";

/* ============================================================
   TYPES
============================================================ */

type VehicleStatus =
  | "available"
  | "in_service"
  | "maintenance"
  | "inactive";

type VehicleType =
  | "van"
  | "truck"
  | "box_truck"
  | "pickup"
  | "trailer"
  | "other";

type FuelType =
  | "gasoline"
  | "diesel"
  | "electric"
  | "hybrid"
  | "other";

type Vehicle = {
  id: number;

  driver_id?: number | null;

  make?: string | null;
  model?: string | null;
  year?: number | null;

  plate?: string | null;
  vin?: string | null;

  vehicle_type?: VehicleType | string | null;

  capacity_kg?: number | string | null;
  capacity_pallets?: number | string | null;

  fuel_type?: FuelType | string | null;
  mileage?: number | string | null;

  status?: VehicleStatus | string | null;

  insurance_number?: string | null;
  insurance_expiry?: string | null;

  registration_number?: string | null;
  registration_expiry?: string | null;

  notes?: string | null;

  driver_first_name?: string | null;
  driver_last_name?: string | null;
  driver_phone?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type Driver = {
  id: number;

  first_name?: string | null;
  last_name?: string | null;

  phone?: string | null;

  availability_status?: string | null;
};

type VehiclesResponse = {
  success?: boolean;

  count?: number;

  vehicles?: Vehicle[];
  data?: Vehicle[];

  message?: string;
};

type DriversResponse = {
  success?: boolean;

  count?: number;

  drivers?: Driver[];
  data?: Driver[];

  message?: string;
};

type VehicleForm = {
  make: string;
  model: string;
  year: string;

  plate: string;
  vin: string;

  vehicle_type: VehicleType;

  capacity_kg: string;
  capacity_pallets: string;

  fuel_type: FuelType;
  mileage: string;

  status: VehicleStatus;

  driver_id: string;

  insurance_number: string;
  insurance_expiry: string;

  registration_number: string;
  registration_expiry: string;

  notes: string;
};

type StatusFilter =
  | "all"
  | VehicleStatus;

/* ============================================================
   CONFIGURATION
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const EMPTY_FORM: VehicleForm = {
  make: "",
  model: "",
  year: "",

  plate: "",
  vin: "",

  vehicle_type: "van",

  capacity_kg: "",
  capacity_pallets: "",

  fuel_type: "gasoline",
  mileage: "",

  status: "available",

  driver_id: "",

  insurance_number: "",
  insurance_expiry: "",

  registration_number: "",
  registration_expiry: "",

  notes: "",
};

/* ============================================================
   UTILITAIRES
============================================================ */

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem(
      "glory_token",
    ) || ""
  );
}

function normalizeApiError(
  error: unknown,
) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur est survenue.";
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Non définie";
  }

  const normalized =
    value.includes("T")
      ? value
      : `${value}T00:00:00`;

  const date = new Date(normalized);

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

function getVehicleName(
  vehicle: Vehicle,
) {
  const value = [
    vehicle.make,
    vehicle.model,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    value ||
    `Véhicule #${vehicle.id}`
  );
}

function getDriverName(
  vehicle: Vehicle,
) {
  const value = [
    vehicle.driver_first_name,
    vehicle.driver_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    value ||
    "Non assigné"
  );
}

function getStatusLabel(
  status?: string | null,
) {
  switch (status) {
    case "available":
      return "Disponible";

    case "in_service":
      return "En service";

    case "maintenance":
      return "En entretien";

    case "inactive":
      return "Inactif";

    default:
      return "Non défini";
  }
}

function getTypeLabel(
  type?: string | null,
) {
  switch (type) {
    case "van":
      return "Fourgonnette";

    case "truck":
      return "Camion";

    case "box_truck":
      return "Camion cube";

    case "pickup":
      return "Camionnette";

    case "trailer":
      return "Remorque";

    default:
      return "Autre";
  }
}

function getFuelLabel(
  fuel?: string | null,
) {
  switch (fuel) {
    case "diesel":
      return "Diesel";

    case "electric":
      return "Électrique";

    case "hybrid":
      return "Hybride";

    case "other":
      return "Autre";

    default:
      return "Essence";
  }
}

/* ============================================================
   PAGE
============================================================ */

export default function VehiclesPage() {
  const router = useRouter();

  const [vehicles, setVehicles] =
    useState<Vehicle[]>([]);

  const [drivers, setDrivers] =
    useState<Driver[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "all",
    );

  const [
    showModal,
    setShowModal,
  ] =
    useState(false);

  const [
    editingVehicle,
    setEditingVehicle,
  ] =
    useState<Vehicle | null>(
      null,
    );

  const [form, setForm] =
    useState<VehicleForm>({
      ...EMPTY_FORM,
    });

  /* ============================================================
     FETCH AUTHENTIFIÉ
  ============================================================ */

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

              cache: "no-store",
            },
          );

        let responseData:
          | unknown
          | null = null;

        try {
          responseData =
            await response.json();
        } catch {
          responseData = null;
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
          const apiError =
            responseData as {
              message?: string;
            } | null;

          throw new Error(
            apiError?.message ||
              `Erreur HTTP ${response.status}.`,
          );
        }

        return responseData as T;
      },
      [router],
    );

  /* ============================================================
     CHARGER LES VÉHICULES + CHAUFFEURS
  ============================================================ */

  const loadVehicles =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const [
          vehicleResult,
          driverResult,
        ] =
          await Promise.allSettled(
            [
              authenticatedFetch<VehiclesResponse>(
                "/api/vehicles",
              ),

              authenticatedFetch<DriversResponse>(
                "/api/drivers",
              ),
            ],
          );

        if (
          vehicleResult.status ===
          "rejected"
        ) {
          throw vehicleResult.reason;
        }

        const vehicleResponse =
          vehicleResult.value;

        const receivedVehicles =
          Array.isArray(
            vehicleResponse.data,
          )
            ? vehicleResponse.data
            : Array.isArray(
                  vehicleResponse.vehicles,
                )
              ? vehicleResponse.vehicles
              : [];

        setVehicles(
          receivedVehicles,
        );

        if (
          driverResult.status ===
          "fulfilled"
        ) {
          const driverResponse =
            driverResult.value;

          const receivedDrivers =
            Array.isArray(
              driverResponse.data,
            )
              ? driverResponse.data
              : Array.isArray(
                    driverResponse.drivers,
                  )
                ? driverResponse.drivers
                : [];

          setDrivers(
            receivedDrivers,
          );
        } else {
          setDrivers([]);
        }
      } catch (reason) {
        setError(
          normalizeApiError(
            reason,
          ),
        );
      } finally {
        setLoading(false);
      }
    }, [authenticatedFetch]);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  /* ============================================================
     STATISTIQUES
  ============================================================ */

  const availableCount =
    useMemo(
      () =>
        vehicles.filter(
          (vehicle) =>
            vehicle.status ===
            "available",
        ).length,
      [vehicles],
    );

  const inServiceCount =
    useMemo(
      () =>
        vehicles.filter(
          (vehicle) =>
            vehicle.status ===
            "in_service",
        ).length,
      [vehicles],
    );

  const maintenanceCount =
    useMemo(
      () =>
        vehicles.filter(
          (vehicle) =>
            vehicle.status ===
            "maintenance",
        ).length,
      [vehicles],
    );

  const inactiveCount =
    useMemo(
      () =>
        vehicles.filter(
          (vehicle) =>
            vehicle.status ===
            "inactive",
        ).length,
      [vehicles],
    );

  /* ============================================================
     FILTRAGE
  ============================================================ */

  const filteredVehicles =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return vehicles.filter(
        (vehicle) => {
          const searchable = [
            vehicle.make,
            vehicle.model,
            vehicle.plate,
            vehicle.vin,
            vehicle.driver_first_name,
            vehicle.driver_last_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            searchable.includes(
              query,
            );

          const matchesStatus =
            statusFilter ===
              "all" ||
            vehicle.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      vehicles,
      search,
      statusFilter,
    ]);

  /* ============================================================
     MODAL
  ============================================================ */

  const openCreateModal = () => {
    setEditingVehicle(null);

    setForm({
      ...EMPTY_FORM,
    });

    setError("");
    setSuccess("");

    setShowModal(true);
  };

  const openEditModal = (
    vehicle: Vehicle,
  ) => {
    setEditingVehicle(
      vehicle,
    );

    setForm({
      make:
        vehicle.make || "",

      model:
        vehicle.model || "",

      year:
        vehicle.year
          ? String(vehicle.year)
          : "",

      plate:
        vehicle.plate || "",

      vin:
        vehicle.vin || "",

      vehicle_type:
        (vehicle.vehicle_type ||
          "van") as VehicleType,

      capacity_kg:
        vehicle.capacity_kg !==
          null &&
        vehicle.capacity_kg !==
          undefined
          ? String(
              vehicle.capacity_kg,
            )
          : "",

      capacity_pallets:
        vehicle.capacity_pallets !==
          null &&
        vehicle.capacity_pallets !==
          undefined
          ? String(
              vehicle.capacity_pallets,
            )
          : "",

      fuel_type:
        (vehicle.fuel_type ||
          "gasoline") as FuelType,

      mileage:
        vehicle.mileage !==
          null &&
        vehicle.mileage !==
          undefined
          ? String(
              vehicle.mileage,
            )
          : "",

      status:
        (vehicle.status ||
          "available") as VehicleStatus,

      driver_id:
        vehicle.driver_id
          ? String(
              vehicle.driver_id,
            )
          : "",

      insurance_number:
        vehicle.insurance_number ||
        "",

      insurance_expiry:
        vehicle.insurance_expiry
          ?.slice(0, 10) || "",

      registration_number:
        vehicle.registration_number ||
        "",

      registration_expiry:
        vehicle.registration_expiry
          ?.slice(0, 10) || "",

      notes:
        vehicle.notes || "",
    });

    setError("");
    setSuccess("");

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);

    setEditingVehicle(
      null,
    );

    setForm({
      ...EMPTY_FORM,
    });
  };

  /* ============================================================
     FORMULAIRE
  ============================================================ */

  const updateField = (
    field:
      keyof VehicleForm,
    value: string,
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  };

  const handleSubmit =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      /* -------------------------
         MARQUE
      ------------------------- */

      if (
        !form.make.trim()
      ) {
        setError(
          "La marque du véhicule est obligatoire.",
        );

        return;
      }

      /* -------------------------
         MODÈLE
      ------------------------- */

      if (
        !form.model.trim()
      ) {
        setError(
          "Le modèle du véhicule est obligatoire.",
        );

        return;
      }

      /* -------------------------
         PLAQUE
      ------------------------- */

      if (
        !form.plate.trim()
      ) {
        setError(
          "La plaque du véhicule est obligatoire.",
        );

        return;
      }

      /* -------------------------
         ANNÉE
      ------------------------- */

      const year =
        form.year
          ? Number(
              form.year,
            )
          : null;

      if (
        year !== null &&
        (
          !Number.isInteger(
            year,
          ) ||
          year < 1900 ||
          year > 2100
        )
      ) {
        setError(
          "L’année du véhicule est invalide.",
        );

        return;
      }

      /* -------------------------
         CAPACITÉ KG
      ------------------------- */

      const capacityKg =
        form.capacity_kg
          ? Number(
              form.capacity_kg,
            )
          : null;

      if (
        capacityKg !== null &&
        (
          !Number.isFinite(
            capacityKg,
          ) ||
          capacityKg < 0
        )
      ) {
        setError(
          "La capacité en kilogrammes est invalide.",
        );

        return;
      }

      /* -------------------------
         PALETTES
      ------------------------- */

      const capacityPallets =
        form.capacity_pallets
          ? Number(
              form.capacity_pallets,
            )
          : null;

      if (
        capacityPallets !==
          null &&
        (
          !Number.isInteger(
            capacityPallets,
          ) ||
          capacityPallets < 0
        )
      ) {
        setError(
          "Le nombre de palettes est invalide.",
        );

        return;
      }

      /* -------------------------
         KILOMÉTRAGE
      ------------------------- */

      const mileage =
        form.mileage
          ? Number(
              form.mileage,
            )
          : 0;

      if (
        !Number.isFinite(
          mileage,
        ) ||
        mileage < 0
      ) {
        setError(
          "Le kilométrage est invalide.",
        );

        return;
      }

      setSaving(true);

      try {
        /*
         * IMPORTANT :
         *
         * Les noms correspondent maintenant
         * EXACTEMENT au backend :
         *
         * make
         * plate
         * in_service
         */

        const payload = {
          make:
            form.make.trim(),

          model:
            form.model.trim(),

          year,

          plate:
            form.plate
              .trim()
              .toUpperCase(),

          vin:
            form.vin.trim()
              ? form.vin
                  .trim()
                  .toUpperCase()
              : null,

          vehicle_type:
            form.vehicle_type,

          capacity_kg:
            capacityKg,

          capacity_pallets:
            capacityPallets,

          fuel_type:
            form.fuel_type,

          mileage,

          status:
            form.status,

          driver_id:
            form.driver_id
              ? Number(
                  form.driver_id,
                )
              : null,

          insurance_number:
            form.insurance_number
              .trim() ||
            null,

          insurance_expiry:
            form.insurance_expiry ||
            null,

          registration_number:
            form.registration_number
              .trim() ||
            null,

          registration_expiry:
            form.registration_expiry ||
            null,

          notes:
            form.notes.trim() ||
            null,
        };

        if (
          editingVehicle
        ) {
          await authenticatedFetch(
            `/api/vehicles/${editingVehicle.id}`,
            {
              method: "PUT",

              body:
                JSON.stringify(
                  payload,
                ),
            },
          );

          setSuccess(
            "Véhicule modifié avec succès.",
          );
        } else {
          await authenticatedFetch(
            "/api/vehicles",
            {
              method: "POST",

              body:
                JSON.stringify(
                  payload,
                ),
            },
          );

          setSuccess(
            "Véhicule ajouté avec succès.",
          );
        }

        setShowModal(false);

        setEditingVehicle(
          null,
        );

        setForm({
          ...EMPTY_FORM,
        });

        await loadVehicles();
      } catch (reason) {
        setError(
          normalizeApiError(
            reason,
          ),
        );
      } finally {
        setSaving(false);
      }
    };

  /* ============================================================
     SUPPRESSION
  ============================================================ */

  const deleteVehicle =
    async (
      vehicle: Vehicle,
    ) => {
      const confirmed =
        window.confirm(
          `Voulez-vous vraiment supprimer ${getVehicleName(
            vehicle,
          )} ?`,
        );

      if (!confirmed) {
        return;
      }

      setError("");
      setSuccess("");

      try {
        await authenticatedFetch(
          `/api/vehicles/${vehicle.id}`,
          {
            method:
              "DELETE",
          },
        );

        setSuccess(
          "Véhicule supprimé avec succès.",
        );

        await loadVehicles();
      } catch (reason) {
        setError(
          normalizeApiError(
            reason,
          ),
        );
      }
    };

  /* ============================================================
     AFFICHAGE
  ============================================================ */

  return (
    <main
      className={
        styles.page
      }
    >
      {/* =====================================================
          EN-TÊTE
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

            Gestion de la flotte
          </span>

          <h1>
            Véhicules
          </h1>

          <p>
            Gérez les véhicules,
            les chauffeurs assignés,
            les capacités et les
            entretiens.
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
              void loadVehicles()
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
              styles.createButton
            }
            onClick={
              openCreateModal
            }
          >
            <Plus size={18} />

            Ajouter un véhicule
          </button>
        </div>
      </section>

      {/* =====================================================
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
            aria-label="Fermer"
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
          label="Total véhicules"
          value={
            vehicles.length
          }
          icon={
            <Truck size={20} />
          }
          variant="total"
        />

        <StatCard
          label="Disponibles"
          value={
            availableCount
          }
          icon={
            <CheckCircle2
              size={20}
            />
          }
          variant="available"
        />

        <StatCard
          label="En service"
          value={
            inServiceCount
          }
          icon={
            <Gauge size={20} />
          }
          variant="inUse"
        />

        <StatCard
          label="En entretien"
          value={
            maintenanceCount
          }
          icon={
            <Wrench size={20} />
          }
          variant="maintenance"
        />

        <StatCard
          label="Inactifs"
          value={
            inactiveCount
          }
          icon={
            <XCircle
              size={20}
            />
          }
          variant="inactive"
        />
      </section>

      {/* =====================================================
          TABLEAU
      ====================================================== */}

      <section
        className={
          styles.panel
        }
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
              placeholder="Rechercher par marque, modèle, plaque ou chauffeur..."
            />
          </label>

          <select
            className={
              styles.statusFilter
            }
            value={
              statusFilter
            }
            onChange={(
              event,
            ) =>
              setStatusFilter(
                event.target
                  .value as StatusFilter,
              )
            }
          >
            <option value="all">
              Tous les statuts
            </option>

            <option value="available">
              Disponibles
            </option>

            <option value="in_service">
              En service
            </option>

            <option value="maintenance">
              En entretien
            </option>

            <option value="inactive">
              Inactifs
            </option>
          </select>
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
                  Véhicule
                </th>

                <th>
                  Plaque / VIN
                </th>

                <th>
                  Type
                </th>

                <th>
                  Capacité
                </th>

                <th>
                  Carburant
                </th>

                <th>
                  Kilométrage
                </th>

                <th>
                  Chauffeur
                </th>

                <th>
                  Documents
                </th>

                <th>
                  Statut
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({
                  length: 4,
                }).map(
                  (_, index) => (
                    <tr
                      key={index}
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
              ) : filteredVehicles.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={10}
                  >
                    <div
                      className={
                        styles.emptyState
                      }
                    >
                      <Truck
                        size={44}
                      />

                      <h2>
                        Aucun véhicule
                        trouvé
                      </h2>

                      <p>
                        Ajoutez le
                        premier véhicule
                        de votre flotte.
                      </p>

                      <button
                        type="button"
                        className={
                          styles.emptyButton
                        }
                        onClick={
                          openCreateModal
                        }
                      >
                        <Plus
                          size={17}
                        />

                        Ajouter un
                        véhicule
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVehicles.map(
                  (vehicle) => (
                    <tr
                      key={
                        vehicle.id
                      }
                    >
                      <td>
                        <div
                          className={
                            styles.vehicleIdentity
                          }
                        >
                          <span>
                            <Truck
                              size={
                                18
                              }
                            />
                          </span>

                          <div>
                            <strong>
                              {getVehicleName(
                                vehicle,
                              )}
                            </strong>

                            <small>
                              {`VHC-${String(
                                vehicle.id,
                              ).padStart(
                                4,
                                "0",
                              )}`}
                            </small>

                            {vehicle.year && (
                              <small>
                                Année{" "}
                                {
                                  vehicle.year
                                }
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            styles.plateCell
                          }
                        >
                          <strong>
                            {vehicle.plate ||
                              "Non fournie"}
                          </strong>

                          <small>
                            VIN :{" "}
                            {vehicle.vin ||
                              "Non fourni"}
                          </small>
                        </div>
                      </td>

                      <td>
                        <span
                          className={
                            styles.typeBadge
                          }
                        >
                          {getTypeLabel(
                            vehicle.vehicle_type,
                          )}
                        </span>
                      </td>

                      <td>
                        <div
                          className={
                            styles.capacityCell
                          }
                        >
                          <strong>
                            {vehicle.capacity_kg
                              ? `${vehicle.capacity_kg} kg`
                              : "Non définie"}
                          </strong>

                          <small>
                            {Number(
                              vehicle.capacity_pallets ||
                                0,
                            )}{" "}
                            palette
                            {Number(
                              vehicle.capacity_pallets ||
                                0,
                            ) > 1
                              ? "s"
                              : ""}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            styles.iconText
                          }
                        >
                          <Fuel
                            size={
                              15
                            }
                          />

                          <span>
                            {getFuelLabel(
                              vehicle.fuel_type,
                            )}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            styles.iconText
                          }
                        >
                          <Gauge
                            size={
                              15
                            }
                          />

                          <span>
                            {Number(
                              vehicle.mileage ||
                                0,
                            ).toLocaleString(
                              "fr-CA",
                            )}{" "}
                            km
                          </span>
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            styles.driverCell
                          }
                        >
                          <UserRound
                            size={
                              16
                            }
                          />

                          <span>
                            {getDriverName(
                              vehicle,
                            )}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            styles.documentsCell
                          }
                        >
                          <DocumentDate
                            label="Assurance"
                            value={
                              vehicle.insurance_expiry
                            }
                          />

                          <DocumentDate
                            label="Immatriculation"
                            value={
                              vehicle.registration_expiry
                            }
                          />
                        </div>
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            vehicle.status ===
                            "available"
                              ? styles.statusAvailable
                              : vehicle.status ===
                                  "in_service"
                                ? styles.statusInUse
                                : vehicle.status ===
                                    "maintenance"
                                  ? styles.statusMaintenance
                                  : styles.statusInactive
                          }`}
                        >
                          {getStatusLabel(
                            vehicle.status,
                          )}
                        </span>
                      </td>

                      <td>
                        <div
                          className={
                            styles.actions
                          }
                        >
                          <button
                            type="button"
                            className={
                              styles.actionButton
                            }
                            onClick={() =>
                              openEditModal(
                                vehicle,
                              )
                            }
                            title="Modifier"
                          >
                            <Edit3
                              size={
                                16
                              }
                            />
                          </button>

                          <button
                            type="button"
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            onClick={() =>
                              void deleteVehicle(
                                vehicle,
                              )
                            }
                            title="Supprimer"
                          >
                            <Trash2
                              size={
                                16
                              }
                            />
                          </button>
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
            styles.footer
          }
        >
          {
            filteredVehicles.length
          }{" "}
          véhicule
          {filteredVehicles.length >
          1
            ? "s"
            : ""}
        </footer>
      </section>

      {/* =====================================================
          MODAL AJOUT / MODIFICATION
      ====================================================== */}

      {showModal && (
        <div
          className={
            styles.modalOverlay
          }
          role="presentation"
        >
          <section
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
            aria-label={
              editingVehicle
                ? "Modifier le véhicule"
                : "Ajouter un véhicule"
            }
          >
            <header
              className={
                styles.modalHeader
              }
            >
              <div>
                <span
                  className={
                    styles.eyebrow
                  }
                >
                  <Truck
                    size={15}
                  />

                  Gestion de la
                  flotte
                </span>

                <h2>
                  {editingVehicle
                    ? "Modifier le véhicule"
                    : "Ajouter un véhicule"}
                </h2>
              </div>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={
                  closeModal
                }
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </header>

            <form
              className={
                styles.form
              }
              onSubmit={
                handleSubmit
              }
            >
              <div
                className={
                  styles.formGrid
                }
              >
                <Field
                  label="Marque *"
                  value={
                    form.make
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "make",
                      value,
                    )
                  }
                  placeholder="Ford"
                  required
                />

                <Field
                  label="Modèle *"
                  value={
                    form.model
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "model",
                      value,
                    )
                  }
                  placeholder="Transit"
                  required
                />

                <Field
                  label="Année"
                  type="number"
                  value={
                    form.year
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "year",
                      value,
                    )
                  }
                  placeholder="2026"
                />

                <Field
                  label="Plaque *"
                  value={
                    form.plate
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "plate",
                      value,
                    )
                  }
                  placeholder="ABC-123"
                  required
                />

                <Field
                  label="Numéro VIN"
                  value={
                    form.vin
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "vin",
                      value,
                    )
                  }
                  placeholder="1FTBR1C85..."
                />

                <SelectField
                  label="Type de véhicule"
                  value={
                    form.vehicle_type
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "vehicle_type",
                      value,
                    )
                  }
                  options={[
                    {
                      value:
                        "van",
                      label:
                        "Fourgonnette",
                    },
                    {
                      value:
                        "truck",
                      label:
                        "Camion",
                    },
                    {
                      value:
                        "box_truck",
                      label:
                        "Camion cube",
                    },
                    {
                      value:
                        "pickup",
                      label:
                        "Camionnette",
                    },
                    {
                      value:
                        "trailer",
                      label:
                        "Remorque",
                    },
                    {
                      value:
                        "other",
                      label:
                        "Autre",
                    },
                  ]}
                />

                <SelectField
                  label="Carburant"
                  value={
                    form.fuel_type
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "fuel_type",
                      value,
                    )
                  }
                  options={[
                    {
                      value:
                        "gasoline",
                      label:
                        "Essence",
                    },
                    {
                      value:
                        "diesel",
                      label:
                        "Diesel",
                    },
                    {
                      value:
                        "electric",
                      label:
                        "Électrique",
                    },
                    {
                      value:
                        "hybrid",
                      label:
                        "Hybride",
                    },
                    {
                      value:
                        "other",
                      label:
                        "Autre",
                    },
                  ]}
                />

                <Field
                  label="Capacité en kg"
                  type="number"
                  value={
                    form.capacity_kg
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "capacity_kg",
                      value,
                    )
                  }
                  placeholder="3500"
                />

                <Field
                  label="Nombre de palettes"
                  type="number"
                  value={
                    form.capacity_pallets
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "capacity_pallets",
                      value,
                    )
                  }
                  placeholder="8"
                />

                <Field
                  label="Kilométrage"
                  type="number"
                  value={
                    form.mileage
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "mileage",
                      value,
                    )
                  }
                  placeholder="45000"
                />

                <SelectField
                  label="Statut"
                  value={
                    form.status
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "status",
                      value,
                    )
                  }
                  options={[
                    {
                      value:
                        "available",
                      label:
                        "Disponible",
                    },
                    {
                      value:
                        "in_service",
                      label:
                        "En service",
                    },
                    {
                      value:
                        "maintenance",
                      label:
                        "En entretien",
                    },
                    {
                      value:
                        "inactive",
                      label:
                        "Inactif",
                    },
                  ]}
                />

                <SelectField
                  label="Chauffeur assigné"
                  value={
                    form.driver_id
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "driver_id",
                      value,
                    )
                  }
                  options={[
                    {
                      value: "",
                      label:
                        "Aucun chauffeur",
                    },

                    ...drivers.map(
                      (driver) => ({
                        value:
                          String(
                            driver.id,
                          ),

                        label:
                          [
                            driver.first_name,
                            driver.last_name,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              " ",
                            ) ||
                          `Chauffeur #${driver.id}`,
                      }),
                    ),
                  ]}
                />

                <Field
                  label="N° assurance"
                  value={
                    form.insurance_number
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "insurance_number",
                      value,
                    )
                  }
                  placeholder="ASS-001"
                />

                <Field
                  label="Expiration assurance"
                  type="date"
                  value={
                    form.insurance_expiry
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "insurance_expiry",
                      value,
                    )
                  }
                />

                <Field
                  label="N° immatriculation"
                  value={
                    form.registration_number
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "registration_number",
                      value,
                    )
                  }
                  placeholder="REG-001"
                />

                <Field
                  label="Expiration immatriculation"
                  type="date"
                  value={
                    form.registration_expiry
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "registration_expiry",
                      value,
                    )
                  }
                />
              </div>

              <label
                className={
                  styles.textareaField
                }
              >
                <span>
                  Notes
                </span>

                <textarea
                  value={
                    form.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "notes",
                      event.target
                        .value,
                    )
                  }
                  rows={4}
                  placeholder="Informations supplémentaires sur le véhicule..."
                />
              </label>

              <footer
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
                  onClick={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className={
                    styles.saveButton
                  }
                  disabled={
                    saving
                  }
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={17}
                        className={
                          styles.spin
                        }
                      />

                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <ShieldCheck
                        size={17}
                      />

                      {editingVehicle
                        ? "Enregistrer les modifications"
                        : "Ajouter le véhicule"}
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
   STAT CARD
============================================================ */

function StatCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string;

  value: number;

  icon:
    React.ReactNode;

  variant:
    | "total"
    | "available"
    | "inUse"
    | "maintenance"
    | "inactive";
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

/* ============================================================
   DATE DOCUMENT
============================================================ */

function DocumentDate({
  label,
  value,
}: {
  label: string;

  value?:
    | string
    | null;
}) {
  return (
    <span>
      <CalendarDays
        size={13}
      />

      <small>
        {label}
      </small>

      <strong>
        {formatDate(
          value,
        )}
      </strong>
    </span>
  );
}

/* ============================================================
   FIELD
============================================================ */

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;

  value: string;

  onChange:
    (
      value: string,
    ) => void;

  type?: string;

  placeholder?: string;

  required?: boolean;
}) {
  return (
    <label
      className={
        styles.field
      }
    >
      <span>
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        placeholder={
          placeholder
        }
        required={
          required
        }
      />
    </label>
  );
}

/* ============================================================
   SELECT FIELD
============================================================ */

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;

  value: string;

  onChange:
    (
      value: string,
    ) => void;

  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <label
      className={
        styles.field
      }
    >
      <span>
        {label}
      </span>

      <select
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
      >
        {options.map(
          (option) => (
            <option
              key={
                option.value ||
                "empty"
              }
              value={
                option.value
              }
            >
              {
                option.label
              }
            </option>
          ),
        )}
      </select>
    </label>
  );
}
"use client";

import {
  AlertTriangle,
  Ban,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Download,
  Edit3,
  Eye,
  Loader2,
  LockKeyhole,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  UserCheck,
  UserCog,
  UserRound,
  Users,
  UserX,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./users.module.css";

/* ============================================================
   TYPES
============================================================ */

type UserRole =
  | "super_admin"
  | "dispatcher"
  | "driver"
  | "client";

type UserStatus =
  | "active"
  | "inactive"
  | "blocked";

type User = {
  id: number;

  first_name?: string | null;
  last_name?: string | null;

  email?: string | null;
  phone?: string | null;

  role?: UserRole | string | null;
  role_name?: UserRole | string | null;
  role_id?: number | null;

  status?: UserStatus | string | null;

  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;

  company_name?: string | null;
  profile_photo_url?: string | null;

  last_login_at?: string | null;
  last_seen_at?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type UsersResponse = {
  success?: boolean;
  data?: User[];
  users?: User[];
  message?: string;
};

type UserResponse = {
  success?: boolean;
  data?: User;
  user?: User;
  message?: string;
};

type RoleFilter =
  | "all"
  | UserRole;

type StatusFilter =
  | "all"
  | UserStatus;

type UserForm = {
  first_name: string;
  last_name: string;

  email: string;
  phone: string;

  password: string;
  confirm_password: string;

  role_name: UserRole;
  status: UserStatus;

  address: string;
  city: string;
  province: string;
  postal_code: string;

  company_name: string;
};

type BulkAction =
  | ""
  | "activate"
  | "deactivate"
  | "block"
  | "delete";

/* ============================================================
   CONFIGURATION
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://192.168.2.22:5000";

const ITEMS_PER_PAGE = 8;

const EMPTY_FORM: UserForm = {
  first_name: "",
  last_name: "",

  email: "",
  phone: "",

  password: "",
  confirm_password: "",

  role_name: "client",
  status: "active",

  address: "",
  city: "",
  province: "Québec",
  postal_code: "",

  company_name: "",
};

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

function getUserRole(
  user: User,
): UserRole {
  const role =
    user.role_name ||
    user.role ||
    "client";

  if (
    role === "super_admin" ||
    role === "dispatcher" ||
    role === "driver" ||
    role === "client"
  ) {
    return role;
  }

  return "client";
}

function getUserStatus(
  user: User,
): UserStatus {
  const status =
    user.status || "inactive";

  if (
    status === "active" ||
    status === "inactive" ||
    status === "blocked"
  ) {
    return status;
  }

  return "inactive";
}

function getFullName(user: User) {
  const fullName = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user.email ||
    `Utilisateur #${user.id}`
  );
}

function getInitials(user: User) {
  const firstInitial =
    user.first_name
      ?.trim()
      .charAt(0)
      .toUpperCase() || "";

  const lastInitial =
    user.last_name
      ?.trim()
      .charAt(0)
      .toUpperCase() || "";

  return (
    `${firstInitial}${lastInitial}` ||
    "U"
  );
}

function getRoleLabel(
  role: UserRole,
) {
  switch (role) {
    case "super_admin":
      return "Super Admin";

    case "dispatcher":
      return "Répartiteur";

    case "driver":
      return "Chauffeur";

    case "client":
      return "Client";

    default:
      return "Utilisateur";
  }
}

function getStatusLabel(
  status: UserStatus,
) {
  switch (status) {
    case "active":
      return "Actif";

    case "inactive":
      return "Inactif";

    case "blocked":
      return "Bloqué";

    default:
      return "Inconnu";
  }
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Jamais";
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
      timeStyle: "short",
    },
  ).format(date);
}

function formatShortDate(
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

function getRoleIcon(
  role: UserRole,
) {
  switch (role) {
    case "super_admin":
      return <ShieldCheck size={16} />;

    case "dispatcher":
      return <UserCog size={16} />;

    case "driver":
      return <Truck size={16} />;

    default:
      return <UserRound size={16} />;
  }
}

function normalizeError(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Une erreur est survenue.";
}

/* ============================================================
   PAGE
============================================================ */

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] =
    useState<User[]>([]);

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
    roleFilter,
    setRoleFilter,
  ] =
    useState<RoleFilter>("all");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>("all");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    selectedUserIds,
    setSelectedUserIds,
  ] = useState<number[]>([]);

  const [
    bulkAction,
    setBulkAction,
  ] = useState<BulkAction>("");

  const [
    showFormModal,
    setShowFormModal,
  ] = useState(false);

  const [
    showDetailsModal,
    setShowDetailsModal,
  ] = useState(false);

  const [
    editingUser,
    setEditingUser,
  ] =
    useState<User | null>(
      null,
    );

  const [
    selectedUser,
    setSelectedUser,
  ] =
    useState<User | null>(
      null,
    );

  const [form, setForm] =
    useState<UserForm>(
      EMPTY_FORM,
    );

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
              error?: string;
            } | null;

          throw new Error(
            apiError?.message ||
              apiError?.error ||
              "Une erreur est survenue.",
          );
        }

        return responseData as T;
      },
      [router],
    );

  /* ============================================================
     CHARGER LES UTILISATEURS
  ============================================================ */

  const loadUsers =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await authenticatedFetch<UsersResponse>(
            "/api/users",
          );

        const receivedUsers =
          Array.isArray(response.data)
            ? response.data
            : Array.isArray(
                  response.users,
                )
              ? response.users
              : [];

        setUsers(receivedUsers);
      } catch (reason) {
        setError(
          normalizeError(reason),
        );
      } finally {
        setLoading(false);
      }
    }, [authenticatedFetch]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  /* ============================================================
     STATISTIQUES
  ============================================================ */

  const activeCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            getUserStatus(user) ===
            "active",
        ).length,
      [users],
    );

  const inactiveCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            getUserStatus(user) ===
            "inactive",
        ).length,
      [users],
    );

  const blockedCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            getUserStatus(user) ===
            "blocked",
        ).length,
      [users],
    );

  const adminCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            getUserRole(user) ===
            "super_admin",
        ).length,
      [users],
    );

  const dispatcherCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            getUserRole(user) ===
            "dispatcher",
        ).length,
      [users],
    );

  const driverCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            getUserRole(user) ===
            "driver",
        ).length,
      [users],
    );

  const clientCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            getUserRole(user) ===
            "client",
        ).length,
      [users],
    );

  /* ============================================================
     FILTRES
  ============================================================ */

  const filteredUsers =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return users.filter(
        (user) => {
          const role =
            getUserRole(user);

          const status =
            getUserStatus(user);

          const searchableContent = [
            user.first_name,
            user.last_name,
            user.email,
            user.phone,
            user.company_name,
            user.city,
            user.province,
            role,
            status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !normalizedSearch ||
            searchableContent.includes(
              normalizedSearch,
            );

          const matchesRole =
            roleFilter === "all" ||
            role === roleFilter;

          const matchesStatus =
            statusFilter === "all" ||
            status === statusFilter;

          return (
            matchesSearch &&
            matchesRole &&
            matchesStatus
          );
        },
      );
    }, [
      users,
      search,
      roleFilter,
      statusFilter,
    ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    roleFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredUsers.length /
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

  const visibleUsers =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) *
        ITEMS_PER_PAGE;

      return filteredUsers.slice(
        startIndex,
        startIndex +
          ITEMS_PER_PAGE,
      );
    }, [
      filteredUsers,
      currentPage,
    ]);

  /* ============================================================
     SÉLECTION
  ============================================================ */

  const allVisibleSelected =
    visibleUsers.length > 0 &&
    visibleUsers.every((user) =>
      selectedUserIds.includes(
        user.id,
      ),
    );

  const toggleUserSelection = (
    userId: number,
  ) => {
    setSelectedUserIds(
      (current) =>
        current.includes(userId)
          ? current.filter(
              (id) =>
                id !== userId,
            )
          : [...current, userId],
    );
  };

  const toggleSelectVisible =
    () => {
      if (allVisibleSelected) {
        const visibleIds =
          visibleUsers.map(
            (user) => user.id,
          );

        setSelectedUserIds(
          (current) =>
            current.filter(
              (id) =>
                !visibleIds.includes(
                  id,
                ),
            ),
        );

        return;
      }

      setSelectedUserIds(
        (current) => {
          const newIds =
            visibleUsers
              .map(
                (user) =>
                  user.id,
              )
              .filter(
                (id) =>
                  !current.includes(
                    id,
                  ),
              );

          return [
            ...current,
            ...newIds,
          ];
        },
      );
    };

  /* ============================================================
     FORMULAIRE
  ============================================================ */

  const updateField = (
    field: keyof UserForm,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowFormModal(true);
  };

  const openEditModal = (
    user: User,
  ) => {
    setEditingUser(user);

    setForm({
      first_name:
        user.first_name || "",

      last_name:
        user.last_name || "",

      email:
        user.email || "",

      phone:
        user.phone || "",

      password: "",
      confirm_password: "",

      role_name:
        getUserRole(user),

      status:
        getUserStatus(user),

      address:
        user.address || "",

      city:
        user.city || "",

      province:
        user.province ||
        "Québec",

      postal_code:
        user.postal_code || "",

      company_name:
        user.company_name || "",
    });

    setError("");
    setSuccess("");
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    if (saving) {
      return;
    }

    setShowFormModal(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
  };

  const validateForm = () => {
    if (
      !form.first_name.trim()
    ) {
      return (
        "Le prénom est obligatoire."
      );
    }

    if (
      !form.last_name.trim()
    ) {
      return (
        "Le nom est obligatoire."
      );
    }

    if (!form.email.trim()) {
      return (
        "Le courriel est obligatoire."
      );
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        form.email.trim(),
      )
    ) {
      return (
        "L’adresse courriel est invalide."
      );
    }

    if (
      !editingUser &&
      !form.password
    ) {
      return (
        "Le mot de passe est obligatoire."
      );
    }

    if (
      form.password &&
      form.password.length < 8
    ) {
      return (
        "Le mot de passe doit contenir au moins 8 caractères."
      );
    }

    if (
      form.password !==
      form.confirm_password
    ) {
      return (
        "Les mots de passe ne correspondent pas."
      );
    }

    return "";
  };

  const submitUser = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const payload: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string | null;
        role_name: UserRole;
        status: UserStatus;
        address: string | null;
        city: string | null;
        province: string | null;
        postal_code: string | null;
        company_name: string | null;
        password?: string;
      } = {
        first_name:
          form.first_name.trim(),

        last_name:
          form.last_name.trim(),

        email:
          form.email
            .trim()
            .toLowerCase(),

        phone:
          form.phone.trim() ||
          null,

        role_name:
          form.role_name,

        status:
          form.status,

        address:
          form.address.trim() ||
          null,

        city:
          form.city.trim() ||
          null,

        province:
          form.province.trim() ||
          null,

        postal_code:
          form.postal_code.trim() ||
          null,

        company_name:
          form.company_name.trim() ||
          null,
      };

      if (form.password) {
        payload.password =
          form.password;
      }

      if (editingUser) {
        await authenticatedFetch(
          `/api/users/${editingUser.id}`,
          {
            method: "PUT",

            body: JSON.stringify(
              payload,
            ),
          },
        );

        setSuccess(
          "Utilisateur modifié avec succès.",
        );
      } else {
        await authenticatedFetch(
          "/api/users",
          {
            method: "POST",

            body: JSON.stringify(
              payload,
            ),
          },
        );

        setSuccess(
          "Utilisateur créé avec succès.",
        );
      }

      closeFormModal();
      await loadUsers();
    } catch (reason) {
      setError(
        normalizeError(reason),
      );
    } finally {
      setSaving(false);
    }
  };

  /* ============================================================
     DÉTAILS
  ============================================================ */

  const openDetailsModal =
    async (user: User) => {
      setSelectedUser(user);
      setShowDetailsModal(true);

      try {
        const response =
          await authenticatedFetch<UserResponse>(
            `/api/users/${user.id}`,
          );

        const detailedUser =
          response.data ||
          response.user;

        if (detailedUser) {
          setSelectedUser(
            detailedUser,
          );
        }
      } catch {
        // Les données de la liste restent affichées.
      }
    };

  /* ============================================================
     CHANGER LE STATUT
  ============================================================ */

  const updateUserStatus =
    async (
      user: User,
      status: UserStatus,
    ) => {
      setError("");
      setSuccess("");

      try {
        await authenticatedFetch(
          `/api/users/${user.id}`,
          {
            method: "PUT",

            body: JSON.stringify({
              status,
            }),
          },
        );

        setSuccess(
          `Le compte de ${getFullName(
            user,
          )} est maintenant ${getStatusLabel(
            status,
          ).toLowerCase()}.`,
        );

        await loadUsers();
      } catch (reason) {
        setError(
          normalizeError(reason),
        );
      }
    };

  /* ============================================================
     SUPPRESSION
  ============================================================ */

  const deleteUser = async (
    user: User,
  ) => {
    const confirmed =
      window.confirm(
        `Voulez-vous supprimer définitivement ${getFullName(
          user,
        )} ?`,
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await authenticatedFetch(
        `/api/users/${user.id}`,
        {
          method: "DELETE",
        },
      );

      setSelectedUserIds(
        (current) =>
          current.filter(
            (id) =>
              id !== user.id,
          ),
      );

      setSuccess(
        "Utilisateur supprimé avec succès.",
      );

      await loadUsers();
    } catch (reason) {
      setError(
        normalizeError(reason),
      );
    }
  };

  /* ============================================================
     ACTIONS DE MASSE
  ============================================================ */

  const executeBulkAction =
    async () => {
      if (
        !bulkAction ||
        selectedUserIds.length === 0
      ) {
        return;
      }

      if (
        bulkAction === "delete"
      ) {
        const confirmed =
          window.confirm(
            `Voulez-vous supprimer ${selectedUserIds.length} utilisateur(s) ?`,
          );

        if (!confirmed) {
          return;
        }
      }

      setSaving(true);
      setError("");
      setSuccess("");

      try {
        if (
          bulkAction === "delete"
        ) {
          await Promise.all(
            selectedUserIds.map(
              (userId) =>
                authenticatedFetch(
                  `/api/users/${userId}`,
                  {
                    method:
                      "DELETE",
                  },
                ),
            ),
          );
        } else {
          const statusMap: Record<
            Exclude<
              BulkAction,
              "" | "delete"
            >,
            UserStatus
          > = {
            activate: "active",
            deactivate:
              "inactive",
            block: "blocked",
          };

          const newStatus =
            statusMap[bulkAction];

          await Promise.all(
            selectedUserIds.map(
              (userId) =>
                authenticatedFetch(
                  `/api/users/${userId}`,
                  {
                    method: "PUT",

                    body: JSON.stringify(
                      {
                        status:
                          newStatus,
                      },
                    ),
                  },
                ),
            ),
          );
        }

        setSuccess(
          "Action de masse terminée avec succès.",
        );

        setSelectedUserIds([]);
        setBulkAction("");

        await loadUsers();
      } catch (reason) {
        setError(
          normalizeError(reason),
        );
      } finally {
        setSaving(false);
      }
    };

  /* ============================================================
     EXPORT CSV
  ============================================================ */

  const exportCsv = () => {
    const headers = [
      "ID",
      "Prénom",
      "Nom",
      "Courriel",
      "Téléphone",
      "Rôle",
      "Statut",
      "Entreprise",
      "Ville",
      "Province",
      "Date de création",
      "Dernière connexion",
    ];

    const rows =
      filteredUsers.map(
        (user) => [
          user.id,
          user.first_name || "",
          user.last_name || "",
          user.email || "",
          user.phone || "",
          getRoleLabel(
            getUserRole(user),
          ),
          getStatusLabel(
            getUserStatus(user),
          ),
          user.company_name || "",
          user.city || "",
          user.province || "",
          user.created_at || "",
          user.last_login_at ||
            user.last_seen_at ||
            "",
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

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "glory-solutions-utilisateurs.csv";

    link.click();

    URL.revokeObjectURL(url);
  };

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

            Gestion des comptes
          </span>

          <h1>Utilisateurs</h1>

          <p>
            Gérez les administrateurs,
            répartiteurs, chauffeurs et
            clients de la plateforme.
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
              styles.exportButton
            }
            onClick={exportCsv}
          >
            <Download size={17} />

            Exporter CSV
          </button>

          <button
            type="button"
            className={
              styles.refreshButton
            }
            onClick={() =>
              void loadUsers()
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

            Ajouter un utilisateur
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

      {success && (
        <div
          className={
            styles.successBanner
          }
        >
          <CheckCircle2
            size={18}
          />

          <span>{success}</span>

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
          label="Total utilisateurs"
          value={users.length}
          icon={<Users size={20} />}
          variant="total"
        />

        <StatCard
          label="Comptes actifs"
          value={activeCount}
          icon={
            <UserCheck size={20} />
          }
          variant="active"
        />

        <StatCard
          label="Comptes inactifs"
          value={inactiveCount}
          icon={
            <UserX size={20} />
          }
          variant="inactive"
        />

        <StatCard
          label="Comptes bloqués"
          value={blockedCount}
          icon={<Ban size={20} />}
          variant="blocked"
        />

        <StatCard
          label="Administrateurs"
          value={adminCount}
          icon={
            <ShieldCheck
              size={20}
            />
          }
          variant="admin"
        />

        <StatCard
          label="Répartiteurs"
          value={dispatcherCount}
          icon={
            <UserCog size={20} />
          }
          variant="dispatcher"
        />

        <StatCard
          label="Chauffeurs"
          value={driverCount}
          icon={<Truck size={20} />}
          variant="driver"
        />

        <StatCard
          label="Clients"
          value={clientCount}
          icon={
            <UserRound size={20} />
          }
          variant="client"
        />
      </section>

      {/* =====================================================
          RÉPARTITION
      ====================================================== */}

      <section
        className={
          styles.roleOverview
        }
      >
        <div>
          <span>
            Répartition des rôles
          </span>

          <h2>
            Composition des utilisateurs
          </h2>
        </div>

        <div
          className={
            styles.roleBars
          }
        >
          <RoleProgress
            label="Administrateurs"
            value={adminCount}
            total={users.length}
          />

          <RoleProgress
            label="Répartiteurs"
            value={dispatcherCount}
            total={users.length}
          />

          <RoleProgress
            label="Chauffeurs"
            value={driverCount}
            total={users.length}
          />

          <RoleProgress
            label="Clients"
            value={clientCount}
            total={users.length}
          />
        </div>
      </section>

      {/* =====================================================
          ACTIONS DE MASSE
      ====================================================== */}

      {selectedUserIds.length >
        0 && (
        <section
          className={
            styles.bulkBar
          }
        >
          <div>
            <Check size={17} />

            <strong>
              {
                selectedUserIds.length
              }{" "}
              utilisateur
              {selectedUserIds.length >
              1
                ? "s"
                : ""}{" "}
              sélectionné
              {selectedUserIds.length >
              1
                ? "s"
                : ""}
            </strong>
          </div>

          <div>
            <select
              value={bulkAction}
              onChange={(event) =>
                setBulkAction(
                  event.target
                    .value as BulkAction,
                )
              }
            >
              <option value="">
                Choisir une action
              </option>

              <option value="activate">
                Activer
              </option>

              <option value="deactivate">
                Désactiver
              </option>

              <option value="block">
                Bloquer
              </option>

              <option value="delete">
                Supprimer
              </option>
            </select>

            <button
              type="button"
              onClick={() =>
                void executeBulkAction()
              }
              disabled={
                !bulkAction ||
                saving
              }
            >
              {saving ? (
                <Loader2
                  size={16}
                  className={
                    styles.spin
                  }
                />
              ) : (
                <Check size={16} />
              )}

              Appliquer
            </button>

            <button
              type="button"
              className={
                styles.clearSelection
              }
              onClick={() =>
                setSelectedUserIds(
                  [],
                )
              }
            >
              <X size={16} />

              Annuler
            </button>
          </div>
        </section>
      )}

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
              placeholder="Rechercher par nom, courriel, téléphone ou entreprise..."
            />
          </label>

          <div
            className={
              styles.filters
            }
          >
            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target
                    .value as RoleFilter,
                )
              }
            >
              <option value="all">
                Tous les rôles
              </option>

              <option value="super_admin">
                Super Admin
              </option>

              <option value="dispatcher">
                Répartiteurs
              </option>

              <option value="driver">
                Chauffeurs
              </option>

              <option value="client">
                Clients
              </option>
            </select>

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

              <option value="active">
                Actifs
              </option>

              <option value="inactive">
                Inactifs
              </option>

              <option value="blocked">
                Bloqués
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
                <th>
                  <button
                    type="button"
                    className={
                      allVisibleSelected
                        ? styles.checkboxActive
                        : styles.checkbox
                    }
                    onClick={
                      toggleSelectVisible
                    }
                    aria-label="Tout sélectionner"
                  >
                    {allVisibleSelected && (
                      <Check size={14} />
                    )}
                  </button>
                </th>

                <th>Utilisateur</th>
                <th>Coordonnées</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Entreprise</th>
                <th>Création</th>
                <th>
                  Dernière activité
                </th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({
                  length: 6,
                }).map(
                  (_, index) => (
                    <tr key={index}>
                      <td colSpan={9}>
                        <div
                          className={
                            styles.skeleton
                          }
                        />
                      </td>
                    </tr>
                  ),
                )
              ) : visibleUsers.length ===
                0 ? (
                <tr>
                  <td colSpan={9}>
                    <div
                      className={
                        styles.emptyState
                      }
                    >
                      <Users size={44} />

                      <h2>
                        Aucun utilisateur
                        trouvé
                      </h2>

                      <p>
                        Modifiez les filtres
                        ou créez un nouveau
                        compte.
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

                        Ajouter un utilisateur
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleUsers.map(
                  (user) => {
                    const role =
                      getUserRole(
                        user,
                      );

                    const status =
                      getUserStatus(
                        user,
                      );

                    const isSelected =
                      selectedUserIds.includes(
                        user.id,
                      );

                    return (
                      <tr
                        key={user.id}
                        className={
                          isSelected
                            ? styles.selectedRow
                            : ""
                        }
                      >
                        <td>
                          <button
                            type="button"
                            className={
                              isSelected
                                ? styles.checkboxActive
                                : styles.checkbox
                            }
                            onClick={() =>
                              toggleUserSelection(
                                user.id,
                              )
                            }
                            aria-label={`Sélectionner ${getFullName(
                              user,
                            )}`}
                          >
                            {isSelected && (
                              <Check
                                size={14}
                              />
                            )}
                          </button>
                        </td>

                        <td>
                          <div
                            className={
                              styles.userIdentity
                            }
                          >
                            {user.profile_photo_url ? (
                              <img
                                src={
                                  user.profile_photo_url
                                }
                                alt={getFullName(
                                  user,
                                )}
                              />
                            ) : (
                              <span>
                                {getInitials(
                                  user,
                                )}
                              </span>
                            )}

                            <div>
                              <strong>
                                {getFullName(
                                  user,
                                )}
                              </strong>

                              <small>
                                Utilisateur #
                                {user.id}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div
                            className={
                              styles.contactCell
                            }
                          >
                            <span>
                              <Mail
                                size={
                                  13
                                }
                              />

                              {user.email ||
                                "Non fourni"}
                            </span>

                            <span>
                              <Phone
                                size={
                                  13
                                }
                              />

                              {user.phone ||
                                "Non fourni"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`${styles.roleBadge} ${
                              role ===
                              "super_admin"
                                ? styles.roleAdmin
                                : role ===
                                    "dispatcher"
                                  ? styles.roleDispatcher
                                  : role ===
                                      "driver"
                                    ? styles.roleDriver
                                    : styles.roleClient
                            }`}
                          >
                            {getRoleIcon(
                              role,
                            )}

                            {getRoleLabel(
                              role,
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              status ===
                              "active"
                                ? styles.statusActive
                                : status ===
                                    "blocked"
                                  ? styles.statusBlocked
                                  : styles.statusInactive
                            }`}
                          >
                            <span />

                            {getStatusLabel(
                              status,
                            )}
                          </span>
                        </td>

                        <td>
                          <div
                            className={
                              styles.companyCell
                            }
                          >
                            <Building2
                              size={14}
                            />

                            <span>
                              {user.company_name ||
                                "Aucune entreprise"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div
                            className={
                              styles.dateCell
                            }
                          >
                            <strong>
                              {formatShortDate(
                                user.created_at,
                              )}
                            </strong>

                            <small>
                              Dernière modification :{" "}
                              {formatShortDate(
                                user.updated_at,
                              )}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div
                            className={
                              styles.activityCell
                            }
                          >
                            <CircleUserRound
                              size={15}
                            />

                            <div>
                              <strong>
                                {formatDate(
                                  user.last_login_at ||
                                    user.last_seen_at,
                                )}
                              </strong>

                              <small>
                                Dernière connexion
                              </small>
                            </div>
                          </div>
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
                                void openDetailsModal(
                                  user,
                                )
                              }
                              title="Voir"
                            >
                              <Eye
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              className={
                                styles.actionButton
                              }
                              onClick={() =>
                                openEditModal(
                                  user,
                                )
                              }
                              title="Modifier"
                            >
                              <Edit3
                                size={16}
                              />
                            </button>

                            {status !==
                              "active" && (
                              <button
                                type="button"
                                className={`${styles.actionButton} ${styles.activateButton}`}
                                onClick={() =>
                                  void updateUserStatus(
                                    user,
                                    "active",
                                  )
                                }
                                title="Activer"
                              >
                                <UserCheck
                                  size={
                                    16
                                  }
                                />
                              </button>
                            )}

                            {status ===
                              "active" && (
                              <button
                                type="button"
                                className={
                                  styles.actionButton
                                }
                                onClick={() =>
                                  void updateUserStatus(
                                    user,
                                    "blocked",
                                  )
                                }
                                title="Bloquer"
                              >
                                <LockKeyhole
                                  size={
                                    16
                                  }
                                />
                              </button>
                            )}

                            <button
                              type="button"
                              className={`${styles.actionButton} ${styles.deleteButton}`}
                              onClick={() =>
                                void deleteUser(
                                  user,
                                )
                              }
                              title="Supprimer"
                            >
                              <Trash2
                                size={16}
                              />
                            </button>
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
            {filteredUsers.length}{" "}
            utilisateur
            {filteredUsers.length >
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
          MODAL CRÉATION / MODIFICATION
      ====================================================== */}

      {showFormModal && (
        <div
          className={
            styles.modalOverlay
          }
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeFormModal();
            }
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
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
                  {editingUser ? (
                    <Edit3 size={15} />
                  ) : (
                    <Plus size={15} />
                  )}

                  Gestion du compte
                </span>

                <h2>
                  {editingUser
                    ? "Modifier l’utilisateur"
                    : "Ajouter un utilisateur"}
                </h2>

                <p>
                  Configurez les
                  informations, le rôle
                  et le statut du compte.
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={
                  closeFormModal
                }
              >
                <X size={20} />
              </button>
            </header>

            <form
              className={
                styles.userForm
              }
              onSubmit={submitUser}
            >
              <FormSection
                title="Informations personnelles"
                description="Identité et coordonnées de l’utilisateur."
                icon={
                  <UserRound
                    size={18}
                  />
                }
              >
                <div
                  className={
                    styles.formGrid
                  }
                >
                  <Field
                    label="Prénom *"
                    value={
                      form.first_name
                    }
                    onChange={(value) =>
                      updateField(
                        "first_name",
                        value,
                      )
                    }
                    required
                  />

                  <Field
                    label="Nom *"
                    value={
                      form.last_name
                    }
                    onChange={(value) =>
                      updateField(
                        "last_name",
                        value,
                      )
                    }
                    required
                  />

                  <Field
                    label="Adresse courriel *"
                    type="email"
                    value={form.email}
                    onChange={(value) =>
                      updateField(
                        "email",
                        value,
                      )
                    }
                    required
                  />

                  <Field
                    label="Téléphone"
                    value={form.phone}
                    onChange={(value) =>
                      updateField(
                        "phone",
                        value,
                      )
                    }
                  />

                  <Field
                    label="Entreprise"
                    value={
                      form.company_name
                    }
                    onChange={(value) =>
                      updateField(
                        "company_name",
                        value,
                      )
                    }
                    full
                    placeholder="Facultatif pour les particuliers"
                  />
                </div>
              </FormSection>

              <FormSection
                title="Rôle et accès"
                description="Permissions et état du compte."
                icon={
                  <ShieldCheck
                    size={18}
                  />
                }
              >
                <div
                  className={
                    styles.formGrid
                  }
                >
                  <SelectField
                    label="Rôle *"
                    value={
                      form.role_name
                    }
                    onChange={(value) =>
                      updateField(
                        "role_name",
                        value,
                      )
                    }
                    options={[
                      {
                        value:
                          "super_admin",
                        label:
                          "Super Admin",
                      },
                      {
                        value:
                          "dispatcher",
                        label:
                          "Répartiteur",
                      },
                      {
                        value:
                          "driver",
                        label:
                          "Chauffeur",
                      },
                      {
                        value:
                          "client",
                        label:
                          "Client",
                      },
                    ]}
                  />

                  <SelectField
                    label="Statut *"
                    value={form.status}
                    onChange={(value) =>
                      updateField(
                        "status",
                        value,
                      )
                    }
                    options={[
                      {
                        value:
                          "active",
                        label: "Actif",
                      },
                      {
                        value:
                          "inactive",
                        label:
                          "Inactif",
                      },
                      {
                        value:
                          "blocked",
                        label:
                          "Bloqué",
                      },
                    ]}
                  />

                  <Field
                    label={
                      editingUser
                        ? "Nouveau mot de passe"
                        : "Mot de passe *"
                    }
                    type="password"
                    value={
                      form.password
                    }
                    onChange={(value) =>
                      updateField(
                        "password",
                        value,
                      )
                    }
                    required={
                      !editingUser
                    }
                    placeholder={
                      editingUser
                        ? "Laisser vide pour conserver"
                        : "Minimum 8 caractères"
                    }
                  />

                  <Field
                    label={
                      editingUser
                        ? "Confirmer le nouveau mot de passe"
                        : "Confirmer le mot de passe *"
                    }
                    type="password"
                    value={
                      form.confirm_password
                    }
                    onChange={(value) =>
                      updateField(
                        "confirm_password",
                        value,
                      )
                    }
                    required={
                      !editingUser
                    }
                  />
                </div>
              </FormSection>

              <FormSection
                title="Adresse"
                description="Informations de localisation de l’utilisateur."
                icon={
                  <Building2
                    size={18}
                  />
                }
              >
                <div
                  className={
                    styles.formGrid
                  }
                >
                  <Field
                    label="Adresse"
                    value={
                      form.address
                    }
                    onChange={(value) =>
                      updateField(
                        "address",
                        value,
                      )
                    }
                    full
                  />

                  <Field
                    label="Ville"
                    value={form.city}
                    onChange={(value) =>
                      updateField(
                        "city",
                        value,
                      )
                    }
                  />

                  <Field
                    label="Province"
                    value={
                      form.province
                    }
                    onChange={(value) =>
                      updateField(
                        "province",
                        value,
                      )
                    }
                  />

                  <Field
                    label="Code postal"
                    value={
                      form.postal_code
                    }
                    onChange={(value) =>
                      updateField(
                        "postal_code",
                        value,
                      )
                    }
                  />
                </div>
              </FormSection>

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
                    closeFormModal
                  }
                  disabled={saving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className={
                    styles.saveButton
                  }
                  disabled={saving}
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

                      {editingUser
                        ? "Enregistrer les modifications"
                        : "Créer l’utilisateur"}
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* =====================================================
          MODAL DÉTAILS
      ====================================================== */}

      {showDetailsModal &&
        selectedUser && (
          <UserDetailsModal
            user={selectedUser}
            onClose={() =>
              setShowDetailsModal(
                false,
              )
            }
            onEdit={() => {
              setShowDetailsModal(
                false,
              );

              openEditModal(
                selectedUser,
              );
            }}
            onActivate={() =>
              void updateUserStatus(
                selectedUser,
                "active",
              )
            }
            onBlock={() =>
              void updateUserStatus(
                selectedUser,
                "blocked",
              )
            }
          />
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
  value: number;
  icon: React.ReactNode;

  variant:
    | "total"
    | "active"
    | "inactive"
    | "blocked"
    | "admin"
    | "dispatcher"
    | "driver"
    | "client";
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

function RoleProgress({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage =
    total > 0
      ? Math.round(
          (value / total) * 100,
        )
      : 0;

  return (
    <div
      className={
        styles.roleProgress
      }
    >
      <div>
        <span>{label}</span>

        <strong>
          {value} · {percentage}%
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
              `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function FormSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        styles.formSection
      }
    >
      <header>
        <span>{icon}</span>

        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </header>

      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  full = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;

  type?: string;
  placeholder?: string;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <label
      className={`${styles.field} ${
        full
          ? styles.fieldFull
          : ""
      }`}
    >
      <span>{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;

  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <label
      className={styles.field}
    >
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
      >
        {options.map(
          (option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

function UserDetailsModal({
  user,
  onClose,
  onEdit,
  onActivate,
  onBlock,
}: {
  user: User;
  onClose: () => void;
  onEdit: () => void;
  onActivate: () => void;
  onBlock: () => void;
}) {
  const role =
    getUserRole(user);

  const status =
    getUserStatus(user);

  const address = [
    user.address,
    user.city,
    user.province,
    user.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={
        styles.modalOverlay
      }
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className={
          styles.detailsModal
        }
        role="dialog"
        aria-modal="true"
      >
        <header
          className={
            styles.detailsHeader
          }
        >
          <div
            className={
              styles.detailsIdentity
            }
          >
            {user.profile_photo_url ? (
              <img
                src={
                  user.profile_photo_url
                }
                alt={getFullName(
                  user,
                )}
              />
            ) : (
              <span>
                {getInitials(user)}
              </span>
            )}

            <div>
              <small>
                Utilisateur #{user.id}
              </small>

              <h2>
                {getFullName(user)}
              </h2>

              <p>
                {getRoleLabel(role)}
              </p>
            </div>
          </div>

          <div
            className={
              styles.detailsHeaderActions
            }
          >
            <span
              className={`${styles.statusBadge} ${
                status === "active"
                  ? styles.statusActive
                  : status ===
                      "blocked"
                    ? styles.statusBlocked
                    : styles.statusInactive
              }`}
            >
              <span />

              {getStatusLabel(status)}
            </span>

            <button
              type="button"
              className={
                styles.closeButton
              }
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div
          className={
            styles.detailsContent
          }
        >
          <section
            className={
              styles.detailCards
            }
          >
            <DetailCard
              label="Adresse courriel"
              value={
                user.email ||
                "Non fournie"
              }
              icon={<Mail size={18} />}
            />

            <DetailCard
              label="Téléphone"
              value={
                user.phone ||
                "Non fourni"
              }
              icon={
                <Phone size={18} />
              }
            />

            <DetailCard
              label="Rôle"
              value={getRoleLabel(
                role,
              )}
              icon={getRoleIcon(
                role,
              )}
            />

            <DetailCard
              label="Entreprise"
              value={
                user.company_name ||
                "Aucune entreprise"
              }
              icon={
                <Building2
                  size={18}
                />
              }
            />
          </section>

          <section
            className={
              styles.detailsSection
            }
          >
            <header>
              <Building2
                size={18}
              />

              <h3>
                Informations du profil
              </h3>
            </header>

            <div
              className={
                styles.detailsGrid
              }
            >
              <DetailRow
                label="Prénom"
                value={
                  user.first_name ||
                  "Non défini"
                }
              />

              <DetailRow
                label="Nom"
                value={
                  user.last_name ||
                  "Non défini"
                }
              />

              <DetailRow
                label="Adresse"
                value={
                  address ||
                  "Non fournie"
                }
              />

              <DetailRow
                label="Statut"
                value={getStatusLabel(
                  status,
                )}
              />
            </div>
          </section>

          <section
            className={
              styles.detailsSection
            }
          >
            <header>
              <CircleUserRound
                size={18}
              />

              <h3>
                Activité du compte
              </h3>
            </header>

            <div
              className={
                styles.detailsGrid
              }
            >
              <DetailRow
                label="Création"
                value={formatDate(
                  user.created_at,
                )}
              />

              <DetailRow
                label="Dernière modification"
                value={formatDate(
                  user.updated_at,
                )}
              />

              <DetailRow
                label="Dernière connexion"
                value={formatDate(
                  user.last_login_at ||
                    user.last_seen_at,
                )}
              />

              <DetailRow
                label="Identifiant"
                value={`#${user.id}`}
              />
            </div>
          </section>

          <section
            className={
              styles.permissionSection
            }
          >
            <header>
              <ShieldCheck
                size={18}
              />

              <div>
                <h3>
                  Permissions principales
                </h3>

                <p>
                  Accès correspondant au
                  rôle de cet utilisateur.
                </p>
              </div>
            </header>

            <div
              className={
                styles.permissionList
              }
            >
              {role ===
                "super_admin" && (
                <>
                  <PermissionItem
                    label="Accès complet au dashboard"
                  />

                  <PermissionItem
                    label="Gestion des utilisateurs"
                  />

                  <PermissionItem
                    label="Gestion financière"
                  />

                  <PermissionItem
                    label="Paramètres du système"
                  />
                </>
              )}

              {role ===
                "dispatcher" && (
                <>
                  <PermissionItem
                    label="Gestion des commandes"
                  />

                  <PermissionItem
                    label="Assignation des chauffeurs"
                  />

                  <PermissionItem
                    label="Gestion des clients"
                  />

                  <PermissionItem
                    label="Consultation des rapports"
                  />
                </>
              )}

              {role ===
                "driver" && (
                <>
                  <PermissionItem
                    label="Consultation des missions"
                  />

                  <PermissionItem
                    label="Modification du statut des livraisons"
                  />

                  <PermissionItem
                    label="Ajout des preuves de livraison"
                  />

                  <PermissionItem
                    label="Transmission de la position GPS"
                  />
                </>
              )}

              {role === "client" && (
                <>
                  <PermissionItem
                    label="Consultation des commandes"
                  />

                  <PermissionItem
                    label="Consultation des factures"
                  />

                  <PermissionItem
                    label="Suivi des livraisons"
                  />

                  <PermissionItem
                    label="Gestion du profil client"
                  />
                </>
              )}
            </div>
          </section>
        </div>

        <footer
          className={
            styles.detailsActions
          }
        >
          <button
            type="button"
            className={
              styles.secondaryButton
            }
            onClick={onEdit}
          >
            <Edit3 size={17} />

            Modifier
          </button>

          {status !==
            "active" && (
            <button
              type="button"
              className={
                styles.activateMainButton
              }
              onClick={onActivate}
            >
              <UserCheck
                size={17}
              />

              Activer le compte
            </button>
          )}

          {status === "active" && (
            <button
              type="button"
              className={
                styles.blockMainButton
              }
              onClick={onBlock}
            >
              <LockKeyhole
                size={17}
              />

              Bloquer le compte
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function DetailCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <article
      className={
        styles.detailCard
      }
    >
      <span>{icon}</span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={
        styles.detailRow
      }
    >
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function PermissionItem({
  label,
}: {
  label: string;
}) {
  return (
    <div
      className={
        styles.permissionItem
      }
    >
      <span>
        <Check size={14} />
      </span>

      <strong>{label}</strong>
    </div>
  );
}
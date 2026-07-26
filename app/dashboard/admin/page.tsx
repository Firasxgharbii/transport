"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  UserCheck,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CSSProperties,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./dashboard.module.css";

/* =====================================================
   TYPES
===================================================== */

type UserRole =
  | "super_admin"
  | "dispatcher"
  | "driver"
  | "client";

type UserStatus =
  | "pending"
  | "active"
  | "rejected"
  | "suspended"
  | "inactive";

type ConnectedUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  role?: UserRole | string;
};

type PlatformUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  status: UserStatus | string;
  role: UserRole | string;
  company_name?: string | null;
  created_at?: string;
  updated_at?: string;
};

type Client = {
  id: number;
  user_id?: number;
  company_name?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  status?: string;
  created_at?: string;
};

type Driver = {
  id: number;
  user_id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: string;
  availability_status?: string;
  created_at?: string;
};

type Order = {
  id: number;
  order_number?: string;
  client_id?: number;
  client_name?: string;
  client_first_name?: string;
  client_last_name?: string;
  driver_id?: number | null;
  driver_name?: string | null;
  pickup_address?: string;
  delivery_address?: string;
  status?: string;
  total_amount?: number | string | null;
  price?: number | string | null;
  created_at?: string;
  pickup_date?: string;
};

type ApiCollectionResponse<T> = {
  success?: boolean;
  count?: number;
  data?: T[];
  users?: T[];
  clients?: T[];
  drivers?: T[];
  orders?: T[];
  message?: string;
};

type DashboardData = {
  users: PlatformUser[];
  clients: Client[];
  drivers: Driver[];
  orders: Order[];
};

type NotificationItem = {
  id: number;
  title: string;
  description: string;
  time: string;
  unread: boolean;
};

/* =====================================================
   CONFIGURATION
===================================================== */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const emptyDashboardData: DashboardData = {
  users: [],
  clients: [],
  drivers: [],
  orders: [],
};

const navigationItems = [
  {
    label: "Vue d’ensemble",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Demandes",
    href: "/dashboard/admin/pending-users",
    icon: Clock3,
  },
  {
    label: "Utilisateurs",
    href: "/dashboard/admin/users",
    icon: Users,
  },
  {
    label: "Clients",
    href: "/dashboard/admin/clients",
    icon: Building2,
  },
  {
    label: "Chauffeurs",
    href: "/dashboard/admin/drivers",
    icon: Truck,
  },
  {
    label: "Commandes",
    href: "/dashboard/admin/orders",
    icon: PackageCheck,
  },
  {
    label: "Véhicules",
    href: "/dashboard/admin/vehicles",
    icon: Truck,
  },
  {
    label: "Factures",
    href: "/dashboard/admin/invoices",
    icon: FileText,
  },
  {
    label: "Rapports",
    href: "/dashboard/admin/reports",
    icon: Activity,
  },
  {
    label: "Paramètres",
    href: "/dashboard/admin/settings",
    icon: Settings,
  },
];

const notifications: NotificationItem[] = [
  {
    id: 1,
    title: "Nouvelle inscription",
    description: "Un nouveau client attend votre approbation.",
    time: "À l’instant",
    unread: true,
  },
  {
    id: 2,
    title: "Commande mise à jour",
    description: "Une commande est passée au statut en livraison.",
    time: "Il y a 18 min",
    unread: true,
  },
  {
    id: 3,
    title: "Système opérationnel",
    description: "La base de données Aiven est connectée.",
    time: "Aujourd’hui",
    unread: false,
  },
];

/* =====================================================
   UTILITAIRES
===================================================== */

function getStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.localStorage.getItem("glory_token") ||
    ""
  );
}

function getStoredUser(): ConnectedUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser =
    window.localStorage.getItem("glory_user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as ConnectedUser;
  } catch {
    return null;
  }
}

function getInitials(user: ConnectedUser | null) {
  const firstName =
    user?.first_name ||
    user?.name?.split(" ")[0] ||
    "";

  const lastName =
    user?.last_name ||
    user?.name?.split(" ")[1] ||
    "";

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return initials || "SA";
}

function getFullName(user: ConnectedUser | null) {
  const composedName = [
    user?.first_name,
    user?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    composedName ||
    user?.name ||
    "Super Admin"
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(
  value?: number | string | null
) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(
    Number.isFinite(amount) ? amount : 0
  );
}

function normalizeCollection<T>(
  response: ApiCollectionResponse<T>,
  possibleKeys: Array<
    keyof ApiCollectionResponse<T>
  >
): T[] {
  for (const key of possibleKeys) {
    const possibleValue = response[key];

    if (Array.isArray(possibleValue)) {
      return possibleValue as T[];
    }
  }

  return [];
}

function getOrderStatusLabel(status?: string) {
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
      return status || "Inconnu";
  }
}

function getStatusClass(status?: string) {
  switch (status) {
    case "active":
    case "completed":
    case "available":
      return styles.statusSuccess;

    case "pending":
    case "assigned":
    case "pickup_in_progress":
      return styles.statusPending;

    case "delivery_in_progress":
    case "picked_up":
    case "arrived":
      return styles.statusInfo;

    case "rejected":
    case "cancelled":
    case "suspended":
    case "incident":
      return styles.statusDanger;

    default:
      return styles.statusNeutral;
  }
}

function getClientName(order: Order) {
  const composedName = [
    order.client_first_name,
    order.client_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    order.client_name ||
    composedName ||
    `Client #${order.client_id || "—"}`
  );
}

function getDriverName(order: Order) {
  return (
    order.driver_name ||
    (order.driver_id
      ? `Chauffeur #${order.driver_id}`
      : "Non assigné")
  );
}

/* =====================================================
   PAGE
===================================================== */

export default function AdminDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [connectedUser, setConnectedUser] =
    useState<ConnectedUser | null>(null);

  const [dashboardData, setDashboardData] =
    useState<DashboardData>(
      emptyDashboardData
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [actionUserId, setActionUserId] =
    useState<number | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [
    isNotificationMenuOpen,
    setIsNotificationMenuOpen,
  ] = useState(false);

  const [isProfileMenuOpen, setIsProfileMenuOpen] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  /* =====================================================
     AUTHENTIFICATION
  ===================================================== */

  useEffect(() => {
    const token = getStoredToken();
    const user = getStoredUser();

    if (!token || !user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "super_admin") {
      router.replace("/dashboard");
      return;
    }

    setConnectedUser(user);
  }, [router]);

  /* =====================================================
     FETCH GÉNÉRIQUE
  ===================================================== */

  const authenticatedFetch = useCallback(
    async <T,>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T> => {
      const token = getStoredToken();

      if (!token) {
        throw new Error(
          "Votre session a expiré."
        );
      }

      const response = await fetch(
        `${API_URL}${endpoint}`,
        {
          ...options,

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
        }
      );

      let responseData: unknown = null;

      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (response.status === 401) {
        window.localStorage.removeItem(
          "glory_token"
        );

        window.localStorage.removeItem(
          "glory_user"
        );

        router.replace("/login");

        throw new Error(
          "Votre session a expiré."
        );
      }

      if (!response.ok) {
        const possibleResponse =
          responseData as {
            message?: string;
          } | null;

        throw new Error(
          possibleResponse?.message ||
            "Une erreur est survenue."
        );
      }

      return responseData as T;
    },
    [router]
  );

  /* =====================================================
     CHARGER LE DASHBOARD
  ===================================================== */

  const loadDashboardData =
    useCallback(async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const results =
          await Promise.allSettled([
            authenticatedFetch<
              ApiCollectionResponse<PlatformUser>
            >("/api/users"),

            authenticatedFetch<
              ApiCollectionResponse<Client>
            >("/api/clients"),

            authenticatedFetch<
              ApiCollectionResponse<Driver>
            >("/api/drivers"),

            authenticatedFetch<
              ApiCollectionResponse<Order>
            >("/api/orders"),
          ]);

        const [
          usersResult,
          clientsResult,
          driversResult,
          ordersResult,
        ] = results;

        const users =
          usersResult.status === "fulfilled"
            ? normalizeCollection(
                usersResult.value,
                ["data", "users"]
              )
            : [];

        const clients =
          clientsResult.status === "fulfilled"
            ? normalizeCollection(
                clientsResult.value,
                ["data", "clients"]
              )
            : [];

        const drivers =
          driversResult.status === "fulfilled"
            ? normalizeCollection(
                driversResult.value,
                ["data", "drivers"]
              )
            : [];

        const orders =
          ordersResult.status === "fulfilled"
            ? normalizeCollection(
                ordersResult.value,
                ["data", "orders"]
              )
            : [];

        setDashboardData({
          users,
          clients,
          drivers,
          orders,
        });

        const failedResults = results.filter(
          (result) =>
            result.status === "rejected"
        );

        if (failedResults.length > 0) {
          setErrorMessage(
            "Certaines données du dashboard n’ont pas pu être chargées."
          );
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger le dashboard."
        );
      } finally {
        setIsLoading(false);
      }
    }, [authenticatedFetch]);

  useEffect(() => {
    if (
      connectedUser?.role === "super_admin"
    ) {
      void loadDashboardData();
    }
  }, [connectedUser, loadDashboardData]);

  /* =====================================================
     STATISTIQUES
  ===================================================== */

  const pendingUsers = useMemo(
    () =>
      dashboardData.users.filter(
        (user) => user.status === "pending"
      ),
    [dashboardData.users]
  );

  const activeUsers = useMemo(
    () =>
      dashboardData.users.filter(
        (user) => user.status === "active"
      ),
    [dashboardData.users]
  );

  const availableDrivers = useMemo(
    () =>
      dashboardData.drivers.filter(
        (driver) =>
          driver.availability_status ===
            "available" ||
          driver.status === "available" ||
          driver.status === "active"
      ),
    [dashboardData.drivers]
  );

  const activeOrders = useMemo(
    () =>
      dashboardData.orders.filter(
        (order) =>
          ![
            "completed",
            "cancelled",
          ].includes(order.status || "")
      ),
    [dashboardData.orders]
  );

  const completedOrders = useMemo(
    () =>
      dashboardData.orders.filter(
        (order) =>
          order.status === "completed"
      ),
    [dashboardData.orders]
  );

  const incidentOrders = useMemo(
    () =>
      dashboardData.orders.filter(
        (order) =>
          order.status === "incident"
      ),
    [dashboardData.orders]
  );

  const monthlyRevenue = useMemo(() => {
    const currentDate = new Date();

    return dashboardData.orders.reduce(
      (total, order) => {
        if (order.status !== "completed") {
          return total;
        }

        const orderDate = new Date(
          order.created_at ||
            order.pickup_date ||
            ""
        );

        if (
          Number.isNaN(orderDate.getTime()) ||
          orderDate.getMonth() !==
            currentDate.getMonth() ||
          orderDate.getFullYear() !==
            currentDate.getFullYear()
        ) {
          return total;
        }

        return (
          total +
          Number(
            order.total_amount ||
              order.price ||
              0
          )
        );
      },
      0
    );
  }, [dashboardData.orders]);

  const recentOrders = useMemo(
    () =>
      [...dashboardData.orders]
        .sort((firstOrder, secondOrder) => {
          const firstDate = new Date(
            firstOrder.created_at || 0
          ).getTime();

          const secondDate = new Date(
            secondOrder.created_at || 0
          ).getTime();

          return secondDate - firstDate;
        })
        .slice(0, 6),
    [dashboardData.orders]
  );

  const filteredPendingUsers = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return pendingUsers.slice(0, 6);
    }

    return pendingUsers
      .filter((user) => {
        const searchableContent = [
          user.first_name,
          user.last_name,
          user.email,
          user.phone,
          user.company_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableContent.includes(
          normalizedSearch
        );
      })
      .slice(0, 6);
  }, [pendingUsers, searchTerm]);

  /* =====================================================
     GRAPHIQUE HEBDOMADAIRE
  ===================================================== */

  const weeklyOrderData = useMemo(() => {
    const days = Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date();

        date.setHours(0, 0, 0, 0);
        date.setDate(
          date.getDate() - (6 - index)
        );

        return {
          date,
          label: new Intl.DateTimeFormat(
            "fr-CA",
            {
              weekday: "short",
            }
          ).format(date),
          value: 0,
        };
      }
    );

    dashboardData.orders.forEach((order) => {
      const orderDate = new Date(
        order.created_at ||
          order.pickup_date ||
          ""
      );

      if (Number.isNaN(orderDate.getTime())) {
        return;
      }

      orderDate.setHours(0, 0, 0, 0);

      const matchedDay = days.find(
        (day) =>
          day.date.getTime() ===
          orderDate.getTime()
      );

      if (matchedDay) {
        matchedDay.value += 1;
      }
    });

    const maximumValue = Math.max(
      ...days.map((day) => day.value),
      1
    );

    return days.map((day) => ({
      ...day,
      percentage:
        (day.value / maximumValue) * 100,
    }));
  }, [dashboardData.orders]);

  /* =====================================================
     RÉPARTITION DES UTILISATEURS
  ===================================================== */

  const usersByRole = useMemo(() => {
    const counts = {
      client: 0,
      driver: 0,
      dispatcher: 0,
      super_admin: 0,
    };

    dashboardData.users.forEach((user) => {
      if (user.role in counts) {
        counts[
          user.role as keyof typeof counts
        ] += 1;
      }
    });

    const total = Math.max(
      dashboardData.users.length,
      1
    );

    return {
      counts,
      total,
      clientPercent:
        (counts.client / total) * 100,
      driverPercent:
        (counts.driver / total) * 100,
      dispatcherPercent:
        (counts.dispatcher / total) * 100,
      adminPercent:
        (counts.super_admin / total) *
        100,
    };
  }, [dashboardData.users]);

  const donutBackground = useMemo(() => {
    const firstStop =
      usersByRole.clientPercent;

    const secondStop =
      firstStop +
      usersByRole.driverPercent;

    const thirdStop =
      secondStop +
      usersByRole.dispatcherPercent;

    return `conic-gradient(
      #dc143c 0% ${firstStop}%,
      #fb7185 ${firstStop}% ${secondStop}%,
      #fbbf24 ${secondStop}% ${thirdStop}%,
      #1f2937 ${thirdStop}% 100%
    )`;
  }, [usersByRole]);

  /* =====================================================
     ACTIONS UTILISATEURS
  ===================================================== */

  const updateUserStatus = async (
    userId: number,
    status: UserStatus
  ) => {
    const actionLabel =
      status === "active"
        ? "approuver"
        : "refuser";

    const confirmation = window.confirm(
      `Êtes-vous certain de vouloir ${actionLabel} ce compte?`
    );

    if (!confirmation) {
      return;
    }

    setActionUserId(userId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await authenticatedFetch(
        `/api/users/${userId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            status,
          }),
        }
      );

      setDashboardData(
        (previousData) => ({
          ...previousData,
          users: previousData.users.map(
            (user) =>
              user.id === userId
                ? {
                    ...user,
                    status,
                  }
                : user
          ),
        })
      );

      setSuccessMessage(
        status === "active"
          ? "Le compte a été approuvé."
          : "La demande a été refusée."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le compte."
      );
    } finally {
      setActionUserId(null);
    }
  };

  /* =====================================================
     RECHERCHE
  ===================================================== */

  const handleSearch = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const firstMatchingUser =
      dashboardData.users.find((user) => {
        const content = [
          user.first_name,
          user.last_name,
          user.email,
        ]
          .join(" ")
          .toLowerCase();

        return content.includes(
          searchTerm.toLowerCase()
        );
      });

    if (firstMatchingUser) {
      router.push(
        `/dashboard/admin/users?search=${encodeURIComponent(
          searchTerm
        )}`
      );

      return;
    }

    setErrorMessage(
      "Aucun utilisateur ne correspond à cette recherche."
    );
  };

  /* =====================================================
     DÉCONNEXION
  ===================================================== */

  const handleLogout = () => {
    window.localStorage.removeItem(
      "glory_token"
    );

    window.localStorage.removeItem(
      "glory_user"
    );

    window.localStorage.removeItem(
      "glory_remembered_email"
    );

    router.replace("/login");
  };

  /* =====================================================
     CHARGEMENT INITIAL
  ===================================================== */

  if (!connectedUser || isLoading) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingCard}>
          <Loader2
            className={styles.loadingSpinner}
            size={34}
          />

          <h1>
            Chargement du dashboard
          </h1>

          <p>
            Connexion à Glory Solutions...
          </p>
        </div>
      </main>
    );
  }

  /* =====================================================
     AFFICHAGE
  ===================================================== */

  return (
    <main className={styles.dashboardPage}>
      {/* Overlay mobile */}
      {isMobileMenuOpen && (
        <button
          type="button"
          className={styles.mobileOverlay}
          onClick={() =>
            setIsMobileMenuOpen(false)
          }
          aria-label="Fermer le menu"
        />
      )}

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`${styles.sidebar} ${
          isSidebarCollapsed
            ? styles.sidebarCollapsed
            : ""
        } ${
          isMobileMenuOpen
            ? styles.sidebarMobileOpen
            : ""
        }`}
      >
        <div className={styles.sidebarHeader}>
          <Link
            href="/dashboard/admin"
            className={styles.sidebarBrand}
          >
            <Image
              src="/images/logo1.png"
              alt="Glory Solutions"
              width={128}
              height={54}
              priority
              className={styles.sidebarLogo}
            />

            {!isSidebarCollapsed && (
              <div
                className={
                  styles.sidebarBrandText
                }
              >
                <strong>
                  Glory Solutions
                </strong>

                <span>
                  Administration
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            className={
              styles.mobileCloseButton
            }
            onClick={() =>
              setIsMobileMenuOpen(false)
            }
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav
          className={styles.sidebarNavigation}
          aria-label="Navigation administrateur"
        >
          <span
            className={
              styles.navigationSectionTitle
            }
          >
            {!isSidebarCollapsed &&
              "Navigation"}
          </span>

          {navigationItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navigationLink} ${
                  isActive
                    ? styles.navigationLinkActive
                    : ""
                }`}
                onClick={() =>
                  setIsMobileMenuOpen(false)
                }
                title={
                  isSidebarCollapsed
                    ? item.label
                    : undefined
                }
              >
                <Icon size={19} />

                {!isSidebarCollapsed && (
                  <span>{item.label}</span>
                )}

                {item.label ===
                  "Demandes" &&
                  pendingUsers.length >
                    0 && (
                    <span
                      className={
                        styles.navigationBadge
                      }
                    >
                      {pendingUsers.length}
                    </span>
                  )}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div
            className={
              styles.sidebarUserCard
            }
          >
            <span
              className={
                styles.sidebarAvatar
              }
            >
              {getInitials(connectedUser)}
            </span>

            {!isSidebarCollapsed && (
              <div>
                <strong>
                  {getFullName(
                    connectedUser
                  )}
                </strong>

                <span>Super Admin</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className={
              styles.sidebarLogoutButton
            }
            onClick={handleLogout}
            title="Déconnexion"
          >
            <LogOut size={18} />

            {!isSidebarCollapsed && (
              <span>Déconnexion</span>
            )}
          </button>
        </div>

        <button
          type="button"
          className={
            styles.sidebarCollapseButton
          }
          onClick={() =>
            setIsSidebarCollapsed(
              (previousValue) =>
                !previousValue
            )
          }
          aria-label={
            isSidebarCollapsed
              ? "Agrandir la barre latérale"
              : "Réduire la barre latérale"
          }
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}
        </button>
      </aside>

      {/* =================================================
          CONTENU
      ================================================= */}

      <section
        className={`${styles.dashboardContent} ${
          isSidebarCollapsed
            ? styles.dashboardContentExpanded
            : ""
        }`}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <header className={styles.topHeader}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              onClick={() =>
                setIsMobileMenuOpen(true)
              }
              aria-label="Ouvrir le menu"
            >
              <Menu size={21} />
            </button>

            <form
              className={styles.searchForm}
              onSubmit={handleSearch}
            >
              <Search
                size={18}
                aria-hidden="true"
              />

              <input
                type="search"
                placeholder="Rechercher un client, une commande..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                aria-label="Rechercher"
              />
            </form>
          </div>

          <div className={styles.headerActions}>
            <div
              className={
                styles.headerDropdownWrapper
              }
            >
              <button
                type="button"
                className={
                  styles.notificationButton
                }
                onClick={() => {
                  setIsNotificationMenuOpen(
                    (previousValue) =>
                      !previousValue
                  );

                  setIsProfileMenuOpen(false);
                }}
                aria-label="Notifications"
              >
                <Bell size={20} />

                <span
                  className={
                    styles.notificationCounter
                  }
                >
                  {
                    notifications.filter(
                      (notification) =>
                        notification.unread
                    ).length
                  }
                </span>
              </button>

              {isNotificationMenuOpen && (
                <div
                  className={
                    styles.notificationMenu
                  }
                >
                  <div
                    className={
                      styles.dropdownHeader
                    }
                  >
                    <div>
                      <strong>
                        Notifications
                      </strong>

                      <span>
                        Activité récente
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setIsNotificationMenuOpen(
                          false
                        )
                      }
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <div
                    className={
                      styles.notificationList
                    }
                  >
                    {notifications.map(
                      (notification) => (
                        <article
                          key={
                            notification.id
                          }
                          className={`${styles.notificationItem} ${
                            notification.unread
                              ? styles.notificationItemUnread
                              : ""
                          }`}
                        >
                          <span
                            className={
                              styles.notificationIcon
                            }
                          >
                            <Bell size={16} />
                          </span>

                          <div>
                            <strong>
                              {
                                notification.title
                              }
                            </strong>

                            <p>
                              {
                                notification.description
                              }
                            </p>

                            <small>
                              {
                                notification.time
                              }
                            </small>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className={
                styles.headerDropdownWrapper
              }
            >
              <button
                type="button"
                className={styles.profileButton}
                onClick={() => {
                  setIsProfileMenuOpen(
                    (previousValue) =>
                      !previousValue
                  );

                  setIsNotificationMenuOpen(
                    false
                  );
                }}
              >
                <span
                  className={styles.headerAvatar}
                >
                  {getInitials(
                    connectedUser
                  )}
                </span>

                <div
                  className={
                    styles.profileButtonText
                  }
                >
                  <strong>
                    {getFullName(
                      connectedUser
                    )}
                  </strong>

                  <span>
                    Super Admin
                  </span>
                </div>

                <ChevronDown size={16} />
              </button>

              {isProfileMenuOpen && (
                <div
                  className={
                    styles.profileMenu
                  }
                >
                  <div
                    className={
                      styles.profileMenuHeader
                    }
                  >
                    <span
                      className={
                        styles.profileMenuAvatar
                      }
                    >
                      {getInitials(
                        connectedUser
                      )}
                    </span>

                    <div>
                      <strong>
                        {getFullName(
                          connectedUser
                        )}
                      </strong>

                      <span>
                        {
                          connectedUser.email
                        }
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/dashboard/admin/settings"
                    onClick={() =>
                      setIsProfileMenuOpen(
                        false
                      )
                    }
                  >
                    <Settings size={17} />
                    Paramètres
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                  >
                    <LogOut size={17} />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* =================================================
            CORPS
        ================================================= */}

        <div className={styles.mainContent}>
          <section
            className={styles.pageHeading}
          >
            <div>
              <span
                className={
                  styles.pageEyebrow
                }
              >
                <ShieldCheck size={15} />
                Super Administration
              </span>

              <h1>
                Bonjour,{" "}
                {connectedUser.first_name ||
                  "Administrateur"}
              </h1>

              <p>
                Voici un aperçu des opérations
                de Glory Solutions.
              </p>
            </div>

            <button
              type="button"
              className={styles.refreshButton}
              onClick={() =>
                void loadDashboardData()
              }
            >
              <Activity size={17} />
              Actualiser
            </button>
          </section>

          {errorMessage && (
            <div
              className={styles.errorBanner}
              role="alert"
            >
              <AlertTriangle size={19} />

              <span>{errorMessage}</span>

              <button
                type="button"
                onClick={() =>
                  setErrorMessage("")
                }
              >
                <X size={17} />
              </button>
            </div>
          )}

          {successMessage && (
            <div
              className={styles.successBanner}
              role="status"
            >
              <CheckCircle2 size={19} />

              <span>{successMessage}</span>

              <button
                type="button"
                onClick={() =>
                  setSuccessMessage("")
                }
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* STATISTIQUES */}

          <section className={styles.statsGrid}>
            <StatCard
              title="Utilisateurs actifs"
              value={activeUsers.length}
              description="Comptes autorisés"
              icon={Users}
              trend="+12 %"
              variant="dark"
            />

            <StatCard
              title="Demandes en attente"
              value={pendingUsers.length}
              description="À vérifier"
              icon={Clock3}
              trend={
                pendingUsers.length > 0
                  ? "Action requise"
                  : "À jour"
              }
              variant="warning"
            />

            <StatCard
              title="Clients"
              value={dashboardData.clients.length}
              description="Clients enregistrés"
              icon={Building2}
              trend="+8 %"
              variant="primary"
            />

            <StatCard
              title="Chauffeurs disponibles"
              value={availableDrivers.length}
              description={`${dashboardData.drivers.length} au total`}
              icon={Truck}
              trend="Opérations"
              variant="info"
            />

            <StatCard
              title="Commandes en cours"
              value={activeOrders.length}
              description="À traiter"
              icon={PackageCheck}
              trend={`${completedOrders.length} terminées`}
              variant="success"
            />

            <StatCard
              title="Revenus du mois"
              value={formatMoney(
                monthlyRevenue
              )}
              description="Commandes terminées"
              icon={CircleDollarSign}
              trend="CAD"
              variant="money"
            />
          </section>

          {/* GRAPHIQUES */}

          <section
            className={styles.analyticsGrid}
          >
            <article
              className={`${styles.panel} ${styles.ordersChartPanel}`}
            >
              <div
                className={styles.panelHeader}
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
                    Commandes des 7 derniers
                    jours
                  </h2>
                </div>

                <span
                  className={
                    styles.panelHeaderBadge
                  }
                >
                  Cette semaine
                </span>
              </div>

              <div className={styles.barChart}>
                {weeklyOrderData.map(
                  (day) => (
                    <div
                      key={day.date.toISOString()}
                      className={
                        styles.barChartItem
                      }
                    >
                      <span
                        className={
                          styles.barChartValue
                        }
                      >
                        {day.value}
                      </span>

                      <div
                        className={
                          styles.barChartTrack
                        }
                      >
                        <span
                          className={
                            styles.barChartBar
                          }
                          style={{
                            height: `${Math.max(
                              day.percentage,
                              day.value > 0
                                ? 12
                                : 3
                            )}%`,
                          }}
                        />
                      </div>

                      <span
                        className={
                          styles.barChartLabel
                        }
                      >
                        {day.label}
                      </span>
                    </div>
                  )
                )}
              </div>
            </article>

            <article
              className={`${styles.panel} ${styles.rolesPanel}`}
            >
              <div
                className={styles.panelHeader}
              >
                <div>
                  <span
                    className={
                      styles.panelEyebrow
                    }
                  >
                    Utilisateurs
                  </span>

                  <h2>
                    Répartition par rôle
                  </h2>
                </div>
              </div>

              <div
                className={
                  styles.rolesContent
                }
              >
                <div
                  className={
                    styles.donutChart
                  }
                  style={
                    {
                      background:
                        donutBackground,
                    } as CSSProperties
                  }
                >
                  <div
                    className={
                      styles.donutCenter
                    }
                  >
                    <strong>
                      {
                        dashboardData.users
                          .length
                      }
                    </strong>

                    <span>Total</span>
                  </div>
                </div>

                <div
                  className={
                    styles.chartLegend
                  }
                >
                  <LegendItem
                    className={
                      styles.legendPrimary
                    }
                    label="Clients"
                    value={
                      usersByRole.counts
                        .client
                    }
                  />

                  <LegendItem
                    className={
                      styles.legendSecondary
                    }
                    label="Chauffeurs"
                    value={
                      usersByRole.counts
                        .driver
                    }
                  />

                  <LegendItem
                    className={
                      styles.legendWarning
                    }
                    label="Dispatchers"
                    value={
                      usersByRole.counts
                        .dispatcher
                    }
                  />

                  <LegendItem
                    className={
                      styles.legendDark
                    }
                    label="Administrateurs"
                    value={
                      usersByRole.counts
                        .super_admin
                    }
                  />
                </div>
              </div>
            </article>
          </section>

          {/* DEMANDES + SYSTÈME */}

          <section
            className={styles.tablesGrid}
          >
            <article
              className={`${styles.panel} ${styles.pendingPanel}`}
            >
              <div
                className={styles.panelHeader}
              >
                <div>
                  <span
                    className={
                      styles.panelEyebrow
                    }
                  >
                    Approbations
                  </span>

                  <h2>
                    Demandes en attente
                  </h2>
                </div>

                <Link
                  href="/dashboard/admin/pending-users"
                  className={
                    styles.panelHeaderLink
                  }
                >
                  Tout afficher
                  <ChevronRight size={16} />
                </Link>
              </div>

              {filteredPendingUsers.length ===
              0 ? (
                <div
                  className={styles.emptyState}
                >
                  <UserCheck size={32} />

                  <strong>
                    Aucune demande en attente
                  </strong>

                  <p>
                    Toutes les inscriptions ont
                    été traitées.
                  </p>
                </div>
              ) : (
                <div
                  className={
                    styles.tableWrapper
                  }
                >
                  <table
                    className={
                      styles.dashboardTable
                    }
                  >
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Contact</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPendingUsers.map(
                        (user) => (
                          <tr key={user.id}>
                            <td>
                              <div
                                className={
                                  styles.tableUser
                                }
                              >
                                <span>
                                  {`${user.first_name?.charAt(
                                    0
                                  ) || ""}${user.last_name?.charAt(
                                    0
                                  ) || ""}`.toUpperCase()}
                                </span>

                                <div>
                                  <strong>
                                    {
                                      user.first_name
                                    }{" "}
                                    {
                                      user.last_name
                                    }
                                  </strong>

                                  <small>
                                    {user.company_name ||
                                      "Client particulier"}
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
                                  {user.email}
                                </span>

                                <small>
                                  {user.phone ||
                                    "Téléphone non fourni"}
                                </small>
                              </div>
                            </td>

                            <td>
                              <span
                                className={
                                  styles.dateCell
                                }
                              >
                                {formatDate(
                                  user.created_at
                                )}

                                <small>
                                  {formatTime(
                                    user.created_at
                                  )}
                                </small>
                              </span>
                            </td>

                            <td>
                              <div
                                className={
                                  styles.tableActions
                                }
                              >
                                <button
                                  type="button"
                                  className={
                                    styles.approveButton
                                  }
                                  onClick={() =>
                                    void updateUserStatus(
                                      user.id,
                                      "active"
                                    )
                                  }
                                  disabled={
                                    actionUserId ===
                                    user.id
                                  }
                                >
                                  {actionUserId ===
                                  user.id ? (
                                    <Loader2
                                      size={16}
                                      className={
                                        styles.smallLoader
                                      }
                                    />
                                  ) : (
                                    <CheckCircle2
                                      size={16}
                                    />
                                  )}

                                  Approuver
                                </button>

                                <button
                                  type="button"
                                  className={
                                    styles.rejectButton
                                  }
                                  onClick={() =>
                                    void updateUserStatus(
                                      user.id,
                                      "rejected"
                                    )
                                  }
                                  disabled={
                                    actionUserId ===
                                    user.id
                                  }
                                >
                                  <XCircle
                                    size={16}
                                  />
                                  Refuser
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article
              className={`${styles.panel} ${styles.systemPanel}`}
            >
              <div
                className={styles.panelHeader}
              >
                <div>
                  <span
                    className={
                      styles.panelEyebrow
                    }
                  >
                    Infrastructure
                  </span>

                  <h2>
                    État du système
                  </h2>
                </div>

                <span
                  className={
                    styles.systemHealthyBadge
                  }
                >
                  <span />
                  Opérationnel
                </span>
              </div>

              <div
                className={styles.systemList}
              >
                <SystemStatus
                  label="API Backend"
                  value="Connectée"
                  healthy
                />

                <SystemStatus
                  label="Base Aiven MySQL"
                  value="Connectée"
                  healthy
                />

                <SystemStatus
                  label="Utilisateurs"
                  value={`${dashboardData.users.length} comptes`}
                  healthy
                />

                <SystemStatus
                  label="Commandes"
                  value={`${dashboardData.orders.length} enregistrées`}
                  healthy
                />

                <SystemStatus
                  label="Incidents"
                  value={`${incidentOrders.length} ouvert(s)`}
                  healthy={
                    incidentOrders.length === 0
                  }
                />

                <SystemStatus
                  label="Cloudinary"
                  value="À configurer"
                  healthy={false}
                />
              </div>

              <Link
                href="/dashboard/admin/settings"
                className={
                  styles.systemDetailsLink
                }
              >
                Voir les paramètres
               
              </Link>
            </article>
          </section>

          {/* COMMANDES RÉCENTES */}

          <section
            className={`${styles.panel} ${styles.recentOrdersPanel}`}
          >
            <div
              className={styles.panelHeader}
            >
              <div>
                <span
                  className={
                    styles.panelEyebrow
                  }
                >
                  Opérations
                </span>

                <h2>
                  Commandes récentes
                </h2>
              </div>

              <Link
                href="/dashboard/admin/orders"
                className={
                  styles.panelHeaderLink
                }
              >
                Toutes les commandes
                <ChevronRight size={16} />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div
                className={styles.emptyState}
              >
                <PackageCheck size={32} />

                <strong>
                  Aucune commande
                </strong>

                <p>
                  Les nouvelles commandes
                  apparaîtront ici.
                </p>
              </div>
            ) : (
              <div
                className={
                  styles.tableWrapper
                }
              >
                <table
                  className={
                    styles.dashboardTable
                  }
                >
                  <thead>
                    <tr>
                      <th>Commande</th>
                      <th>Client</th>
                      <th>Chauffeur</th>
                      <th>Destination</th>
                      <th>Statut</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentOrders.map(
                      (order) => (
                        <tr key={order.id}>
                          <td>
                            <strong
                              className={
                                styles.orderNumber
                              }
                            >
                              {order.order_number ||
                                `CMD-${order.id}`}
                            </strong>
                          </td>

                          <td>
                            {getClientName(
                              order
                            )}
                          </td>

                          <td>
                            {getDriverName(
                              order
                            )}
                          </td>

                          <td>
                            <span
                              className={
                                styles.addressCell
                              }
                              title={
                                order.delivery_address
                              }
                            >
                              {order.delivery_address ||
                                "Non définie"}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`${styles.statusBadge} ${getStatusClass(
                                order.status
                              )}`}
                            >
                              {getOrderStatusLabel(
                                order.status
                              )}
                            </span>
                          </td>

                          <td>
                            {formatDate(
                              order.created_at ||
                                order.pickup_date
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

/* =====================================================
   SOUS-COMPOSANTS
===================================================== */

type StatCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{
    size?: number;
  }>;
  trend: string;
  variant:
    | "dark"
    | "warning"
    | "primary"
    | "info"
    | "success"
    | "money";
};

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant,
}: StatCardProps) {
  return (
    <article
      className={`${styles.statCard} ${
        styles[
          `statCard${variant
            .charAt(0)
            .toUpperCase()}${variant.slice(1)}`
        ]
      }`}
    >
      <div className={styles.statCardTop}>
        <span
          className={styles.statCardIcon}
        >
          <Icon size={20} />
        </span>

        <span
          className={styles.statCardTrend}
        >
          {trend}
        </span>
      </div>

      <span className={styles.statCardTitle}>
        {title}
      </span>

      <strong className={styles.statCardValue}>
        {value}
      </strong>

      <span
        className={
          styles.statCardDescription
        }
      >
        {description}
      </span>
    </article>
  );
}

type LegendItemProps = {
  className: string;
  label: string;
  value: number;
};

function LegendItem({
  className,
  label,
  value,
}: LegendItemProps) {
  return (
    <div className={styles.legendItem}>
      <span
        className={`${styles.legendDot} ${className}`}
      />

      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

type SystemStatusProps = {
  label: string;
  value: string;
  healthy: boolean;
};

function SystemStatus({
  label,
  value,
  healthy,
}: SystemStatusProps) {
  return (
    <div className={styles.systemStatusRow}>
      <div>
        <span
          className={
            healthy
              ? styles.systemStatusHealthy
              : styles.systemStatusWarning
          }
        />

        <strong>{label}</strong>
      </div>

      <span
        className={
          healthy
            ? styles.systemValueHealthy
            : styles.systemValueWarning
        }
      >
        {value}
      </span>
    </div>
  );
}
"use client";

import {
  Bell,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Info,
  LogOut,
  Menu,
  Search,
  Settings,
  TriangleAlert,
  X,
} from "lucide-react";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  ConnectedUser,
  getFullName,
  getInitials,
} from "./types";

import styles from "./admin-components.module.css";

/* ============================================================
   CONFIG
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.glorysolutions.ca";

/* ============================================================
   TYPES
============================================================ */

type Props = {
  connectedUser: ConnectedUser;
  onOpenMobileMenu: () => void;
  onLogout: () => void;
};

type NotificationLevel =
  | "info"
  | "success"
  | "warning"
  | "urgent";

type NotificationItem = {
  id: number;

  user_id?: number | null;
  audience_role?: string | null;

  type?: string | null;

  level?: NotificationLevel | null;

  title: string;
  message: string;

  entity_type?: string | null;
  entity_id?: number | null;

  action_url?: string | null;

  is_read?: number | boolean | null;

  read_at?: string | null;

  email_sent?: number | boolean | null;

  created_at?: string | null;
};

type NotificationsResponse = {
  success?: boolean;
  notifications?: NotificationItem[];
  data?: NotificationItem[];
  unreadCount?: number;
  message?: string;
};

/* ============================================================
   HELPERS
============================================================ */

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("glory_token") ||
    ""
  );
}

function isUnread(
  notification: NotificationItem,
) {
  return (
    notification.is_read === 0 ||
    notification.is_read === false ||
    notification.is_read === null ||
    notification.is_read === undefined
  );
}

function formatNotificationDate(
  value?: string | null,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const now =
    Date.now();

  const diff =
    now - date.getTime();

  const minutes =
    Math.floor(
      diff / 60000,
    );

  if (minutes < 1) {
    return "À l’instant";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (hours < 24) {
    return `${hours} h`;
  }

  const days =
    Math.floor(
      hours / 24,
    );

  if (days < 7) {
    return `${days} j`;
  }

  return new Intl.DateTimeFormat(
    "fr-CA",
    {
      day: "2-digit",
      month: "short",
    },
  ).format(date);
}

function getLevelIcon(
  level?: NotificationLevel | null,
) {
  switch (level) {
    case "success":
      return CircleCheck;

    case "warning":
      return TriangleAlert;

    case "urgent":
      return CircleAlert;

    default:
      return Info;
  }
}

/* ============================================================
   COMPONENT
============================================================ */

export default function AdminHeader({
  connectedUser,
  onOpenMobileMenu,
  onLogout,
}: Props) {
  const router =
    useRouter();

  const notificationWrapperRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const profileWrapperRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const [
    notificationOpen,
    setNotificationOpen,
  ] = useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState<
    NotificationItem[]
  >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    notificationLoading,
    setNotificationLoading,
  ] = useState(false);

  const [
    notificationError,
    setNotificationError,
  ] = useState("");

  /* ==========================================================
     FETCH AUTHENTIFIÉ
  ========================================================== */

  const authenticatedFetch =
    useCallback(
      async (
        endpoint: string,
        options: RequestInit = {},
      ) => {
        const token =
          getToken();

        if (!token) {
          throw new Error(
            "Token manquant.",
          );
        }

        const response =
          await fetch(
            `${API_URL}${endpoint}`,
            {
              ...options,

              headers: {
                Accept:
                  "application/json",

                Authorization:
                  `Bearer ${token}`,

                ...(options.body
                  ? {
                      "Content-Type":
                        "application/json",
                    }
                  : {}),

                ...options.headers,
              },

              cache:
                "no-store",
            },
          );

        let result: any = {};

        try {
          result =
            await response.json();
        } catch {
          result = {};
        }

        if (
          response.status === 401
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
            "Session expirée.",
          );
        }

        if (!response.ok) {
          throw new Error(
            result?.message ||
              "Une erreur est survenue.",
          );
        }

        return result;
      },
      [router],
    );

  /* ==========================================================
     LOAD NOTIFICATIONS
  ========================================================== */

  const loadNotifications =
    useCallback(async () => {
      try {
        setNotificationLoading(
          true,
        );

        setNotificationError(
          "",
        );

        const result =
          (await authenticatedFetch(
            "/api/notifications?limit=20",
          )) as NotificationsResponse;

        const list =
          Array.isArray(
            result.notifications,
          )
            ? result.notifications
            : Array.isArray(
                  result.data,
                )
              ? result.data
              : [];

        setNotifications(
          list,
        );

        setUnreadCount(
          Number(
            result.unreadCount ||
              0,
          ),
        );
      } catch (error) {
        setNotificationError(
          error instanceof Error
            ? error.message
            : "Impossible de charger les notifications.",
        );
      } finally {
        setNotificationLoading(
          false,
        );
      }
    }, [
      authenticatedFetch,
    ]);

  /* ==========================================================
     LOAD COUNT
  ========================================================== */

  const loadUnreadCount =
    useCallback(async () => {
      try {
        const result =
          await authenticatedFetch(
            "/api/notifications/unread-count",
          );

        setUnreadCount(
          Number(
            result?.unreadCount ||
              0,
          ),
        );
      } catch {
        // On laisse le header fonctionner
        // même si le compteur échoue.
      }
    }, [
      authenticatedFetch,
    ]);

  /* ==========================================================
     INITIAL LOAD + POLLING
  ========================================================== */

  useEffect(() => {
    void loadUnreadCount();

    const interval =
      window.setInterval(
        () => {
          void loadUnreadCount();

          if (
            notificationOpen
          ) {
            void loadNotifications();
          }
        },
        30000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    loadUnreadCount,
    loadNotifications,
    notificationOpen,
  ]);

  /* ==========================================================
     CLICK OUTSIDE
  ========================================================== */

  useEffect(() => {
    const handleClickOutside =
      (
        event: MouseEvent,
      ) => {
        const target =
          event.target as Node;

        if (
          notificationWrapperRef
            .current &&
          !notificationWrapperRef.current.contains(
            target,
          )
        ) {
          setNotificationOpen(
            false,
          );
        }

        if (
          profileWrapperRef.current &&
          !profileWrapperRef.current.contains(
            target,
          )
        ) {
          setProfileOpen(
            false,
          );
        }
      };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  /* ==========================================================
     SEARCH
  ========================================================== */

  const handleSearch =
    (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      const value =
        searchTerm.trim();

      if (!value) {
        return;
      }

      router.push(
        `/dashboard/admin/users?search=${encodeURIComponent(
          value,
        )}`,
      );
    };

  /* ==========================================================
     OPEN / CLOSE NOTIFICATIONS
  ========================================================== */

  const toggleNotifications =
    async () => {
      const next =
        !notificationOpen;

      setNotificationOpen(
        next,
      );

      setProfileOpen(
        false,
      );

      if (next) {
        await loadNotifications();
      }
    };

  /* ==========================================================
     MARK ONE READ
  ========================================================== */

  const markAsRead =
    async (
      notification: NotificationItem,
    ) => {
      if (
        !isUnread(
          notification,
        )
      ) {
        return;
      }

      try {
        const result =
          await authenticatedFetch(
            `/api/notifications/${notification.id}/read`,
            {
              method:
                "PATCH",
            },
          );

        setNotifications(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                notification.id
                  ? {
                      ...item,
                      is_read:
                        true,
                      read_at:
                        new Date()
                          .toISOString(),
                    }
                  : item,
            ),
        );

        setUnreadCount(
          Number(
            result?.unreadCount ??
              Math.max(
                unreadCount - 1,
                0,
              ),
          ),
        );
      } catch (error) {
        setNotificationError(
          error instanceof Error
            ? error.message
            : "Impossible de marquer cette notification comme lue.",
        );
      }
    };

  /* ==========================================================
     MARK ALL READ
  ========================================================== */

  const markAllAsRead =
    async () => {
      try {
        await authenticatedFetch(
          "/api/notifications/read-all",
          {
            method:
              "PATCH",
          },
        );

        setNotifications(
          (current) =>
            current.map(
              (item) => ({
                ...item,
                is_read:
                  true,
                read_at:
                  item.read_at ||
                  new Date()
                    .toISOString(),
              }),
            ),
        );

        setUnreadCount(0);
      } catch (error) {
        setNotificationError(
          error instanceof Error
            ? error.message
            : "Impossible de modifier les notifications.",
        );
      }
    };

  /* ==========================================================
     OPEN NOTIFICATION
  ========================================================== */

  const openNotification =
    async (
      notification: NotificationItem,
    ) => {
      await markAsRead(
        notification,
      );

      setNotificationOpen(
        false,
      );

      if (
        notification.action_url
      ) {
        router.push(
          notification.action_url,
        );
      }
    };

  /* ==========================================================
     VISIBLE NOTIFICATIONS
  ========================================================== */

  const visibleNotifications =
    useMemo(
      () =>
        notifications.slice(
          0,
          10,
        ),
      [notifications],
    );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <header
      className={
        styles.topHeader
      }
    >
      {/* ======================================================
          LEFT
      ====================================================== */}

      <div
        className={
          styles.headerLeft
        }
      >
        <button
          type="button"
          className={
            styles.mobileMenu
          }
          onClick={
            onOpenMobileMenu
          }
          aria-label="Ouvrir le menu"
        >
          <Menu size={21} />
        </button>

        <form
          className={
            styles.searchForm
          }
          onSubmit={
            handleSearch
          }
        >
          <Search size={18} />

          <input
            type="search"
            placeholder="Rechercher un client, une commande..."
            value={
              searchTerm
            }
            onChange={(
              event,
            ) =>
              setSearchTerm(
                event.target
                  .value,
              )
            }
          />
        </form>
      </div>

      {/* ======================================================
          RIGHT
      ====================================================== */}

      <div
        className={
          styles.headerActions
        }
      >
        {/* ====================================================
            NOTIFICATIONS
        ==================================================== */}

        <div
          ref={
            notificationWrapperRef
          }
          className={
            styles.notificationWrapper
          }
        >
          <button
            type="button"
            className={
              styles.notificationButton
            }
            aria-label="Notifications"
            aria-expanded={
              notificationOpen
            }
            onClick={() =>
              void toggleNotifications()
            }
          >
            <Bell size={20} />

            {unreadCount >
              0 && (
              <span>
                {unreadCount >
                99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div
              className={
                styles.notificationMenu
              }
            >
              {/* HEADER */}

              <div
                className={
                  styles.notificationHeader
                }
              >
                <div>
                  <strong>
                    Notifications
                  </strong>

                  <span>
                    {unreadCount} non
                    lue
                    {unreadCount >
                    1
                      ? "s"
                      : ""}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setNotificationOpen(
                      false,
                    )
                  }
                  aria-label="Fermer"
                >
                  <X size={17} />
                </button>
              </div>

              {/* MARK ALL */}

              {unreadCount >
                0 && (
                <button
                  type="button"
                  className={
                    styles.markAllRead
                  }
                  onClick={() =>
                    void markAllAsRead()
                  }
                >
                  <CheckCheck
                    size={15}
                  />

                  Tout marquer comme lu
                </button>
              )}

              {/* LIST */}

              <div
                className={
                  styles.notificationList
                }
              >
                {notificationLoading &&
                visibleNotifications.length ===
                  0 ? (
                  <div
                    className={
                      styles.notificationState
                    }
                  >
                    Chargement...
                  </div>
                ) : notificationError &&
                  visibleNotifications.length ===
                    0 ? (
                  <div
                    className={
                      styles.notificationState
                    }
                  >
                    <CircleAlert
                      size={20}
                    />

                    <strong>
                      Erreur
                    </strong>

                    <span>
                      {
                        notificationError
                      }
                    </span>
                  </div>
                ) : visibleNotifications.length ===
                  0 ? (
                  <div
                    className={
                      styles.notificationState
                    }
                  >
                    <Bell
                      size={23}
                    />

                    <strong>
                      Aucune notification
                    </strong>

                    <span>
                      Les nouvelles
                      alertes apparaîtront
                      ici.
                    </span>
                  </div>
                ) : (
                  visibleNotifications.map(
                    (
                      notification,
                    ) => {
                      const Icon =
                        getLevelIcon(
                          notification.level,
                        );

                      const unread =
                        isUnread(
                          notification,
                        );

                      return (
                        <button
                          type="button"
                          key={
                            notification.id
                          }
                          className={`${styles.notificationItem} ${
                            unread
                              ? styles.notificationUnread
                              : ""
                          }`}
                          onClick={() =>
                            void openNotification(
                              notification,
                            )
                          }
                        >
                          <span
                            className={`${styles.notificationIcon} ${
                              styles[
                                `notification_${notification.level || "info"}`
                              ] ||
                              ""
                            }`}
                          >
                            <Icon
                              size={
                                17
                              }
                            />
                          </span>

                          <span
                            className={
                              styles.notificationContent
                            }
                          >
                            <span
                              className={
                                styles.notificationTopLine
                              }
                            >
                              <strong>
                                {
                                  notification.title
                                }
                              </strong>

                              <small>
                                {formatNotificationDate(
                                  notification.created_at,
                                )}
                              </small>
                            </span>

                            <span
                              className={
                                styles.notificationMessage
                              }
                            >
                              {
                                notification.message
                              }
                            </span>

                            {unread && (
                              <span
                                className={
                                  styles.unreadDot
                                }
                              />
                            )}
                          </span>
                        </button>
                      );
                    },
                  )
                )}
              </div>

              {/* FOOTER */}

              <Link
                href="/dashboard/admin/notifications"
                className={
                  styles.allNotificationsLink
                }
                onClick={() =>
                  setNotificationOpen(
                    false,
                  )
                }
              >
                Voir toutes les notifications
              </Link>
            </div>
          )}
        </div>

        {/* ====================================================
            PROFILE
        ==================================================== */}

        <div
          ref={
            profileWrapperRef
          }
          className={
            styles.profileWrapper
          }
        >
          <button
            type="button"
            className={
              styles.profileButton
            }
            onClick={() => {
              setProfileOpen(
                (value) =>
                  !value,
              );

              setNotificationOpen(
                false,
              );
            }}
          >
            <span
              className={
                styles.headerAvatar
              }
            >
              {getInitials(
                connectedUser,
              )}
            </span>

            <div
              className={
                styles.profileText
              }
            >
              <strong>
                {getFullName(
                  connectedUser,
                )}
              </strong>

              <span>
                Super Admin
              </span>
            </div>

            <ChevronDown
              size={16}
            />
          </button>

          {profileOpen && (
            <div
              className={
                styles.profileMenu
              }
            >
              <Link
                href="/dashboard/admin/settings"
                onClick={() =>
                  setProfileOpen(
                    false,
                  )
                }
              >
                <Settings
                  size={17}
                />

                Paramètres
              </Link>

              <button
                type="button"
                onClick={
                  onLogout
                }
              >
                <LogOut
                  size={17}
                />

                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
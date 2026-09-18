"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  X,
} from "lucide-react";

type Notification = {
  id: number;
  user_id: number | null;
  audience_role: string | null;
  type: string;
  level: "info" | "success" | "warning" | "urgent";
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: number | null;
  action_url: string | null;
  is_read: number | boolean;
  read_at?: string | null;
  email_sent?: number | boolean;
  created_at: string;
};

type NotificationsResponse = {
  success: boolean;
  data?: Notification[];
  notifications?: Notification[];
  unreadCount?: number;
  message?: string;
};

type ClientHeaderProps = {
  className?: string;
};

export default function ClientHeader({
  className = "",
}: ClientHeaderProps) {
  const router = useRouter();

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const [error, setError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  /* ============================================================
     TOKEN
  ============================================================ */

  const getToken = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("glory_token");
  }, []);

  /* ============================================================
     SESSION EXPIRÉE
  ============================================================ */

  const handleUnauthorized = useCallback(() => {
    try {
      localStorage.removeItem("glory_token");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    } catch {
      // Rien à faire.
    }

    window.location.href = "/login";
  }, []);

  /* ============================================================
     CHARGER LES NOTIFICATIONS
  ============================================================ */

  const loadNotifications = useCallback(
    async (showLoader = false) => {
      const token = getToken();

      if (!token) {
        setInitialLoading(false);
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          `${apiUrl}/api/notifications?limit=50&offset=0`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (response.status === 401 || response.status === 403) {
          handleUnauthorized();
          return;
        }

        const payload: NotificationsResponse | null =
          await response.json().catch(() => null);

        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.message ||
              "Impossible de récupérer les notifications."
          );
        }

        const list = Array.isArray(payload.notifications)
          ? payload.notifications
          : Array.isArray(payload.data)
          ? payload.data
          : [];

        setNotifications(list);
        setUnreadCount(Number(payload.unreadCount || 0));
      } catch (err) {
        console.error("Erreur notifications client :", err);

        setError(
          err instanceof Error
            ? err.message
            : "Impossible de récupérer les notifications."
        );
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [apiUrl, getToken, handleUnauthorized]
  );

  /* ============================================================
     CHARGER LE COMPTEUR
  ============================================================ */

  const loadUnreadCount = useCallback(async () => {
    const token = getToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `${apiUrl}/api/notifications/unread-count`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }

      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.success) {
        setUnreadCount(Number(payload.unreadCount || 0));
      }
    } catch (err) {
      console.error("Erreur compteur notifications :", err);
    }
  }, [apiUrl, getToken, handleUnauthorized]);

  /* ============================================================
     PREMIER CHARGEMENT
  ============================================================ */

  useEffect(() => {
    void loadNotifications(false);
  }, [loadNotifications]);

  /* ============================================================
     ACTUALISATION DU COMPTEUR

     Ceci permet déjà de récupérer de nouvelles notifications
     même avant de connecter Socket.IO au composant.
  ============================================================ */

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadUnreadCount();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadUnreadCount]);

  /* ============================================================
     FERMER EN CLIQUANT À L'EXTÉRIEUR
  ============================================================ */

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /* ============================================================
     ESC POUR FERMER
  ============================================================ */

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  /* ============================================================
     OUVRIR / FERMER
  ============================================================ */

  async function toggleNotifications() {
    const nextOpen = !open;

    setOpen(nextOpen);

    if (nextOpen) {
      await loadNotifications(true);
    }
  }

  /* ============================================================
     MARQUER UNE NOTIFICATION COMME LUE
  ============================================================ */

  async function markAsRead(notification: Notification) {
    if (Boolean(notification.is_read)) {
      return true;
    }

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return false;
    }

    try {
      const response = await fetch(
        `${apiUrl}/api/notifications/${notification.id}/read`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return false;
      }

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message ||
            "Impossible de marquer la notification comme lue."
        );
      }

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: 1,
                read_at: new Date().toISOString(),
              }
            : item
        )
      );

      setUnreadCount(Number(payload.unreadCount || 0));

      return true;
    } catch (err) {
      console.error("Erreur mark notification :", err);
      return false;
    }
  }

  /* ============================================================
     MARQUER TOUT COMME LU
  ============================================================ */

  async function markAllAsRead() {
    if (markingAll || unreadCount <= 0) {
      return;
    }

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setMarkingAll(true);

      const response = await fetch(
        `${apiUrl}/api/notifications/read-all`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message ||
            "Impossible de marquer les notifications comme lues."
        );
      }

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          is_read: 1,
          read_at: item.read_at || new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("Erreur read-all notifications :", err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier les notifications."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  /* ============================================================
     CLIC SUR UNE NOTIFICATION
  ============================================================ */

  async function handleNotificationClick(notification: Notification) {
    await markAsRead(notification);

    setOpen(false);

    if (notification.action_url) {
      if (notification.action_url.startsWith("/")) {
        router.push(notification.action_url);
      } else {
        window.location.href = notification.action_url;
      }
    }
  }

  /* ============================================================
     FORMAT DATE
  ============================================================ */

  function formatNotificationDate(value: string) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();
    const difference = now.getTime() - date.getTime();

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (difference >= 0 && difference < minute) {
      return "À l’instant";
    }

    if (difference >= minute && difference < hour) {
      const minutes = Math.floor(difference / minute);
      return `Il y a ${minutes} min`;
    }

    if (difference >= hour && difference < day) {
      const hours = Math.floor(difference / hour);
      return `Il y a ${hours} h`;
    }

    if (difference >= day && difference < day * 7) {
      const days = Math.floor(difference / day);
      return `Il y a ${days} j`;
    }

    return new Intl.DateTimeFormat("fr-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  /* ============================================================
     COULEUR SELON LE NIVEAU
  ============================================================ */

  function levelColor(level: Notification["level"]) {
    switch (level) {
      case "success":
        return "#168447";

      case "warning":
        return "#d97706";

      case "urgent":
        return "#ff003d";

      case "info":
      default:
        return "#2563eb";
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={styles.wrapper}
    >
      <button
        type="button"
        onClick={() => void toggleNotifications()}
        aria-label={`Notifications${
          unreadCount > 0 ? `, ${unreadCount} non lue(s)` : ""
        }`}
        aria-expanded={open}
        style={{
          ...styles.bellButton,
          ...(open ? styles.bellButtonOpen : {}),
        }}
      >
        {initialLoading ? (
          <Loader2
            size={18}
            style={{
              animation: "gloryNotificationSpin 1s linear infinite",
            }}
          />
        ) : (
          <Bell size={19} strokeWidth={1.9} />
        )}

        {unreadCount > 0 && (
          <span style={styles.counter}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={styles.panel}>
          {/* HEADER */}

          <div style={styles.panelHeader}>
            <div>
              <div style={styles.eyebrow}>GLORY SOLUTIONS</div>

              <div style={styles.titleRow}>
                <h3 style={styles.title}>Notifications</h3>

                {unreadCount > 0 && (
                  <span style={styles.unreadBadge}>
                    {unreadCount} non lue
                    {unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer les notifications"
              style={styles.closeButton}
            >
              <X size={18} />
            </button>
          </div>

          {/* ACTIONS */}

          <div style={styles.actions}>
            <span style={styles.actionInfo}>
              {notifications.length} notification
              {notifications.length > 1 ? "s" : ""}
            </span>

            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={markingAll || unreadCount === 0}
              style={{
                ...styles.readAllButton,
                opacity:
                  markingAll || unreadCount === 0
                    ? 0.45
                    : 1,
                cursor:
                  markingAll || unreadCount === 0
                    ? "default"
                    : "pointer",
              }}
            >
              {markingAll ? (
                <Loader2 size={14} />
              ) : (
                <CheckCheck size={15} />
              )}

              Tout marquer comme lu
            </button>
          </div>

          {/* CONTENU */}

          <div style={styles.list}>
            {loading ? (
              <div style={styles.stateBox}>
                <Loader2
                  size={24}
                  style={{
                    animation:
                      "gloryNotificationSpin 1s linear infinite",
                  }}
                />

                <span>Chargement...</span>
              </div>
            ) : error ? (
              <div style={styles.stateBox}>
                <strong style={styles.errorTitle}>
                  Impossible de charger les notifications
                </strong>

                <span style={styles.stateText}>{error}</span>

                <button
                  type="button"
                  onClick={() => void loadNotifications(true)}
                  style={styles.retryButton}
                >
                  Réessayer
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div style={styles.stateBox}>
                <div style={styles.emptyIcon}>
                  <Bell size={22} />
                </div>

                <strong style={styles.emptyTitle}>
                  Aucune notification
                </strong>

                <span style={styles.stateText}>
                  Les mises à jour de vos commandes apparaîtront ici.
                </span>
              </div>
            ) : (
              notifications.map((notification) => {
                const unread = !Boolean(notification.is_read);

                return (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() =>
                      void handleNotificationClick(notification)
                    }
                    style={{
                      ...styles.notificationItem,
                      background: unread ? "#fff8fa" : "#ffffff",
                    }}
                  >
                    <span
                      style={{
                        ...styles.levelIndicator,
                        background: levelColor(notification.level),
                      }}
                    />

                    <div style={styles.notificationBody}>
                      <div style={styles.notificationTop}>
                        <strong style={styles.notificationTitle}>
                          {notification.title}
                        </strong>

                        {unread ? (
                          <span
                            style={{
                              ...styles.unreadDot,
                              background: "#ff003d",
                            }}
                          />
                        ) : (
                          <Check
                            size={14}
                            color="#a0a0aa"
                          />
                        )}
                      </div>

                      <p style={styles.notificationMessage}>
                        {notification.message}
                      </p>

                      <div style={styles.notificationMeta}>
                        <span>
                          {formatNotificationDate(
                            notification.created_at
                          )}
                        </span>

                        {notification.entity_type && (
                          <>
                            <span>•</span>
                            <span>
                              {notification.entity_type === "order"
                                ? "Commande"
                                : notification.entity_type}
                            </span>
                          </>
                        )}

                        {notification.entity_id && (
                          <span>#{notification.entity_id}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* FOOTER */}

          <div style={styles.footer}>
            Les mises à jour de vos commandes sont disponibles ici.
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes gloryNotificationSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   STYLES

   Pour cette première étape ils sont directement dans le
   composant. Cela permet de tester sans modifier ton CSS actuel.
============================================================ */

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
  },

  bellButton: {
    position: "relative",
    width: "40px",
    height: "40px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #e6e6eb",
    borderRadius: "11px",
    background: "#ffffff",
    color: "#28282e",
    cursor: "pointer",
    transition: "all .18s ease",
  },

  bellButtonOpen: {
    borderColor: "#ffc0cf",
    background: "#fff7f9",
    color: "#ff003d",
  },

  counter: {
    position: "absolute",
    top: "-6px",
    right: "-7px",
    minWidth: "18px",
    height: "18px",
    padding: "0 5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #ffffff",
    borderRadius: "999px",
    background: "#ff003d",
    color: "#ffffff",
    fontSize: "9px",
    fontWeight: 900,
    lineHeight: 1,
    boxSizing: "border-box",
  },

  panel: {
    position: "absolute",
    top: "calc(100% + 12px)",
    right: 0,
    width: "min(420px, calc(100vw - 28px))",
    maxHeight: "620px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 9999,
    border: "1px solid #e8e8ed",
    borderRadius: "18px",
    background: "#ffffff",
    boxShadow:
      "0 22px 70px rgba(20, 20, 30, 0.16), 0 4px 14px rgba(20, 20, 30, 0.06)",
  },

  panelHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    padding: "20px 20px 16px",
    borderBottom: "1px solid #eeeeF2",
  },

  eyebrow: {
    marginBottom: "5px",
    color: "#ff003d",
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: "1.4px",
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "9px",
  },

  title: {
    margin: 0,
    color: "#18181d",
    fontSize: "18px",
    fontWeight: 900,
  },

  unreadBadge: {
    padding: "4px 7px",
    borderRadius: "7px",
    background: "#fff0f4",
    color: "#e50037",
    fontSize: "9px",
    fontWeight: 900,
  },

  closeButton: {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "1px solid #eeeeF2",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#777780",
    cursor: "pointer",
  },

  actions: {
    minHeight: "45px",
    padding: "0 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    borderBottom: "1px solid #eeeeF2",
    background: "#fafafa",
  },

  actionInfo: {
    color: "#92929b",
    fontSize: "10px",
    fontWeight: 700,
  },

  readAllButton: {
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: 0,
    background: "transparent",
    color: "#ff003d",
    fontSize: "10px",
    fontWeight: 900,
  },

  list: {
    minHeight: "120px",
    maxHeight: "440px",
    overflowY: "auto",
  },

  notificationItem: {
    position: "relative",
    width: "100%",
    padding: "16px 18px 16px 21px",
    display: "flex",
    alignItems: "stretch",
    gap: "13px",
    border: 0,
    borderBottom: "1px solid #f0f0f3",
    textAlign: "left",
    cursor: "pointer",
  },

  levelIndicator: {
    position: "absolute",
    top: "18px",
    left: "10px",
    width: "3px",
    height: "32px",
    borderRadius: "999px",
  },

  notificationBody: {
    minWidth: 0,
    width: "100%",
  },

  notificationTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  },

  notificationTitle: {
    color: "#222228",
    fontSize: "12.5px",
    fontWeight: 900,
    lineHeight: 1.4,
  },

  unreadDot: {
    width: "7px",
    height: "7px",
    minWidth: "7px",
    marginTop: "5px",
    borderRadius: "50%",
  },

  notificationMessage: {
    margin: "5px 0 0",
    color: "#696972",
    fontSize: "11.5px",
    lineHeight: 1.55,
  },

  notificationMeta: {
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "5px",
    color: "#a0a0a9",
    fontSize: "9.5px",
    fontWeight: 700,
  },

  stateBox: {
    minHeight: "180px",
    padding: "30px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    textAlign: "center",
    color: "#8b8b94",
  },

  emptyIcon: {
    width: "46px",
    height: "46px",
    marginBottom: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "14px",
    background: "#f5f5f7",
    color: "#9999a2",
  },

  emptyTitle: {
    color: "#333339",
    fontSize: "13px",
    fontWeight: 900,
  },

  errorTitle: {
    color: "#b42318",
    fontSize: "12px",
    fontWeight: 900,
  },

  stateText: {
    maxWidth: "290px",
    color: "#909099",
    fontSize: "10.5px",
    lineHeight: 1.5,
  },

  retryButton: {
    marginTop: "5px",
    minHeight: "34px",
    padding: "0 13px",
    border: "1px solid #dedee4",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#333339",
    fontSize: "10px",
    fontWeight: 900,
    cursor: "pointer",
  },

  footer: {
    padding: "11px 18px",
    borderTop: "1px solid #eeeeF2",
    background: "#fafafa",
    color: "#a0a0a9",
    fontSize: "9px",
    textAlign: "center",
  },
};
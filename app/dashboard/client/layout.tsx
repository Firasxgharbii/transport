"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

import {
  Bell,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";

import styles from "./dashboard.module.css";

type ClientLayoutProps = {
  children: ReactNode;
};

const navigation = [
  {
    label: "Vue d’ensemble",
    href: "/dashboard/client",
    icon: LayoutDashboard,
  },
  {
    label: "Mes commandes",
    href: "/dashboard/client/orders",
    icon: ClipboardList,
  },
  {
    label: "Mes demandes",
    href: "/dashboard/client/requests",
    icon: FileText,
  },
  {
    label: "Factures",
    href: "/dashboard/client/invoices",
    icon: FileText,
  },
  {
    label: "Documents",
    href: "/dashboard/client/documents",
    icon: FolderOpen,
  },
  {
    label: "Mon profil",
    href: "/dashboard/client/profile",
    icon: UserRound,
  },
];

export default function ClientLayout({
  children,
}: ClientLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const isActive = (
    href: string
  ) => {
    if (
      href === "/dashboard/client"
    ) {
      return (
        pathname ===
        "/dashboard/client"
      );
    }

    return pathname.startsWith(
      href
    );
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "authToken"
      );

      localStorage.removeItem(
        "user"
      );
    } catch {
      // Rien à faire si localStorage
      // n'est pas disponible.
    }

    router.push("/login");
  };

  return (
    <div className={styles.dashboard}>
      {/* ===================================================
          SIDEBAR MOBILE OVERLAY
      =================================================== */}

      {menuOpen && (
        <button
          type="button"
          className={
            styles.mobileOverlay
          }
          onClick={closeMenu}
          aria-label="Fermer le menu"
        />
      )}

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`${styles.sidebar} ${
          menuOpen
            ? styles.sidebarOpen
            : ""
        }`}
      >
        {/* LOGO */}

        <div
          className={
            styles.sidebarHeader
          }
        >
          <Link
            href="/dashboard/client"
            className={styles.brand}
            onClick={closeMenu}
          >
            <span
              className={
                styles.brandIcon
              }
            >
              G
            </span>

            <span
              className={
                styles.brandText
              }
            >
              <strong>
                Glory Solutions
              </strong>

              <small>
                Espace client
              </small>
            </span>
          </Link>

          <button
            type="button"
            className={
              styles.mobileClose
            }
            onClick={closeMenu}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION */}

        <nav
          className={
            styles.navigation
          }
        >
          <p
            className={
              styles.navigationTitle
            }
          >
            Navigation
          </p>

          <div
            className={
              styles.navigationList
            }
          >
            {navigation.map(
              (item) => {
                const Icon =
                  item.icon;

                const active =
                  isActive(
                    item.href
                  );

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={
                      closeMenu
                    }
                    className={`${
                      styles.navigationLink
                    } ${
                      active
                        ? styles.navigationLinkActive
                        : ""
                    }`}
                  >
                    <Icon
                      size={19}
                      strokeWidth={
                        1.8
                      }
                    />

                    <span>
                      {
                        item.label
                      }
                    </span>

                    {active && (
                      <ChevronRight
                        size={15}
                        className={
                          styles.activeArrow
                        }
                      />
                    )}
                  </Link>
                );
              }
            )}
          </div>
        </nav>

        {/* BAS SIDEBAR */}

        <div
          className={
            styles.sidebarFooter
          }
        >
          <div
            className={
              styles.profileCard
            }
          >
            <div
              className={
                styles.avatar
              }
            >
              CL
            </div>

            <div
              className={
                styles.profileInfo
              }
            >
              <strong>
                Client
              </strong>

              <span>
                Glory Solutions
              </span>
            </div>
          </div>

          <button
            type="button"
            className={
              styles.logoutButton
            }
            onClick={
              handleLogout
            }
          >
            <LogOut
              size={18}
            />

            <span>
              Déconnexion
            </span>
          </button>
        </div>
      </aside>

      {/* ===================================================
          MAIN
      =================================================== */}

      <div
        className={
          styles.mainArea
        }
      >
        {/* TOPBAR */}

        <header
          className={
            styles.topbar
          }
        >
          <div
            className={
              styles.topbarLeft
            }
          >
            <button
              type="button"
              className={
                styles.mobileMenu
              }
              onClick={() =>
                setMenuOpen(true)
              }
              aria-label="Ouvrir le menu"
            >
              <Menu size={21} />
            </button>

            <div
              className={
                styles.searchBox
              }
            >
              <Search
                size={18}
                className={
                  styles.searchIcon
                }
              />

              <input
                type="search"
                placeholder="Rechercher une commande..."
                className={
                  styles.searchInput
                }
              />
            </div>
          </div>

          <div
            className={
              styles.topbarRight
            }
          >
            <button
              type="button"
              className={
                styles.notificationButton
              }
              aria-label="Notifications"
            >
              <Bell
                size={19}
              />

              <span
                className={
                  styles.notificationDot
                }
              />
            </button>

            <div
              className={
                styles.topProfile
              }
            >
              <div
                className={
                  styles.topAvatar
                }
              >
                CL
              </div>

              <div
                className={
                  styles.topProfileInfo
                }
              >
                <strong>
                  Espace client
                </strong>

                <span>
                  Glory Solutions
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE */}

        <main
          className={
            styles.content
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
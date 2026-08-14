"use client";

import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { adminNavigationItems } from "./admin-navigation";
import {
  ConnectedUser,
  getFullName,
  getInitials,
} from "./types";
import styles from "./admin-components.module.css";

type Props = {
  connectedUser: ConnectedUser;
  pathname: string;
  collapsed: boolean;
  mobileOpen: boolean;
  pendingCount: number;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onLogout: () => void;
};

export default function AdminSidebar({
  connectedUser,
  pathname,
  collapsed,
  mobileOpen,
  pendingCount,
  onToggleCollapse,
  onCloseMobile,
  onLogout,
}: Props) {
  return (
    <aside
      className={`${styles.sidebar} ${
        collapsed ? styles.sidebarCollapsed : ""
      } ${mobileOpen ? styles.sidebarMobileOpen : ""}`}
    >
      <div className={styles.sidebarHeader}>
        <Link href="/dashboard/admin" className={styles.brand}>
          <Image
            src="/images/logo1.png"
            alt="Glory Solutions"
            width={38}
            height={38}
            priority
            className={styles.logo}
          />

          {!collapsed && (
            <div className={styles.brandText}>
              <strong>Glory Solutions</strong>
              <span>Administration</span>
            </div>
          )}
        </Link>

        <button
          type="button"
          className={styles.mobileClose}
          onClick={onCloseMobile}
          aria-label="Fermer le menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className={styles.navigation} aria-label="Navigation administrateur">
        {!collapsed && <span className={styles.sectionTitle}>Navigation</span>}

        {adminNavigationItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard/admin" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${
                active ? styles.navLinkActive : ""
              }`}
              onClick={onCloseMobile}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={19} />
              {!collapsed && <span>{item.label}</span>}

              {item.label === "Demandes" && pendingCount > 0 && (
                <span className={styles.badge}>{pendingCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.userCard}>
          <span className={styles.avatar}>{getInitials(connectedUser)}</span>

          {!collapsed && (
            <div>
              <strong>{getFullName(connectedUser)}</strong>
              <span>Super Admin</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.logout}
          onClick={onLogout}
          title="Déconnexion"
        >
          <LogOut size={18} />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>

      <button
        type="button"
        className={styles.collapseButton}
        onClick={onToggleCollapse}
        aria-label={
          collapsed
            ? "Agrandir la barre latérale"
            : "Réduire la barre latérale"
        }
      >
        {collapsed ? (
          <PanelLeftOpen size={18} />
        ) : (
          <PanelLeftClose size={18} />
        )}
      </button>
    </aside>
  );
}
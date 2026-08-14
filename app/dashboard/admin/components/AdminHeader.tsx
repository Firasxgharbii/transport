"use client";

import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ConnectedUser,
  getFullName,
  getInitials,
} from "./types";
import styles from "./admin-components.module.css";

type Props = {
  connectedUser: ConnectedUser;
  onOpenMobileMenu: () => void;
  onLogout: () => void;
};

export default function AdminHeader({
  connectedUser,
  onOpenMobileMenu,
  onLogout,
}: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = searchTerm.trim();

    if (!value) return;

    router.push(
      `/dashboard/admin/users?search=${encodeURIComponent(value)}`,
    );
  };

  return (
    <header className={styles.topHeader}>
      <div className={styles.headerLeft}>
        <button
          type="button"
          className={styles.mobileMenu}
          onClick={onOpenMobileMenu}
          aria-label="Ouvrir le menu"
        >
          <Menu size={21} />
        </button>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <Search size={18} />
          <input
            type="search"
            placeholder="Rechercher un client, une commande..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </form>
      </div>

      <div className={styles.headerActions}>
        <button
          type="button"
          className={styles.notificationButton}
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span>2</span>
        </button>

        <div className={styles.profileWrapper}>
          <button
            type="button"
            className={styles.profileButton}
            onClick={() => setProfileOpen((value) => !value)}
          >
            <span className={styles.headerAvatar}>
              {getInitials(connectedUser)}
            </span>

            <div className={styles.profileText}>
              <strong>{getFullName(connectedUser)}</strong>
              <span>Super Admin</span>
            </div>

            <ChevronDown size={16} />
          </button>

          {profileOpen && (
            <div className={styles.profileMenu}>
              <Link
                href="/dashboard/admin/settings"
                onClick={() => setProfileOpen(false)}
              >
                <Settings size={17} />
                Paramètres
              </Link>

              <button type="button" onClick={onLogout}>
                <LogOut size={17} />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import AdminHeader from "./components/AdminHeader";
import AdminSidebar from "./components/AdminSidebar";
import { ConnectedUser } from "./components/types";
import styles from "./admin-layout.module.css";

type Props = {
  children: React.ReactNode;
};

function readStoredUser(): ConnectedUser | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("glory_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ConnectedUser;
  } catch {
    return null;
  }
}

export default function AdminLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<ConnectedUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("glory_token");
    const storedUser = readStoredUser();

    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    if (storedUser.role !== "super_admin") {
      router.replace("/dashboard");
      return;
    }

    setUser(storedUser);
    setChecking(false);
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem("glory_token");
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    if (!token) return;

    fetch(`${apiUrl}/api/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((result) => {
        const users = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.users)
            ? result.users
            : [];

        setPendingCount(
          users.filter((item: { status?: string }) => item.status === "pending")
            .length,
        );
      })
      .catch(() => {
        setPendingCount(0);
      });
  }, [pathname]);

  const logout = () => {
    localStorage.removeItem("glory_token");
    localStorage.removeItem("glory_user");
    localStorage.removeItem("glory_remembered_email");
    router.replace("/login");
  };

  if (checking || !user) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingCard}>
          <span className={styles.spinner} />
          <h1>Chargement de l’administration</h1>
          <p>Vérification de votre session...</p>
        </div>
      </main>
    );
  }

  return (
    <div className={styles.shell}>
      {mobileOpen && (
        <button
          type="button"
          className={styles.mobileOverlay}
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      <AdminSidebar
        connectedUser={user}
        pathname={pathname}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        pendingCount={pendingCount}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={logout}
      />

      <div
        className={`${styles.workspace} ${
          collapsed ? styles.workspaceExpanded : ""
        }`}
      >
        <AdminHeader
          connectedUser={user}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onLogout={logout}
        />

        <div key={pathname} className={styles.pageTransition}>
          {children}
        </div>
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Loader2,
  RefreshCw,
  Search,
  Square,
  Truck,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import styles from "./dispatch.module.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.glorysolutions.ca";

type OrderStatus =
  | "pending"
  | "assigned"
  | "pickup_in_progress"
  | "picked_up"
  | "delivery_in_progress"
  | "arrived"
  | "completed"
  | "cancelled"
  | "incident";

type DispatchOrder = {
  id: number;
  order_number?: string | null;
  client_id?: number | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
  company_name?: string | null;
  driver_id?: number | null;
  driver_first_name?: string | null;
  driver_last_name?: string | null;
  vehicle_id?: number | null;
  vehicle_name?: string | null;
  vehicle_plate?: string | null;
  pickup_address?: string | null;
  delivery_address?: string | null;
  pickup_date?: string | null;
  pickup_time?: string | null;
  status?: OrderStatus | string | null;
  route_position?: number | null;
};

type Client = { id: number; first_name?: string | null; last_name?: string | null; company_name?: string | null };
type Driver = { id: number; first_name?: string | null; last_name?: string | null };
type Vehicle = { id: number; make?: string | null; model?: string | null; plate?: string | null };

type DispatchResponse = {
  data?: DispatchOrder[];
  orders?: DispatchOrder[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "En attente" },
  { value: "assigned", label: "Assignée" },
  { value: "pickup_in_progress", label: "Ramassage" },
  { value: "picked_up", label: "Ramassée" },
  { value: "delivery_in_progress", label: "En livraison" },
  { value: "arrived", label: "Arrivé" },
  { value: "completed", label: "Terminée" },
  { value: "incident", label: "Incident" },
  { value: "cancelled", label: "Annulée" },
];

function getToken() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("glory_token") ||
    sessionStorage.getItem("glory_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

function extractArray<T>(result: unknown, keys: string[]): T[] {
  if (Array.isArray(result)) return result as T[];
  if (!result || typeof result !== "object") return [];
  const obj = result as Record<string, unknown>;
  for (const key of keys) if (Array.isArray(obj[key])) return obj[key] as T[];
  return Array.isArray(obj.data) ? (obj.data as T[]) : [];
}

function clientName(order: DispatchOrder) {
  return (
    order.company_name ||
    [order.client_first_name, order.client_last_name].filter(Boolean).join(" ").trim() ||
    `Client #${order.client_id || "—"}`
  );
}

function driverName(order: DispatchOrder) {
  return (
    [order.driver_first_name, order.driver_last_name].filter(Boolean).join(" ").trim() ||
    "Non assigné"
  );
}

function statusLabel(status?: string | null) {
  return STATUSES.find((item) => item.value === status)?.label || status || "—";
}

function dateTime(date?: string | null, time?: string | null) {
  if (!date) return "—";
  return `${String(date).slice(0, 10)}${time ? ` · ${String(time).slice(0, 5)}` : ""}`;
}

export default function DispatchPage() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [bulkDriver, setBulkDriver] = useState("");
  const [bulkVehicle, setBulkVehicle] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const apiFetch = useCallback(async <T,>(endpoint: string, options: RequestInit = {}) => {
    const token = getToken();
    if (!token) throw new Error("Session expirée.");

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      cache: "no-store",
    });

    let result: unknown = null;
    try { result = await response.json(); } catch { result = null; }
    if (!response.ok) {
      throw new Error((result as { message?: string } | null)?.message || `Erreur API (${response.status}).`);
    }
    return result as T;
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search.trim()) params.set("search", search.trim());
    if (clientId) params.set("client_id", clientId);
    if (status) params.set("status", status);
    if (driverFilter) params.set("driver_id", driverFilter);
    return params.toString();
  }, [page, limit, search, clientId, status, driverFilter]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await apiFetch<DispatchResponse>(`/api/dispatch/orders?${queryString}`);
      setOrders(Array.isArray(result.orders) ? result.orders : Array.isArray(result.data) ? result.data : []);
      setTotal(result.pagination?.total || 0);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de charger le dispatch.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, queryString]);

  const loadReferenceData = useCallback(async () => {
    const results = await Promise.allSettled([
      apiFetch<unknown>("/api/clients"),
      apiFetch<unknown>("/api/drivers"),
      apiFetch<unknown>("/api/vehicles"),
    ]);
    if (results[0].status === "fulfilled") setClients(extractArray<Client>(results[0].value, ["clients"]));
    if (results[1].status === "fulfilled") setDrivers(extractArray<Driver>(results[1].value, ["drivers"]));
    if (results[2].status === "fulfilled") setVehicles(extractArray<Vehicle>(results[2].value, ["vehicles"]));
  }, [apiFetch]);

  useEffect(() => { void loadReferenceData(); }, [loadReferenceData]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders, search]);
  useEffect(() => { setPage(1); }, [search, clientId, status, driverFilter, limit]);

  const allPageSelected = orders.length > 0 && orders.every((order) => selected.has(order.id));

  const toggleOrder = (id: number) => setSelected((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const togglePage = () => setSelected((current) => {
    const next = new Set(current);
    orders.forEach((order) => allPageSelected ? next.delete(order.id) : next.add(order.id));
    return next;
  });

  const selectAllMatching = async () => {
    try {
      setSelectingAll(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (clientId) params.set("client_id", clientId);
      if (status) params.set("status", status);
      if (driverFilter) params.set("driver_id", driverFilter);
      const result = await apiFetch<{ ids?: number[]; data?: number[] }>(`/api/dispatch/order-ids?${params}`);
      const ids = Array.isArray(result.ids) ? result.ids : Array.isArray(result.data) ? result.data : [];
      setSelected(new Set(ids));
      setSuccess(`${ids.length} commande(s) sélectionnée(s).`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sélection impossible.");
    } finally {
      setSelectingAll(false);
    }
  };

  const applyBulk = async () => {
    if (!selected.size) return setError("Sélectionne au moins une commande.");
    const changes: Record<string, unknown> = {};
    if (bulkDriver) changes.driver_id = bulkDriver === "none" ? null : Number(bulkDriver);
    if (bulkVehicle) changes.vehicle_id = bulkVehicle === "none" ? null : Number(bulkVehicle);
    if (bulkStatus) changes.status = bulkStatus;
    if (!Object.keys(changes).length) return setError("Choisis une action à appliquer.");

    try {
      setSaving(true);
      setError("");
      await apiFetch("/api/dispatch/bulk", {
        method: "PATCH",
        body: JSON.stringify({ order_ids: Array.from(selected), changes }),
      });
      setSuccess(`${selected.size} commande(s) mise(s) à jour.`);
      setSelected(new Set());
      setBulkDriver(""); setBulkVehicle(""); setBulkStatus("");
      await loadOrders();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mise à jour massive impossible.");
    } finally {
      setSaving(false);
    }
  };

  const saveReorder = async (nextOrders: DispatchOrder[]) => {
    try {
      const base = (page - 1) * limit;
      await apiFetch("/api/dispatch/reorder", {
        method: "PATCH",
        body: JSON.stringify({
          items: nextOrders.map((order, index) => ({ id: order.id, route_position: base + index + 1 })),
        }),
      });
      setSuccess("Ordre enregistré.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Réorganisation impossible.");
      void loadOrders();
    }
  };

  const handleDrop = (targetId: number) => {
    if (!draggedId || draggedId === targetId) return setDraggedId(null);
    const from = orders.findIndex((item) => item.id === draggedId);
    const to = orders.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...orders];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrders(next);
    setDraggedId(null);
    void saveReorder(next);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}><Zap size={16} /> Dispatch Center</span>
          <h1>Planification rapide</h1>
          <p>Glisse les commandes, sélectionne 100+ commandes et applique les changements en masse.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/admin/orders" className={styles.secondaryBtn}>Commandes</Link>
          <button className={styles.refreshBtn} onClick={() => void loadOrders()} disabled={loading}>
            <RefreshCw size={17} className={loading ? styles.spin : ""} /> Actualiser
          </button>
        </div>
      </header>

      {error && <div className={styles.alertError}><span>{error}</span><button onClick={() => setError("")}><X size={16} /></button></div>}
      {success && <div className={styles.alertSuccess}><span>{success}</span><button onClick={() => setSuccess("")}><X size={16} /></button></div>}

      <section className={styles.filters}>
        <div className={styles.searchBox}><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Commande, client, adresse..." /></div>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Tous les clients</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || `Client #${c.id}`}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous les statuts</option>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        <select value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)}><option value="">Tous les chauffeurs</option>{drivers.map((d) => <option key={d.id} value={d.id}>{[d.first_name, d.last_name].filter(Boolean).join(" ") || `Chauffeur #${d.id}`}</option>)}</select>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}><option value={50}>50 / page</option><option value={100}>100 / page</option><option value={250}>250 / page</option></select>
      </section>

      <section className={styles.bulkBar}>
        <div className={styles.selectionInfo}>
          <strong>{selected.size}</strong><span>sélectionnée(s)</span>
          <button onClick={togglePage}>{allPageSelected ? <CheckSquare size={16} /> : <Square size={16} />} {allPageSelected ? "Désélectionner la page" : "Sélectionner la page"}</button>
          <button onClick={() => void selectAllMatching()} disabled={selectingAll}>{selectingAll ? <Loader2 size={16} className={styles.spin} /> : <CheckSquare size={16} />} Sélectionner les {total} résultats</button>
        </div>
        <div className={styles.bulkActions}>
          <select value={bulkDriver} onChange={(e) => setBulkDriver(e.target.value)}><option value="">Chauffeur...</option><option value="none">Désassigner</option>{drivers.map((d) => <option key={d.id} value={d.id}>{[d.first_name, d.last_name].filter(Boolean).join(" ") || `#${d.id}`}</option>)}</select>
          <select value={bulkVehicle} onChange={(e) => setBulkVehicle(e.target.value)}><option value="">Véhicule...</option><option value="none">Désassigner</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{[v.make, v.model].filter(Boolean).join(" ") || `#${v.id}`}{v.plate ? ` · ${v.plate}` : ""}</option>)}</select>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}><option value="">Statut...</option>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          <button className={styles.applyBtn} disabled={saving || !selected.size} onClick={() => void applyBulk()}>{saving ? <Loader2 size={17} className={styles.spin} /> : <Zap size={17} />} Appliquer</button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableHead}><strong>{total.toLocaleString("fr-CA")} commandes</strong><span>Glisse une ligne pour changer sa position.</span></div>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th></th><th></th><th>Position</th><th>Commande</th><th>Client</th><th>Livraison</th><th>Chauffeur</th><th>Véhicule</th><th>Statut</th><th>Date</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={10} className={styles.loadingCell}><Loader2 size={28} className={styles.spin} /> Chargement...</td></tr> : orders.length === 0 ? <tr><td colSpan={10} className={styles.emptyCell}>Aucune commande.</td></tr> : orders.map((order, index) => (
                <tr key={order.id} draggable onDragStart={() => setDraggedId(order.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(order.id)} className={draggedId === order.id ? styles.dragging : ""}>
                  <td className={styles.dragCol}><GripVertical size={18} /></td>
                  <td><button className={styles.checkBtn} onClick={() => toggleOrder(order.id)}>{selected.has(order.id) ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                  <td><span className={styles.position}>{order.route_position ?? ((page - 1) * limit + index + 1)}</span></td>
                  <td><Link className={styles.orderNumber} href={`/dashboard/admin/orders/${order.id}`}>{order.order_number || `#${order.id}`}</Link></td>
                  <td><div className={styles.personCell}><UserRound size={15} />{clientName(order)}</div></td>
                  <td><span className={styles.address}>{order.delivery_address || "—"}</span></td>
                  <td>{driverName(order)}</td>
                  <td><div className={styles.personCell}><Truck size={15} />{order.vehicle_name || "—"}{order.vehicle_plate ? ` · ${order.vehicle_plate}` : ""}</div></td>
                  <td><span className={`${styles.status} ${styles[`status_${order.status || "pending"}`] || ""}`}>{statusLabel(order.status)}</span></td>
                  <td>{dateTime(order.pickup_date, order.pickup_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className={styles.pagination}><span>Page {page} sur {totalPages}</span><div><button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={17} />Précédent</button><button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant<ChevronRight size={17} /></button></div></footer>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  History,
  Loader2,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Square,
  Trash2,
  Truck,
  UserRound,
  Warehouse,
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

type OperationType =
  | "pickup"
  | "warehouse_in"
  | "warehouse_storage"
  | "warehouse_out"
  | "delivery";

type OperationStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

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
  delivery_date?: string | null;
  delivery_time?: string | null;
  status?: OrderStatus | string | null;
  route_position?: number | null;
  operation_count?: number | string | null;
  pickup_operation_count?: number | string | null;
  warehouse_operation_count?: number | string | null;
  delivery_operation_count?: number | string | null;
  completed_operation_count?: number | string | null;
};

type Client = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
};

type Driver = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
};

type Vehicle = {
  id: number;
  make?: string | null;
  model?: string | null;
  plate?: string | null;
};

type OrderOperation = {
  id: number;
  order_id: number;
  operation_type: OperationType;
  driver_id?: number | null;
  vehicle_id?: number | null;
  warehouse_name?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  completed_at?: string | null;
  status: OperationStatus;
  route_position?: number | null;
  notes?: string | null;
  driver_first_name?: string | null;
  driver_last_name?: string | null;
  vehicle_name?: string | null;
  vehicle_plate?: string | null;
};

type TimelineItem = {
  id?: number | string | null;
  status?: string | null;
  old_status?: string | null;
  new_status?: string | null;
  reason?: string | null;
  comment?: string | null;
  created_at?: string | null;
  changed_by_name?: string | null;
  user_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type GlobalHistoryItem = TimelineItem & {
  history_key: string;
  order_id: number;
  order_number: string;
  client_name: string;
};

type OperationForm = {
  operation_type: OperationType;
  driver_id: string;
  vehicle_id: string;
  warehouse_name: string;
  scheduled_date: string;
  scheduled_time: string;
  status: OperationStatus;
  route_position: string;
  notes: string;
};

type DispatchResponse = {
  data?: DispatchOrder[];
  orders?: DispatchOrder[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

const OPERATION_TYPES: { value: OperationType; label: string }[] = [
  { value: "pickup", label: "Ramassage" },
  { value: "warehouse_in", label: "Entrée entrepôt" },
  { value: "warehouse_storage", label: "Stockage entrepôt" },
  { value: "warehouse_out", label: "Sortie entrepôt" },
  { value: "delivery", label: "Livraison" },
];

const OPERATION_STATUSES: { value: OperationStatus; label: string }[] = [
  { value: "pending", label: "En attente" },
  { value: "assigned", label: "Assignée" },
  { value: "in_progress", label: "En cours" },
  { value: "completed", label: "Terminée" },
  { value: "cancelled", label: "Annulée" },
];

const EMPTY_OPERATION_FORM: OperationForm = {
  operation_type: "pickup",
  driver_id: "",
  vehicle_id: "",
  warehouse_name: "",
  scheduled_date: "",
  scheduled_time: "",
  status: "pending",
  route_position: "",
  notes: "",
};

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
  for (const key of keys) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  return Array.isArray(obj.data) ? (obj.data as T[]) : [];
}

function clientName(order: DispatchOrder) {
  return (
    order.company_name ||
    [order.client_first_name, order.client_last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    `Client #${order.client_id || "—"}`
  );
}

function driverName(order: DispatchOrder) {
  return (
    [order.driver_first_name, order.driver_last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Non assigné"
  );
}

function operationDriverName(operation: OrderOperation) {
  return (
    [operation.driver_first_name, operation.driver_last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Non assigné"
  );
}

function statusLabel(status?: string | null) {
  return STATUSES.find((item) => item.value === status)?.label || status || "—";
}

function operationStatusLabel(status?: string | null) {
  return (
    OPERATION_STATUSES.find((item) => item.value === status)?.label ||
    status ||
    "—"
  );
}

function operationTypeLabel(type?: string | null) {
  return OPERATION_TYPES.find((item) => item.value === type)?.label || type || "—";
}

function dateTime(date?: string | null, time?: string | null) {
  if (!date) return "—";
  return `${String(date).slice(0, 10)}${
    time ? ` · ${String(time).slice(0, 5)}` : ""
  }`;
}

function asCount(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function historyDate(value?: string | null) {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function historyAction(item: TimelineItem) {
  if (item.old_status && item.new_status) {
    return `${statusLabel(item.old_status)} → ${statusLabel(item.new_status)}`;
  }
  if (item.new_status) return statusLabel(item.new_status);
  if (item.status) return statusLabel(item.status);
  return "Mise à jour";
}

function historyActor(item: TimelineItem) {
  const fullName = [item.first_name, item.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    item.changed_by_name ||
    item.user_name ||
    fullName ||
    item.email ||
    "Système"
  );
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
  const [positionInputs, setPositionInputs] = useState<Record<number, string>>({});
  const [positionSavingId, setPositionSavingId] = useState<number | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyProgress, setHistoryProgress] = useState({ loaded: 0, total: 0 });
  const [historyItems, setHistoryItems] = useState<GlobalHistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState("");

  const [activeOrder, setActiveOrder] = useState<DispatchOrder | null>(null);
  const [operations, setOperations] = useState<OrderOperation[]>([]);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationSaving, setOperationSaving] = useState(false);
  const [editingOperationId, setEditingOperationId] = useState<number | null>(null);
  const [operationForm, setOperationForm] =
    useState<OperationForm>(EMPTY_OPERATION_FORM);

  const apiFetch = useCallback(
    async <T,>(endpoint: string, options: RequestInit = {}) => {
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
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          (result as { message?: string } | null)?.message ||
            `Erreur API (${response.status}).`,
        );
      }

      return result as T;
    },
    [],
  );

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
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
      const result = await apiFetch<DispatchResponse>(
        `/api/dispatch/orders?${queryString}`,
      );
      const loadedOrders = Array.isArray(result.orders)
        ? result.orders
        : Array.isArray(result.data)
          ? result.data
          : [];

      setOrders(loadedOrders);

      const base = (page - 1) * limit;
      setPositionInputs(
        Object.fromEntries(
          loadedOrders.map((order, index) => [
            order.id,
            String(order.route_position ?? base + index + 1),
          ]),
        ),
      );

      setTotal(result.pagination?.total || 0);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible de charger le dispatch.",
      );
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

    if (results[0].status === "fulfilled") {
      setClients(extractArray<Client>(results[0].value, ["clients"]));
    }
    if (results[1].status === "fulfilled") {
      setDrivers(extractArray<Driver>(results[1].value, ["drivers"]));
    }
    if (results[2].status === "fulfilled") {
      setVehicles(extractArray<Vehicle>(results[2].value, ["vehicles"]));
    }
  }, [apiFetch]);

  const loadOperations = useCallback(
    async (orderId: number) => {
      try {
        setOperationsLoading(true);
        const result = await apiFetch<unknown>(
          `/api/dispatch/orders/${orderId}/operations`,
        );
        setOperations(
          extractArray<OrderOperation>(result, ["operations", "data"]),
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger les opérations.",
        );
      } finally {
        setOperationsLoading(false);
      }
    },
    [apiFetch],
  );

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders, search]);

  useEffect(() => {
    setPage(1);
  }, [search, clientId, status, driverFilter, limit]);

  const allPageSelected =
    orders.length > 0 && orders.every((order) => selected.has(order.id));

  const toggleOrder = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((current) => {
      const next = new Set(current);
      orders.forEach((order) => {
        if (allPageSelected) next.delete(order.id);
        else next.add(order.id);
      });
      return next;
    });
  };

  const selectAllMatching = async () => {
    try {
      setSelectingAll(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (clientId) params.set("client_id", clientId);
      if (status) params.set("status", status);
      if (driverFilter) params.set("driver_id", driverFilter);

      const result = await apiFetch<{ ids?: number[]; data?: number[] }>(
        `/api/dispatch/order-ids?${params}`,
      );
      const ids = Array.isArray(result.ids)
        ? result.ids
        : Array.isArray(result.data)
          ? result.data
          : [];
      setSelected(new Set(ids));
      setSuccess(`${ids.length} commande(s) sélectionnée(s).`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Sélection impossible.",
      );
    } finally {
      setSelectingAll(false);
    }
  };

  const applyBulk = async () => {
    if (!selected.size) {
      setError("Sélectionne au moins une commande.");
      return;
    }

    const changes: Record<string, unknown> = {};
    if (bulkDriver) {
      changes.driver_id = bulkDriver === "none" ? null : Number(bulkDriver);
    }
    if (bulkVehicle) {
      changes.vehicle_id = bulkVehicle === "none" ? null : Number(bulkVehicle);
    }
    if (bulkStatus) changes.status = bulkStatus;

    if (!Object.keys(changes).length) {
      setError("Choisis une action à appliquer.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await apiFetch("/api/dispatch/bulk", {
        method: "PATCH",
        body: JSON.stringify({
          order_ids: Array.from(selected),
          changes,
        }),
      });
      setSuccess(`${selected.size} commande(s) mise(s) à jour.`);
      setSelected(new Set());
      setBulkDriver("");
      setBulkVehicle("");
      setBulkStatus("");
      await loadOrders();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Mise à jour massive impossible.",
      );
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
          items: nextOrders.map((order, index) => ({
            id: order.id,
            route_position: base + index + 1,
          })),
        }),
      });
      setSuccess("Ordre enregistré.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Réorganisation impossible.",
      );
      void loadOrders();
    }
  };

  const syncLocalPositions = (nextOrders: DispatchOrder[]) => {
    const base = (page - 1) * limit;
    const positioned = nextOrders.map((order, index) => ({
      ...order,
      route_position: base + index + 1,
    }));

    setOrders(positioned);
    setPositionInputs(
      Object.fromEntries(
        positioned.map((order) => [order.id, String(order.route_position)]),
      ),
    );

    return positioned;
  };

  const moveOrderToPosition = async (orderId: number) => {
    const raw = positionInputs[orderId]?.trim() || "";
    const desiredPosition = Number(raw);
    const firstPosition = (page - 1) * limit + 1;
    const lastPosition = firstPosition + orders.length - 1;

    if (!Number.isInteger(desiredPosition)) {
      setError("Entre un numéro de position valide.");
      return;
    }

    if (desiredPosition < firstPosition || desiredPosition > lastPosition) {
      setError(
        `Sur cette page, choisis une position entre ${firstPosition} et ${lastPosition}.`,
      );
      return;
    }

    const from = orders.findIndex((item) => item.id === orderId);
    const to = desiredPosition - firstPosition;

    if (from < 0 || to < 0 || to >= orders.length) return;

    if (from === to) {
      setSuccess(`La commande est déjà en position ${desiredPosition}.`);
      return;
    }

    try {
      setPositionSavingId(orderId);
      setError("");

      const next = [...orders];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);

      const positioned = syncLocalPositions(next);
      await saveReorder(positioned);

      setSuccess(
        `Commande déplacée de la position ${firstPosition + from} à ${desiredPosition}.`,
      );
    } finally {
      setPositionSavingId(null);
    }
  };

  const handleDrop = (targetId: number) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const from = orders.findIndex((item) => item.id === draggedId);
    const to = orders.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;

    const next = [...orders];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    const positioned = syncLocalPositions(next);
    setDraggedId(null);
    void saveReorder(positioned);
  };

  const loadGlobalHistory = async () => {
    try {
      setHistoryOpen(true);
      setHistoryLoading(true);
      setHistoryItems([]);
      setHistorySearch("");
      setError("");

      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (clientId) params.set("client_id", clientId);
      if (status) params.set("status", status);
      if (driverFilter) params.set("driver_id", driverFilter);

      const idResult = await apiFetch<{ ids?: number[]; data?: number[] }>(
        `/api/dispatch/order-ids?${params}`,
      );

      const ids = Array.isArray(idResult.ids)
        ? idResult.ids
        : Array.isArray(idResult.data)
          ? idResult.data
          : [];

      setHistoryProgress({ loaded: 0, total: ids.length });

      const collected: GlobalHistoryItem[] = [];
      const batchSize = 10;

      for (let start = 0; start < ids.length; start += batchSize) {
        const batch = ids.slice(start, start + batchSize);

        const results = await Promise.allSettled(
          batch.map((id) =>
            apiFetch<{
              order?: DispatchOrder & { timeline?: TimelineItem[] };
              data?: DispatchOrder & { timeline?: TimelineItem[] };
            }>(`/api/orders/${id}`),
          ),
        );

        results.forEach((result, resultIndex) => {
          if (result.status !== "fulfilled") return;

          const received = result.value.order || result.value.data;
          if (!received) return;

          const timeline = Array.isArray(received.timeline)
            ? received.timeline
            : [];

          const number = received.order_number || `#${received.id}`;
          const name = clientName(received);

          timeline.forEach((item, timelineIndex) => {
            collected.push({
              ...item,
              history_key: `${received.id}-${String(
                item.id ?? timelineIndex,
              )}-${String(item.created_at ?? "")}`,
              order_id: received.id,
              order_number: number,
              client_name: name,
            });
          });
        });

        setHistoryProgress({
          loaded: Math.min(start + batch.length, ids.length),
          total: ids.length,
        });

        setHistoryItems(
          [...collected].sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
          }),
        );
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible de charger l’historique global.",
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const visibleHistoryItems = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return historyItems;

    return historyItems.filter((item) =>
      [
        item.order_number,
        item.client_name,
        item.old_status,
        item.new_status,
        item.status,
        item.reason,
        item.comment,
        item.changed_by_name,
        item.user_name,
        item.first_name,
        item.last_name,
        item.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [historyItems, historySearch]);

  const openOperations = async (order: DispatchOrder) => {
    setActiveOrder(order);
    setEditingOperationId(null);
    setOperationForm(EMPTY_OPERATION_FORM);
    setOperations([]);
    await loadOperations(order.id);
  };

  const closeOperations = () => {
    setActiveOrder(null);
    setOperations([]);
    setEditingOperationId(null);
    setOperationForm(EMPTY_OPERATION_FORM);
  };

  const startCreateOperation = (type: OperationType) => {
    setEditingOperationId(null);
    setOperationForm({
      ...EMPTY_OPERATION_FORM,
      operation_type: type,
      warehouse_name:
        type === "warehouse_in" ||
        type === "warehouse_storage" ||
        type === "warehouse_out"
          ? "Entrepôt Glory Solutions"
          : "",
    });
  };

  const startEditOperation = (operation: OrderOperation) => {
    setEditingOperationId(operation.id);
    setOperationForm({
      operation_type: operation.operation_type,
      driver_id: operation.driver_id ? String(operation.driver_id) : "",
      vehicle_id: operation.vehicle_id ? String(operation.vehicle_id) : "",
      warehouse_name: operation.warehouse_name || "",
      scheduled_date: operation.scheduled_date
        ? String(operation.scheduled_date).slice(0, 10)
        : "",
      scheduled_time: operation.scheduled_time
        ? String(operation.scheduled_time).slice(0, 5)
        : "",
      status: operation.status,
      route_position: operation.route_position
        ? String(operation.route_position)
        : "",
      notes: operation.notes || "",
    });
  };

  const saveOperation = async () => {
    if (!activeOrder) return;

    try {
      setOperationSaving(true);
      setError("");

      const payload = {
        operation_type: operationForm.operation_type,
        driver_id: operationForm.driver_id
          ? Number(operationForm.driver_id)
          : null,
        vehicle_id: operationForm.vehicle_id
          ? Number(operationForm.vehicle_id)
          : null,
        warehouse_name: operationForm.warehouse_name || null,
        scheduled_date: operationForm.scheduled_date || null,
        scheduled_time: operationForm.scheduled_time || null,
        status: operationForm.status,
        route_position: operationForm.route_position
          ? Number(operationForm.route_position)
          : null,
        notes: operationForm.notes || null,
      };

      if (editingOperationId) {
        await apiFetch(`/api/dispatch/operations/${editingOperationId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccess("Opération mise à jour.");
      } else {
        await apiFetch(`/api/dispatch/orders/${activeOrder.id}/operations`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Opération ajoutée.");
      }

      setEditingOperationId(null);
      setOperationForm(EMPTY_OPERATION_FORM);
      await Promise.all([loadOperations(activeOrder.id), loadOrders()]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible d’enregistrer l’opération.",
      );
    } finally {
      setOperationSaving(false);
    }
  };

  const deleteOperation = async (operationId: number) => {
    if (!activeOrder) return;
    if (!window.confirm("Supprimer cette opération ?")) return;

    try {
      setOperationSaving(true);
      await apiFetch(`/api/dispatch/operations/${operationId}`, {
        method: "DELETE",
      });
      setSuccess("Opération supprimée.");
      await Promise.all([loadOperations(activeOrder.id), loadOrders()]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible de supprimer l’opération.",
      );
    } finally {
      setOperationSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            <Zap size={16} /> Dispatch Center
          </span>
          <h1>Planification des opérations</h1>
          <p>
            Organise les commandes, les ramassages, l’entrepôt et les livraisons.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryBtn}
            onClick={() => void loadGlobalHistory()}
            disabled={historyLoading}
            type="button"
          >
            {historyLoading ? (
              <Loader2 size={17} className={styles.spin} />
            ) : (
              <History size={17} />
            )}
            Historique
          </button>
          <Link href="/dashboard/admin/orders" className={styles.secondaryBtn}>
            Commandes
          </Link>
          <button
            className={styles.refreshBtn}
            onClick={() => void loadOrders()}
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? styles.spin : ""} />
            Actualiser
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.alertError}>
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className={styles.alertSuccess}>
          <span>{success}</span>
          <button onClick={() => setSuccess("")} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
      )}

      <section className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Commande, client, adresse..."
          />
        </div>

        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Tous les clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.company_name ||
                [client.first_name, client.last_name].filter(Boolean).join(" ") ||
                `Client #${client.id}`}
            </option>
          ))}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
        >
          <option value="">Tous les chauffeurs</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {[driver.first_name, driver.last_name].filter(Boolean).join(" ") ||
                `Chauffeur #${driver.id}`}
            </option>
          ))}
        </select>

        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
          <option value={250}>250 / page</option>
        </select>
      </section>

      <section className={styles.bulkBar}>
        <div className={styles.selectionInfo}>
          <strong>{selected.size}</strong>
          <span>sélectionnée(s)</span>
          <button onClick={togglePage}>
            {allPageSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            {allPageSelected ? "Désélectionner la page" : "Sélectionner la page"}
          </button>
          <button
            onClick={() => void selectAllMatching()}
            disabled={selectingAll}
          >
            {selectingAll ? (
              <Loader2 size={16} className={styles.spin} />
            ) : (
              <CheckSquare size={16} />
            )}
            Sélectionner les {total} résultats
          </button>
        </div>

        <div className={styles.bulkActions}>
          <select
            value={bulkDriver}
            onChange={(e) => setBulkDriver(e.target.value)}
          >
            <option value="">Chauffeur principal...</option>
            <option value="none">Désassigner</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {[driver.first_name, driver.last_name]
                  .filter(Boolean)
                  .join(" ") || `#${driver.id}`}
              </option>
            ))}
          </select>

          <select
            value={bulkVehicle}
            onChange={(e) => setBulkVehicle(e.target.value)}
          >
            <option value="">Véhicule principal...</option>
            <option value="none">Désassigner</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {[vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
                  `#${vehicle.id}`}
                {vehicle.plate ? ` · ${vehicle.plate}` : ""}
              </option>
            ))}
          </select>

          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
          >
            <option value="">Statut commande...</option>
            {STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            className={styles.applyBtn}
            disabled={saving || !selected.size}
            onClick={() => void applyBulk()}
          >
            {saving ? (
              <Loader2 size={17} className={styles.spin} />
            ) : (
              <Zap size={17} />
            )}
            Appliquer
          </button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableHead}>
          <div>
            <strong>{total.toLocaleString("fr-CA")} commandes</strong>
            <span>Glisse une ligne pour changer sa position générale.</span>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th>Position</th>
                <th>Commande</th>
                <th>Client</th>
                <th>Livraison</th>
                <th>Chauffeur</th>
                <th>Véhicule</th>
                <th>Statut</th>
                <th>Opérations</th>
                <th>Planifier</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className={styles.loadingCell}>
                    <Loader2 size={28} className={styles.spin} /> Chargement...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={11} className={styles.emptyCell}>
                    Aucune commande.
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => {
                  const pickupCount = asCount(order.pickup_operation_count);
                  const warehouseCount = asCount(order.warehouse_operation_count);
                  const deliveryCount = asCount(order.delivery_operation_count);

                  return (
                    <tr
                      key={order.id}
                      draggable
                      onDragStart={() => setDraggedId(order.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(order.id)}
                      className={draggedId === order.id ? styles.dragging : ""}
                    >
                      <td className={styles.dragCol}>
                        <GripVertical size={18} />
                      </td>
                      <td>
                        <button
                          className={styles.checkBtn}
                          onClick={() => toggleOrder(order.id)}
                        >
                          {selected.has(order.id) ? (
                            <CheckSquare size={18} />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            minWidth: 112,
                          }}
                        >
                          <input
                            type="number"
                            min={(page - 1) * limit + 1}
                            max={(page - 1) * limit + orders.length}
                            value={
                              positionInputs[order.id] ??
                              String(
                                order.route_position ??
                                  (page - 1) * limit + index + 1,
                              )
                            }
                            onChange={(event) =>
                              setPositionInputs((current) => ({
                                ...current,
                                [order.id]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void moveOrderToPosition(order.id);
                              }
                            }}
                            aria-label={`Position de ${
                              order.order_number || `commande ${order.id}`
                            }`}
                            style={{
                              width: 62,
                              height: 34,
                              border: "1px solid #e5e7eb",
                              borderRadius: 8,
                              padding: "0 8px",
                              fontWeight: 700,
                              textAlign: "center",
                              background: "#fff",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => void moveOrderToPosition(order.id)}
                            disabled={positionSavingId === order.id}
                            title="Déplacer à cette position"
                            style={{
                              height: 34,
                              minWidth: 38,
                              border: "1px solid #e5e7eb",
                              borderRadius: 8,
                              background: "#fff",
                              cursor:
                                positionSavingId === order.id
                                  ? "wait"
                                  : "pointer",
                              fontWeight: 700,
                            }}
                          >
                            {positionSavingId === order.id ? (
                              <Loader2 size={15} className={styles.spin} />
                            ) : (
                              "OK"
                            )}
                          </button>
                        </div>
                      </td>
                      <td>
                        <Link
                          className={styles.orderNumber}
                          href={`/dashboard/admin/orders/${order.id}`}
                        >
                          {order.order_number || `#${order.id}`}
                        </Link>
                      </td>
                      <td>
                        <div className={styles.personCell}>
                          <UserRound size={15} />
                          {clientName(order)}
                        </div>
                      </td>
                      <td>
                        <span className={styles.address}>
                          {order.delivery_address || "—"}
                        </span>
                      </td>
                      <td>{driverName(order)}</td>
                      <td>
                        <div className={styles.personCell}>
                          <Truck size={15} />
                          {order.vehicle_name || "—"}
                          {order.vehicle_plate ? ` · ${order.vehicle_plate}` : ""}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.status} ${
                            styles[`status_${order.status || "pending"}`] || ""
                          }`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.operationSummary}>
                          <span className={styles.opPickup}>R {pickupCount}</span>
                          <span className={styles.opWarehouse}>E {warehouseCount}</span>
                          <span className={styles.opDelivery}>L {deliveryCount}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          className={styles.planBtn}
                          onClick={() => void openOperations(order)}
                        >
                          <PackageCheck size={16} />
                          Gérer
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className={styles.pagination}>
          <span>
            Page {page} sur {totalPages}
          </span>
          <div className={styles.paginationButtons}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft size={17} /> Précédent
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Suivant <ChevronRight size={17} />
            </button>
          </div>
        </footer>
      </section>


      {historyOpen && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={() => setHistoryOpen(false)}
        >
          <section
            className={styles.operationsModal}
            onMouseDown={(event) => event.stopPropagation()}
            style={{ maxWidth: 1180 }}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>
                  <History size={16} /> Historique global
                </span>
                <h2>Historique de toutes les commandes</h2>
                <p>
                  Statuts, utilisateur, date et raison pour toutes les commandes
                  correspondant aux filtres actuels.
                </p>
              </div>
              <button
                className={styles.iconBtn}
                onClick={() => setHistoryOpen(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(260px, 1fr) auto",
                gap: 12,
                alignItems: "center",
                padding: "0 0 18px",
              }}
            >
              <div className={styles.searchBox}>
                <Search size={17} />
                <input
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  placeholder="Commande, client, statut, utilisateur, raison..."
                />
              </div>

              <button
                className={styles.refreshBtn}
                onClick={() => void loadGlobalHistory()}
                disabled={historyLoading}
                type="button"
              >
                <RefreshCw
                  size={17}
                  className={historyLoading ? styles.spin : ""}
                />
                Recharger
              </button>
            </div>

            {historyLoading && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  background: "#fafafa",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Loader2 size={18} className={styles.spin} />
                Chargement de l’historique : {historyProgress.loaded} /{" "}
                {historyProgress.total} commandes
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  padding: "7px 10px",
                  borderRadius: 999,
                  background: "#f3f4f6",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {visibleHistoryItems.length} événement(s)
              </span>
              <span
                style={{
                  padding: "7px 10px",
                  borderRadius: 999,
                  background: "#fff1f2",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {historyProgress.total} commande(s)
              </span>
            </div>

            <div
              style={{
                overflow: "auto",
                maxHeight: "62vh",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "#fafafa",
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th style={{ padding: 12, textAlign: "left" }}>Date</th>
                    <th style={{ padding: 12, textAlign: "left" }}>Commande</th>
                    <th style={{ padding: 12, textAlign: "left" }}>Client</th>
                    <th style={{ padding: 12, textAlign: "left" }}>Action</th>
                    <th style={{ padding: 12, textAlign: "left" }}>Par</th>
                    <th style={{ padding: 12, textAlign: "left" }}>Raison / note</th>
                    <th style={{ padding: 12, textAlign: "left" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {!historyLoading && visibleHistoryItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          padding: 32,
                          textAlign: "center",
                          color: "#6b7280",
                        }}
                      >
                        Aucun événement trouvé.
                      </td>
                    </tr>
                  ) : (
                    visibleHistoryItems.map((item) => (
                      <tr
                        key={item.history_key}
                        style={{ borderTop: "1px solid #e5e7eb" }}
                      >
                        <td
                          style={{
                            padding: 12,
                            whiteSpace: "nowrap",
                            fontSize: 13,
                          }}
                        >
                          {historyDate(item.created_at)}
                        </td>
                        <td style={{ padding: 12 }}>
                          <Link
                            href={`/dashboard/admin/orders/${item.order_id}`}
                            className={styles.orderNumber}
                          >
                            {item.order_number}
                          </Link>
                        </td>
                        <td style={{ padding: 12 }}>{item.client_name}</td>
                        <td style={{ padding: 12 }}>
                          <strong>{historyAction(item)}</strong>
                        </td>
                        <td style={{ padding: 12 }}>
                          {historyActor(item)}
                        </td>
                        <td
                          style={{
                            padding: 12,
                            maxWidth: 320,
                            whiteSpace: "normal",
                          }}
                        >
                          {item.reason || item.comment || "—"}
                        </td>
                        <td style={{ padding: 12 }}>
                          <Link
                            href={`/dashboard/admin/orders/${item.order_id}`}
                            className={styles.planBtn}
                          >
                            Voir
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeOrder && (
        <div className={styles.modalBackdrop} onMouseDown={closeOperations}>
          <section
            className={styles.operationsModal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>Planification opérationnelle</span>
                <h2>{activeOrder.order_number || `Commande #${activeOrder.id}`}</h2>
                <p>{clientName(activeOrder)}</p>
              </div>
              <button className={styles.iconBtn} onClick={closeOperations}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.quickActions}>
              <button onClick={() => startCreateOperation("pickup")}>
                <Truck size={17} /> Ramassage
              </button>
              <button onClick={() => startCreateOperation("warehouse_in")}>
                <Warehouse size={17} /> Entrée entrepôt
              </button>
              <button onClick={() => startCreateOperation("warehouse_storage")}>
                <PackageCheck size={17} /> Stockage
              </button>
              <button onClick={() => startCreateOperation("warehouse_out")}>
                <Warehouse size={17} /> Sortie entrepôt
              </button>
              <button onClick={() => startCreateOperation("delivery")}>
                <Truck size={17} /> Livraison
              </button>
            </div>

            <div className={styles.operationsLayout}>
              <div className={styles.operationsList}>
                <div className={styles.sectionTitleRow}>
                  <h3>Opérations de la commande</h3>
                  <span>{operations.length}</span>
                </div>

                {operationsLoading ? (
                  <div className={styles.operationsLoading}>
                    <Loader2 size={24} className={styles.spin} />
                    Chargement...
                  </div>
                ) : operations.length === 0 ? (
                  <div className={styles.emptyOperations}>
                    Aucune opération. Ajoute un ramassage, un passage entrepôt ou
                    une livraison.
                  </div>
                ) : (
                  operations.map((operation) => (
                    <article key={operation.id} className={styles.operationCard}>
                      <div className={styles.operationCardTop}>
                        <div>
                          <span
                            className={`${styles.operationTypeBadge} ${
                              styles[`operationType_${operation.operation_type}`]
                            }`}
                          >
                            {operationTypeLabel(operation.operation_type)}
                          </span>
                          <strong>#{operation.route_position || "—"}</strong>
                        </div>
                        <div className={styles.operationCardActions}>
                          <button onClick={() => startEditOperation(operation)}>
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => void deleteOperation(operation.id)}
                            disabled={operationSaving}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className={styles.operationMeta}>
                        <span>
                          <UserRound size={14} /> {operationDriverName(operation)}
                        </span>
                        <span>
                          <Truck size={14} /> {operation.vehicle_name || "Sans véhicule"}
                          {operation.vehicle_plate
                            ? ` · ${operation.vehicle_plate}`
                            : ""}
                        </span>
                        <span>
                          <Clock3 size={14} />
                          {dateTime(
                            operation.scheduled_date,
                            operation.scheduled_time,
                          )}
                        </span>
                      </div>

                      {operation.warehouse_name && (
                        <div className={styles.warehouseLine}>
                          <Warehouse size={14} /> {operation.warehouse_name}
                        </div>
                      )}

                      <div className={styles.operationFooter}>
                        <span
                          className={`${styles.operationStatus} ${
                            styles[`operationStatus_${operation.status}`]
                          }`}
                        >
                          {operationStatusLabel(operation.status)}
                        </span>
                        {operation.notes && <small>{operation.notes}</small>}
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className={styles.operationFormCard}>
                <div className={styles.sectionTitleRow}>
                  <h3>
                    {editingOperationId
                      ? "Modifier l’opération"
                      : "Ajouter une opération"}
                  </h3>
                  {editingOperationId && (
                    <button
                      className={styles.textBtn}
                      onClick={() => {
                        setEditingOperationId(null);
                        setOperationForm(EMPTY_OPERATION_FORM);
                      }}
                    >
                      Nouveau
                    </button>
                  )}
                </div>

                <label>
                  Type d’opération
                  <select
                    value={operationForm.operation_type}
                    onChange={(e) =>
                      setOperationForm((current) => ({
                        ...current,
                        operation_type: e.target.value as OperationType,
                      }))
                    }
                  >
                    {OPERATION_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={styles.formGrid2}>
                  <label>
                    Chauffeur
                    <select
                      value={operationForm.driver_id}
                      onChange={(e) =>
                        setOperationForm((current) => ({
                          ...current,
                          driver_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">Non assigné</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {[driver.first_name, driver.last_name]
                            .filter(Boolean)
                            .join(" ") || `Chauffeur #${driver.id}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Véhicule
                    <select
                      value={operationForm.vehicle_id}
                      onChange={(e) =>
                        setOperationForm((current) => ({
                          ...current,
                          vehicle_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">Non assigné</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {[vehicle.make, vehicle.model]
                            .filter(Boolean)
                            .join(" ") || `Véhicule #${vehicle.id}`}
                          {vehicle.plate ? ` · ${vehicle.plate}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  Entrepôt
                  <input
                    value={operationForm.warehouse_name}
                    onChange={(e) =>
                      setOperationForm((current) => ({
                        ...current,
                        warehouse_name: e.target.value,
                      }))
                    }
                    placeholder="Ex. Entrepôt Glory Solutions"
                  />
                </label>

                <div className={styles.formGrid2}>
                  <label>
                    Date
                    <input
                      type="date"
                      value={operationForm.scheduled_date}
                      onChange={(e) =>
                        setOperationForm((current) => ({
                          ...current,
                          scheduled_date: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Heure
                    <input
                      type="time"
                      value={operationForm.scheduled_time}
                      onChange={(e) =>
                        setOperationForm((current) => ({
                          ...current,
                          scheduled_time: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <div className={styles.formGrid2}>
                  <label>
                    Statut
                    <select
                      value={operationForm.status}
                      onChange={(e) =>
                        setOperationForm((current) => ({
                          ...current,
                          status: e.target.value as OperationStatus,
                        }))
                      }
                    >
                      {OPERATION_STATUSES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Position route
                    <input
                      type="number"
                      min="1"
                      value={operationForm.route_position}
                      onChange={(e) =>
                        setOperationForm((current) => ({
                          ...current,
                          route_position: e.target.value,
                        }))
                      }
                      placeholder="Ex. 1"
                    />
                  </label>
                </div>

                <label>
                  Notes
                  <textarea
                    value={operationForm.notes}
                    onChange={(e) =>
                      setOperationForm((current) => ({
                        ...current,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Instructions pour cette opération..."
                    rows={4}
                  />
                </label>

                <button
                  className={styles.saveOperationBtn}
                  onClick={() => void saveOperation()}
                  disabled={operationSaving}
                >
                  {operationSaving ? (
                    <Loader2 size={17} className={styles.spin} />
                  ) : editingOperationId ? (
                    <Pencil size={17} />
                  ) : (
                    <Plus size={17} />
                  )}
                  {editingOperationId ? "Enregistrer" : "Ajouter l’opération"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
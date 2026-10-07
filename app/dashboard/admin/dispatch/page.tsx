"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  History,
  Loader2,
  Keyboard,
  MapPin,
  PackageCheck,
  Pencil,
  Plus,
  ScanLine,
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

type DispatchRoutePackage = {
  id: number;
  order_id: number;
  barcode?: string | null;
  package_number?: number | null;
  package_type?: string | null;
  description?: string | null;
  weight?: number | string | null;
  weight_unit?: string | null;
  length?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  dimension_unit?: string | null;
  current_status?: string | null;
};

type DispatchRouteOrder = {
  id: number;
  order_number?: string | null;
  client_id?: number | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
  client_company_name?: string | null;
  status?: string | null;
  signature_required?: boolean;
  service_level?: string | null;
  priority?: string | null;
  pickup_appointment?: boolean;
  pickup_time?: string | null;
  delivery_appointment?: boolean;
  delivery_time?: string | null;
  destination_type?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_extension?: string | null;
  delivery_unit?: string | null;
  description?: string | null;
  pallets_count?: number;
  pickup_address?: string | null;
  delivery_address?: string | null;
  pickup_date?: string | null;
  delivery_date?: string | null;
  notes?: string | null;
  packages: DispatchRoutePackage[];
};

type DispatchRouteStop = {
  id: number;
  route_id: number;
  stop_position?: number | null;
  task_type: string;
  client_id?: number | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  status?: string | null;
  notes?: string | null;
  total_orders: number;
  total_packages: number;
  total_pallets: number;
  orders: DispatchRouteOrder[];
};

type DispatchRoute = {
  id: number;
  route_code?: string | null;
  driver_id?: number | null;
  vehicle_id?: number | null;
  driver_name?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_plate?: string | null;
  scheduled_date?: string | null;
  status?: string | null;
  notes?: string | null;
  total_stops?: number;
  total_orders?: number;
  total_packages?: number;
  total_pallets?: number;
  stops?: DispatchRouteStop[];
};

type DispatchRoutesResponse = {
  success: boolean;
  routes: DispatchRoute[];
};

type DispatchRouteDetailResponse = {
  success: boolean;
  route: DispatchRoute;
};

type AdminDispatchTask = {
  id: number;
  task_type: "pickup" | "delivery";
  client_id: number;
  driver_id: number | null;
  vehicle_id: number | null;
  address: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  total_orders: number;
  total_packages: number;
  scanned_packages: number;
  remaining_packages: number;
};

type AdminDispatchTasksResponse = {
  success: boolean;
  total: number;
  tasks: AdminDispatchTask[];
};

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


type WarehouseScanType =
  | "warehouse_in"
  | "warehouse_storage"
  | "warehouse_out";

type WarehouseScanSource =
  | "camera"
  | "zebra"
  | "manual"
  | "barcode_scanner";

type WarehouseScanItem = {
  id: number;
  order_id: number;
  package_id: number;
  operation_id?: number | null;
  driver_id?: number | null;
  vehicle_id?: number | null;
  scanned_by_user_id?: number | null;
  scanned_code?: string | null;
  scan_type?: WarehouseScanType | string | null;
  scan_status?: "accepted" | "rejected" | "duplicate" | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  accuracy?: number | string | null;
  device_type?: string | null;
  device_name?: string | null;
  scan_source?: WarehouseScanSource | string | null;
  notes?: string | null;
  scanned_at?: string | null;
  barcode?: string | null;
  package_number?: number | null;
  package_status?: string | null;
  order_number?: string | null;
  operation_type?: string | null;
  warehouse_name?: string | null;
  scanned_by_first_name?: string | null;
  scanned_by_last_name?: string | null;
};

type WarehouseScanResponse = {
  success?: boolean;
  rejected?: boolean;
  duplicate?: boolean;
  scan_status?: string;
  message?: string;
  event_id?: number;
  event?: WarehouseScanItem | null;
  package?: {
    id?: number;
    order_id?: number;
    barcode?: string | null;
    package_number?: number | null;
    current_status?: string | null;
    order_number?: string | null;
  } | null;
  operation?: OrderOperation | null;
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


const WAREHOUSE_SCAN_TYPES: {
  value: WarehouseScanType;
  label: string;
  description: string;
}[] = [
  {
    value: "warehouse_in",
    label: "Entrée entrepôt",
    description: "Le colis vient d’arriver à l’entrepôt.",
  },
  {
    value: "warehouse_storage",
    label: "Stockage",
    description: "Le colis est confirmé dans la zone de stockage.",
  },
  {
    value: "warehouse_out",
    label: "Sortie entrepôt",
    description: "Le colis quitte l’entrepôt vers sa prochaine étape.",
  },
];

const WAREHOUSE_SCAN_SOURCES: {
  value: WarehouseScanSource;
  label: string;
}[] = [
  { value: "barcode_scanner", label: "Lecteur code-barres USB" },
  { value: "zebra", label: "Zebra" },
  { value: "manual", label: "Saisie manuelle" },
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
  const [dispatchView, setDispatchView] =
    useState<"orders" | "routes" | "missions">("orders");

  const [showDispatchActions, setShowDispatchActions] =
    useState(false);

  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [dateType, setDateType] =
    useState<"pickup" | "delivery" | "created">("pickup");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");

  const [groupedTaskType, setGroupedTaskType] =
    useState<"pickup" | "pickup_grouped" | "delivery" | "delivery_grouped">("pickup");
  const [groupedTaskRoute, setGroupedTaskRoute] = useState("");
  const [groupedTaskSaving, setGroupedTaskSaving] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

  const [dispatchRoutes, setDispatchRoutes] = useState<DispatchRoute[]>([]);
  const [dispatchRoutesLoading, setDispatchRoutesLoading] = useState(false);
  const [dispatchRoutesError, setDispatchRoutesError] = useState("");

  const [selectedDispatchRoute, setSelectedDispatchRoute] =
    useState<DispatchRoute | null>(null);

  const [dispatchRouteDetailLoading, setDispatchRouteDetailLoading] =
    useState(false);

  const [newRouteOpen, setNewRouteOpen] = useState(false);
  const [routeSectors, setRouteSectors] = useState<{code: string; name: string; postal_prefixes: string}[]>([]);
  const [sectorCode, setSectorCode] = useState("");
  const [sectorName, setSectorName] = useState("");
  const [sectorPostal, setSectorPostal] = useState("");
  const [sectorSaving, setSectorSaving] = useState(false);
  const [newRouteSector, setNewRouteSector] = useState("MTL");
  const [newRouteDate, setNewRouteDate] = useState("");
  const [newRouteNotes, setNewRouteNotes] = useState("");
  const [newRouteSaving, setNewRouteSaving] = useState(false);
  const [dispatchRouteSearch, setDispatchRouteSearch] = useState("");
  const [dispatchRouteSector, setDispatchRouteSector] = useState("");
  const [dispatchRouteDate, setDispatchRouteDate] = useState("");
  const [dispatchRouteDateFrom, setDispatchRouteDateFrom] = useState("");
  const [dispatchRouteDateTo, setDispatchRouteDateTo] = useState("");
  const [dispatchRouteDriver, setDispatchRouteDriver] = useState("");
  const [dispatchRouteStatus, setDispatchRouteStatus] = useState("");

  const [adminTasks, setAdminTasks] = useState<AdminDispatchTask[]>([]);
  const [adminTasksLoading, setAdminTasksLoading] = useState(false);
  const [adminTasksError, setAdminTasksError] = useState("");
  const [planningTaskId, setPlanningTaskId] = useState<number | null>(null);
  const [planningRoute, setPlanningRoute] = useState("");
  const [planningDriver, setPlanningDriver] = useState("");
  const [planningVehicle, setPlanningVehicle] = useState("");
  const [planningDate, setPlanningDate] = useState("");
  const [planningSector, setPlanningSector] = useState("");
  const [planningSaving, setPlanningSaving] = useState(false);


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

  const [warehouseScannerOpen, setWarehouseScannerOpen] = useState(false);
  const [warehouseScanCode, setWarehouseScanCode] = useState("");
  const [warehouseScanType, setWarehouseScanType] =
    useState<WarehouseScanType>("warehouse_in");
  const [warehouseScanSource, setWarehouseScanSource] =
    useState<WarehouseScanSource>("barcode_scanner");
  const [warehouseScanNotes, setWarehouseScanNotes] = useState("");
  const [warehouseScanLoading, setWarehouseScanLoading] = useState(false);
  const [warehouseScanHistoryLoading, setWarehouseScanHistoryLoading] =
    useState(false);
  const [warehouseScanHistory, setWarehouseScanHistory] = useState<
    WarehouseScanItem[]
  >([]);
  const [warehouseScanResult, setWarehouseScanResult] =
    useState<WarehouseScanResponse | null>(null);
  const [warehouseCameraOpen, setWarehouseCameraOpen] = useState(false);
  const [warehouseCameraError, setWarehouseCameraError] = useState("");

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

  const deleteDispatchRoute = async (route: DispatchRoute) => {
    if (!['draft','assigned','in_progress'].includes(String(route.status || ''))) {
      setDispatchRoutesError("Seules les routes non commencées peuvent être supprimées.");
      return;
    }
    const label = route.route_code || `Route #${route.id}`;
    if (!window.confirm(`Supprimer ${label} ? Les stops, commandes et colis seront conservés et simplement détachés de la route. Les statuts métier ne seront pas modifiés.`)) return;
    try {
      setDispatchRoutesError("");
      await apiFetch(`/api/dispatch/routes/${route.id}`, { method: "DELETE" });
      setSuccess(`${label} supprimée. Les stops et commandes ont été conservés.`);
      setDispatchRoutes((current) => current.filter((item) => item.id !== route.id));
    } catch (reason) {
      setDispatchRoutesError(reason instanceof Error ? reason.message : "Impossible de supprimer la route.");
    }
  };

  const loadRouteSectors = useCallback(async () => {
    try {
      const result = await apiFetch<{sectors: {code: string; name: string; postal_prefixes: string}[]}>("/api/dispatch/sectors");
      setRouteSectors(Array.isArray(result.sectors) ? result.sectors : []);
    } catch (reason) { setDispatchRoutesError(reason instanceof Error ? reason.message : "Impossible de charger les secteurs."); }
  }, [apiFetch]);

  const saveNewSector = async () => {
    if (sectorSaving) return;
    try {
      setSectorSaving(true);
      setDispatchRoutesError("");
      const result = await apiFetch<{sector: {code: string}}>("/api/dispatch/sectors", {method: "POST", body: JSON.stringify({code: sectorCode, name: sectorName, postal_prefixes: sectorPostal})});
      await loadRouteSectors();
      setNewRouteSector(result.sector.code);
      setPlanningSector(result.sector.code);
      setSectorCode(""); setSectorName(""); setSectorPostal("");
      setSuccess(`Secteur ${result.sector.code} créé. Tu peux maintenant préparer une route.`);
    } catch (reason) { setDispatchRoutesError(reason instanceof Error ? reason.message : "Impossible de créer le secteur."); }
    finally { setSectorSaving(false); }
  };

  const loadDispatchRoutes = useCallback(async () => {
    try {
      setDispatchRoutesLoading(true);
      setDispatchRoutesError("");

      const result = await apiFetch<DispatchRoutesResponse>(
        "/api/dispatch/routes"
      );

      setDispatchRoutes(
        Array.isArray(result.routes) ? result.routes : []
      );
    } catch (reason) {
      setDispatchRoutesError(
        reason instanceof Error
          ? reason.message
          : "Impossible de charger les routes."
      );
    } finally {
      setDispatchRoutesLoading(false);
    }
  }, [apiFetch]);

  const openDispatchRoute = async (routeId: number) => {
    try {
      setDispatchRouteDetailLoading(true);
      setDispatchRoutesError("");
      setSelectedDispatchRoute(null);

      const result = await apiFetch<DispatchRouteDetailResponse>(
        `/api/dispatch/routes/${routeId}`
      );

      if (!result.route) {
        throw new Error("Route introuvable.");
      }

      setSelectedDispatchRoute(result.route);
    } catch (reason) {
      setDispatchRoutesError(
        reason instanceof Error
          ? reason.message
          : "Impossible de charger les arrêts."
      );
    } finally {
      setDispatchRouteDetailLoading(false);
    }
  };

  const createNewDraftRoute = async () => {
    if (!newRouteDate || newRouteSaving) return;
    try {
      setNewRouteSaving(true);
      setDispatchRoutesError("");
      const result = await apiFetch<{ success: boolean; route_code?: string }>(
        "/api/dispatch/routes",
        {
          method: "POST",
          body: JSON.stringify({
            sector: newRouteSector,
            scheduled_date: newRouteDate,
            notes: newRouteNotes,
            stop_ids: [],
          }),
        }
      );
      setNewRouteOpen(false);
      setNewRouteNotes("");
      setSuccess(`Route ${result.route_code || ""} créée en brouillon.`);
      await loadDispatchRoutes();
    } catch (reason) {
      setDispatchRoutesError(reason instanceof Error ? reason.message : "Création impossible.");
    } finally {
      setNewRouteSaving(false);
    }
  };

  const filteredDispatchRoutes = dispatchRoutes.filter((route) => {
    const code = String(route.route_code || "").toUpperCase();

    const searchText = [
      route.route_code,
      route.driver_name,
      route.vehicle_plate,
      route.vehicle_make,
      route.vehicle_model,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (
      dispatchRouteSearch.trim() &&
      !searchText.includes(dispatchRouteSearch.trim().toLowerCase())
    ) {
      return false;
    }

    if (
      dispatchRouteSector &&
      !code.startsWith(`${dispatchRouteSector}-`)
    ) {
      return false;
    }

    if (
      dispatchRouteDate &&
      String(route.scheduled_date || "").slice(0, 10) !==
        dispatchRouteDate
    ) {
      return false;
    }

    const routeDate = String(route.scheduled_date || "").slice(0, 10);
    if (!dispatchRouteDate && dispatchRouteDateFrom && routeDate < dispatchRouteDateFrom) return false;
    if (!dispatchRouteDate && dispatchRouteDateTo && routeDate > dispatchRouteDateTo) return false;

    if (
      dispatchRouteDriver &&
      String(route.driver_id || "") !== dispatchRouteDriver
    ) {
      return false;
    }

    if (
      dispatchRouteStatus &&
      route.status !== dispatchRouteStatus
    ) {
      return false;
    }

    return true;
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search.trim()) params.set("search", search.trim());
    if (clientId) params.set("client_id", clientId);
    if (status) params.set("status", status);
    if (driverFilter) params.set("driver_id", driverFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (dateFrom || dateTo) params.set("date_type", dateType);
    return params.toString();
  }, [
    page, limit, search, clientId, status, driverFilter,
    dateType, dateFrom, dateTo
  ]);

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

  const loadAdminTasks = useCallback(async () => {
    try {
      setAdminTasksLoading(true);
      setAdminTasksError("");

      const result = await apiFetch<AdminDispatchTasksResponse>(
        "/api/dispatch/tasks",
      );

      setAdminTasks(
        Array.isArray(result.tasks) ? result.tasks : [],
      );
    } catch (reason) {
      setAdminTasksError(
        reason instanceof Error
          ? reason.message
          : "Impossible de charger les missions regroupées.",
      );
    } finally {
      setAdminTasksLoading(false);
    }
  }, [apiFetch]);

  const assignStopToExistingRoute = async (taskId: number) => {
    if (planningSaving) return;
    if (!planningRoute) {
      setAdminTasksError("Choisis la route à laquelle ce stop doit être assigné.");
      return;
    }
    try {
      setPlanningSaving(true);
      setAdminTasksError("");
      await apiFetch(`/api/dispatch/routes/${Number(planningRoute)}/stops/assign`, {
        method: "POST",
        body: JSON.stringify({ stop_id: taskId }),
      });
      const route = dispatchRoutes.find((item) => item.id === Number(planningRoute));
      setPlanningTaskId(null);
      setPlanningRoute("");
      await Promise.all([loadAdminTasks(), loadDispatchRoutes(), loadOrders()]);
      setSuccess(`Stop #${taskId} assigné à ${route?.route_code || `la route #${planningRoute}`}. Son statut métier n’a pas été modifié.`);
    } catch (reason) {
      setAdminTasksError(reason instanceof Error ? reason.message : "Impossible d’assigner le stop à la route.");
    } finally {
      setPlanningSaving(false);
    }
  };

  const deleteGroupedTask = async (taskId: number) => {
    if (deletingTaskId) return;
    if (!window.confirm(`Supprimer la mission #${taskId} ?\n\nLes commandes et colis seront conservés et redeviendront non planifiés.`)) return;
    try {
      setDeletingTaskId(taskId);
      setAdminTasksError("");
      const result = await apiFetch<{ success: boolean; message?: string }>(`/api/dispatch/tasks/${taskId}`, { method: "DELETE" });
      if (!result.success) throw new Error(result.message || "Suppression impossible.");
      setSuccess(result.message || `Mission #${taskId} supprimée sans supprimer les commandes ni les colis.`);
      await Promise.all([loadAdminTasks(), loadDispatchRoutes(), loadOrders()]);
    } catch (reason) {
      setAdminTasksError(reason instanceof Error ? reason.message : "Impossible de supprimer la mission.");
    } finally {
      setDeletingTaskId(null);
    }
  };

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

  // Les routes sont nécessaires dans TOUTES les vues du Dispatch :
  // - Commandes : menu « Route principale »
  // - Missions regroupées : assignation d'un stop
  // - Routes & stops : consultation/gestion
  // Ne pas limiter ce chargement à l'onglet « routes », sinon le select
  // « Route principale » reste vide lorsque l'admin arrive sur Commandes.
  useEffect(() => {
    void loadDispatchRoutes();
  }, [loadDispatchRoutes]);

  // Les secteurs ne sont nécessaires que pour la création/gestion des routes.
  useEffect(() => {
    if (dispatchView === "routes") {
      void loadRouteSectors();
    }
  }, [dispatchView, loadRouteSectors]);



  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders, search]);

  useEffect(() => {
    void loadAdminTasks();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadAdminTasks();
      }
    }, 20000);

    return () => window.clearInterval(interval);
  }, [loadAdminTasks]);

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
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (dateFrom || dateTo) params.set("date_type", dateType);

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

  const createGroupedTask = async () => {
    const orderIds = Array.from(selected);
    if (!orderIds.length || orderIds.length > 1000) {
      setError("Sélectionne entre 1 et 1000 commandes.");
      return;
    }
    if (!groupedTaskRoute) {
      setError("Choisis la route avant de cliquer sur ASSIGNER.");
      return;
    }

    const operationType = groupedTaskType.startsWith("pickup") ? "pickup" : "delivery";
    const grouped = groupedTaskType.endsWith("_grouped");
    const batches = grouped ? [orderIds] : orderIds.map((orderId) => [orderId]);

    try {
      setGroupedTaskSaving(true); setError(""); setSuccess("");
      const created: number[] = [];
      let totalPackages = 0;
      for (const batch of batches) {
        const result = await apiFetch<{success:boolean;task_id:number;total_packages:number;message?:string}>(
          `/api/dispatch/tasks/${operationType}`,
          { method:"POST", body:JSON.stringify({order_ids:batch,driver_id:null}) }
        );
        if (!result.success || !result.task_id) throw new Error(result.message || "Création du stop impossible.");
        await apiFetch(`/api/dispatch/routes/${Number(groupedTaskRoute)}/stops/assign`, {
          method:"POST", body:JSON.stringify({stop_id:result.task_id}),
        });
        created.push(result.task_id);
        totalPackages += Number(result.total_packages || 0);
      }
      const route = dispatchRoutes.find((item) => item.id === Number(groupedTaskRoute));
      setSuccess(`${created.length} stop(s) assigné(s) à ${route?.route_code || `la route #${groupedTaskRoute}`} · ${orderIds.length} commande(s) · ${totalPackages} colis.`);
      setSelected(new Set()); setGroupedTaskRoute(""); setDispatchView("routes");
      await Promise.all([loadOrders(), loadAdminTasks(), loadDispatchRoutes()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Assignation impossible.");
    } finally { setGroupedTaskSaving(false); }
  };

  const applyBulk = async () => {
    if (!selected.size) { setError("Sélectionne au moins une commande."); return; }
    await createGroupedTask();
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


  const loadWarehouseScanHistory = useCallback(async () => {
    try {
      setWarehouseScanHistoryLoading(true);

      const result = await apiFetch<{
        data?: WarehouseScanItem[];
        scans?: WarehouseScanItem[];
      }>("/api/dispatch/warehouse/scans?limit=50");

      const scans = Array.isArray(result.scans)
        ? result.scans
        : Array.isArray(result.data)
          ? result.data
          : [];

      setWarehouseScanHistory(scans);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible de charger l’historique des scans entrepôt.",
      );
    } finally {
      setWarehouseScanHistoryLoading(false);
    }
  }, [apiFetch]);

  const openWarehouseScanner = async () => {
    setWarehouseScannerOpen(true);
    setWarehouseScanResult(null);
    setWarehouseCameraError("");
    await loadWarehouseScanHistory();
  };

  const getFreshWarehousePosition = () =>
    new Promise<{
      latitude: number | null;
      longitude: number | null;
      accuracy: number | null;
    }>((resolve) => {
      if (
        typeof navigator === "undefined" ||
        !navigator.geolocation
      ) {
        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => {
          resolve({
            latitude: null,
            longitude: null,
            accuracy: null,
          });
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        },
      );
    });

  const submitWarehouseScan = async (
    codeOverride?: string,
    sourceOverride?: WarehouseScanSource,
  ) => {
    const code = String(codeOverride ?? warehouseScanCode)
      .trim()
      .toUpperCase();

    if (!code) {
      setError("Scanne ou saisis un code-barres.");
      return;
    }

    try {
      setWarehouseScanLoading(true);
      setError("");
      setSuccess("");
      setWarehouseScanResult(null);

      const gps = await getFreshWarehousePosition();

      const result = await apiFetch<WarehouseScanResponse>(
        "/api/dispatch/warehouse/scan",
        {
          method: "POST",
          body: JSON.stringify({
            scanned_code: code,
            scan_type: warehouseScanType,
            scan_source: sourceOverride || warehouseScanSource,
            latitude: gps.latitude,
            longitude: gps.longitude,
            accuracy: gps.accuracy,
            device_type:
              typeof navigator !== "undefined"
                ? /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                  ? "mobile"
                  : "desktop"
                : "unknown",
            device_name:
              typeof navigator !== "undefined"
                ? navigator.userAgent.slice(0, 150)
                : null,
            notes: warehouseScanNotes.trim() || null,
          }),
        },
      );

      setWarehouseScanResult(result);
      setWarehouseScanCode("");

      if (result.duplicate) {
        setSuccess(result.message || "Scan déjà enregistré.");
      } else {
        setSuccess(result.message || "Scan entrepôt enregistré.");
      }

      await Promise.all([
        loadWarehouseScanHistory(),
        loadOrders(),
      ]);
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Scan entrepôt impossible.";

      setWarehouseScanResult({
        success: false,
        rejected: true,
        scan_status: "rejected",
        message,
      });
      setError(message);

      await loadWarehouseScanHistory();
    } finally {
      setWarehouseScanLoading(false);
    }
  };

  const startWarehouseCamera = async () => {
    setWarehouseCameraError("");

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setWarehouseCameraError(
        "La caméra n’est pas disponible sur cet appareil.",
      );
      return;
    }

    const BarcodeDetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (options?: {
          formats?: string[];
        }) => {
          detect: (
            source: CanvasImageSource,
          ) => Promise<Array<{ rawValue?: string }>>;
        };
      }
    ).BarcodeDetector;

    if (!BarcodeDetectorCtor) {
      setWarehouseCameraError(
        "Le scan caméra automatique n’est pas supporté par ce navigateur. Utilise Zebra, un lecteur USB ou la saisie manuelle.",
      );
      return;
    }

    let stream: MediaStream | null = null;
    let rafId = 0;
    let stopped = false;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      setWarehouseCameraOpen(true);

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 50);
      });

      const video = document.getElementById(
        "warehouse-scanner-video",
      ) as HTMLVideoElement | null;

      if (!video) {
        throw new Error("Zone caméra introuvable.");
      }

      video.srcObject = stream;
      await video.play();

      const detector = new BarcodeDetectorCtor({
        formats: [
          "code_128",
          "code_39",
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "qr_code",
          "data_matrix",
        ],
      });

      const detectFrame = async () => {
        if (stopped) return;

        try {
          if (
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0
          ) {
            const codes = await detector.detect(video);
            const rawValue = codes[0]?.rawValue?.trim();

            if (rawValue) {
              stopped = true;
              setWarehouseScanCode(rawValue.toUpperCase());
              setWarehouseScanSource("camera");
              stream?.getTracks().forEach((track) => track.stop());
              setWarehouseCameraOpen(false);
              await submitWarehouseScan(rawValue, "camera");
              return;
            }
          }
        } catch {
          // On continue à lire les images tant que la caméra reste ouverte.
        }

        rafId = window.requestAnimationFrame(() => {
          void detectFrame();
        });
      };

      void detectFrame();

      const stopWhenClosed = window.setInterval(() => {
        const videoElement = document.getElementById(
          "warehouse-scanner-video",
        );

        if (!videoElement) {
          stopped = true;
          window.cancelAnimationFrame(rafId);
          stream?.getTracks().forEach((track) => track.stop());
          window.clearInterval(stopWhenClosed);
        }
      }, 300);
    } catch (reason) {
      stopped = true;
      window.cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
      setWarehouseCameraOpen(false);
      setWarehouseCameraError(
        reason instanceof Error
          ? reason.message
          : "Impossible d’ouvrir la caméra.",
      );
    }
  };

  const closeWarehouseScanner = () => {
    setWarehouseScannerOpen(false);
    setWarehouseCameraOpen(false);
    setWarehouseCameraError("");
    setWarehouseScanResult(null);

    const video = document.getElementById(
      "warehouse-scanner-video",
    ) as HTMLVideoElement | null;

    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());

    if (video) {
      video.srcObject = null;
    }
  };

  return (
    <main
      className={`${styles.page} ${
        dispatchView === "orders"
          ? styles.dispatchOrdersMode
          : dispatchView === "missions"
            ? styles.dispatchMissionsMode
            : styles.dispatchRoutesMode
      }`}
    >
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
            onClick={() => void openWarehouseScanner()}
            type="button"
          >
            <ScanLine size={17} />
            Scanner entrepôt
          </button>
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

      <nav className={styles.dispatchProNav} aria-label="Navigation Dispatch">
        <button
          type="button"
          className={
            dispatchView === "orders"
              ? styles.dispatchProNavActive
              : ""
          }
          onClick={() => setDispatchView("orders")}
        >
          Commandes
          <span>{total}</span>
        </button>

        <button
          type="button"
          className={
            dispatchView === "routes"
              ? styles.dispatchProNavActive
              : ""
          }
          onClick={() => setDispatchView("routes")}
        >
          Routes & stops
        </button>

        <button
          type="button"
          className={
            dispatchView === "missions"
              ? styles.dispatchProNavActive
              : ""
          }
          onClick={() => setDispatchView("missions")}
        >
          Missions regroupées
          <span>{adminTasks.length}</span>
        </button>
      </nav>

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

      {dispatchView === "orders" && (
        <div className={styles.dispatchProToolbar}>
          <div className={styles.dispatchProToolbarInfo}>
            <strong>Commandes</strong>
            <span>{total} résultat(s)</span>
            <span>{selected.size} sélectionnée(s)</span>
          </div>

          <div className={styles.dispatchProToolbarActions}>
            <button
              type="button"
              className={styles.dispatchProReset}
              onClick={() => {
                setSearch("");
                setClientId("");
                setStatus("");
                setDriverFilter("");
                setDateType("pickup");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
            >
              Réinitialiser
            </button>

            <button
              type="button"
              className={styles.dispatchProActionButton}
              aria-expanded={showDispatchActions}
              onClick={() =>
                setShowDispatchActions((current) => !current)
              }
            >
              {showDispatchActions
                ? "Fermer les actions"
                : "Affecter / Créer une mission"}
            </button>
          </div>
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

        <div className={styles.dispatchDateFilters}>
          <label className={styles.dispatchDateField}>
            <span>Type de date</span>
            <select
              value={dateType}
              onChange={(e) => {
                setDateType(
                  e.target.value as "pickup" | "delivery" | "created"
                );
                setPage(1);
              }}
            >
              <option value="pickup">Date de ramassage</option>
              <option value="delivery">Date de livraison</option>
              <option value="created">Date de création</option>
            </select>
          </label>

          <label className={styles.dispatchDateField}>
            <span>Du</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <label className={styles.dispatchDateField}>
            <span>Au</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>

        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
          <option value={250}>250 / page</option>
        </select>
      </section>

      <section
        className={`${styles.bulkBar} ${styles.dispatchProActionPanel} ${
          !showDispatchActions ? styles.dispatchProActionHidden : ""
        }`}
      >
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
            aria-label="Route principale"
            value={groupedTaskRoute}
            onChange={(e) => setGroupedTaskRoute(e.target.value)}
          >
            <option value="">Route principale...</option>
            {dispatchRoutes
              .filter((route) => ["draft", "assigned", "in_progress"].includes(String(route.status)))
              .map((route) => (
                <option key={route.id} value={route.id}>
                  {route.route_code || `Route #${route.id}`} · {String(route.scheduled_date || "").slice(0, 10) || "sans date"}
                </option>
              ))}
          </select>

          <select
            aria-label="Type de stop à planifier"
            value={groupedTaskType}
            onChange={(e) => setGroupedTaskType(e.target.value as "pickup" | "pickup_grouped" | "delivery" | "delivery_grouped")}
          >
            <option value="pickup">Ramassage</option>
            <option value="pickup_grouped">Ramassage regroupé</option>
            <option value="delivery">Livraison</option>
            <option value="delivery_grouped">Livraison regroupée</option>
          </select>

          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
          >
            <option value="">Statut de commande</option>
            {STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            className={styles.applyBtn}
            disabled={saving || groupedTaskSaving || !selected.size}
            onClick={() => void applyBulk()}
          >
            {saving || groupedTaskSaving ? (
              <Loader2 size={17} className={styles.spin} />
            ) : (
              <Truck size={17} />
            )}
            ASSIGNER
          </button>
        </div>
      </section>

      <section className={`${styles.tableCard} ${styles.dispatchProMissions}`}>
        <div className={styles.tableHead}>
          <div>
            <strong>
              Missions regroupées ({adminTasks.length})
            </strong>
            <span>
              Suivi des ramassages, livraisons et colis scannés.
            </span>
          </div>

          <button
            type="button"
            className={styles.applyBtn}
            disabled={adminTasksLoading}
            onClick={() => void loadAdminTasks()}
          >
            <RefreshCw size={16} />
            Actualiser les missions
          </button>
        </div>

        {adminTasksError && (
          <p role="alert" style={{ padding: 16, color: "#dc2626" }}>
            {adminTasksError}
          </p>
        )}

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Mission</th>
                <th>Type</th>
                <th>Chauffeur</th>
                <th>Adresse</th>
                <th>Statut</th>
                <th>Commandes</th>
                <th>Colis</th>
                <th>Scannés</th>
                <th>Restants</th>
                <th>Progression</th>
                <th>Route</th>
              </tr>
            </thead>

            <tbody>
              {adminTasksLoading && adminTasks.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    Chargement des missions...
                  </td>
                </tr>
              ) : adminTasks.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    Aucune mission regroupée enregistrée.
                  </td>
                </tr>
              ) : (
                adminTasks.map((task) => {
                  const driver = drivers.find(
                    (item) => Number(item.id) === Number(task.driver_id),
                  );

                  const driverName = driver
                    ? [driver.first_name, driver.last_name]
                        .filter(Boolean)
                        .join(" ")
                    : task.driver_id
                      ? `Chauffeur #${task.driver_id}`
                      : "Non assigné";

                  const progress = task.total_packages > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (task.scanned_packages / task.total_packages) * 100,
                        ),
                      )
                    : 0;

                  return (
                    <tr key={task.id}>
                      <td>#{task.id}</td>
                      <td>
                        {task.task_type === "pickup"
                          ? "Ramassage"
                          : "Livraison"}
                      </td>
                      <td>{driverName}</td>
                      <td>{task.address || "—"}</td>
                      <td>{task.status}</td>
                      <td>{task.total_orders}</td>
                      <td>{task.total_packages}</td>
                      <td>{task.scanned_packages}</td>
                      <td>{task.remaining_packages}</td>
                      <td>
                        <div style={{ minWidth: 100 }}>
                          <progress
                            value={progress}
                            max={100}
                            style={{ width: "100%" }}
                          />
                          <span>{progress}%</span>
                        </div>
                      </td>
                      <td>
                        {task.status === "pending" || task.status === "assigned" ? (
                          planningTaskId === task.id ? (
                            <div style={{ display: "grid", gap: 8, minWidth: 230 }}>
                              <select
                                aria-label={`Route pour le stop ${task.id}`}
                                value={planningRoute}
                                disabled={planningSaving}
                                onChange={(event) => setPlanningRoute(event.target.value)}
                              >
                                <option value="">Choisir une route…</option>
                                {dispatchRoutes
                                  .filter((route) => ["draft", "assigned", "in_progress"].includes(String(route.status)))
                                  .map((route) => (
                                    <option key={route.id} value={route.id}>
                                      {route.route_code || `Route #${route.id}`} · {String(route.scheduled_date || "").slice(0, 10) || "sans date"}
                                    </option>
                                  ))}
                              </select>
                              <button
                                type="button"
                                className={styles.applyBtn}
                                disabled={planningSaving || !planningRoute}
                                onClick={() => void assignStopToExistingRoute(task.id)}
                              >
                                {planningSaving ? "Assignation…" : "CONFIRMER LA ROUTE"}
                              </button>
                              <button type="button" disabled={planningSaving} onClick={() => { setPlanningTaskId(null); setPlanningRoute(""); }}>
                                Annuler
                              </button>
                              <small>Le statut du stop et des commandes ne sera pas modifié.</small>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={styles.applyBtn}
                              disabled={planningSaving}
                              onClick={() => {
                                setPlanningTaskId(task.id);
                                setPlanningRoute("");
                                setAdminTasksError("");
                                void loadDispatchRoutes();
                              }}
                            >
                              ASSIGNER À UNE ROUTE
                            </button>
                          )
                        ) : (
                          <span>Stop déjà commencé</span>
                        )}
                        {(task.status === "pending" || task.status === "assigned") && (
                          <button
                            type="button"
                            disabled={deletingTaskId === task.id}
                            onClick={() => void deleteGroupedTask(task.id)}
                            style={{
                              marginTop: 8,
                              width: "100%",
                              minHeight: 38,
                              border: "1px solid #ef4444",
                              borderRadius: 9,
                              background: "#fff",
                              color: "#dc2626",
                              fontWeight: 800,
                              cursor: deletingTaskId === task.id ? "wait" : "pointer",
                            }}
                          >
                            {deletingTaskId === task.id ? "SUPPRESSION…" : "SUPPRIMER LA MISSION"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${styles.tableCard} ${styles.dispatchProOrders}`}>
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



      {dispatchView === "routes" && (
        <section className={styles.dispatchProRoutes}>
          <div className={styles.routesHero}>
            <div className={styles.routesHeroText}>
              <span className={styles.routesEyebrow}><MapPin size={15} /> GLORY SOLUTIONS · PLANIFICATION</span>
              <h2>Routes & arrêts</h2>
              <p>Une vue claire de vos secteurs, chauffeurs, commandes et colis. Préparez une route même avant de recevoir les missions.</p>
            </div>
            <button type="button" className={styles.routesPrimaryButton} onClick={() => setNewRouteOpen((value) => !value)}>
              <Plus size={19} /> {newRouteOpen ? "Fermer le formulaire" : "Créer une route"}
            </button>
          </div>

          {newRouteOpen && (
            <form className={styles.routesCreatePanel} onSubmit={(event) => { event.preventDefault(); void createNewDraftRoute(); }}>
              <div><span className={styles.routesEyebrow}>NOUVELLE ROUTE</span><h3>Préparer un nouveau secteur</h3><p>Créez un brouillon sans commande. Les colis ne seront comptés qu'une fois liés à une mission.</p></div>
              <div className={styles.routesSectorCreator}>
                <strong>+ Créer un secteur pour une nouvelle ville ou zone</strong>
                <p>Ex. LAV · Laval · H7A, H7B. Les préfixes postaux sont enregistrés avec le secteur, sans modifier les commandes existantes.</p>
                <div className={styles.routesSectorFields}>
                  <label>Code unique<input value={sectorCode} maxLength={8} placeholder="LAV" onChange={e => setSectorCode(e.target.value.toUpperCase())} /></label>
                  <label>Nom du secteur<input value={sectorName} maxLength={100} placeholder="Laval" onChange={e => setSectorName(e.target.value)} /></label>
                  <label>Préfixes postaux<input value={sectorPostal} placeholder="H7A, H7B, H7C" onChange={e => setSectorPostal(e.target.value.toUpperCase())} /></label>
                  <button type="button" className={styles.routesPrimaryButton} disabled={sectorSaving || !sectorCode || !sectorName} onClick={() => void saveNewSector()}>{sectorSaving ? "Enregistrement…" : "Enregistrer le secteur"}</button>
                </div>
              </div>
              <div className={styles.routesCreateGrid}>
                <label>Secteur
                  <select value={newRouteSector} onChange={(event) => setNewRouteSector(event.target.value)} required>
                    <option value="MTL">Montréal</option><option value="RS">Rive-Sud</option><option value="RN">Rive-Nord</option><option value="ME">Montréal Est</option><option value="MO">Montréal Ouest</option>
                    {routeSectors.filter(s => !["RS", "RN", "MTL", "ME", "MO"].includes(s.code)).map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                  </select>
                </label>
                <label>Date prévue<input type="date" value={newRouteDate} onChange={(event) => setNewRouteDate(event.target.value)} required /></label>
                <label className={styles.routesNotesField}>Notes de planification<input maxLength={5000} placeholder="Ex. Nouveaux clients à Laval, tournée à préparer…" value={newRouteNotes} onChange={(event) => setNewRouteNotes(event.target.value)} /></label>
              </div>
              <button type="submit" className={styles.routesPrimaryButton} disabled={!newRouteDate || newRouteSaving}>{newRouteSaving ? "Création…" : "Enregistrer la route brouillon"} <ChevronRight size={17} /></button>
            </form>
          )}

          <div className={styles.routesFilterPanel}>
            <div className={styles.routesFilterTitle}><Search size={18} /><strong>Rechercher et filtrer</strong><span>{filteredDispatchRoutes.length} route(s)</span></div>
            <div className={styles.routesFilterGrid}>
              <label>Recherche<input aria-label="Rechercher une route" placeholder="Code, chauffeur, véhicule…" value={dispatchRouteSearch} onChange={(event) => setDispatchRouteSearch(event.target.value)} /></label>
              <label>Secteur<select value={dispatchRouteSector} onChange={(event) => setDispatchRouteSector(event.target.value)}><option value="">Tous les secteurs</option><option value="RS">Rive-Sud</option><option value="RN">Rive-Nord</option><option value="MTL">Montréal</option><option value="ME">Montréal Est</option><option value="MO">Montréal Ouest</option>{routeSectors.filter(s => !["RS", "RN", "MTL", "ME", "MO"].includes(s.code)).map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}</select></label>
              <label>Date exacte<input aria-label="Filtrer par date exacte" type="date" value={dispatchRouteDate} onChange={(event) => setDispatchRouteDate(event.target.value)} /></label>
              <label>Du<input aria-label="Date de début" type="date" value={dispatchRouteDateFrom} disabled={Boolean(dispatchRouteDate)} onChange={(event) => setDispatchRouteDateFrom(event.target.value)} /></label>
              <label>Au<input aria-label="Date de fin" type="date" value={dispatchRouteDateTo} disabled={Boolean(dispatchRouteDate)} onChange={(event) => setDispatchRouteDateTo(event.target.value)} /></label>
              <label>Chauffeur<select value={dispatchRouteDriver} onChange={(event) => setDispatchRouteDriver(event.target.value)}><option value="">Tous les chauffeurs</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{[driver.first_name, driver.last_name].filter(Boolean).join(" ") || `Chauffeur #${driver.id}`}</option>)}</select></label>
              <label>Statut<select value={dispatchRouteStatus} onChange={(event) => setDispatchRouteStatus(event.target.value)}><option value="">Tous les statuts</option><option value="draft">Brouillon</option><option value="assigned">Assignée</option><option value="in_progress">En cours</option><option value="completed">Terminée</option><option value="cancelled">Annulée</option></select></label>
              <button type="button" className={styles.routesResetButton} onClick={() => {setDispatchRouteSearch("");setDispatchRouteSector("");setDispatchRouteDate("");setDispatchRouteDateFrom("");setDispatchRouteDateTo("");setDispatchRouteDriver("");setDispatchRouteStatus("");void loadDispatchRoutes();}} disabled={dispatchRoutesLoading}><RefreshCw size={16} /> Réinitialiser</button>
            </div>
          </div>

          {dispatchRoutesError && (
            <p role="alert" style={{ color: "#b91c1c" }}>
              {dispatchRoutesError}
            </p>
          )}

          {dispatchRoutesLoading ? (
            <p>Chargement des routes...</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <p>
                {filteredDispatchRoutes.length} route(s) affichée(s)
              </p>

              {filteredDispatchRoutes.map((route) => (
                <div
                  key={route.id}
                  className={styles.routeProCard}
                >
                  <div className={styles.routesCardHeading}><span className={styles.routesCardIcon}><Truck size={22} /></span><div><span className={styles.routesEyebrow}>TOURNÉE #{route.id}</span><strong>{route.route_code || `Route #${route.id}`}</strong></div><span className={styles.routesStatusBadge}>{route.status === "draft" ? "À préparer" : route.status === "assigned" ? "Assignée" : route.status === "in_progress" ? "En cours" : route.status === "completed" ? "Terminée" : route.status || "—"}</span></div>

                  <span>
                    {dateTime(route.scheduled_date)}
                    {" · "}
                    {route.status === "draft" ? "Route brouillon" : "Tournée planifiée"}
                  </span>

                  <span>
                    Chauffeur :{" "}
                    {drivers.find(
                      (driver) => driver.id === route.driver_id
                    )
                      ? [
                          drivers.find(
                            (driver) => driver.id === route.driver_id
                          )?.first_name,
                          drivers.find(
                            (driver) => driver.id === route.driver_id
                          )?.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      : route.driver_name || "Non assigné"}
                  </span>

                  <span>
                    Véhicule :{" "}
                    {[
                      route.vehicle_make,
                      route.vehicle_model,
                      route.vehicle_plate,
                    ]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </span>

                  <div className={styles.routeProMetrics} aria-label="Totaux de la route">
                    <div><strong>{asCount(route.total_stops)}</strong><span>Arrêts</span></div>
                    <div><strong>{asCount(route.total_orders)}</strong><span>Commandes</span></div>
                    <div><strong>{asCount(route.total_packages)}</strong><span>Boîtes / colis</span></div>
                    <div><strong>{asCount(route.total_pallets)}</strong><span>Palettes</span></div>
                  </div>

                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <Link
                      href={`/dashboard/admin/dispatch/routes/${route.id}`}
                      className={styles.routesViewButton}
                    >
                      Voir la fiche de route
                      <ChevronRight size={16} />
                    </Link>
                    {['draft','assigned','in_progress'].includes(String(route.status || '')) && (
                      <button type="button" className={styles.routesDeleteButton} onClick={() => void deleteDispatchRoute(route)}>
                        <Trash2 size={16} /> Supprimer la route
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {!filteredDispatchRoutes.length && (
                <p>Aucune route pour ces filtres.</p>
              )}
            </div>
          )}

          {dispatchRouteDetailLoading && (
            <p>Chargement des arrêts et commandes...</p>
          )}

          {selectedDispatchRoute && (
            <div
              style={{
                marginTop: 24,
                padding: 20,
                border: "1px solid #d1d5db",
                borderRadius: 16,
                background: "#f9fafb",
                display: "grid",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <h3>
                  {selectedDispatchRoute.route_code ||
                    `Route #${selectedDispatchRoute.id}`}
                </h3>

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setSelectedDispatchRoute(null)}
                >
                  <X size={16} />
                  Fermer
                </button>
              </div>

              <div className={styles.routeProMetrics}>
                <div><strong>{asCount(selectedDispatchRoute.total_stops)}</strong><span>Arrêts</span></div>
                <div><strong>{asCount(selectedDispatchRoute.total_orders)}</strong><span>Commandes uniques</span></div>
                <div><strong>{asCount(selectedDispatchRoute.total_packages)}</strong><span>Boîtes / colis uniques</span></div>
                <div><strong>{asCount(selectedDispatchRoute.total_pallets)}</strong><span>Palettes uniques</span></div>
              </div>

              {(selectedDispatchRoute.stops || []).map((stop) => (
                <details
                  key={stop.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 16,
                    background: "#fff",
                  }}
                >
                  <summary style={{ cursor: "pointer" }}>
                    <strong>
                      Arrêt #{stop.stop_position ?? "—"}
                      {" · "}
                      {stop.task_type === "pickup"
                        ? "Ramassage"
                        : stop.task_type === "delivery"
                          ? "Livraison"
                          : stop.task_type}
                    </strong>

                    <div style={{ marginTop: 8 }}>
                      {[
                        stop.address,
                        stop.city,
                        stop.province,
                        stop.postal_code,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Adresse non renseignée"}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      {asCount(stop.total_orders)} commande(s)
                      {" · "}
                      {asCount(stop.total_packages)} boîte(s) / colis
                      {" · "}
                      {asCount(stop.total_pallets)} palette(s)
                    </div>
                  </summary>

                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      marginTop: 16,
                    }}
                  >
                    <p>
                      Date :{" "}
                      {dateTime(
                        stop.scheduled_date,
                        stop.scheduled_time
                      )}
                      {" · "}
                      Statut : {stop.status || "—"}
                    </p>

                    {stop.notes && <p>Note : {stop.notes}</p>}

                    {(stop.orders || []).map((order) => (
                      <details
                        key={order.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 10,
                          padding: 14,
                        }}
                      >
                        <summary style={{ cursor: "pointer" }}>
                          <strong>
                            {order.order_number ||
                              `Commande #${order.id}`}
                          </strong>
                          {" · "}
                          {order.packages?.length || 0} boîte(s) / colis
                        </summary>

                        <div
                          style={{
                            display: "grid",
                            gap: 8,
                            marginTop: 12,
                          }}
                        >
                          <p>
                            Client :{" "}
                            {order.client_company_name ||
                              [
                                order.client_first_name,
                                order.client_last_name,
                              ]
                                .filter(Boolean)
                                .join(" ") ||
                              `Client #${order.client_id || "—"}`}
                          </p>

                          <p>Statut : {order.status || "—"}</p>
                          <p>
                            Ramassage :{" "}
                            {order.pickup_address || "—"}
                          </p>
                          <p>
                            Livraison :{" "}
                            {order.delivery_address || "—"}
                          </p>
                          <p>
                            Service :{" "}
                            {order.service_level === "same_day"
                              ? "Jour même"
                              : order.service_level === "urgent"
                                ? "Urgent"
                                : order.service_level === "standard"
                                  ? "Standard"
                                  : order.service_level || "—"}
                          </p>

                          <p>
                            Priorité : {order.priority || "—"}
                          </p>

                          <strong>Rendez-vous de ramassage</strong>
                          <p>
                            {order.pickup_appointment
                              ? "Rendez-vous obligatoire"
                              : "Sans rendez-vous précis"}
                          </p>
                          <p>
                            Date : {dateTime(order.pickup_date)}
                            {order.pickup_time
                              ? ` · Heure : ${order.pickup_time}`
                              : ""}
                          </p>

                          <strong>Rendez-vous de livraison</strong>
                          <p>
                            {order.delivery_appointment
                              ? "Rendez-vous obligatoire"
                              : "Sans rendez-vous précis"}
                          </p>
                          <p>
                            Date : {dateTime(order.delivery_date)}
                            {order.delivery_time
                              ? ` · Heure : ${order.delivery_time}`
                              : ""}
                          </p>

                          <strong>Destinataire</strong>
                          <p>
                            Type :{" "}
                            {order.destination_type === "commercial"
                              ? "Commercial"
                              : order.destination_type === "residential"
                                ? "Résidentiel"
                                : "—"}
                          </p>

                          {order.company_name && (
                            <p>Entreprise : {order.company_name}</p>
                          )}

                          {order.contact_name && (
                            <p>Contact : {order.contact_name}</p>
                          )}

                          {order.contact_phone && (
                            <p>
                              Téléphone : {order.contact_phone}
                              {order.contact_extension
                                ? ` poste ${order.contact_extension}`
                                : ""}
                            </p>
                          )}

                          {order.delivery_unit && (
                            <p>Unité : {order.delivery_unit}</p>
                          )}

                          <strong>Preuve de livraison</strong>
                          <p>
                            {order.signature_required
                              ? "Signature requise"
                              : "Photo requise"}
                          </p>

                          {order.description && (
                            <p>Description : {order.description}</p>
                          )}

                          {order.notes && (
                            <p>Instructions du client : {order.notes}</p>
                          )}

                          <strong>Colis</strong>

                          {(order.packages || []).map((item) => (
                            <div
                              key={item.id}
                              style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                padding: 10,
                              }}
                            >
                              <strong>
                                Colis #{item.package_number ?? item.id}
                              </strong>

                              <p>
                                Code-barres : {item.barcode || "—"}
                              </p>
                              <p>
                                Type :{" "}
                                {item.package_type === "box"
                                  ? "Boîte"
                                  : item.package_type === "pallet"
                                    ? "Palette"
                                    : item.package_type || "—"}
                              </p>

                              <p>
                                Poids :{" "}
                                {item.weight != null
                                  ? `${item.weight} ${item.weight_unit || ""}`
                                  : "Non renseigné"}
                              </p>

                              <p>
                                Dimensions :{" "}
                                {item.length != null &&
                                item.width != null &&
                                item.height != null
                                  ? `${item.length} × ${item.width} × ${item.height} ${item.dimension_unit || ""}`
                                  : "Non renseignées"}
                              </p>

                              <p>
                                Statut : {item.current_status || "—"}
                              </p>

                              {item.description && (
                                <p>{item.description}</p>
                              )}
                            </div>
                          ))}

                          {!order.packages?.length && (
                            <p>Aucun colis enregistré.</p>
                          )}
                        </div>
                      </details>
                    ))}

                    {!stop.orders?.length && (
                      <p>Aucune commande reliée à cet arrêt.</p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      )}

      {warehouseScannerOpen && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={closeWarehouseScanner}
        >
          <section
            className={styles.operationsModal}
            onMouseDown={(event) => event.stopPropagation()}
            style={{ maxWidth: 1180 }}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>
                  <ScanLine size={16} /> Scanner entrepôt
                </span>
                <h2>Traçabilité des colis</h2>
                <p>
                  Entrée, stockage et sortie entrepôt avec utilisateur,
                  date, appareil et GPS lorsque disponible.
                </p>
              </div>
              <button
                className={styles.iconBtn}
                onClick={closeWarehouseScanner}
                type="button"
                aria-label="Fermer le scanner"
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(300px, 0.9fr) minmax(0, 1.4fr)",
                gap: 18,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 18,
                  background: "#fff",
                }}
              >
                <div className={styles.sectionTitleRow}>
                  <h3>Nouveau scan</h3>
                  <span>Entrepôt</span>
                </div>

                <label style={{ display: "grid", gap: 7, marginBottom: 14 }}>
                  Étape du colis
                  <select
                    value={warehouseScanType}
                    onChange={(event) =>
                      setWarehouseScanType(
                        event.target.value as WarehouseScanType,
                      )
                    }
                  >
                    {WAREHOUSE_SCAN_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: "#6b7280" }}>
                    {
                      WAREHOUSE_SCAN_TYPES.find(
                        (item) => item.value === warehouseScanType,
                      )?.description
                    }
                  </small>
                </label>

                <label style={{ display: "grid", gap: 7, marginBottom: 14 }}>
                  Type de lecteur
                  <select
                    value={
                      warehouseScanSource === "camera"
                        ? "barcode_scanner"
                        : warehouseScanSource
                    }
                    onChange={(event) =>
                      setWarehouseScanSource(
                        event.target.value as WarehouseScanSource,
                      )
                    }
                  >
                    {WAREHOUSE_SCAN_SOURCES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 7, marginBottom: 14 }}>
                  Code du colis / commande
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 8,
                    }}
                  >
                    <input
                      autoFocus
                      value={warehouseScanCode}
                      onChange={(event) =>
                        setWarehouseScanCode(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void submitWarehouseScan();
                        }
                      }}
                      placeholder="Scanne le code-barres..."
                      autoComplete="off"
                      style={{
                        minWidth: 0,
                        fontFamily: "monospace",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    />
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => void startWarehouseCamera()}
                      disabled={warehouseScanLoading}
                      title="Scanner avec la caméra"
                    >
                      <Camera size={17} />
                    </button>
                  </div>
                </label>

                <label style={{ display: "grid", gap: 7, marginBottom: 14 }}>
                  Note
                  <textarea
                    value={warehouseScanNotes}
                    onChange={(event) =>
                      setWarehouseScanNotes(event.target.value)
                    }
                    rows={3}
                    placeholder="Note optionnelle..."
                  />
                </label>

                {warehouseCameraError && (
                  <div
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #fecaca",
                      borderRadius: 10,
                      marginBottom: 12,
                      background: "#fff7f7",
                      fontSize: 13,
                    }}
                  >
                    {warehouseCameraError}
                  </div>
                )}

                {warehouseCameraOpen && (
                  <div
                    style={{
                      marginBottom: 14,
                      borderRadius: 14,
                      overflow: "hidden",
                      background: "#111",
                    }}
                  >
                    <video
                      id="warehouse-scanner-video"
                      playsInline
                      muted
                      style={{
                        display: "block",
                        width: "100%",
                        minHeight: 220,
                        objectFit: "cover",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const video = document.getElementById(
                          "warehouse-scanner-video",
                        ) as HTMLVideoElement | null;
                        const stream =
                          video?.srcObject as MediaStream | null;
                        stream
                          ?.getTracks()
                          .forEach((track) => track.stop());
                        if (video) video.srcObject = null;
                        setWarehouseCameraOpen(false);
                      }}
                      style={{
                        width: "100%",
                        padding: 10,
                        border: 0,
                        cursor: "pointer",
                      }}
                    >
                      Fermer la caméra
                    </button>
                  </div>
                )}

                <button
                  className={styles.saveOperationBtn}
                  onClick={() => void submitWarehouseScan()}
                  disabled={
                    warehouseScanLoading ||
                    !warehouseScanCode.trim()
                  }
                  type="button"
                >
                  {warehouseScanLoading ? (
                    <Loader2 size={17} className={styles.spin} />
                  ) : (
                    <ScanLine size={17} />
                  )}
                  Enregistrer le scan
                </button>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginTop: 10,
                    color: "#6b7280",
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Keyboard size={14} /> USB / Zebra
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <MapPin size={14} /> GPS au scan
                  </span>
                </div>

                {warehouseScanResult && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: 14,
                      borderRadius: 12,
                      border: `1px solid ${
                        warehouseScanResult.rejected
                          ? "#fecaca"
                          : warehouseScanResult.duplicate
                            ? "#fde68a"
                            : "#bbf7d0"
                      }`,
                      background: warehouseScanResult.rejected
                        ? "#fff7f7"
                        : warehouseScanResult.duplicate
                          ? "#fffbeb"
                          : "#f0fdf4",
                    }}
                  >
                    <strong>
                      {warehouseScanResult.rejected
                        ? "Scan refusé"
                        : warehouseScanResult.duplicate
                          ? "Doublon"
                          : "Scan accepté"}
                    </strong>
                    <div style={{ marginTop: 5 }}>
                      {warehouseScanResult.message || "—"}
                    </div>
                    {warehouseScanResult.event_id && (
                      <small>
                        Événement #{warehouseScanResult.event_id}
                      </small>
                    )}
                  </div>
                )}
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    padding: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <div>
                    <strong>Historique des scans</strong>
                    <div style={{ color: "#6b7280", fontSize: 13 }}>
                      50 derniers événements entrepôt
                    </div>
                  </div>
                  <button
                    className={styles.refreshBtn}
                    onClick={() => void loadWarehouseScanHistory()}
                    disabled={warehouseScanHistoryLoading}
                    type="button"
                  >
                    <RefreshCw
                      size={16}
                      className={
                        warehouseScanHistoryLoading ? styles.spin : ""
                      }
                    />
                    Actualiser
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: "62vh",
                    overflow: "auto",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                        background: "#fafafa",
                      }}
                    >
                      <tr>
                        <th style={{ padding: 11, textAlign: "left" }}>
                          Heure
                        </th>
                        <th style={{ padding: 11, textAlign: "left" }}>
                          Commande / colis
                        </th>
                        <th style={{ padding: 11, textAlign: "left" }}>
                          Étape
                        </th>
                        <th style={{ padding: 11, textAlign: "left" }}>
                          Résultat
                        </th>
                        <th style={{ padding: 11, textAlign: "left" }}>
                          Par
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseScanHistoryLoading &&
                      warehouseScanHistory.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              padding: 28,
                              textAlign: "center",
                            }}
                          >
                            <Loader2
                              size={22}
                              className={styles.spin}
                            />{" "}
                            Chargement...
                          </td>
                        </tr>
                      ) : warehouseScanHistory.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              padding: 30,
                              textAlign: "center",
                              color: "#6b7280",
                            }}
                          >
                            Aucun scan entrepôt.
                          </td>
                        </tr>
                      ) : (
                        warehouseScanHistory.map((scan) => {
                          const actor =
                            [
                              scan.scanned_by_first_name,
                              scan.scanned_by_last_name,
                            ]
                              .filter(Boolean)
                              .join(" ")
                              .trim() ||
                            (scan.scanned_by_user_id
                              ? `Utilisateur #${scan.scanned_by_user_id}`
                              : "Système");

                          return (
                            <tr
                              key={scan.id}
                              style={{
                                borderTop: "1px solid #e5e7eb",
                              }}
                            >
                              <td
                                style={{
                                  padding: 11,
                                  whiteSpace: "nowrap",
                                  fontSize: 12,
                                }}
                              >
                                {historyDate(scan.scanned_at)}
                              </td>
                              <td style={{ padding: 11 }}>
                                <strong>
                                  {scan.order_number ||
                                    `Commande #${scan.order_id}`}
                                </strong>
                                <div
                                  style={{
                                    color: "#6b7280",
                                    fontSize: 12,
                                    marginTop: 3,
                                  }}
                                >
                                  {scan.barcode ||
                                    scan.scanned_code ||
                                    `Colis #${scan.package_id}`}
                                </div>
                              </td>
                              <td style={{ padding: 11 }}>
                                {operationTypeLabel(scan.scan_type)}
                                {scan.warehouse_name && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "#6b7280",
                                      marginTop: 3,
                                    }}
                                  >
                                    {scan.warehouse_name}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: 11 }}>
                                <strong>
                                  {scan.scan_status === "accepted"
                                    ? "Accepté"
                                    : scan.scan_status === "duplicate"
                                      ? "Doublon"
                                      : "Refusé"}
                                </strong>
                                {scan.notes && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "#6b7280",
                                      marginTop: 3,
                                      maxWidth: 220,
                                    }}
                                  >
                                    {scan.notes}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: 11 }}>
                                {actor}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

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
import {
  Activity,
  Building2,
  Clock3,
  FileCheck2,
  FileText,
  LayoutDashboard,
  PackageCheck,
  Route,
  Settings,
  Truck,
  Users,
} from "lucide-react";

export const adminNavigationItems = [
  {
    label: "Vue d’ensemble",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
  },

  {
    label: "Demandes",
    href: "/dashboard/admin/requests",
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

  // ==========================================================
  // DISPATCH
  // ==========================================================

  {
    label: "Dispatch",
    href: "/dashboard/admin/dispatch",
    icon: Route,
  },

  // ==========================================================
  // BONS DE LIVRAISON
  // ==========================================================

  {
    label: "Bons de livraison",
    href: "/dashboard/admin/delivery-notes",
    icon: FileCheck2,
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
] as const;
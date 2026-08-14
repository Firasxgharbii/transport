"use client";

import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  DollarSign,
  Download,
  Eye,
  FileText,
  Loader2,
  Mail,
  Package,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  Truck,
  UserRound,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import styles from "./invoices.module.css";

/* ============================================================
   TYPES
============================================================ */

type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

type PaymentMethod =
  | "cash"
  | "credit_card"
  | "debit_card"
  | "bank_transfer"
  | "interac"
  | "cheque"
  | "other";

type Client = {
  id: number;

  first_name?: string;
  last_name?: string;

  company_name?: string | null;

  phone?: string | null;
  email?: string | null;

  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
};

type Order = {
  id: number;

  order_number?: string;

  client_id: number;
  driver_id?: number | null;
  vehicle_id?: number | null;

  client_first_name?: string;
  client_last_name?: string;
  company_name?: string | null;

  pickup_address?: string | null;
  delivery_address?: string | null;

  pickup_date?: string | null;
  delivery_date?: string | null;

  pallets_count?: number | string | null;

  description?: string | null;
  notes?: string | null;

  subtotal?: number | string | null;
  taxes?: number | string | null;
  total_amount?: number | string | null;

  status?: string;

  created_at?: string | null;
};

type Payment = {
  id: number;

  invoice_id: number;

  amount: number | string;

  payment_method?: PaymentMethod;
  transaction_reference?: string | null;

  payment_date?: string | null;
  notes?: string | null;

  created_at?: string | null;
};

type Invoice = {
  id: number;

  invoice_number?: string;

  order_id?: number | null;
  client_id?: number;

  order_number?: string | null;

  client_first_name?: string;
  client_last_name?: string;
  company_name?: string | null;

  client_email?: string | null;
  client_phone?: string | null;

  billing_address?: string | null;
  billing_city?: string | null;
  billing_province?: string | null;
  billing_postal_code?: string | null;

  issue_date?: string | null;
  due_date?: string | null;

  subtotal?: number | string;
  taxes?: number | string;
  total_amount?: number | string;

  paid_amount?: number | string;
  balance_due?: number | string;

  status?: InvoiceStatus;

  notes?: string | null;
  terms?: string | null;

  sent_at?: string | null;
  paid_at?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  payments?: Payment[];
};

type InvoicesResponse = {
  success?: boolean;
  data?: Invoice[];
  invoices?: Invoice[];
  message?: string;
};

type OrdersResponse = {
  success?: boolean;
  data?: Order[];
  orders?: Order[];
  message?: string;
};

type ClientsResponse = {
  success?: boolean;
  data?: Client[];
  clients?: Client[];
  message?: string;
};

type InvoiceResponse = {
  success?: boolean;
  data?: Invoice;
  invoice?: Invoice;
  message?: string;
};

type InvoiceFilter =
  | "all"
  | InvoiceStatus;

type InvoiceForm = {
  order_id: string;
  client_id: string;

  issue_date: string;
  due_date: string;

  subtotal: string;
  taxes: string;
  total_amount: string;

  billing_address: string;
  billing_city: string;
  billing_province: string;
  billing_postal_code: string;

  notes: string;
  terms: string;

  status: InvoiceStatus;
};

type PaymentForm = {
  amount: string;
  payment_method: PaymentMethod;
  payment_date: string;
  transaction_reference: string;
  notes: string;
};

/* ============================================================
   CONFIGURATION
============================================================ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://192.168.2.22:5000";

const ITEMS_PER_PAGE = 8;

const DEFAULT_TERMS =
  "Paiement exigible avant la date d’échéance. Merci de votre confiance.";

function getToday() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function getDefaultDueDate() {
  const date = new Date();

  date.setDate(
    date.getDate() + 30,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

const EMPTY_INVOICE_FORM: InvoiceForm = {
  order_id: "",
  client_id: "",

  issue_date: getToday(),
  due_date: getDefaultDueDate(),

  subtotal: "0.00",
  taxes: "0.00",
  total_amount: "0.00",

  billing_address: "",
  billing_city: "",
  billing_province: "Québec",
  billing_postal_code: "",

  notes: "",
  terms: DEFAULT_TERMS,

  status: "draft",
};

const EMPTY_PAYMENT_FORM: PaymentForm = {
  amount: "",
  payment_method: "interac",
  payment_date: getToday(),
  transaction_reference: "",
  notes: "",
};

/* ============================================================
   UTILITAIRES
============================================================ */

function getToken() {
  if (
    typeof window === "undefined"
  ) {
    return "";
  }

  return (
    window.localStorage.getItem(
      "glory_token",
    ) || ""
  );
}

function formatMoney(
  value?: number | string | null,
) {
  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    "fr-CA",
    {
      style: "currency",
      currency: "CAD",
    },
  ).format(amount);
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Non définie";
  }

  const normalizedValue =
    value.includes("T")
      ? value
      : `${value}T00:00:00`;

  const date =
    new Date(normalizedValue);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-CA",
    {
      dateStyle: "medium",
    },
  ).format(date);
}
type ClientIdentity = {
  company_name?: string | null;

  first_name?: string | null;
  last_name?: string | null;

  client_first_name?: string | null;
  client_last_name?: string | null;
};

function getPersonNames(
  item: ClientIdentity,
): {
  firstName: string;
  lastName: string;
} {
  const firstName =
    item.client_first_name ??
    item.first_name ??
    "";

  const lastName =
    item.client_last_name ??
    item.last_name ??
    "";

  return {
    firstName,
    lastName,
  };
}

function getClientName(
  item: ClientIdentity,
): string {
  const companyName =
    item.company_name?.trim();

  if (companyName) {
    return companyName;
  }

  const {
    firstName,
    lastName,
  } = getPersonNames(item);

  const fullName = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    "Client non défini"
  );
}

function getClientContactName(
  item: ClientIdentity,
): string {
  const {
    firstName,
    lastName,
  } = getPersonNames(item);

  return [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getInvoiceBalance(
  invoice: Invoice,
) {
  if (
    invoice.balance_due !==
      undefined &&
    invoice.balance_due !== null
  ) {
    return Number(
      invoice.balance_due,
    );
  }

  return Math.max(
    0,
    Number(
      invoice.total_amount || 0,
    ) -
      Number(
        invoice.paid_amount || 0,
      ),
  );
}

function getPaidAmount(
  invoice: Invoice,
) {
  if (
    invoice.paid_amount !==
      undefined &&
    invoice.paid_amount !== null
  ) {
    return Number(
      invoice.paid_amount,
    );
  }

  return (
    invoice.payments?.reduce(
      (total, payment) =>
        total +
        Number(
          payment.amount || 0,
        ),
      0,
    ) || 0
  );
}

function isInvoiceOverdue(
  invoice: Invoice,
) {
  if (
    invoice.status === "paid" ||
    invoice.status ===
      "cancelled"
  ) {
    return false;
  }

  if (!invoice.due_date) {
    return false;
  }

  const dueDate = new Date(
    `${invoice.due_date.slice(
      0,
      10,
    )}T23:59:59`,
  );

  return (
    dueDate.getTime() <
    Date.now()
  );
}

function getEffectiveStatus(
  invoice: Invoice,
): InvoiceStatus {
  if (
    invoice.status === "paid" ||
    invoice.status ===
      "cancelled"
  ) {
    return invoice.status;
  }

  if (
    isInvoiceOverdue(invoice)
  ) {
    return "overdue";
  }

  return (
    invoice.status || "draft"
  );
}

function getStatusLabel(
  status?: InvoiceStatus,
) {
  switch (status) {
    case "draft":
      return "Brouillon";

    case "sent":
      return "Envoyée";

    case "partially_paid":
      return "Partiellement payée";

    case "paid":
      return "Payée";

    case "overdue":
      return "En retard";

    case "cancelled":
      return "Annulée";

    default:
      return "Inconnue";
  }
}

function getPaymentMethodLabel(
  method?: PaymentMethod,
) {
  switch (method) {
    case "cash":
      return "Comptant";

    case "credit_card":
      return "Carte de crédit";

    case "debit_card":
      return "Carte de débit";

    case "bank_transfer":
      return "Virement bancaire";

    case "interac":
      return "Virement Interac";

    case "cheque":
      return "Chèque";

    default:
      return "Autre";
  }
}

function calculateAmounts(
  subtotalValue: string,
  taxesValue: string,
) {
  const subtotal =
    Number(subtotalValue || 0);

  const taxes =
    Number(taxesValue || 0);

  return {
    subtotal:
      Number.isFinite(subtotal)
        ? subtotal
        : 0,

    taxes:
      Number.isFinite(taxes)
        ? taxes
        : 0,

    total:
      Number(
        (
          (Number.isFinite(
            subtotal,
          )
            ? subtotal
            : 0) +
          (Number.isFinite(taxes)
            ? taxes
            : 0)
        ).toFixed(2),
      ),
  };
}

/* ============================================================
   PAGE
============================================================ */

export default function InvoicesPage() {
  const router = useRouter();

  const [invoices, setInvoices] =
    useState<Invoice[]>([]);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<InvoiceFilter>("all");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    showInvoiceModal,
    setShowInvoiceModal,
  ] = useState(false);

  const [
    showDetailsModal,
    setShowDetailsModal,
  ] = useState(false);

  const [
    showPaymentModal,
    setShowPaymentModal,
  ] = useState(false);

  const [
    selectedInvoice,
    setSelectedInvoice,
  ] =
    useState<Invoice | null>(
      null,
    );

  const [
    invoiceForm,
    setInvoiceForm,
  ] =
    useState<InvoiceForm>(
      EMPTY_INVOICE_FORM,
    );

  const [
    paymentForm,
    setPaymentForm,
  ] =
    useState<PaymentForm>(
      EMPTY_PAYMENT_FORM,
    );

  /* ============================================================
     FETCH AUTHENTIFIÉ
  ============================================================ */

  const authenticatedFetch =
    useCallback(
      async <T,>(
        endpoint: string,
        options: RequestInit = {},
      ): Promise<T> => {
        const token = getToken();

        if (!token) {
          router.replace("/login");

          throw new Error(
            "Votre session a expiré.",
          );
        }

        const response =
          await fetch(
            `${API_URL}${endpoint}`,
            {
              ...options,

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,

                ...options.headers,
              },

              cache: "no-store",
            },
          );

        let responseData:
          | unknown = null;

        try {
          responseData =
            await response.json();
        } catch {
          responseData = null;
        }

        if (
          response.status === 401
        ) {
          window.localStorage.removeItem(
            "glory_token",
          );

          window.localStorage.removeItem(
            "glory_user",
          );

          router.replace("/login");

          throw new Error(
            "Votre session a expiré.",
          );
        }

        if (!response.ok) {
          const apiError =
            responseData as {
              message?: string;
            } | null;

          throw new Error(
            apiError?.message ||
              "Une erreur est survenue.",
          );
        }

        return responseData as T;
      },
      [router],
    );

  /* ============================================================
     CHARGER LES DONNÉES
  ============================================================ */

  const loadData =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const [
          invoiceResult,
          ordersResult,
          clientsResult,
        ] =
          await Promise.allSettled([
            authenticatedFetch<InvoicesResponse>(
              "/api/invoices",
            ),

            authenticatedFetch<OrdersResponse>(
              "/api/orders",
            ),

            authenticatedFetch<ClientsResponse>(
              "/api/clients",
            ),
          ]);

        if (
          invoiceResult.status ===
          "rejected"
        ) {
          throw invoiceResult.reason;
        }

        const receivedInvoices =
          Array.isArray(
            invoiceResult.value.data,
          )
            ? invoiceResult.value.data
            : Array.isArray(
                  invoiceResult.value
                    .invoices,
                )
              ? invoiceResult.value
                  .invoices
              : [];

        setInvoices(
          receivedInvoices,
        );

        if (
          ordersResult.status ===
          "fulfilled"
        ) {
          const receivedOrders =
            Array.isArray(
              ordersResult.value.data,
            )
              ? ordersResult.value.data
              : Array.isArray(
                    ordersResult.value
                      .orders,
                  )
                ? ordersResult.value
                    .orders
                : [];

          setOrders(
            receivedOrders,
          );
        }

        if (
          clientsResult.status ===
          "fulfilled"
        ) {
          const receivedClients =
            Array.isArray(
              clientsResult.value.data,
            )
              ? clientsResult.value.data
              : Array.isArray(
                    clientsResult.value
                      .clients,
                  )
                ? clientsResult.value
                    .clients
                : [];

          setClients(
            receivedClients,
          );
        }
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger les factures.",
        );
      } finally {
        setLoading(false);
      }
    }, [authenticatedFetch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* ============================================================
     STATISTIQUES
  ============================================================ */

  const paidInvoices =
    useMemo(
      () =>
        invoices.filter(
          (invoice) =>
            getEffectiveStatus(
              invoice,
            ) === "paid",
        ),
      [invoices],
    );

  const overdueInvoices =
    useMemo(
      () =>
        invoices.filter(
          (invoice) =>
            getEffectiveStatus(
              invoice,
            ) === "overdue",
        ),
      [invoices],
    );

  const pendingInvoices =
    useMemo(
      () =>
        invoices.filter(
          (invoice) =>
            [
              "draft",
              "sent",
              "partially_paid",
            ].includes(
              getEffectiveStatus(
                invoice,
              ),
            ),
        ),
      [invoices],
    );

  const cancelledInvoices =
    useMemo(
      () =>
        invoices.filter(
          (invoice) =>
            getEffectiveStatus(
              invoice,
            ) === "cancelled",
        ),
      [invoices],
    );

  const totalInvoiced =
    useMemo(
      () =>
        invoices
          .filter(
            (invoice) =>
              getEffectiveStatus(
                invoice,
              ) !== "cancelled",
          )
          .reduce(
            (total, invoice) =>
              total +
              Number(
                invoice.total_amount ||
                  0,
              ),
            0,
          ),
      [invoices],
    );

  const totalCollected =
    useMemo(
      () =>
        invoices.reduce(
          (total, invoice) =>
            total +
            getPaidAmount(invoice),
          0,
        ),
      [invoices],
    );

  const totalOutstanding =
    useMemo(
      () =>
        invoices
          .filter(
            (invoice) =>
              getEffectiveStatus(
                invoice,
              ) !== "cancelled",
          )
          .reduce(
            (total, invoice) =>
              total +
              getInvoiceBalance(
                invoice,
              ),
            0,
          ),
      [invoices],
    );

  /* ============================================================
     FILTRES
  ============================================================ */

  const filteredInvoices =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return invoices.filter(
        (invoice) => {
          const effectiveStatus =
            getEffectiveStatus(
              invoice,
            );

          const searchableContent = [
            invoice.invoice_number,
            invoice.order_number,
            invoice.company_name,
            invoice.client_first_name,
            invoice.client_last_name,
            invoice.client_email,
            invoice.client_phone,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !normalizedSearch ||
            searchableContent.includes(
              normalizedSearch,
            );

          const matchesStatus =
            statusFilter === "all" ||
            effectiveStatus ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      invoices,
      search,
      statusFilter,
    ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredInvoices.length /
        ITEMS_PER_PAGE,
    ),
  );

  useEffect(() => {
    if (
      currentPage > totalPages
    ) {
      setCurrentPage(totalPages);
    }
  }, [
    currentPage,
    totalPages,
  ]);

  const visibleInvoices =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        ITEMS_PER_PAGE;

      return filteredInvoices.slice(
        start,
        start + ITEMS_PER_PAGE,
      );
    }, [
      filteredInvoices,
      currentPage,
    ]);

  /* ============================================================
     FORMULAIRE FACTURE
  ============================================================ */

  const updateInvoiceField = (
    field: keyof InvoiceForm,
    value: string,
  ) => {
    setInvoiceForm(
      (current) => {
        const nextForm = {
          ...current,
          [field]: value,
        };

        if (
          field === "subtotal" ||
          field === "taxes"
        ) {
          const amounts =
            calculateAmounts(
              field === "subtotal"
                ? value
                : nextForm.subtotal,

              field === "taxes"
                ? value
                : nextForm.taxes,
            );

          nextForm.total_amount =
            amounts.total.toFixed(2);
        }

        return nextForm;
      },
    );
  };

  const handleOrderSelection = (
    orderIdValue: string,
  ) => {
    const order = orders.find(
      (item) =>
        String(item.id) ===
        orderIdValue,
    );

    if (!order) {
      setInvoiceForm(
        (current) => ({
          ...current,
          order_id: "",
        }),
      );

      return;
    }

    const client = clients.find(
      (item) =>
        Number(item.id) ===
        Number(order.client_id),
    );

    setInvoiceForm(
      (current) => ({
        ...current,

        order_id:
          String(order.id),

        client_id:
          String(order.client_id),

        subtotal:
          Number(
            order.subtotal || 0,
          ).toFixed(2),

        taxes:
          Number(
            order.taxes || 0,
          ).toFixed(2),

        total_amount:
          Number(
            order.total_amount || 0,
          ).toFixed(2),

        billing_address:
          client?.address || "",

        billing_city:
          client?.city || "",

        billing_province:
          client?.province ||
          "Québec",

        billing_postal_code:
          client?.postal_code || "",

        notes:
          order.description ||
          order.notes ||
          "",
      }),
    );
  };

  const openCreateModal = () => {
    setInvoiceForm({
      ...EMPTY_INVOICE_FORM,
      issue_date: getToday(),
      due_date:
        getDefaultDueDate(),
    });

    setError("");
    setSuccess("");
    setShowInvoiceModal(true);
  };

  const closeCreateModal = () => {
    if (!saving) {
      setShowInvoiceModal(
        false,
      );
    }
  };

  const createInvoice = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !invoiceForm.client_id
    ) {
      setError(
        "Le client est obligatoire.",
      );

      return;
    }

    if (
      !invoiceForm.issue_date ||
      !invoiceForm.due_date
    ) {
      setError(
        "La date d’émission et la date d’échéance sont obligatoires.",
      );

      return;
    }

    const subtotal =
      Number(
        invoiceForm.subtotal,
      );

    const taxes =
      Number(invoiceForm.taxes);

    const totalAmount =
      Number(
        invoiceForm.total_amount,
      );

    if (
      !Number.isFinite(
        subtotal,
      ) ||
      !Number.isFinite(taxes) ||
      !Number.isFinite(
        totalAmount,
      ) ||
      subtotal < 0 ||
      taxes < 0 ||
      totalAmount < 0
    ) {
      setError(
        "Les montants de la facture sont invalides.",
      );

      return;
    }

    setSaving(true);

    try {
      await authenticatedFetch(
        "/api/invoices",
        {
          method: "POST",

          body: JSON.stringify({
            order_id:
              invoiceForm.order_id
                ? Number(
                    invoiceForm.order_id,
                  )
                : null,

            client_id:
              Number(
                invoiceForm.client_id,
              ),

            issue_date:
              invoiceForm.issue_date,

            due_date:
              invoiceForm.due_date,

            subtotal,
            taxes,

            total_amount:
              totalAmount,

            billing_address:
              invoiceForm.billing_address.trim() ||
              null,

            billing_city:
              invoiceForm.billing_city.trim() ||
              null,

            billing_province:
              invoiceForm.billing_province.trim() ||
              null,

            billing_postal_code:
              invoiceForm.billing_postal_code.trim() ||
              null,

            notes:
              invoiceForm.notes.trim() ||
              null,

            terms:
              invoiceForm.terms.trim() ||
              null,

            status:
              invoiceForm.status,
          }),
        },
      );

      setShowInvoiceModal(
        false,
      );

      setSuccess(
        "Facture créée avec succès.",
      );

      await loadData();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible de créer la facture.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ============================================================
     DÉTAILS
  ============================================================ */

  const openInvoiceDetails =
    async (invoice: Invoice) => {
      setError("");
      setSelectedInvoice(
        invoice,
      );

      setShowDetailsModal(
        true,
      );

      try {
        const response =
          await authenticatedFetch<InvoiceResponse>(
            `/api/invoices/${invoice.id}`,
          );

        const detailedInvoice =
          response.data ||
          response.invoice;

        if (detailedInvoice) {
          setSelectedInvoice(
            detailedInvoice,
          );
        }
      } catch {
        // La fenêtre reste ouverte avec
        // les informations déjà disponibles.
      }
    };

  /* ============================================================
     ENVOYER FACTURE
  ============================================================ */

  const sendInvoice = async (
    invoice: Invoice,
  ) => {
    setError("");
    setSuccess("");

    try {
      await authenticatedFetch(
        `/api/invoices/${invoice.id}/send`,
        {
          method: "PATCH",
        },
      );

      setSuccess(
        "La facture a été marquée comme envoyée.",
      );

      await loadData();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible d’envoyer la facture.",
      );
    }
  };

  /* ============================================================
     ANNULER FACTURE
  ============================================================ */

  const cancelInvoice = async (
    invoice: Invoice,
  ) => {
    const confirmed =
      window.confirm(
        `Voulez-vous annuler la facture ${
          invoice.invoice_number ||
          `#${invoice.id}`
        } ?`,
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await authenticatedFetch(
        `/api/invoices/${invoice.id}/status`,
        {
          method: "PATCH",

          body: JSON.stringify({
            status: "cancelled",
          }),
        },
      );

      setShowDetailsModal(
        false,
      );

      setSuccess(
        "Facture annulée.",
      );

      await loadData();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible d’annuler la facture.",
      );
    }
  };

  /* ============================================================
     PAIEMENT
  ============================================================ */

  const openPaymentModal = (
    invoice: Invoice,
  ) => {
    const balance =
      getInvoiceBalance(
        invoice,
      );

    setSelectedInvoice(
      invoice,
    );

    setPaymentForm({
      ...EMPTY_PAYMENT_FORM,

      amount:
        balance > 0
          ? balance.toFixed(2)
          : "",

      payment_date:
        getToday(),
    });

    setShowPaymentModal(true);
  };

  const updatePaymentField = (
    field: keyof PaymentForm,
    value: string,
  ) => {
    setPaymentForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  };

  const savePayment = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (!selectedInvoice) {
      return;
    }

    const amount =
      Number(paymentForm.amount);

    const currentBalance =
      getInvoiceBalance(
        selectedInvoice,
      );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Le montant du paiement est invalide.",
      );

      return;
    }

    if (
      amount >
      currentBalance + 0.01
    ) {
      setError(
        "Le paiement ne peut pas dépasser le solde de la facture.",
      );

      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await authenticatedFetch(
        `/api/invoices/${selectedInvoice.id}/payments`,
        {
          method: "POST",

          body: JSON.stringify({
            amount,

            payment_method:
              paymentForm.payment_method,

            payment_date:
              paymentForm.payment_date,

            transaction_reference:
              paymentForm.transaction_reference.trim() ||
              null,

            notes:
              paymentForm.notes.trim() ||
              null,
          }),
        },
      );

      setShowPaymentModal(
        false,
      );

      setShowDetailsModal(
        false,
      );

      setSuccess(
        "Paiement enregistré avec succès.",
      );

      await loadData();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Impossible d’enregistrer le paiement.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ============================================================
     IMPRESSION
  ============================================================ */

  const printInvoice = (
    invoice: Invoice,
  ) => {
    window.open(
      `/dashboard/admin/invoices/${invoice.id}/print`,
      "_blank",
    );
  };

  return (
    <main className={styles.page}>
      {/* =====================================================
          EN-TÊTE
      ====================================================== */}

      <section
        className={styles.heading}
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            <ReceiptText
              size={16}
            />

            Gestion financière
          </span>

          <h1>Factures</h1>

          <p>
            Créez, envoyez, imprimez
            et suivez les paiements
            de vos factures.
          </p>
        </div>

        <div
          className={
            styles.headingActions
          }
        >
          <button
            type="button"
            className={
              styles.refreshButton
            }
            onClick={() =>
              void loadData()
            }
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? styles.spin
                  : ""
              }
            />

            Actualiser
          </button>

          <button
            type="button"
            className={
              styles.createButton
            }
            onClick={
              openCreateModal
            }
          >
            <Plus size={18} />
            Nouvelle facture
          </button>
        </div>
      </section>

      {/* =====================================================
          MESSAGES
      ====================================================== */}

      {error && (
        <div
          className={
            styles.errorBanner
          }
        >
          <AlertTriangle
            size={18}
          />

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div
          className={
            styles.successBanner
          }
        >
          <CheckCircle2
            size={18}
          />

          <span>{success}</span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =====================================================
          STATISTIQUES
      ====================================================== */}

      <section
        className={
          styles.statsGrid
        }
      >
        <StatCard
          label="Total factures"
          value={String(
            invoices.length,
          )}
          icon={
            <FileText size={20} />
          }
          variant="total"
        />

        <StatCard
          label="Payées"
          value={String(
            paidInvoices.length,
          )}
          icon={
            <CheckCircle2
              size={20}
            />
          }
          variant="paid"
        />

        <StatCard
          label="À recevoir"
          value={String(
            pendingInvoices.length,
          )}
          icon={
            <Clock3 size={20} />
          }
          variant="pending"
        />

        <StatCard
          label="En retard"
          value={String(
            overdueInvoices.length,
          )}
          icon={
            <AlertTriangle
              size={20}
            />
          }
          variant="overdue"
        />

        <StatCard
          label="Annulées"
          value={String(
            cancelledInvoices.length,
          )}
          icon={
            <XCircle size={20} />
          }
          variant="cancelled"
        />

        <StatCard
          label="Montant facturé"
          value={formatMoney(
            totalInvoiced,
          )}
          icon={
            <CircleDollarSign
              size={20}
            />
          }
          variant="invoiced"
        />

        <StatCard
          label="Montant encaissé"
          value={formatMoney(
            totalCollected,
          )}
          icon={
            <WalletCards
              size={20}
            />
          }
          variant="collected"
        />

        <StatCard
          label="Solde à recevoir"
          value={formatMoney(
            totalOutstanding,
          )}
          icon={
            <DollarSign
              size={20}
            />
          }
          variant="balance"
        />
      </section>

      {/* =====================================================
          TABLEAU
      ====================================================== */}

      <section
        className={styles.panel}
      >
        <div
          className={
            styles.toolbar
          }
        >
          <label
            className={
              styles.searchBox
            }
          >
            <Search size={18} />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Rechercher une facture, un client, une entreprise..."
            />
          </label>

          <select
            className={
              styles.statusFilter
            }
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as InvoiceFilter,
              )
            }
          >
            <option value="all">
              Tous les statuts
            </option>

            <option value="draft">
              Brouillons
            </option>

            <option value="sent">
              Envoyées
            </option>

            <option value="partially_paid">
              Partiellement payées
            </option>

            <option value="paid">
              Payées
            </option>

            <option value="overdue">
              En retard
            </option>

            <option value="cancelled">
              Annulées
            </option>
          </select>
        </div>

        <div
          className={
            styles.tableWrapper
          }
        >
          <table
            className={styles.table}
          >
            <thead>
              <tr>
                <th>Facture</th>
                <th>Client</th>
                <th>Commande</th>
                <th>Émission</th>
                <th>Échéance</th>
                <th>Montant</th>
                <th>Payé</th>
                <th>Solde</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({
                  length: 5,
                }).map(
                  (_, index) => (
                    <tr key={index}>
                      <td colSpan={10}>
                        <div
                          className={
                            styles.skeleton
                          }
                        />
                      </td>
                    </tr>
                  ),
                )
              ) : visibleInvoices.length ===
                0 ? (
                <tr>
                  <td colSpan={10}>
                    <div
                      className={
                        styles.emptyState
                      }
                    >
                      <ReceiptText
                        size={44}
                      />

                      <h2>
                        Aucune facture
                        trouvée
                      </h2>

                      <p>
                        Créez votre première
                        facture à partir
                        d’une commande.
                      </p>

                      <button
                        type="button"
                        className={
                          styles.emptyButton
                        }
                        onClick={
                          openCreateModal
                        }
                      >
                        <Plus
                          size={17}
                        />

                        Créer une facture
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleInvoices.map(
                  (invoice) => {
                    const status =
                      getEffectiveStatus(
                        invoice,
                      );

                    const paidAmount =
                      getPaidAmount(
                        invoice,
                      );

                    const balance =
                      getInvoiceBalance(
                        invoice,
                      );

                    return (
                      <tr
                        key={
                          invoice.id
                        }
                      >
                        <td>
                          <div
                            className={
                              styles.invoiceIdentity
                            }
                          >
                            <span>
                              <ReceiptText
                                size={
                                  18
                                }
                              />
                            </span>

                            <div>
                              <strong>
                                {invoice.invoice_number ||
                                  `FAC-${invoice.id}`}
                              </strong>

                              <small>
                                ID #
                                {
                                  invoice.id
                                }
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div
                            className={
                              styles.clientCell
                            }
                          >
                            <strong>
                              {getClientName(
                                invoice,
                              )}
                            </strong>

                            {invoice.company_name && (
                              <small>
                                Contact :{" "}
                                {getClientContactName(
                                  invoice,
                                ) ||
                                  "Non défini"}
                              </small>
                            )}

                            <small>
                              {invoice.client_email ||
                                invoice.client_phone ||
                                "Coordonnées non disponibles"}
                            </small>
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              styles.orderBadge
                            }
                          >
                            <Package
                              size={13}
                            />

                            {invoice.order_number ||
                              (invoice.order_id
                                ? `Commande #${invoice.order_id}`
                                : "Sans commande")}
                          </span>
                        </td>

                        <td>
                          <DateCell
                            value={
                              invoice.issue_date ||
                              invoice.created_at
                            }
                          />
                        </td>

                        <td>
                          <DateCell
                            value={
                              invoice.due_date
                            }
                            danger={
                              status ===
                              "overdue"
                            }
                          />
                        </td>

                        <td>
                          <strong
                            className={
                              styles.amount
                            }
                          >
                            {formatMoney(
                              invoice.total_amount,
                            )}
                          </strong>
                        </td>

                        <td>
                          <strong
                            className={
                              styles.paidAmount
                            }
                          >
                            {formatMoney(
                              paidAmount,
                            )}
                          </strong>
                        </td>

                        <td>
                          <strong
                            className={
                              balance > 0
                                ? styles.balanceAmount
                                : styles.zeroBalance
                            }
                          >
                            {formatMoney(
                              balance,
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`${styles.statusBadge} ${getStatusCssClass(
                              status,
                            )}`}
                          >
                            {getStatusLabel(
                              status,
                            )}
                          </span>
                        </td>

                        <td>
                          <div
                            className={
                              styles.actions
                            }
                          >
                            <button
                              type="button"
                              className={
                                styles.actionButton
                              }
                              onClick={() =>
                                void openInvoiceDetails(
                                  invoice,
                                )
                              }
                              title="Voir la facture"
                            >
                              <Eye
                                size={
                                  16
                                }
                              />
                            </button>

                            <button
                              type="button"
                              className={
                                styles.actionButton
                              }
                              onClick={() =>
                                printInvoice(
                                  invoice,
                                )
                              }
                              title="Imprimer"
                            >
                              <Printer
                                size={
                                  16
                                }
                              />
                            </button>

                            {status !==
                              "paid" &&
                              status !==
                                "cancelled" &&
                              balance >
                                0 && (
                                <button
                                  type="button"
                                  className={`${styles.actionButton} ${styles.paymentAction}`}
                                  onClick={() =>
                                    openPaymentModal(
                                      invoice,
                                    )
                                  }
                                  title="Enregistrer un paiement"
                                >
                                  <DollarSign
                                    size={
                                      16
                                    }
                                  />
                                </button>
                              )}

                            {status ===
                              "draft" && (
                              <button
                                type="button"
                                className={
                                  styles.actionButton
                                }
                                onClick={() =>
                                  void sendInvoice(
                                    invoice,
                                  )
                                }
                                title="Marquer comme envoyée"
                              >
                                <Send
                                  size={
                                    16
                                  }
                                />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>

        <footer
          className={
            styles.pagination
          }
        >
          <span>
            {filteredInvoices.length}{" "}
            facture
            {filteredInvoices.length >
            1
              ? "s"
              : ""}
          </span>

          <div>
            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                )
              }
              disabled={
                currentPage === 1
              }
            >
              <ChevronLeft
                size={16}
              />

              Précédent
            </button>

            <span>
              Page {currentPage} sur{" "}
              {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  (current) =>
                    Math.min(
                      totalPages,
                      current + 1,
                    ),
                )
              }
              disabled={
                currentPage ===
                totalPages
              }
            >
              Suivant

              <ChevronRight
                size={16}
              />
            </button>
          </div>
        </footer>
      </section>

      {/* =====================================================
          MODAL CRÉATION
      ====================================================== */}

      {showInvoiceModal && (
        <div
          className={
            styles.modalOverlay
          }
          role="presentation"
        >
          <section
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
          >
            <header
              className={
                styles.modalHeader
              }
            >
              <div>
                <span
                  className={
                    styles.eyebrow
                  }
                >
                  <ReceiptText
                    size={15}
                  />

                  Nouvelle facture
                </span>

                <h2>
                  Créer une facture
                </h2>

                <p>
                  Sélectionnez une
                  commande ou créez une
                  facture directement
                  pour un client.
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={
                  closeCreateModal
                }
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </header>

            <form
              className={
                styles.invoiceForm
              }
              onSubmit={
                createInvoice
              }
            >
              <section
                className={
                  styles.formSection
                }
              >
                <header>
                  <Package
                    size={18}
                  />

                  <div>
                    <h3>
                      Commande et client
                    </h3>

                    <p>
                      Liez la facture à
                      une commande
                      existante.
                    </p>
                  </div>
                </header>

                <div
                  className={
                    styles.formGrid
                  }
                >
                  <SelectField
                    label="Commande"
                    value={
                      invoiceForm.order_id
                    }
                    onChange={
                      handleOrderSelection
                    }
                    options={[
                      {
                        value: "",
                        label:
                          "Facture sans commande",
                      },

                      ...orders.map(
                        (order) => ({
                          value:
                            String(
                              order.id,
                            ),

                          label:
                            `${
                              order.order_number ||
                              `CMD-${order.id}`
                            } — ${getClientName(
                              order,
                            )} — ${formatMoney(
                              order.total_amount,
                            )}`,
                        }),
                      ),
                    ]}
                  />

                  <SelectField
                    label="Client *"
                    value={
                      invoiceForm.client_id
                    }
                    onChange={(value) =>
                      updateInvoiceField(
                        "client_id",
                        value,
                      )
                    }
                    required
                    options={[
                      {
                        value: "",
                        label:
                          "Sélectionner un client",
                      },

                      ...clients.map(
                        (client) => ({
                          value:
                            String(
                              client.id,
                            ),

                          label:
                            `${
                              client.company_name
                                ? "Entreprise"
                                : "Particulier"
                            } — ${getClientName(
                              client,
                            )}`,
                        }),
                      ),
                    ]}
                  />

                  <Field
                    label="Date d’émission *"
                    type="date"
                    value={
                      invoiceForm.issue_date
                    }
                    onChange={(value) =>
                      updateInvoiceField(
                        "issue_date",
                        value,
                      )
                    }
                    required
                  />

                  <Field
                    label="Date d’échéance *"
                    type="date"
                    value={
                      invoiceForm.due_date
                    }
                    onChange={(value) =>
                      updateInvoiceField(
                        "due_date",
                        value,
                      )
                    }
                    required
                  />
                </div>
              </section>

              <section
                className={
                  styles.formSection
                }
              >
                <header>
                  <Building2
                    size={18}
                  />

                  <div>
                    <h3>
                      Adresse de
                      facturation
                    </h3>

                    <p>
                      Coordonnées
                      affichées sur la
                      facture.
                    </p>
                  </div>
                </header>

                <div
                  className={
                    styles.formGrid
                  }
                >
                  <Field
                    label="Adresse"
                    value={
                      invoiceForm.billing_address
                    }
                    onChange={(value) =>
                      updateInvoiceField(
                        "billing_address",
                        value,
                      )
                    }
                    full
                  />

                  <Field
                    label="Ville"
                    value={
                      invoiceForm.billing_city
                    }
                    onChange={(value) =>
                      updateInvoiceField(
                        "billing_city",
                        value,
                      )
                    }
                  />

                  <Field
                    label="Province"
                    value={
                      invoiceForm.billing_province
                    }
                    onChange={(value) =>
                      updateInvoiceField(
                        "billing_province",
                        value,
                      )
                    }
                  />

                  <Field
                    label="Code postal"
                    value={
                      invoiceForm.billing_postal_code
                    }
                    onChange={(value) =>
                      updateInvoiceField(
                        "billing_postal_code",
                        value,
                      )
                    }
                  />

                  <SelectField
                    label="Statut initial"
                    value={
                      invoiceForm.status
                    }
                    onChange={(value) =>
                      updateInvoiceField(
                        "status",
                        value,
                      )
                    }
                    options={[
                      {
                        value: "draft",
                        label:
                          "Brouillon",
                      },
                      {
                        value: "sent",
                        label:
                          "Envoyée",
                      },
                    ]}
                  />
                </div>
              </section>

              <section
                className={
                  styles.formSection
                }
              >
                <header>
                  <DollarSign
                    size={18}
                  />

                  <div>
                    <h3>
                      Montants
                    </h3>

                    <p>
                      Calcul du
                      sous-total, des
                      taxes et du total.
                    </p>
                  </div>
                </header>

                <div
                  className={
                    styles.amountGrid
                  }
                >
                  <Field
                    label="Sous-total"
                    type="number"
                    step="0.01"
                    min="0"
                    value={
                      invoiceForm.subtotal
                    }
                    onChange={(value) =>
                      updateInvoiceField(
                        "subtotal",
                        value,
                      )
                    }
                    suffix="CAD"
                  />

                  <Field
                    label="Taxes"
                    type="number"
                    step="0.01"
                    min="0"
                    value={
                      invoiceForm.taxes
                    }
                    onChange={(value) =>
                      updateInvoiceField(
                        "taxes",
                        value,
                      )
                    }
                    suffix="CAD"
                  />

                  <article
                    className={
                      styles.totalCard
                    }
                  >
                    <small>
                      Total de la facture
                    </small>

                    <strong>
                      {formatMoney(
                        invoiceForm.total_amount,
                      )}
                    </strong>
                  </article>
                </div>
              </section>

              <section
                className={
                  styles.formSection
                }
              >
                <header>
                  <FileText
                    size={18}
                  />

                  <div>
                    <h3>
                      Notes et
                      conditions
                    </h3>

                    <p>
                      Informations
                      supplémentaires
                      visibles sur le
                      document.
                    </p>
                  </div>
                </header>

                <div
                  className={
                    styles.textareaGrid
                  }
                >
                  <TextAreaField
                    label="Notes"
                    value={
                      invoiceForm.notes
                    }
                    onChange={(value) =>
                      updateInvoiceField(
                        "notes",
                        value,
                      )
                    }
                    placeholder="Description du service, détails de la livraison..."
                  />

                  <TextAreaField
                    label="Conditions de paiement"
                    value={
                      invoiceForm.terms
                    }
                    onChange={(value) =>
                      updateInvoiceField(
                        "terms",
                        value,
                      )
                    }
                    placeholder="Conditions de paiement..."
                  />
                </div>
              </section>

              <footer
                className={
                  styles.modalActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
                  onClick={
                    closeCreateModal
                  }
                  disabled={saving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className={
                    styles.saveButton
                  }
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={17}
                        className={
                          styles.spin
                        }
                      />

                      Création...
                    </>
                  ) : (
                    <>
                      <ReceiptText
                        size={17}
                      />

                      Créer la facture
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* =====================================================
          MODAL DÉTAILS
      ====================================================== */}

      {showDetailsModal &&
        selectedInvoice && (
          <InvoiceDetailsModal
            invoice={
              selectedInvoice
            }
            onClose={() =>
              setShowDetailsModal(
                false,
              )
            }
            onPrint={() =>
              printInvoice(
                selectedInvoice,
              )
            }
            onPayment={() =>
              openPaymentModal(
                selectedInvoice,
              )
            }
            onSend={() =>
              void sendInvoice(
                selectedInvoice,
              )
            }
            onCancel={() =>
              void cancelInvoice(
                selectedInvoice,
              )
            }
          />
        )}

      {/* =====================================================
          MODAL PAIEMENT
      ====================================================== */}

      {showPaymentModal &&
        selectedInvoice && (
          <div
            className={
              styles.modalOverlay
            }
          >
            <section
              className={
                styles.paymentModal
              }
              role="dialog"
              aria-modal="true"
            >
              <header
                className={
                  styles.modalHeader
                }
              >
                <div>
                  <span
                    className={
                      styles.eyebrow
                    }
                  >
                    <WalletCards
                      size={15}
                    />

                    Paiement
                  </span>

                  <h2>
                    Enregistrer un
                    paiement
                  </h2>

                  <p>
                    Facture{" "}
                    {selectedInvoice.invoice_number ||
                      `#${selectedInvoice.id}`}
                  </p>
                </div>

                <button
                  type="button"
                  className={
                    styles.closeButton
                  }
                  onClick={() =>
                    !saving &&
                    setShowPaymentModal(
                      false,
                    )
                  }
                >
                  <X size={20} />
                </button>
              </header>

              <form
                className={
                  styles.paymentForm
                }
                onSubmit={
                  savePayment
                }
              >
                <div
                  className={
                    styles.paymentSummary
                  }
                >
                  <span>
                    <small>
                      Total
                    </small>

                    <strong>
                      {formatMoney(
                        selectedInvoice.total_amount,
                      )}
                    </strong>
                  </span>

                  <span>
                    <small>
                      Déjà payé
                    </small>

                    <strong>
                      {formatMoney(
                        getPaidAmount(
                          selectedInvoice,
                        ),
                      )}
                    </strong>
                  </span>

                  <span>
                    <small>
                      Solde
                    </small>

                    <strong>
                      {formatMoney(
                        getInvoiceBalance(
                          selectedInvoice,
                        ),
                      )}
                    </strong>
                  </span>
                </div>

                <div
                  className={
                    styles.formGrid
                  }
                >
                  <Field
                    label="Montant *"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={
                      paymentForm.amount
                    }
                    onChange={(value) =>
                      updatePaymentField(
                        "amount",
                        value,
                      )
                    }
                    suffix="CAD"
                    required
                  />

                  <SelectField
                    label="Mode de paiement"
                    value={
                      paymentForm.payment_method
                    }
                    onChange={(value) =>
                      updatePaymentField(
                        "payment_method",
                        value,
                      )
                    }
                    options={[
                      {
                        value:
                          "interac",
                        label:
                          "Virement Interac",
                      },
                      {
                        value:
                          "bank_transfer",
                        label:
                          "Virement bancaire",
                      },
                      {
                        value:
                          "credit_card",
                        label:
                          "Carte de crédit",
                      },
                      {
                        value:
                          "debit_card",
                        label:
                          "Carte de débit",
                      },
                      {
                        value: "cash",
                        label:
                          "Comptant",
                      },
                      {
                        value:
                          "cheque",
                        label:
                          "Chèque",
                      },
                      {
                        value:
                          "other",
                        label:
                          "Autre",
                      },
                    ]}
                  />

                  <Field
                    label="Date du paiement"
                    type="date"
                    value={
                      paymentForm.payment_date
                    }
                    onChange={(value) =>
                      updatePaymentField(
                        "payment_date",
                        value,
                      )
                    }
                    required
                  />

                  <Field
                    label="Référence de transaction"
                    value={
                      paymentForm.transaction_reference
                    }
                    onChange={(value) =>
                      updatePaymentField(
                        "transaction_reference",
                        value,
                      )
                    }
                    placeholder="Numéro de confirmation"
                  />
                </div>

                <TextAreaField
                  label="Notes"
                  value={
                    paymentForm.notes
                  }
                  onChange={(value) =>
                    updatePaymentField(
                      "notes",
                      value,
                    )
                  }
                  placeholder="Informations supplémentaires sur le paiement..."
                />

                <footer
                  className={
                    styles.modalActions
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.cancelButton
                    }
                    onClick={() =>
                      setShowPaymentModal(
                        false,
                      )
                    }
                    disabled={saving}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className={
                      styles.saveButton
                    }
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2
                          size={17}
                          className={
                            styles.spin
                          }
                        />

                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <CheckCircle2
                          size={17}
                        />

                        Enregistrer le
                        paiement
                      </>
                    )}
                  </button>
                </footer>
              </form>
            </section>
          </div>
        )}
    </main>
  );
}

/* ============================================================
   COMPOSANTS
============================================================ */

function getStatusCssClass(
  status: InvoiceStatus,
) {
  switch (status) {
    case "paid":
      return styles.statusPaid;

    case "sent":
      return styles.statusSent;

    case "partially_paid":
      return styles.statusPartial;

    case "overdue":
      return styles.statusOverdue;

    case "cancelled":
      return styles.statusCancelled;

    default:
      return styles.statusDraft;
  }
}

function StatCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;

  variant:
    | "total"
    | "paid"
    | "pending"
    | "overdue"
    | "cancelled"
    | "invoiced"
    | "collected"
    | "balance";
}) {
  return (
    <article
      className={styles.statCard}
    >
      <span
        className={
          styles[
            `stat_${variant}`
          ]
        }
      >
        {icon}
      </span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function DateCell({
  value,
  danger = false,
}: {
  value?: string | null;
  danger?: boolean;
}) {
  return (
    <div
      className={`${styles.dateCell} ${
        danger
          ? styles.dangerDate
          : ""
      }`}
    >
      <CalendarDays
        size={14}
      />

      <span>
        {formatDate(value)}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  full = false,
  suffix,
  step,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;

  type?: string;
  placeholder?: string;
  required?: boolean;
  full?: boolean;
  suffix?: string;
  step?: string;
  min?: string;
}) {
  return (
    <label
      className={`${styles.field} ${
        full
          ? styles.fieldFull
          : ""
      }`}
    >
      <span>{label}</span>

      <div>
        <input
          type={type}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          placeholder={placeholder}
          required={required}
          step={step}
          min={min}
        />

        {suffix && (
          <small>{suffix}</small>
        )}
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;

  options: {
    value: string;
    label: string;
  }[];

  required?: boolean;
}) {
  return (
    <label
      className={styles.field}
    >
      <span>{label}</span>

      <div>
        <select
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          required={required}
        >
          {options.map(
            (option) => (
              <option
                key={
                  option.value ||
                  "empty"
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            ),
          )}
        </select>
      </div>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label
      className={
        styles.textareaField
      }
    >
      <span>{label}</span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={placeholder}
        rows={4}
      />
    </label>
  );
}

function InvoiceDetailsModal({
  invoice,
  onClose,
  onPrint,
  onPayment,
  onSend,
  onCancel,
}: {
  invoice: Invoice;
  onClose: () => void;
  onPrint: () => void;
  onPayment: () => void;
  onSend: () => void;
  onCancel: () => void;
}) {
  const status =
    getEffectiveStatus(invoice);

  const paidAmount =
    getPaidAmount(invoice);

  const balance =
    getInvoiceBalance(invoice);

  return (
    <div
      className={
        styles.modalOverlay
      }
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className={
          styles.detailsModal
        }
        role="dialog"
        aria-modal="true"
      >
        <header
          className={
            styles.detailsHeader
          }
        >
          <div
            className={
              styles.detailsIdentity
            }
          >
            <span>
              <ReceiptText
                size={25}
              />
            </span>

            <div>
              <small>
                Facture
              </small>

              <h2>
                {invoice.invoice_number ||
                  `FAC-${invoice.id}`}
              </h2>

              <p>
                Créée le{" "}
                {formatDate(
                  invoice.issue_date ||
                    invoice.created_at,
                )}
              </p>
            </div>
          </div>

          <div
            className={
              styles.detailsHeaderActions
            }
          >
            <span
              className={`${styles.statusBadge} ${getStatusCssClass(
                status,
              )}`}
            >
              {getStatusLabel(status)}
            </span>

            <button
              type="button"
              className={
                styles.closeButton
              }
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div
          className={
            styles.detailsContent
          }
        >
          <section
            className={
              styles.invoiceOverview
            }
          >
            <article>
              <span>
                {invoice.company_name ? (
                  <Building2
                    size={20}
                  />
                ) : (
                  <UserRound
                    size={20}
                  />
                )}
              </span>

              <div>
                <small>
                  Facturé à
                </small>

                <strong>
                  {getClientName(
                    invoice,
                  )}
                </strong>

                {invoice.company_name && (
                  <p>
                    Contact :{" "}
                    {getClientContactName(
                      invoice,
                    )}
                  </p>
                )}

                <p>
                  {[
                    invoice.billing_address,
                    invoice.billing_city,
                    invoice.billing_province,
                    invoice.billing_postal_code,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                    "Adresse non fournie"}
                </p>

                {invoice.client_email && (
                  <p>
                    <Mail
                      size={13}
                    />

                    {
                      invoice.client_email
                    }
                  </p>
                )}
              </div>
            </article>

            <article>
              <span>
                <CalendarDays
                  size={20}
                />
              </span>

              <div>
                <small>
                  Dates
                </small>

                <strong>
                  Émission :{" "}
                  {formatDate(
                    invoice.issue_date,
                  )}
                </strong>

                <p>
                  Échéance :{" "}
                  {formatDate(
                    invoice.due_date,
                  )}
                </p>

                {invoice.paid_at && (
                  <p>
                    Payée le :{" "}
                    {formatDate(
                      invoice.paid_at,
                    )}
                  </p>
                )}
              </div>
            </article>

            <article>
              <span>
                <Package
                  size={20}
                />
              </span>

              <div>
                <small>
                  Commande
                </small>

                <strong>
                  {invoice.order_number ||
                    (invoice.order_id
                      ? `Commande #${invoice.order_id}`
                      : "Sans commande")}
                </strong>

                <p>
                  Référence liée à cette
                  facture.
                </p>
              </div>
            </article>
          </section>

          <section
            className={
              styles.invoiceAmounts
            }
          >
            <div>
              <span>
                Sous-total
              </span>

              <strong>
                {formatMoney(
                  invoice.subtotal,
                )}
              </strong>
            </div>

            <div>
              <span>Taxes</span>

              <strong>
                {formatMoney(
                  invoice.taxes,
                )}
              </strong>
            </div>

            <div
              className={
                styles.totalRow
              }
            >
              <span>Total</span>

              <strong>
                {formatMoney(
                  invoice.total_amount,
                )}
              </strong>
            </div>

            <div>
              <span>
                Montant payé
              </span>

              <strong
                className={
                  styles.paidAmount
                }
              >
                {formatMoney(
                  paidAmount,
                )}
              </strong>
            </div>

            <div
              className={
                styles.balanceRow
              }
            >
              <span>
                Solde à payer
              </span>

              <strong>
                {formatMoney(
                  balance,
                )}
              </strong>
            </div>
          </section>

          {invoice.notes && (
            <section
              className={
                styles.detailsTextSection
              }
            >
              <h3>Notes</h3>

              <p>
                {invoice.notes}
              </p>
            </section>
          )}

          {invoice.terms && (
            <section
              className={
                styles.detailsTextSection
              }
            >
              <h3>
                Conditions de paiement
              </h3>

              <p>
                {invoice.terms}
              </p>
            </section>
          )}

          <section
            className={
              styles.paymentsSection
            }
          >
            <header>
              <div>
                <span>
                  Historique
                </span>

                <h3>
                  Paiements
                </h3>
              </div>

              <strong>
                {invoice.payments
                  ?.length || 0}
              </strong>
            </header>

            {!invoice.payments ||
            invoice.payments.length ===
              0 ? (
              <div
                className={
                  styles.noPayments
                }
              >
                <WalletCards
                  size={34}
                />

                <p>
                  Aucun paiement
                  enregistré.
                </p>
              </div>
            ) : (
              <div
                className={
                  styles.paymentList
                }
              >
                {invoice.payments.map(
                  (payment) => (
                    <article
                      key={
                        payment.id
                      }
                    >
                      <span>
                        <CheckCircle2
                          size={17}
                        />
                      </span>

                      <div>
                        <strong>
                          {formatMoney(
                            payment.amount,
                          )}
                        </strong>

                        <small>
                          {getPaymentMethodLabel(
                            payment.payment_method,
                          )}
                          {" · "}
                          {formatDate(
                            payment.payment_date ||
                              payment.created_at,
                          )}
                        </small>

                        {payment.transaction_reference && (
                          <small>
                            Référence :{" "}
                            {
                              payment.transaction_reference
                            }
                          </small>
                        )}
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </div>

        <footer
          className={
            styles.detailsActions
          }
        >
          <button
            type="button"
            className={
              styles.secondaryButton
            }
            onClick={onPrint}
          >
            <Printer size={17} />
            Imprimer
          </button>

          {status === "draft" && (
            <button
              type="button"
              className={
                styles.secondaryButton
              }
              onClick={onSend}
            >
              <Send size={17} />
              Marquer envoyée
            </button>
          )}

          {status !== "paid" &&
            status !==
              "cancelled" &&
            balance > 0 && (
              <button
                type="button"
                className={
                  styles.paymentButton
                }
                onClick={onPayment}
              >
                <DollarSign
                  size={17}
                />

                Enregistrer un paiement
              </button>
            )}

          {status !==
            "cancelled" &&
            status !== "paid" && (
              <button
                type="button"
                className={
                  styles.dangerButton
                }
                onClick={onCancel}
              >
                <XCircle
                  size={17}
                />

                Annuler la facture
              </button>
            )}
        </footer>
      </section>
    </div>
  );
}
"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";

import styles from "./requests.module.css";

/* =========================================================
   API
========================================================= */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.glorysolutions.ca";

/* =========================================================
   TYPES
========================================================= */

type RequestStatus =
  | "pending"
  | "active"
  | "rejected";

interface RegistrationRequest {
  id: number;

  first_name: string;
  last_name: string;

  email: string;
  phone: string | null;

  company_name?: string | null;
  message?: string | null;

  status: RequestStatus;

  created_at: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  requests?: T;
  total?: number;
}

const ITEMS_PER_PAGE = 8;

/* =========================================================
   PAGE
========================================================= */

export default function RequestsPage() {
  const [requests, setRequests] = useState<
    RegistrationRequest[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<RequestStatus | "all">(
    "all"
  );

  const [currentPage, setCurrentPage] =
    useState(1);

  const [
    selectedRequest,
    setSelectedRequest,
  ] =
    useState<RegistrationRequest | null>(
      null
    );

  const [
    requestToDelete,
    setRequestToDelete,
  ] =
    useState<RegistrationRequest | null>(
      null
    );

  /* =======================================================
     RÉCUPÉRER LE TOKEN
  ======================================================= */

  const getToken = useCallback(() => {
    if (typeof window === "undefined") {
      return "";
    }

    /*
     * On vérifie plusieurs noms possibles afin
     * d'être compatible avec ton login actuel.
     */

    const possibleKeys = [
      "token",
      "accessToken",
      "access_token",
      "authToken",
      "auth_token",
      "jwt",
      "jwtToken",
      "userToken",
    ];

    for (const key of possibleKeys) {
      const localValue =
        localStorage.getItem(key);

      if (localValue) {
        return localValue;
      }

      const sessionValue =
        sessionStorage.getItem(key);

      if (sessionValue) {
        return sessionValue;
      }
    }

    /*
     * Certains projets enregistrent un objet
     * d'authentification complet en JSON.
     */

    const possibleObjects = [
      "auth",
      "user",
      "session",
      "authData",
    ];

    for (const key of possibleObjects) {
      const raw =
        localStorage.getItem(key) ||
        sessionStorage.getItem(key);

      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw);

        const token =
          parsed?.token ||
          parsed?.accessToken ||
          parsed?.access_token ||
          parsed?.authToken ||
          parsed?.jwt;

        if (
          typeof token === "string" &&
          token.length > 0
        ) {
          return token;
        }
      } catch {
        /*
         * Ce n'est pas du JSON.
         * On continue simplement.
         */
      }
    }

    return "";
  }, []);

  /* =======================================================
     FETCH AUTHENTIFIÉ
  ======================================================= */

  const authenticatedFetch =
    useCallback(
      async (
        url: string,
        options: RequestInit = {}
      ) => {
        const token = getToken();

        if (!token) {
          throw new Error(
            "Session introuvable. Veuillez vous reconnecter."
          );
        }

        const headers =
          new Headers(options.headers);

        headers.set(
          "Content-Type",
          "application/json"
        );

        headers.set(
          "Authorization",
          `Bearer ${token}`
        );

        return fetch(url, {
          ...options,
          headers,
          cache: "no-store",
        });
      },
      [getToken]
    );

  /* =======================================================
     CHARGER LES DEMANDES
  ======================================================= */

  const fetchRequests =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await authenticatedFetch(
            `${API_URL}/api/registration-requests`,
            {
              method: "GET",
            }
          );

        const result: ApiResponse<
          RegistrationRequest[]
        > = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Impossible de charger les demandes."
          );
        }

        /*
         * Notre backend retourne actuellement :
         *
         * {
         *   success: true,
         *   requests: [...],
         *   data: [...]
         * }
         *
         * On supporte donc les deux.
         */

        const receivedRequests =
          result.data ||
          result.requests ||
          [];

        setRequests(
          Array.isArray(receivedRequests)
            ? receivedRequests
            : []
        );
      } catch (err) {
        setRequests([]);

        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue."
        );
      } finally {
        setLoading(false);
      }
    }, [authenticatedFetch]);

  /* =======================================================
     PREMIER CHARGEMENT
  ======================================================= */

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  /* =======================================================
     FILTRES
  ======================================================= */

  const filteredRequests =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return requests.filter(
        (request) => {
          const matchesStatus =
            statusFilter === "all" ||
            request.status ===
              statusFilter;

          const fullName =
            `${request.first_name || ""} ${
              request.last_name || ""
            }`.toLowerCase();

          const email =
            request.email
              ?.toLowerCase() || "";

          const phone =
            request.phone
              ?.toLowerCase() || "";

          const company =
            request.company_name
              ?.toLowerCase() || "";

          const matchesSearch =
            normalizedSearch.length ===
              0 ||
            fullName.includes(
              normalizedSearch
            ) ||
            email.includes(
              normalizedSearch
            ) ||
            phone.includes(
              normalizedSearch
            ) ||
            company.includes(
              normalizedSearch
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        }
      );
    }, [
      requests,
      search,
      statusFilter,
    ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredRequests.length /
        ITEMS_PER_PAGE
    )
  );

  const paginatedRequests =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        ITEMS_PER_PAGE;

      return filteredRequests.slice(
        start,
        start + ITEMS_PER_PAGE
      );
    }, [
      filteredRequests,
      currentPage,
    ]);

  /* =======================================================
     STATISTIQUES
  ======================================================= */

  const pendingCount =
    requests.filter(
      (request) =>
        request.status === "pending"
    ).length;

  const approvedCount =
    requests.filter(
      (request) =>
        request.status === "active"
    ).length;

  const rejectedCount =
    requests.filter(
      (request) =>
        request.status === "rejected"
    ).length;

  /* =======================================================
     APPROUVER / REFUSER
  ======================================================= */

  const updateRequestStatus =
    async (
      requestId: number,
      action:
        | "approve"
        | "reject"
    ) => {
      try {
        setActionLoading(
          requestId
        );

        setError("");
        setSuccess("");

        const response =
          await authenticatedFetch(
            `${API_URL}/api/registration-requests/${requestId}/${action}`,
            {
              method: "PATCH",
            }
          );

        const result: ApiResponse<{
          status?: RequestStatus;
        }> =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Impossible de modifier la demande."
          );
        }

        const newStatus: RequestStatus =
          action === "approve"
            ? "active"
            : "rejected";

        setRequests(
          (currentRequests) =>
            currentRequests.map(
              (request) =>
                request.id ===
                requestId
                  ? {
                      ...request,
                      status:
                        newStatus,
                    }
                  : request
            )
        );

        setSelectedRequest(
          (current) =>
            current?.id ===
            requestId
              ? {
                  ...current,
                  status:
                    newStatus,
                }
              : current
        );

        setSuccess(
          action === "approve"
            ? "La demande a été approuvée avec succès."
            : "La demande a été refusée."
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue."
        );
      } finally {
        setActionLoading(null);
      }
    };

  /* =======================================================
     SUPPRIMER
  ======================================================= */

  const deleteRequest =
    async () => {
      if (!requestToDelete) {
        return;
      }

      try {
        setActionLoading(
          requestToDelete.id
        );

        setError("");
        setSuccess("");

        const response =
          await authenticatedFetch(
            `${API_URL}/api/registration-requests/${requestToDelete.id}`,
            {
              method: "DELETE",
            }
          );

        const result: ApiResponse<null> =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Impossible de supprimer la demande."
          );
        }

        setRequests(
          (currentRequests) =>
            currentRequests.filter(
              (request) =>
                request.id !==
                requestToDelete.id
            )
        );

        if (
          selectedRequest?.id ===
          requestToDelete.id
        ) {
          setSelectedRequest(
            null
          );
        }

        setRequestToDelete(
          null
        );

        setSuccess(
          "La demande a été supprimée."
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue."
        );
      } finally {
        setActionLoading(null);
      }
    };

  /* =======================================================
     HELPERS
  ======================================================= */

  const formatDate = (
    value: string
  ) => {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "fr-CA",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(date);
  };

  const getInitials = (
    firstName: string,
    lastName: string
  ) => {
    return `${firstName?.charAt(0) || ""}${
      lastName?.charAt(0) || ""
    }`.toUpperCase();
  };

  const getStatusLabel = (
    status: RequestStatus
  ) => {
    if (
      status === "active"
    ) {
      return "Approuvée";
    }

    if (
      status === "rejected"
    ) {
      return "Refusée";
    }

    return "En attente";
  };

  const getStatusClass = (
    status: RequestStatus
  ) => {
    /*
     * Ton ancien CSS utilise probablement :
     *
     * status_pending
     * status_approved
     * status_rejected
     *
     * Le backend utilise "active".
     * On convertit donc active -> approved
     * uniquement pour le CSS.
     */

    if (
      status === "active"
    ) {
      return styles.status_approved;
    }

    if (
      status === "rejected"
    ) {
      return styles.status_rejected;
    }

    return styles.status_pending;
  };

  const handleSearchChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setSearch(
      event.target.value
    );
  };

  /* =======================================================
     JSX
  ======================================================= */

  return (
    <main className={styles.page}>
      {/* ================================================
          HEADER
      ================================================= */}

      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            <UserCheck size={16} />
            Gestion des inscriptions
          </div>

          <h1>
            Demandes clients
          </h1>

          <p>
            Consultez, approuvez ou
            refusez les demandes d’accès
            à la plateforme.
          </p>
        </div>

        <button
          type="button"
          className={
            styles.refreshButton
          }
          onClick={fetchRequests}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? styles.spinning
                : undefined
            }
          />

          Actualiser
        </button>
      </header>

      {/* ================================================
          ERREUR
      ================================================= */}

      {error && (
        <div
          className={
            styles.errorMessage
          }
        >
          <CircleAlert
            size={18}
          />

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Fermer le message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ================================================
          SUCCESS
      ================================================= */}

      {success && (
        <div
          className={
            styles.successMessage
          }
        >
          <Check size={18} />

          <span>
            {success}
          </span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
            aria-label="Fermer le message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ================================================
          STATS
      ================================================= */}

      <section
        className={
          styles.statsGrid
        }
      >
        <article
          className={
            styles.statCard
          }
        >
          <div
            className={
              styles.statIconPending
            }
          >
            <Clock3 size={20} />
          </div>

          <div>
            <span>
              En attente
            </span>

            <strong>
              {pendingCount}
            </strong>
          </div>
        </article>

        <article
          className={
            styles.statCard
          }
        >
          <div
            className={
              styles.statIconApproved
            }
          >
            <Check size={20} />
          </div>

          <div>
            <span>
              Approuvées
            </span>

            <strong>
              {approvedCount}
            </strong>
          </div>
        </article>

        <article
          className={
            styles.statCard
          }
        >
          <div
            className={
              styles.statIconRejected
            }
          >
            <X size={20} />
          </div>

          <div>
            <span>
              Refusées
            </span>

            <strong>
              {rejectedCount}
            </strong>
          </div>
        </article>

        <article
          className={
            styles.statCard
          }
        >
          <div
            className={
              styles.statIconTotal
            }
          >
            <UserRound size={20} />
          </div>

          <div>
            <span>
              Total
            </span>

            <strong>
              {requests.length}
            </strong>
          </div>
        </article>
      </section>

      {/* ================================================
          TABLE
      ================================================= */}

      <section
        className={
          styles.contentCard
        }
      >
        <div
          className={
            styles.toolbar
          }
        >
          <div
            className={
              styles.searchBox
            }
          >
            <Search size={18} />

            <input
              type="search"
              value={search}
              onChange={
                handleSearchChange
              }
              placeholder="Rechercher un client, un courriel..."
            />
          </div>

          <div
            className={
              styles.filters
            }
          >
            <button
              type="button"
              className={
                statusFilter ===
                "all"
                  ? styles.activeFilter
                  : styles.filterButton
              }
              onClick={() =>
                setStatusFilter(
                  "all"
                )
              }
            >
              Toutes
            </button>

            <button
              type="button"
              className={
                statusFilter ===
                "pending"
                  ? styles.activeFilter
                  : styles.filterButton
              }
              onClick={() =>
                setStatusFilter(
                  "pending"
                )
              }
            >
              En attente
            </button>

            <button
              type="button"
              className={
                statusFilter ===
                "active"
                  ? styles.activeFilter
                  : styles.filterButton
              }
              onClick={() =>
                setStatusFilter(
                  "active"
                )
              }
            >
              Approuvées
            </button>

            <button
              type="button"
              className={
                statusFilter ===
                "rejected"
                  ? styles.activeFilter
                  : styles.filterButton
              }
              onClick={() =>
                setStatusFilter(
                  "rejected"
                )
              }
            >
              Refusées
            </button>
          </div>
        </div>

        <div
          className={
            styles.tableWrapper
          }
        >
          <table
            className={
              styles.table
            }
          >
            <thead>
              <tr>
                <th>
                  Client
                </th>

                <th>
                  Coordonnées
                </th>

                <th>
                  Entreprise
                </th>

                <th>
                  Date
                </th>

                <th>
                  Statut
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({
                  length: 5,
                }).map(
                  (_, index) => (
                    <tr
                      key={
                        index
                      }
                    >
                      <td
                        colSpan={
                          6
                        }
                      >
                        <div
                          className={
                            styles.skeletonRow
                          }
                        />
                      </td>
                    </tr>
                  )
                )
              ) : paginatedRequests.length >
                0 ? (
                paginatedRequests.map(
                  (request) => (
                    <tr
                      key={
                        request.id
                      }
                    >
                      <td>
                        <div
                          className={
                            styles.clientCell
                          }
                        >
                          <div
                            className={
                              styles.avatar
                            }
                          >
                            {getInitials(
                              request.first_name,
                              request.last_name
                            )}
                          </div>

                          <div>
                            <strong>
                              {
                                request.first_name
                              }{" "}
                              {
                                request.last_name
                              }
                            </strong>

                            <span>
                              ID #
                              {
                                request.id
                              }
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div
                          className={
                            styles.contactCell
                          }
                        >
                          <span>
                            <Mail
                              size={
                                14
                              }
                            />

                            {
                              request.email
                            }
                          </span>

                          <span>
                            <Phone
                              size={
                                14
                              }
                            />

                            {request.phone ||
                              "Non fourni"}
                          </span>
                        </div>
                      </td>

                      <td>
                        {request.company_name ||
                          "Client particulier"}
                      </td>

                      <td>
                        {formatDate(
                          request.created_at
                        )}
                      </td>

                      <td>
                        <span
                          className={`${styles.status} ${getStatusClass(
                            request.status
                          )}`}
                        >
                          {getStatusLabel(
                            request.status
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
                              styles.viewButton
                            }
                            onClick={() =>
                              setSelectedRequest(
                                request
                              )
                            }
                            title="Voir les détails"
                          >
                            <Eye
                              size={
                                16
                              }
                            />
                          </button>

                          {request.status ===
                            "pending" && (
                            <>
                              <button
                                type="button"
                                className={
                                  styles.approveButton
                                }
                                onClick={() =>
                                  updateRequestStatus(
                                    request.id,
                                    "approve"
                                  )
                                }
                                disabled={
                                  actionLoading ===
                                  request.id
                                }
                                title="Approuver"
                              >
                                <Check
                                  size={
                                    16
                                  }
                                />
                              </button>

                              <button
                                type="button"
                                className={
                                  styles.rejectButton
                                }
                                onClick={() =>
                                  updateRequestStatus(
                                    request.id,
                                    "reject"
                                  )
                                }
                                disabled={
                                  actionLoading ===
                                  request.id
                                }
                                title="Refuser"
                              >
                                <X
                                  size={
                                    16
                                  }
                                />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            className={
                              styles.deleteButton
                            }
                            onClick={() =>
                              setRequestToDelete(
                                request
                              )
                            }
                            title="Supprimer"
                          >
                            <Trash2
                              size={
                                16
                              }
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan={6}
                  >
                    <div
                      className={
                        styles.emptyState
                      }
                    >
                      <UserRound
                        size={34}
                      />

                      <h3>
                        Aucune demande
                        trouvée
                      </h3>

                      <p>
                        Modifiez les
                        filtres ou
                        actualisez les
                        données.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ==============================================
            PAGINATION
        =============================================== */}

        <footer
          className={
            styles.pagination
          }
        >
          <span>
            {
              filteredRequests.length
            }{" "}
            demande
            {filteredRequests.length >
            1
              ? "s"
              : ""}
          </span>

          <div>
            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.max(
                      1,
                      page - 1
                    )
                )
              }
              disabled={
                currentPage === 1
              }
            >
              <ChevronLeft
                size={17}
              />
            </button>

            <span>
              Page {currentPage} sur{" "}
              {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.min(
                      totalPages,
                      page + 1
                    )
                )
              }
              disabled={
                currentPage ===
                totalPages
              }
            >
              <ChevronRight
                size={17}
              />
            </button>
          </div>
        </footer>
      </section>

      {/* ================================================
          MODAL DÉTAILS
      ================================================= */}

      {selectedRequest && (
        <div
          className={
            styles.modalOverlay
          }
          role="presentation"
          onMouseDown={() =>
            setSelectedRequest(
              null
            )
          }
        >
          <article
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-title"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <header
              className={
                styles.modalHeader
              }
            >
              <div>
                <span>
                  Demande #
                  {
                    selectedRequest.id
                  }
                </span>

                <h2 id="request-title">
                  {
                    selectedRequest.first_name
                  }{" "}
                  {
                    selectedRequest.last_name
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </header>

            <div
              className={
                styles.modalBody
              }
            >
              <div
                className={
                  styles.detailGrid
                }
              >
                <div>
                  <span>
                    Courriel
                  </span>

                  <strong>
                    {
                      selectedRequest.email
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Téléphone
                  </span>

                  <strong>
                    {selectedRequest.phone ||
                      "Non fourni"}
                  </strong>
                </div>

                <div>
                  <span>
                    Entreprise
                  </span>

                  <strong>
                    {selectedRequest.company_name ||
                      "Client particulier"}
                  </strong>
                </div>

                <div>
                  <span>
                    Date de demande
                  </span>

                  <strong>
                    {formatDate(
                      selectedRequest.created_at
                    )}
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.messageBox
                }
              >
                <span>
                  Message du client
                </span>

                <p>
                  {selectedRequest.message ||
                    "Aucun message fourni."}
                </p>
              </div>
            </div>

            <footer
              className={
                styles.modalFooter
              }
            >
              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
              >
                Fermer
              </button>

              {selectedRequest.status ===
                "pending" && (
                <>
                  <button
                    type="button"
                    className={
                      styles.rejectLargeButton
                    }
                    disabled={
                      actionLoading ===
                      selectedRequest.id
                    }
                    onClick={() =>
                      updateRequestStatus(
                        selectedRequest.id,
                        "reject"
                      )
                    }
                  >
                    <X
                      size={17}
                    />
                    Refuser
                  </button>

                  <button
                    type="button"
                    className={
                      styles.approveLargeButton
                    }
                    disabled={
                      actionLoading ===
                      selectedRequest.id
                    }
                    onClick={() =>
                      updateRequestStatus(
                        selectedRequest.id,
                        "approve"
                      )
                    }
                  >
                    <Check
                      size={17}
                    />
                    Approuver
                  </button>
                </>
              )}
            </footer>
          </article>
        </div>
      )}

      {/* ================================================
          CONFIRMATION SUPPRESSION
      ================================================= */}

      {requestToDelete && (
        <div
          className={
            styles.modalOverlay
          }
          role="presentation"
          onMouseDown={() =>
            setRequestToDelete(
              null
            )
          }
        >
          <article
            className={
              styles.confirmationModal
            }
            role="dialog"
            aria-modal="true"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                styles.confirmationIcon
              }
            >
              <Trash2
                size={23}
              />
            </div>

            <h2>
              Supprimer la demande?
            </h2>

            <p>
              La demande de{" "}
              <strong>
                {
                  requestToDelete.first_name
                }{" "}
                {
                  requestToDelete.last_name
                }
              </strong>{" "}
              sera supprimée
              définitivement.
            </p>

            <div
              className={
                styles.confirmationActions
              }
            >
              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                onClick={() =>
                  setRequestToDelete(
                    null
                  )
                }
              >
                Annuler
              </button>

              <button
                type="button"
                className={
                  styles.confirmDeleteButton
                }
                onClick={
                  deleteRequest
                }
                disabled={
                  actionLoading ===
                  requestToDelete.id
                }
              >
                <Trash2
                  size={16}
                />

                Supprimer
              </button>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
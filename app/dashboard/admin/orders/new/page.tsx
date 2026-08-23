"use client";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Loader2,
  MapPin,
  Package,
  Save,
  UserRound,
  Weight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type Client = {
  id: number | string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type FormState = {
  client_id: string;

  pickup_address: string;
  pickup_city: string;
  pickup_province: string;
  pickup_postal_code: string;

  delivery_address: string;
  delivery_city: string;
  delivery_province: string;
  delivery_postal_code: string;

  pickup_date: string;
  delivery_date: string;

  description: string;
  quantity: string;
  weight: string;

  priority: string;
  amount: string;

  notes: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.glorysolutions.ca";

const INITIAL_FORM: FormState = {
  client_id: "",

  pickup_address: "",
  pickup_city: "",
  pickup_province: "QC",
  pickup_postal_code: "",

  delivery_address: "",
  delivery_city: "",
  delivery_province: "QC",
  delivery_postal_code: "",

  pickup_date: "",
  delivery_date: "",

  description: "",
  quantity: "1",
  weight: "",

  priority: "normal",
  amount: "",

  notes: "",
};

function getClientName(client: Client) {
  if (client.company_name) {
    return client.company_name;
  }

  const fullName = [
    client.first_name,
    client.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return fullName || `Client #${client.id}`;
}

function extractClients(result: unknown): Client[] {
  if (Array.isArray(result)) {
    return result as Client[];
  }

  if (
    !result ||
    typeof result !== "object"
  ) {
    return [];
  }

  const data =
    result as Record<string, unknown>;

  if (Array.isArray(data.data)) {
    return data.data as Client[];
  }

  if (Array.isArray(data.clients)) {
    return data.clients as Client[];
  }

  return [];
}

export default function NewOrderPage() {
  const router = useRouter();

  const [form, setForm] =
    useState<FormState>(INITIAL_FORM);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [loadingClients, setLoadingClients] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    const loadClients = async () => {
      const token =
        localStorage.getItem(
          "glory_token",
        );

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        setLoadingClients(true);

        const response = await fetch(
          `${API_URL}/api/clients`,
          {
            headers: {
              Accept:
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message ||
              "Impossible de récupérer les clients.",
          );
        }

        setClients(
          extractClients(result),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de récupérer les clients.",
        );
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
  }, [router]);

  const selectedClient =
    useMemo(() => {
      return clients.find(
        (client) =>
          String(client.id) ===
          form.client_id,
      );
    }, [clients, form.client_id]);

  const updateField = <
    K extends keyof FormState,
  >(
    field: K,
    value: FormState[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!form.client_id) {
      return "Veuillez sélectionner un client.";
    }

    if (
      !form.pickup_address.trim() ||
      !form.pickup_city.trim()
    ) {
      return "Veuillez entrer l’adresse complète de ramassage.";
    }

    if (
      !form.delivery_address.trim() ||
      !form.delivery_city.trim()
    ) {
      return "Veuillez entrer l’adresse complète de livraison.";
    }

    if (!form.pickup_date) {
      return "Veuillez sélectionner la date de ramassage.";
    }

    if (!form.description.trim()) {
      return "Veuillez décrire la marchandise.";
    }

    const quantity =
      Number(form.quantity);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return "La quantité doit être supérieure à 0.";
    }

    return "";
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const token =
      localStorage.getItem(
        "glory_token",
      );

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        client_id: Number(
          form.client_id,
        ),

        pickup_address:
          form.pickup_address.trim(),
        pickup_city:
          form.pickup_city.trim(),
        pickup_province:
          form.pickup_province.trim(),
        pickup_postal_code:
          form.pickup_postal_code
            .trim()
            .toUpperCase(),

        delivery_address:
          form.delivery_address.trim(),
        delivery_city:
          form.delivery_city.trim(),
        delivery_province:
          form.delivery_province.trim(),
        delivery_postal_code:
          form.delivery_postal_code
            .trim()
            .toUpperCase(),

        pickup_date:
          form.pickup_date,

        delivery_date:
          form.delivery_date || null,

        description:
          form.description.trim(),

        quantity:
          Number(form.quantity),

        weight:
          form.weight
            ? Number(form.weight)
            : null,

        priority:
          form.priority,

        amount:
          form.amount
            ? Number(form.amount)
            : 0,

        notes:
          form.notes.trim() || null,

        status: "pending",
      };

      const response = await fetch(
        `${API_URL}/api/orders`,
        {
          method: "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body:
            JSON.stringify(payload),
        },
      );

      let result: Record<
        string,
        unknown
      > = {};

      try {
        result =
          await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        const message =
          typeof result.message ===
          "string"
            ? result.message
            : `Erreur lors de la création de la commande (${response.status}).`;

        throw new Error(message);
      }

      setSuccess(
        "Commande créée avec succès.",
      );

      setTimeout(() => {
        router.push(
          "/dashboard/admin/orders",
        );

        router.refresh();
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer la commande.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style jsx>{`
        .page {
          min-height: calc(
            100vh - 70px
          );
          padding: 30px;
          background: #f7f7fb;
          color: #17131d;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          color: #6f6977;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .header {
          display: flex;
          justify-content:
            space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          color: #ff003c;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        h1 {
          margin: 0;
          font-size: clamp(
            28px,
            4vw,
            40px
          );
          letter-spacing: -0.04em;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #777181;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          margin-bottom: 18px;
          border-radius: 12px;
          font-weight: 650;
          font-size: 13px;
        }

        .error {
          border: 1px solid
            #ffc5d1;
          background: #fff0f3;
          color: #d70032;
        }

        .success {
          border: 1px solid
            #b9ebd7;
          background: #e9fbf3;
          color: #087a50;
        }

        .form {
          display: grid;
          gap: 18px;
        }

        .card {
          padding: 24px;
          border: 1px solid
            #ebe8ef;
          border-radius: 18px;
          background: #ffffff;
        }

        .cardTitle {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 15px;
          margin-bottom: 20px;
          border-bottom: 1px solid
            #efedf2;
        }

        .cardTitleIcon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: #fff0f4;
          color: #ff003c;
        }

        .cardTitle h2 {
          margin: 0;
          font-size: 17px;
        }

        .cardTitle p {
          margin: 3px 0 0;
          color: #8a8492;
          font-size: 12px;
        }

        .grid {
          display: grid;
          grid-template-columns:
            repeat(2, 1fr);
          gap: 17px;
        }

        .grid3 {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 17px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .full {
          grid-column: 1 / -1;
        }

        label {
          font-size: 12px;
          font-weight: 750;
          color: #49424f;
        }

        .required {
          color: #ff003c;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid
            #e1dde5;
          border-radius: 11px;
          background: #fff;
          color: #201b25;
          outline: none;
          font: inherit;
          transition:
            border-color 0.2s,
            box-shadow 0.2s;
        }

        input,
        select {
          height: 45px;
          padding: 0 13px;
        }

        textarea {
          min-height: 110px;
          padding: 13px;
          resize: vertical;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #ff7898;
          box-shadow: 0 0 0 3px
            rgba(
              255,
              0,
              60,
              0.07
            );
        }

        input::placeholder,
        textarea::placeholder {
          color: #aaa5ae;
        }

        .clientPreview {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 15px;
          margin-top: 14px;
          border: 1px solid
            #efecef;
          border-radius: 13px;
          background: #fbfafc;
        }

        .clientAvatar {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: #fff0f4;
          color: #ff003c;
        }

        .clientPreview strong {
          display: block;
          font-size: 13px;
        }

        .clientPreview span {
          display: block;
          margin-top: 3px;
          color: #88828e;
          font-size: 11px;
        }

        .actions {
          position: sticky;
          bottom: 15px;
          z-index: 10;
          display: flex;
          justify-content:
            flex-end;
          align-items: center;
          gap: 10px;
          padding: 15px;
          border: 1px solid
            #e9e5ec;
          border-radius: 15px;
          background:
            rgba(
              255,
              255,
              255,
              0.96
            );
          box-shadow:
            0 12px 35px
            rgba(
              30,
              20,
              35,
              0.08
            );
          backdrop-filter:
            blur(10px);
        }

        .cancelButton,
        .saveButton {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 18px;
          border-radius: 11px;
          text-decoration: none;
          font-weight: 750;
          font-size: 13px;
        }

        .cancelButton {
          border: 1px solid
            #e3dfe6;
          background: white;
          color: #514b56;
        }

        .saveButton {
          border: none;
          background: #ff003c;
          color: white;
          cursor: pointer;
          box-shadow:
            0 9px 20px
            rgba(
              255,
              0,
              60,
              0.18
            );
        }

        .saveButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .spinner {
          animation:
            spin 0.8s linear
            infinite;
        }

        @keyframes spin {
          to {
            transform:
              rotate(360deg);
          }
        }

        @media (
          max-width: 900px
        ) {
          .page {
            padding: 20px 14px;
          }

          .grid,
          .grid3 {
            grid-template-columns:
              1fr;
          }

          .full {
            grid-column: auto;
          }

          .actions {
            position: static;
          }
        }
      `}</style>

      <main className="page">
        <div className="container">
          <Link
            href="/dashboard/admin/orders"
            className="back"
          >
            <ArrowLeft size={17} />
            Retour aux commandes
          </Link>

          <header className="header">
            <div>
              <div className="eyebrow">
                <Package size={15} />
                Gestion des commandes
              </div>

              <h1>
                Nouvelle commande
              </h1>

              <p className="subtitle">
                Créez une nouvelle
                opération de transport.
              </p>
            </div>
          </header>

          {error && (
            <div className="alert error">
              {error}
            </div>
          )}

          {success && (
            <div className="alert success">
              <CheckCircle2
                size={18}
              />
              {success}
            </div>
          )}

          <form
            className="form"
            onSubmit={
              handleSubmit
            }
          >
            <section className="card">
              <div className="cardTitle">
                <div className="cardTitleIcon">
                  <Building2
                    size={19}
                  />
                </div>

                <div>
                  <h2>Client</h2>
                  <p>
                    Sélectionnez le
                    client associé à
                    cette commande.
                  </p>
                </div>
              </div>

              <div className="field">
                <label>
                  Client{" "}
                  <span className="required">
                    *
                  </span>
                </label>

                <select
                  value={
                    form.client_id
                  }
                  disabled={
                    loadingClients
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "client_id",
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    {loadingClients
                      ? "Chargement des clients..."
                      : "Sélectionner un client"}
                  </option>

                  {clients.map(
                    (client) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          client.id
                        }
                      >
                        {getClientName(
                          client,
                        )}
                        {client.email
                          ? ` — ${client.email}`
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {selectedClient && (
                <div className="clientPreview">
                  <div className="clientAvatar">
                    <UserRound
                      size={19}
                    />
                  </div>

                  <div>
                    <strong>
                      {getClientName(
                        selectedClient,
                      )}
                    </strong>

                    <span>
                      {selectedClient.email ||
                        "Aucun courriel"}
                    </span>

                    <span>
                      {selectedClient.phone ||
                        "Aucun téléphone"}
                    </span>
                  </div>
                </div>
              )}
            </section>

            <section className="card">
              <div className="cardTitle">
                <div className="cardTitleIcon">
                  <MapPin
                    size={19}
                  />
                </div>

                <div>
                  <h2>
                    Ramassage
                  </h2>

                  <p>
                    Point de départ de
                    la marchandise.
                  </p>
                </div>
              </div>

              <div className="grid">
                <div className="field full">
                  <label>
                    Adresse{" "}
                    <span className="required">
                      *
                    </span>
                  </label>

                  <input
                    value={
                      form.pickup_address
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "pickup_address",
                        event.target
                          .value,
                      )
                    }
                    placeholder="123 rue Exemple"
                  />
                </div>

                <div className="field">
                  <label>
                    Ville{" "}
                    <span className="required">
                      *
                    </span>
                  </label>

                  <input
                    value={
                      form.pickup_city
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "pickup_city",
                        event.target
                          .value,
                      )
                    }
                    placeholder="Montréal"
                  />
                </div>

                <div className="field">
                  <label>
                    Province
                  </label>

                  <select
                    value={
                      form.pickup_province
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "pickup_province",
                        event.target
                          .value,
                      )
                    }
                  >
                    <option value="QC">
                      Québec
                    </option>

                    <option value="ON">
                      Ontario
                    </option>

                    <option value="NB">
                      Nouveau-Brunswick
                    </option>

                    <option value="NS">
                      Nouvelle-Écosse
                    </option>

                    <option value="AB">
                      Alberta
                    </option>

                    <option value="BC">
                      Colombie-Britannique
                    </option>
                  </select>
                </div>

                <div className="field">
                  <label>
                    Code postal
                  </label>

                  <input
                    value={
                      form.pickup_postal_code
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "pickup_postal_code",
                        event.target
                          .value,
                      )
                    }
                    placeholder="H1A 1A1"
                  />
                </div>

                <div className="field">
                  <label>
                    Date de
                    ramassage{" "}
                    <span className="required">
                      *
                    </span>
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      form.pickup_date
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "pickup_date",
                        event.target
                          .value,
                      )
                    }
                  />
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardTitle">
                <div className="cardTitleIcon">
                  <MapPin
                    size={19}
                  />
                </div>

                <div>
                  <h2>
                    Livraison
                  </h2>

                  <p>
                    Destination finale
                    de la marchandise.
                  </p>
                </div>
              </div>

              <div className="grid">
                <div className="field full">
                  <label>
                    Adresse{" "}
                    <span className="required">
                      *
                    </span>
                  </label>

                  <input
                    value={
                      form.delivery_address
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "delivery_address",
                        event.target
                          .value,
                      )
                    }
                    placeholder="456 rue Destination"
                  />
                </div>

                <div className="field">
                  <label>
                    Ville{" "}
                    <span className="required">
                      *
                    </span>
                  </label>

                  <input
                    value={
                      form.delivery_city
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "delivery_city",
                        event.target
                          .value,
                      )
                    }
                    placeholder="Laval"
                  />
                </div>

                <div className="field">
                  <label>
                    Province
                  </label>

                  <select
                    value={
                      form.delivery_province
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "delivery_province",
                        event.target
                          .value,
                      )
                    }
                  >
                    <option value="QC">
                      Québec
                    </option>

                    <option value="ON">
                      Ontario
                    </option>

                    <option value="NB">
                      Nouveau-Brunswick
                    </option>

                    <option value="NS">
                      Nouvelle-Écosse
                    </option>

                    <option value="AB">
                      Alberta
                    </option>

                    <option value="BC">
                      Colombie-Britannique
                    </option>
                  </select>
                </div>

                <div className="field">
                  <label>
                    Code postal
                  </label>

                  <input
                    value={
                      form.delivery_postal_code
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "delivery_postal_code",
                        event.target
                          .value,
                      )
                    }
                    placeholder="H7A 1A1"
                  />
                </div>

                <div className="field">
                  <label>
                    Date prévue de
                    livraison
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      form.delivery_date
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "delivery_date",
                        event.target
                          .value,
                      )
                    }
                  />
                </div>
              </div>
            </section>

            <section className="card">
              <div className="cardTitle">
                <div className="cardTitleIcon">
                  <Package
                    size={19}
                  />
                </div>

                <div>
                  <h2>
                    Marchandise
                  </h2>

                  <p>
                    Informations sur
                    le chargement.
                  </p>
                </div>
              </div>

              <div className="grid">
                <div className="field full">
                  <label>
                    Description{" "}
                    <span className="required">
                      *
                    </span>
                  </label>

                  <textarea
                    value={
                      form.description
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "description",
                        event.target
                          .value,
                      )
                    }
                    placeholder="Ex. 4 palettes de produits alimentaires..."
                  />
                </div>

                <div className="field">
                  <label>
                    Quantité
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.quantity
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "quantity",
                        event.target
                          .value,
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label>
                    <Weight
                      size={13}
                    />{" "}
                    Poids
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.weight
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "weight",
                        event.target
                          .value,
                      )
                    }
                    placeholder="Poids en kg"
                  />
                </div>
              </div>
            </section>

            

            <div className="actions">
              <Link
                href="/dashboard/admin/orders"
                className="cancelButton"
              >
                Annuler
              </Link>

              <button
                type="submit"
                className="saveButton"
                disabled={
                  submitting
                }
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={17}
                      className="spinner"
                    />
                    Création...
                  </>
                ) : (
                  <>
                    <Save
                      size={17}
                    />
                    Créer la commande
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
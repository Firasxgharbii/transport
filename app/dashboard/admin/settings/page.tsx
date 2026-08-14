"use client";

import {
  Bell,
  Building2,
  CheckCircle2,
  Clock3,
  DollarSign,
  Globe2,
  LockKeyhole,
  Mail,
  MapPin,
  Palette,
  Save,
  Settings,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import styles from "./settings.module.css";

/* ============================================================
   TYPES
============================================================ */

type SettingsTab =
  | "company"
  | "operations"
  | "notifications"
  | "security"
  | "appearance";

type SettingsForm = {
  company_name: string;
  legal_name: string;

  email: string;
  phone: string;

  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;

  tax_number: string;

  currency: string;
  timezone: string;
  language: string;

  order_prefix: string;
  default_tax_rate: string;

  default_pickup_duration: string;
  default_delivery_duration: string;

  email_notifications: boolean;
  order_notifications: boolean;
  driver_notifications: boolean;
  incident_notifications: boolean;

  require_strong_password: boolean;
  session_duration: string;
  two_factor_enabled: boolean;

  compact_mode: boolean;
  animations_enabled: boolean;
};

const DEFAULT_SETTINGS: SettingsForm = {
  company_name: "Glory Solutions",
  legal_name: "Glory Solutions Inc.",

  email:
    "contact@glorysolutions.ca",

  phone: "438-000-0000",

  address: "",
  city: "Montréal",
  province: "Québec",
  postal_code: "",
  country: "Canada",

  tax_number: "",

  currency: "CAD",
  timezone:
    "America/Toronto",
  language: "fr",

  order_prefix: "GLY",
  default_tax_rate: "14.975",

  default_pickup_duration: "30",
  default_delivery_duration: "30",

  email_notifications: true,
  order_notifications: true,
  driver_notifications: true,
  incident_notifications: true,

  require_strong_password: true,
  session_duration: "8",
  two_factor_enabled: false,

  compact_mode: false,
  animations_enabled: true,
};

const STORAGE_KEY =
  "glory_admin_settings";

/* ============================================================
   PAGE
============================================================ */

export default function SettingsPage() {
  const [activeTab, setActiveTab] =
    useState<SettingsTab>(
      "company",
    );

  const [form, setForm] =
    useState<SettingsForm>(
      DEFAULT_SETTINGS,
    );

  const [saved, setSaved] =
    useState(false);

  useEffect(() => {
    const savedSettings =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!savedSettings) {
      return;
    }

    try {
      const parsedSettings =
        JSON.parse(
          savedSettings,
        ) as Partial<SettingsForm>;

      setForm({
        ...DEFAULT_SETTINGS,
        ...parsedSettings,
      });
    } catch {
      window.localStorage.removeItem(
        STORAGE_KEY,
      );
    }
  }, []);

  const updateField = <
    Key extends keyof SettingsForm,
  >(
    key: Key,
    value: SettingsForm[Key],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setSaved(false);
  };

  const handleInputChange = (
    event: ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement
    >,
  ) => {
    const field =
      event.target
        .name as keyof SettingsForm;

    updateField(
      field,
      event.target
        .value as never,
    );
  };

  const saveSettings = (
    event: FormEvent,
  ) => {
    event.preventDefault();

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(form),
    );

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 3500);
  };

  return (
    <main className={styles.page}>
      <section
        className={styles.heading}
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            <Settings size={16} />
            Configuration
          </span>

          <h1>Paramètres</h1>

          <p>
            Configurez l’entreprise,
            les opérations, les
            notifications et la
            sécurité.
          </p>
        </div>

        <button
          type="submit"
          form="settings-form"
          className={
            styles.saveButton
          }
        >
          <Save size={17} />
          Enregistrer
        </button>
      </section>

      {saved && (
        <div
          className={
            styles.successBanner
          }
        >
          <CheckCircle2
            size={18}
          />

          Paramètres enregistrés avec
          succès.
        </div>
      )}

      <div
        className={
          styles.settingsLayout
        }
      >
        <aside
          className={styles.tabs}
        >
          <TabButton
            active={
              activeTab === "company"
            }
            icon={
              <Building2 size={18} />
            }
            label="Entreprise"
            description="Identité et coordonnées"
            onClick={() =>
              setActiveTab("company")
            }
          />

          <TabButton
            active={
              activeTab ===
              "operations"
            }
            icon={<Truck size={18} />}
            label="Opérations"
            description="Commandes et transport"
            onClick={() =>
              setActiveTab(
                "operations",
              )
            }
          />

          <TabButton
            active={
              activeTab ===
              "notifications"
            }
            icon={<Bell size={18} />}
            label="Notifications"
            description="Alertes du système"
            onClick={() =>
              setActiveTab(
                "notifications",
              )
            }
          />

          <TabButton
            active={
              activeTab === "security"
            }
            icon={
              <ShieldCheck
                size={18}
              />
            }
            label="Sécurité"
            description="Sessions et accès"
            onClick={() =>
              setActiveTab("security")
            }
          />

          <TabButton
            active={
              activeTab ===
              "appearance"
            }
            icon={
              <Palette size={18} />
            }
            label="Apparence"
            description="Interface utilisateur"
            onClick={() =>
              setActiveTab(
                "appearance",
              )
            }
          />
        </aside>

        <form
          id="settings-form"
          className={
            styles.content
          }
          onSubmit={saveSettings}
        >
          {activeTab ===
            "company" && (
            <CompanySettings
              form={form}
              onChange={
                handleInputChange
              }
            />
          )}

          {activeTab ===
            "operations" && (
            <OperationsSettings
              form={form}
              onChange={
                handleInputChange
              }
            />
          )}

          {activeTab ===
            "notifications" && (
            <NotificationsSettings
              form={form}
              updateField={
                updateField
              }
            />
          )}

          {activeTab ===
            "security" && (
            <SecuritySettings
              form={form}
              onChange={
                handleInputChange
              }
              updateField={
                updateField
              }
            />
          )}

          {activeTab ===
            "appearance" && (
            <AppearanceSettings
              form={form}
              updateField={
                updateField
              }
            />
          )}

          <footer
            className={
              styles.formFooter
            }
          >
            <p>
              Les paramètres sont
              sauvegardés dans ce
              navigateur pour le
              moment.
            </p>

            <button
              type="submit"
              className={
                styles.saveButton
              }
            >
              <Save size={17} />
              Enregistrer les paramètres
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

/* ============================================================
   ENTREPRISE
============================================================ */

function CompanySettings({
  form,
  onChange,
}: {
  form: SettingsForm;

  onChange: (
    event: ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement
    >,
  ) => void;
}) {
  return (
    <>
      <SectionHeader
        icon={
          <Building2 size={20} />
        }
        title="Informations de l’entreprise"
        description="Informations affichées sur les documents et les communications."
      />

      <div
        className={styles.formGrid}
      >
        <Field
          label="Nom commercial"
          name="company_name"
          value={form.company_name}
          onChange={onChange}
          icon={
            <Building2 size={16} />
          }
        />

        <Field
          label="Nom légal"
          name="legal_name"
          value={form.legal_name}
          onChange={onChange}
          icon={
            <Building2 size={16} />
          }
        />

        <Field
          label="Adresse courriel"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          icon={<Mail size={16} />}
        />

        <Field
          label="Téléphone"
          name="phone"
          value={form.phone}
          onChange={onChange}
          icon={
            <UserRound size={16} />
          }
        />

        <Field
          label="Adresse"
          name="address"
          value={form.address}
          onChange={onChange}
          icon={
            <MapPin size={16} />
          }
          full
        />

        <Field
          label="Ville"
          name="city"
          value={form.city}
          onChange={onChange}
          icon={
            <MapPin size={16} />
          }
        />

        <Field
          label="Province"
          name="province"
          value={form.province}
          onChange={onChange}
          icon={
            <MapPin size={16} />
          }
        />

        <Field
          label="Code postal"
          name="postal_code"
          value={form.postal_code}
          onChange={onChange}
          icon={
            <MapPin size={16} />
          }
        />

        <Field
          label="Pays"
          name="country"
          value={form.country}
          onChange={onChange}
          icon={
            <Globe2 size={16} />
          }
        />

        <Field
          label="Numéro de taxes"
          name="tax_number"
          value={form.tax_number}
          onChange={onChange}
          icon={
            <DollarSign size={16} />
          }
        />
      </div>
    </>
  );
}

/* ============================================================
   OPÉRATIONS
============================================================ */

function OperationsSettings({
  form,
  onChange,
}: {
  form: SettingsForm;

  onChange: (
    event: ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement
    >,
  ) => void;
}) {
  return (
    <>
      <SectionHeader
        icon={<Truck size={20} />}
        title="Paramètres opérationnels"
        description="Valeurs utilisées lors de la création des commandes."
      />

      <div
        className={styles.formGrid}
      >
        <SelectField
          label="Devise"
          name="currency"
          value={form.currency}
          onChange={onChange}
          icon={
            <DollarSign size={16} />
          }
          options={[
            {
              value: "CAD",
              label:
                "Dollar canadien — CAD",
            },
            {
              value: "USD",
              label:
                "Dollar américain — USD",
            },
          ]}
        />

        <SelectField
          label="Fuseau horaire"
          name="timezone"
          value={form.timezone}
          onChange={onChange}
          icon={<Clock3 size={16} />}
          options={[
            {
              value:
                "America/Toronto",
              label:
                "Montréal / Toronto",
            },
            {
              value:
                "America/Vancouver",
              label: "Vancouver",
            },
            {
              value:
                "America/Edmonton",
              label: "Edmonton",
            },
          ]}
        />

        <SelectField
          label="Langue"
          name="language"
          value={form.language}
          onChange={onChange}
          icon={<Globe2 size={16} />}
          options={[
            {
              value: "fr",
              label: "Français",
            },
            {
              value: "en",
              label: "English",
            },
          ]}
        />

        <Field
          label="Préfixe des commandes"
          name="order_prefix"
          value={form.order_prefix}
          onChange={onChange}
          icon={<Truck size={16} />}
        />

        <Field
          label="Taux de taxes par défaut (%)"
          name="default_tax_rate"
          type="number"
          value={
            form.default_tax_rate
          }
          onChange={onChange}
          icon={
            <DollarSign size={16} />
          }
        />

        <Field
          label="Durée de ramassage par défaut"
          name="default_pickup_duration"
          type="number"
          value={
            form.default_pickup_duration
          }
          onChange={onChange}
          icon={<Clock3 size={16} />}
          suffix="minutes"
        />

        <Field
          label="Durée de livraison par défaut"
          name="default_delivery_duration"
          type="number"
          value={
            form.default_delivery_duration
          }
          onChange={onChange}
          icon={<Clock3 size={16} />}
          suffix="minutes"
        />
      </div>
    </>
  );
}

/* ============================================================
   NOTIFICATIONS
============================================================ */

function NotificationsSettings({
  form,
  updateField,
}: {
  form: SettingsForm;

  updateField: <
    Key extends keyof SettingsForm,
  >(
    key: Key,
    value: SettingsForm[Key],
  ) => void;
}) {
  return (
    <>
      <SectionHeader
        icon={<Bell size={20} />}
        title="Notifications"
        description="Choisissez les alertes à recevoir dans le dashboard."
      />

      <div
        className={
          styles.switchList
        }
      >
        <SwitchRow
          title="Notifications par courriel"
          description="Recevoir les alertes importantes par courriel."
          checked={
            form.email_notifications
          }
          onChange={(checked) =>
            updateField(
              "email_notifications",
              checked,
            )
          }
        />

        <SwitchRow
          title="Nouvelles commandes"
          description="Alerte lors de la création ou de l’assignation d’une commande."
          checked={
            form.order_notifications
          }
          onChange={(checked) =>
            updateField(
              "order_notifications",
              checked,
            )
          }
        />

        <SwitchRow
          title="Activité des chauffeurs"
          description="Recevoir les changements de statut des chauffeurs."
          checked={
            form.driver_notifications
          }
          onChange={(checked) =>
            updateField(
              "driver_notifications",
              checked,
            )
          }
        />

        <SwitchRow
          title="Incidents et retards"
          description="Alerte prioritaire lors d’un incident ou d’un retard."
          checked={
            form.incident_notifications
          }
          onChange={(checked) =>
            updateField(
              "incident_notifications",
              checked,
            )
          }
        />
      </div>
    </>
  );
}

/* ============================================================
   SÉCURITÉ
============================================================ */

function SecuritySettings({
  form,
  onChange,
  updateField,
}: {
  form: SettingsForm;

  onChange: (
    event: ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement
    >,
  ) => void;

  updateField: <
    Key extends keyof SettingsForm,
  >(
    key: Key,
    value: SettingsForm[Key],
  ) => void;
}) {
  return (
    <>
      <SectionHeader
        icon={
          <LockKeyhole size={20} />
        }
        title="Sécurité"
        description="Configurez les règles de session et d’authentification."
      />

      <div
        className={
          styles.switchList
        }
      >
        <SwitchRow
          title="Mot de passe fort obligatoire"
          description="Exiger une combinaison de lettres, chiffres et caractères spéciaux."
          checked={
            form.require_strong_password
          }
          onChange={(checked) =>
            updateField(
              "require_strong_password",
              checked,
            )
          }
        />

        <SwitchRow
          title="Authentification à deux facteurs"
          description="Préparation de l’activation du second facteur."
          checked={
            form.two_factor_enabled
          }
          onChange={(checked) =>
            updateField(
              "two_factor_enabled",
              checked,
            )
          }
        />
      </div>

      <div
        className={
          styles.securityGrid
        }
      >
        <SelectField
          label="Durée maximale d’une session"
          name="session_duration"
          value={
            form.session_duration
          }
          onChange={onChange}
          icon={<Clock3 size={16} />}
          options={[
            {
              value: "1",
              label: "1 heure",
            },
            {
              value: "4",
              label: "4 heures",
            },
            {
              value: "8",
              label: "8 heures",
            },
            {
              value: "24",
              label: "24 heures",
            },
          ]}
        />
      </div>
    </>
  );
}

/* ============================================================
   APPARENCE
============================================================ */

function AppearanceSettings({
  form,
  updateField,
}: {
  form: SettingsForm;

  updateField: <
    Key extends keyof SettingsForm,
  >(
    key: Key,
    value: SettingsForm[Key],
  ) => void;
}) {
  return (
    <>
      <SectionHeader
        icon={<Palette size={20} />}
        title="Apparence"
        description="Personnalisez le comportement visuel du dashboard."
      />

      <div
        className={
          styles.switchList
        }
      >
        <SwitchRow
          title="Mode compact"
          description="Réduire les espacements dans les tableaux et les cartes."
          checked={
            form.compact_mode
          }
          onChange={(checked) =>
            updateField(
              "compact_mode",
              checked,
            )
          }
        />

        <SwitchRow
          title="Animations"
          description="Afficher les transitions et animations de l’interface."
          checked={
            form.animations_enabled
          }
          onChange={(checked) =>
            updateField(
              "animations_enabled",
              checked,
            )
          }
        />
      </div>

      <div
        className={
          styles.themePreview
        }
      >
        <div
          className={
            styles.previewSidebar
          }
        />

        <div
          className={
            styles.previewContent
          }
        >
          <span />
          <span />
          <span />
        </div>
      </div>
    </>
  );
}

/* ============================================================
   COMPOSANTS
============================================================ */

function TabButton({
  active,
  icon,
  label,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? styles.tabActive
          : styles.tabButton
      }
      onClick={onClick}
    >
      <span>{icon}</span>

      <div>
        <strong>{label}</strong>
        <small>{description}</small>
      </div>
    </button>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <header
      className={
        styles.sectionHeader
      }
    >
      <span>{icon}</span>

      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  icon,
  type = "text",
  full = false,
  suffix,
}: {
  label: string;
  name: keyof SettingsForm;
  value: string;

  onChange: (
    event: ChangeEvent<
      HTMLInputElement
    >,
  ) => void;

  icon: React.ReactNode;
  type?: string;
  full?: boolean;
  suffix?: string;
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
        {icon}

        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
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
  name,
  value,
  onChange,
  icon,
  options,
}: {
  label: string;
  name: keyof SettingsForm;
  value: string;

  onChange: (
    event: ChangeEvent<
      HTMLSelectElement
    >,
  ) => void;

  icon: React.ReactNode;

  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <label
      className={styles.field}
    >
      <span>{label}</span>

      <div>
        {icon}

        <select
          name={name}
          value={value}
          onChange={onChange}
        >
          {options.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
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

function SwitchRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (
    checked: boolean,
  ) => void;
}) {
  return (
    <div
      className={styles.switchRow}
    >
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <button
        type="button"
        className={
          checked
            ? styles.switchActive
            : styles.switch
        }
        onClick={() =>
          onChange(!checked)
        }
        aria-pressed={checked}
      >
        <span />
      </button>
    </div>
  );
}
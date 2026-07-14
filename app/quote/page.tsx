"use client";

import { FormEvent, useState } from "react";
import {
  Building2,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Home,
  Package,
  Send,
  Truck,
  UserRound,
  Warehouse,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./quote.module.css";

type FormStatus = {
  type: "success" | "error" | "";
  message: string;
};

type ServiceType =
  | ""
  | "transport"
  | "transport-automobile"
  | "demenagement-residentiel"
  | "demenagement-commercial"
  | "entreposage"
  | "conteneur";

const serviceOptions = [
  {
    value: "transport",
    label: "Transport et livraison",
  },
  {
    value: "transport-automobile",
    label: "Transport automobile",
  },
  {
    value: "demenagement-residentiel",
    label: "Déménagement résidentiel",
  },
  {
    value: "demenagement-commercial",
    label: "Déménagement commercial",
  },
  {
    value: "entreposage",
    label: "Entreposage",
  },
  {
    value: "conteneur",
    label: "Déchargement de conteneur",
  },
];

export default function QuotePage() {
  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] =
    useState<ServiceType>("");

  const [status, setStatus] = useState<FormStatus>({
    type: "",
    message: "",
  });

  const isVehicleTransport =
    serviceType === "transport-automobile";

  const isMoving =
    serviceType === "demenagement-residentiel" ||
    serviceType === "demenagement-commercial";

  const isStandardTransport =
    serviceType === "transport" ||
    serviceType === "conteneur";

  const isStorage =
    serviceType === "entreposage";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setStatus({
      type: "",
      message: "",
    });

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      serviceType: String(
        formData.get("serviceType") || ""
      ).trim(),

      customer: {
        name: String(
          formData.get("senderName") || ""
        ).trim(),

        company: String(
          formData.get("senderCompany") || ""
        ).trim(),

        address: String(
          formData.get("senderAddress") || ""
        ).trim(),

        postalCode: String(
          formData.get("senderPostalCode") || ""
        ).trim(),

        city: String(
          formData.get("senderCity") || ""
        ).trim(),

        province: String(
          formData.get("senderProvince") || ""
        ).trim(),

        phone: String(
          formData.get("senderPhone") || ""
        ).trim(),

        email: String(
          formData.get("senderEmail") || ""
        ).trim(),
      },

      origin: {
        name: String(
          formData.get("originName") || ""
        ).trim(),

        address: String(
          formData.get("originAddress") || ""
        ).trim(),

        postalCode: String(
          formData.get("originPostalCode") || ""
        ).trim(),

        city: String(
          formData.get("originCity") || ""
        ).trim(),

        province: String(
          formData.get("originProvince") || ""
        ).trim(),

        phone: String(
          formData.get("originPhone") || ""
        ).trim(),
      },

      destination: {
        name: String(
          formData.get("destinationName") || ""
        ).trim(),

        address: String(
          formData.get("destinationAddress") || ""
        ).trim(),

        postalCode: String(
          formData.get("destinationPostalCode") || ""
        ).trim(),

        city: String(
          formData.get("destinationCity") || ""
        ).trim(),

        province: String(
          formData.get("destinationProvince") || ""
        ).trim(),

        phone: String(
          formData.get("destinationPhone") || ""
        ).trim(),

        email: String(
          formData.get("destinationEmail") || ""
        ).trim(),
      },

      requestedDate: String(
        formData.get("requestedDate") || ""
      ),

      deliveryOptions: {
        nextDay:
          formData.get("nextDayDelivery") === "on",

        sameDay:
          formData.get("sameDayDelivery") === "on",
      },

      merchandise: {
        palletQuantity: String(
          formData.get("palletQuantity") || ""
        ).trim(),

        dimensions: String(
          formData.get("dimensions") || ""
        ).trim(),

        description: String(
          formData.get("description") || ""
        ).trim(),

        weight: String(
          formData.get("weight") || ""
        ).trim(),

        tailgate:
          formData.get("tailgate") === "on",

        dockToDock:
          formData.get("dockToDock") === "on",

        handling:
          formData.get("handling") === "on",
      },

      vehicle: {
        quantity: String(
          formData.get("vehicleQuantity") || ""
        ).trim(),

        year: String(
          formData.get("vehicleYear") || ""
        ).trim(),

        make: String(
          formData.get("vehicleMake") || ""
        ).trim(),

        model: String(
          formData.get("vehicleModel") || ""
        ).trim(),

        condition: String(
          formData.get("vehicleCondition") || ""
        ).trim(),

        transportType: String(
          formData.get("vehicleTransportType") || ""
        ).trim(),
      },

      moving: {
        propertyType: String(
          formData.get("propertyType") || ""
        ).trim(),

        roomQuantity: String(
          formData.get("roomQuantity") || ""
        ).trim(),

        originFloor: String(
          formData.get("originFloor") || ""
        ).trim(),

        destinationFloor: String(
          formData.get("destinationFloor") || ""
        ).trim(),

        originElevator:
          formData.get("originElevator") === "on",

        destinationElevator:
          formData.get("destinationElevator") === "on",

        packingRequired:
          formData.get("packingRequired") === "on",

        furnitureDisassembly:
          formData.get("furnitureDisassembly") === "on",
      },

      storage: {
        duration: String(
          formData.get("storageDuration") || ""
        ).trim(),

        estimatedVolume: String(
          formData.get("estimatedVolume") || ""
        ).trim(),

        startDate: String(
          formData.get("storageStartDate") || ""
        ).trim(),

        climateControlled:
          formData.get("climateControlled") === "on",
      },

      additionalInformation: String(
        formData.get("additionalInformation") || ""
      ).trim(),
    };

    if (
      !payload.serviceType ||
      !payload.customer.name ||
      !payload.customer.email ||
      !payload.customer.phone ||
      !payload.requestedDate ||
      !payload.origin.address
    ) {
      setStatus({
        type: "error",
        message:
          "Veuillez remplir tous les champs obligatoires.",
      });

      return;
    }

    if (
      !isStorage &&
      !payload.destination.address
    ) {
      setStatus({
        type: "error",
        message:
          "Veuillez indiquer l’adresse de destination.",
      });

      return;
    }

    if (
      isVehicleTransport &&
      (!payload.vehicle.make ||
        !payload.vehicle.model ||
        !payload.vehicle.year)
    ) {
      setStatus({
        type: "error",
        message:
          "Veuillez indiquer l’année, la marque et le modèle du véhicule.",
      });

      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/quote", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Impossible d’envoyer la demande de soumission."
        );
      }

      setStatus({
        type: "success",
        message:
          "Votre demande de soumission a été envoyée avec succès. Notre équipe communiquera avec vous prochainement.",
      });

      form.reset();
      setServiceType("");
    } catch (error) {
      setStatus({
        type: "error",

        message:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue. Veuillez réessayer.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        {/* ========================================
            HERO
        ======================================== */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>
              Glory Solutions
            </p>

            <h1>
              Demande de
              <span>soumission</span>
            </h1>

            <p>
              Remplissez le formulaire ci-dessous afin que notre équipe
              puisse préparer une estimation adaptée à votre projet de
              transport, de déménagement ou d’entreposage.
            </p>
          </div>
        </section>

        {/* ========================================
            FORMULAIRE
        ======================================== */}
        <section className={styles.formSection}>
          <form
            className={styles.quoteForm}
            onSubmit={handleSubmit}
          >
            {/* ========================================
                CHOIX DU SERVICE
            ======================================== */}
            <fieldset className={styles.formBlock}>
              <legend className={styles.blockTitle}>
                <span className={styles.blockIcon}>
                  <Truck size={21} />
                </span>

                Service demandé
              </legend>

              <div className={styles.formGrid}>
                <label className={styles.fullField}>
                  <span>
                    Sélectionnez un service
                    <strong> *</strong>
                  </span>

                  <select
                    name="serviceType"
                    value={serviceType}
                    onChange={(event) =>
                      setServiceType(
                        event.target.value as ServiceType
                      )
                    }
                    required
                  >
                    <option value="">
                      Choisir un service
                    </option>

                    {serviceOptions.map((service) => (
                      <option
                        key={service.value}
                        value={service.value}
                      >
                        {service.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {serviceType && (
                <div className={styles.serviceSelection}>
                  {isVehicleTransport && (
                    <CarFront
                      size={24}
                      aria-hidden="true"
                    />
                  )}

                  {isMoving && (
                    <Home
                      size={24}
                      aria-hidden="true"
                    />
                  )}

                  {isStorage && (
                    <Warehouse
                      size={24}
                      aria-hidden="true"
                    />
                  )}

                  {isStandardTransport && (
                    <Truck
                      size={24}
                      aria-hidden="true"
                    />
                  )}

                  <span>
                    {
                      serviceOptions.find(
                        (service) =>
                          service.value === serviceType
                      )?.label
                    }
                  </span>
                </div>
              )}
            </fieldset>

            {/* ========================================
                CLIENT
            ======================================== */}
            <fieldset className={styles.formBlock}>
              <legend className={styles.blockTitle}>
                <span className={styles.blockIcon}>
                  <UserRound size={21} />
                </span>

                Vos coordonnées
              </legend>

              <div className={styles.formGrid}>
                <label className={styles.fullField}>
                  <span>
                    Nom complet <strong>*</strong>
                  </span>

                  <input
                    type="text"
                    name="senderName"
                    placeholder="Votre nom complet"
                    required
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Entreprise</span>

                  <input
                    type="text"
                    name="senderCompany"
                    placeholder="Nom de l’entreprise"
                  />
                </label>

                <label className={styles.largeField}>
                  <span>Adresse</span>

                  <input
                    type="text"
                    name="senderAddress"
                    placeholder="Votre adresse"
                  />
                </label>

                <label className={styles.smallField}>
                  <span>Code postal</span>

                  <input
                    type="text"
                    name="senderPostalCode"
                    placeholder="H1A 1A1"
                  />
                </label>

                <label>
                  <span>Ville</span>

                  <input
                    type="text"
                    name="senderCity"
                    placeholder="Ville"
                  />
                </label>

                <label>
                  <span>Province</span>

                  <input
                    type="text"
                    name="senderProvince"
                    placeholder="Québec"
                  />
                </label>

                <label>
                  <span>
                    Téléphone <strong>*</strong>
                  </span>

                  <input
                    type="tel"
                    name="senderPhone"
                    placeholder="514 000-0000"
                    required
                  />
                </label>

                <label>
                  <span>
                    Courriel <strong>*</strong>
                  </span>

                  <input
                    type="email"
                    name="senderEmail"
                    placeholder="votre@email.ca"
                    required
                  />
                </label>
              </div>
            </fieldset>

            {/* ========================================
                ADRESSE DE DÉPART
            ======================================== */}
            <fieldset className={styles.formBlock}>
              <legend className={styles.blockTitle}>
                <span className={styles.blockIcon}>
                  <Truck size={21} />
                </span>

                Adresse de départ
              </legend>

              <div className={styles.formGrid}>
                <label className={styles.fullField}>
                  <span>Nom du contact</span>

                  <input
                    type="text"
                    name="originName"
                    placeholder="Nom du contact au départ"
                  />
                </label>

                <label className={styles.largeField}>
                  <span>
                    Adresse <strong>*</strong>
                  </span>

                  <input
                    type="text"
                    name="originAddress"
                    placeholder="Adresse de départ"
                    required
                  />
                </label>

                <label className={styles.smallField}>
                  <span>Code postal</span>

                  <input
                    type="text"
                    name="originPostalCode"
                    placeholder="H1A 1A1"
                  />
                </label>

                <label>
                  <span>Ville</span>

                  <input
                    type="text"
                    name="originCity"
                    placeholder="Ville"
                  />
                </label>

                <label>
                  <span>Province</span>

                  <input
                    type="text"
                    name="originProvince"
                    placeholder="Québec"
                  />
                </label>

                <label>
                  <span>Téléphone</span>

                  <input
                    type="tel"
                    name="originPhone"
                    placeholder="Téléphone du contact"
                  />
                </label>
              </div>
            </fieldset>

            {/* ========================================
                DESTINATION
            ======================================== */}
            {!isStorage && (
              <fieldset className={styles.formBlock}>
                <legend className={styles.blockTitle}>
                  <span className={styles.blockIcon}>
                    <Package size={21} />
                  </span>

                  Adresse de destination
                </legend>

                <div className={styles.formGrid}>
                  <label className={styles.fullField}>
                    <span>Nom du destinataire</span>

                    <input
                      type="text"
                      name="destinationName"
                      placeholder="Nom du destinataire"
                    />
                  </label>

                  <label className={styles.largeField}>
                    <span>
                      Adresse <strong>*</strong>
                    </span>

                    <input
                      type="text"
                      name="destinationAddress"
                      placeholder="Adresse de destination"
                      required={!isStorage}
                    />
                  </label>

                  <label className={styles.smallField}>
                    <span>Code postal</span>

                    <input
                      type="text"
                      name="destinationPostalCode"
                      placeholder="H1A 1A1"
                    />
                  </label>

                  <label>
                    <span>Ville</span>

                    <input
                      type="text"
                      name="destinationCity"
                      placeholder="Ville"
                    />
                  </label>

                  <label>
                    <span>Province</span>

                    <input
                      type="text"
                      name="destinationProvince"
                      placeholder="Québec"
                    />
                  </label>

                  <label>
                    <span>Téléphone</span>

                    <input
                      type="tel"
                      name="destinationPhone"
                      placeholder="Téléphone"
                    />
                  </label>

                  <label>
                    <span>Courriel</span>

                    <input
                      type="email"
                      name="destinationEmail"
                      placeholder="Courriel"
                    />
                  </label>
                </div>
              </fieldset>
            )}

            {/* ========================================
                DATE
            ======================================== */}
            <fieldset className={styles.formBlock}>
              <legend className={styles.blockTitle}>
                <span className={styles.blockIcon}>
                  <CalendarDays size={21} />
                </span>

                Date souhaitée
              </legend>

              <div className={styles.deliveryRow}>
                <label className={styles.dateField}>
                  <span className={styles.dateLabel}>
                    <CalendarDays size={18} />

                    Date du service <strong>*</strong>
                  </span>

                  <input
                    type="date"
                    name="requestedDate"
                    required
                  />
                </label>

                {isStandardTransport && (
                  <div className={styles.deliveryOptions}>
                    <label className={styles.checkboxField}>
                      <input
                        type="checkbox"
                        name="nextDayDelivery"
                      />

                      <span>Livraison le lendemain</span>
                    </label>

                    <label className={styles.checkboxField}>
                      <input
                        type="checkbox"
                        name="sameDayDelivery"
                      />

                      <span>Livraison le jour même</span>
                    </label>
                  </div>
                )}
              </div>
            </fieldset>

            {/* ========================================
                TRANSPORT AUTOMOBILE
            ======================================== */}
            {isVehicleTransport && (
              <fieldset className={styles.formBlock}>
                <legend className={styles.blockTitle}>
                  <span className={styles.blockIcon}>
                    <CarFront size={21} />
                  </span>

                  Informations sur le véhicule
                </legend>

                <div className={styles.formGrid}>
                  <label>
                    <span>Nombre de véhicules</span>

                    <input
                      type="number"
                      name="vehicleQuantity"
                      min="1"
                      defaultValue="1"
                    />
                  </label>

                  <label>
                    <span>
                      Année <strong>*</strong>
                    </span>

                    <input
                      type="number"
                      name="vehicleYear"
                      min="1900"
                      max="2100"
                      placeholder="2024"
                      required
                    />
                  </label>

                  <label>
                    <span>
                      Marque <strong>*</strong>
                    </span>

                    <input
                      type="text"
                      name="vehicleMake"
                      placeholder="Toyota"
                      required
                    />
                  </label>

                  <label>
                    <span>
                      Modèle <strong>*</strong>
                    </span>

                    <input
                      type="text"
                      name="vehicleModel"
                      placeholder="Corolla"
                      required
                    />
                  </label>

                  <label>
                    <span>État du véhicule</span>

                    <select name="vehicleCondition">
                      <option value="">
                        Sélectionner
                      </option>

                      <option value="fonctionnel">
                        Véhicule fonctionnel
                      </option>

                      <option value="non-fonctionnel">
                        Véhicule non fonctionnel
                      </option>

                      <option value="accidente">
                        Véhicule accidenté
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>Type de transport</span>

                    <select name="vehicleTransportType">
                      <option value="">
                        Sélectionner
                      </option>

                      <option value="ouvert">
                        Transport ouvert
                      </option>

                      <option value="ferme">
                        Transport fermé
                      </option>

                      <option value="remorquage">
                        Remorquage
                      </option>
                    </select>
                  </label>
                </div>
              </fieldset>
            )}

            {/* ========================================
                DÉMÉNAGEMENT
            ======================================== */}
            {isMoving && (
              <fieldset className={styles.formBlock}>
                <legend className={styles.blockTitle}>
                  <span className={styles.blockIcon}>
                    {serviceType ===
                    "demenagement-commercial" ? (
                      <Building2 size={21} />
                    ) : (
                      <Home size={21} />
                    )}
                  </span>

                  Informations sur le déménagement
                </legend>

                <div className={styles.formGrid}>
                  <label>
                    <span>Type de propriété</span>

                    <select name="propertyType">
                      <option value="">
                        Sélectionner
                      </option>

                      <option value="appartement">
                        Appartement
                      </option>

                      <option value="condo">
                        Condo
                      </option>

                      <option value="maison">
                        Maison
                      </option>

                      <option value="bureau">
                        Bureau
                      </option>

                      <option value="commerce">
                        Local commercial
                      </option>

                      <option value="entrepot">
                        Entrepôt
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>Nombre de pièces</span>

                    <input
                      type="number"
                      name="roomQuantity"
                      min="0"
                      placeholder="Nombre de pièces"
                    />
                  </label>

                  <label>
                    <span>Étage au départ</span>

                    <input
                      type="text"
                      name="originFloor"
                      placeholder="Rez-de-chaussée, 2e étage..."
                    />
                  </label>

                  <label>
                    <span>Étage à destination</span>

                    <input
                      type="text"
                      name="destinationFloor"
                      placeholder="Rez-de-chaussée, 3e étage..."
                    />
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      name="originElevator"
                    />

                    <span>
                      Ascenseur disponible au départ
                    </span>
                  </label>

                  <label className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      name="destinationElevator"
                    />

                    <span>
                      Ascenseur disponible à destination
                    </span>
                  </label>

                  <label className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      name="packingRequired"
                    />

                    <span>
                      Service d’emballage requis
                    </span>
                  </label>

                  <label className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      name="furnitureDisassembly"
                    />

                    <span>
                      Démontage et remontage des meubles
                    </span>
                  </label>
                </div>
              </fieldset>
            )}

            {/* ========================================
                ENTREPOSAGE
            ======================================== */}
            {isStorage && (
              <fieldset className={styles.formBlock}>
                <legend className={styles.blockTitle}>
                  <span className={styles.blockIcon}>
                    <Warehouse size={21} />
                  </span>

                  Informations sur l’entreposage
                </legend>

                <div className={styles.formGrid}>
                  <label>
                    <span>Durée estimée</span>

                    <input
                      type="text"
                      name="storageDuration"
                      placeholder="1 mois, 6 mois..."
                    />
                  </label>

                  <label>
                    <span>Volume estimé</span>

                    <input
                      type="text"
                      name="estimatedVolume"
                      placeholder="Ex. : 10 m³"
                    />
                  </label>

                  <label>
                    <span>Date de début</span>

                    <input
                      type="date"
                      name="storageStartDate"
                    />
                  </label>

                  <label className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      name="climateControlled"
                    />

                    <span>
                      Entreposage climatisé requis
                    </span>
                  </label>
                </div>
              </fieldset>
            )}

            {/* ========================================
                MARCHANDISE
            ======================================== */}
            {isStandardTransport && (
              <fieldset className={styles.formBlock}>
                <legend className={styles.blockTitle}>
                  <span className={styles.blockIcon}>
                    <Package size={21} />
                  </span>

                  Marchandise
                </legend>

                <div className={styles.formGrid}>
                  <label>
                    <span>Quantité de palettes</span>

                    <input
                      type="number"
                      name="palletQuantity"
                      min="0"
                      placeholder="Quantité de palettes"
                    />
                  </label>

                  <label>
                    <span>Dimensions</span>

                    <input
                      type="text"
                      name="dimensions"
                      placeholder="Longueur × largeur × hauteur"
                    />
                  </label>

                  <label className={styles.fullField}>
                    <span>
                      Description de la marchandise
                    </span>

                    <input
                      type="text"
                      name="description"
                      placeholder="Description de la marchandise"
                    />
                  </label>
                </div>

                <div className={styles.merchandiseOptions}>
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxField}>
                      <input
                        type="checkbox"
                        name="tailgate"
                      />

                      <span>Tailgate</span>
                    </label>

                    <label className={styles.checkboxField}>
                      <input
                        type="checkbox"
                        name="dockToDock"
                      />

                      <span>Dock à dock</span>
                    </label>

                    <label className={styles.checkboxField}>
                      <input
                        type="checkbox"
                        name="handling"
                      />

                      <span>Manutention</span>
                    </label>
                  </div>

                  <label className={styles.weightField}>
                    <span>Poids total</span>

                    <input
                      type="text"
                      name="weight"
                      placeholder="Poids total"
                    />
                  </label>
                </div>
              </fieldset>
            )}

            {/* ========================================
                INFORMATIONS SUPPLÉMENTAIRES
            ======================================== */}
            <fieldset className={styles.formBlock}>
              <legend className={styles.blockTitle}>
                <span className={styles.blockIcon}>
                  <Package size={21} />
                </span>

                Informations supplémentaires
              </legend>

              <label className={styles.fullField}>
                <span>
                  Décrivez votre demande
                </span>

                <textarea
                  name="additionalInformation"
                  rows={7}
                  placeholder="Ajoutez toute information utile : objets lourds, accès difficile, stationnement, dimensions particulières, délais, exigences spéciales..."
                />
              </label>
            </fieldset>

            {/* ========================================
                ENVOI
            ======================================== */}
            <div className={styles.formFooter}>
              <p>
                Les champs marqués d’un astérisque sont obligatoires.
              </p>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? (
                  "Envoi en cours..."
                ) : (
                  <>
                    Envoyer la demande
                    <Send
                      size={18}
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            </div>

            {status.message && (
              <div
                className={`${styles.statusMessage} ${
                  status.type === "success"
                    ? styles.successMessage
                    : styles.errorMessage
                }`}
                role="status"
              >
                {status.type === "success" && (
                  <CheckCircle2
                    size={20}
                    aria-hidden="true"
                  />
                )}

                <span>{status.message}</span>
              </div>
            )}
          </form>
        </section>
      </main>

      <Footer />
    </div>
  );
}
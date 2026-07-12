"use client";

import { FormEvent, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Package,
  Send,
  Truck,
  UserRound,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./quote.module.css";

type FormStatus = {
  type: "success" | "error" | "";
  message: string;
};

export default function QuotePage() {
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<FormStatus>({
    type: "",
    message: "",
  });

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
      sender: {
        name: String(formData.get("senderName") || "").trim(),
        company: String(formData.get("senderCompany") || "").trim(),
        address: String(formData.get("senderAddress") || "").trim(),
        postalCode: String(
          formData.get("senderPostalCode") || ""
        ).trim(),
        city: String(formData.get("senderCity") || "").trim(),
        province: String(
          formData.get("senderProvince") || ""
        ).trim(),
        phone: String(formData.get("senderPhone") || "").trim(),
        email: String(formData.get("senderEmail") || "").trim(),
      },

      recipient: {
        name: String(
          formData.get("recipientName") || ""
        ).trim(),
        address: String(
          formData.get("recipientAddress") || ""
        ).trim(),
        postalCode: String(
          formData.get("recipientPostalCode") || ""
        ).trim(),
        city: String(
          formData.get("recipientCity") || ""
        ).trim(),
        province: String(
          formData.get("recipientProvince") || ""
        ).trim(),
        phone: String(
          formData.get("recipientPhone") || ""
        ).trim(),
        email: String(
          formData.get("recipientEmail") || ""
        ).trim(),
      },

      deliveryDate: String(
        formData.get("deliveryDate") || ""
      ),

      nextDayDelivery:
        formData.get("nextDayDelivery") === "on",

      sameDayDelivery:
        formData.get("sameDayDelivery") === "on",

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

      additionalInformation: String(
        formData.get("additionalInformation") || ""
      ).trim(),
    };

    if (
      !payload.sender.name ||
      !payload.sender.email ||
      !payload.recipient.name ||
      !payload.recipient.address ||
      !payload.deliveryDate
    ) {
      setStatus({
        type: "error",
        message:
          "Veuillez remplir les champs obligatoires.",
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
          "Votre demande de soumission a été envoyée avec succès.",
      });

      form.reset();
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
              Remplissez le formulaire ci-dessous afin que notre équipe puisse
              préparer une estimation adaptée à vos besoins de transport.
            </p>
          </div>
        </section>

        <section className={styles.formSection}>
          <form
            className={styles.quoteForm}
            onSubmit={handleSubmit}
          >
            {/* EXPÉDITEUR */}
            <fieldset className={styles.formBlock}>
              <legend className={styles.blockTitle}>
                <span className={styles.blockIcon}>
                  <UserRound size={21} />
                </span>

                Expéditeur
              </legend>

              <div className={styles.formGrid}>
                <label className={styles.fullField}>
                  <span>
                    Nom complet <strong>*</strong>
                  </span>

                  <input
                    type="text"
                    name="senderName"
                    placeholder="Nom complet"
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
                    placeholder="Adresse"
                  />
                </label>

                <label className={styles.smallField}>
                  <span>Code postal</span>

                  <input
                    type="text"
                    name="senderPostalCode"
                    placeholder="Code postal"
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
                    placeholder="Province"
                  />
                </label>

                <label>
                  <span>Téléphone</span>

                  <input
                    type="tel"
                    name="senderPhone"
                    placeholder="Numéro de téléphone"
                  />
                </label>

                <label>
                  <span>
                    Courriel <strong>*</strong>
                  </span>

                  <input
                    type="email"
                    name="senderEmail"
                    placeholder="Adresse courriel"
                    required
                  />
                </label>
              </div>
            </fieldset>

            {/* DESTINATAIRE */}
            <fieldset className={styles.formBlock}>
              <legend className={styles.blockTitle}>
                <span className={styles.blockIcon}>
                  <Truck size={21} />
                </span>

                Destinataire — Livraison
              </legend>

              <div className={styles.formGrid}>
                <label className={styles.fullField}>
                  <span>
                    Nom complet <strong>*</strong>
                  </span>

                  <input
                    type="text"
                    name="recipientName"
                    placeholder="Nom"
                    required
                  />
                </label>

                <label className={styles.largeField}>
                  <span>
                    Adresse <strong>*</strong>
                  </span>

                  <input
                    type="text"
                    name="recipientAddress"
                    placeholder="Adresse"
                    required
                  />
                </label>

                <label className={styles.smallField}>
                  <span>Code postal</span>

                  <input
                    type="text"
                    name="recipientPostalCode"
                    placeholder="Code postal / ZIP"
                  />
                </label>

                <label>
                  <span>Ville</span>

                  <input
                    type="text"
                    name="recipientCity"
                    placeholder="Ville"
                  />
                </label>

                <label>
                  <span>Province</span>

                  <input
                    type="text"
                    name="recipientProvince"
                    placeholder="Région / Province"
                  />
                </label>

                <label>
                  <span>Téléphone</span>

                  <input
                    type="tel"
                    name="recipientPhone"
                    placeholder="Numéro de téléphone"
                  />
                </label>

                <label>
                  <span>Courriel</span>

                  <input
                    type="email"
                    name="recipientEmail"
                    placeholder="Courriel"
                  />
                </label>
              </div>

              <div className={styles.deliveryRow}>
                <label className={styles.dateField}>
                  <span className={styles.dateLabel}>
                    <CalendarDays size={18} />
                    Date de livraison <strong>*</strong>
                  </span>

                  <input
                    type="date"
                    name="deliveryDate"
                    required
                  />
                </label>

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
              </div>
            </fieldset>

            {/* MARCHANDISE */}
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
                    placeholder="Quantité de palette(s)"
                  />
                </label>

                <label>
                  <span>Dimensions</span>

                  <input
                    type="text"
                    name="dimensions"
                    placeholder="Dimensions"
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Description de la marchandise</span>

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

              <label className={styles.fullField}>
                <span>Informations supplémentaires</span>

                <textarea
                  name="additionalInformation"
                  rows={6}
                  placeholder="Informations supplémentaires"
                />
              </label>
            </fieldset>

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
                    <Send size={18} />
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
                  <CheckCircle2 size={20} />
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
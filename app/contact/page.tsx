"use client";

import { FormEvent, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Mail,
  Phone,
  Printer,
  Send,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./contact.module.css";

type Office = {
  city: string;
  phone: string;
  address: string;
};

type Status = {
  type: "success" | "error" | "";
  message: string;
};

const offices: Office[] = [

  {
    city: "Montréal",
    phone: "514-553-6762",
    address:
      "5975 Av. de l'authion Montréal, QC H1M 2W3",
  },
  
];

function OfficeItem({
  city,
  phone,
  address,
}: Office) {
  const phoneLink = phone.replace(/[^\d+]/g, "");

  return (
    <article className={styles.officeItem}>
      <div className={styles.iconCircle}>
        <Building2
          size={20}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </div>

      <div className={styles.officeText}>
        <h3>
          {city} :{" "}
          <a href={`tel:${phoneLink}`}>
            {phone}
          </a>
        </h3>

        <p>{address}</p>
      </div>
    </article>
  );
}

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<Status>({
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
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      company: String(
        formData.get("company") || ""
      ).trim(),
      message: String(
        formData.get("message") || ""
      ).trim(),
    };

    if (
      !payload.name ||
      !payload.email ||
      !payload.message
    ) {
      setStatus({
        type: "error",
        message:
          "Veuillez remplir le nom, l’adresse courriel et le message.",
      });

      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/contact", {
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
            "Impossible d’envoyer le message."
        );
      }

      setStatus({
        type: "success",
        message:
          "Votre message a été envoyé avec succès.",
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
        <section className={styles.contactSection}>
          <div className={styles.contactGrid}>
            {/* COLONNE GAUCHE */}
            <div className={styles.formColumn}>
              <h1 className={styles.title}>
                Envoyez-nous un message
              </h1>

              <div className={styles.contactInfo}>
                {/* TÉLÉPHONE */}
                <div className={styles.infoRow}>
                  <div className={styles.iconCircle}>
                    <Phone
                      size={20}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </div>

                  <p>
                    <strong>Sans frais :</strong>{" "}
                    <a href="tel:18886751515">
                      514-553-6762
                    </a>
                  </p>
                </div>

                {/* FAX */}
               

                {/* COURRIEL */}
                <div className={styles.infoRow}>
                  <div className={styles.iconCircle}>
                    <Mail
                      size={20}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </div>

                  <p>
                    <a
                      href="mailto:info@glorysolutions.ca"
                      className={styles.emailLink}
                    >
                      contact@glorysolutions.ca
                    </a>
                  </p>
                </div>
              </div>

              <p className={styles.introduction}>
                Complétez le formulaire ci-dessous et
                notre équipe répondra à votre demande dès
                que possible.
              </p>

              <form
                className={styles.form}
                onSubmit={handleSubmit}
              >
                <label className={styles.field}>
                  <span>
                    Nom <strong>*</strong>
                  </span>

                  <input
                    type="text"
                    name="name"
                    placeholder="Nom *"
                    autoComplete="name"
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>
                    E-mail <strong>*</strong>
                  </span>

                  <input
                    type="email"
                    name="email"
                    placeholder="E-mail *"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Téléphone</span>

                  <input
                    type="tel"
                    name="phone"
                    placeholder="Téléphone"
                    autoComplete="tel"
                  />
                </label>

                <label className={styles.field}>
                  <span>Entreprise</span>

                  <input
                    type="text"
                    name="company"
                    placeholder="Entreprise"
                    autoComplete="organization"
                  />
                </label>

                <label className={styles.field}>
                  <span>
                    Message <strong>*</strong>
                  </span>

                  <textarea
                    name="message"
                    placeholder="Message *"
                    rows={5}
                    required
                  />
                </label>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? (
                    "Envoi en cours..."
                  ) : (
                    <>
                      Envoyer le message

                      <Send
                        size={17}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </>
                  )}
                </button>

                {status.message && (
                  <div
                    className={`${styles.status} ${
                      status.type === "success"
                        ? styles.success
                        : styles.error
                    }`}
                    role="status"
                  >
                    {status.type === "success" && (
                      <CheckCircle2
                        size={19}
                        aria-hidden="true"
                      />
                    )}

                    <span>{status.message}</span>
                  </div>
                )}
              </form>
            </div>

            {/* COLONNE DROITE */}
            <aside className={styles.officesColumn}>
              <h2 className={styles.title}>
                Bureaux
              </h2>

              <div className={styles.officesList}>
                {offices.map((office) => (
                  <OfficeItem
                    key={office.city}
                    city={office.city}
                    phone={office.phone}
                    address={office.address}
                  />
                ))}
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
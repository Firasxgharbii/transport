"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import styles from "./contact.module.css";

/* =========================================================
   API
========================================================= */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://172.20.10.6:5000";

/* =========================================================
   TYPES
========================================================= */

type Office = {
  city: string;
  phone: string;
  address: string;
};

type Status = {
  type: "success" | "error" | "";
  message: string;
};

/* =========================================================
   BUREAUX
========================================================= */

const offices: Office[] = [
  {
    city: "Montréal",
    phone: "514-553-6762",
    address:
      "5975 Av. de l'Authion, Montréal, QC H1M 2W3",
  },
];

/* =========================================================
   OFFICE ITEM
========================================================= */

function OfficeItem({
  city,
  phone,
  address,
}: Office) {
  const phoneLink =
    phone.replace(/[^\d+]/g, "");

  return (
    <article className={styles.officeItem}>
      <div className={styles.iconCircle}>
        <MapPin
          size={20}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </div>

      <div className={styles.officeText}>
        <h3>{city}</h3>

        <a
          href={`tel:${phoneLink}`}
          className={styles.officePhone}
        >
          {phone}
        </a>

        <p>{address}</p>
      </div>
    </article>
  );
}

/* =========================================================
   PAGE CONTACT
========================================================= */

export default function ContactPage() {
  const [loading, setLoading] =
    useState(false);

  const [status, setStatus] =
    useState<Status>({
      type: "",
      message: "",
    });

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setStatus({
      type: "",
      message: "",
    });

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    const payload = {
      name: String(
        formData.get("name") || ""
      ).trim(),

      email: String(
        formData.get("email") || ""
      ).trim(),

      phone: String(
        formData.get("phone") || ""
      ).trim(),

      company: String(
        formData.get("company") || ""
      ).trim(),

      message: String(
        formData.get("message") || ""
      ).trim(),
    };

    /* =====================================================
       VALIDATION
    ===================================================== */

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
      const response =
        await fetch(
          `${API_URL}/api/contact`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(payload),
          }
        );

      const data =
        await response
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
          "Votre message a été envoyé avec succès. Notre équipe vous répondra dès que possible.",
      });

      form.reset();
    } catch (error) {
      console.error(
        "Erreur formulaire contact :",
        error
      );

      setStatus({
        type: "error",

        message:
          error instanceof Error
            ? error.message
            : "Impossible d’envoyer le message.",
      });
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     JSX
  ======================================================= */

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <section
          className={
            styles.contactSection
          }
        >
          <div
            className={
              styles.contactGrid
            }
          >
            {/* ============================================
                COLONNE FORMULAIRE
            ============================================ */}

            <div
              className={
                styles.formColumn
              }
            >
              <p
                className={
                  styles.sectionLabel
                }
              >
                Contact
              </p>

              <h1
                className={
                  styles.title
                }
              >
                Envoyez-nous un message
              </h1>

              {/* ==========================================
                  INFORMATIONS
              ========================================== */}

              <div
                className={
                  styles.contactInfo
                }
              >
                {/* TÉLÉPHONE */}

                <div
                  className={
                    styles.infoRow
                  }
                >
                  <div
                    className={
                      styles.iconCircle
                    }
                  >
                    <Phone
                      size={20}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <span>
                      Téléphone
                    </span>

                    <p>
                      <a href="tel:5145536762">
                        514-553-6762
                      </a>
                    </p>
                  </div>
                </div>

                {/* COURRIEL */}

                <div
                  className={
                    styles.infoRow
                  }
                >
                  <div
                    className={
                      styles.iconCircle
                    }
                  >
                    <Mail
                      size={20}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <span>
                      Courriel
                    </span>

                    <p>
                      <a
                        href="mailto:contact@glorysolutions.ca"
                        className={
                          styles.emailLink
                        }
                      >
                        contact@glorysolutions.ca
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              <p
                className={
                  styles.introduction
                }
              >
                Complétez le formulaire
                ci-dessous et notre équipe
                répondra à votre demande
                dès que possible.
              </p>

              {/* ==========================================
                  FORMULAIRE
              ========================================== */}

              <form
                className={styles.form}
                onSubmit={handleSubmit}
              >
                {/* NOM */}

                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    Nom
                    <strong> *</strong>
                  </span>

                  <input
                    type="text"
                    name="name"
                    placeholder="Votre nom"
                    autoComplete="name"
                    required
                  />
                </label>

                {/* EMAIL */}

                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    E-mail
                    <strong> *</strong>
                  </span>

                  <input
                    type="email"
                    name="email"
                    placeholder="Votre adresse courriel"
                    autoComplete="email"
                    required
                  />
                </label>

                {/* PHONE */}

                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    Téléphone
                  </span>

                  <input
                    type="tel"
                    name="phone"
                    placeholder="Votre téléphone"
                    autoComplete="tel"
                  />
                </label>

                {/* ENTREPRISE */}

                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    Entreprise
                  </span>

                  <input
                    type="text"
                    name="company"
                    placeholder="Nom de l’entreprise"
                    autoComplete="organization"
                  />
                </label>

                {/* MESSAGE */}

                <label
                  className={
                    styles.field
                  }
                >
                  <span>
                    Message
                    <strong> *</strong>
                  </span>

                  <textarea
                    name="message"
                    placeholder="Comment pouvons-nous vous aider ?"
                    rows={6}
                    required
                  />
                </label>

                {/* SUBMIT */}

                <button
                  type="submit"
                  className={
                    styles.submitButton
                  }
                  disabled={loading}
                >
                  {loading
                    ? "Envoi en cours..."
                    : (
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

                {/* STATUS */}

                {status.message && (
                  <div
                    className={`
                      ${styles.status}
                      ${
                        status.type ===
                        "success"
                          ? styles.success
                          : styles.error
                      }
                    `}
                    role="status"
                  >
                    {status.type ===
                      "success" && (
                      <CheckCircle2
                        size={19}
                        aria-hidden="true"
                      />
                    )}

                    <span>
                      {status.message}
                    </span>
                  </div>
                )}
              </form>
            </div>

            {/* ============================================
                BUREAUX
            ============================================ */}

            <aside
              className={
                styles.officesColumn
              }
            >
              <p
                className={
                  styles.sectionLabel
                }
              >
                Où nous trouver
              </p>

              <h2
                className={
                  styles.title
                }
              >
                Bureaux
              </h2>

              <div
                className={
                  styles.officesList
                }
              >
                {offices.map(
                  (office) => (
                    <OfficeItem
                      key={
                        office.city
                      }
                      {...office}
                    />
                  )
                )}
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
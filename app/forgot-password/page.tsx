"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";

import styles from "./forgot-password.module.css";

type ForgotPasswordResponse = {
  success?: boolean;
  message?: string;
  code?: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setEmail(event.target.value);

    if (errorMessage) {
      setErrorMessage("");
    }

    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const validateEmail = () => {
    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      return "Veuillez entrer votre adresse courriel.";
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return "Veuillez entrer une adresse courriel valide.";
    }

    return "";
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validateEmail();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        }
      );

      let responseData: ForgotPasswordResponse =
        {};

      try {
        responseData = await response.json();
      } catch {
        responseData = {};
      }

      if (!response.ok) {
        throw new Error(
          responseData.message ||
            "Impossible d’envoyer la demande de réinitialisation."
        );
      }

      /*
       * Message volontairement générique :
       * il évite de révéler si un courriel existe
       * ou non dans la base de données.
       */
      setSuccessMessage(
        responseData.message ||
          "Si un compte correspond à cette adresse, un courriel de réinitialisation sera envoyé."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de communiquer avec le serveur."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div
        className={styles.backgroundGrid}
        aria-hidden="true"
      />

      <div
        className={`${styles.glow} ${styles.glowOne}`}
        aria-hidden="true"
      />

      <div
        className={`${styles.glow} ${styles.glowTwo}`}
        aria-hidden="true"
      />

      <section className={styles.card}>
        <aside className={styles.presentation}>
          <div
            className={styles.presentationPattern}
            aria-hidden="true"
          />

          <div className={styles.presentationContent}>
            <Link
              href="/"
              className={styles.logoLink}
              aria-label="Retour à l’accueil Glory Solutions"
            >
              <Image
                src="/images/logo1.png"
                alt="Glory Solutions"
                width={145}
                height={60}
                priority
                className={styles.logo}
              />
            </Link>

            <div className={styles.presentationMain}>
              <span className={styles.badge}>
                <span />
                Sécurité du compte
              </span>

              <h1>
                Récupérez votre accès
                <strong> en toute sécurité.</strong>
              </h1>

              <p>
                Entrez votre adresse courriel. Nous
                vous transmettrons les instructions
                nécessaires pour créer un nouveau mot
                de passe.
              </p>

              <div className={styles.securityCard}>
                <span>
                  <ShieldCheck size={21} />
                </span>

                <div>
                  <strong>
                    Protection de vos informations
                  </strong>

                  <p>
                    Glory Solutions ne vous demandera
                    jamais votre mot de passe par
                    courriel.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.presentationFooter}>
              <span>Fiabilité</span>
              <i />
              <span>Confidentialité</span>
              <i />
              <span>Sécurité</span>
            </div>
          </div>
        </aside>

        <section className={styles.formSection}>
          <header className={styles.mobileHeader}>
            <Link
              href="/"
              aria-label="Retour à l’accueil"
            >
              <Image
                src="/images/logo1.png"
                alt="Glory Solutions"
                width={105}
                height={45}
                priority
                className={styles.mobileLogo}
              />
            </Link>
          </header>

          <div className={styles.formContainer}>
            <Link
              href="/login"
              className={styles.backLink}
            >
              <ArrowLeft size={17} />
              Retour à la connexion
            </Link>

            <div className={styles.iconBox}>
              <LockKeyhole size={30} />
            </div>

            <header className={styles.formHeader}>
              <span className={styles.secureBadge}>
                <ShieldCheck size={15} />
                Demande sécurisée
              </span>

              <h2>Mot de passe oublié?</h2>

              <p>
                Entrez l’adresse courriel associée à
                votre compte Glory Solutions.
              </p>
            </header>

            {successMessage ? (
              <section
                className={styles.successCard}
                role="status"
              >
                <span
                  className={styles.successIcon}
                >
                  <CheckCircle2 size={27} />
                </span>

                <h3>Demande envoyée</h3>

                <p>{successMessage}</p>

                <Link
                  href="/login"
                  className={styles.loginButton}
                >
                  Retour à la connexion
                  <ArrowRight size={18} />
                </Link>
              </section>
            ) : (
              <form
                className={styles.form}
                onSubmit={handleSubmit}
                noValidate
              >
                {errorMessage && (
                  <div
                    className={styles.errorMessage}
                    role="alert"
                  >
                    <span>!</span>
                    <p>{errorMessage}</p>
                  </div>
                )}

                <div className={styles.field}>
                  <label htmlFor="email">
                    Adresse courriel
                  </label>

                  <div
                    className={styles.inputWrapper}
                  >
                    <Mail
                      size={19}
                      className={styles.inputIcon}
                      aria-hidden="true"
                    />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={handleChange}
                      placeholder="nom@entreprise.com"
                      autoComplete="email"
                      disabled={isLoading}
                      maxLength={190}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2
                        size={20}
                        className={styles.loader}
                      />

                      <span>
                        Envoi en cours...
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Envoyer les instructions
                      </span>

                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className={styles.securityNotice}>
              <ShieldCheck size={16} />

              <p>
                Pour votre sécurité, nous affichons
                toujours le même message, même si
                l’adresse courriel n’existe pas.
              </p>
            </div>
          </div>

          <footer className={styles.footer}>
            <span>
              © {new Date().getFullYear()} Glory
              Solutions
            </span>

            <nav>
              <Link href="/contact">
                Assistance
              </Link>

              <Link href="/">
                Retour à l’accueil
              </Link>
            </nav>
          </footer>
        </section>
      </section>
    </main>
  );
}
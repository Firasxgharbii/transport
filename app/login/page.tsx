"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import styles from "./login.module.css";

/* =====================================================
   TYPES
===================================================== */

type LoginFormData = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type UserData = {
  id?: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  role?: string;
  account_status?: string;
  email_verified?: boolean;
};

type LoginResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  token?: string;
  accessToken?: string;
  user?: UserData;

  data?: {
    token?: string;
    accessToken?: string;
    user?: UserData;
  };
};

/* =====================================================
   CONFIGURATION
===================================================== */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const initialFormData: LoginFormData = {
  email: "",
  password: "",
  rememberMe: false,
};

/* =====================================================
   PAGE LOGIN
===================================================== */

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] =
    useState<LoginFormData>(initialFormData);

  const [showPassword, setShowPassword] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  /* =====================================================
     RÉCUPÉRER LE COURRIEL MÉMORISÉ
  ===================================================== */

  useEffect(() => {
    const rememberedEmail =
      window.localStorage.getItem(
        "glory_remembered_email"
      );

    if (!rememberedEmail) {
      return;
    }

    setFormData((previousData) => ({
      ...previousData,
      email: rememberedEmail,
      rememberMe: true,
    }));
  }, []);

  /* =====================================================
     MODIFIER LES CHAMPS
  ===================================================== */

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }

    if (successMessage) {
      setSuccessMessage("");
    }
  };

  /* =====================================================
     VALIDATION
  ===================================================== */

  const validateForm = () => {
    const normalizedEmail =
      formData.email.trim().toLowerCase();

    if (!normalizedEmail) {
      return "Veuillez entrer votre adresse courriel.";
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return "Veuillez entrer une adresse courriel valide.";
    }

    if (!formData.password) {
      return "Veuillez entrer votre mot de passe.";
    }

    if (formData.password.length < 6) {
      return "Le mot de passe doit contenir au moins 6 caractères.";
    }

    return "";
  };

  /* =====================================================
     REDIRECTION SELON LE RÔLE
  ===================================================== */

  const getRedirectPath = (
    role?: string
  ) => {
    switch (role) {
      case "super_admin":
        return "/dashboard/admin";

      case "dispatcher":
        return "/dashboard/dispatcher";

      case "driver":
        return "/dashboard/driver";

      case "client":
        return "/dashboard/client";

      default:
        return "/dashboard";
    }
  };

  /* =====================================================
     MESSAGES DU BACKEND
  ===================================================== */

  const getBackendErrorMessage = (
    responseData: LoginResponse
  ) => {
    switch (responseData.code) {
      case "EMAIL_NOT_VERIFIED":
        return "Veuillez vérifier votre adresse courriel avant de vous connecter.";

      case "ACCOUNT_PENDING_APPROVAL":
        return "Votre compte est en attente d’approbation par Glory Solutions.";

      case "ACCOUNT_REJECTED":
        return "Votre demande d’inscription n’a pas été approuvée.";

      case "ACCOUNT_SUSPENDED":
        return "Votre compte est temporairement suspendu.";

      case "ACCOUNT_INACTIVE":
        return "Votre compte n’est pas encore actif.";

      case "INVALID_CREDENTIALS":
        return "Adresse courriel ou mot de passe incorrect.";

      default:
        return (
          responseData.message ||
          "Impossible de vous connecter."
        );
    }
  };

  /* =====================================================
     CONNEXION
  ===================================================== */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const validationError =
      validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: formData.email
              .trim()
              .toLowerCase(),

            password: formData.password,
          }),
        }
      );

      let responseData: LoginResponse;

      try {
        responseData =
          await response.json();
      } catch {
        throw new Error(
          "La réponse retournée par le serveur est invalide."
        );
      }

      if (!response.ok) {
        throw new Error(
          getBackendErrorMessage(
            responseData
          )
        );
      }

      const token =
        responseData.token ||
        responseData.accessToken ||
        responseData.data?.token ||
        responseData.data?.accessToken;

      const user =
        responseData.user ||
        responseData.data?.user;

      if (!token) {
        throw new Error(
          "Le serveur n’a retourné aucun jeton de connexion."
        );
      }

      /*
       * Stockage temporaire côté navigateur.
       * Plus tard, tu pourras utiliser un cookie HttpOnly
       * créé directement par le backend.
       */
      window.localStorage.setItem(
        "glory_token",
        token
      );

      window.localStorage.setItem(
        "glory_user",
        JSON.stringify(user || {})
      );

      if (formData.rememberMe) {
        window.localStorage.setItem(
          "glory_remembered_email",
          formData.email
            .trim()
            .toLowerCase()
        );
      } else {
        window.localStorage.removeItem(
          "glory_remembered_email"
        );
      }

      setSuccessMessage(
        "Connexion réussie. Redirection en cours..."
      );

      const destination =
        getRedirectPath(user?.role);

      window.setTimeout(() => {
        router.push(destination);
        router.refresh();
      }, 900);
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

  /* =====================================================
     AFFICHAGE
  ===================================================== */

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

      <section className={styles.loginCard}>
        {/* =================================================
            PANNEAU GAUCHE
        ================================================= */}

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
                width={170}
                height={70}
                priority
                className={styles.logo}
              />
            </Link>

            <div className={styles.presentationMain}>
              <span className={styles.platformBadge}>
                <span />
                Plateforme professionnelle
              </span>

              <h1>
                Votre transport,
                <strong>
                  {" "}
                  simplement maîtrisé.
                </strong>
              </h1>

              <p className={styles.presentationDescription}>
                Gérez vos commandes, vos clients,
                vos chauffeurs et vos livraisons
                depuis un seul espace sécurisé.
              </p>

              <div className={styles.benefits}>
                <article className={styles.benefit}>
                  <span className={styles.benefitIcon}>
                    <Truck size={20} />
                  </span>

                  <div>
                    <h2>
                      Gestion des opérations
                    </h2>

                    <p>
                      Suivez chaque transport et
                      chaque livraison.
                    </p>
                  </div>
                </article>

                <article className={styles.benefit}>
                  <span className={styles.benefitIcon}>
                    <ShieldCheck size={20} />
                  </span>

                  <div>
                    <h2>Accès sécurisé</h2>

                    <p>
                      Chaque utilisateur accède
                      uniquement à son espace.
                    </p>
                  </div>
                </article>
              </div>
            </div>

            <div className={styles.presentationFooter}>
              <span>Fiabilité</span>
              <i />
              <span>Ponctualité</span>
              <i />
              <span>Sécurité</span>
            </div>
          </div>
        </aside>

        {/* =================================================
            PANNEAU DROIT
        ================================================= */}

        <section className={styles.formSection}>
          <header className={styles.mobileHeader}>
            <Link
              href="/"
              className={styles.mobileLogoLink}
              aria-label="Retour à l’accueil Glory Solutions"
            >
              <Image
                src="/images/logo1.png"
                alt="Glory Solutions"
                width={130}
                height={55}
                priority
                className={styles.mobileLogo}
              />
            </Link>
          </header>

          <div className={styles.formContainer}>
            <header className={styles.formHeader}>
              <span className={styles.secureBadge}>
                <ShieldCheck size={15} />
                Espace sécurisé
              </span>

              <h2>Connexion</h2>

              <p>
                Entrez vos informations pour
                accéder à votre espace Glory
                Solutions.
              </p>
            </header>

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

              {successMessage && (
                <div
                  className={styles.successMessage}
                  role="status"
                >
                  <CheckCircle2 size={19} />
                  <p>{successMessage}</p>
                </div>
              )}

              <div className={styles.field}>
                <label htmlFor="email">
                  Adresse courriel
                </label>

                <div className={styles.inputWrapper}>
                  <Mail
                    size={19}
                    className={styles.inputIcon}
                    aria-hidden="true"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="nom@entreprise.com"
                    autoComplete="email"
                    disabled={isLoading}
                    maxLength={190}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label htmlFor="password">
                    Mot de passe
                  </label>

                  <Link
                    href="/forgot-password"
                    className={styles.forgotLink}
                  >
                    Mot de passe oublié?
                  </Link>
                </div>

                <div className={styles.inputWrapper}>
                  <Lock
                    size={19}
                    className={styles.inputIcon}
                    aria-hidden="true"
                  />

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Votre mot de passe"
                    autoComplete="current-password"
                    disabled={isLoading}
                    maxLength={128}
                  />

                  <button
                    type="button"
                    className={styles.passwordButton}
                    onClick={() =>
                      setShowPassword(
                        (previousValue) =>
                          !previousValue
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              <label className={styles.remember}>
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={isLoading}
                />

                <span className={styles.checkbox}>
                  <Check size={13} />
                </span>

                <span>Se souvenir de moi</span>
              </label>

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
                      Connexion en cours...
                    </span>
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            {/* =================================================
                INSCRIPTION CLIENT
            ================================================= */}

            <section className={styles.signupSection}>
              <div className={styles.divider}>
                <span />
                <p>Nouveau client?</p>
                <span />
              </div>

              <div className={styles.signupCard}>
                <div className={styles.signupContent}>
                  <span className={styles.signupIcon}>
                    <ShieldCheck size={18} />
                  </span>

                  <div>
                    <h3>
                      Créer un compte client
                    </h3>

                    <p>
                      Suivez vos commandes et vos
                      livraisons dans un espace
                      sécurisé.
                    </p>
                  </div>
                </div>

                <Link
                  href="/signup"
                  className={styles.signupButton}
                >
                  <span>S’inscrire</span>
                  <ArrowRight size={18} />
                </Link>
              </div>

           
            </section>

            <div className={styles.securityNotice}>
              <ShieldCheck size={16} />
   
              <p>
                Vos informations sont protégées
                et demeurent confidentielles.
              </p>
            </div>
          </div>

          <footer className={styles.footer}>
            <span>
              © {new Date().getFullYear()} Glory
              Solutions
              
            </span>

            
            <nav aria-label="Liens du pied de page">
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
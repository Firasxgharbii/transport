"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";

import styles from "./signup.module.css";

type SignupFormData = {
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

type SignupResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  data?: {
    userId?: number;
    email?: string;
    accountStatus?: string;
  };
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const initialFormData: SignupFormData = {
  firstName: "",
  lastName: "",
  companyName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

export default function SignupPage() {
  const router = useRouter();

  const [formData, setFormData] =
    useState<SignupFormData>(initialFormData);

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const passwordRules = useMemo(
    () => ({
      minimumLength:
        formData.password.length >= 8,

      uppercase:
        /[A-Z]/.test(formData.password),

      lowercase:
        /[a-z]/.test(formData.password),

      number:
        /\d/.test(formData.password),

      specialCharacter:
        /[^A-Za-z0-9]/.test(
          formData.password
        ),
    }),
    [formData.password]
  );

  const passwordIsStrong =
    passwordRules.minimumLength &&
    passwordRules.uppercase &&
    passwordRules.lowercase &&
    passwordRules.number &&
    passwordRules.specialCharacter;

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const {
      name,
      value,
      checked,
      type,
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

  const validateForm = () => {
    const normalizedFirstName =
      formData.firstName.trim();

    const normalizedLastName =
      formData.lastName.trim();

    const normalizedEmail =
      formData.email.trim().toLowerCase();

    const normalizedPhone =
      formData.phone.trim();

    if (normalizedFirstName.length < 2) {
      return "Veuillez entrer un prénom valide.";
    }

    if (normalizedLastName.length < 2) {
      return "Veuillez entrer un nom valide.";
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return "Veuillez entrer une adresse courriel valide.";
    }

    const phonePattern =
      /^[0-9+()\-\s]{7,20}$/;

    if (
      normalizedPhone &&
      !phonePattern.test(normalizedPhone)
    ) {
      return "Veuillez entrer un numéro de téléphone valide.";
    }

    if (!passwordIsStrong) {
      return "Votre mot de passe ne respecte pas toutes les règles de sécurité.";
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      return "Les deux mots de passe ne correspondent pas.";
    }

    if (!formData.acceptTerms) {
      return "Vous devez accepter les conditions d’utilisation.";
    }

    return "";
  };

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

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/client-register`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            first_name:
              formData.firstName.trim(),

            last_name:
              formData.lastName.trim(),

            company_name:
              formData.companyName.trim() ||
              null,

            phone:
              formData.phone.trim() || null,

            email:
              formData.email
                .trim()
                .toLowerCase(),

            password:
              formData.password,
          }),
        }
      );

      let responseData: SignupResponse;

      try {
        responseData =
          await response.json();
      } catch {
        throw new Error(
          "La réponse du serveur est invalide."
        );
      }

      if (!response.ok) {
        if (
          responseData.code ===
          "EMAIL_ALREADY_EXISTS"
        ) {
          throw new Error(
            "Un compte existe déjà avec cette adresse courriel."
          );
        }

        throw new Error(
          responseData.message ||
            "Impossible de créer votre compte."
        );
      }

      setSuccessMessage(
        responseData.message ||
          "Votre inscription a été envoyée avec succès."
      );

      sessionStorage.setItem(
        "glory_pending_email",
        formData.email
          .trim()
          .toLowerCase()
      );

      window.setTimeout(() => {
        router.push("/account-pending");
      }, 1200);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.";

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div
        className={styles.gridBackground}
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

      <section className={styles.signupCard}>
        <aside className={styles.brandPanel}>
          <div
            className={styles.brandPattern}
            aria-hidden="true"
          />

          <div className={styles.brandContent}>
            <Link
              href="/"
              className={styles.logoLink}
              aria-label="Retour à l’accueil Glory Solutions"
            >
              <Image
                src="/images/logo1.png"
                alt="Glory Solutions"
                width={190}
                height={78}
                priority
                className={styles.logo}
              />
            </Link>

            <div className={styles.brandMain}>
              <span className={styles.brandBadge}>
                <span />
                Espace client
              </span>

              <h1>
                Créez votre compte
                <strong>
                  {" "}
                  en toute sécurité.
                </strong>
              </h1>

              <p>
                Accédez à un espace professionnel
                pour suivre vos demandes, vos
                commandes et vos livraisons avec
                Glory Solutions.
              </p>

              <div className={styles.steps}>
                <article className={styles.step}>
                  <span
                    className={styles.stepNumber}
                  >
                    01
                  </span>

                  <div>
                    <h2>
                      Créez votre compte
                    </h2>

                    <p>
                      Remplissez le formulaire avec
                      vos informations.
                    </p>
                  </div>
                </article>

                <article className={styles.step}>
                  <span
                    className={styles.stepNumber}
                  >
                    02
                  </span>

                  <div>
                    <h2>
                      Vérifiez votre courriel
                    </h2>

                    <p>
                      Un lien sécurisé vous sera
                      envoyé par courriel.
                    </p>
                  </div>
                </article>

                <article className={styles.step}>
                  <span
                    className={styles.stepNumber}
                  >
                    03
                  </span>

                  <div>
                    <h2>
                      Approbation Glory
                    </h2>

                    <p>
                      Notre équipe vérifie et
                      active votre compte.
                    </p>
                  </div>
                </article>
              </div>
            </div>

            <div className={styles.brandFooter}>
              <ShieldCheck size={17} />

              <span>
                Inscription protégée et
                confidentielle
              </span>
            </div>
          </div>
        </aside>

        <div className={styles.formPanel}>
          <header className={styles.mobileHeader}>
            <Link
              href="/"
              className={styles.mobileLogoLink}
            >
              <Image
                src="/images/logo1.png"
                alt="Glory Solutions"
                width={155}
                height={62}
                priority
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

            <header className={styles.formHeader}>
              <span className={styles.secureBadge}>
                <ShieldCheck size={15} />
                Inscription sécurisée
              </span>

              <h2>Créer un compte</h2>

              <p>
                Votre compte sera activé après la
                vérification de votre courriel et
                l’approbation de Glory Solutions.
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
                  className={
                    styles.successMessage
                  }
                  role="status"
                >
                  <CheckCircle2 size={19} />
                  <p>{successMessage}</p>
                </div>
              )}

              <div className={styles.fieldsGrid}>
                <div className={styles.field}>
                  <label htmlFor="firstName">
                    Prénom
                  </label>

                  <div
                    className={
                      styles.inputWrapper
                    }
                  >
                    <User
                      size={18}
                      className={
                        styles.inputIcon
                      }
                    />

                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={
                        formData.firstName
                      }
                      onChange={handleChange}
                      placeholder="Votre prénom"
                      autoComplete="given-name"
                      disabled={isSubmitting}
                      maxLength={80}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="lastName">
                    Nom
                  </label>

                  <div
                    className={
                      styles.inputWrapper
                    }
                  >
                    <User
                      size={18}
                      className={
                        styles.inputIcon
                      }
                    />

                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={
                        formData.lastName
                      }
                      onChange={handleChange}
                      placeholder="Votre nom"
                      autoComplete="family-name"
                      disabled={isSubmitting}
                      maxLength={80}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.fieldsGrid}>
                <div className={styles.field}>
                  <label htmlFor="companyName">
                    Entreprise
                    <span>Optionnel</span>
                  </label>

                  <div
                    className={
                      styles.inputWrapper
                    }
                  >
                    <Building2
                      size={18}
                      className={
                        styles.inputIcon
                      }
                    />

                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      value={
                        formData.companyName
                      }
                      onChange={handleChange}
                      placeholder="Nom de l’entreprise"
                      autoComplete="organization"
                      disabled={isSubmitting}
                      maxLength={150}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="phone">
                    Téléphone
                    <span>Optionnel</span>
                  </label>

                  <div
                    className={
                      styles.inputWrapper
                    }
                  >
                    <Phone
                      size={18}
                      className={
                        styles.inputIcon
                      }
                    />

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="438 000-0000"
                      autoComplete="tel"
                      disabled={isSubmitting}
                      maxLength={20}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="email">
                  Adresse courriel
                </label>

                <div
                  className={
                    styles.inputWrapper
                  }
                >
                  <Mail
                    size={18}
                    className={
                      styles.inputIcon
                    }
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="nom@entreprise.com"
                    autoComplete="email"
                    disabled={isSubmitting}
                    maxLength={190}
                  />
                </div>
              </div>

              <div className={styles.fieldsGrid}>
                <div className={styles.field}>
                  <label htmlFor="password">
                    Mot de passe
                  </label>

                  <div
                    className={
                      styles.inputWrapper
                    }
                  >
                    <Lock
                      size={18}
                      className={
                        styles.inputIcon
                      }
                    />

                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        formData.password
                      }
                      onChange={handleChange}
                      placeholder="Mot de passe"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      maxLength={128}
                    />

                    <button
                      type="button"
                      className={
                        styles.passwordButton
                      }
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
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="confirmPassword">
                    Confirmation
                  </label>

                  <div
                    className={
                      styles.inputWrapper
                    }
                  >
                    <Lock
                      size={18}
                      className={
                        styles.inputIcon
                      }
                    />

                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        formData.confirmPassword
                      }
                      onChange={handleChange}
                      placeholder="Confirmez le mot de passe"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      maxLength={128}
                    />

                    <button
                      type="button"
                      className={
                        styles.passwordButton
                      }
                      onClick={() =>
                        setShowConfirmPassword(
                          (previousValue) =>
                            !previousValue
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Masquer la confirmation"
                          : "Afficher la confirmation"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div
                className={
                  styles.passwordRequirements
                }
              >
                <p>
                  Votre mot de passe doit contenir :
                </p>

                <div
                  className={
                    styles.requirementsGrid
                  }
                >
                  <PasswordRequirement
                    valid={
                      passwordRules.minimumLength
                    }
                    text="8 caractères"
                  />

                  <PasswordRequirement
                    valid={
                      passwordRules.uppercase
                    }
                    text="Une majuscule"
                  />

                  <PasswordRequirement
                    valid={
                      passwordRules.lowercase
                    }
                    text="Une minuscule"
                  />

                  <PasswordRequirement
                    valid={
                      passwordRules.number
                    }
                    text="Un chiffre"
                  />

                  <PasswordRequirement
                    valid={
                      passwordRules.specialCharacter
                    }
                    text="Un caractère spécial"
                  />
                </div>
              </div>

              <label className={styles.terms}>
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={
                    formData.acceptTerms
                  }
                  onChange={handleChange}
                  disabled={isSubmitting}
                />

                <span
                  className={styles.checkbox}
                >
                  <Check size={13} />
                </span>

                <span>
                  J’accepte les{" "}
                  <Link href="/terms">
                    conditions d’utilisation
                  </Link>{" "}
                  et la{" "}
                  <Link href="/privacy">
                    politique de confidentialité
                  </Link>
                  .
                </span>
              </label>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      size={20}
                      className={styles.loader}
                    />

                    <span>
                      Création du compte...
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      Envoyer ma demande
                    </span>

                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className={styles.loginNotice}>
              <span>
                Vous avez déjà un compte?
              </span>

              <Link href="/login">
                Se connecter
              </Link>
            </div>

            <div className={styles.securityNotice}>
              <ShieldCheck size={17} />

              <p>
                Vos informations sont protégées.
                Glory Solutions ne vous demandera
                jamais votre mot de passe par
                courriel.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

type PasswordRequirementProps = {
  valid: boolean;
  text: string;
};

function PasswordRequirement({
  valid,
  text,
}: PasswordRequirementProps) {
  return (
    <span
      className={`${styles.requirement} ${
        valid ? styles.requirementValid : ""
      }`}
    >
      <span>
        <Check size={11} />
      </span>

      {text}
    </span>
  );
}
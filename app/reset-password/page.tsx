"use client";

import {
  FormEvent,
  Suspense,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import Image from "next/image";

import styles from "./reset-password.module.css";

/* =========================================================
   API
========================================================= */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://172.20.10.6:5000";

/* =========================================================
   FORM
========================================================= */

function ResetPasswordForm() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const token =
    searchParams.get("token") || "";

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  /* =======================================================
     RULES
  ======================================================= */

  const passwordRules =
    useMemo(
      () => [
        {
          label:
            "Au moins 8 caractères",
          valid:
            password.length >= 8,
        },

        {
          label:
            "Une lettre majuscule",
          valid:
            /[A-Z]/.test(password),
        },

        {
          label:
            "Une lettre minuscule",
          valid:
            /[a-z]/.test(password),
        },

        {
          label:
            "Au moins un chiffre",
          valid:
            /[0-9]/.test(password),
        },

        {
          label:
            "Un caractère spécial",
          valid:
            /[^A-Za-z0-9]/.test(
              password
            ),
        },
      ],
      [password]
    );

  /* =======================================================
     VALIDATION
  ======================================================= */

  function validatePassword() {
    if (!token) {
      return "Le lien de réinitialisation est invalide ou incomplet.";
    }

    if (
      !password ||
      !confirmPassword
    ) {
      return "Veuillez remplir les deux champs.";
    }

    if (
      password.length < 8
    ) {
      return "Le mot de passe doit contenir au moins 8 caractères.";
    }

    if (
      !/[A-Z]/.test(password)
    ) {
      return "Le mot de passe doit contenir une majuscule.";
    }

    if (
      !/[a-z]/.test(password)
    ) {
      return "Le mot de passe doit contenir une minuscule.";
    }

    if (
      !/[0-9]/.test(password)
    ) {
      return "Le mot de passe doit contenir un chiffre.";
    }

    if (
      !/[^A-Za-z0-9]/.test(
        password
      )
    ) {
      return "Le mot de passe doit contenir un caractère spécial.";
    }

    if (
      password !==
      confirmPassword
    ) {
      return "Les mots de passe ne correspondent pas.";
    }

    return "";
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validatePassword();

    if (
      validationError
    ) {
      setError(
        validationError
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_URL}/api/auth/reset-password`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                token,
                password,
              }),
          }
        );

      let data: {
        success?: boolean;
        message?: string;
      } = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok
      ) {
        throw new Error(
          data.message ||
            "Impossible de modifier le mot de passe."
        );
      }

      setSuccess(
        data.message ||
          "Votre mot de passe a été modifié avec succès."
      );

      setPassword("");
      setConfirmPassword("");

      window.setTimeout(
        () => {
          router.replace(
            "/login?reset=success"
          );
        },
        2200
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className={styles.page}>
      <section
        className={styles.authCard}
      >
        {/* =================================================
            LEFT
        ================================================= */}

        <aside
          className={styles.brandPanel}
        >
          <div
            className={
              styles.brandTop
            }
          >
            <Image
              src="/images/logo1.png"
              alt="Glory Solutions"
              width={62}
              height={62}
              className={
                styles.logo
              }
              priority
            />
          </div>

          <div
            className={
              styles.brandContent
            }
          >
            <div
              className={
                styles.securityLabel
              }
            >
              <span />

              Sécurité du compte
            </div>

            <h2>
              Créez un nouveau
              <strong>
                mot de passe sécurisé.
              </strong>
            </h2>

            <p>
              Votre nouveau mot de passe
              doit être unique et différent
              de ceux que vous utilisez
              ailleurs.
            </p>

            <div
              className={
                styles.securityCard
              }
            >
              <div
                className={
                  styles.securityIcon
                }
              >
                <ShieldCheck
                  size={21}
                  strokeWidth={2}
                />
              </div>

              <div>
                <strong>
                  Protection de votre compte
                </strong>

                <span>
                  Glory Solutions protège
                  vos informations et ne
                  vous demandera jamais
                  votre mot de passe par
                  courriel.
                </span>
              </div>
            </div>
          </div>

          <div
            className={
              styles.brandFooter
            }
          >
            <span>
              Fiabilité
            </span>

            <i />

            <span>
              Confidentialité
            </span>

            <i />

            <span>
              Sécurité
            </span>
          </div>
        </aside>

        {/* =================================================
            RIGHT
        ================================================= */}

        <div
          className={styles.formPanel}
        >
          <button
            type="button"
            className={
              styles.backLink
            }
            onClick={() =>
              router.push(
                "/login"
              )
            }
          >
            <ArrowLeft
              size={16}
            />

            Retour à la connexion
          </button>

          <div
            className={
              styles.formHeader
            }
          >
            <div
              className={
                styles.lockIcon
              }
            >
              <LockKeyhole
                size={28}
                strokeWidth={1.8}
              />
            </div>

            <div
              className={styles.badge}
            >
              <ShieldCheck
                size={14}
              />

              Lien sécurisé
            </div>

            <h1>
              Nouveau mot de passe
            </h1>

            <p>
              Choisissez un mot de passe
              fort pour sécuriser votre
              compte Glory Solutions.
            </p>
          </div>

          {/* TOKEN INVALID */}

          {!token && (
            <div
              className={
                styles.error
              }
              role="alert"
            >
              Le lien de réinitialisation
              est invalide ou incomplet.
              Veuillez demander un nouveau
              lien.
            </div>
          )}

          {/* FORM */}

          <form
            className={styles.form}
            onSubmit={
              handleSubmit
            }
          >
            {/* PASSWORD */}

            <label
              className={
                styles.field
              }
            >
              <span>
                Nouveau mot de passe
              </span>

              <div
                className={
                  styles.inputWrapper
                }
              >
                <LockKeyhole
                  size={18}
                  className={
                    styles.inputIcon
                  }
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  placeholder="Entrez votre nouveau mot de passe"
                  autoComplete="new-password"
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    loading
                  }
                />

                <button
                  type="button"
                  className={
                    styles.showPassword
                  }
                  onClick={() =>
                    setShowPassword(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}
                </button>
              </div>
            </label>

            {/* CONFIRM */}

            <label
              className={
                styles.field
              }
            >
              <span>
                Confirmer le mot de passe
              </span>

              <div
                className={
                  styles.inputWrapper
                }
              >
                <LockKeyhole
                  size={18}
                  className={
                    styles.inputIcon
                  }
                />

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    confirmPassword
                  }
                  placeholder="Confirmez votre nouveau mot de passe"
                  autoComplete="new-password"
                  onChange={(
                    event
                  ) =>
                    setConfirmPassword(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    loading
                  }
                />

                <button
                  type="button"
                  className={
                    styles.showPassword
                  }
                  onClick={() =>
                    setShowConfirmPassword(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}
                </button>
              </div>
            </label>

            {/* RULES */}

            <div
              className={
                styles.rulesBox
              }
            >
              <strong>
                Votre mot de passe doit contenir
              </strong>

              <div
                className={
                  styles.rulesGrid
                }
              >
                {passwordRules.map(
                  (rule) => (
                    <div
                      key={
                        rule.label
                      }
                      className={`${styles.rule} ${
                        rule.valid
                          ? styles.ruleValid
                          : ""
                      }`}
                    >
                      <span
                        className={
                          styles.ruleIcon
                        }
                      >
                        <Check
                          size={12}
                          strokeWidth={3}
                        />
                      </span>

                      {rule.label}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* MATCH */}

            {confirmPassword && (
              <div
                className={
                  password ===
                  confirmPassword
                    ? styles.matchSuccess
                    : styles.matchError
                }
              >
                {password ===
                confirmPassword
                  ? "Les mots de passe correspondent."
                  : "Les mots de passe ne correspondent pas."}
              </div>
            )}

            {/* ERROR */}

            {error && (
              <div
                className={
                  styles.error
                }
                role="alert"
              >
                {error}
              </div>
            )}

            {/* SUCCESS */}

            {success && (
              <div
                className={
                  styles.success
                }
                role="status"
              >
                <Check
                  size={18}
                />

                {success}
              </div>
            )}

            {/* BUTTON */}

            <button
              type="submit"
              className={
                styles.submitButton
              }
              disabled={
                loading ||
                !token
              }
            >
              {loading
                ? "Modification en cours..."
                : "Modifier le mot de passe"}
            </button>
          </form>

          <div
            className={
              styles.formFooter
            }
          >
            <span>
              © 2026 Glory Solutions
            </span>

            <button
              onClick={() =>
                router.push(
                  "/forgot-password"
                )
              }
            >
              Demander un nouveau lien
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   LOADER
========================================================= */

function ResetPasswordLoading() {
  return (
    <main className={styles.page}>
      <div
        className={
          styles.loadingCard
        }
      >
        <div
          className={
            styles.loader
          }
        />

        <strong>
          Vérification du lien
        </strong>

        <span>
          Veuillez patienter...
        </span>
      </div>
    </main>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <ResetPasswordLoading />
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
"use client";

import {
  FormEvent,
  Suspense,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import styles from "./reset-password.module.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://192.168.2.22:5000";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token =
    searchParams.get("token") || "";

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const validatePassword = () => {
    if (!token) {
      return "Le lien de réinitialisation est invalide.";
    }

    if (!password || !confirmPassword) {
      return "Veuillez remplir tous les champs.";
    }

    if (password.length < 8) {
      return "Le mot de passe doit contenir au moins 8 caractères.";
    }

    if (!/[A-Z]/.test(password)) {
      return "Le mot de passe doit contenir une majuscule.";
    }

    if (!/[a-z]/.test(password)) {
      return "Le mot de passe doit contenir une minuscule.";
    }

    if (!/[0-9]/.test(password)) {
      return "Le mot de passe doit contenir un chiffre.";
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return "Le mot de passe doit contenir un caractère spécial.";
    }

    if (password !== confirmPassword) {
      return "Les mots de passe ne correspondent pas.";
    }

    return "";
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validatePassword();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
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
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
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

      window.setTimeout(() => {
        router.replace("/login");
      }, 2200);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <h1>Nouveau mot de passe</h1>

        <p>
          Choisissez un nouveau mot de passe
          sécurisé pour votre compte Glory
          Solutions.
        </p>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
          noValidate
        >
          <input
            className={styles.input}
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="new-password"
            disabled={loading}
          />

          <input
            className={styles.input}
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value
              )
            }
            autoComplete="new-password"
            disabled={loading}
          />

          {error && (
            <div
              className={styles.error}
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className={styles.success}
              role="status"
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || !token}
          >
            {loading
              ? "Modification en cours..."
              : "Modifier le mot de passe"}
          </button>
        </form>
      </section>
    </main>
  );
}

function ResetPasswordLoading() {
  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <h1>Chargement...</h1>

        <p>
          Vérification du lien de
          réinitialisation.
        </p>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<ResetPasswordLoading />}
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
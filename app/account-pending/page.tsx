"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AccountPendingPage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const pendingEmail = window.sessionStorage.getItem(
      "glory_pending_email"
    );

    if (pendingEmail) {
      setEmail(pendingEmail);
    }
  }, []);

  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(circle at top left, rgba(220,20,60,0.12), transparent 30%), #f5f6f8",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(560px, 100%)",
          padding: "40px",
          border: "1px solid #e6e7eb",
          borderRadius: "24px",
          background: "#ffffff",
          boxShadow: "0 24px 70px rgba(16,17,22,0.12)",
          textAlign: "center",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            marginBottom: "28px",
          }}
        >
          <Image
            src="/images/logo1.png"
            alt="Glory Solutions"
            width={120}
            height={55}
            priority
            style={{
              width: "auto",
              height: "auto",
              maxWidth: "120px",
            }}
          />
        </Link>

        <div
          style={{
            width: "72px",
            height: "72px",
            margin: "0 auto 22px",
            display: "grid",
            placeItems: "center",
            borderRadius: "22px",
            background: "rgba(220,20,60,0.09)",
            color: "#dc143c",
          }}
        >
          <Clock3 size={34} />
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            marginBottom: "18px",
            padding: "7px 12px",
            border: "1px solid rgba(220,20,60,0.18)",
            borderRadius: "999px",
            background: "rgba(220,20,60,0.06)",
            color: "#dc143c",
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          <ShieldCheck size={15} />
          Demande reçue
        </span>

        <h1
          style={{
            margin: 0,
            color: "#111216",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            lineHeight: 1.1,
          }}
        >
          Votre compte est en attente
        </h1>

        <p
          style={{
            maxWidth: "450px",
            margin: "18px auto 0",
            color: "#6d6f79",
            fontSize: "15px",
            lineHeight: 1.7,
          }}
        >
          Votre demande d’inscription a bien été enregistrée.
          Glory Solutions doit maintenant vérifier et approuver
          votre compte avant votre première connexion.
        </p>

        {email && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "24px",
              padding: "15px",
              border: "1px solid #e7e8ed",
              borderRadius: "14px",
              background: "#fafafd",
              color: "#404149",
              fontSize: "14px",
              overflowWrap: "anywhere",
            }}
          >
            <MailCheck size={18} color="#dc143c" />
            <span>{email}</span>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gap: "12px",
            marginTop: "28px",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              padding: "14px",
              borderRadius: "14px",
              background: "#fafafd",
            }}
          >
            <CheckCircle2
              size={20}
              color="#dc143c"
              style={{ flexShrink: 0 }}
            />

            <div>
              <strong
                style={{
                  display: "block",
                  marginBottom: "4px",
                  color: "#17181d",
                  fontSize: "14px",
                }}
              >
                Demande enregistrée
              </strong>

              <span
                style={{
                  color: "#777983",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                Vos informations ont été enregistrées avec succès.
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              padding: "14px",
              borderRadius: "14px",
              background: "#fafafd",
            }}
          >
            <Clock3
              size={20}
              color="#dc143c"
              style={{ flexShrink: 0 }}
            />

            <div>
              <strong
                style={{
                  display: "block",
                  marginBottom: "4px",
                  color: "#17181d",
                  fontSize: "14px",
                }}
              >
                Approbation en attente
              </strong>

              <span
                style={{
                  color: "#777983",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                Un administrateur Glory Solutions doit activer
                votre compte.
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/login"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "9px",
            width: "100%",
            minHeight: "54px",
            marginTop: "28px",
            borderRadius: "14px",
            background:
              "linear-gradient(120deg, #a90e2d, #dc143c)",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 14px 28px rgba(220,20,60,0.22)",
          }}
        >
          Retour à la connexion
          <ArrowRight size={19} />
        </Link>
      </section>
    </main>
  );
}

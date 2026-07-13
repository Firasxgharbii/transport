import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  BadgeDollarSign,
  Car,
  Check,
  CheckCircle2,
  Clock3,
  Headphones,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import styles from "./transport-automobile.module.css";

const automobileServices = [
  "Transport de voitures",
  "VUS et camionnettes",
  "Véhicules de luxe",
  "Véhicules électriques",
  "Véhicules achetés aux encans",
  "Transfert entre concessionnaires",
  "Livraison directement chez le client",
  "Transport pour garages et ateliers mécaniques",
  "Transport pour compagnies d’assurance",
  "Véhicules accidentés ou non roulants",
];

const advantages = [
  {
    title: "Sécurité avant tout",
    description:
      "Chaque véhicule est solidement arrimé avec un équipement professionnel afin d’assurer un transport sans risque.",
    icon: ShieldCheck,
  },
  {
    title: "Service rapide",
    description:
      "Nous planifions chaque transport afin de respecter les délais convenus et d’assurer une livraison efficace.",
    icon: Clock3,
  },
  {
    title: "Tarification transparente",
    description:
      "Vous recevez une soumission claire et compétitive avant le transport, sans frais cachés.",
    icon: BadgeDollarSign,
  },
  {
    title: "Transport assuré",
    description:
      "Nos transports sont couverts par une assurance responsabilité pour une tranquillité d’esprit complète.",
    icon: CheckCircle2,
  },
  {
    title: "Communication",
    description:
      "Vous êtes informé de l’évolution du transport jusqu’à la livraison de votre véhicule.",
    icon: Headphones,
  },
  {
    title: "Service personnalisé",
    description:
      "Nous adaptons notre service à vos besoins, qu’il s’agisse d’un seul véhicule ou d’une flotte complète.",
    icon: Users,
  },
];

export default function AutomobileTransportPage() {
  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroOverlay} />

          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>
              Glory Solutions
            </p>

            <h1>
              Transport automobile
              <span>partout au Québec</span>
            </h1>

            <p className={styles.heroIntroduction}>
              Votre partenaire de confiance pour le transport sécuritaire de
              voitures, de VUS, de camionnettes et de véhicules spécialisés.
            </p>

            <div className={styles.heroActions}>
              <Link
                href="/quote"
                className={styles.primaryButton}
              >
                Demander une soumission

                <ArrowRight
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </Link>

              <Link
                href="/contact"
                className={styles.secondaryButton}
              >
                Nous contacter
              </Link>
            </div>

            <div className={styles.heroHighlights}>
              <span>
                <Check size={18} aria-hidden="true" />
                Service assuré
              </span>

              <span>
                <Check size={18} aria-hidden="true" />
                Livraison sécuritaire
              </span>

              <span>
                <Check size={18} aria-hidden="true" />
                Prix compétitifs
              </span>
            </div>
          </div>
        </section>

        {/* AVANTAGES */}
        <section className={styles.advantagesSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionLabel}>
              Pourquoi nous choisir ?
            </p>

            <h2>
              Le transport automobile
              <span>en toute confiance</span>
            </h2>

            <p className={styles.sectionDescription}>
              Une équipe professionnelle, une communication claire et une
              solution adaptée à chaque véhicule.
            </p>
          </div>

          <div className={styles.advantagesGrid}>
            {advantages.map((advantage, index) => {
              const Icon = advantage.icon;

              return (
                <article
                  key={advantage.title}
                  className={styles.advantageCard}
                >
                  <span className={styles.advantageNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className={styles.advantageIcon}>
                    <Icon
                      size={31}
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </span>

                  <h3>{advantage.title}</h3>

                  <p>{advantage.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* INTRODUCTION */}
        <section className={styles.introductionSection}>
          <div className={styles.introductionGrid}>
            <div className={styles.introductionContent}>
              <p className={styles.sectionLabel}>
                Une solution professionnelle
              </p>

              <h2>
                Votre véhicule
                <span>transporté avec soin</span>
              </h2>

              <p className={styles.introductionLead}>
                Glory Solutions offre un service fiable de transport de
                véhicules pour les particuliers, les concessionnaires, les
                encans, les compagnies d’assurance et les entreprises.
              </p>

              <p>
                Que votre véhicule soit neuf, usagé, en panne ou non
                immatriculé, notre équipe s’assure qu’il soit transporté
                rapidement, en toute sécurité et dans les meilleurs délais.
              </p>

              <p>
                Nous prenons en charge différents types de véhicules en offrant
                un service ponctuel, professionnel et assuré partout au Québec.
                Votre véhicule est traité avec le même soin que s’il était le
                nôtre.
              </p>

              <div className={styles.introductionPoints}>
                <div>
                  <CheckCircle2 size={21} aria-hidden="true" />
                  <span>Transport professionnel et assuré</span>
                </div>

                <div>
                  <CheckCircle2 size={21} aria-hidden="true" />
                  <span>Équipement adapté à votre véhicule</span>
                </div>

                <div>
                  <CheckCircle2 size={21} aria-hidden="true" />
                  <span>Service partout au Québec</span>
                </div>
              </div>
            </div>

            <div className={styles.introductionVisual}>
              <Image
                src="/images/transport-auto-remorque.jpeg"
                alt="Camionnette Glory Solutions avec une remorque de transport"
                fill
                priority
                sizes="(max-width: 1000px) 100vw, 50vw"
                className={styles.introductionImage}
              />

              <div className={styles.imageFrame} />

              <div className={styles.imageBadge}>
                <Truck
                  size={27}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />

                <span>
                  Transport professionnel
                  <strong>Partout au Québec</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section className={styles.servicesSection}>
          <div className={styles.servicesHeader}>
            <div>
              <p className={styles.sectionLabel}>
                Nos services
              </p>

              <h2>
                Nous transportons
                <span>tous types de véhicules</span>
              </h2>
            </div>

            <p className={styles.servicesIntro}>
              Une solution professionnelle adaptée aux particuliers,
              concessionnaires, entreprises, garages, assureurs et gestionnaires
              de flotte.
            </p>
          </div>

          <div className={styles.servicesGrid}>
            {automobileServices.map((service, index) => (
              <article
                key={service}
                className={styles.serviceCircle}
              >
                <span className={styles.serviceNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className={styles.serviceIcon}>
                  <Car
                    size={30}
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </span>

                <h3>{service}</h3>

                <span className={styles.serviceArrow}>
                  <ArrowRight
                    size={20}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>
              </article>
            ))}
          </div>

          <div className={styles.servicesAction}>
            <Link
              href="/quote"
              className={styles.servicesButton}
            >
              Demander une soumission

              <ArrowRight
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./about.module.css";

const services = [
  "Transport de marchandises",
  "Entreposage",
  "Déchargement de conteneurs",
  "Préparation de commandes",
];

const statistics = [
  {
    value: "24/7",
    label: "Disponibilité",
  },
  {
    value: "100%",
    label: "Engagement",
  },
  {
    value: "4",
    label: "Services principaux",
  },
];

const values = [
  {
    title: "Fiabilité",
    description:
      "Nous assurons un suivi rigoureux de chaque opération afin de garantir un service fiable et sécuritaire.",
    icon: ShieldCheck,
  },
  {
    title: "Ponctualité",
    description:
      "Nous organisons nos opérations avec précision afin de respecter les délais convenus avec nos clients.",
    icon: Clock3,
  },
  {
    title: "Partenariat",
    description:
      "Nous travaillons avec chaque client afin de proposer une solution adaptée à ses besoins.",
    icon: Users,
  },
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        {/* HERO */}
        <section id="top" className={styles.hero}>
          <div className={styles.heroContainer}>
            <div className={styles.heroContent}>
              <div className={styles.heroLabelRow}>
                <span className={styles.heroLabelLine} />

                <p className={styles.eyebrow}>
                  Découvrez Glory Solutions
                </p>
              </div>

              <h1 className={styles.heroTitle}>
                Le transport
                <span>qui fait avancer</span>
                votre entreprise
              </h1>

              <p className={styles.heroLead}>
                Une expertise fiable en transport, entreposage et logistique
                pour accompagner la croissance de votre entreprise.
              </p>

              <p className={styles.heroText}>
                Glory Solutions prend en charge vos marchandises avec rigueur,
                ponctualité et professionnalisme, de la collecte jusqu’à la
                livraison.
              </p>

              <div className={styles.serviceList}>
                {services.map((service) => (
                  <div key={service} className={styles.serviceItem}>
                    <CheckCircle2
                      size={19}
                      strokeWidth={2}
                      aria-hidden="true"
                    />

                    <span>{service}</span>
                  </div>
                ))}
              </div>

              <div className={styles.heroActions}>
                <Link
                  href="/#services"
                  className={styles.primaryButton}
                >
                  Découvrir nos services

                  <ArrowRight size={18} aria-hidden="true" />
                </Link>

                <Link
                  href="/contact"
                  className={styles.secondaryButton}
                >
                  Parler à notre équipe
                </Link>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.heroDecorText}>
                Glory
              </div>

              <div className={styles.heroImageFrame}>
                <div className={styles.heroPhoto} />
                <div className={styles.heroPhotoOverlay} />
              </div>

              <div className={styles.heroExperienceCard}>
                <strong>24/7</strong>

                <span>
                  Service fiable
                  <small>et professionnel</small>
                </span>
              </div>

              <div className={styles.heroMiniCard}>
                <Truck
                  size={25}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />

                <span>
                  Livraison
                  <strong>dernier kilomètre</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* NOTRE ENTREPRISE */}
        <section className={styles.storySection}>
          <div className={styles.storyContainer}>
            <div className={styles.storyVisual}>
              <div className={styles.storyImage} />

              <div className={styles.storyBadge}>
                <Truck
                  size={29}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />

                <div>
                  <strong>Transport fiable</strong>
                  <span>Service professionnel</span>
                </div>
              </div>
            </div>

            <div className={styles.storyContent}>
              <p className={styles.sectionLabel}>
                Notre entreprise
              </p>

              <h2 className={styles.sectionTitle}>
                Une équipe engagée envers votre réussite
              </h2>

              <p>
                Chaque livraison représente un engagement important envers vos
                propres clients. Notre équipe accorde donc une grande importance
                à l’organisation, à la communication et au respect des délais.
              </p>

              <p>
                De la prise en charge des marchandises jusqu’à leur destination,
                Glory Solutions offre un accompagnement structuré et adapté aux
                réalités de chaque entreprise.
              </p>

              <div className={styles.storyDetails}>
                <article className={styles.storyDetail}>
                  <Warehouse
                    size={30}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />

                  <div>
                    <strong>Gestion logistique</strong>
                    <span>
                      Entreposage et préparation de commandes
                    </span>
                  </div>
                </article>

                <article className={styles.storyDetail}>
                  <Truck
                    size={30}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />

                  <div>
                    <strong>Transport professionnel</strong>
                    <span>
                      Solutions adaptées à vos opérations
                    </span>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* STATISTIQUES */}
        <section className={styles.statsSection}>
          <div className={styles.statsContainer}>
            {statistics.map((statistic) => (
              <article
                key={statistic.label}
                className={styles.statCard}
              >
                <strong>{statistic.value}</strong>
                <span>{statistic.label}</span>
              </article>
            ))}
          </div>
        </section>

        {/* VALEURS */}
        <section className={styles.valuesSection}>
          <div className={styles.valuesContainer}>
            <div className={styles.valuesHeading}>
              <p className={styles.sectionLabel}>
                Ce qui nous distingue
              </p>

              <h2 className={styles.sectionTitle}>
                Nos valeurs
              </h2>
            </div>

            <div className={styles.valuesGrid}>
              {values.map((value) => {
                const Icon = value.icon;

                return (
                  <article
                    key={value.title}
                    className={styles.valueCard}
                  >
                    <div className={styles.valueIcon}>
                      <Icon
                        size={32}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </div>

                    <h3>{value.title}</h3>
                    <p>{value.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaContent}>
            <p className={styles.ctaLabel}>
              Travaillons ensemble
            </p>

            <h2>
              Une solution adaptée à vos besoins de transport
            </h2>

            <p>
              Communiquez avec notre équipe afin de discuter de vos besoins et
              d’obtenir une solution personnalisée.
            </p>

            <Link
              href="/contact"
              className={styles.ctaButton}
            >
              Parler à notre équipe

              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
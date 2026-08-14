import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  PackageCheck,
  ShieldCheck,
  Snowflake,
  Thermometer,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import styles from "./temperature-controlee.module.css";

type TemperatureService = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type Advantage = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const temperatureServices: TemperatureService[] = [
  {
    title: "Produits alimentaires",
    description:
      "Transport de produits alimentaires nécessitant une température stable et contrôlée.",
    icon: PackageCheck,
  },
  {
    title: "Produits réfrigérés",
    description:
      "Solutions adaptées aux marchandises devant être conservées au frais pendant le transport.",
    icon: Snowflake,
  },
  {
    title: "Produits surgelés",
    description:
      "Transport de produits surgelés avec maintien rigoureux de la chaîne du froid.",
    icon: Thermometer,
  },
  {
    title: "Produits sensibles",
    description:
      "Prise en charge de marchandises sensibles aux variations de température.",
    icon: ShieldCheck,
  },
  {
    title: "Livraison commerciale",
    description:
      "Service adapté aux commerces, restaurants, distributeurs et entreprises.",
    icon: Truck,
  },
  {
    title: "Entreposage temporaire",
    description:
      "Coordination avec des solutions d'entreposage adaptées aux produits thermosensibles.",
    icon: Warehouse,
  },
];

const advantages: Advantage[] = [
  {
    title: "Température surveillée",
    description:
      "Nous veillons au maintien des conditions nécessaires pendant toute la durée du transport.",
    icon: Thermometer,
  },
  {
    title: "Chaîne du froid",
    description:
      "Une gestion rigoureuse afin de réduire les écarts de température et protéger la marchandise.",
    icon: Snowflake,
  },
  {
    title: "Livraison fiable",
    description:
      "Chaque transport est organisé avec précision afin de respecter les délais prévus.",
    icon: Clock3,
  },
  {
    title: "Transport sécuritaire",
    description:
      "Votre marchandise est manipulée avec soin et transportée dans des conditions adaptées.",
    icon: ShieldCheck,
  },
];

const heroHighlights = [
  "Transport réfrigéré",
  "Chaîne du froid",
  "Service professionnel",
];

const controlPoints = [
  "Température adaptée à la marchandise",
  "Transport réfrigéré et spécialisé",
  "Suivi rigoureux du chargement à la livraison",
  "Service partout au Québec",
];

export default function TemperatureControlledPage() {
  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroOverlay} aria-hidden="true" />

          <div className={styles.heroInner}>
            <div className={styles.heroContent}>
              <p className={styles.eyebrow}>Glory Solutions</p>

              <h1>
                Température
                <span>contrôlée</span>
              </h1>

              <p className={styles.heroDescription}>
                Une solution professionnelle pour le transport de marchandises
                réfrigérées, surgelées et sensibles à la température partout au
                Québec.
              </p>

              <div className={styles.heroActions}>
                <Link href="/quote" className={styles.primaryButton}>
                  Demander une soumission
                  <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
                </Link>

                <Link href="/contact" className={styles.secondaryButton}>
                  Nous contacter
                </Link>
              </div>

              <div className={styles.heroHighlights}>
                {heroHighlights.map((highlight) => (
                  <span key={highlight}>
                    <Check size={17} strokeWidth={2.2} aria-hidden="true" />
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.advantagesSection}>
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <p className={styles.sectionLabel}>
                Une logistique maîtrisée
              </p>

              <h2>
                La bonne température
                <span>du départ à la livraison</span>
              </h2>

              <p className={styles.sectionDescription}>
                Nous mettons l'accent sur la fiabilité, la sécurité et le
                respect des conditions nécessaires pour vos marchandises
                thermosensibles.
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

                    <div className={styles.advantageIcon}>
                      <Icon size={27} strokeWidth={1.8} aria-hidden="true" />
                    </div>

                    <h3>{advantage.title}</h3>
                    <p>{advantage.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.introductionSection}>
          <div className={`${styles.container} ${styles.introductionGrid}`}>
            <div className={styles.introductionContent}>
              <p className={styles.sectionLabel}>
                Transport spécialisé
              </p>

              <h2>
                Vos marchandises
                <span>protégées avec soin</span>
              </h2>

              <p className={styles.introductionLead}>
                Glory Solutions offre des solutions de transport adaptées aux
                marchandises qui exigent des conditions de température
                particulières.
              </p>

              <p>
                Que vous transportiez des produits alimentaires, réfrigérés,
                surgelés ou d'autres marchandises sensibles, notre objectif est
                d'assurer un transport structuré, sécuritaire et efficace.
              </p>

              <p>
                Chaque livraison est planifiée en fonction de la nature de la
                marchandise, des délais requis et des conditions nécessaires
                pendant le transport.
              </p>

              <div className={styles.controlList}>
                {controlPoints.map((point) => (
                  <div key={point} className={styles.controlItem}>
                    <CheckCircle2
                      size={20}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.introductionVisual}>
              <Image
                src="/images/temperature-controlee.jpeg"
                alt="Transport à température contrôlée Glory Solutions"
                fill
                sizes="(max-width: 1000px) 100vw, 50vw"
                className={styles.introductionImage}
              />

              <div className={styles.imageOverlay} aria-hidden="true" />
              <div className={styles.imageFrame} aria-hidden="true" />

              <div className={styles.imageBadge}>
                <Thermometer
                  size={27}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />

                <span>
                  Transport spécialisé
                  <strong>Température contrôlée</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.servicesSection}>
          <div className={styles.container}>
            <div className={styles.servicesHeader}>
              <div className={styles.servicesHeading}>
                <p className={styles.sectionLabel}>
                  Nos solutions
                </p>

                <h2>
                  Une solution adaptée
                  <span>à vos marchandises</span>
                </h2>
              </div>

              <div className={styles.servicesIntroWrap}>
                <p>
                  Nous adaptons notre service selon le type de marchandise, les
                  conditions de conservation nécessaires et votre calendrier de
                  livraison.
                </p>

                <Link href="/quote" className={styles.textLink}>
                  Obtenir une soumission
                  <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className={styles.servicesGrid}>
              {temperatureServices.map((service, index) => {
                const Icon = service.icon;

                return (
                  <article key={service.title} className={styles.serviceCard}>
                    <div className={styles.serviceTop}>
                      <span className={styles.serviceNumber} aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className={styles.serviceIcon} aria-hidden="true">
                        <Icon size={27} strokeWidth={1.8} />
                      </div>
                    </div>

                    <div className={styles.serviceBody}>
                      <h3>{service.title}</h3>
                      <p>{service.description}</p>
                    </div>

                    <div className={styles.serviceFooter}>
                      <span>En savoir plus</span>

                      <span className={styles.serviceArrow} aria-hidden="true">
                        <ArrowRight size={18} strokeWidth={2} />
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className={styles.servicesAction}>
              <Link href="/quote" className={styles.servicesButton}>
                Demander une soumission
                <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
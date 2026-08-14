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
  type LucideIcon,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import styles from "./transport-automobile.module.css";

type Advantage = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type AutomobileService = {
  title: string;
  description: string;
};

const automobileServices: AutomobileService[] = [
  {
    title: "Transport de voitures",
    description:
      "Transport sécuritaire de véhicules personnels ou commerciaux partout au Québec.",
  },
  {
    title: "VUS et camionnettes",
    description:
      "Prise en charge adaptée aux véhicules plus volumineux, VUS et camionnettes.",
  },
  {
    title: "Véhicules de luxe",
    description:
      "Manipulation soignée et service adapté aux véhicules haut de gamme.",
  },
  {
    title: "Véhicules électriques",
    description:
      "Transport professionnel des véhicules électriques avec équipement approprié.",
  },
  {
    title: "Véhicules achetés aux encans",
    description:
      "Ramassage et livraison de véhicules provenant d'encans automobiles.",
  },
  {
    title: "Transfert entre concessionnaires",
    description:
      "Déplacement rapide de véhicules entre différents concessionnaires.",
  },
  {
    title: "Livraison chez le client",
    description:
      "Livraison directement à l'adresse résidentielle ou commerciale du client.",
  },
  {
    title: "Garages et ateliers mécaniques",
    description:
      "Transport de véhicules vers ou depuis garages, ateliers et centres de service.",
  },
  {
    title: "Compagnies d’assurance",
    description:
      "Solutions de transport adaptées aux dossiers d'assurance et de réclamation.",
  },
  {
    title: "Véhicules non roulants",
    description:
      "Prise en charge de véhicules accidentés, en panne ou non fonctionnels.",
  },
];

const advantages: Advantage[] = [
  {
    title: "Sécurité avant tout",
    description:
      "Chaque véhicule est arrimé avec un équipement professionnel afin d’assurer un transport fiable et sécuritaire.",
    icon: ShieldCheck,
  },
  {
    title: "Service rapide",
    description:
      "Chaque transport est planifié avec attention afin de respecter les délais convenus et d’assurer une livraison efficace.",
    icon: Clock3,
  },
  {
    title: "Tarification transparente",
    description:
      "Vous recevez une soumission claire avant le transport avec une tarification expliquée dès le départ.",
    icon: BadgeDollarSign,
  },
  {
    title: "Transport assuré",
    description:
      "Nos opérations sont couvertes afin de vous offrir davantage de tranquillité d’esprit pendant le déplacement.",
    icon: CheckCircle2,
  },
  {
    title: "Communication",
    description:
      "Notre équipe demeure disponible pour vous informer de l’évolution de votre transport jusqu’à la livraison.",
    icon: Headphones,
  },
  {
    title: "Service personnalisé",
    description:
      "Nous adaptons notre service selon vos besoins, qu’il s’agisse d’un véhicule individuel ou d’une flotte.",
    icon: Users,
  },
];

const heroHighlights = [
  "Service assuré",
  "Livraison sécuritaire",
  "Prix compétitifs",
];

const introductionPoints = [
  "Transport professionnel et assuré",
  "Équipement adapté à votre véhicule",
  "Service disponible partout au Québec",
];

export default function AutomobileTransportPage() {
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
                Transport automobile
                <span>partout au Québec</span>
              </h1>

              <p className={styles.heroIntroduction}>
                Une solution professionnelle pour le transport sécuritaire de
                voitures, VUS, camionnettes et véhicules spécialisés.
              </p>

              <div className={styles.heroActions}>
                <Link href="/quote" className={styles.primaryButton}>
                  Demander une soumission
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>

                <Link href="/contact" className={styles.secondaryButton}>
                  Nous contacter
                </Link>
              </div>

              <div className={styles.heroHighlights}>
                {heroHighlights.map((item) => (
                  <span key={item}>
                    <Check size={17} aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.advantagesSection}>
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <p className={styles.sectionLabel}>Pourquoi nous choisir ?</p>

              <h2>
                Le transport automobile
                <span>en toute confiance</span>
              </h2>

             
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
                Une solution professionnelle
              </p>

              <h2>
                Votre véhicule
                <span>transporté avec soin</span>
              </h2>

              <p className={styles.introductionLead}>
                Glory Solutions offre un service de transport automobile
                destiné aux particuliers, concessionnaires, encans, garages,
                compagnies d’assurance et entreprises.
              </p>

              <p>
                Que votre véhicule soit neuf, usagé, en panne, accidenté ou non
                immatriculé, notre équipe organise son transport avec soin afin
                de vous offrir une solution simple, efficace et sécuritaire.
              </p>

              <div className={styles.introductionPoints}>
                {introductionPoints.map((point) => (
                  <div key={point}>
                    <CheckCircle2 size={20} aria-hidden="true" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.introductionVisual}>
              <Image
                src="/images/transport-auto-remorque.jpeg"
                alt="Transport automobile Glory Solutions"
                fill
                sizes="(max-width: 1000px) 100vw, 50vw"
                className={styles.introductionImage}
              />

              <div className={styles.imageFrame} aria-hidden="true" />

              <div className={styles.imageBadge}>
                <Truck size={26} aria-hidden="true" />
                <span>
                  Transport professionnel
                  <strong>Partout au Québec</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.servicesSection}>
          <div className={styles.container}>
            <div className={styles.servicesHeader}>
              <div className={styles.servicesHeading}>
                <p className={styles.sectionLabel}>Nos services</p>

                <h2>
                  Nous transportons
                  <span>tous types de véhicules</span>
                </h2>
              </div>

              <div className={styles.servicesIntroWrap}>
                <p>
                  Nos solutions sont adaptées aux particuliers,
                  concessionnaires, garages, assureurs, entreprises et
                  gestionnaires de flotte.
                </p>

                <Link href="/quote" className={styles.textLink}>
                  Obtenir une soumission
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className={styles.servicesGrid}>
              {automobileServices.map((service, index) => (
                <article key={service.title} className={styles.serviceCard}>
                  <div className={styles.serviceTop}>
                    <span className={styles.serviceNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className={styles.serviceIcon}>
                      <Car size={27} strokeWidth={1.8} aria-hidden="true" />
                    </div>
                  </div>

                  <div className={styles.serviceBody}>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </div>

                  <div className={styles.serviceFooter}>
                    <span>En savoir plus</span>
                    <span className={styles.serviceArrow}>
                      <ArrowRight size={18} aria-hidden="true" />
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <div className={styles.servicesAction}>
              <Link href="/quote" className={styles.servicesButton}>
                Demander une soumission
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  Home,
  PackageCheck,
  Sofa,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import styles from "./demenagement.module.css";

type MovingService = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const movingServices: MovingService[] = [
  {
    title: "Déménagement résidentiel",
    description:
      "Un service complet pour votre appartement, votre condo ou votre maison, avec une prise en charge professionnelle.",
    icon: Home,
  },
  {
    title: "Déménagement commercial",
    description:
      "Une solution structurée pour les bureaux, commerces et locaux professionnels.",
    icon: Building2,
  },
  {
    title: "Transport de meubles",
    description:
      "Transport sécuritaire de meubles, objets lourds et biens volumineux.",
    icon: Sofa,
  },
  {
    title: "Transport d’électroménagers",
    description:
      "Manipulation soigneuse de vos électroménagers et équipements lourds.",
    icon: Boxes,
  },
  {
    title: "Livraison de mobilier",
    description:
      "Livraison directe de mobilier à votre domicile, commerce ou entreprise.",
    icon: PackageCheck,
  },
  {
    title: "Déménagement local",
    description:
      "Un service rapide et efficace pour vos déplacements dans votre région.",
    icon: Truck,
  },
  {
    title: "Longue distance",
    description:
      "Organisation complète de votre déménagement entre différentes régions du Québec.",
    icon: ArrowRight,
  },
  {
    title: "Particuliers et entreprises",
    description:
      "Des solutions flexibles et adaptées aux particuliers comme aux entreprises.",
    icon: Users,
  },
];

const commitments = [
  "Équipe professionnelle et courtoise",
  "Protection des meubles et objets fragiles",
  "Service résidentiel et commercial",
  "Déménagement local et longue distance",
];

const heroHighlights = [
  "Soumission gratuite",
  "Service professionnel",
  "Partout au Québec",
];

export default function MovingPage() {
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
                Déménagez
                <span>en toute confiance</span>
              </h1>

              <p className={styles.heroDescription}>
                Un service de déménagement professionnel, rapide et sécuritaire
                pour les particuliers et les entreprises partout au Québec.
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

        <section className={styles.introductionSection}>
          <div className={`${styles.container} ${styles.introductionGrid}`}>
            <div className={styles.introductionContent}>
              <p className={styles.sectionLabel}>Votre partenaire de confiance</p>

              <h2>
                Un déménagement
                <span>simple et sans stress</span>
              </h2>

              <p className={styles.introductionLead}>
                Chez Glory Solutions, nous mettons notre expertise au service
                des particuliers et des entreprises afin d’offrir un
                déménagement professionnel, efficace et sécuritaire.
              </p>

              <p>
                Qu’il s’agisse d’un appartement, d’une maison, d’un condo,
                d’un bureau ou d’un local commercial, notre équipe prend en
                charge votre déménagement avec rigueur et attention.
              </p>

              <p>
                Chaque déménagement est différent. Nous adaptons donc notre
                service à votre horaire, votre volume de biens, votre destination
                et vos besoins particuliers.
              </p>

              <div className={styles.commitmentList}>
                {commitments.map((commitment) => (
                  <div key={commitment} className={styles.commitmentItem}>
                    <CheckCircle2
                      size={20}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span>{commitment}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.introductionVisual}>
              <Image
                src="/images/demenagement-service.jpeg"
                alt="Service professionnel de déménagement Glory Solutions"
                fill
                sizes="(max-width: 1000px) 100vw, 50vw"
                className={styles.introductionImage}
              />

              <div className={styles.imageOverlay} aria-hidden="true" />
              <div className={styles.imageFrame} aria-hidden="true" />

              <div className={styles.imageBadge}>
                <Truck size={27} strokeWidth={1.8} aria-hidden="true" />

                <span>
                  Service professionnel
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
                  Des solutions adaptées
                  <span>à tous vos besoins</span>
                </h2>
              </div>

              <div className={styles.servicesIntroWrap}>
              
              </div>
            </div>

            <div className={styles.servicesGrid}>
              {movingServices.map((service, index) => {
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
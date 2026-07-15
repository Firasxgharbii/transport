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
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import styles from "./demenagement.module.css";

const movingServices = [
  {
    title: "Déménagement résidentiel",
    description:
      "Un service complet pour votre appartement, votre condo ou votre maison.",
    icon: Home,
  },
  {
    title: "Déménagement commercial",
    description:
      "Une prise en charge professionnelle pour les bureaux et les locaux commerciaux.",
    icon: Building2,
  },
  {
    title: "Transport de meubles",
    description:
      "Transport sécuritaire de vos meubles, objets lourds et biens volumineux.",
    icon: Sofa,
  },
  {
    title: "Transport d’électroménagers",
    description:
      "Manipulation soigneuse de vos appareils électroménagers et équipements.",
    icon: Boxes,
  },
  {
    title: "Livraison de mobilier",
    description:
      "Livraison de mobilier directement à votre domicile ou à votre entreprise.",
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
      "Organisation complète de votre déménagement partout au Québec.",
    icon: ArrowRight,
  },
  {
    title: "Particuliers et entreprises",
    description:
      "Des solutions personnalisées adaptées à tous les types de clients.",
    icon: Users,
  },
];

const commitments = [
  "Équipe professionnelle et courtoise",
  "Protection des meubles et objets fragiles",
  "Service résidentiel et commercial",
  "Déménagement local et longue distance",
];

export default function MovingPage() {
  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        {/* ========================================
            HERO
        ======================================== */}
        <section className={styles.hero}>
          <div className={styles.heroOverlay} />

          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>
              Glory Solutions
            </p>

            <h1>
              Déménagez
              <span>en toute confiance</span>
            </h1>

            <p className={styles.heroDescription}>
              Un service de déménagement professionnel, rapide et sécuritaire
              pour les particuliers et les entreprises partout au Québec.
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
                <Check
                  size={18}
                  aria-hidden="true"
                />

                Soumission gratuite
              </span>

              <span>
                <Check
                  size={18}
                  aria-hidden="true"
                />

                Service professionnel
              </span>

              <span>
                <Check
                  size={18}
                  aria-hidden="true"
                />

                Partout au Québec
              </span>
            </div>
          </div>
        </section>

        {/* ========================================
            INTRODUCTION
        ======================================== */}
        <section className={styles.introductionSection}>
          <div className={styles.introductionGrid}>
            <div className={styles.introductionContent}>
              <p className={styles.sectionLabel}>
                Votre partenaire de confiance
              </p>

              <h2>
                Un déménagement
                <span>simple et sans stress</span>
              </h2>

              <p className={styles.introductionLead}>
                Chez Glory Solutions, nous mettons notre expertise au service
                des particuliers et des entreprises afin d’offrir un service
                de déménagement professionnel, rapide et sécuritaire.
              </p>

              <p>
                Qu’il s’agisse d’un appartement, d’une maison, d’un condo,
                d’un bureau ou d’un local commercial, notre équipe prend en
                charge votre déménagement avec rigueur, efficacité et le plus
                grand soin.
              </p>

              <p>
                Nous comprenons que chaque déménagement est unique. C’est
                pourquoi nous proposons un service personnalisé, adapté à vos
                besoins, à votre horaire et à votre situation.
              </p>

              <div className={styles.commitmentList}>
                {commitments.map((commitment) => (
                  <div
                    key={commitment}
                    className={styles.commitmentItem}
                  >
                    <CheckCircle2
                      size={21}
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

              <div className={styles.imageOverlay} />

              <div className={styles.imageFrame} />

              <div className={styles.imageBadge}>
                <Truck
                  size={28}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />

                <span>
                  Service professionnel
                  <strong>Partout au Québec</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================
            SERVICES
        ======================================== */}
        <section className={styles.servicesSection}>
          <div className={styles.servicesContainer}>
            <div className={styles.servicesHeader}>
              <div>
                <p className={styles.sectionLabel}>
                  Nos services
                </p>

                <h2>
                  Des solutions adaptées
                  <span>à tous vos besoins</span>
                </h2>
              </div>

             
            </div>

            <div className={styles.servicesGrid}>
              {movingServices.map((service, index) => {
                const Icon = service.icon;

                return (
                  <article
                    key={service.title}
                    className={styles.serviceCard}
                  >
                    <span className={styles.serviceNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className={styles.serviceIcon}>
                      <Icon
                        size={30}
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                    </span>

                    <h3>{service.title}</h3>

                    <p>{service.description}</p>

                    <span className={styles.serviceArrow}>
                      <ArrowRight
                        size={19}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
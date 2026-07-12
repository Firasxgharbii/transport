import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Construction,
  Home,
  PackageCheck,
  Route,
  Truck,
  UsersRound,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./services.module.css";

const services = [
  {
    title: "Same day",
    description:
      "Nous comprenons l’importance de recevoir vos articles le jour même. C’est pourquoi nous nous engageons à fournir un service de livraison rapide et fiable. Notre service de répartition efficace permet à vos chargements d’arriver à destination à temps.",
    icon: Clock3,
  },
  {
    title: "Rush",
    description:
      "Nous mettons à votre disposition une équipe de professionnels prête à prendre en charge vos envois urgents et à les livrer dans les délais les plus courts.",
    icon: Truck,
  },
  {
    title: "Longues distances",
    description:
      "Nous desservons principalement la région de Montréal, ainsi que plusieurs secteurs de la Rive-Sud, de la Rive-Nord et de Lanaudière. Nous pouvons également répondre à certains besoins dans des régions plus éloignées.",
    icon: Route,
  },
  {
    title: "Résidentiel",
    description:
      "Notre service de livraison à domicile avec tailgate simplifie l’acheminement de vos produits directement à votre porte. Nos camions sont adaptés aux articles volumineux et lourds.",
    icon: Home,
  },
  {
    title: "Sur chantier",
    description:
      "Avec ce service, nous pouvons acheminer vos matériaux, outils et équipements directement là où vous en avez besoin.",
    icon: Construction,
  },
  {
    title: "Manutention",
    description:
      "Nous proposons également un service de manutention pour les livraisons qui nécessitent d’être déchargées à la main.",
    icon: UsersRound,
  },
];

export default function ServicesPage() {
  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>
              Ce que nous faisons
            </p>

            <h1>Nos services</h1>

            <p>
              Des solutions de transport et de livraison adaptées aux besoins
              des entreprises, des chantiers et des particuliers.
            </p>
          </div>
        </section>

        {/* CONTENU */}
        <section className={styles.servicesSection}>
          <div className={styles.servicesContainer}>
            <div className={styles.introColumn}>
              <p className={styles.sectionLabel}>
                Une solution pour chaque besoin
              </p>

              <h2>
                Un service fiable, rapide et professionnel
              </h2>

              <p className={styles.introText}>
                Glory Solutions accompagne ses clients avec des services de
                transport flexibles, structurés et adaptés à chaque opération.
              </p>

              <div className={styles.introImage}>
                <div className={styles.imageBadge}>
                  <PackageCheck size={26} aria-hidden="true" />

                  <span>
                    Livraison sécurisée
                    <strong>Suivi professionnel</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.servicesList}>
              {services.map((service, index) => {
                const Icon = service.icon;

                return (
                  <article
                    key={service.title}
                    className={styles.serviceItem}
                  >
                    <div className={styles.serviceNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className={styles.serviceIcon}>
                      <Icon
                        size={25}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </div>

                    <div className={styles.serviceContent}>
                      <h2>{service.title}</h2>

                      <p>{service.description}</p>

                      {service.title === "Longues distances" && (
                        <Link
                          href="/regions"
                          className={styles.regionLink}
                        >
                          Voir les régions desservies
                          <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={styles.cta}>
          <div className={styles.ctaContent}>
            <p className={styles.ctaLabel}>
              Besoin d’un service personnalisé ?
            </p>

            <h2>
              Parlez-nous de votre projet de transport
            </h2>

            <div className={styles.ctaActions}>
              <Link
                href="/quote"
                className={styles.primaryButton}
              >
                Demander une soumission
                <ArrowRight size={18} aria-hidden="true" />
              </Link>

              <Link
                href="/contact"
                className={styles.secondaryButton}
              >
                Nous contacter
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
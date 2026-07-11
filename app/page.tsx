import Link from "next/link";
import {
  Warehouse,
  Truck,
  Container,
  ClipboardList,
} from "lucide-react";

import Navbar from "./components/Navbar";

const services = [
  {
    title: "Entreposage",
    icon: Warehouse,
  },
  {
    title: "Transport",
    icon: Truck,
  },
  {
    title: "Déchargement de conteneur",
    icon: Container,
  },
  {
    title: "Préparation de commande",
    icon: ClipboardList,
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="hero-overlay" />

          <div className="hero-content">
            <p className="hero-subtitle">
              Votre partenaire en
            </p>

            <h1>Transport</h1>

            <p className="hero-description">
              Une plateforme moderne pour gérer vos commandes,
              vos chauffeurs, vos clients et vos livraisons
              efficacement.
            </p>

            <div className="hero-actions">
              <Link
                href="#contact"
                className="primary-button"
              >
                Contactez-nous
              </Link>

              <Link
                href="#services"
                className="secondary-button"
              >
                Nos services
              </Link>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section
          id="services"
          className="services-section"
        >
          <div className="services-heading">
            <p className="section-label">
              Ce que nous faisons
            </p>

            <h2 className="services-title">
              Nos services
            </h2>
          </div>

          <div className="services-grid">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <article
                  key={service.title}
                  className="service-box"
                >
                  <Icon
                    className="service-icon"
                    size={70}
                    strokeWidth={1.5}
                  />

                  <h3>{service.title}</h3>
                </article>
              );
            })}
          </div>
        </section>

        {/* CONTACT */}
        <section
          id="contact"
          className="contact-section"
        >
          <div className="contact-content">
            <p className="section-label light-label">
              Parlons de votre projet
            </p>

            <h2>
              Besoin d’un service de transport ?
            </h2>
          </div>

          <Link
            href="/contact"
            className="contact-button"
          >
            Contactez-nous
          </Link>
        </section>
      </main>
    </>
  );
}
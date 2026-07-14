import Link from "next/link";
import {
  Boxes,
  CarFront,
  ClipboardList,
  Container,
  Truck,
  Warehouse,
} from "lucide-react";

import Footer from "./components/Footer";
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
  {
    title: "Transport automobile",
    icon: CarFront,
  },
  {
    title: "Déménagement",
    icon: Boxes,
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main>
        {/* ========================================
            HERO
        ======================================== */}
        <section id="top" className="hero">
          <div className="hero-overlay" aria-hidden="true" />

          <div className="hero-content">
            <p className="hero-subtitle">
              Votre partenaire en
            </p>

            <h1>Transport</h1>

            <p className="hero-description">
              Chez GLORY SOLUTIONS, nous offrons des services professionnels de
              transport, de déménagement et de logistique adaptés aux besoins
              des particuliers et des entreprises. Nous nous engageons à
              fournir un service fiable, rapide et sécuritaire, avec une
              attention particulière à la satisfaction de nos clients.
            </p>

            <div className="hero-actions">
              <Link
                href="/contact"
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

        {/* ========================================
            SERVICES
        ======================================== */}
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
                    aria-hidden="true"
                  />

                  <h3>{service.title}</h3>
                </article>
              );
            })}
          </div>
        </section>

        {/* ========================================
            CONTACT
        ======================================== */}
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

      <Footer />
    </>
  );
}
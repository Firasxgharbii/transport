import Image from "next/image";
import Link from "next/link";

import {
  ArrowUp,
  ArrowUpRight,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

const navigationLinks = [
  {
    label: "Accueil",
    href: "/#top",
  },
  {
    label: "Services",
    href: "/#services",
  },
  {
    label: "Contact",
    href: "/#contact",
  },
];

const services = [
  "Transport",
  "Entreposage",
  "Déchargement de conteneur",
  "Préparation de commande",
  "Transport automobile",
  "Déménagement",
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-top-line" />

      <div className="footer-container">
        <div className="footer-grid">
          {/* ========================================
              ENTREPRISE
          ======================================== */}
          <section className="footer-brand footer-entry footer-entry-1">
            <Link
              href="/#top"
              className="footer-logo"
              aria-label="Retour à l’accueil"
            >
              <span className="footer-logo-image-wrapper">
                <Image
                  src="/images/logo1.jpg"
                  alt="Logo Glory Solutions"
                  width={70}
                  height={70}
                  className="footer-logo-image"
                  priority
                />
              </span>

              <span className="footer-logo-text">
                <strong>Glory</strong>
                <span>Solutions</span>
              </span>
            </Link>

            <p className="footer-description">
              Votre partenaire de confiance pour le transport, la logistique,
              l’entreposage et la livraison du dernier kilomètre.
            </p>

            <Link
              href="/#contact"
              className="footer-main-button"
            >
              Demander une soumission

              <ArrowUpRight
                size={18}
                aria-hidden="true"
              />
            </Link>
          </section>

          {/* ========================================
              NAVIGATION
          ======================================== */}
          <section className="footer-column footer-entry footer-entry-2">
            <span className="footer-number">01</span>

            <h2>Navigation</h2>

            <nav
              className="footer-navigation"
              aria-label="Navigation du pied de page"
            >
              {navigationLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                >
                  <span>{link.label}</span>

                  <ArrowUpRight
                    size={15}
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </nav>
          </section>

          {/* ========================================
              SERVICES
          ======================================== */}
          <section className="footer-column footer-entry footer-entry-3">
            <span className="footer-number">02</span>

            <h2>Services</h2>

            <ul className="footer-services">
              {services.map((service) => (
                <li key={service}>
                  {service}
                </li>
              ))}
            </ul>
          </section>

          {/* ========================================
              CONTACT
          ======================================== */}
          <section className="footer-column footer-entry footer-entry-4">
            <span className="footer-number">03</span>

            <h2>Contact</h2>

            <address className="footer-contact">
              <div className="footer-contact-row">
                <span className="footer-contact-icon">
                  <MapPin
                    size={18}
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <strong>Montréal, Québec</strong>
                  <small>Canada</small>
                </div>
              </div>

              <a
                href="mailto:contact@glorysolutions.ca"
                className="footer-contact-row"
              >
                <span className="footer-contact-icon">
                  <Mail
                    size={18}
                    aria-hidden="true"
                  />
                </span>

                <span>contact@glorysolutions.ca</span>
              </a>

              <a
                href="tel:+15140000000"
                className="footer-contact-row"
              >
                <span className="footer-contact-icon">
                  <Phone
                    size={18}
                    aria-hidden="true"
                  />
                </span>

                <span>+1 (514) 553-6762</span>
              </a>
            </address>
          </section>
        </div>

        {/* ========================================
            BAS DU FOOTER
        ======================================== */}
        <div className="footer-bottom">
          <p>
            © {year} Glory Solutions. Tous droits réservés.
          </p>

       

          <Link
            href="/#top"
            className="footer-top-button"
          >
            Retour en haut

            <ArrowUp
              size={16}
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </footer>
  );
}
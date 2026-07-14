"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navigationLinks = [
  {
    label: "Accueil",
    href: "/",
  },
  {
    label: "À propos",
    href: "/about",
  },
  {
    label: "Services",
    href: "/services",
  },
  {
    label: "Contact",
    href: "/contact",
  },
  {
    label: "Régions desservies",
    href: "/regions",
  },
  {
    label: "Transport automobile",
    href: "/transport-automobile",
  },
  {
    label: "Déménagement",
    href: "/demenagement",
  },
  {
    label: "Login",
    href: "/login",
  },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleMenu() {
    setMenuOpen((current) => !current);
  }

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* LOGO */}
        <Link
          href="/"
          className="logo"
          onClick={closeMenu}
          aria-label="Retour à l’accueil"
        >
          <span className="navbar-logo-wrapper">
            <Image
              src="/images/logo1.jpg"
              alt="Glory Solutions"
              width={140}
              height={70}
              priority
              className="navbar-logo-image"
            />
          </span>
        </Link>

        {/* BOUTON DU MENU MOBILE */}
        <button
          type="button"
          className={`menu-button ${
            menuOpen ? "menu-button-open" : ""
          }`}
          onClick={toggleMenu}
          aria-label={
            menuOpen
              ? "Fermer le menu"
              : "Ouvrir le menu"
          }
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          <span />
          <span />
          <span />
        </button>

        {/* NAVIGATION */}
        <nav
          id="main-navigation"
          className={`nav-links ${
            menuOpen ? "nav-links-open" : ""
          }`}
        >
          {navigationLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/quote"
            className="mobile-quote-button"
            onClick={closeMenu}
          >
            Soumission
          </Link>
        </nav>

        {/* BOUTON SOUMISSION DESKTOP */}
        <Link
          href="/quote"
          className="quote-button"
          onClick={closeMenu}
        >
          Soumission
        </Link>
      </div>
    </header>
  );
}
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navigationLinks = [
  { label: "Accueil", href: "/" },
  { label: "À propos", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Contact", href: "/contact" },
  { label: "Régions desservies", href: "/regions" },
  { label: "Transport automobile", href: "/transport-automobile" },
  { label: "Déménagement", href: "/demenagement" },
  { label: "Login", href: "/login" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* LOGO */}
        <Link
          href="/"
          className="logo"
          onClick={closeMenu}
          aria-label="Retour à l'accueil"
        >
          <Image
            src="/images/logo1.png"
            alt="Glory Solutions"
            width={70}
            height={70}
            priority
            className="navbar-logo-image"
          />

          <div className="logo-text">
            <span>GLORY</span>
            <strong>SOLUTIONS</strong>
          </div>
        </Link>

        {/* MENU MOBILE */}
        <button
          type="button"
          className={`menu-button ${
            menuOpen ? "menu-button-open" : ""
          }`}
          onClick={toggleMenu}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        {/* NAVIGATION */}
        <nav
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

        {/* BOUTON DESKTOP */}
        <Link
          href="/quote"
          className="quote-button"
        >
          Soumission
        </Link>
      </div>
    </header>
  );
}
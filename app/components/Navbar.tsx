"use client";

import Link from "next/link";
import { useState } from "react";

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
          <span className="logo-box">T1</span>
          <span className="logo-text">Transport</span>
        </Link>

        {/* MENU MOBILE */}
        <button
          type="button"
          className={`menu-button ${
            menuOpen ? "menu-button-open" : ""
          }`}
          onClick={toggleMenu}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
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
          <Link href="/" onClick={closeMenu}>
            Accueil
          </Link>

          <Link href="/about" onClick={closeMenu}>
            À propos
          </Link>

          <Link href="/services" onClick={closeMenu}>
            Services
          </Link>

          <Link href="/contact" onClick={closeMenu}>
            Contact
          </Link>

           <Link href="/regions" onClick={closeMenu}>
            régions-desservies
          </Link>

<Link href="/transport-automobile" onClick={closeMenu}>
            transport automobile
          </Link>

          <Link href="/demenagement" onClick={closeMenu}>
            déménagement
          </Link>
            <Link href="/contact" onClick={closeMenu}>
            login
          </Link>

  
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
          onClick={closeMenu}
        >
          Soumission
        </Link>
      </div>
    </header>
  );
}
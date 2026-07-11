"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link href="/" className="logo" onClick={closeMenu}>
          <span className="logo-box">T1</span>
          <span className="logo-text">TRANSPORT</span>
        </Link>

        <button
          type="button"
          className={`menu-button ${menuOpen ? "menu-button-open" : ""}`}
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav-links ${menuOpen ? "nav-links-open" : ""}`}>
          <Link href="/" onClick={closeMenu}>
            Accueil
          </Link>

          <Link href="#about" onClick={closeMenu}>
            À propos
          </Link>

          <Link href="#services" onClick={closeMenu}>
            Services
          </Link>

          <Link href="#contact" onClick={closeMenu}>
            Contact
          </Link>

          <Link href="#regions" onClick={closeMenu}>
            Régions desservies
          </Link>

          <Link
            href="#quote"
            className="mobile-quote-button"
            onClick={closeMenu}
          >
            Soumission
          </Link>
        </nav>

        <Link href="#quote" className="quote-button">
          Soumission
        </Link>
      </div>
    </header>
  );
}
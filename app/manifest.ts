import type { MetadataRoute } from "next";

/* ============================================================
   GLORY SOLUTIONS — PWA MANIFEST
============================================================ */

export default function manifest(): MetadataRoute.Manifest {
  return {
    /* ========================================================
       INFORMATIONS DE L'APPLICATION
    ======================================================== */

    name: "Glory Solutions",

    short_name: "Glory",

    description:
      "Plateforme professionnelle de gestion, transport et livraison Glory Solutions.",

    /* ========================================================
       DÉMARRAGE
    ======================================================== */

    // Lorsqu'un chauffeur ouvre l'application depuis
    // l'écran d'accueil de son téléphone.
    start_url: "/dashboard/driver",

    // L'application peut utiliser toutes les routes du domaine.
    scope: "/",

    /* ========================================================
       AFFICHAGE APPLICATION
    ======================================================== */

    // Important :
    // enlève l'interface normale du navigateur lorsque
    // l'application est lancée depuis l'écran d'accueil.
    display: "standalone",

    /* ========================================================
       APPARENCE
    ======================================================== */

    background_color: "#ffffff",

    theme_color: "#DC143C",

    orientation: "portrait",

    /* ========================================================
       ICÔNES
    ======================================================== */

    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },

      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },

      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],

    /* ========================================================
       CATÉGORIES
    ======================================================== */

    categories: [
      "business",
      "productivity",
      "navigation",
    ],

    /* ========================================================
       LANGUE
    ======================================================== */

    lang: "fr-CA",

    /* ========================================================
       IDENTIFIANT
    ======================================================== */

    id: "/",
  };
}
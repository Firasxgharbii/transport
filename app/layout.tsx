import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

/* ============================================================
   POLICES
============================================================ */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* ============================================================
   METADATA
============================================================ */

export const metadata: Metadata = {
  /* ----------------------------------------------------------
     TITRE
  ---------------------------------------------------------- */

  title: {
    default: "Glory Solutions",
    template: "%s | Glory Solutions",
  },

  /* ----------------------------------------------------------
     DESCRIPTION
  ---------------------------------------------------------- */

  description:
    "Services professionnels de transport, déménagement, transport automobile et logistique partout au Québec.",

  /* ----------------------------------------------------------
     NOM DE L'APPLICATION
  ---------------------------------------------------------- */

  applicationName: "Glory Solutions",

  /* ----------------------------------------------------------
     MANIFEST PWA
  ---------------------------------------------------------- */

  manifest: "/manifest.webmanifest",

  /* ----------------------------------------------------------
     ICÔNES
  ---------------------------------------------------------- */

  icons: {
    icon: [
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],

    shortcut: "/favicon-32x32.png",

    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  /* ----------------------------------------------------------
     IPHONE / IPAD
  ---------------------------------------------------------- */

  appleWebApp: {
    capable: true,
    title: "Glory Solutions",
    statusBarStyle: "default",
  },

  /* ----------------------------------------------------------
     SEO
  ---------------------------------------------------------- */

  robots: {
    index: true,
    follow: true,
  },

  /* ----------------------------------------------------------
     FORMAT DETECTION
  ---------------------------------------------------------- */

  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

/* ============================================================
   VIEWPORT
============================================================ */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",

  themeColor: "#DC143C",
};

/* ============================================================
   ROOT LAYOUT
============================================================ */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col"
      >
        {children}
      </body>
    </html>
  );
}
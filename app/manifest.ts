import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Glory Solutions",
    short_name: "Glory",

    description:
      "Plateforme de gestion, transport et livraison Glory Solutions.",

    start_url: "/dashboard/driver",
    scope: "/",

    display: "standalone",

    background_color: "#ffffff",
    theme_color: "#DC143C",

    orientation: "portrait",

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
  };
}
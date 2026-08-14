"use client";

import dynamic from "next/dynamic";

import styles from "./region.module.css";

/* =========================================================
   IMPORT DYNAMIQUE DE LEAFLET
========================================================= */

const RegionsMap = dynamic(
  () => import("./RegionsMap"),
  {
    ssr: false,

    loading: () => (
      <div className={styles.mapLoading}>
        <div
          className={
            styles.mapLoadingIcon
          }
        >
          <span />
        </div>

        <strong>
          Chargement de la carte
        </strong>

        <p>
          Préparation des zones desservies...
        </p>
      </div>
    ),
  }
);

/* =========================================================
   LOADER
========================================================= */

export default function RegionsMapLoader() {
  return <RegionsMap />;
}
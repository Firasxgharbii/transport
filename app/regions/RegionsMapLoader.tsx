"use client";

import dynamic from "next/dynamic";
import styles from "./region.module.css";

const RegionsMap = dynamic(
  () => import("./RegionsMap"),
  {
    ssr: false,

    loading: () => (
      <div className={styles.mapLoading}>
        <span />
        <p>Chargement de la carte...</p>
      </div>
    ),
  }
);

export default function RegionsMapLoader() {
  return <RegionsMap />;
}
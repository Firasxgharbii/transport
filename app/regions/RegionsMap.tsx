"use client";

import { useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import styles from "./region.module.css";

type RegionLocation = {
  name: string;
  description: string;
  position: [number, number];
};

const regionLocations: RegionLocation[] = [
  {
    name: "Montréal",
    description:
      "Anjou, Dorval, Kirkland, Lachine, LaSalle, Saint-Laurent et les secteurs environnants.",
    position: [45.5019, -73.5674],
  },
  {
    name: "Rive-Nord",
    description:
      "Laval, Blainville, Boisbriand, Mirabel, Terrebonne, Repentigny et les secteurs environnants.",
    position: [45.7004, -73.6473],
  },
  {
    name: "Rive-Sud",
    description:
      "Longueuil, Brossard, Boucherville, Beloeil, Saint-Hubert et les secteurs environnants.",
    position: [45.5312, -73.5181],
  },
];

export default function RegionsMap() {
  const logoMarker = useMemo(() => {
    return L.divIcon({
      className: styles.markerContainer,

      html: `
        <div class="${styles.logoMarker}">
          <img
            src="/images/map-pin-logo.png"
            alt=""
            width="46"
            height="46"
          />
        </div>

        <div class="${styles.markerTip}"></div>
      `,

      iconSize: [58, 72],
      iconAnchor: [29, 72],
      popupAnchor: [0, -70],
    });
  }, []);

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        center={[45.58, -73.63]}
        zoom={9}
        minZoom={7}
        maxZoom={16}
        scrollWheelZoom={false}
        zoomControl={false}
        className={styles.map}
      >
        <ZoomControl position="bottomright" />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {regionLocations.map((region) => (
          <Marker
            key={region.name}
            position={region.position}
            icon={logoMarker}
          >
            <Popup>
              <div className={styles.popupContent}>
                <span className={styles.popupLabel}>
                  Glory Solutions
                </span>

                <h3>{region.name}</h3>

                <p>{region.description}</p>

                <a href="/contact">
                  Nous contacter
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
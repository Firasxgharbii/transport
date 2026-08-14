"use client";

import {
  useEffect,
  useMemo,
} from "react";

import L from "leaflet";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import styles from "./region.module.css";

/* =========================================================
   TYPES
========================================================= */

type RegionLocation = {
  region: string;
  city: string;
  postalArea: string;
  description: string;
  position: [number, number];
};

/* =========================================================
   VILLES / SECTEURS DESSERVIS
========================================================= */

const regionLocations: RegionLocation[] = [
  /* =======================================================
     MONTRÉAL
  ======================================================= */

  {
    region: "Montréal",
    city: "Montréal",
    postalArea: "H1 – H4",
    description:
      "Montréal et l’ensemble de son agglomération.",
    position: [45.5019, -73.5674],
  },

  {
    region: "Montréal",
    city: "Anjou",
    postalArea: "H1J / H1K",
    description:
      "Anjou et les secteurs environnants.",
    position: [45.604, -73.558],
  },

  {
    region: "Montréal",
    city: "Saint-Laurent",
    postalArea:
      "H4L / H4M / H4N / H4R / H4S",
    description:
      "Saint-Laurent et les secteurs industriels environnants.",
    position: [45.503, -73.706],
  },

  {
    region: "Montréal",
    city: "Lachine",
    postalArea:
      "H8R / H8S / H8T",
    description:
      "Lachine et les secteurs environnants.",
    position: [45.442, -73.675],
  },

  {
    region: "Montréal",
    city: "LaSalle",
    postalArea:
      "H8N / H8P / H8R",
    description:
      "LaSalle et les secteurs environnants.",
    position: [45.43, -73.63],
  },

  {
    region: "Montréal",
    city: "Dorval",
    postalArea:
      "H9P / H9S",
    description:
      "Dorval et les secteurs environnants.",
    position: [45.447, -73.753],
  },

  {
    region: "Montréal",
    city: "Pointe-Claire",
    postalArea:
      "H9R / H9S",
    description:
      "Pointe-Claire et l’ouest de Montréal.",
    position: [45.448, -73.816],
  },

  {
    region: "Montréal",
    city: "Kirkland",
    postalArea:
      "H9H / H9J",
    description:
      "Kirkland et les secteurs environnants.",
    position: [45.45, -73.865],
  },

  {
    region: "Montréal",
    city: "Pierrefonds",
    postalArea:
      "H8Y / H8Z / H9A",
    description:
      "Pierrefonds et les secteurs environnants.",
    position: [45.495, -73.847],
  },

  {
    region: "Montréal",
    city: "Montréal-Nord",
    postalArea:
      "H1G / H1H",
    description:
      "Montréal-Nord et les secteurs environnants.",
    position: [45.607, -73.621],
  },

  {
    region: "Montréal",
    city: "Saint-Léonard",
    postalArea:
      "H1P / H1R / H1S",
    description:
      "Saint-Léonard et les secteurs environnants.",
    position: [45.587, -73.596],
  },

  /* =======================================================
     LAVAL
  ======================================================= */

  {
    region: "Laval",
    city: "Laval",
    postalArea: "H7",
    description:
      "Laval et l’ensemble de ses secteurs.",
    position: [45.6066, -73.7124],
  },

  {
    region: "Laval",
    city: "Chomedey",
    postalArea:
      "H7S / H7T / H7V / H7W",
    description:
      "Chomedey et les secteurs environnants.",
    position: [45.56, -73.738],
  },

  {
    region: "Laval",
    city: "Sainte-Dorothée",
    postalArea: "H7X",
    description:
      "Sainte-Dorothée et l’ouest de Laval.",
    position: [45.533, -73.812],
  },

  {
    region: "Laval",
    city: "Sainte-Rose",
    postalArea: "H7L",
    description:
      "Sainte-Rose et les secteurs environnants.",
    position: [45.616, -73.782],
  },

  {
    region: "Laval",
    city: "Vimont",
    postalArea: "H7M",
    description:
      "Vimont et les secteurs environnants.",
    position: [45.602, -73.743],
  },

  /* =======================================================
     RIVE-NORD
  ======================================================= */

  {
    region: "Rive-Nord",
    city: "Saint-Eustache",
    postalArea:
      "J7P / J7R",
    description:
      "Saint-Eustache et les secteurs environnants.",
    position: [45.565, -73.905],
  },

  {
    region: "Rive-Nord",
    city: "Boisbriand",
    postalArea:
      "J7G / J7H",
    description:
      "Boisbriand et les secteurs environnants.",
    position: [45.612, -73.838],
  },

  {
    region: "Rive-Nord",
    city: "Blainville",
    postalArea:
      "J7B / J7C",
    description:
      "Blainville et les secteurs environnants.",
    position: [45.671, -73.879],
  },

  {
    region: "Rive-Nord",
    city: "Sainte-Thérèse",
    postalArea: "J7E",
    description:
      "Sainte-Thérèse et les secteurs environnants.",
    position: [45.639, -73.842],
  },

  {
    region: "Rive-Nord",
    city: "Rosemère",
    postalArea: "J7A",
    description:
      "Rosemère et les secteurs environnants.",
    position: [45.633, -73.799],
  },

  {
    region: "Rive-Nord",
    city: "Bois-des-Filion",
    postalArea: "J6Z",
    description:
      "Bois-des-Filion et les secteurs environnants.",
    position: [45.675, -73.76],
  },

  {
    region: "Rive-Nord",
    city: "Deux-Montagnes",
    postalArea: "J7R",
    description:
      "Deux-Montagnes et les secteurs environnants.",
    position: [45.534, -73.901],
  },

  {
    region: "Rive-Nord",
    city: "Sainte-Marthe-sur-le-Lac",
    postalArea: "J0N",
    description:
      "Sainte-Marthe-sur-le-Lac et les secteurs environnants.",
    position: [45.529, -73.934],
  },

  {
    region: "Rive-Nord",
    city: "Oka",
    postalArea: "J0N",
    description:
      "Oka et les secteurs environnants.",
    position: [45.464, -74.088],
  },

  /* =======================================================
     LAURENTIDES
  ======================================================= */

  {
    region: "Laurentides",
    city: "Mirabel",
    postalArea:
      "J7J / J7N",
    description:
      "Mirabel et les secteurs industriels et résidentiels environnants.",
    position: [45.651, -74.083],
  },

  {
    region: "Laurentides",
    city: "Saint-Jérôme",
    postalArea:
      "J5L / J7Y / J7Z",
    description:
      "Saint-Jérôme et les secteurs environnants.",
    position: [45.7804, -74.0036],
  },

  {
    region: "Laurentides",
    city: "Lachute",
    postalArea: "J8H",
    description:
      "Lachute et les secteurs environnants.",
    position: [45.652, -74.34],
  },

  {
    region: "Laurentides",
    city: "Saint-Sauveur",
    postalArea: "J0R",
    description:
      "Saint-Sauveur et les secteurs environnants.",
    position: [45.895, -74.161],
  },

  {
    region: "Laurentides",
    city: "Sainte-Adèle",
    postalArea: "J8B",
    description:
      "Sainte-Adèle et les secteurs environnants.",
    position: [45.951, -74.136],
  },

  {
    region: "Laurentides",
    city: "Prévost",
    postalArea: "J0R",
    description:
      "Prévost et les secteurs environnants.",
    position: [45.866, -74.075],
  },

  {
    region: "Laurentides",
    city: "Saint-Colomban",
    postalArea: "J5K",
    description:
      "Saint-Colomban et les secteurs environnants.",
    position: [45.739, -74.133],
  },

  {
    region: "Laurentides",
    city: "Mont-Tremblant",
    postalArea: "J8E",
    description:
      "Mont-Tremblant et les secteurs environnants.",
    position: [46.118, -74.596],
  },

  /* =======================================================
     LANAUDIÈRE
  ======================================================= */

  {
    region: "Lanaudière",
    city: "Terrebonne",
    postalArea:
      "J6V / J6W / J6X / J6Y",
    description:
      "Terrebonne et les secteurs environnants.",
    position: [45.7, -73.647],
  },

  {
    region: "Lanaudière",
    city: "Mascouche",
    postalArea:
      "J7K / J7L",
    description:
      "Mascouche et les secteurs environnants.",
    position: [45.744, -73.6],
  },

  {
    region: "Lanaudière",
    city: "Repentigny",
    postalArea:
      "J5Y / J5Z / J6A",
    description:
      "Repentigny et les secteurs environnants.",
    position: [45.742, -73.451],
  },

  {
    region: "Lanaudière",
    city: "L’Assomption",
    postalArea: "J5W",
    description:
      "L’Assomption et les secteurs environnants.",
    position: [45.829, -73.423],
  },

  {
    region: "Lanaudière",
    city: "Joliette",
    postalArea: "J6E",
    description:
      "Joliette et les secteurs environnants.",
    position: [46.023, -73.439],
  },

  {
    region: "Lanaudière",
    city: "Rawdon",
    postalArea: "J0K",
    description:
      "Rawdon et les secteurs environnants.",
    position: [46.046, -73.711],
  },

  {
    region: "Lanaudière",
    city: "Saint-Lin-Laurentides",
    postalArea: "J5M",
    description:
      "Saint-Lin-Laurentides et les secteurs environnants.",
    position: [45.85, -73.765],
  },

  /* =======================================================
     RIVE-SUD
  ======================================================= */

  {
    region: "Rive-Sud",
    city: "Longueuil",
    postalArea: "J4",
    description:
      "Longueuil et les secteurs environnants.",
    position: [45.5312, -73.5181],
  },

  {
    region: "Rive-Sud",
    city: "Brossard",
    postalArea:
      "J4W / J4X / J4Y / J4Z",
    description:
      "Brossard et les secteurs environnants.",
    position: [45.462, -73.466],
  },

  {
    region: "Rive-Sud",
    city: "Boucherville",
    postalArea: "J4B",
    description:
      "Boucherville et les secteurs environnants.",
    position: [45.591, -73.436],
  },

  {
    region: "Rive-Sud",
    city: "Sainte-Julie",
    postalArea: "J3E",
    description:
      "Sainte-Julie et les secteurs environnants.",
    position: [45.5833, -73.3333],
  },

  {
    region: "Rive-Sud",
    city: "Saint-Bruno-de-Montarville",
    postalArea: "J3V",
    description:
      "Saint-Bruno-de-Montarville et les secteurs environnants.",
    position: [45.533, -73.35],
  },

  {
    region: "Rive-Sud",
    city: "Saint-Hubert",
    postalArea:
      "J3Y / J3Z",
    description:
      "Saint-Hubert et les secteurs environnants.",
    position: [45.497, -73.451],
  },

  {
    region: "Rive-Sud",
    city: "Saint-Lambert",
    postalArea: "J4P / J4R / J4S",
    description:
      "Saint-Lambert et les secteurs environnants.",
    position: [45.5, -73.51],
  },

  {
    region: "Rive-Sud",
    city: "Chambly",
    postalArea: "J3L",
    description:
      "Chambly et les secteurs environnants.",
    position: [45.447, -73.292],
  },

  {
    region: "Rive-Sud",
    city: "Beloeil",
    postalArea: "J3G",
    description:
      "Beloeil et les secteurs environnants.",
    position: [45.569, -73.204],
  },

  {
    region: "Rive-Sud",
    city: "Mont-Saint-Hilaire",
    postalArea: "J3H",
    description:
      "Mont-Saint-Hilaire et les secteurs environnants.",
    position: [45.565, -73.181],
  },

  {
    region: "Rive-Sud",
    city: "La Prairie",
    postalArea: "J5R",
    description:
      "La Prairie et les secteurs environnants.",
    position: [45.416, -73.497],
  },

  {
    region: "Rive-Sud",
    city: "Candiac",
    postalArea: "J5R",
    description:
      "Candiac et les secteurs environnants.",
    position: [45.383, -73.515],
  },

  {
    region: "Rive-Sud",
    city: "Saint-Constant",
    postalArea: "J5A",
    description:
      "Saint-Constant et les secteurs environnants.",
    position: [45.37, -73.57],
  },

  {
    region: "Rive-Sud",
    city: "Sainte-Catherine",
    postalArea: "J5C",
    description:
      "Sainte-Catherine et les secteurs environnants.",
    position: [45.4, -73.58],
  },

  {
    region: "Rive-Sud",
    city: "Châteauguay",
    postalArea:
      "J6J / J6K",
    description:
      "Châteauguay et les secteurs environnants.",
    position: [45.383, -73.75],
  },

  {
    region: "Rive-Sud",
    city: "Varennes",
    postalArea: "J3X",
    description:
      "Varennes et les secteurs environnants.",
    position: [45.683, -73.438],
  },

  /* =======================================================
     MONTÉRÉGIE
  ======================================================= */

  {
    region: "Montérégie",
    city: "Saint-Jean-sur-Richelieu",
    postalArea:
      "J2W / J2X / J2Y",
    description:
      "Saint-Jean-sur-Richelieu et les secteurs environnants.",
    position: [45.306, -73.255],
  },

  {
    region: "Montérégie",
    city: "Saint-Hyacinthe",
    postalArea:
      "J2R / J2S / J2T",
    description:
      "Saint-Hyacinthe et les secteurs environnants.",
    position: [45.63, -72.957],
  },

  {
    region: "Montérégie",
    city: "Sorel-Tracy",
    postalArea:
      "J3P / J3R",
    description:
      "Sorel-Tracy et les secteurs environnants.",
    position: [46.042, -73.113],
  },

  {
    region: "Montérégie",
    city: "Granby",
    postalArea:
      "J2G / J2H / J2J",
    description:
      "Granby et les secteurs environnants.",
    position: [45.4, -72.733],
  },

  /* =======================================================
     OUTAOUAIS
  ======================================================= */

  {
    region: "Outaouais",
    city: "Gatineau",
    postalArea: "J8",
    description:
      "Gatineau et les secteurs environnants.",
    position: [45.4765, -75.7013],
  },

  {
    region: "Outaouais",
    city: "Chelsea",
    postalArea: "J9B",
    description:
      "Chelsea et les secteurs environnants.",
    position: [45.5, -75.78],
  },

  /* =======================================================
     OTTAWA
  ======================================================= */

  {
    region: "Ontario",
    city: "Ottawa",
    postalArea: "K1 / K2",
    description:
      "Ottawa, Kanata, Nepean, Orléans, Barrhaven et les environs.",
    position: [45.4247, -75.695],
  },

  /* =======================================================
     ESTRIE
  ======================================================= */

  {
    region: "Estrie",
    city: "Sherbrooke",
    postalArea: "J1",
    description:
      "Sherbrooke et l’Estrie.",
    position: [45.4042, -71.8929],
  },

  {
    region: "Estrie",
    city: "Magog",
    postalArea: "J1X",
    description:
      "Magog et les secteurs environnants.",
    position: [45.266, -72.15],
  },

  /* =======================================================
     CENTRE-DU-QUÉBEC
  ======================================================= */

  {
    region: "Centre-du-Québec",
    city: "Drummondville",
    postalArea:
      "J2B / J2C / J2E",
    description:
      "Drummondville et le Centre-du-Québec.",
    position: [45.8833, -72.4833],
  },

  {
    region: "Centre-du-Québec",
    city: "Victoriaville",
    postalArea:
      "G6P / G6R / G6S",
    description:
      "Victoriaville et les secteurs environnants.",
    position: [46.055, -71.959],
  },

  /* =======================================================
     MAURICIE
  ======================================================= */

  {
    region: "Mauricie",
    city: "Trois-Rivières",
    postalArea:
      "G8 / G9",
    description:
      "Trois-Rivières et la Mauricie.",
    position: [46.343, -72.543],
  },

  {
    region: "Mauricie",
    city: "Shawinigan",
    postalArea: "G9N",
    description:
      "Shawinigan et les secteurs environnants.",
    position: [46.566, -72.75],
  },

  /* =======================================================
     CAPITALE-NATIONALE
  ======================================================= */

  {
    region: "Capitale-Nationale",
    city: "Québec",
    postalArea:
      "G1 / G2 / G3",
    description:
      "Québec et la Capitale-Nationale.",
    position: [46.8139, -71.208],
  },

  /* =======================================================
     CHAUDIÈRE-APPALACHES
  ======================================================= */

  {
    region: "Chaudière-Appalaches",
    city: "Lévis",
    postalArea: "G6",
    description:
      "Lévis et Chaudière-Appalaches.",
    position: [46.7382, -71.2465],
  },

  /* =======================================================
     SAGUENAY
  ======================================================= */

  {
    region: "Saguenay–Lac-Saint-Jean",
    city: "Saguenay",
    postalArea: "G7",
    description:
      "Saguenay, Chicoutimi, Jonquière et les environs.",
    position: [48.4284, -71.0686],
  },

  {
    region: "Saguenay–Lac-Saint-Jean",
    city: "Alma",
    postalArea: "G8B",
    description:
      "Alma et les secteurs environnants.",
    position: [48.55, -71.65],
  },

  /* =======================================================
     BAS-SAINT-LAURENT
  ======================================================= */

  {
    region: "Bas-Saint-Laurent",
    city: "Rimouski",
    postalArea: "G5",
    description:
      "Rimouski et le Bas-Saint-Laurent.",
    position: [48.4488, -68.523],
  },

  {
    region: "Bas-Saint-Laurent",
    city: "Rivière-du-Loup",
    postalArea: "G5R",
    description:
      "Rivière-du-Loup et les secteurs environnants.",
    position: [47.835, -69.536],
  },

  /* =======================================================
     GASPÉSIE
  ======================================================= */

  {
    region: "Gaspésie",
    city: "Gaspé",
    postalArea: "G4",
    description:
      "Gaspé et les secteurs accessibles.",
    position: [48.8316, -64.486],
  },

  /* =======================================================
     CÔTE-NORD
  ======================================================= */

  {
    region: "Côte-Nord",
    city: "Baie-Comeau",
    postalArea:
      "G4Z / G5C",
    description:
      "Baie-Comeau et les secteurs environnants.",
    position: [49.2168, -68.1489],
  },

  {
    region: "Côte-Nord",
    city: "Sept-Îles",
    postalArea:
      "G4R / G4S",
    description:
      "Sept-Îles et les secteurs environnants.",
    position: [50.213, -66.376],
  },

  /* =======================================================
     ABITIBI
  ======================================================= */

  {
    region: "Abitibi-Témiscamingue",
    city: "Rouyn-Noranda",
    postalArea:
      "J9X / J9Y",
    description:
      "Rouyn-Noranda et les secteurs environnants.",
    position: [48.2366, -79.0231],
  },

  {
    region: "Abitibi-Témiscamingue",
    city: "Val-d’Or",
    postalArea:
      "J9P",
    description:
      "Val-d’Or et les secteurs environnants.",
    position: [48.1, -77.783],
  },

  /* =======================================================
     NORD-DU-QUÉBEC
  ======================================================= */

  {
    region: "Nord-du-Québec",
    city: "Chibougamau",
    postalArea:
      "G8P",
    description:
      "Chibougamau et les secteurs accessibles.",
    position: [49.9168, -74.3659],
  },
];

/* =========================================================
   AJUSTEMENT AUTOMATIQUE
========================================================= */

function FitMapToLocations() {
  const map = useMap();

  useEffect(() => {
    const bounds =
      L.latLngBounds(
        regionLocations.map(
          (location) =>
            location.position
        )
      );

    map.fitBounds(
      bounds,
      {
        padding: [
          55,
          55,
        ],

        maxZoom: 7,
      }
    );

    const timer =
      window.setTimeout(
        () => {
          map.invalidateSize();
        },
        300
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [map]);

  return null;
}

/* =========================================================
   MAP
========================================================= */

export default function RegionsMap() {
  /* =======================================================
     LOGO GLORY SOLUTIONS
  ======================================================= */

  const logoMarker =
    useMemo(() => {
      return L.divIcon({
        className:
          styles.logoOnlyMarkerRoot,

        html: `
          <div class="${styles.logoOnlyMarker}">
            <img
              src="/images/logo1.png"
              alt=""
            />
          </div>
        `,

        iconSize: [
          34,
          34,
        ],

        iconAnchor: [
          17,
          17,
        ],

        popupAnchor: [
          0,
          -22,
        ],
      });
    }, []);

  return (
    <div
      className={
        styles.mapOuter
      }
    >
      {/* ===================================================
          HEADER
      =================================================== */}

    
      {/* ===================================================
          MAP WRAPPER
      =================================================== */}

      <div
        className={
          styles.mapWrapper
        }
      >
        <MapContainer
          center={[
            45.72,
            -73.7,
          ]}
          zoom={8}
          minZoom={4}
          maxZoom={16}
          scrollWheelZoom={true}
          zoomControl={true}
          className={
            styles.map
          }
        >
          <FitMapToLocations />

          {/* ===============================================
              OPENSTREETMAP
          =============================================== */}

          <TileLayer
            attribution={
              "&copy; OpenStreetMap contributors"
            }
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* ===============================================
              POINTS GLORY
          =============================================== */}

          {regionLocations.map(
            (
              location,
              index
            ) => (
              <Marker
                key={`${location.region}-${location.city}-${index}`}
                position={
                  location.position
                }
                icon={
                  logoMarker
                }
              >
                <Popup
                  minWidth={270}
                  maxWidth={330}
                >
                  <div
                    className={
                      styles.popupContent
                    }
                  >
                    {/* HEADER */}

                    <div
                      className={
                        styles.popupHeader
                      }
                    >
                      <div
                        className={
                          styles.popupLogoModern
                        }
                      >
                        <img
                          src="/images/logo1.png"
                          alt="Glory Solutions"
                        />
                      </div>

                      <div>
                        <span
                          className={
                            styles.popupCompany
                          }
                        >
                          Glory Solutions
                        </span>

                        <h3>
                          {
                            location.city
                          }
                        </h3>
                      </div>
                    </div>

                    {/* RÉGION */}

                    <div
                      className={
                        styles.popupReference
                      }
                    >
                      Région

                      <strong>
                        {
                          location.region
                        }
                      </strong>
                    </div>

                    {/* POSTAL */}

                    <div
                      className={
                        styles.popupReference
                      }
                    >
                      Zones postales

                      <strong>
                        {
                          location.postalArea
                        }
                      </strong>
                    </div>

                    {/* DESCRIPTION */}

                    <p>
                      {
                        location.description
                      }
                    </p>

                    {/* STATUS */}

                    <div
                      className={
                        styles.popupStatus
                      }
                    >
                      <span />

                      Secteur desservi
                    </div>

                    {/* CONTACT */}

                    <a
                      href="/contact"
                      className={
                        styles.popupButton
                      }
                    >
                      Vérifier une livraison

                      <span>
                        →
                      </span>
                    </a>
                  </div>
                </Popup>
              </Marker>
            )
          )}
        </MapContainer>

        {/* =================================================
            SIGNATURE
        ================================================= */}

        <div
          className={
            styles.mapCornerDecoration
          }
        >
          <span>
            RÉSEAU DE LIVRAISON
          </span>

          <strong>
            GLORY SOLUTIONS
          </strong>
        </div>
      </div>
    </div>
  );
}
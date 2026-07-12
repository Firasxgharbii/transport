import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegionsMapLoader from "./RegionsMapLoader";

import styles from "./region.module.css";

type Region = {
  title: string;
  cities: string[];
};

const regions: Region[] = [
  {
    title: "Montréal",
    cities: [
      "Anjou",
      "Baie-d’Urfé",
      "Beaconsfield",
      "Côte-Saint-Luc",
      "Dollard-des-Ormeaux",
      "Dorval",
      "Île-Bizard",
      "Kirkland",
      "Lachine",
      "LaSalle",
      "Mont-Royal",
      "Montréal-Nord",
      "Pierrefonds",
      "Pointe-aux-Trembles",
      "Pointe-Claire",
      "Rivière-des-Prairies",
      "Saint-Laurent",
      "Saint-Léonard",
      "Sainte-Anne-de-Bellevue",
      "Senneville",
      "Verdun",
      "Westmount",
    ],
  },
  {
    title: "Rive-Nord",
    cities: [
      "Blainville",
      "Bois-des-Filion",
      "Boisbriand",
      "Charlemagne",
      "Laval",
      "Lorraine",
      "Mirabel",
      "Repentigny",
      "Rosemère",
      "Saint-Eustache",
      "Saint-Jérôme",
      "Sainte-Dorothée",
      "Sainte-Thérèse",
      "Terrebonne",
    ],
  },
  {
    title: "Rive-Sud",
    cities: [
      "Beloeil",
      "Boucherville",
      "Brossard",
      "Candiac",
      "Carignan",
      "Chambly",
      "Greenfield Park",
      "La Prairie",
      "Longueuil",
      "McMasterville",
      "Mont-Saint-Hilaire",
      "Saint-Amable",
      "Saint-Basile-le-Grand",
      "Saint-Bruno-de-Montarville",
      "Saint-Hubert",
      "Saint-Lambert",
      "Saint-Mathieu-de-Beloeil",
      "Sainte-Catherine",
      "Sainte-Julie",
    ],
  },
];

export default function RegionsPage() {
  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <section className={styles.regionsSection}>
          {/* EN-TÊTE */}
          <div className={styles.heading}>
            <p className={styles.eyebrow}>
              Notre zone de couverture
            </p>

            <h1>Régions desservies</h1>

            <div className={styles.divider} />

            <p className={styles.introduction}>
              Notre équipe dessert Montréal ainsi que plusieurs secteurs de la
              Rive-Nord et de la Rive-Sud. Nous pouvons également répondre à
              certains besoins dans des régions plus éloignées.
            </p>

            <p className={styles.subText}>
              Découvrez les principaux secteurs couverts par Glory Solutions.
            </p>
          </div>

          {/* CARTES DES RÉGIONS */}
          <div className={styles.regionsGrid}>
            {regions.map((region, index) => (
              <article
                key={region.title}
                className={styles.regionCard}
              >
                <div className={styles.regionNumber}>
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className={styles.regionIcon}>
                  <MapPin
                    size={24}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </div>

                <h2>{region.title}</h2>

                <ul>
                  {region.cities.map((city) => (
                    <li key={city}>
                      <span className={styles.cityDot} />
                      <span>{city}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {/* CARTE INTERACTIVE */}
          <section className={styles.mapSection}>
           

            <RegionsMapLoader />
          </section>

          {/* BLOC CONTACT */}
          <div className={styles.contactBox}>
            <div>
              <p className={styles.contactLabel}>
                Votre ville ne figure pas dans la liste ?
              </p>

              <h2>
                Communiquez avec notre équipe pour vérifier votre secteur.
              </h2>
            </div>

            <Link
              href="/contact"
              className={styles.contactButton}
            >
              Nous contacter

              <ArrowRight
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
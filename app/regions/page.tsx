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
      "Montréal",
      "Anjou",
      "Baie-d’Urfé",
      "Beaconsfield",
      "Côte-Saint-Luc",
      "Dollard-des-Ormeaux",
      "Dorval",
      "Kirkland",
      "Lachine",
      "LaSalle",
      "Mont-Royal",
      "Montréal-Nord",
      "Pierrefonds",
      "Pointe-Claire",
      "Pointe-aux-Trembles",
      "Rivière-des-Prairies",
      "Saint-Laurent",
      "Saint-Léonard",
      "Sainte-Anne-de-Bellevue",
      "Verdun",
      "Westmount",
    ],
  },

  {
    title: "Laval",
    cities: [
      "Laval",
      "Chomedey",
      "Duvernay",
      "Fabreville",
      "Laval-des-Rapides",
      "Laval-Ouest",
      "Pont-Viau",
      "Sainte-Dorothée",
      "Sainte-Rose",
      "Vimont",
    ],
  },

  {
    title: "Rive-Nord & Laurentides",
    cities: [
      "Blainville",
      "Boisbriand",
      "Bois-des-Filion",
      "Deux-Montagnes",
      "Lachute",
      "Lorraine",
      "Mirabel",
      "Oka",
      "Pointe-Calumet",
      "Prévost",
      "Rosemère",
      "Saint-Colomban",
      "Saint-Eustache",
      "Saint-Hippolyte",
      "Saint-Jérôme",
      "Saint-Sauveur",
      "Sainte-Adèle",
      "Sainte-Anne-des-Plaines",
      "Sainte-Marthe-sur-le-Lac",
      "Sainte-Thérèse",
    ],
  },

  {
    title: "Lanaudière",
    cities: [
      "Berthierville",
      "Charlemagne",
      "Joliette",
      "L’Assomption",
      "L’Épiphanie",
      "Mascouche",
      "Rawdon",
      "Repentigny",
      "Saint-Charles-Borromée",
      "Saint-Lin-Laurentides",
      "Saint-Roch-de-l’Achigan",
      "Terrebonne",
    ],
  },

  {
    title: "Rive-Sud & Montérégie",
    cities: [
      "Beloeil",
      "Boucherville",
      "Brossard",
      "Candiac",
      "Carignan",
      "Chambly",
      "Châteauguay",
      "Delson",
      "Greenfield Park",
      "La Prairie",
      "Longueuil",
      "McMasterville",
      "Mont-Saint-Hilaire",
      "Saint-Amable",
      "Saint-Basile-le-Grand",
      "Saint-Bruno-de-Montarville",
      "Saint-Constant",
      "Saint-Hubert",
      "Saint-Jean-sur-Richelieu",
      "Saint-Lambert",
      "Saint-Mathieu-de-Beloeil",
      "Sainte-Catherine",
      "Sainte-Julie",
      "Saint-Hyacinthe",
      "Sorel-Tracy",
      "Varennes",
    ],
  },

  {
    title: "Outaouais & Ottawa",
    cities: [
      "Gatineau",
      "Hull",
      "Aylmer",
      "Chelsea",
      "Cantley",
      "Ottawa",
      "Kanata",
      "Nepean",
      "Orléans",
      "Barrhaven",
    ],
  },

  {
    title: "Autres régions du Québec",
    cities: [
      "Drummondville",
      "Trois-Rivières",
      "Sherbrooke",
      "Québec",
      "Lévis",
      "Victoriaville",
      "Granby",
      "Saguenay",
      "Alma",
      "Rimouski",
      "Rivière-du-Loup",
      "Baie-Comeau",
      "Sept-Îles",
      "Rouyn-Noranda",
      "Val-d’Or",
    ],
  },
];

export default function RegionsPage() {
  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        {/* ============================================
            INTRODUCTION
        ============================================ */}

        <section className={styles.regionsSection}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>
              Notre zone de couverture
            </p>

            <h1>Régions desservies</h1>

            <div className={styles.divider} />


          
          </div>

          {/* ============================================
              RÉGIONS
          ============================================ */}

          <div className={styles.regionsGrid}>
            {regions.map((region, index) => (
              <article
                key={region.title}
                className={styles.regionCard}
              >
                <div className={styles.regionTop}>
                  <span className={styles.regionNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className={styles.regionIcon}>
                    <MapPin
                      size={22}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>
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
        </section>

        {/* ============================================
            CARTE — PLEINE LARGEUR
        ============================================ */}

        <section className={styles.mapSection}>
          <div className={styles.mapHeading}>
            <p className={styles.mapEyebrow}>
              Couverture géographique
            </p>

            <h2>
              Notre réseau
              <br />
              de livraison
            </h2>

          </div>

          <div className={styles.mapContainer}>
            <RegionsMapLoader />
          </div>
        </section>

        {/* ============================================
            CONTACT / CTA
        ============================================ */}

        <section className={styles.bottomSection}>
          <div className={styles.contactBox}>
            <div>
              <p className={styles.contactLabel}>
                Transport hors Québec
              </p>

              <h2>
                Ontario et autres provinces disponibles sur demande
              </h2>
            </div>

            <Link
              href="/quote"
              className={styles.contactButton}
            >
              Demander une soumission
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

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
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
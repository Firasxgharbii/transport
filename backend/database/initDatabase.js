const fs = require("fs");
const path = require("path");
const db = require("../config/db");

async function initDatabase() {
  try {
    console.log("Connexion à Aiven MySQL...");

    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    const queries = schema
      .split(";")
      .map((query) => query.trim())
      .filter((query) => query.length > 0);

    for (const query of queries) {
      await db.query(query);
    }

    console.log("Base de données initialisée avec succès !");
    process.exit(0);
  } catch (error) {
    console.error("Erreur initialisation DB :", error.message);
    process.exit(1);
  }
}

initDatabase();
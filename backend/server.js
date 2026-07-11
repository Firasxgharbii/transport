const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const clientRoutes = require("./routes/clientRoutes");
const driverRoutes = require("./routes/driverRoutes");

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/drivers", driverRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Transport backend API fonctionne correctement",
    status: "success",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Transport Platform Backend",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT NOW() AS current_time");
    res.json({
      message: "Connexion Aiven MySQL réussie",
      database_time: rows[0].current_time,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur connexion base de données",
      error: error.message,
    });
  }
});

io.on("connection", (socket) => {
  console.log("Utilisateur connecté:", socket.id);

  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté:", socket.id);
  });
});

(async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ Connecté à Aiven MySQL !");
    connection.release();
  } catch (err) {
    console.error("❌ Erreur MySQL :", err.message);
  }
})();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Serveur backend lancé sur http://localhost:${PORT}`);
});
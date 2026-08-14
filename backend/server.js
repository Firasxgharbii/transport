const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

/* =====================================================
   VARIABLES D’ENVIRONNEMENT
===================================================== */

dotenv.config();

/* =====================================================
   BASE DE DONNÉES
===================================================== */

const db = require("./config/db");

/* =====================================================
   ROUTES
===================================================== */

const authRoutes = require(
  "./routes/authRoutes"
);

const userRoutes = require(
  "./routes/userRoutes"
);

const clientRoutes = require(
  "./routes/clientRoutes"
);

const driverRoutes = require(
  "./routes/driverRoutes"
);

const orderRoutes = require(
  "./routes/orderRoutes"
);

const dashboardRoutes = require(
  "./routes/dashboardRoutes"
);

/* NOUVEAU : CONTACT */

const contactRoutes = require(
  "./routes/contactRoutes"
);

/* =====================================================
   EXPRESS ET SERVEUR HTTP
===================================================== */

const app = express();

const server = http.createServer(app);

const PORT =
  Number(process.env.PORT) || 5000;

const HOST =
  process.env.HOST || "0.0.0.0";

/* =====================================================
   CORS
===================================================== */

const allowedOrigins = [
  process.env.FRONTEND_URL,

  "http://localhost:3000",
  "http://127.0.0.1:3000",

  /* TON IP LOCALE ACTUELLE */
  "http://172.20.10.6:3000",

  /* AUTRES IP LOCALES SI BESOIN */
  "http://192.168.2.22:3000",
  "http://192.168.2.47:3000",

  /* SITE EN PRODUCTION */
  "https://glorysolutions.ca",
  "https://www.glorysolutions.ca",
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    /*
      Autorise Postman,
      applications mobiles,
      requêtes sans Origin.
    */

    if (!origin) {
      return callback(
        null,
        true
      );
    }

    /*
      En développement,
      autorise les origines locales.
    */

    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      return callback(
        null,
        true
      );
    }

    /*
      En production,
      seulement domaines autorisés.
    */

    if (
      allowedOrigins.includes(origin)
    ) {
      return callback(
        null,
        true
      );
    }

    console.error(
      `❌ CORS refusé : ${origin}`
    );

    return callback(
      new Error(
        "Cette origine n’est pas autorisée par CORS."
      )
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  credentials: true,
};

/* =====================================================
   SOCKET.IO
===================================================== */

const io = new Server(
  server,
  {
    cors: corsOptions,
  }
);

/* =====================================================
   MIDDLEWARES
===================================================== */

app.use(
  cors(corsOptions)
);

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

/* =====================================================
   RENDRE SOCKET.IO ACCESSIBLE
===================================================== */

app.set(
  "io",
  io
);

/* =====================================================
   ROUTES API
===================================================== */

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/clients",
  clientRoutes
);

app.use(
  "/api/drivers",
  driverRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

/* =====================================================
   CONTACT
===================================================== */

app.use(
  "/api/contact",
  contactRoutes
);

/* =====================================================
   ROUTE PRINCIPALE
===================================================== */

app.get(
  "/",
  (req, res) => {
    return res
      .status(200)
      .json({
        success: true,

        message:
          "Transport Platform Backend API fonctionne correctement.",

        environment:
          process.env.NODE_ENV ||
          "development",

        timestamp:
          new Date().toISOString(),
      });
  }
);

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
  "/api/health",
  (req, res) => {
    return res
      .status(200)
      .json({
        success: true,

        status: "OK",

        service:
          "Transport Platform Backend",

        environment:
          process.env.NODE_ENV ||
          "development",

        timestamp:
          new Date().toISOString(),
      });
  }
);

/* =====================================================
   TEST SMTP
===================================================== */

app.get(
  "/api/contact/test",
  async (req, res) => {
    try {
      const nodemailer =
        require("nodemailer");

      if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASSWORD
      ) {
        return res
          .status(500)
          .json({
            success: false,

            message:
              "Variables SMTP manquantes.",
          });
      }

      const transporter =
        nodemailer.createTransport({
          host:
            process.env.SMTP_HOST,

          port:
            Number(
              process.env.SMTP_PORT ||
                465
            ),

          secure: true,

          auth: {
            user:
              process.env.SMTP_USER,

            pass:
              process.env
                .SMTP_PASSWORD,
          },
        });

      await transporter.verify();

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Connexion SMTP Hostinger réussie.",

          host:
            process.env.SMTP_HOST,

          port:
            Number(
              process.env.SMTP_PORT ||
                465
            ),

          user:
            process.env.SMTP_USER,
        });
    } catch (error) {
      console.error(
        "❌ Test SMTP :",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Connexion SMTP impossible.",

          error:
            process.env.NODE_ENV ===
            "production"
              ? undefined
              : error.message,
        });
    }
  }
);

/* =====================================================
   TEST MYSQL
===================================================== */

app.get(
  "/api/db-test",
  async (req, res) => {
    try {
      const [rows] =
        await db.query(`
          SELECT
            NOW() AS current_time,
            DATABASE() AS database_name
        `);

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Connexion Aiven MySQL réussie.",

          database:
            rows[0]
              .database_name,

          database_time:
            rows[0]
              .current_time,
        });
    } catch (error) {
      console.error(
        "Erreur pendant le test MySQL :",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Erreur de connexion à la base de données.",
        });
    }
  }
);

/* =====================================================
   SOCKET.IO
===================================================== */

io.on(
  "connection",
  (socket) => {
    console.log(
      `🟢 Socket.IO connecté : ${socket.id}`
    );

    /* ===================================================
       REJOINDRE UNE COMMANDE
    =================================================== */

    socket.on(
      "join-order",
      (orderId) => {
        const normalizedOrderId =
          Number(orderId);

        if (
          !Number.isInteger(
            normalizedOrderId
          ) ||
          normalizedOrderId <= 0
        ) {
          socket.emit(
            "socket-error",
            {
              success: false,

              message:
                "Identifiant de commande invalide.",
            }
          );

          return;
        }

        const roomName =
          `order-${normalizedOrderId}`;

        socket.join(
          roomName
        );

        socket.emit(
          "joined-order",
          {
            success: true,

            orderId:
              normalizedOrderId,

            room:
              roomName,
          }
        );

        console.log(
          `📦 Socket ${socket.id} a rejoint ${roomName}`
        );
      }
    );

    /* ===================================================
       QUITTER UNE COMMANDE
    =================================================== */

    socket.on(
      "leave-order",
      (orderId) => {
        const normalizedOrderId =
          Number(orderId);

        if (
          !Number.isInteger(
            normalizedOrderId
          ) ||
          normalizedOrderId <= 0
        ) {
          return;
        }

        const roomName =
          `order-${normalizedOrderId}`;

        socket.leave(
          roomName
        );

        socket.emit(
          "left-order",
          {
            success: true,

            orderId:
              normalizedOrderId,

            room:
              roomName,
          }
        );

        console.log(
          `📤 Socket ${socket.id} a quitté ${roomName}`
        );
      }
    );

    /* ===================================================
       POSITION CHAUFFEUR
    =================================================== */

    socket.on(
      "driver-location-update",
      (data) => {
        const {
          orderId,
          driverId,
          latitude,
          longitude,
          speed = null,
          heading = null,
        } = data || {};

        const normalizedOrderId =
          Number(orderId);

        const normalizedDriverId =
          Number(driverId);

        const normalizedLatitude =
          Number(latitude);

        const normalizedLongitude =
          Number(longitude);

        if (
          !Number.isInteger(
            normalizedOrderId
          ) ||
          normalizedOrderId <= 0 ||
          !Number.isInteger(
            normalizedDriverId
          ) ||
          normalizedDriverId <= 0 ||
          !Number.isFinite(
            normalizedLatitude
          ) ||
          !Number.isFinite(
            normalizedLongitude
          )
        ) {
          socket.emit(
            "socket-error",
            {
              success: false,

              message:
                "Données GPS invalides.",
            }
          );

          return;
        }

        if (
          normalizedLatitude <
            -90 ||
          normalizedLatitude >
            90 ||
          normalizedLongitude <
            -180 ||
          normalizedLongitude >
            180
        ) {
          socket.emit(
            "socket-error",
            {
              success: false,

              message:
                "Coordonnées GPS invalides.",
            }
          );

          return;
        }

        const locationData = {
          orderId:
            normalizedOrderId,

          driverId:
            normalizedDriverId,

          latitude:
            normalizedLatitude,

          longitude:
            normalizedLongitude,

          speed:
            speed !== null &&
            Number.isFinite(
              Number(speed)
            )
              ? Number(speed)
              : null,

          heading:
            heading !== null &&
            Number.isFinite(
              Number(heading)
            )
              ? Number(heading)
              : null,

          timestamp:
            new Date()
              .toISOString(),
        };

        io.to(
          `order-${normalizedOrderId}`
        ).emit(
          "order-location-update",
          locationData
        );
      }
    );

    /* ===================================================
       DÉCONNEXION
    =================================================== */

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          `🔴 Socket.IO déconnecté : ${socket.id}`,
          `Raison : ${reason}`
        );
      }
    );

    socket.on(
      "error",
      (error) => {
        console.error(
          `Erreur Socket.IO ${socket.id} :`,
          error
        );
      }
    );
  }
);

/* =====================================================
   ROUTE INTROUVABLE
===================================================== */

app.use(
  (req, res) => {
    return res
      .status(404)
      .json({
        success: false,

        message:
          `Route introuvable : ${req.method} ${req.originalUrl}`,
      });
  }
);

/* =====================================================
   ERREURS GLOBALES
===================================================== */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Erreur interne du serveur :",
      error
    );

    if (
      error.message?.includes(
        "CORS"
      )
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "Origine non autorisée.",
        });
    }

    if (
      error instanceof
        SyntaxError &&
      error.status === 400
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Le format JSON envoyé est invalide.",
        });
    }

    return res
      .status(
        error.status || 500
      )
      .json({
        success: false,

        message:
          process.env.NODE_ENV ===
          "production"
            ? "Une erreur interne est survenue."
            : error.message ||
              "Une erreur interne est survenue.",
      });
  }
);

/* =====================================================
   TEST MYSQL AU DÉMARRAGE
===================================================== */

const testDatabaseConnection =
  async () => {
    let connection;

    try {
      connection =
        await db.getConnection();

      await connection.query(
        "SELECT 1"
      );

      console.log(
        "✅ Connexion à Aiven MySQL réussie."
      );

      return true;
    } catch (error) {
      console.error(
        "❌ Erreur de connexion MySQL :",
        error.message
      );

      return false;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  };

/* =====================================================
   TEST SMTP AU DÉMARRAGE
===================================================== */

const testSmtpConnection =
  async () => {
    try {
      if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASSWORD
      ) {
        console.warn(
          "⚠️ SMTP non configuré."
        );

        return false;
      }

      const nodemailer =
        require("nodemailer");

      const transporter =
        nodemailer.createTransport({
          host:
            process.env.SMTP_HOST,

          port:
            Number(
              process.env.SMTP_PORT ||
                465
            ),

          secure: true,

          auth: {
            user:
              process.env.SMTP_USER,

            pass:
              process.env
                .SMTP_PASSWORD,
          },
        });

      await transporter.verify();

      console.log(
        "✅ Connexion SMTP Hostinger réussie."
      );

      return true;
    } catch (error) {
      console.error(
        "❌ Connexion SMTP impossible :",
        error.message
      );

      return false;
    }
  };

/* =====================================================
   ARRÊT PROPRE
===================================================== */

let isShuttingDown =
  false;

const shutdownServer =
  (signal) => {
    if (
      isShuttingDown
    ) {
      return;
    }

    isShuttingDown =
      true;

    console.log(
      `\n⚠️ Signal reçu : ${signal}`
    );

    console.log(
      "Arrêt du serveur en cours..."
    );

    server.close(
      async () => {
        console.log(
          "✅ Serveur HTTP arrêté."
        );

        try {
          io.close();

          if (
            typeof db.end ===
            "function"
          ) {
            await db.end();

            console.log(
              "✅ Connexion MySQL fermée."
            );
          }
        } catch (error) {
          console.error(
            "Erreur pendant la fermeture :",
            error.message
          );
        }

        process.exit(0);
      }
    );

    setTimeout(
      () => {
        console.error(
          "❌ Arrêt forcé après expiration du délai."
        );

        process.exit(1);
      },
      10000
    );
  };

process.on(
  "SIGINT",
  () => {
    shutdownServer(
      "SIGINT"
    );
  }
);

process.on(
  "SIGTERM",
  () => {
    shutdownServer(
      "SIGTERM"
    );
  }
);

/* =====================================================
   ERREURS NON GÉRÉES
===================================================== */

process.on(
  "unhandledRejection",
  (reason) => {
    console.error(
      "Promesse rejetée sans gestion :",
      reason
    );
  }
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "Exception non interceptée :",
      error
    );

    shutdownServer(
      "uncaughtException"
    );
  }
);

/* =====================================================
   DÉMARRAGE
===================================================== */

const startServer =
  async () => {
    const databaseConnected =
      await testDatabaseConnection();

    if (
      !databaseConnected
    ) {
      console.error(
        "Le serveur ne peut pas démarrer sans connexion à MySQL."
      );

      process.exit(1);
    }

    /*
      SMTP n'empêche pas le backend
      de démarrer si le mail est mal configuré.
    */

    await testSmtpConnection();

    server.listen(
      PORT,
      HOST,
      () => {
        console.log("");

        console.log(
          "=========================================="
        );

        console.log(
          "🚀 TRANSPORT PLATFORM BACKEND"
        );

        console.log(
          "=========================================="
        );

        console.log(
          `🌐 Local : http://localhost:${PORT}`
        );

        console.log(
          `🌐 Réseau : http://172.20.10.6:${PORT}`
        );

        console.log(
          `❤️ Health : http://localhost:${PORT}/api/health`
        );

        console.log(
          `🗄️ Database : http://localhost:${PORT}/api/db-test`
        );

        console.log(
          `📧 Test SMTP : http://localhost:${PORT}/api/contact/test`
        );

        console.log(
          `📩 Contact : POST http://localhost:${PORT}/api/contact`
        );

        console.log(
          `📊 Dashboard stats : http://localhost:${PORT}/api/dashboard/stats`
        );

        console.log(
          `📈 Dashboard overview : http://localhost:${PORT}/api/dashboard/overview`
        );

        console.log(
          `📦 Commandes : http://localhost:${PORT}/api/orders`
        );

        console.log(
          `🧑 Utilisateurs : http://localhost:${PORT}/api/users`
        );

        console.log(
          `🏢 Clients : http://localhost:${PORT}/api/clients`
        );

        console.log(
          `🚚 Chauffeurs : http://localhost:${PORT}/api/drivers`
        );

        console.log(
          `⚙️ Environnement : ${
            process.env.NODE_ENV ||
            "development"
          }`
        );

        console.log(
          "=========================================="
        );

        console.log("");
      }
    );
  };

startServer();
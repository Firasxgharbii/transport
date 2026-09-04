const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

/* ============================================================
   VARIABLES D'ENVIRONNEMENT
============================================================ */

dotenv.config();

/* ============================================================
   BASE DE DONNÉES
============================================================ */

const db = require("./config/db");

/* ============================================================
   ROUTES
============================================================ */

const authRoutes = require(
  "./routes/authRoutes"
);

const userRoutes = require(
  "./routes/userRoutes"
);

const registrationRequestRoutes = require(
  "./routes/registrationRequestRoutes"
);

const clientRoutes = require(
  "./routes/clientRoutes"
);

const driverRoutes = require(
  "./routes/driverRoutes"
);

const vehicleRoutes = require(
  "./routes/vehicleRoutes"
);

const orderRoutes = require(
  "./routes/orderRoutes"
);

const dispatchRoutes = require("./routes/dispatchRoutes");

const dashboardRoutes = require(
  "./routes/dashboardRoutes"
);

const contactRoutes = require(
  "./routes/contactRoutes"
);

const quoteRoutes = require(
  "./routes/quoteRoutes"
);

const notificationRoutes = require(
  "./routes/notificationRoutes"
);

const NotificationModel = require(
  "./models/notificationModel"
);

/* ============================================================
   NOUVEAU — TRACKING GPS
============================================================ */

const trackingRoutes = require(
  "./routes/trackingRoutes"
);

/* ============================================================
   EXPRESS + SERVEUR HTTP
============================================================ */

const app = express();

const server = http.createServer(app);

const PORT =
  Number(process.env.PORT) || 5000;

const HOST =
  process.env.HOST || "0.0.0.0";

/* ============================================================
   CORS
============================================================ */

const allowedOrigins = [
  process.env.FRONTEND_URL,

  /* LOCAL */

  "http://localhost:3000",
  "http://127.0.0.1:3000",

  "http://172.20.10.6:3000",
  "http://192.168.2.22:3000",
  "http://192.168.2.47:3000",

  /* PRODUCTION */

  "https://glorysolutions.ca",
  "https://www.glorysolutions.ca",
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    /*
     * Autorise notamment :
     * - curl
     * - Postman
     * - requêtes serveur
     * - certains clients mobiles
     */

    if (!origin) {
      return callback(
        null,
        true
      );
    }

    /*
     * En développement local,
     * accepter les origines locales.
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
     * Production :
     * seulement les domaines autorisés.
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

/* ============================================================
   SOCKET.IO
============================================================ */

const io = new Server(
  server,
  {
    cors: corsOptions,

    /*
     * WebSocket en priorité.
     * Polling reste disponible en fallback.
     */

    transports: [
      "websocket",
      "polling",
    ],
  }
);

/* ============================================================
   MIDDLEWARES EXPRESS
============================================================ */

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

/* ============================================================
   RENDRE SOCKET.IO ACCESSIBLE AUX CONTROLLERS

   trackingController peut maintenant faire :

   const io = req.app.get("io");
============================================================ */

app.set(
  "io",
  io
);

/* ============================================================
   ROUTES API
============================================================ */

/* ------------------------------------------------------------
   AUTHENTIFICATION
------------------------------------------------------------ */

app.use(
  "/api/auth",
  authRoutes
);

/* ------------------------------------------------------------
   UTILISATEURS
------------------------------------------------------------ */

app.use(
  "/api/users",
  userRoutes
);

/* ------------------------------------------------------------
   DEMANDES D'INSCRIPTION
------------------------------------------------------------ */

app.use(
  "/api/registration-requests",
  registrationRequestRoutes
);

/* ------------------------------------------------------------
   CLIENTS
------------------------------------------------------------ */

app.use(
  "/api/clients",
  clientRoutes
);

/* ------------------------------------------------------------
   CHAUFFEURS
------------------------------------------------------------ */

app.use(
  "/api/drivers",
  driverRoutes
);

/* ------------------------------------------------------------
   VÉHICULES
------------------------------------------------------------ */

app.use(
  "/api/vehicles",
  vehicleRoutes
);

/* ------------------------------------------------------------
   COMMANDES
------------------------------------------------------------ */

app.use(
  "/api/orders",
  orderRoutes
);

app.use("/api/dispatch", dispatchRoutes);

/* ------------------------------------------------------------
   TRACKING GPS — NOUVEAU
------------------------------------------------------------ */

app.use(
  "/api/tracking",
  trackingRoutes
);

/* ------------------------------------------------------------
   DASHBOARD
------------------------------------------------------------ */

app.use(
  "/api/dashboard",
  dashboardRoutes
);

/* ------------------------------------------------------------
   CONTACT
------------------------------------------------------------ */

app.use(
  "/api/contact",
  contactRoutes
);

/* ------------------------------------------------------------
   SOUMISSIONS
------------------------------------------------------------ */

app.use(
  "/api/quote",
  quoteRoutes
);

/* ------------------------------------------------------------
   NOTIFICATIONS
------------------------------------------------------------ */

app.use(
  "/api/notifications",
  notificationRoutes
);

/* ============================================================
   ROUTE PRINCIPALE
============================================================ */

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

        tracking: true,

        socket: true,

        timestamp:
          new Date().toISOString(),
      });
  }
);

/* ============================================================
   HEALTH CHECK
============================================================ */

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

        features: {
          database: true,
          socketIO: true,
          tracking: true,
          notifications: true,
        },

        timestamp:
          new Date().toISOString(),
      });
  }
);

/* ============================================================
   TEST MYSQL
============================================================ */

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
            rows[0].database_name,

          database_time:
            rows[0].current_time,
        });
    } catch (error) {
      console.error(
        "Erreur test MySQL :",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Erreur de connexion à la base de données.",

          error:
            process.env.NODE_ENV ===
            "production"
              ? undefined
              : error.message,
        });
    }
  }
);

/* ============================================================
   TEST SMTP
============================================================ */

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

      const smtpPort =
        Number(
          process.env.SMTP_PORT ||
            465
        );

      const transporter =
        nodemailer.createTransport({
          host:
            process.env.SMTP_HOST,

          port:
            smtpPort,

          secure:
            smtpPort === 465,

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
            smtpPort,

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

/* ============================================================
   SOCKET.IO — AUTHENTIFICATION DES NOTIFICATIONS

   Le frontend doit envoyer :
   io(API_URL, {
     auth: { token }
   })

   Les anciennes fonctions tracking restent compatibles.
============================================================ */

io.use((socket, next) => {
  try {
    const rawToken =
      socket.handshake?.auth?.token ||
      socket.handshake?.headers?.authorization ||
      "";

    const token = String(rawToken).replace(
      /^Bearer\s+/i,
      "",
    );

    if (!token) {
      /*
       * On autorise encore la connexion pour ne pas casser
       * le tracking existant. Les rooms privées de notifications
       * ne seront simplement pas rejointes.
       */
      socket.user = null;
      return next();
    }

    if (!process.env.JWT_SECRET) {
      console.warn(
        "⚠️ JWT_SECRET absent : authentification Socket.IO ignorée.",
      );
      socket.user = null;
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
    );

    socket.user = {
      id:
        decoded.id ||
        decoded.user_id ||
        decoded.sub ||
        null,

      role:
        decoded.role ||
        decoded.role_name ||
        null,

      email:
        decoded.email ||
        null,
    };

    return next();
  } catch (error) {
    console.warn(
      "⚠️ Token Socket.IO invalide :",
      error.message,
    );

    /*
     * On n'interrompt pas la connexion afin de préserver
     * le tracking GPS existant.
     */
    socket.user = null;
    return next();
  }
});

/* ============================================================
   SOCKET.IO — TRACKING TEMPS RÉEL
============================================================ */

io.on(
  "connection",
  (socket) => {
    console.log(
      `🟢 Socket.IO connecté : ${socket.id}`
    );


    /* ========================================================
       NOTIFICATIONS PRIVÉES
    ======================================================== */

    if (socket.user?.id) {
      socket.join(
        `user:${Number(socket.user.id)}`,
      );
    }

    if (socket.user?.role) {
      socket.join(
        `role:${String(socket.user.role)}`,
      );
    }

    if (
      socket.user?.role === "super_admin" ||
      socket.user?.role === "dispatcher"
    ) {
      socket.join(
        "notifications:admin",
      );
    }

    socket.emit(
      "notifications:ready",
      {
        success: true,
        authenticated:
          Boolean(socket.user?.id),

        userId:
          socket.user?.id || null,

        role:
          socket.user?.role || null,
      },
    );

    /* ========================================================
       ADMIN / DISPATCHER

       Le dashboard admin peut rejoindre cette room pour
       recevoir les positions de tous les chauffeurs.
    ======================================================== */

    socket.on(
      "join-tracking",
      () => {
        socket.join(
          "tracking"
        );

        socket.emit(
          "tracking:joined",
          {
            success: true,

            room:
              "tracking",
          }
        );

        console.log(
          `🗺️ ${socket.id} → tracking`
        );
      }
    );

    /* ========================================================
       REJOINDRE LE CANAL D'UN CHAUFFEUR
    ======================================================== */

    socket.on(
      "join-driver",
      (driverId) => {
        const normalizedDriverId =
          Number(driverId);

        if (
          !Number.isInteger(
            normalizedDriverId
          ) ||
          normalizedDriverId <= 0
        ) {
          socket.emit(
            "socket:error",
            {
              success: false,

              message:
                "Identifiant chauffeur invalide.",
            }
          );

          return;
        }

        const roomName =
          `driver:${normalizedDriverId}`;

        socket.join(
          roomName
        );

        socket.emit(
          "driver:joined",
          {
            success: true,

            driverId:
              normalizedDriverId,

            room:
              roomName,
          }
        );

        console.log(
          `🚚 ${socket.id} → ${roomName}`
        );
      }
    );

    /* ========================================================
       QUITTER LE CANAL D'UN CHAUFFEUR
    ======================================================== */

    socket.on(
      "leave-driver",
      (driverId) => {
        const normalizedDriverId =
          Number(driverId);

        if (
          !Number.isInteger(
            normalizedDriverId
          ) ||
          normalizedDriverId <= 0
        ) {
          return;
        }

        socket.leave(
          `driver:${normalizedDriverId}`
        );
      }
    );

    /* ========================================================
       REJOINDRE UNE COMMANDE

       IMPORTANT :
       même format que trackingController :
       order:123
    ======================================================== */

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
            "socket:error",
            {
              success: false,

              message:
                "Identifiant de commande invalide.",
            }
          );

          return;
        }

        const roomName =
          `order:${normalizedOrderId}`;

        socket.join(
          roomName
        );

        socket.emit(
          "order:joined",
          {
            success: true,

            orderId:
              normalizedOrderId,

            room:
              roomName,
          }
        );

        console.log(
          `📦 ${socket.id} → ${roomName}`
        );
      }
    );

    /* ========================================================
       QUITTER UNE COMMANDE
    ======================================================== */

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

        socket.leave(
          `order:${normalizedOrderId}`
        );

        socket.emit(
          "order:left",
          {
            success: true,

            orderId:
              normalizedOrderId,
          }
        );
      }
    );

    /* ========================================================
       POSITION GPS EN TEMPS RÉEL

       Cette méthode Socket.IO sert à transmettre rapidement
       une position.

       L'enregistrement permanent MySQL sera fait par :
       POST /api/tracking/location

       On ne fait PAS directement d'INSERT MySQL ici.
    ======================================================== */

    socket.on(
      "driver:location:update",
      (data) => {
        const {
          driverId,
          orderId = null,
          latitude,
          longitude,
          speed = null,
          heading = null,
          accuracy = null,
          batteryLevel = null,
        } = data || {};

        const normalizedDriverId =
          Number(driverId);

        const normalizedOrderId =
          orderId
            ? Number(orderId)
            : null;

        const normalizedLatitude =
          Number(latitude);

        const normalizedLongitude =
          Number(longitude);

        /* ----------------------------------------------------
           VALIDATION DRIVER
        ---------------------------------------------------- */

        if (
          !Number.isInteger(
            normalizedDriverId
          ) ||
          normalizedDriverId <= 0
        ) {
          socket.emit(
            "socket:error",
            {
              success: false,

              message:
                "Identifiant chauffeur invalide.",
            }
          );

          return;
        }

        /* ----------------------------------------------------
           VALIDATION ORDER
        ---------------------------------------------------- */

        if (
          normalizedOrderId !== null &&
          (
            !Number.isInteger(
              normalizedOrderId
            ) ||
            normalizedOrderId <= 0
          )
        ) {
          socket.emit(
            "socket:error",
            {
              success: false,

              message:
                "Identifiant commande invalide.",
            }
          );

          return;
        }

        /* ----------------------------------------------------
           VALIDATION GPS
        ---------------------------------------------------- */

        if (
          !Number.isFinite(
            normalizedLatitude
          ) ||
          !Number.isFinite(
            normalizedLongitude
          ) ||
          normalizedLatitude < -90 ||
          normalizedLatitude > 90 ||
          normalizedLongitude < -180 ||
          normalizedLongitude > 180
        ) {
          socket.emit(
            "socket:error",
            {
              success: false,

              message:
                "Coordonnées GPS invalides.",
            }
          );

          return;
        }

        /* ----------------------------------------------------
           PAYLOAD
        ---------------------------------------------------- */

        const locationData = {
          driver_id:
            normalizedDriverId,

          order_id:
            normalizedOrderId,

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

          accuracy:
            accuracy !== null &&
            Number.isFinite(
              Number(accuracy)
            )
              ? Number(accuracy)
              : null,

          battery_level:
            batteryLevel !== null &&
            Number.isFinite(
              Number(batteryLevel)
            )
              ? Number(batteryLevel)
              : null,

          recorded_at:
            new Date()
              .toISOString(),
        };

        /* ----------------------------------------------------
           ADMIN / DISPATCH
        ---------------------------------------------------- */

        io.to(
          "tracking"
        ).emit(
          "driver:location",
          locationData
        );

        /* ----------------------------------------------------
           ROOM DU CHAUFFEUR
        ---------------------------------------------------- */

        io.to(
          `driver:${normalizedDriverId}`
        ).emit(
          "driver:location",
          locationData
        );

        /* ----------------------------------------------------
           ROOM COMMANDE
        ---------------------------------------------------- */

        if (
          normalizedOrderId
        ) {
          io.to(
            `order:${normalizedOrderId}`
          ).emit(
            "order:location",
            locationData
          );
        }
      }
    );

    /* ========================================================
       DÉCONNEXION
    ======================================================== */

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          `🔴 Socket.IO déconnecté : ${socket.id}`,
          `Raison : ${reason}`
        );
      }
    );

    /* ========================================================
       ERREUR SOCKET
    ======================================================== */

    socket.on(
      "error",
      (error) => {
        console.error(
          `❌ Socket.IO ${socket.id} :`,
          error
        );
      }
    );
  }
);

/* ============================================================
   ROUTE INTROUVABLE

   TOUJOURS APRÈS LES ROUTES app.use("/api/...")
============================================================ */

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

/* ============================================================
   ERREURS GLOBALES
============================================================ */

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

    /* --------------------------------------------------------
       CORS
    -------------------------------------------------------- */

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

    /* --------------------------------------------------------
       JSON INVALIDE
    -------------------------------------------------------- */

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

    /* --------------------------------------------------------
       AUTRES ERREURS
    -------------------------------------------------------- */

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

/* ============================================================
   TEST MYSQL AU DÉMARRAGE
============================================================ */

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

/* ============================================================
   TEST SMTP AU DÉMARRAGE
============================================================ */

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

      const smtpPort =
        Number(
          process.env.SMTP_PORT ||
            465
        );

      const transporter =
        nodemailer.createTransport({
          host:
            process.env.SMTP_HOST,

          port:
            smtpPort,

          secure:
            smtpPort === 465,

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

/* ============================================================
   ARRÊT PROPRE
============================================================ */

let isShuttingDown = false;

const shutdownServer =
  (signal) => {
    if (
      isShuttingDown
    ) {
      return;
    }

    isShuttingDown = true;

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

    /*
     * Sécurité :
     * arrêter de force après 10 secondes.
     */

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

/* ============================================================
   ERREURS NON GÉRÉES
============================================================ */

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

/* ============================================================
   DÉMARRAGE DU SERVEUR
============================================================ */

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

    try {
      await NotificationModel.ensureTable();

      console.log(
        "✅ Table notifications prête.",
      );
    } catch (error) {
      console.error(
        "❌ Initialisation notifications :",
        error.message,
      );

      process.exit(1);
    }

    /*
     * Une erreur SMTP ne doit pas empêcher
     * le backend de démarrer.
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
          `❤️ Health : http://localhost:${PORT}/api/health`
        );

        console.log(
          `🗄️ Database : http://localhost:${PORT}/api/db-test`
        );

        console.log(
          `📧 SMTP : http://localhost:${PORT}/api/contact/test`
        );

        console.log(
          `📊 Dashboard : http://localhost:${PORT}/api/dashboard/stats`
        );

        console.log(
          `📦 Commandes : http://localhost:${PORT}/api/orders`
        );

        console.log(
          `👤 Utilisateurs : http://localhost:${PORT}/api/users`
        );

        console.log(
          `🏢 Clients : http://localhost:${PORT}/api/clients`
        );

        console.log(
          `🚚 Chauffeurs : http://localhost:${PORT}/api/drivers`
        );

        console.log(
          `🚛 Véhicules : http://localhost:${PORT}/api/vehicles`
        );

        /* ====================================================
           TRACKING
        ==================================================== */

        console.log(
          `📍 Tracking : http://localhost:${PORT}/api/tracking`
        );

        console.log(
          `🗺️ Positions : http://localhost:${PORT}/api/tracking/drivers`
        );

        console.log(
          `📡 Socket.IO : activé`
        );

        console.log(
          `🔔 Notifications : http://localhost:${PORT}/api/notifications`
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

/* ============================================================
   LANCEMENT
============================================================ */

startServer();
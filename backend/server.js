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

const DriverModel = require(
  "./models/driverModel"
);

const ClientModel = require(
  "./models/clientModel"
);

const TrackingModel = require(
  "./models/trackingModel"
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

const normalizeOrigin = (value) => {
  if (!value) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/\/+$/, "");
};

const allowedOrigins = [
  process.env.FRONTEND_URL,

  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://172.20.10.6:3000",
  "http://192.168.2.22:3000",
  "http://192.168.2.47:3000",

  "https://glorysolutions.ca",
  "https://www.glorysolutions.ca",
]
  .filter(Boolean)
  .map(normalizeOrigin);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin =
    normalizeOrigin(origin);

  if (
    normalizedOrigin ===
      "https://glorysolutions.ca" ||
    normalizedOrigin ===
      "https://www.glorysolutions.ca"
  ) {
    return true;
  }

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    try {
      const parsedOrigin =
        new URL(normalizedOrigin);

      const localHosts = new Set([
        "localhost",
        "127.0.0.1",
        "172.20.10.6",
        "192.168.2.22",
        "192.168.2.47",
      ]);

      if (
        localHosts.has(
          parsedOrigin.hostname
        )
      ) {
        return true;
      }
    } catch (error) {
      console.warn(
        "⚠️ Origine locale CORS invalide :",
        normalizedOrigin
      );
    }
  }

  return allowedOrigins.includes(
    normalizedOrigin
  );
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
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
    "Accept",
    "Origin",
    "X-Requested-With",
  ],

  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false,
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
   SOCKET.IO — AUTHENTIFICATION SÉCURISÉE

   Toutes les fonctions Socket.IO de cette plateforme sont privées.

   Le frontend doit envoyer :
   io(API_URL, {
     auth: { token }
   })
============================================================ */

const SOCKET_ALLOWED_ROLES = new Set([
  "super_admin",
  "dispatcher",
  "driver",
  "client",
]);

const socketPositiveInteger = (value) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const socketOptionalNumber = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const emitSocketError = (
  socket,
  message,
  code = "FORBIDDEN"
) => {
  socket.emit(
    "socket:error",
    {
      success: false,
      code,
      message,
    }
  );
};

io.use((socket, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error(
        "❌ JWT_SECRET absent : connexion Socket.IO refusée."
      );

      return next(
        new Error(
          "Configuration d'authentification indisponible."
        )
      );
    }

    const rawToken =
      socket.handshake?.auth?.token ||
      socket.handshake?.headers?.authorization ||
      "";

    const token = String(rawToken)
      .replace(
        /^Bearer\s+/i,
        ""
      )
      .trim();

    if (!token) {
      return next(
        new Error(
          "Authentification requise."
        )
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        issuer:
          "glory-solutions",

        audience:
          "transport-platform",
      }
    );

    const userId =
      socketPositiveInteger(
        decoded.id
      );

    const role =
      typeof decoded.role === "string"
        ? decoded.role.trim()
        : "";

    if (
      !userId ||
      !SOCKET_ALLOWED_ROLES.has(
        role
      )
    ) {
      return next(
        new Error(
          "Identité Socket.IO invalide."
        )
      );
    }

    socket.user = {
      id: userId,
      role,
      email:
        typeof decoded.email === "string"
          ? decoded.email
          : null,
    };

    return next();
  } catch (error) {
    console.warn(
      "⚠️ Connexion Socket.IO refusée :",
      error.message
    );

    return next(
      new Error(
        "Token invalide ou expiré."
      )
    );
  }
});

/* ============================================================
   SOCKET.IO — TRACKING TEMPS RÉEL SÉCURISÉ
============================================================ */

io.on(
  "connection",
  (socket) => {
    console.log(
      `🟢 Socket.IO connecté : ${socket.id}`
    );

    /* ========================================================
       ROOMS PRIVÉES AUTOMATIQUES
    ======================================================== */

    socket.join(
      `user:${socket.user.id}`
    );

    socket.join(
      `role:${socket.user.role}`
    );

    if (
      socket.user.role ===
        "super_admin" ||
      socket.user.role ===
        "dispatcher"
    ) {
      socket.join(
        "notifications:admin"
      );
    }

    socket.emit(
      "notifications:ready",
      {
        success: true,
        authenticated: true,
        userId:
          socket.user.id,
        role:
          socket.user.role,
      }
    );

    /* ========================================================
       ADMIN / DISPATCHER — TRACKING GLOBAL
    ======================================================== */

    socket.on(
      "join-tracking",
      () => {
        if (
          socket.user.role !==
            "super_admin" &&
          socket.user.role !==
            "dispatcher"
        ) {
          emitSocketError(
            socket,
            "Accès au tracking global refusé.",
            "TRACKING_ACCESS_DENIED"
          );

          return;
        }

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

       - super_admin / dispatcher : tous les chauffeurs
       - driver : uniquement son propre canal
       - client : jamais
    ======================================================== */

    socket.on(
      "join-driver",
      async (driverId) => {
        try {
          const requestedDriverId =
            socketPositiveInteger(
              driverId
            );

          if (!requestedDriverId) {
            emitSocketError(
              socket,
              "Identifiant chauffeur invalide.",
              "INVALID_DRIVER_ID"
            );

            return;
          }

          if (
            socket.user.role ===
              "client"
          ) {
            emitSocketError(
              socket,
              "Accès au canal chauffeur refusé.",
              "DRIVER_ACCESS_DENIED"
            );

            return;
          }

          if (
            socket.user.role ===
              "driver"
          ) {
            const driver =
              await DriverModel.getDriverByUserId(
                socket.user.id
              );

            if (
              !driver ||
              Number(driver.id) !==
                requestedDriverId
            ) {
              emitSocketError(
                socket,
                "Vous ne pouvez accéder qu'à votre propre canal chauffeur.",
                "DRIVER_ACCESS_DENIED"
              );

              return;
            }
          } else {
            const driver =
              await DriverModel.getDriverById(
                requestedDriverId
              );

            if (!driver) {
              emitSocketError(
                socket,
                "Chauffeur introuvable.",
                "DRIVER_NOT_FOUND"
              );

              return;
            }
          }

          const roomName =
            `driver:${requestedDriverId}`;

          socket.join(
            roomName
          );

          socket.emit(
            "driver:joined",
            {
              success: true,
              driverId:
                requestedDriverId,
              room:
                roomName,
            }
          );

          console.log(
            `🚚 ${socket.id} → ${roomName}`
          );
        } catch (error) {
          console.error(
            "Erreur join-driver :",
            error
          );

          emitSocketError(
            socket,
            "Impossible de rejoindre le canal chauffeur.",
            "DRIVER_JOIN_ERROR"
          );
        }
      }
    );

    socket.on(
      "leave-driver",
      (driverId) => {
        const normalizedDriverId =
          socketPositiveInteger(
            driverId
          );

        if (!normalizedDriverId) {
          return;
        }

        socket.leave(
          `driver:${normalizedDriverId}`
        );
      }
    );

    /* ========================================================
       REJOINDRE LE CANAL D'UNE COMMANDE

       - super_admin / dispatcher : autorisés
       - driver : commande assignée à ce chauffeur
       - client : commande appartenant à ce client
    ======================================================== */

    socket.on(
      "join-order",
      async (orderId) => {
        try {
          const normalizedOrderId =
            socketPositiveInteger(
              orderId
            );

          if (!normalizedOrderId) {
            emitSocketError(
              socket,
              "Identifiant de commande invalide.",
              "INVALID_ORDER_ID"
            );

            return;
          }

          const order =
            await TrackingModel.orderExists(
              normalizedOrderId
            );

          if (!order) {
            emitSocketError(
              socket,
              "Commande introuvable.",
              "ORDER_NOT_FOUND"
            );

            return;
          }

          if (
            socket.user.role ===
              "driver"
          ) {
            const driver =
              await DriverModel.getDriverByUserId(
                socket.user.id
              );

            if (
              !driver ||
              !order.driver_id ||
              Number(order.driver_id) !==
                Number(driver.id)
            ) {
              emitSocketError(
                socket,
                "Vous n'êtes pas autorisé à suivre cette commande.",
                "ORDER_ACCESS_DENIED"
              );

              return;
            }
          }

          if (
            socket.user.role ===
              "client"
          ) {
            const client =
              await ClientModel.getClientByUserId(
                socket.user.id
              );

            if (
              !client ||
              Number(order.client_id) !==
                Number(client.id)
            ) {
              /*
               * Message volontairement générique :
               * ne pas révéler l'existence d'une commande
               * appartenant à un autre client.
               */
              emitSocketError(
                socket,
                "Commande introuvable.",
                "ORDER_NOT_FOUND"
              );

              return;
            }
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
        } catch (error) {
          console.error(
            "Erreur join-order :",
            error
          );

          emitSocketError(
            socket,
            "Impossible de rejoindre le canal de la commande.",
            "ORDER_JOIN_ERROR"
          );
        }
      }
    );

    socket.on(
      "leave-order",
      (orderId) => {
        const normalizedOrderId =
          socketPositiveInteger(
            orderId
          );

        if (!normalizedOrderId) {
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
       POSITION GPS TEMPS RÉEL

       IMPORTANT :
       - uniquement un compte driver
       - driver_id réel dérivé du JWT
       - order_id contrôlé en base
       - aucun INSERT MySQL ici
       - POST /api/tracking/location reste la source persistante
    ======================================================== */

    let lastRealtimeLocationAt = 0;

    socket.on(
      "driver:location:update",
      async (data) => {
        try {
          if (
            socket.user.role !==
              "driver"
          ) {
            emitSocketError(
              socket,
              "Seul un chauffeur peut transmettre une position GPS.",
              "LOCATION_UPDATE_DENIED"
            );

            return;
          }

          /*
           * Limite simple par connexion afin d'empêcher
           * un client compromis de saturer le serveur
           * avec des milliers d'événements par seconde.
           */
          const now =
            Date.now();

          if (
            now -
              lastRealtimeLocationAt <
            250
          ) {
            return;
          }

          lastRealtimeLocationAt =
            now;

          const driver =
            await DriverModel.getDriverByUserId(
              socket.user.id
            );

          if (!driver) {
            emitSocketError(
              socket,
              "Profil chauffeur introuvable.",
              "DRIVER_PROFILE_NOT_FOUND"
            );

            return;
          }

          const {
            driverId:
              suppliedDriverId = null,
            orderId = null,
            latitude,
            longitude,
            speed = null,
            heading = null,
            accuracy = null,
            batteryLevel = null,
          } = data || {};

          const realDriverId =
            Number(driver.id);

          /*
           * Compatibilité frontend :
           * driverId peut encore être envoyé,
           * mais il ne constitue jamais l'identité.
           */
          if (
            suppliedDriverId !== null &&
            suppliedDriverId !== undefined &&
            suppliedDriverId !== ""
          ) {
            const normalizedSuppliedDriverId =
              socketPositiveInteger(
                suppliedDriverId
              );

            if (
              !normalizedSuppliedDriverId ||
              normalizedSuppliedDriverId !==
                realDriverId
            ) {
              emitSocketError(
                socket,
                "Le chauffeur indiqué ne correspond pas au compte authentifié.",
                "DRIVER_ID_MISMATCH"
              );

              return;
            }
          }

          const normalizedOrderId =
            orderId === null ||
            orderId === undefined ||
            orderId === ""
              ? null
              : socketPositiveInteger(
                  orderId
                );

          if (
            orderId !== null &&
            orderId !== undefined &&
            orderId !== "" &&
            !normalizedOrderId
          ) {
            emitSocketError(
              socket,
              "Identifiant commande invalide.",
              "INVALID_ORDER_ID"
            );

            return;
          }

          if (
            normalizedOrderId
          ) {
            const order =
              await TrackingModel.orderExists(
                normalizedOrderId
              );

            if (
              !order ||
              !order.driver_id ||
              Number(order.driver_id) !==
                realDriverId
            ) {
              emitSocketError(
                socket,
                "Cette commande n'est pas assignée à ce chauffeur.",
                "ORDER_ACCESS_DENIED"
              );

              return;
            }
          }

          const normalizedLatitude =
            Number(latitude);

          const normalizedLongitude =
            Number(longitude);

          if (
            !Number.isFinite(
              normalizedLatitude
            ) ||
            normalizedLatitude < -90 ||
            normalizedLatitude > 90 ||
            !Number.isFinite(
              normalizedLongitude
            ) ||
            normalizedLongitude < -180 ||
            normalizedLongitude > 180
          ) {
            emitSocketError(
              socket,
              "Coordonnées GPS invalides.",
              "INVALID_GPS"
            );

            return;
          }

          const normalizedSpeed =
            socketOptionalNumber(
              speed
            );

          const normalizedHeading =
            socketOptionalNumber(
              heading
            );

          const normalizedAccuracy =
            socketOptionalNumber(
              accuracy
            );

          const normalizedBatteryLevel =
            socketOptionalNumber(
              batteryLevel
            );

          if (
            normalizedSpeed !== null &&
            normalizedSpeed < 0
          ) {
            emitSocketError(
              socket,
              "Vitesse GPS invalide.",
              "INVALID_SPEED"
            );

            return;
          }

          if (
            normalizedHeading !== null &&
            (
              normalizedHeading < 0 ||
              normalizedHeading > 360
            )
          ) {
            emitSocketError(
              socket,
              "Direction GPS invalide.",
              "INVALID_HEADING"
            );

            return;
          }

          if (
            normalizedAccuracy !== null &&
            normalizedAccuracy < 0
          ) {
            emitSocketError(
              socket,
              "Précision GPS invalide.",
              "INVALID_ACCURACY"
            );

            return;
          }

          if (
            normalizedBatteryLevel !== null &&
            (
              normalizedBatteryLevel < 0 ||
              normalizedBatteryLevel > 100
            )
          ) {
            emitSocketError(
              socket,
              "Niveau de batterie invalide.",
              "INVALID_BATTERY"
            );

            return;
          }

          const locationData = {
            driver_id:
              realDriverId,

            order_id:
              normalizedOrderId,

            latitude:
              normalizedLatitude,

            longitude:
              normalizedLongitude,

            speed:
              normalizedSpeed,

            heading:
              normalizedHeading,

            accuracy:
              normalizedAccuracy,

            battery_level:
              normalizedBatteryLevel,

            recorded_at:
              new Date()
                .toISOString(),
          };

          io.to(
            "tracking"
          ).emit(
            "driver:location",
            locationData
          );

          io.to(
            `driver:${realDriverId}`
          ).emit(
            "driver:location",
            locationData
          );

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
        } catch (error) {
          console.error(
            "Erreur driver:location:update :",
            error
          );

          emitSocketError(
            socket,
            "Impossible de transmettre la position GPS.",
            "LOCATION_UPDATE_ERROR"
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

startServer()
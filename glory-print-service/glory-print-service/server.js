const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const os = require("os");
const printerRoutes = require("./routes/printerRoutes");

const app = express();
const PORT = Number(process.env.GLORY_PRINT_PORT || 17891);
const HOST = "127.0.0.1";

const allowedOrigins = new Set(
  [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    process.env.GLORY_SITE_ORIGIN,
  ].filter(Boolean)
);

app.disable("x-powered-by");
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin(origin, callback) {
    // curl/native clients have no Origin. Browser origins must be explicitly trusted.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origine non autorisée par Glory Print."));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Glory-Client"],
  exposedHeaders: ["X-Glory-Print-Fallback"],
}));

app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "Glory Print Service",
    version: "1.0.0",
    platform: os.platform(),
    hostname: os.hostname(),
    labelFormat: "4x6",
    dimensionsMm: "101.6x152.4",
  });
});

app.use("/api", printerRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route introuvable." });
});

app.use((error, _req, res, _next) => {
  console.error("[Glory Print]", error.message);
  res.status(403).json({ success: false, message: error.message || "Requête refusée." });
});

app.listen(PORT, HOST, () => {
  console.log(`Glory Print Service v1.0.0`);
  console.log(`Local: http://${HOST}:${PORT}`);
  console.log(`Health: http://${HOST}:${PORT}/health`);
  console.log(`Printers: http://${HOST}:${PORT}/api/printers`);
  console.log(`Format: 4 × 6 po (101,6 × 152,4 mm)`);
});

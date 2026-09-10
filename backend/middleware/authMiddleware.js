const jwt = require("jsonwebtoken");

const JWT_ISSUER = "glory-solutions";
const JWT_AUDIENCE = "transport-platform";

const ALLOWED_ROLES = new Set([
  "super_admin",
  "dispatcher",
  "driver",
  "client",
]);

module.exports = (req, res, next) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (
      typeof jwtSecret !== "string" ||
      jwtSecret.length < 32
    ) {
      return res.status(500).json({
        message: "Configuration d'authentification invalide.",
      });
    }

    const authHeader = req.headers.authorization;

    if (
      typeof authHeader !== "string" ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        message: "Token manquant.",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token || /\s/.test(token)) {
      return res.status(401).json({
        message: "Token invalide ou expiré.",
      });
    }

    const decoded = jwt.verify(token, jwtSecret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["HS256"],
    });

    if (
      !decoded ||
      typeof decoded !== "object" ||
      Array.isArray(decoded)
    ) {
      return res.status(401).json({
        message: "Token invalide ou expiré.",
      });
    }

    const userId = decoded.id;
    const role = decoded.role;

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      return res.status(401).json({
        message: "Token invalide ou expiré.",
      });
    }

    if (
      typeof role !== "string" ||
      !ALLOWED_ROLES.has(role)
    ) {
      return res.status(401).json({
        message: "Token invalide ou expiré.",
      });
    }

    req.user = {
      id: userId,
      role,
      email:
        typeof decoded.email === "string"
          ? decoded.email
          : undefined,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token invalide ou expiré.",
    });
  }
};
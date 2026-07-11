const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role_name,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

exports.register = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, role_name } = req.body;

    if (!first_name || !last_name || !email || !password || !role_name) {
      return res.status(400).json({ message: "Tous les champs obligatoires sont requis." });
    }

    const [roleRows] = await db.query("SELECT id FROM roles WHERE name = ?", [role_name]);

    if (roleRows.length === 0) {
      return res.status(400).json({ message: "Rôle invalide." });
    }

    const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [email]);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Cet email existe déjà." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users 
      (role_id, first_name, last_name, email, phone, password) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [roleRows[0].id, first_name, last_name, email, phone || null, hashedPassword]
    );

    res.status(201).json({
      message: "Utilisateur créé avec succès.",
      user_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur serveur register.",
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      `SELECT users.*, roles.name AS role_name
       FROM users
       JOIN roles ON users.role_id = roles.id
       WHERE users.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Email ou mot de passe invalide." });
    }

    const user = rows[0];

    if (user.status !== "active") {
      return res.status(403).json({ message: "Compte désactivé ou bloqué." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Email ou mot de passe invalide." });
    }

    const token = generateToken(user);

    res.json({
      message: "Connexion réussie.",
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role_name,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur serveur login.",
      error: error.message,
    });
  }
};

exports.me = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT users.id, users.first_name, users.last_name, users.email, users.phone, users.status, roles.name AS role
       FROM users
       JOIN roles ON users.role_id = roles.id
       WHERE users.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    res.json({
      user: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur serveur me.",
      error: error.message,
    });
  }
};
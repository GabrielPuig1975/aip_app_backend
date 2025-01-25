const express = require("express");
const mysql = require("mysql2");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const portfinder = require("portfinder");

dotenv.config();

const app = express();
const DEFAULT_PORT = process.env.INVITADOS_SERVER_PORT || 3500;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de conexión a MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Conectar a la base de datos
db.connect((err) => {
  if (err) {
    console.error("Error conectando a la base de datos de INVITADOS:", err.message);
    return;
  }
  console.log("Conectado a la base de datos de INVITADOS.");
});

// Registro de usuarios
app.post("/api/usuario_invitado/registro", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM usuario_invitado WHERE email = ?", [email], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length > 0) return res.status(400).json({ error: "El email ya está registrado." });

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return res.status(500).json({ error: "Error al hashear la contraseña." });

      const query = "INSERT INTO usuario_invitado (email, password) VALUES (?, ?)";
      db.query(query, [email, hashedPassword], (err) => {
        if (err) return res.status(500).json({ error: "Error al registrar al usuario." });
        res.status(201).json({ message: "Usuario registrado con éxito." });
      });
    });
  });
});

// Login de usuarios
app.post("/api/usuario_invitado/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM usuario_invitado WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(400).json({ error: "Usuario no encontrado." });

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) return res.status(400).json({ error: "Contraseña incorrecta." });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    res.json({ token });
  });
});

// Middleware para verificar y renovar el token
const verifyAndRenewToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Obtener el token del encabezado

  if (!token) return res.status(401).json({ error: "Acceso denegado. Token no proporcionado." });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "El token ha expirado." });
      }
      return res.status(403).json({ error: "Token inválido." });
    }

    // Renovar el token si está próximo a expirar (5 minutos o menos)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeLeft = decoded.exp - currentTime;

    if (timeLeft <= 300) {
      const newToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, { expiresIn: "15m" });
      res.setHeader("x-renewed-token", newToken); // Enviar el nuevo token en los encabezados
    }

    req.user = decoded; // Guardar la información del usuario en el request
    next();
  });
};

// Ejemplo de ruta protegida
app.get("/api/usuario_invitado/protegido", verifyAndRenewToken, (req, res) => {
  res.json({ message: "Acceso autorizado", userId: req.user.id });
});

// Detectar un puerto disponible e iniciar el servidor
portfinder.getPort({ port: DEFAULT_PORT }, (err, port) => {
  if (err) {
    console.error("Error al encontrar un puerto disponible:", err.message);
    return;
  }

  console.log(`Puerto asignado: ${port}`);
  app.listen(port, () => {
    console.log(`Servidor de INVITADOS corriendo en el puerto ${port}`);
  });
});

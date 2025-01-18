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

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  });
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

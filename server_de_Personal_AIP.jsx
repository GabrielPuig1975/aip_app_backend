const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcrypt');
const portfinder = require('portfinder');  // Usamos portfinder

dotenv.config();

const app = express();
const DEFAULT_PORT = process.env.PORT || 5001;  // Puerto por defecto

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de la conexión a MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Conectar a la base de datos
db.connect((err) => {
  if (err) {
    console.error('Error conectando a la base de datos de PERSONAL AIP:', err.code, err.message);
    return;
  }
  console.log('Conectado a la base de datos del PERSONAL AIP');
});

// Crear Usuario (Registro)
app.post('/api/usuarios', (req, res) => {
  const {
    imagen_personal,
    nombres,
    apellidos,
    documento,
    numero_tramite_documento,
    direccion,
    email,
    telefono,
    fecha_nacimiento,
    cargo,
    password
  } = req.body;

  // Verificar si el email ya está registrado
  db.query('SELECT * FROM usuarios WHERE email = ?', [email], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length > 0) return res.status(400).json({ error: 'El email ya está registrado' });

    // Hashear la contraseña antes de almacenarla
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return res.status(500).json({ error: 'Error al hashear la contraseña' });

      // Insertar el nuevo usuario en la base de datos
      const query = `INSERT INTO usuarios (imagen_personal, nombres, apellidos, documento, numero_tramite_documento, direccion, email, telefono, fecha_nacimiento, cargo, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const values = [
        imagen_personal, nombres, apellidos, documento, numero_tramite_documento, direccion,
        email, telefono, fecha_nacimiento, cargo, hashedPassword
      ];

      db.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al registrar el usuario en AIP' });
        res.status(201).json({ message: 'Usuario registrado con éxito en AIP' });
      });
    });
  });
});

// Detectar puerto disponible y escuchar
portfinder.getPortPromise({ port: DEFAULT_PORT }).then((port) => {
  console.log(`Puerto disponible: ${port}`);

  app.listen(port, () => {
    console.log(`Servidor de PERSONAL AIP corriendo en http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('Error al detectar puerto:', err);
});

//Servidor Express con puerto dinámico
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const portfinder = require("portfinder");

dotenv.config(); // Cargar variables de entorno

const app = express();

// Obtener el puerto desde las variables de entorno o asignar uno dinámico
const DEFAULT_PORT = parseInt(process.env.VITE_IMAGES_SERVER_PORT, 10) || 5000;

// Ruta al directorio de las imágenes
const propiedadesFolder = path.join(__dirname, "..", "uploads", "propiedades");

// Habilitar CORS
app.use(
  cors({
    origin: "*", // Permitir todos los orígenes durante el desarrollo, ajusta según necesidad
  })
);

// Servir archivos estáticos
app.use("/uploads/propiedades", express.static(propiedadesFolder));

// Endpoint para obtener las propiedades
app.get("/api/propiedades", (req, res) => {
  fs.readdir(propiedadesFolder, (err, files) => {
    if (err) {
      console.error("Error al leer el directorio:", err.message);
      return res
        .status(500)
        .json({ error: "No se pudieron leer las propiedades" });
    }

    // Filtrar archivos solo si tienen una extensión válida (opcional)
    const validExtensions = [".jpg", ".jpeg", ".png", ".gif"];
    const propiedades = files
      .filter((file) => validExtensions.includes(path.extname(file).toLowerCase()))
      .map((file) => ({
        nombre: file,
        ruta: `/uploads/propiedades/${file}`, // Ruta relativa
      }));

    res.json(propiedades);
  });
});

// Detectar un puerto disponible e iniciar el servidor
portfinder.getPort({ port: DEFAULT_PORT }, (err, port) => {
  if (err) {
    console.error("Error al encontrar un puerto disponible:", err.message);
    return;
  }

  app.listen(port, () => {
    console.log(`Servidor de imágenes corriendo en el puerto ${port}`);
  });
});
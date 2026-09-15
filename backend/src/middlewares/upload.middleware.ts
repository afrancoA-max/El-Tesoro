import multer from "multer";

// Módulo 08: almacenamiento en memoria (nunca en disco) — los archivos son
// pequeños (fotos de producto, un Excel de catálogo) y así el controlador
// los sube directo a Cloud Storage o los procesa sin dejar residuos en el
// contenedor.
export const uploadProductImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)) {
      cb(new Error("Formato de imagen no soportado. Usa JPG, PNG, WEBP o GIF."));
      return;
    }
    cb(null, true);
  },
}).single("imagen");

export const uploadCatalogFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
}).single("archivo");

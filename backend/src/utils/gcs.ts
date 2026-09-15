import { Storage } from "@google-cloud/storage";
import { env } from "../config/env";

const storage = new Storage();

/// Sube un archivo ya en memoria (multer `buffer`) al bucket de fotos de
/// producto y devuelve su URL pública — mismo bucket y forma de URL que
/// `scripts/import-catalog.ts`, para que a una foto le dé igual haber
/// entrado por el importador de Excel o por el panel admin.
export async function uploadProductImage(destPath: string, buffer: Buffer, contentType: string): Promise<string> {
  const bucket = storage.bucket(env.productImagesBucket);
  const file = bucket.file(destPath);
  await file.save(buffer, { contentType, resumable: false });
  return `https://storage.googleapis.com/${env.productImagesBucket}/${destPath}`;
}

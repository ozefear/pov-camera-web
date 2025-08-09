import { promises as fs } from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary konfigurasyonu (eğer başka yerde config ettiysen buna gerek yok ama güvenli için ekleyebilirsin)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function DELETE(req, { params }) {
  // Next.js 13 sürümlerinde params bir Promise olabilir, bu yüzden await kullanıyoruz
  const { eventId, photoId } = await params;

  try {
    const uploadsDir = path.join(process.cwd(), "uploads", "events", eventId);
    const metaPath = path.join(uploadsDir, `${photoId}.json`);

    // Metadata dosyasını oku ki Cloudinary public_id alabilelim
    let metadata;
    try {
      const raw = await fs.readFile(metaPath, "utf8");
      metadata = JSON.parse(raw);
    } catch {
      metadata = null;
    }

    // Cloudinary fotoğrafını sil
    if (metadata?.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(metadata.cloudinaryPublicId, { resource_type: "image" });
    }

    // Local dosyaları sil (opsiyonel, eğer localde varsa)
    const imgPath = path.join(uploadsDir, `${photoId}.jpg`);
    try {
      await fs.unlink(imgPath);
    } catch {}

    try {
      await fs.unlink(metaPath);
    } catch {}

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ message: "Delete failed", error: e.message }), { status: 500 });
  }
}

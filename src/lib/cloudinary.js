import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Dosya buffer'ı alıp Cloudinary'e yükleyen fonksiyon
export async function uploadPhotoToCloudinary(buffer, filename, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder, // isteğe bağlı: örneğin `events/${eventId}`
        public_id: filename.replace(/\.[^/.]+$/, ""), // dosya uzantısı olmadan isim
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    // Buffer'ı stream'e çevirip yükle
    uploadStream.end(buffer);
  });
}

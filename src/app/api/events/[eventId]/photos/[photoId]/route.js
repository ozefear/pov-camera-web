import { v2 as cloudinary } from "cloudinary";
import { getFirebaseClient } from "@/lib/firebaseClient";
import { doc, deleteDoc } from "firebase/firestore";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function DELETE(_req, { params }) {
  const { eventId, photoId } = params;

  try {
    const { db } = getFirebaseClient();
    const photoRef = doc(db, "events", eventId, "photos", photoId);

    // Firestore’dan önce public_id çekmeliyiz ki Cloudinary’den silelim
    const snapshot = await photoRef.get ? await photoRef.get() : null;
    let publicId = null;
    if (snapshot && snapshot.exists()) {
      publicId = snapshot.data().cloudinaryPublicId;
    }

    if (publicId) {
      await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    }

    await deleteDoc(photoRef);

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ message: "Delete failed", error: e.message }), { status: 500 });
  }
}

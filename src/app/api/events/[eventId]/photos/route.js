import { v2 as cloudinary } from "cloudinary";
import { getFirebaseClient } from "@/lib/firebaseClient";
import { randomUUID } from "crypto";
import { collection, doc, setDoc, getDocs, updateDoc, increment } from "firebase/firestore";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(req, { params }) {
  const { eventId } = params;
  try {
    const form = await req.formData();
    const file = form.get("file");
    const comment = form.get("comment") || null;
    const capturedAt = form.get("capturedAt") || null;
    const authorParticipantId = form.get("participantId") || null;

    if (!file || typeof file.arrayBuffer !== "function") {
      return new Response(JSON.stringify({ message: "Missing file" }), { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const photoId = randomUUID();

    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "image",
            folder: `events/${eventId}`,
            public_id: photoId,
            overwrite: false,
            format: "jpg",
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(buffer);
      });

    const result = await streamUpload();

    // Firestore kaydı
    const { db } = getFirebaseClient();
    const photoRef = doc(db, "events", eventId, "photos", photoId);

    const metadata = {
      photoId,
      eventId,
      originalName: typeof file.name === "string" ? file.name : null,
      contentType: file.type || "image/jpeg",
      size: buffer.length,
      comment: comment ? String(comment).slice(0, 250) : null,
      capturedAt: capturedAt || null,
      createdAt: Date.now(),
      authorParticipantId,
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
    };

    await setDoc(photoRef, metadata);

    if (authorParticipantId) {
      const participantRef = doc(db, "events", eventId, "participants", authorParticipantId);
      await updateDoc(participantRef, {
        uploadedCount: increment(1),
      });
    }

    return new Response(
      JSON.stringify({
        photoId,
        url: result.secure_url,
        metadata,
      }),
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ message: "Upload failed", error: e.message }), { status: 500 });
  }
}

export async function GET(_req, { params }) {
  const { eventId } = params;
  try {
    const { db } = getFirebaseClient();
    const photosCol = collection(db, "events", eventId, "photos");
    const snapshot = await getDocs(photosCol);

    const photos = [];
    snapshot.forEach((doc) => {
      photos.push({ photoId: doc.id, ...doc.data() });
    });

    photos.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    return new Response(JSON.stringify({ photos }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ message: "Failed to list" }), { status: 500 });
  }
}

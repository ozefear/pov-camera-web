"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFirebaseClient, ensureAnonymousAuth } from "@/lib/firebaseClient";
import { loadImageFromFile, renderRetroWithTimestamp, canvasToBlob } from "@/lib/imageProcessing";
// import { saveLocalPhoto } from "@/lib/localDb";

export default function CameraPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [limitState, setLimitState] = useState({ limit: null, uploaded: null, owner: false });
  const [participantOk, setParticipantOk] = useState(false);
  const [participantNickname, setParticipantNickname] = useState("");

  useEffect(() => {
    const { auth, db } = getFirebaseClient();
    ensureAnonymousAuth(auth)
      .then(async () => {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          // Check participant existence first; if missing, redirect to join
          const partRef = doc(db, "events", eventId, "participants", auth.currentUser.uid);
          const partSnap = await getDoc(partRef);
          if (!partSnap.exists()) {
            router.replace(`/events/${eventId}/join`);
            return;
          }
          setParticipantOk(true);
          setParticipantNickname(partSnap.data().nickname || "");
          // Now safe to read event doc (rules allow participants to read event)
          const eventRef = doc(db, "events", eventId);
          const eventSnap = await getDoc(eventRef);
          const limit = eventSnap.exists() ? eventSnap.data().photoLimitPerUser ?? null : null;
          const uploaded = partSnap.data().uploadedCount ?? 0;
          const owner = partSnap.data().role === "owner";
          setLimitState({ limit, uploaded, owner });
        } catch (e) {
          // If permission denied, route back to join
          router.replace(`/events/${eventId}/join`);
        }
      })
      .catch(() => {});
  }, []);

  async function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setError("");
    setFile(f);
    const { dataUrl } = await loadImageFromFile(f);
    setPreviewUrl(dataUrl);
  }

  async function handleUpload() {
    if (!file || !participantOk) return;
    setProcessing(true);
    setError("");
    setSuccess(false);
    try {
      const { auth, db } = getFirebaseClient();
      await ensureAnonymousAuth(auth);
      // Enforce and/or increment per-user count in Firestore (owner exempt)
      if (!limitState.owner) {
        const { runTransaction, doc } = await import("firebase/firestore");
        await runTransaction(db, async (tx) => {
          const eventRef = doc(db, "events", eventId);
          const partRef = doc(db, "events", eventId, "participants", auth.currentUser.uid);
          const [eventSnap, partSnap] = await Promise.all([tx.get(eventRef), tx.get(partRef)]);
          const rawLimit = eventSnap.exists() ? eventSnap.data().photoLimitPerUser ?? null : null;
          const limit = typeof rawLimit === "number" ? rawLimit : Number(rawLimit);
          const uploaded = partSnap.exists() ? (partSnap.data().uploadedCount ?? 0) : 0;
          if (Number.isFinite(limit) && uploaded >= limit) {
            throw new Error("Photo limit reached.");
          }
          tx.set(
            partRef,
            { uploadedCount: uploaded + 1 },
            { merge: true }
          );
        });
        setLimitState((s) => ({ ...s, uploaded: (s.uploaded ?? 0) + 1 }));
      }
      const { img } = await loadImageFromFile(file);
      const canvas = renderRetroWithTimestamp(img, { timestamp: new Date() });
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);

      // Upload to server filesystem via API route
      const form = new FormData();
      form.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
      if (comment?.trim()) form.append("comment", comment.trim().slice(0, 250));
      form.append("capturedAt", String(Date.now()));
      form.append("participantId", auth.currentUser.uid);
      const res = await fetch(`/api/events/${eventId}/photos`, { method: "POST", body: form });
      if (!res.ok) {
        throw new Error("Server upload failed");
      }

      setSuccess(true);
      setFile(null);
      setPreviewUrl("");
      setComment("");
    } catch (e) {
      console.error(e);
      setError(e?.message || "Upload failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-xl mx-auto space-y-4 retro-surface relative">
      <a
        href={`/events/${eventId}/gallery`}
        className="btn-primary absolute top-4 right-4"
        aria-label="Open Gallery"
      >
        <span className="inline-flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Gallery
        </span>
      </a>
      <h1 className="text-2xl font-semibold">📸 Camera</h1>
      <div className="text-center text-xl font-semibold mb-4">
        {limitState.owner ? (
          <span>Unlimited uploads (owner)</span>
        ) : (
          <span>
            Remaining: {Number.isFinite(limitState.limit) ? Math.max(0, (limitState.limit || 0) - (limitState.uploaded || 0)) : "–"}
            {Number.isFinite(limitState.limit) ? ` / ${limitState.limit}` : " (no limit set)"}
          </span>
        )}
      </div>
      <label className="flex items-center justify-center">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="sr-only"
        />
        <span className="btn-primary" role="button" aria-label="Open camera">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </span>
      </label>

      {previewUrl && (
        <div className="space-y-3">
          <img src={previewUrl} alt="preview" className="w-full rounded border" />
          <textarea
            className="w-full h-24 p-2 rounded border bg-transparent"
            placeholder="Optional comment (max 250 chars)"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 250))}
          />
          <button
            disabled={processing}
            onClick={handleUpload}
            className="btn-primary disabled:opacity-60"
            aria-busy={processing}
          >
            {processing ? "⏳ Uploading..." : "⬆️ Upload"}
          </button>
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">Uploaded successfully!</p>}
    </div>
  );
}



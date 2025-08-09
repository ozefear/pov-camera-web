"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFirebaseClient, ensureAnonymousAuth } from "@/lib/firebaseClient";

async function fetchServerPhotos(eventId) {
  const res = await fetch(`/api/events/${eventId}/photos`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.photos || [];
}

export default function GalleryPage() {
  const { eventId } = useParams();
  const router = useRouter();

  const [photos, setPhotos] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealAt, setRevealAt] = useState(null);
  const [showComments, setShowComments] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [participants, setParticipants] = useState([]);

  // Countdown state
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const { auth, db } = getFirebaseClient();
    ensureAnonymousAuth(auth)
      .then(async () => {
        const { doc, getDoc, collection, getDocs } = await import("firebase/firestore");

        // Participant kontrolü
        const partRef = doc(db, "events", eventId, "participants", auth.currentUser.uid);
        const partSnap = await getDoc(partRef);
        if (!partSnap.exists()) {
          router.replace(`/events/${eventId}/join`);
          return;
        }
        setIsOwner(partSnap.data().role === "owner");

        // Event bilgileri
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
          const data = eventSnap.data();
          setIsRevealed(Boolean(data.isRevealed));
          if (data.revealAt?.toDate) setRevealAt(data.revealAt.toDate());
        }

        // Katılımcıları çek
        const partsCol = collection(db, "events", eventId, "participants");
        const partsSnap = await getDocs(partsCol);
        const partsList = partsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setParticipants(partsList);

        // Fotoğrafları çek
        const serverPhotos = await fetchServerPhotos(eventId);
        // Author nickname eşleştirmesi
        const enrichedPhotos = serverPhotos.map((p) => ({
          ...p,
          authorNickname: partsList.find((pp) => pp.id === p.authorParticipantId)?.nickname || p.authorParticipantId || "Unknown",
          url: p.cloudinaryUrl || p.url || "",
        }));
        setPhotos(enrichedPhotos);
      })
      .catch(() => router.replace(`/events/${eventId}/join`));
  }, [eventId]);

  // Reveal countdown timer
  useEffect(() => {
    if (!revealAt) return;
    const interval = setInterval(() => {
      const now = new Date();
      const diff = revealAt - now;
      if (diff <= 0) {
        setCountdown("00:00:00");
        clearInterval(interval);
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      const pad = (n) => String(n).padStart(2, "0");
      setCountdown(`${pad(h)}:${pad(m)}:${pad(s)}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [revealAt]);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const blurContent = !isOwner && !isRevealed;

  return (
    <div className="min-h-screen p-6 pt-16 max-w-5xl mx-auto retro-surface relative">
      <a
        href={`/events/${eventId}/camera`}
        className="btn-primary absolute top-4 right-4"
        aria-label="Open Camera"
      >
        <span className="inline-flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          Camera
        </span>
      </a>
      <div className="mb-4 pr-28">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-semibold">🖼️ Gallery</h1>
          <label className="flex items-center gap-2 text-sm h-10">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={showComments}
              onChange={(e) => setShowComments(e.target.checked)}
            />
            Show comments
          </label>
        </div>
      </div>

      {blurContent && (
        <div className="mb-4 p-3 rounded border bg-yellow-50 text-yellow-900">
          The gallery will be revealed at the end of the event.
          {revealAt && <span className="ml-2">Countdown: {countdown}</span>}
        </div>
      )}

      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ${blurContent ? "blur-sm" : ""}`}>
        {photos.map((p) => (
          <figure
            key={p.photoId || p.id}
            className={`rounded border overflow-hidden flex flex-col ${selected.has(p.photoId) ? "ring-2 ring-[var(--retro-accent)]" : ""}`}
          >
            {!blurContent && (
              <label className="flex items-center gap-2 p-2 text-sm">
                <input
                  className="retro-checkbox"
                  type="checkbox"
                  checked={selected.has(p.photoId)}
                  onChange={() => toggleSelect(p.photoId)}
                />
                Select
              </label>
            )}
            <img src={p.url} alt="photo" className="w-full h-auto block" />
            {showComments && p.comment && (
              <figcaption className="truncate">
                💬 {p.comment}
              </figcaption>
            )}
            {showComments && p.authorParticipantId && (
              <figcaption className="p-2 text-xs text-gray-500 truncate">
                👤 {p.authorNickname || p.authorParticipantId}
              </figcaption>
            )}
            {!blurContent && (
              <a
                href={p.url}
                download={`photo-${p.photoId || p.id || "local"}.jpg`}
                className="block text-center text-sm p-2 hover:underline"
              >
                Download
              </a>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}

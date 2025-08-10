"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFirebaseClient, ensureAnonymousAuth } from "@/lib/firebaseClient";
import JSZip from "jszip";

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
  const [sortBy, setSortBy] = useState("createdAt");
  const [countdown, setCountdown] = useState("");
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    const urls = [];
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  useEffect(() => {
    const { auth, db } = getFirebaseClient();
    ensureAnonymousAuth(auth)
      .then(async () => {
        const { doc, getDoc, collection, getDocs } = await import("firebase/firestore");
  
        // Önce event verisini çek, isRevealed değerini al
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        const eventData = eventSnap.exists() ? eventSnap.data() : null;
        const revealed = Boolean(eventData?.isRevealed);
  
        setIsRevealed(revealed);
        if (eventData?.revealAt?.toDate) setRevealAt(eventData.revealAt.toDate());
  
        // Eğer event bitmişse (revealed), katılımcı kontrolü yapma, direkt fotoğrafları getir
        if (revealed) {
          const list = await fetchServerPhotos(eventId);
          setPhotos(list);
          return;
        }
  
        // Event bitmemişse katılımcı kontrolü yap
        const partRef = doc(db, "events", eventId, "participants", auth.currentUser.uid);
        const partSnap = await getDoc(partRef);
        if (!partSnap.exists()) {
          router.replace(`/events/${eventId}/join`);
          return;
        }
  
        setIsOwner(partSnap.data().role === "owner");
  
        // Katılımcı listesi ve fotoğrafları çek
        const list = await fetchServerPhotos(eventId);
        try {
          const partsCol = collection(db, "events", eventId, "participants");
          const partsSnap = await getDocs(partsCol);
          const parts = partsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const nicknameOf = (pid) => parts.find((p) => p.id === pid)?.nickname || pid;
          setPhotos(list.map((p) => ({ ...p, authorNickname: nicknameOf(p.authorParticipantId) })));
        } catch {
          setPhotos(list);
        }
      })
      .catch(() => {
        // Eğer event bitmemişse join sayfasına yönlendir
        if (!isRevealed) router.replace(`/events/${eventId}/join`);
      });
  }, [eventId]);
  

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

  const sortedPhotos = useMemo(() => {
    const arr = [...photos];
    if (sortBy === "author") {
      arr.sort((a, b) => {
        const an = (a.authorNickname || "").toLowerCase();
        const bn = (b.authorNickname || "").toLowerCase();
        if (an === bn) return (b.createdAt || 0) - (a.createdAt || 0);
        return an.localeCompare(bn);
      });
    } else {
      arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }
    return arr;
  }, [photos, sortBy]);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function downloadSelected() {
    const zip = new JSZip();
    const picks = sortedPhotos.filter((p) => selected.has(p.photoId));
    if (picks.length === 0) return;
    for (const p of picks) {
      try {
        const res = await fetch(p.cloudinaryUrl);
        const blob = await res.blob();
        const fname = `photo-${p.photoId}.jpg`;
        zip.file(fname, blob);
      } catch {}
    }
    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = `photos-${eventId}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const blurContent = !isOwner && !isRevealed;

  return (
    <div className="min-h-screen p-6 pt-16 max-w-5xl mx-auto retro-surface relative">
      <a
        href={isRevealed ? "#" : `/events/${eventId}/camera`}
        className={`btn-primary absolute top-4 right-4 ${isRevealed ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label="Open Camera"
        onClick={e => { if (isRevealed) e.preventDefault(); }}
        tabIndex={isRevealed ? -1 : 0}
      >
        <span className="inline-flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Camera
        </span>
      </a>
      <div className="mb-4 pr-28">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-semibold">🖼️ Gallery</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">Sort:</span>
              <select
                className="h-10 px-3 rounded border bg-transparent"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="createdAt">By Upload Time</option>
                <option value="author">By Author</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm h-10">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={showComments}
                onChange={(e) => setShowComments(e.target.checked)}
              />
              Show comments
            </label>
            {selected.size > 0 && (
              <button className="btn-primary" onClick={downloadSelected}>
                ⬇️ Download Selected ({selected.size})
              </button>
            )}
          </div>
        </div>
      </div>

      {blurContent && (
        <div className="mb-4 p-3 rounded border bg-yellow-50 text-yellow-900">
          The gallery will be revealed at the end of the event.
          {revealAt && <span className="ml-2">Countdown: {countdown}</span>}
        </div>
      )}

      <div
        className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ${
          blurContent ? "blur-sm" : ""
        }`}
      >
        {sortedPhotos.map((p) => (
          <figure
            key={p.photoId || p.id}
            className={`rounded border overflow-hidden flex flex-col ${
              selected.has(p.photoId) ? "ring-2 ring-[var(--retro-accent)]" : ""
            }`}
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
            <img src={p.cloudinaryUrl} alt="photo" className="w-full h-auto block" />
            {showComments && (
              <div className="flex flex-col gap-1 p-3 text-sm">
                {p.comment && (
                  <span className="truncate font-normal text-orange-600 dark:text-amber-600">
                    💬 {p.comment}
                  </span>
                )}
                {p.authorParticipantId && (
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                    👤 @{p.authorNickname}
                  </span>
                )}
              </div>
            )}
            {!blurContent && (
              <a
                href={p.cloudinaryUrl}
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

"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFirebaseClient, ensureAnonymousAuth } from "@/lib/firebaseClient";
import { QRCodeSVG } from "qrcode.react";
import { loadImageFromFile, renderRetroWithTimestamp, canvasToBlob } from "@/lib/imageProcessing";
import JSZip from "jszip";

async function fetchServerPhotos(eventId) {
  const res = await fetch(`/api/events/${eventId}/photos`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.photos || [];
}

export default function AdminPage() {
  const { eventId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [limitInput, setLimitInput] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Camera state for owner uploads
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const { auth, db } = getFirebaseClient();
    ensureAnonymousAuth(auth)
      .then(async () => {
        const { doc, getDoc, collection, getDocs } = await import("firebase/firestore");
        // Check owner
        const partRef = doc(db, "events", eventId, "participants", auth.currentUser.uid);
        const partSnap = await getDoc(partRef);
        if (!partSnap.exists() || partSnap.data().role !== "owner") {
          router.replace(`/events/${eventId}`);
          return;
        }
        setIsOwner(true);

        // Load event
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
          const data = { id: eventSnap.id, ...eventSnap.data() };
          setEvent(data);
          setLimitInput(String(data.photoLimitPerUser ?? ""));
          if (typeof window !== "undefined") {
            const origin = window.location.origin;
            setJoinUrl(`${origin}/events/${eventId}/join`);
          }
        }

        // Participants
        const partsCol = collection(db, "events", eventId, "participants");
        const partsSnap = await getDocs(partsCol);
        const list = partsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setParticipants(list);

        // Photos from server
        const serverPhotos = await fetchServerPhotos(eventId);
        // Enrich photo list with resolved author nickname if available
        const mapNickname = (pid) => list.find((pp) => pp.id === pid)?.nickname || pid;
        const enriched = serverPhotos.map((p) => ({
          ...p,
          authorNickname: mapNickname(p.authorParticipantId),
          // url değişimi:
          url: p.cloudinaryUrl || p.url || "", 
        }));
        setPhotos(enriched);
      })
      .catch(() => {
        router.replace(`/events/${eventId}`);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

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

  async function uploadFromAdmin() {
    if (!file) return;
    setProcessing(true);
    setError("");
    try {
      const { auth, db } = getFirebaseClient();
      await ensureAnonymousAuth(auth);
      const { img } = await loadImageFromFile(file);
      const canvas = renderRetroWithTimestamp(img, { timestamp: new Date() });
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);

      const form = new FormData();
      form.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
      if (comment?.trim()) form.append("comment", comment.trim().slice(0, 250));
      form.append("capturedAt", String(Date.now()));
      form.append("participantId", auth.currentUser.uid);
      const res = await fetch(`/api/events/${eventId}/photos`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { metadata } = await res.json();
      // Increment uploadedCount for owner participant
      try {
        const { runTransaction, doc } = await import("firebase/firestore");
        await runTransaction(db, async (tx) => {
          const partRef = doc(db, "events", eventId, "participants", auth.currentUser.uid);
          const snap = await tx.get(partRef);
          const uploaded = snap.exists() ? (snap.data().uploadedCount || 0) : 0;
          tx.set(partRef, { uploadedCount: uploaded + 1 }, { merge: true });
        });
        setParticipants((arr) => arr.map((p) =>
          p.id === auth.currentUser.uid ? { ...p, uploadedCount: (p.uploadedCount || 0) + 1 } : p
        ));
      } catch {}

      // Fotoğrafı cloudinaryUrl olarak ekleyelim
      setPhotos((arr) => [{ ...metadata, url: metadata.cloudinaryUrl || "", authorNickname: event?.ownerNickname || "", photoId: metadata.photoId }, ...arr]);

      setFile(null);
      setPreviewUrl("");
      setComment("");
    } catch (e) {
      setError(e?.message || "Upload failed");
    } finally {
      setProcessing(false);
    }
  }

  async function saveLimit() {
    setSavingLimit(true);
    setError("");
    try {
      const limitNumber = limitInput === "" ? null : Number(limitInput);
      if (limitInput !== "" && (!Number.isFinite(limitNumber) || limitNumber < 0 || limitNumber > 9999)) {
        throw new Error("Invalid limit");
      }
      const { db } = getFirebaseClient();
      const { doc, updateDoc } = await import("firebase/firestore");
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, { photoLimitPerUser: limitNumber });
      setEvent((e) => ({ ...(e || {}), photoLimitPerUser: limitNumber }));
    } catch (e) {
      setError(e?.message || "Failed to save limit");
    } finally {
      setSavingLimit(false);
    }
  }

  async function endEvent() {
    setEnding(true);
    setError("");
    try {
      const { db } = getFirebaseClient();
      const { doc, updateDoc } = await import("firebase/firestore");
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, { isRevealed: true });
      setEvent((e) => ({ ...(e || {}), isRevealed: true }));
    } catch (e) {
      setError("Failed to end event");
    } finally {
      setEnding(false);
    }
  }

  async function deletePhoto(photo) {
    try {
      const res = await fetch(`/api/events/${eventId}/photos/${photo.photoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      // Kullanıcının uploadedCount azalt
      if (photo.authorParticipantId) {
        try {
          const { db } = getFirebaseClient();
          const { runTransaction, doc } = await import("firebase/firestore");
          await runTransaction(db, async (tx) => {
            const partRef = doc(db, "events", eventId, "participants", photo.authorParticipantId);
            const snap = await tx.get(partRef);
            if (!snap.exists()) return;
            const uploaded = snap.data().uploadedCount ?? 0;
            tx.update(partRef, { uploadedCount: Math.max(0, uploaded - 1) });
          });
        } catch {}
      }

      setPhotos((arr) => arr.filter((p) => p.photoId !== photo.photoId));
    } catch (e) {
      setError("Failed to delete photo");
    }
  }

  const totalUploads = useMemo(() => participants.reduce((s, p) => s + (p.uploadedCount || 0), 0), [participants]);
  const filteredPhotos = useMemo(() => {
    if (!selectedAuthorId) return photos;
    return photos.filter((p) => p.authorParticipantId === selectedAuthorId);
  }, [photos, selectedAuthorId]);

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
    const picks = filteredPhotos.filter((p) => selected.has(p.photoId));
    if (picks.length === 0) return;
    for (const p of picks) {
      try {
        const res = await fetch(p.cloudinaryUrl || p.url);
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

  if (loading) return <div className="p-6">Loading...</div>;
  if (!isOwner) return null;

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto space-y-6 retro-surface">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <section className="p-4 border rounded-lg space-y-3">
        <h2 className="font-semibold">⚙️ Event Settings</h2>
        <div className="flex items-center gap-3">
          <label className="text-sm">Photo limit per user</label>
          <input
            className="h-10 px-3 rounded border bg-transparent w-32"
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            placeholder="e.g., 10"
          />
          <button
            disabled={savingLimit}
            onClick={saveLimit}
            className="btn-primary disabled:opacity-60"
          >
            {savingLimit ? "Saving..." : "Save"}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm">🔓 Revealed: {event?.isRevealed ? "Yes" : "No"}</span>
            {!event?.isRevealed && (
              <button
                disabled={ending}
                onClick={endEvent}
                className="btn-primary disabled:opacity-60"
              >
                {ending ? "Ending..." : "End Event (Reveal)"}
              </button>
            )}
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-sm font-medium mb-2">🔗 Share Join Link</h3>
          <div className="grid md:grid-cols-[200px_1fr_auto] gap-3 items-center">
            <div className="flex items-center justify-center p-2 border rounded">
              {joinUrl ? <QRCodeSVG value={joinUrl} size={160} /> : null}
            </div>
            <input className="h-11 px-3 rounded border bg-transparent" value={joinUrl} readOnly />
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                await navigator.clipboard.writeText(joinUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "✅ Copied" : "📋 Copy"}
            </button>
          </div>
        </div>
      </section>

      <section className="p-4 border rounded-lg space-y-3">
        <h2 className="font-semibold">📸 Upload (Owner)</h2>
        <div className="flex items-center justify-center">
          <label className="flex items-center justify-center">
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="sr-only" />
            <span className="btn-primary" role="button" aria-label="Open camera">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span className="ml-2">Camera</span>
            </span>
          </label>
        </div>
        {previewUrl && (
          <div className="space-y-3">
            <img src={previewUrl} alt="preview" className="w-full rounded border" />
            <textarea
              className="w-full h-24 p-2 rounded border bg-transparent"
              placeholder="Optional comment (max 250 chars)"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 250))}
            />
            <div className="flex items-center justify-center">
              <button onClick={uploadFromAdmin} disabled={processing} className="btn-primary disabled:opacity-60" aria-busy={processing}>
                {processing ? "⏳ Uploading..." : "⬆️ Upload"}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="p-4 border rounded-lg space-y-3">
        <h2 className="font-semibold">👥 Participants ({participants.length})</h2>
        <div className="text-sm text-gray-600">Total uploads: {totalUploads}</div>
        <div className="grid md:grid-cols-2 gap-3">
          {participants.map((p) => (
            <div key={p.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">🧑 {p.nickname || "(no name)"}</div>
                <div className="text-sm text-gray-600">Role: {p.role} • 📸 {p.uploadedCount || 0}</div>
              </div>
              <button
                className="btn-primary"
                onClick={() => setSelectedAuthorId((cur) => (cur === p.id ? null : p.id))}
              >
                {selectedAuthorId === p.id ? "Show All" : "View Photos"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="p-4 border rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">🖼️ Photos ({filteredPhotos.length}{selectedAuthorId ? ` of ${photos.length}` : ` / ${photos.length}`})</h2>
          {selectedAuthorId && (
            <button className="btn-primary" onClick={() => setSelectedAuthorId(null)}>Clear Filter</button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div />
          {selected.size > 0 && (
            <button className="btn-primary" onClick={downloadSelected}>⬇️ Download Selected ({selected.size})</button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredPhotos.map((p) => (
            <figure key={p.photoId} className={`border rounded overflow-hidden ${selected.has(p.photoId) ? "ring-2 ring-[var(--retro-accent)]" : ""}`}>
              <label className="flex items-center gap-2 p-2 text-sm">
                <input
                  className="retro-checkbox"
                  type="checkbox"
                  checked={selected.has(p.photoId)}
                  onChange={() => toggleSelect(p.photoId)}
                />
                Select
              </label>
              <img src={p.cloudinaryUrl || p.url} alt="photo" className="w-full h-auto block" />
              <div className="flex flex-col gap-1 p-2 text-sm">
                <span className="truncate">💬 {p.comment || ""}</span>
                {p.authorParticipantId && (
                  <span className="text-xs text-gray-600">👤 @{participants.find(pp => pp.id === p.authorParticipantId)?.nickname || p.authorParticipantId}</span>
                )}
              </div>
              <div className="flex items-center justify-between p-2 pt-0 text-sm">
                <button
                  onClick={() => deletePhoto(p)}
                  className="px-2 py-1 rounded bg-red-600 text-white"
                >
                  🗑️ Delete
                </button>
              </div>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}

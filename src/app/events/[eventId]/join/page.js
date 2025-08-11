"use client";


import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFirebaseClient, ensureAnonymousAuth } from "@/lib/firebaseClient";
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";

import toast from "react-hot-toast";


export default function JoinEventPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(true); // Başta true ki kontrol yapalım
  const [event, setEvent] = useState(null);
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    async function checkEventAndJoinStatus() {
      try {
        const { auth, db } = getFirebaseClient();
        await ensureAnonymousAuth(auth);

        // Event bilgilerini çek
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
          setError("Event not found.");
          setSubmitting(false);
          return;
        }
        const eventData = eventSnap.data();
        setEvent({ id: eventSnap.id, ...eventData });

        // Event owner bilgisini çek (participants içindeki nickname)
        if (eventData.ownerId) {
          const ownerParticipantRef = doc(db, "events", eventId, "participants", eventData.ownerId);
          const ownerParticipantSnap = await getDoc(ownerParticipantRef);
          if (ownerParticipantSnap.exists()) {
            const ownerParticipantData = ownerParticipantSnap.data();
            setOwnerName(ownerParticipantData.nickname || "");
          }
        }

        // Event bitmişse (isRevealed true), direkt galeriye yönlendir
        if (eventData.isRevealed) {
          router.replace(`/events/${eventId}/gallery`);
          return;
        }

        // Daha önce join olmuş mu kontrol et
        const saved = localStorage.getItem(`event-${eventId}-participant`);
        if (saved) {
          const parsed = JSON.parse(saved);
          const participantRef = doc(db, "events", eventId, "participants", parsed.uid);
          const snap = await getDoc(participantRef);
          if (snap.exists()) {
            router.replace(`/events/${eventId}/camera`);
            return;
          } else {
            // Local'de kayıt var ama Firestore'da yoksa temizle
            localStorage.removeItem(`event-${eventId}-participant`);
          }
        }
      } catch (err) {
        console.error("Join kontrolünde hata:", err);
      }
      setSubmitting(false); // Formu göster
    }

    checkEventAndJoinStatus();
  }, [eventId, router]);

  async function handleJoin(e) {
    e.preventDefault();
  setError("");
    const nick = nickname.trim();
    if (!nick) {
      setError("Please enter a nickname.");
      toast.error("Please enter a nickname.");
      return;
    }
    setSubmitting(true);
    try {
      const { auth, db } = getFirebaseClient();
      await ensureAnonymousAuth(auth);
      const nicknameLower = nick.toLowerCase();
      const nickDocRef = doc(db, "events", eventId, "nicknames", nicknameLower);
      const participantRef = doc(db, "events", eventId, "participants", auth.currentUser.uid);

      await runTransaction(db, async (tx) => {
        const nickSnap = await tx.get(nickDocRef);
        if (nickSnap.exists()) {
          throw new Error("Nickname is already taken in this event.");
        }
        tx.set(nickDocRef, { reservedBy: auth.currentUser.uid, createdAt: serverTimestamp() });
        tx.set(participantRef, {
          nickname: nick,
          role: "participant",
          uploadedCount: 0,
          createdAt: serverTimestamp(),
        });
      });

      // LocalStorage'a kaydet
      localStorage.setItem(
        `event-${eventId}-participant`,
        JSON.stringify({ uid: auth.currentUser.uid, nickname: nick })
      );

  toast.success("Joined event!");
  router.push(`/events/${eventId}/camera`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to join. Please try again.");
      toast.error(err.message || "Failed to join. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }


  if (submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>Loading...</span>
      </div>
    );
  }

  console.log("Event:", event);
  console.log("Owner Name:", ownerName);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <form onSubmit={handleJoin} className="w-full max-w-md space-y-4 retro-surface p-6">
        <h1 className="text-2xl font-semibold">🙋 Join Event</h1>
        {event && (
          <div className="mb-4 retro-surface text-center p-4 border" style={{borderColor: 'var(--retro-border)'}}>
            <div className="text-xl font-bold" style={{color: 'var(--retro-accent)'}}>{event.name}</div>
            {ownerName && (
              <div className="text-sm mt-1" style={{color: 'var(--foreground)'}}>
                <span className="italic">by </span>
                <span className="font-semibold not-italic">{ownerName}</span>
              </div>
            )}
          </div>
        )}
        <p className="text-sm">Enter a unique nickname for this event.</p>
        <input
          className="w-full h-11 px-3 rounded border bg-transparent"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={50}
          placeholder="Your nickname"
        />
  {/* Toast notifications handle error and success messages visually */}
        <button
          disabled={submitting}
          className="w-full btn-primary disabled:opacity-60"
        >
          {submitting ? "Joining..." : "Join"}
        </button>
      </form>
    </div>
  );
}

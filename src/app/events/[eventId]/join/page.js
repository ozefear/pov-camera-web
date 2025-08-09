"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFirebaseClient, ensureAnonymousAuth } from "@/lib/firebaseClient";
import { collection, doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";

export default function JoinEventPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(true); // başta true ki kontrol yapalım

  useEffect(() => {
    async function checkExistingJoin() {
      try {
        const { auth, db } = getFirebaseClient();
        await ensureAnonymousAuth(auth);

        const saved = localStorage.getItem(`event-${eventId}-participant`);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Firestore'da hâlâ kayıt var mı kontrol et
          const participantRef = doc(db, "events", eventId, "participants", parsed.uid);
          const snap = await getDoc(participantRef);
          if (snap.exists()) {
            // Zaten join yapılmış, direkt camera'ya yönlendir
            router.replace(`/events/${eventId}/camera`);
            return;
          } else {
            // localStorage'da kayıt var ama Firestore'da yok → temizle
            localStorage.removeItem(`event-${eventId}-participant`);
          }
        }
      } catch (err) {
        console.error("Join kontrolünde hata:", err);
      }
      setSubmitting(false); // formu göster
    }

    checkExistingJoin();
  }, [eventId, router]);

  async function handleJoin(e) {
    e.preventDefault();
    setError("");
    const nick = nickname.trim();
    if (!nick) {
      setError("Please enter a nickname.");
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

      // localStorage'a kaydet
      localStorage.setItem(
        `event-${eventId}-participant`,
        JSON.stringify({ uid: auth.currentUser.uid, nickname: nick })
      );

      router.push(`/events/${eventId}/camera`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to join. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <form onSubmit={handleJoin} className="w-full max-w-md space-y-4 retro-surface p-6">
        <h1 className="text-2xl font-semibold">🙋 Join Event</h1>
        <p className="text-sm">Enter a unique nickname for this event.</p>
        <input
          className="w-full h-11 px-3 rounded border bg-transparent"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={50}
          placeholder="Your nickname"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
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

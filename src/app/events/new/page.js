"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseClient, ensureAnonymousAuth } from "@/lib/firebaseClient";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";


export default function NewEventPage() {
  const router = useRouter();
  const [ownerNickname, setOwnerNickname] = useState("");
  const [eventName, setEventName] = useState("");
  const [photoLimitPerUser, setPhotoLimitPerUser] = useState(10);
  const [revealAt, setRevealAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!ownerNickname.trim() || !eventName.trim()) {
      setError("Please enter an owner nickname and event name.");
      return;
    }
    const limit = Number(photoLimitPerUser);
    if (!Number.isFinite(limit) || limit < 0 || limit > 9999) {
      setError("Please provide a valid photo limit (0-9999).");
      return;
    }
    setSubmitting(true);
    try {
      const { auth, db } = getFirebaseClient();
      await ensureAnonymousAuth(auth);

      const eventData = {
        name: eventName.trim(),
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        isRevealed: false,
        photoLimitPerUser: limit,
      };
      if (revealAt) {
        const dt = new Date(revealAt);
        if (!isNaN(dt.getTime())) {
          eventData.revealAt = Timestamp.fromDate(dt);
        }
      }

      const eventsCol = collection(db, "events");
      const eventRef = await addDoc(eventsCol, eventData);

      const participantRef = doc(db, "events", eventRef.id, "participants", auth.currentUser.uid);
      await setDoc(participantRef, {
        nickname: ownerNickname.trim(),
        role: "owner",
        uploadedCount: 0,
        createdAt: serverTimestamp(),
      });

      router.push(`/events/${eventRef.id}/admin`);
    } catch (err) {
      console.error(err);
      setError("Failed to create event. Please try again.");
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
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 retro-surface p-6"
      >
        <h1 className="text-2xl font-semibold">Create Event</h1>
        {/* ...existing code... */}
      </form>
    </div>
  );
}



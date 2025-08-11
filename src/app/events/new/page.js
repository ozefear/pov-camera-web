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
import toast from "react-hot-toast";

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

      toast.success("Event created!");
      router.push(`/events/${eventRef.id}/admin`);
    } catch (err) {
      toast.error("Failed to create event. Please try again.");
      setError("Failed to create event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 retro-surface p-6"
      >
        <h1 className="text-2xl font-semibold">Create Event</h1>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Owner Nickname</label>
          <input
            className="w-full h-11 px-3 rounded border bg-transparent"
            value={ownerNickname}
            onChange={(e) => setOwnerNickname(e.target.value)}
            placeholder="Your nickname"
            maxLength={50}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Event Name</label>
          <input
            className="w-full h-11 px-3 rounded border bg-transparent"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g., Summer Party"
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Photo Limit Per User</label>
          <input
            type="number"
            className="w-full h-11 px-3 rounded border bg-transparent"
            value={photoLimitPerUser}
            onChange={(e) => setPhotoLimitPerUser(e.target.value)}
            min={0}
            max={9999}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Event End (optional)</label>
          <input
            type="datetime-local"
            className="w-full h-11 px-3 rounded border bg-transparent"
            value={revealAt}
            onChange={(e) => setRevealAt(e.target.value)}
          />
          <p className="text-xs text-gray-500">Used for countdown display; owner still ends event to reveal.</p>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}



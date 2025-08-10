"use client";
import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { getFirebaseClient } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function EventSharePage() {
  const params = useParams();
  const eventId = params?.eventId;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const joinUrl = useMemo(() => {
    if (!eventId) return "";
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    return `${origin}/events/${eventId}/join`;
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { db } = getFirebaseClient();
        const ref = doc(db, "events", eventId);
        const snap = await getDoc(ref);
        if (!cancelled) {
          if (snap.exists()) setEvent({ id: snap.id, ...snap.data() });
          else setError("Event not found");
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load event");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (eventId) load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!event) return null;

  return (
    <div className="min-h-screen p-8 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-semibold">{event.name}</h1>
      <p className="text-sm text-gray-700">Share this link or QR to invite participants.</p>
      <div className="w-full max-w-lg space-y-4 retro-surface p-6">
        <div className="flex items-center justify-center">
          {joinUrl ? <QRCodeSVG value={joinUrl} size={200} /> : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Join URL</label>
          <input className="w-full h-11 px-3 rounded border bg-transparent" value={joinUrl} readOnly />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              const svg = document.querySelector('svg');
              if (!svg) return;
              const svgData = new XMLSerializer().serializeToString(svg);
              const canvas = document.createElement('canvas');
              const size = svg.getAttribute('width') || 200;
              canvas.width = canvas.height = size;
              const ctx = canvas.getContext('2d');
              const img = new window.Image();
              const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
              const url = URL.createObjectURL(svgBlob);
              img.onload = function () {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                canvas.toBlob(function(blob) {
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `event-qr-${eventId}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  setTimeout(() => URL.revokeObjectURL(link.href), 100);
                }, 'image/png');
              };
              img.onerror = function () {
                URL.revokeObjectURL(url);
                alert('Failed to convert QR code to PNG.');
              };
              img.src = url;
            }}
          >
            Download QR Code
          </button>
          <button
            type="button"
            className="h-11 px-4 rounded-lg border"
            onClick={() => navigator.clipboard.writeText(joinUrl)}
          >
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}



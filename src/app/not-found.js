"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function NotFound() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--background)] text-[var(--foreground)]">
      <div
        className={`retro-surface p-10 shadow-lg ${!showContent ? "hidden" : "fade-in"}`}
      >
        <h1 className={`glitch ${!showContent ? "hidden" : ""}`} aria-label="404">
          <span aria-hidden="true" className={!showContent ? "hidden" : ""}>
            404
          </span>
          404
          <span aria-hidden="true" className={!showContent ? "hidden" : ""}>
            404
          </span>
        </h1>
        <p className="mt-4 text-lg">
            You went too far back into the past. There is no such page...
        </p>
        <a href="/" className="btn-primary mt-6 inline-block">
          Back to Home
        </a>

        <style jsx>{`
          .retro-surface {
            background-color: var(--retro-surface);
            border: 1px solid var(--retro-border);
            border-radius: 12px;
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04),
              0 8px 20px rgba(0, 0, 0, 0.05);
            position: relative;
            overflow: hidden;
          }
          .retro-surface::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: repeating-linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.04) 0px,
              rgba(0, 0, 0, 0.04) 1px,
              transparent 2px
            );
            z-index: 10;
            mix-blend-mode: multiply;
            border-radius: 12px;
          }
          .hidden {
            display: none !important;
          }

          /* Kutunun fade-in animasyonu */
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          .fade-in {
            animation: fade-in 0.8s ease forwards;
          }

          .glitch {
            font-size: 6rem;
            font-weight: 700;
            text-transform: uppercase;
            position: relative;
            color: var(--brand-brown);
            animation: glitch 500ms infinite;
          }

          .glitch span {
            position: absolute;
            top: 0;
            left: 0;
            color: transparent;
            opacity: 0.15;
            animation-fill-mode: forwards;
          }

          .glitch span:first-child {
            animation: glitch 650ms infinite;
            clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
            transform: translate(-0.01em, -0.006em);
          }

          .glitch span:last-child {
            animation: glitch 375ms infinite;
            clip-path: polygon(0 80%, 100% 20%, 100% 100%, 0 100%);
            transform: translate(0.006em, 0.01em);
          }

          @keyframes glitch {
            0%,
            14% {
              text-shadow:
                0.02em 0 0 rgba(255, 0, 0, 0.15),
                -0.02em -0.01em 0 rgba(0, 255, 0, 0.15),
                -0.01em 0.02em 0 rgba(0, 0, 255, 0.15);
            }
            15%,
            49% {
              text-shadow:
                -0.02em -0.01em 0 rgba(255, 0, 0, 0.15),
                0.01em 0.01em 0 rgba(0, 255, 0, 0.15),
                -0.02em -0.02em 0 rgba(0, 0, 255, 0.15);
            }
            50%,
            99% {
              text-shadow:
                0.01em 0.02em 0 rgba(255, 0, 0, 0.15),
                0.02em 0 0 rgba(0, 255, 0, 0.15),
                0 -0.02em 0 rgba(0, 0, 255, 0.15);
            }
            100% {
              text-shadow:
                -0.01em 0 0 rgba(255, 0, 0, 0.15),
                -0.01em -0.01em 0 rgba(0, 255, 0, 0.15),
                -0.01em -0.02em 0 rgba(0, 0, 255, 0.15);
            }
          }
        `}</style>
      </div>
    </main>
  );
}

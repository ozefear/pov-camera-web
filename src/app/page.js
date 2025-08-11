import { Analytics } from "@vercel/analytics/next"

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <main className="max-w-xl w-full text-center space-y-6 retro-surface p-8">
        <h1 className="text-3xl sm:text-4xl font-semibold">📷 POV Disposable Camera App</h1>
        <p>
          Capture memories together with the charm of a disposable camera.
        </p>
        <div className="flex items-center justify-center">
          <a
            href="/events/new"
            className="btn-primary"
            aria-label="Create Event"
          >
            ➕ Create Event
          </a>
        </div>
      </main>
      <Analytics />
    </div>
    
  );
}

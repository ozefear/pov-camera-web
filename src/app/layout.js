import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FirebaseBootstrap from "@/app/firebase-bootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "POV Disposable Camera App",
  description: "Create or join an event, capture photos, and reveal the gallery.",
  openGraph: {
    title: "POV Disposable Camera App",
    description: "Create or join an event, capture photos, and reveal the gallery.",
    images: [
      {
        url: "/images/image.png",
        width: 1200,
        height: 628,
        alt: "POV Disposable Camera App",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "POV Disposable Camera App",
    description: "Create or join an event, capture photos, and reveal the gallery.",
    image: "/images/image.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FirebaseBootstrap />
        {children}
      </body>
    </html>
  );
}

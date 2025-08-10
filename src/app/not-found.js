"use client";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-7xl font-bold text-gray-800">404</h1>
      <p className="mt-4 text-lg text-gray-600">Aradığınız sayfa bulunamadı.</p>
      <Link
        href="/"
        className="mt-6 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}

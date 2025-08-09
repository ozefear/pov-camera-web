"use client";
import { useEffect } from "react";
import { getFirebaseClient, ensureAnonymousAuth } from "@/lib/firebaseClient";

export default function FirebaseBootstrap() {
  useEffect(() => {
    const { auth } = getFirebaseClient();
    ensureAnonymousAuth(auth).catch(() => {});
  }, []);
  return null;
}



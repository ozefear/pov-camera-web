import { getFirebaseClient } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";

export async function generateMetadata({ params }) {
  const eventId = params?.eventId;
  let title = "Join Event";
  try {
    const { db } = getFirebaseClient();
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    if (eventSnap.exists()) {
      const eventData = eventSnap.data();
      let ownerName = "";
      if (eventData.ownerId) {
        const ownerParticipantRef = doc(db, "events", eventId, "participants", eventData.ownerId);
        const ownerParticipantSnap = await getDoc(ownerParticipantRef);
        if (ownerParticipantSnap.exists()) {
          ownerName = ownerParticipantSnap.data().nickname || "";
        }
      }
      title = `Join ${eventData.name}${ownerName ? ` by ${ownerName}` : ""}`;
    }
  } catch {}
  return { title };
}

import { openDB } from "idb";

const DB_NAME = "pov-camera-web";
const DB_VERSION = 1;
const STORE_PHOTOS = "photos";

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        const store = db.createObjectStore(STORE_PHOTOS, { keyPath: "id", autoIncrement: true });
        store.createIndex("byEvent", "eventId");
        store.createIndex("byCreatedAt", "createdAt");
      }
    },
  });
}

export async function saveLocalPhoto(photo) {
  const db = await getDb();
  const id = await db.add(STORE_PHOTOS, photo);
  return { ...photo, id };
}

export async function listLocalPhotosByEvent(eventId) {
  const db = await getDb();
  return db.getAllFromIndex(STORE_PHOTOS, "byEvent", IDBKeyRange.only(eventId));
}



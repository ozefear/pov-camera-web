import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { uploadPhoto, listEventPhotos, getPublicUrl } from '@/lib/googleDrive';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function POST(request, { params }) {
  try {
    const { eventId } = params;
    const formData = await request.formData();
    const file = formData.get('photo');
    const nickname = formData.get('nickname');
    const isOwner = formData.get('isOwner') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check event exists and get photo limit
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);
    
    if (!eventDoc.exists()) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventData = eventDoc.data();
    const photoLimit = eventData.photoLimit || 10;

    // Check participant's upload count
    if (!isOwner) {
      const participantRef = doc(db, 'events', eventId, 'participants', nickname);
      const participantDoc = await getDoc(participantRef);
      
      if (!participantDoc.exists()) {
        return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
      }

      const participantData = participantDoc.data();
      if (participantData.uploadedCount >= photoLimit) {
        return NextResponse.json({ error: 'Photo limit reached' }, { status: 400 });
      }
    }

    // Convert file to buffer for Google Drive
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Google Drive
    const timestamp = Date.now();
    const photoId = `${nickname}_${timestamp}`;

    const uploadResult = await uploadPhoto(eventId, photoId, buffer, file.type);
    
    // Get public URL for the photo
    const publicUrl = await getPublicUrl(uploadResult.fileId);

    // Update participant's upload count
    if (!isOwner) {
      const participantRef = doc(db, 'events', eventId, 'participants', nickname);
      await updateDoc(participantRef, {
        uploadedCount: increment(1)
      });
    }

    return NextResponse.json({ 
      success: true, 
      photoId,
      fileId: uploadResult.fileId,
      downloadURL: publicUrl,
      timestamp 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const { eventId } = params;
    const { searchParams } = new URL(request.url);
    const nickname = searchParams.get('nickname');

    // List all photos from Google Drive
    const drivePhotos = await listEventPhotos(eventId);

    const photos = [];
    for (const drivePhoto of drivePhotos) {
      const [photoNickname, timestamp] = drivePhoto.photoId.split('_');
      
      // Filter by nickname if specified
      if (nickname && photoNickname !== nickname) {
        continue;
      }

      photos.push({
        photoId: drivePhoto.photoId,
        fileId: drivePhoto.fileId,
        downloadURL: drivePhoto.webContentLink,
        nickname: photoNickname,
        timestamp: parseInt(timestamp),
        uploadTime: new Date(drivePhoto.createdTime).toISOString()
      });
    }

    // Sort by upload time (newest first)
    photos.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ photos });

  } catch (error) {
    console.error('List photos error:', error);
    return NextResponse.json({ error: 'Failed to list photos' }, { status: 500 });
  }
}



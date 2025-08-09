import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getPhoto, deletePhoto } from '@/lib/googleDrive';

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

export async function GET(request, { params }) {
  try {
    const { photoId } = params;
    
    // Extract fileId from photoId (assuming format: nickname_timestamp)
    // For now, we'll need to store fileId in Firestore or use a different approach
    // This is a simplified version - you might want to store fileId in Firestore
    
    // For this example, we'll redirect to the Google Drive URL
    // In a real implementation, you'd store the fileId in Firestore
    
    return NextResponse.json({ error: 'Direct file access not implemented' }, { status: 404 });
    
  } catch (error) {
    console.error('Get photo error:', error);
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { eventId, photoId } = params;
    
    // Parse photoId to get nickname
    const [nickname, timestamp] = photoId.split('_');
    
    // For this implementation, we need to get the fileId from Firestore
    // You should store the fileId when uploading photos
    
    // This is a simplified version - in practice, you'd store fileId in Firestore
    // and retrieve it here for deletion
    
    // For now, we'll return an error
    return NextResponse.json({ error: 'Delete not implemented - need fileId storage' }, { status: 500 });
    
    // Once you have fileId:
    // await deletePhoto(fileId);
    
    // Refund participant's upload count
    // const participantRef = doc(db, 'events', eventId, 'participants', nickname);
    // const participantDoc = await getDoc(participantRef);
    
    // if (participantDoc.exists()) {
    //   await updateDoc(participantRef, {
    //     uploadedCount: increment(-1)
    //   });
    // }
    
    // return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}



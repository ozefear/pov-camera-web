import { google } from 'googleapis';

// Initialize Google Drive API
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS || '{}'),
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Create a folder for the event if it doesn't exist
export async function getOrCreateEventFolder(eventId) {
  try {
    // Check if folder already exists
    const response = await drive.files.list({
      q: `name='${eventId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name)',
    });

    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create new folder
    const folderMetadata = {
      name: eventId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID], // Parent folder ID
    };

    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });

    return folder.data.id;
  } catch (error) {
    console.error('Error creating/getting folder:', error);
    throw error;
  }
}

// Upload photo to Google Drive
export async function uploadPhoto(eventId, photoId, buffer, mimeType = 'image/jpeg') {
  try {
    const folderId = await getOrCreateEventFolder(eventId);
    
    const fileMetadata = {
      name: `${photoId}.jpg`,
      parents: [folderId],
    };

    const media = {
      mimeType,
      body: buffer,
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    return {
      fileId: file.data.id,
      webViewLink: file.data.webViewLink,
      webContentLink: file.data.webContentLink,
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
}

// Get photo from Google Drive
export async function getPhoto(fileId) {
  try {
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media',
    }, { responseType: 'arraybuffer' });
    
    return response.data;
  } catch (error) {
    console.error('Error getting photo from Google Drive:', error);
    throw error;
  }
}

// Delete photo from Google Drive
export async function deletePhoto(fileId) {
  try {
    await drive.files.delete({
      fileId: fileId,
    });
    return true;
  } catch (error) {
    console.error('Error deleting from Google Drive:', error);
    throw error;
  }
}

// List all photos in an event folder
export async function listEventPhotos(eventId) {
  try {
    const folderId = await getOrCreateEventFolder(eventId);
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, createdTime, webViewLink, webContentLink)',
      orderBy: 'createdTime desc',
    });

    return response.data.files.map(file => ({
      photoId: file.name.replace('.jpg', ''),
      fileId: file.id,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      createdTime: file.createdTime,
    }));
  } catch (error) {
    console.error('Error listing photos from Google Drive:', error);
    throw error;
  }
}

// Get public URL for a photo
export async function getPublicUrl(fileId) {
  try {
    // Make the file publicly readable
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get the file details
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'webContentLink',
    });

    return file.data.webContentLink;
  } catch (error) {
    console.error('Error getting public URL:', error);
    throw error;
  }
}

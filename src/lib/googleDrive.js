import { google } from 'googleapis';
import { Readable } from 'stream';

// Google Drive API auth
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS || '{}'),
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Buffer → Readable Stream dönüştürücü
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

// Event klasörü oluşturma/alma
export async function getOrCreateEventFolder(eventId) {
  try {
    const response = await drive.files.list({
      q: `name='${eventId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name)',
    });

    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    const folderMetadata = {
      name: eventId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID],
    };

    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });

    return folder.data.id;
  } catch (error) {
    console.error('Error creating/getting folder:', error.response?.data || error.message);
    throw error;
  }
}

// Fotoğraf yükleme
export async function uploadPhoto(eventId, photoId, buffer, mimeType = 'image/jpeg') {
  console.log(`[UPLOAD] Başladı -> EventID: ${eventId}, PhotoID: ${photoId}, MimeType: ${mimeType}`);

  try {
    console.log("[UPLOAD] Event klasörü kontrol ediliyor...");
    const folderId = await getOrCreateEventFolder(eventId);
    console.log("[UPLOAD] Event klasörü bulundu/oluşturuldu:", folderId);

    const extension = mimeType === 'image/png' ? 'png' : 'jpg';

    const fileMetadata = {
      name: `${photoId}.${extension}`,
      parents: [folderId],
    };

    console.log("[UPLOAD] Dosya metadatası hazır:", fileMetadata);

    const media = {
      mimeType,
      body: bufferToStream(buffer),
    };

    console.log("[UPLOAD] Dosya Google Drive'a yükleniyor...");
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    console.log("[UPLOAD] Yükleme başarılı:", file.data);

    return {
      fileId: file.data.id,
      webViewLink: file.data.webViewLink,
      webContentLink: file.data.webContentLink,
    };
  } catch (error) {
    console.error("[UPLOAD] HATA ->", error.response?.data || error.message || error);
    throw error;
  }
}

// Fotoğraf getirme
export async function getPhoto(fileId) {
  try {
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting photo from Google Drive:', error.response?.data || error.message);
    throw error;
  }
}

// Fotoğraf silme
export async function deletePhoto(fileId) {
  try {
    await drive.files.delete({ fileId: fileId });
    return true;
  } catch (error) {
    console.error('Error deleting from Google Drive:', error.response?.data || error.message);
    throw error;
  }
}

// Event klasöründeki fotoğrafları listeleme
export async function listEventPhotos(eventId) {
  try {
    const folderId = await getOrCreateEventFolder(eventId);

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, createdTime, webViewLink, webContentLink)',
      orderBy: 'createdTime desc',
    });

    return response.data.files.map(file => ({
      photoId: file.name.replace(/\.(jpg|png)$/i, ''),
      fileId: file.id,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      createdTime: file.createdTime,
    }));
  } catch (error) {
    console.error('Error listing photos from Google Drive:', error.response?.data || error.message);
    throw error;
  }
}

// Fotoğrafı public URL'ye açma
export async function getPublicUrl(fileId) {
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const file = await drive.files.get({
      fileId: fileId,
      fields: 'webContentLink',
    });

    return file.data.webContentLink;
  } catch (error) {
    console.error('Error getting public URL:', error.response?.data || error.message);
    throw error;
  }
}

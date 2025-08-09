# Deploy to Vercel - Free Hosting with Google Drive

## 🎉 Completely Free Solution!

Your app now uses **Google Drive** for photo storage (15GB free) instead of Firebase Storage (which costs money).

## Prerequisites
- GitHub account (free)
- Vercel account (free)
- Firebase project (free tier - for database only)
- Google Cloud project (free tier)

## Step 1: Set Up Google Cloud Project

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Note your **Project ID**

### 1.2 Enable Google Drive API
1. Go to "APIs & Services" → "Library"
2. Search for "Google Drive API"
3. Click "Enable"

### 1.3 Create Service Account
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in details:
   - **Name**: `pov-camera-drive`
   - **Description**: `Service account for POV Camera photo storage`
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Click "Done"

### 1.4 Generate JSON Key
1. Click on your service account
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. **Download the JSON file** (keep it safe!)

### 1.5 Set Up Google Drive Folder
1. Create a folder in Google Drive (e.g., "POV Camera Photos")
2. Right-click the folder → "Share"
3. Add your service account email (from the JSON file)
4. Give "Editor" permissions
5. **Copy the folder ID** from the URL

## Step 2: Push to GitHub

1. Create a new repository on GitHub
2. Push your code:
```bash
git add .
git commit -m "Add Google Drive integration"
git remote add origin https://github.com/yourusername/pov-camera-web.git
git push -u origin main
```

## Step 3: Set Up Firebase (Database Only)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Enable these services:
   - **Authentication** → Anonymous auth
   - **Firestore Database** → Native mode
   - ~~Storage~~ (NOT needed - using Google Drive instead)

4. Get your config:
   - Project Settings → General → Your apps → Web app
   - Copy the config object

## Step 4: Deploy to Vercel

1. Go to [Vercel](https://vercel.com/) and sign up with GitHub
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave empty)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

## Step 5: Add Environment Variables

In Vercel dashboard → Your Project → Settings → Environment Variables:

### Firebase (Database Only)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Google Drive (Photo Storage)
```
GOOGLE_DRIVE_CREDENTIALS={"type":"service_account","project_id":"your_project_id",...}
GOOGLE_DRIVE_ROOT_FOLDER_ID=your_folder_id_from_google_drive
```

**Important**: For `GOOGLE_DRIVE_CREDENTIALS`, copy the entire JSON content from your downloaded service account key file.

## Step 6: Deploy Firebase Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules (database only)
firebase deploy --only firestore:rules
```

## Step 7: Test Your App

1. Vercel will automatically deploy when you push to GitHub
2. Your app will be available at: `https://your-project.vercel.app`
3. Test all features:
   - Create event
   - Join event
   - Upload photos (stored in Google Drive)
   - View gallery

## Free Tier Limits

**Vercel Free:**
- 100GB bandwidth/month
- 100GB storage
- 100GB function execution time

**Firebase Free (Database Only):**
- 1GB Firestore storage
- 50,000 reads/day
- 20,000 writes/day

**Google Drive Free:**
- 15GB storage
- Unlimited bandwidth
- Perfect for your app!

## Cost Comparison

| Service | Firebase Storage | Google Drive |
|---------|------------------|--------------|
| **Free Tier** | 5GB storage | 15GB storage |
| **After Free** | $0.026/GB/month | $0.02/GB/month |
| **Bandwidth** | $0.15/GB | Free |
| **Your App** | ❌ Expensive | ✅ **Free Forever!** |

## Troubleshooting

**Build Errors:**
- Check all environment variables are set correctly
- Ensure Google Drive credentials are valid JSON
- Verify folder ID is correct

**Firebase Errors:**
- Verify Firestore rules are deployed
- Check authentication is enabled
- Ensure Firestore is in Native mode

**Photo Upload Issues:**
- ✅ Using Google Drive (persistent and free)
- Check Google Drive credentials
- Verify folder permissions
- Photos will survive Vercel redeploys

## Deployment Checklist

Before deploying, ensure:

- [ ] Google Cloud project created
- [ ] Google Drive API enabled
- [ ] Service account created and JSON key downloaded
- [ ] Google Drive folder created and shared with service account
- [ ] All environment variables are set in Vercel
- [ ] Firebase Authentication (Anonymous) is enabled
- [ ] Firestore Database is in Native mode
- [ ] Firestore rules are deployed (`firebase deploy --only firestore:rules`)
- [ ] Code is pushed to GitHub
- [ ] Vercel project is connected to GitHub repo

## Next Steps

1. **Custom Domain**: Add your own domain in Vercel
2. **Analytics**: Add Vercel Analytics
3. **Monitoring**: Set up error tracking
4. **Backup**: Regular database backups

Your app is now **completely free** and will stay free forever! 🎉

## Quick Deploy Script

Run this in your project directory:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Google Drive Benefits

✅ **15GB free storage** (vs 5GB Firebase)  
✅ **Unlimited bandwidth** (vs expensive Firebase bandwidth)  
✅ **No costs after free tier** for your use case  
✅ **Familiar interface** - photos stored in your Google Drive  
✅ **Easy sharing** - access photos directly in Drive  
✅ **Reliable** - Google's infrastructure  
✅ **CDN included** - fast global delivery

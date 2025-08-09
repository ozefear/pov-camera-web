#!/bin/bash

echo "🚀 POV Camera App - Free Deployment with Google Drive"
echo "======================================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git not initialized. Please run:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if remote is set
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ No remote repository set. Please:"
    echo "   1. Create a repository on GitHub"
    echo "   2. Run: git remote add origin https://github.com/yourusername/pov-camera-web.git"
    exit 1
fi

echo "✅ Git repository ready"

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please check your code."
    exit 1
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git add .
git commit -m "Add Google Drive integration for free photo storage"
git push origin main

echo "✅ Code pushed to GitHub!"
echo ""
echo "🎯 Next Steps:"
echo "1. Go to https://console.cloud.google.com and create a project"
echo "2. Enable Google Drive API"
echo "3. Create a service account and download JSON key"
echo "4. Create a Google Drive folder and share it with service account"
echo "5. Go to https://vercel.com and sign up with GitHub"
echo "6. Import your repository"
echo "7. Add environment variables (see DEPLOYMENT.md)"
echo "8. Deploy!"
echo ""
echo "💰 Cost: $0 (completely free forever!)"
echo "📖 See DEPLOYMENT.md for detailed instructions"
echo ""
echo "🔗 Google Drive Setup:"
echo "   - 15GB free storage"
echo "   - Unlimited bandwidth"
echo "   - Photos stored in your Google Drive"
echo "   - Easy access and sharing"

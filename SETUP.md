# 🌱 Eco Vigyan Foundation - Environment Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables** (see detailed instructions below)

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📋 Required Environment Variables

### 1. MongoDB Database (REQUIRED) ✅

The application needs MongoDB to store users, mushrooms, trails, and other data.

#### Option A: MongoDB Atlas (Cloud - Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (free tier available)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Replace `<password>` with your database password
7. Add to `.env.local`:
   ```
   MONGODB_URI=mongodb+srv://username:your-password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB=eco-vigyan
   ```

#### Option B: Local MongoDB
1. Install MongoDB locally: [Installation Guide](https://docs.mongodb.com/manual/installation/)
2. Start MongoDB service
3. Add to `.env.local`:
   ```
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB=eco-vigyan
   ```

### 2. NextAuth Secret (REQUIRED) ✅

Used for session encryption and security.

#### Generate a Secret:

**Option A: Using OpenSSL (Mac/Linux/Git Bash)**
```bash
openssl rand -base64 32
```

**Option B: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option C: Online Generator**
Visit: https://generate-secret.vercel.app/32

Add to `.env.local`:
```
NEXTAUTH_SECRET=your-generated-secret-here
```

---

## 🎨 Optional Environment Variables

### 3. Cloudinary (Image Upload) - Optional

For mushroom photos and gallery images.

1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Go to Dashboard
3. Find your credentials:
   - Cloud Name
   - API Key
   - API Secret
4. Add to `.env.local`:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

**Note:** Without Cloudinary, image upload features will be disabled.

---

### 4. Mapbox (Maps) - Optional

For mushroom mapping and trail visualization.

1. Sign up at [Mapbox](https://www.mapbox.com/)
2. Go to Account → Tokens
3. Create a new token or copy the default public token
4. Add to `.env.local`:
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxx
   ```

**Note:** Without Mapbox, map features will not work.

---

### 5. Email Configuration - Optional

For password reset and notifications.

#### Option A: Using Gmail (Simple Setup)
1. Enable 2-Factor Authentication on your Google Account
2. Generate an App Password: [Instructions](https://support.google.com/accounts/answer/185833)
3. Add to `.env.local`:
   ```
   EMAIL_SERVER=smtp://your-email@gmail.com:your-app-password@smtp.gmail.com:587
   EMAIL_FROM=your-email@gmail.com
   ```

#### Option B: Using Resend (Recommended for Production)
1. Sign up at [Resend](https://resend.com/)
2. Get your API key
3. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM=noreply@yourdomain.com
   ```

**Note:** Without email configuration, password reset won't work.

---

### 6. Google Maps API (Geocoding) - Optional

For converting coordinates to addresses.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Geocoding API"
4. Create credentials → API Key
5. Add to `.env.local`:
   ```
   GOOGLE_MAPS_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxx
   ```

**Note:** Without this, location names may not display correctly.

---

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
Application runs on: http://localhost:3000

### Production Build
```bash
npm run build
npm start
```

---

## ✅ Verification Checklist

After setting up your `.env.local` file:

- [ ] MongoDB connection string is added
- [ ] NextAuth secret is generated and added
- [ ] Application starts without errors
- [ ] Can access http://localhost:3000
- [ ] (Optional) Cloudinary credentials added for image uploads
- [ ] (Optional) Mapbox token added for maps
- [ ] (Optional) Email configured for notifications

---

## 🔧 Troubleshooting

### Error: "MONGODB_URI is not defined"
- Make sure `.env.local` exists in the project root
- Check that `MONGODB_URI` is set correctly
- Restart the development server after adding environment variables

### Error: "Invalid MongoDB connection string"
- Verify your connection string format
- Ensure password doesn't contain special characters (or URL encode them)
- Check network connection to MongoDB Atlas

### Error: "Missing NEXTAUTH_SECRET"
- Generate a secret using one of the methods above
- Make sure it's at least 32 characters long
- Restart the development server

### Images not uploading
- Verify Cloudinary credentials are correct
- Check that all three Cloudinary variables are set
- Test credentials in Cloudinary dashboard

### Maps not loading
- Verify Mapbox token starts with `pk.`
- Check token is set in `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Make sure variable name has `NEXT_PUBLIC_` prefix

---

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [MongoDB Atlas Setup](https://docs.atlas.mongodb.com/getting-started/)
- [NextAuth.js Configuration](https://next-auth.js.org/configuration/options)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Mapbox Documentation](https://docs.mapbox.com/)

---

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all required environment variables are set
3. Check the terminal for specific error messages
4. Review the application logs

---

**Note:** Never commit your `.env.local` file to version control. It contains sensitive credentials.



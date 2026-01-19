# Supabase Setup Guide

## OLFU-QC Commute Smart App - Database Migration

This guide walks you through completing the Firebase to Supabase migration.

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Project name**: `olfu-commute-smart`
   - **Database password**: Choose a strong password (save it!)
   - **Region**: Choose closest to Philippines (Singapore recommended)
4. Wait for the project to be created (1-2 minutes)

---

## Step 2: Get Your API Keys

1. Go to **Settings** > **API** in your Supabase dashboard
2. Copy these values:

   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)

3. Update `config/supabase.js`:

```javascript
const SUPABASE_URL = "https://your-project-id.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key-here";
```

---

## Step 3: Create Database Tables

1. Go to **SQL Editor** in Supabase dashboard
2. Click "New Query"
3. Paste and run this SQL:

```sql
-- Profiles table (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  provider TEXT DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friends table
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Locations table (for real-time sharing)
CREATE TABLE locations (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  shared_with UUID[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency contacts
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOS Alerts
CREATE TABLE sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  message TEXT DEFAULT 'Emergency SOS Alert!',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route history
CREATE TABLE route_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  origin JSONB,
  destination JSONB,
  route_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own friends" ON friends FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view shared locations" ON locations FOR SELECT USING (auth.uid() = user_id OR auth.uid() = ANY(shared_with));
CREATE POLICY "Users can update own location" ON locations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own contacts" ON emergency_contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own alerts" ON sos_alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own routes" ON route_history FOR ALL USING (auth.uid() = user_id);

-- Enable realtime for locations
ALTER PUBLICATION supabase_realtime ADD TABLE locations;
```

4. Click "Run" (or press Ctrl+Enter)

---

## Step 4: Configure Google OAuth

### In Supabase Dashboard:

1. Go to **Authentication** > **Providers**
2. Find **Google** and enable it
3. You'll need:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret

### In Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create one)
3. Go to **APIs & Services** > **Credentials**
4. Find your OAuth 2.0 Client ID (or create one)
5. Add to **Authorized redirect URIs**:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```

### Existing Google Client IDs (from Firebase):

- Web: `136238380487-n0b7cv78h6vuagm8ec8cnasrgiauqj4n.apps.googleusercontent.com`
- Android: `136238380487-1vaejbo3fo386l4t7bmc7r2e9ogikhaq.apps.googleusercontent.com`
- iOS: `136238380487-q5ed7siarbfn3cge282hu6n15dfnc54c.apps.googleusercontent.com`

---

## Step 5: Update App Configuration

1. Open `config/supabase.js`
2. Replace placeholder values:

```javascript
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

---

## Step 6: Test the App

```bash
# Start the development server
npm start

# Or for specific platform
npm run android
npm run ios
npm run web
```

---

## Migration Summary

| Feature      | Before (Firebase)    | After (Supabase)             |
| ------------ | -------------------- | ---------------------------- |
| Auth         | Firebase Auth        | Supabase Auth                |
| Database     | Firestore            | PostgreSQL                   |
| Real-time    | Firestore onSnapshot | Supabase Realtime            |
| File Storage | Firebase Storage     | Supabase Storage (if needed) |

---

## Files Changed

| File                       | Change                                    |
| -------------------------- | ----------------------------------------- |
| `config/supabase.js`       | **NEW** - Supabase client & all functions |
| `config/firebase.js`       | Kept for reference (can be deleted)       |
| `hooks/useGoogleAuth.js`   | Updated for Supabase OAuth                |
| `app/index.js`             | Import changed to supabase                |
| `app/(tabs)/profile.js`    | Import changed to supabase                |
| `utils/usabilityLogger.js` | Comments updated                          |

---

## Troubleshooting

### "Invalid API key"

- Double-check your `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Make sure there are no extra spaces or quotes

### "User not found" after sign up

- Email confirmation might be enabled. Check **Authentication** > **Settings** > **Email Auth**
- You can disable "Confirm email" for development

### Google Sign-In not working

- Verify redirect URI is added to Google Cloud Console
- Check that Google provider is enabled in Supabase
- Make sure Client ID and Secret are correct

### Real-time updates not working

- Verify the table is added to `supabase_realtime` publication
- Check RLS policies allow the user to see the data

---

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [React Native + Supabase Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

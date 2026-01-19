# Clerk Authentication Setup Guide

## Step 1: Install Packages

Run this command in your terminal:
```bash
npm install @clerk/clerk-expo
```

## Step 2: Get Your Clerk API Key

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Sign up or log in
3. Create a new application (or select existing one)
4. Go to **API Keys** section
5. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)

## Step 3: Configure Environment Variables

Create a `.env` file in the root of your project (`olfu-project` folder):

```env
CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

Or update `config/clerk.js` directly with your key:

```javascript
export const clerkPublishableKey = 'pk_test_YOUR_ACTUAL_KEY_HERE';
```

## Step 4: Configure Clerk Dashboard

1. In Clerk Dashboard, go to **Paths** section
2. Set these redirect URLs:
   - **After Sign In**: `/(tabs)`
   - **After Sign Up**: `/(tabs)`
   - **After Sign Out**: `/`

3. Enable authentication methods you want:
   - Email/Password (enabled by default)
   - Google OAuth (optional)
   - Apple (optional)
   - Other providers as needed

## Step 5: Configure First Name & Last Name Collection

1. In Clerk Dashboard, go to **User & Authentication** → **Email, Phone, Username**
2. Enable **First Name** and **Last Name** fields
3. Set them as required during sign-up

## Features Now Available:

✅ **Email/Password Authentication**
✅ **Social Logins** (Google, Apple, etc. - if configured)
✅ **Password Reset** (handled by Clerk)
✅ **User Management Dashboard** (in Clerk Dashboard)
✅ **Session Management** (automatic)
✅ **Secure Authentication** (production-ready)

## Testing:

1. Start your app: `npm start`
2. Try signing up with email/password
3. Check Clerk Dashboard to see the new user
4. Try signing out - should redirect to login screen

## Troubleshooting:

- **"Invalid API key"**: Make sure your publishable key is correct in `config/clerk.js`
- **Redirect issues**: Check Clerk Dashboard → Paths settings
- **User data not showing**: Make sure First Name/Last Name are enabled in Clerk Dashboard

## Documentation:

- [Clerk Expo Documentation](https://clerk.com/docs/quickstarts/expo)
- [Clerk React Native Guide](https://clerk.com/docs/references/expo/overview)

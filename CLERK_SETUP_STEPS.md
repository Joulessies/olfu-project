# Clerk Authentication Setup - Step by Step Guide

Follow these steps to set up Clerk authentication in your OLFU Commute Smart App.

## Step 1: Install Clerk Package

Open your terminal in the `olfu-project` folder and run:

```bash
npm install @clerk/clerk-expo
```

Wait for the installation to complete.

---

## Step 2: Create Clerk Account & Get API Key

1. **Go to Clerk Dashboard**
   - Visit: https://dashboard.clerk.com
   - Click "Sign Up" or "Sign In"

2. **Create a New Application**
   - Click "Create Application"
   - Enter application name: `OLFU Commute Smart` (or any name)
   - Choose authentication methods:
     - ✅ Email (enabled by default)
     - ✅ Google (optional - for social login)
     - ✅ Apple (optional - for iOS)
   - Click "Create Application"

3. **Get Your Publishable Key**
   - In your Clerk Dashboard, go to **"API Keys"** (left sidebar)
   - You'll see two keys:
     - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
     - Secret Key (keep this secret!)
   - **Copy the Publishable Key** (you'll need this)

---

## Step 3: Add Your API Key to the App

1. **Open the config file**
   - Navigate to: `olfu-project/config/clerk.js`
   - You'll see this line:
     ```javascript
     export const clerkPublishableKey = 'pk_test_YOUR_KEY_HERE';
     ```

2. **Replace the placeholder**
   - Replace `'pk_test_YOUR_KEY_HERE'` with your actual Clerk publishable key
   - Example:
     ```javascript
     export const clerkPublishableKey = 'pk_test_abc123xyz789...';
     ```
   - **Save the file**

---

## Step 4: Configure Clerk Dashboard Settings

### 4.1 Enable First Name & Last Name Collection

1. In Clerk Dashboard, go to **"User & Authentication"** → **"Email, Phone, Username"**
2. Scroll down to **"Name"** section
3. Enable:
   - ✅ **First Name** (set as required)
   - ✅ **Last Name** (set as required)
4. Click **"Save"**

### 4.2 Configure Redirect URLs (Optional)

1. Go to **"Paths"** section in Clerk Dashboard
2. Set redirect URLs:
   - **After Sign In**: `/(tabs)` or leave default
   - **After Sign Up**: `/(tabs)` or leave default
   - **After Sign Out**: `/` or leave default

### 4.3 Configure Email Verification (Optional)

1. Go to **"Email, Phone, Username"** → **"Email"**
2. Choose verification method:
   - **Email Code** (recommended - user enters code)
   - **Magic Link** (user clicks link in email)
3. Click **"Save"**

---

## Step 5: Test Your Setup

1. **Start your app**
   ```bash
   npm start
   ```

2. **Open the app** on your device/simulator

3. **Test Sign Up**
   - Click "Sign Up"
   - Enter First Name, Last Name, Email, Password
   - Click "Sign Up"
   - Check your email for verification code
   - Enter the code
   - You should be redirected to the dashboard

4. **Test Sign In**
   - Sign out from profile screen
   - Enter email and password
   - Click "Sign In"
   - You should be redirected to the dashboard

5. **Verify User Data**
   - Check the home screen - should show your name
   - Check profile screen - should show your email and name

---

## Step 6: Verify Everything Works

✅ **Checklist:**
- [ ] Package installed (`@clerk/clerk-expo` in package.json)
- [ ] API key added to `config/clerk.js`
- [ ] First Name & Last Name enabled in Clerk Dashboard
- [ ] Can sign up with email/password
- [ ] Email verification works
- [ ] Can sign in with existing account
- [ ] User name appears on home screen
- [ ] Sign out redirects to login screen

---

## Troubleshooting

### Error: "Invalid API key"
- **Solution**: Double-check your publishable key in `config/clerk.js`
- Make sure there are no extra spaces or quotes
- Key should start with `pk_test_` or `pk_live_`

### Error: "First Name/Last Name not collected"
- **Solution**: Enable First Name and Last Name in Clerk Dashboard
- Go to: User & Authentication → Email, Phone, Username → Name

### Error: "Email verification not working"
- **Solution**: Check your email spam folder
- Verify email verification is enabled in Clerk Dashboard
- Make sure you're using the correct verification code

### App crashes on startup
- **Solution**: Make sure `@clerk/clerk-expo` is installed
- Check that your API key is valid
- Restart the Expo server: `npm start`

### User data not showing
- **Solution**: Make sure you're using `useUser()` hook correctly
- Check that user is signed in: `useAuth().isSignedIn`
- Verify First Name/Last Name are enabled in Clerk Dashboard

---

## Next Steps (Optional)

### Add Social Logins (Google, Apple, etc.)

1. In Clerk Dashboard, go to **"User & Authentication"** → **"Social Connections"**
2. Enable providers you want (Google, Apple, etc.)
3. Follow the setup instructions for each provider
4. The login screen will automatically show these options

### Customize Email Templates

1. Go to **"Email Templates"** in Clerk Dashboard
2. Customize verification emails, welcome emails, etc.
3. Add your branding

---

## Need Help?

- **Clerk Documentation**: https://clerk.com/docs
- **Clerk Expo Guide**: https://clerk.com/docs/quickstarts/expo
- **Clerk Support**: https://clerk.com/support

---

## Summary

1. ✅ Install: `npm install @clerk/clerk-expo`
2. ✅ Get API key from https://dashboard.clerk.com
3. ✅ Add key to `config/clerk.js`
4. ✅ Enable First Name/Last Name in Clerk Dashboard
5. ✅ Test sign up and sign in
6. ✅ Verify user data displays correctly

Your authentication system is now production-ready! 🎉

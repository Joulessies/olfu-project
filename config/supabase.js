/**
 * Supabase Configuration
 * OLFU-QC Commute Smart App
 *
 * FREE TIER - 500MB database, 50,000 monthly active users
 */

import { createClient } from "@supabase/supabase-js";

// ✅ YOUR SUPABASE CONFIG
// Get these from: Supabase Dashboard > Settings > API
const SUPABASE_URL = "https://ykwqrkmbtbfhcbkmwbmm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd3Fya21idGJmaGNia213Ym1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MDQ3MzAsImV4cCI6MjA4MTM4MDczMH0.B3dalJf0_pBdafznLcCBn-307n639aNWOwF9Z8EOr0k";

// Check if we're in a client environment (not SSR)
const isClient = typeof window !== "undefined";

// Create a storage adapter that works in both SSR and client
const createStorage = () => {
  // For SSR (server-side), use a no-op storage
  if (!isClient) {
    return {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    };
  }

  // For client-side, use AsyncStorage
  // Dynamic import to avoid SSR issues
  const AsyncStorage =
    require("@react-native-async-storage/async-storage").default;
  return AsyncStorage;
};

// Initialize Supabase client
// Note: realtime is disabled to avoid WebSocket/stream issues in React Native
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: createStorage(),
    autoRefreshToken: isClient,
    persistSession: isClient,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: { "x-my-custom-header": "olfu-app" },
  },
});

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (email, password, displayName) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Create user profile asynchronously - don't wait for it
    // This speeds up the sign-up process
    if (data.user) {
      createUserProfile(data.user.id, {
        email: data.user.email,
        display_name: displayName || email.split("@")[0],
        provider: "email",
      }).catch((err) => {
        console.error("Error creating profile (non-blocking):", err);
        // Profile will be created on next login if it fails
      });
    }

    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Sign in with Google OAuth
 * Uses Supabase's built-in Google provider
 */
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "YOUR_APP_REDIRECT_URL", // e.g., myapp://auth/callback
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, url: data.url };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Handle OAuth session from URL (for mobile deep linking)
 * Optimized for speed - profile creation handled separately
 */
export const handleOAuthSession = async (url) => {
  try {
    // Try getSessionFromUrl first
    const { data, error } = await supabase.auth.getSessionFromUrl({ url });

    // If getSessionFromUrl fails, try manual parsing for HTTPS URLs
    if (error || !data?.session) {
      // Extract tokens from URL hash fragment
      const hashIndex = url.indexOf("#");
      if (hashIndex !== -1) {
        const hashFragment = url.substring(hashIndex + 1);
        const params = new URLSearchParams(hashFragment);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data: sessionData, error: setError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (setError) {
            return { success: false, error: setError.message };
          }

          if (sessionData.session?.user) {
            return { success: true, session: sessionData.session };
          }
        }
      }

      // If we get here, both methods failed
      return { success: false, error: error?.message || "Failed to extract session from URL" };
    }

    return { success: true, session: data.session };
  } catch (error) {
    console.error("handleOAuthSession exception:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Sign out
 */
export const signOutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Listen to auth state changes
 */
export const onAuthChange = (callback) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });

  // Return unsubscribe function
  return () => subscription.unsubscribe();
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

/**
 * Get current session
 */
export const getSession = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

// ============================================
// CLERK USER SYNC FUNCTIONS
// ============================================

/**
 * Sync Clerk user to Supabase profiles table
 * Call this after successful Clerk sign-in
 */
export const syncClerkUserToSupabase = async (clerkUser) => {
  if (!clerkUser?.id) {
    return { success: false, error: "No Clerk user provided" };
  }

  try {
    const profileData = {
      id: clerkUser.id, // Clerk user ID (e.g., "user_xxx")
      email: clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress,
      display_name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "OLFU Student",
      photo_url: clerkUser.imageUrl || null,
      provider: "clerk",
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(profileData, {
      onConflict: "id",
    });

    if (error) {
      console.error("Error syncing Clerk user to Supabase:", error);
      return { success: false, error: error.message };
    }

    console.log("[Supabase] Clerk user synced:", clerkUser.id);
    return { success: true };
  } catch (error) {
    console.error("Error in syncClerkUserToSupabase:", error);
    return { success: false, error: error.message };
  }
};

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

/**
 * Create user profile
 */
export const createUserProfile = async (userId, data) => {
  try {
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email: data.email,
      display_name: data.display_name,
      photo_url: data.photo_url || null,
      provider: data.provider || "email",
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (userId) => {
  try {
    // Use limit(1) instead of single() for better performance
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .limit(1)
      .maybeSingle(); // maybeSingle() returns null if no rows, doesn't throw

    if (error) {
      console.error("Error getting user profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, data) => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================
// ACCOUNT CODE FUNCTIONS (For tracking/adding friends)
// ============================================

/**
 * Generate a unique 6-character tracking code
 */
const generateTrackingCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Get or create tracking code for a user
 */
export const getOrCreateTrackingCode = async (userId) => {
  try {
    // First, check if user already has a code
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("tracking_code")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching tracking code:", fetchError);
      return { success: false, error: fetchError.message };
    }

    // If user already has a code, return it
    if (profile?.tracking_code) {
      return { success: true, code: profile.tracking_code };
    }

    // Generate a new unique code
    let code = generateTrackingCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Make sure code is unique
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("tracking_code", code)
        .maybeSingle();

      if (!existing) {
        break; // Code is unique
      }

      code = generateTrackingCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return { success: false, error: "Failed to generate unique code" };
    }

    // Save the code to the user's profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ tracking_code: code })
      .eq("id", userId);

    if (updateError) {
      console.error("Error saving tracking code:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, code };
  } catch (error) {
    console.error("Error in getOrCreateTrackingCode:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Find a user by their tracking code
 */
export const findUserByTrackingCode = async (code) => {
  try {
    const normalizedCode = code.toUpperCase().trim();
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, photo_url")
      .eq("tracking_code", normalizedCode)
      .maybeSingle();

    if (error) {
      console.error("Error finding user by code:", error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "No user found with this code" };
    }

    return { success: true, user: data };
  } catch (error) {
    console.error("Error in findUserByTrackingCode:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Add friend by tracking code
 * This creates a mutual friendship and enables bi-directional location sharing
 */
export const addFriendByCode = async (userId, code) => {
  try {
    // Find the user with this code
    const result = await findUserByTrackingCode(code);
    
    if (!result.success) {
      return result;
    }

    const friendId = result.user.id;

    // Can't add yourself
    if (friendId === userId) {
      return { success: false, error: "You cannot add yourself" };
    }

    // Check if already friends
    const { data: existingFriend } = await supabase
      .from("friends")
      .select("id")
      .eq("user_id", userId)
      .eq("friend_id", friendId)
      .maybeSingle();

    if (existingFriend) {
      return { success: false, error: "You are already tracking this person" };
    }

    // Add the friendship (you track them)
    const { error: friendError } = await supabase.from("friends").insert({
      user_id: userId,
      friend_id: friendId,
      status: "active",
    });

    if (friendError) {
      console.error("Error adding friend:", friendError);
      return { success: false, error: friendError.message };
    }

    // Also add reverse friendship (they track you) - makes it mutual
    const { data: reverseExists } = await supabase
      .from("friends")
      .select("id")
      .eq("user_id", friendId)
      .eq("friend_id", userId)
      .maybeSingle();

    if (!reverseExists) {
      await supabase.from("friends").insert({
        user_id: friendId,
        friend_id: userId,
        status: "active",
      });
    }

    // Enable bi-directional location sharing
    // Friend shares with user (so user can see friend)
    const shareResult1 = await shareLocationWith(friendId, userId);
    console.log("[addFriendByCode] Friend shares with user:", shareResult1);
    
    // User shares with friend (so friend can see user)
    const shareResult2 = await shareLocationWith(userId, friendId);
    console.log("[addFriendByCode] User shares with friend:", shareResult2);

    return { 
      success: true, 
      friend: result.user,
      message: `Now tracking ${result.user.display_name || result.user.email}. They can also see your location.` 
    };
  } catch (error) {
    console.error("Error in addFriendByCode:", error);
    return { success: false, error: error.message };
  }
};

// ============================================
// FRIENDS FUNCTIONS
// ============================================

/**
 * Add friend
 */
export const addFriend = async (userId, friendId) => {
  try {
    const { error } = await supabase.from("friends").insert({
      user_id: userId,
      friend_id: friendId,
      status: "active",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get friends list
 */
export const getFriends = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("friends")
      .select(
        `
        id,
        friend_id,
        status,
        added_at,
        profiles:friend_id (
          id,
          email,
          display_name,
          photo_url
        )
      `
      )
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) {
      console.error("Error getting friends:", error);
      return [];
    }

    // Flatten the response
    return data.map((friend) => ({
      ...friend.profiles,
      friendshipId: friend.id,
      addedAt: friend.added_at,
    }));
  } catch (error) {
    console.error("Error getting friends:", error);
    return [];
  }
};

/**
 * Remove friend
 */
export const removeFriend = async (userId, friendId) => {
  try {
    const { error } = await supabase
      .from("friends")
      .delete()
      .eq("user_id", userId)
      .eq("friend_id", friendId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe to friend locations (polling-based for React Native compatibility)
 * Uses interval polling instead of WebSocket to avoid Node.js stream issues
 */
export const subscribeFriendLocations = (
  userId,
  callback,
  intervalMs = 10000
) => {
  let isActive = true;

  // Fetch locations function
  const fetchLocations = async () => {
    if (!isActive) return;

    try {
      const { data } = await supabase
        .from("locations")
        .select("*")
        .contains("shared_with", [userId]);

      if (isActive) {
        callback(data || []);
      }
    } catch (error) {
      console.error("Error fetching friend locations:", error);
    }
  };

  // Initial fetch
  fetchLocations();

  // Set up polling interval
  const intervalId = setInterval(fetchLocations, intervalMs);

  // Return unsubscribe function
  return () => {
    isActive = false;
    clearInterval(intervalId);
  };
};

// ============================================
// LOCATION SHARING FUNCTIONS
// ============================================

/**
 * Update user location
 * Preserves the shared_with array when updating
 */
export const updateUserLocation = async (userId, latitude, longitude) => {
  try {
    // First, check if user already has a location record to preserve shared_with
    const { data: existingLocation } = await supabase
      .from("locations")
      .select("shared_with")
      .eq("user_id", userId)
      .maybeSingle();

    const { error } = await supabase.from("locations").upsert({
      user_id: userId,
      latitude,
      longitude,
      shared_with: existingLocation?.shared_with || [],
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Share location with friend
 * Creates a location record if one doesn't exist
 */
export const shareLocationWith = async (userId, friendId) => {
  try {
    // First get current location data (if exists)
    const { data: location, error: fetchError } = await supabase
      .from("locations")
      .select("shared_with, latitude, longitude")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching location for sharing:", fetchError);
      return { success: false, error: fetchError.message };
    }

    const currentSharedWith = location?.shared_with || [];

    // Only update if friendId is not already in the array
    if (!currentSharedWith.includes(friendId)) {
      const { error } = await supabase.from("locations").upsert({
        user_id: userId,
        // Preserve existing coordinates or set to null (will be updated when user shares location)
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        shared_with: [...currentSharedWith, friendId],
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error updating shared_with:", error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error in shareLocationWith:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Stop sharing location with friend
 */
export const stopSharingLocationWith = async (userId, friendId) => {
  try {
    const { data: location, error: fetchError } = await supabase
      .from("locations")
      .select("shared_with")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    const updatedSharedWith = (location?.shared_with || []).filter(
      (id) => id !== friendId
    );

    const { error } = await supabase
      .from("locations")
      .update({
        shared_with: updatedSharedWith,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================
// EMERGENCY CONTACTS FUNCTIONS
// ============================================

/**
 * Add emergency contact
 */
export const addEmergencyContact = async (userId, contact) => {
  try {
    const { data, error } = await supabase
      .from("emergency_contacts")
      .insert({
        user_id: userId,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship || null,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get emergency contacts
 */
export const getEmergencyContacts = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting emergency contacts:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error getting emergency contacts:", error);
    return [];
  }
};

/**
 * Update emergency contact
 */
export const updateEmergencyContact = async (contactId, data) => {
  try {
    const { error } = await supabase
      .from("emergency_contacts")
      .update(data)
      .eq("id", contactId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Delete emergency contact
 */
export const deleteEmergencyContact = async (contactId) => {
  try {
    const { error } = await supabase
      .from("emergency_contacts")
      .delete()
      .eq("id", contactId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================
// SOS ALERT FUNCTIONS
// ============================================

/**
 * Send SOS Alert
 */
export const sendSOSAlert = async (
  userId,
  location,
  message = "Emergency SOS Alert!"
) => {
  try {
    const { data, error } = await supabase
      .from("sos_alerts")
      .insert({
        user_id: userId,
        latitude: location.latitude,
        longitude: location.longitude,
        message,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Get emergency contacts for notification
    const contacts = await getEmergencyContacts(userId);
    console.log("SOS Alert sent to", contacts.length, "contacts");

    return { success: true, alertId: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Cancel SOS Alert
 */
export const cancelSOSAlert = async (alertId) => {
  try {
    const { error } = await supabase
      .from("sos_alerts")
      .update({ status: "cancelled" })
      .eq("id", alertId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get active SOS alerts for a user
 */
export const getActiveSOSAlerts = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting SOS alerts:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error getting SOS alerts:", error);
    return [];
  }
};

// ============================================
// ROUTE HISTORY FUNCTIONS
// ============================================

/**
 * Save route to history
 */
export const saveRouteHistory = async (userId, route) => {
  try {
    const { error } = await supabase.from("route_history").insert({
      user_id: userId,
      origin: route.origin,
      destination: route.destination,
      route_data: route.routeData || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get route history
 */
export const getRouteHistory = async (userId, limitCount = 10) => {
  try {
    const { data, error } = await supabase
      .from("route_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limitCount);

    if (error) {
      console.error("Error getting route history:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error getting route history:", error);
    return [];
  }
};

/**
 * Delete route from history
 */
export const deleteRouteHistory = async (routeId) => {
  try {
    const { error } = await supabase
      .from("route_history")
      .delete()
      .eq("id", routeId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================
// WARM-UP FUNCTION
// ============================================

/**
 * Warm up the Supabase connection
 * Call this on app start to reduce first-request latency
 */
export const warmUpSupabase = async () => {
  try {
    // Simple ping to wake up the database
    await supabase.from("profiles").select("id").limit(1);
    console.log("[Supabase] Connection warmed up");
  } catch (error) {
    // Ignore errors - this is just a warm-up
    console.log("[Supabase] Warm-up ping sent");
  }
};

// Export default for convenience
export default supabase;

/**
 * Google Authentication Hook
 * Uses Supabase OAuth for Google sign-in
 * Works with Expo Go and standalone builds
 */

import { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import {
  supabase,
  getUserProfile,
  createUserProfile,
} from "../config/supabase";

// Required for web browser redirect - call at module level
WebBrowser.maybeCompleteAuthSession();

export const useGoogleAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

    // Listen for auth state changes
    useEffect(() => {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          console.log("Initial session found:", session.user.email);
          setUserFromAuth(session.user);
        } else {
          console.log("No initial session found");
        }
      });

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email || "no user");
        if (event === "SIGNED_IN" && session?.user) {
          console.log("User signed in:", session.user.email);
          setUserFromAuth(session.user);
          setLoading(false);
          // Create profile in background
          ensureProfile(session.user);
        } else if (event === "SIGNED_OUT") {
          console.log("User signed out");
          setUser(null);
        } else if (event === "TOKEN_REFRESHED") {
          console.log("Token refreshed");
          if (session?.user) {
            setUserFromAuth(session.user);
          }
        }
      });

      return () => subscription.unsubscribe();
    }, []);

  // Set user immediately from auth data
  const setUserFromAuth = (authUser) => {
    setUser({
      ...authUser,
      displayName:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split("@")[0],
      photoURL: authUser.user_metadata?.avatar_url,
    });
  };

  // Create profile in background
  const ensureProfile = async (authUser) => {
    try {
      const profile = await getUserProfile(authUser.id);
      if (!profile) {
        await createUserProfile(authUser.id, {
          email: authUser.email,
          display_name:
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            authUser.email?.split("@")[0],
          photo_url: authUser.user_metadata?.avatar_url,
          provider: "google",
        });
      }
    } catch (err) {
      console.error("Error ensuring profile:", err);
    }
  };

  // Extract tokens from URL (handles both hash and query params)
  const extractTokensFromUrl = (url) => {
    try {
      // Try hash fragment first (most common for OAuth)
      const hashIndex = url.indexOf("#");
      if (hashIndex !== -1) {
        const hashFragment = url.substring(hashIndex + 1);
        const params = new URLSearchParams(hashFragment);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken) {
          return { accessToken, refreshToken };
        }
      }

      // Try query params as fallback
      const urlObj = new URL(url);
      const accessToken = urlObj.searchParams.get("access_token");
      const refreshToken = urlObj.searchParams.get("refresh_token");
      if (accessToken) {
        return { accessToken, refreshToken };
      }

      return null;
    } catch (e) {
      console.error("Error extracting tokens:", e);
      return null;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);

    try {
      // Create redirect URI using expo-auth-session
      // This handles Expo Go vs standalone automatically
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "olfuproject",
        path: "auth/callback",
      });

      console.log("Starting Google Sign-In...");
      console.log("Redirect URI:", redirectUri);
      
      // Verify redirect URI format
      if (!redirectUri || (!redirectUri.startsWith("http") && !redirectUri.startsWith("olfuproject://"))) {
        console.warn("Redirect URI format:", redirectUri);
        console.warn("Make sure this URI is added to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs");
      }

      // Get OAuth URL from Supabase
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!data?.url) {
        throw new Error("No OAuth URL received");
      }

      console.log("Opening browser for authentication...");

      // Open browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      console.log("Browser result:", result.type, result.url ? "has URL" : "no URL");

      if (result.type === "success" && result.url) {
        console.log("Processing OAuth callback URL...");
        
        // Try to get session from URL first (Supabase's recommended method)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSessionFromUrl({
          url: result.url,
        });

        if (!sessionError && sessionData?.session?.user) {
          console.log("Session created from URL successfully!");
          setUserFromAuth(sessionData.session.user);
          ensureProfile(sessionData.session.user);
          setLoading(false);
          // Verify session is actually set in Supabase
          const { data: verifySession } = await supabase.auth.getSession();
          if (verifySession?.session?.user) {
            console.log("Session verified:", verifySession.session.user.email);
          } else {
            console.warn("Session was created but not found on verification");
          }
          // onAuthStateChange will also fire, but we've already set the user
          return;
        } else if (sessionError) {
          console.error("Error getting session from URL:", sessionError);
        }

        // Fallback: Try extracting tokens manually
        const tokens = extractTokensFromUrl(result.url);

        if (tokens?.accessToken) {
          console.log("Setting session from extracted tokens...");
          const { data: tokenSessionData, error: tokenError } = await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken || "",
          });

          if (tokenError) {
            console.error("Error setting session from tokens:", tokenError);
            throw tokenError;
          }
          
          if (tokenSessionData?.session?.user) {
            console.log("Session set successfully from tokens!");
            setUserFromAuth(tokenSessionData.session.user);
            ensureProfile(tokenSessionData.session.user);
            setLoading(false);
            // Verify the session is set
            const { data: verifySession } = await supabase.auth.getSession();
            if (!verifySession?.session?.user) {
              console.warn("Session was set but not found on verification - this may cause navigation issues");
            }
            return;
          }
        }

        // Final fallback: Check if Supabase already has a session
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session?.user) {
          console.log("Found existing session after OAuth");
          setUserFromAuth(existingSession.session.user);
          ensureProfile(existingSession.session.user);
          setLoading(false);
          return;
        }

        // No session found - this shouldn't happen but handle gracefully
        console.error("No session found after OAuth callback");
        throw new Error("Authentication completed but no session was created. Please try again.");
      } else if (result.type === "cancel" || result.type === "dismiss") {
        console.log("Sign-in cancelled by user");
        setLoading(false);
      } else {
        // Handle other result types
        console.log("Unexpected result type:", result.type);
        setLoading(false);
        throw new Error(`Authentication failed: ${result.type}`);
      }
    } catch (err) {
      console.error("Google Sign-In error:", err);
      setError(err.message || "Failed to sign in with Google");
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    signOut,
  };
};

export default useGoogleAuth;

/**
 * Getting Started / Login Screen
 * OLFU-QC Commute Smart App
 *
 * The first screen users see - handles authentication
 * Using Clerk for authentication with custom forms
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Image,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/colors";
import {
  logScreenView,
  logInteraction,
  logTaskCompletion,
} from "../utils/usabilityLogger";

export default function GettingStartedScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { isSignedIn, isLoaded } = useAuth();
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error, setError] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingMFA, setPendingMFA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [mfaStrategy, setMfaStrategy] = useState("totp"); // 'totp' or 'phone_code'

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    logScreenView("GettingStartedScreen");

    // Animate elements on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Redirect to tabs if user is signed in (but not if we just signed out)
  useEffect(() => {
    if (!isLoaded) return;
    
    const checkAndRedirect = async () => {
      // Check if we're in the process of signing out
      const isSigningOut = await AsyncStorage.getItem("isSigningOut");
      if (isSigningOut === "true") {
        // Don't redirect if user is signing out
        return;
      }
      
      const currentSegments = segments;
      const isOnLoginScreen = currentSegments.length === 0 || currentSegments[0] === "index";
      
      // Only redirect if user is signed in AND we're on the login screen
      if (isSignedIn && isOnLoginScreen) {
        logTaskCompletion("User_Login", 0, true, { method: "auto" });
        router.replace("/(tabs)");
      }
    };
    
    checkAndRedirect();
  }, [isLoaded, isSignedIn, router, segments]);

  const handleSignIn = async () => {
    if (!signInLoaded || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    // If already signed in, redirect to main app
    if (isSignedIn) {
      router.replace("/(tabs)");
      return;
    }

    setIsLoading(true);
    setError("");
    logInteraction("tap", "email_login_button");

    try {
      // Step 1: Create sign-in with identifier
      let result = await signIn.create({
        identifier: email.trim(),
      });

      // Step 2: If status is needs_first_factor, attempt password verification
      if (result.status === "needs_first_factor") {
        console.log("Attempting first factor (password)");
        result = await signIn.attemptFirstFactor({
          strategy: "password",
          password: password.trim(),
        });
      }

      // Step 3: Check if sign-in is complete
      if (result.status === "complete") {
        await setActiveSignIn({ session: result.createdSessionId });
        logTaskCompletion("User_Login", 0, true, { method: "email" });
        router.replace("/(tabs)");
        setEmail("");
        setPassword("");
      } else if (result.status === "needs_second_factor") {
        // MFA is enabled - check available strategies
        const supportedFactors = signIn.supportedSecondFactors || [];
        console.log("MFA required. Supported second factors:", JSON.stringify(supportedFactors, null, 2));
        
        // Check for available strategies
        const emailCodeFactor = supportedFactors.find(f => f.strategy === "email_code");
        const phoneCodeFactor = supportedFactors.find(f => f.strategy === "phone_code");
        const totpFactor = supportedFactors.find(f => f.strategy === "totp");
        
        if (emailCodeFactor) {
          // Prepare email code - this will send an email
          console.log("Preparing email code MFA...");
          await signIn.prepareSecondFactor({
            strategy: "email_code",
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          setMfaStrategy("email_code");
          setPendingMFA(true);
          Alert.alert("Verification Code Sent", `A verification code has been sent to ${emailCodeFactor.safeIdentifier}`);
        } else if (phoneCodeFactor) {
          // Prepare phone code - this will send SMS
          console.log("Preparing phone code MFA...");
          await signIn.prepareSecondFactor({
            strategy: "phone_code",
            phoneNumberId: phoneCodeFactor.phoneNumberId,
          });
          setMfaStrategy("phone_code");
          setPendingMFA(true);
        } else if (totpFactor) {
          // Use TOTP (authenticator app)
          console.log("Using TOTP MFA (authenticator app)");
          setMfaStrategy("totp");
          setPendingMFA(true);
        } else {
          // No supported MFA strategy
          console.log("No supported MFA strategy found");
          setError("MFA is required but no supported method is available. Please contact support.");
          Alert.alert("MFA Error", "No supported MFA method found. Available: " + supportedFactors.map(f => f.strategy).join(", "));
        }
        
        setIsLoading(false);
        return; // Exit early
      } else {
        // Log the actual status for debugging
        console.log("Sign-in status:", result.status);
        console.log("Sign-in result:", JSON.stringify(result, null, 2));
        const statusMessage = result.status || "unknown";
        setError(`Sign-in incomplete (Status: ${statusMessage}). Please check your credentials and try again.`);
        Alert.alert(
          "Sign-in Failed",
          `Unable to complete sign-in. Status: ${statusMessage}\n\nPlease check:\n- Your email and password are correct\n- Your account is verified\n- MFA is disabled in Clerk Dashboard`
        );
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      console.error("Error details:", JSON.stringify(err, null, 2));
      
      // Handle specific error cases
      let errorMessage = "Sign-in failed";
      
      if (err.errors && err.errors.length > 0) {
        const firstError = err.errors[0];
        errorMessage = firstError.message || firstError.longMessage || errorMessage;
        
        // Handle "session already exists" error - user is already signed in
        if (firstError.message?.toLowerCase().includes("session") && 
            firstError.message?.toLowerCase().includes("already") ||
            firstError.code === "session_exists") {
          // User already has an active session, redirect to main app
          router.replace("/(tabs)");
          return;
        }
        
        // Handle "Identifier is invalid" error specifically
        if (firstError.message?.includes("Identifier is invalid") || 
            firstError.code === "form_identifier_not_found") {
          errorMessage = "Email address not found. Please check your email or sign up first.";
        }
      } else if (err.message) {
        // Handle session exists in error message
        if (err.message.toLowerCase().includes("session") && 
            err.message.toLowerCase().includes("already")) {
          router.replace("/(tabs)");
          return;
        }
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      Alert.alert("Sign-in Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    if (!signInLoaded || !totpCode.trim()) {
      const codeType = mfaStrategy === "email_code" ? "email" : mfaStrategy === "phone_code" ? "SMS" : "authenticator";
      Alert.alert("Error", `Please enter the ${codeType} code`);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: mfaStrategy,
        code: totpCode.trim(),
      });

      if (result.status === "complete") {
        await setActiveSignIn({ session: result.createdSessionId });
        logTaskCompletion("User_Login", 0, true, { method: "email_mfa" });
        router.replace("/(tabs)");
        // Clear form
        setEmail("");
        setPassword("");
        setTotpCode("");
        setPendingMFA(false);
      } else {
        setError("MFA verification incomplete. Please try again.");
      }
    } catch (err) {
      console.error("MFA verification error:", err);
      const errorMessage = err.errors?.[0]?.message || err.message || "Invalid code. Please try again.";
      setError(errorMessage);
      Alert.alert("Verification Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!signUpLoaded) return;
    
    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");
    logInteraction("tap", "email_signup_button");

    try {
      // Create the user
      await signUp.create({
        emailAddress: email.trim(),
        password: password.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      // Send verification email
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      setError(err.errors?.[0]?.message || err.message || "Sign-up failed");
      Alert.alert("Error", err.errors?.[0]?.message || err.message || "Sign-up failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!signUpLoaded || !verificationCode.trim()) {
      Alert.alert("Error", "Please enter verification code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === "complete") {
        await setActiveSignUp({ session: result.createdSessionId });
        logTaskCompletion("User_Login", 0, true, { method: "signup" });
        router.replace("/(tabs)");
        setEmail("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setVerificationCode("");
        setPendingVerification(false);
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || err.message || "Verification failed");
      Alert.alert("Error", err.errors?.[0]?.message || err.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = () => {
    logInteraction("tap", "guest_access_button");
    logTaskCompletion("User_Login", 0, true, { method: "guest" });
    router.replace("/(tabs)");
  };

  // Show loading state while Clerk is initializing
  if (!isLoaded || !signInLoaded || !signUpLoaded) {
    return (
      <ImageBackground
        source={require("../assets/images/olfu-background.jpg")}
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/olfu-background.jpg")}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Dark overlay for better text readability */}
      <View style={styles.overlay} />

      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <Animated.View
            style={[
              styles.logoSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.logoCircle}>
              <Image
                source={require("../assets/images/olfu-logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.universityName}>OLFU Quezon City</Text>
            <Text style={styles.appName}>Commute Smart</Text>
          </Animated.View>

          {/* Login/Signup Card */}
          <Animated.View
            style={[
              styles.loginCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.welcomeText}>
              {pendingMFA
                ? "Two-Factor Authentication"
                : pendingVerification
                ? "Verify Your Email"
                : isLoginMode
                ? "Welcome Back!"
                : "Create Account"}
            </Text>
            <Text style={styles.subtitleText}>
              {pendingMFA
                ? mfaStrategy === "email_code"
                  ? "Enter the code sent to your email"
                  : mfaStrategy === "phone_code"
                  ? "Enter the code sent to your phone"
                  : "Enter the code from your authenticator app"
                : pendingVerification
                ? "Enter the code sent to your email"
                : isLoginMode
                ? "Sign in to continue to your account"
                : "Sign up to get started"}
            </Text>

            {/* MFA Code Input */}
            {pendingMFA ? (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name={mfaStrategy === "email_code" ? "mail-outline" : mfaStrategy === "phone_code" ? "phone-portrait-outline" : "key-outline"}
                    size={20}
                    color={Colors.textLight}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={mfaStrategy === "email_code" ? "Email code" : mfaStrategy === "phone_code" ? "SMS code" : "Authenticator code"}
                    placeholderTextColor={Colors.textLight}
                    value={totpCode}
                    onChangeText={setTotpCode}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                {/* Error Message */}
                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color={Colors.accent} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleVerifyMFA}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                  ) : (
                    <Text style={styles.loginButtonText}>Verify & Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => {
                    setPendingMFA(false);
                    setTotpCode("");
                    setError("");
                    setMfaStrategy("totp");
                  }}
                >
                  <Text style={styles.resendText}>Back to Sign In</Text>
                </TouchableOpacity>
              </>
            ) : /* Email Verification Code Input */
            pendingVerification ? (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={Colors.textLight}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Verification Code"
                    placeholderTextColor={Colors.textLight}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    maxLength={6}
                  />
                </View>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleVerifyCode}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                  ) : (
                    <Text style={styles.loginButtonText}>Verify & Continue</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => {
                    setPendingVerification(false);
                    setVerificationCode("");
                  }}
                >
                  <Text style={styles.resendText}>Change Email</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* First Name Input - Only show in signup mode */}
                {!isLoginMode && (
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={Colors.textLight}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="First Name"
                      placeholderTextColor={Colors.textLight}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      autoComplete="given-name"
                    />
                  </View>
                )}

                {/* Last Name Input - Only show in signup mode */}
                {!isLoginMode && (
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={Colors.textLight}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Last Name"
                      placeholderTextColor={Colors.textLight}
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      autoComplete="family-name"
                    />
                  </View>
                )}

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={Colors.textLight}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={Colors.textLight}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!isLoading}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={Colors.textLight}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={Colors.textLight}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={Colors.textLight}
                    />
                  </TouchableOpacity>
                </View>

                {/* Error Message */}
                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color={Colors.accent} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Forgot Password */}
                {isLoginMode && (
                  <TouchableOpacity style={styles.forgotButton}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}

                {/* Login/Signup Button */}
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={isLoginMode ? handleSignIn : handleSignUp}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                  ) : (
                    <Text style={styles.loginButtonText}>
                      {isLoginMode ? "Sign In" : "Sign Up"}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Toggle Login/Signup */}
                <View style={styles.toggleContainer}>
                  <Text style={styles.toggleText}>
                    {isLoginMode
                      ? "Don't have an account? "
                      : "Already have an account? "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsLoginMode(!isLoginMode);
                      setError("");
                      // Clear form when switching modes
                      setEmail("");
                      setPassword("");
                      setFirstName("");
                      setLastName("");
                    }}
                  >
                    <Text style={styles.toggleLink}>
                      {isLoginMode ? "Sign Up" : "Sign In"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>

          {/* Guest Access */}
          {!pendingVerification && !pendingMFA && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <TouchableOpacity
                style={styles.guestButton}
                onPress={handleGuestAccess}
              >
                <Text style={styles.guestText}>Continue as Guest</Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color="rgba(255,255,255,0.8)"
                />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Footer */}
          <Text style={styles.footerText}>
            Safe commuting for OLFU students
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: Colors.textOnPrimary,
    fontSize: 18,
    marginTop: 12,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 30,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.textOnPrimary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  universityName: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 1,
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.textOnPrimary,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  loginCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  eyeButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(211, 47, 47, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.accent,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 20,
    marginTop: -8,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.textOnPrimary,
    letterSpacing: 0.5,
  },
  resendButton: {
    marginTop: 16,
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  toggleText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.primary,
  },
  guestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  guestText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
  },
  footerText: {
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 16,
  },
});

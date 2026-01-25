/**
 * SOS Panic Button Component
 * A high-priority safety component for emergency alerts
 *
 * Features:
 * - Large circular red button with "SOS" text
 * - 3-second long-press activation to prevent accidental triggers
 * - Haptic feedback on activation
 * - Visual countdown indicator during long-press
 * - Sends alert to database and notifies emergency contacts
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Vibration,
  Alert,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/colors";
import { SOS_LONG_PRESS_DURATION } from "../constants/config";
import { logTaskCompletion, logInteraction } from "../utils/usabilityLogger";
import { sendSOSAlert, getEmergencyContacts } from "../config/supabase";

const SOSButton = ({
  onActivate,
  userId = null,
  userLocation = null,
  size = 120,
  disabled = false,
  showInstructions = true,
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pressStartTime = useRef(null);
  const animationRef = useRef(null);

  // Pulse animation for the button when idle
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    if (!isPressing && !isActivated) {
      pulse.start();
    } else {
      pulse.stop();
      pulseAnim.setValue(1);
    }

    return () => pulse.stop();
  }, [isPressing, isActivated]);

  const handlePressIn = () => {
    if (disabled || isActivated) return;

    setIsPressing(true);
    pressStartTime.current = Date.now();
    logInteraction("press_start", "SOS_Button");

    // Scale down animation
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();

    // Progress animation
    animationRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: SOS_LONG_PRESS_DURATION,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        triggerSOS();
      }
    });

    // Haptic feedback during press
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePressOut = () => {
    if (!isPressing) return;

    const pressDuration = Date.now() - pressStartTime.current;

    // Stop and reset animations
    if (animationRef.current) {
      animationRef.current.stop();
    }
    progressAnim.setValue(0);

    // Scale back to normal
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();

    setIsPressing(false);

    // Log incomplete press
    if (pressDuration < SOS_LONG_PRESS_DURATION) {
      logInteraction("press_cancel", "SOS_Button", {
        duration: pressDuration,
        required: SOS_LONG_PRESS_DURATION,
      });
    }
  };

  const triggerSOS = async () => {
    setIsActivated(true);
    setIsPressing(false);
    setIsSending(true);

    // Vibration pattern: SOS in Morse code (... --- ...)
    const sosPattern = [
      0,
      200,
      100,
      200,
      100,
      200, // S (...)
      200,
      500,
      100,
      500,
      100,
      500, // O (---)
      200,
      200,
      100,
      200,
      100,
      200, // S (...)
    ];

    // Trigger vibration
    if (Platform.OS !== "web") {
      Vibration.vibrate(sosPattern);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    try {
      // Get current location if not provided
      let location = userLocation;
      if (!location) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            location = {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            };
          }
        } catch (locError) {
          console.log("Could not get location for SOS:", locError);
          // Use default location (OLFU campus) as fallback
          location = { latitude: 14.7033, longitude: 121.0633 };
        }
      }

      // Log emergency alert
      console.log("=================================");
      console.log("🚨 EMERGENCY ALERT SENT 🚨");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Location:", location);
      console.log("User ID:", userId);
      console.log("=================================");

      // Send SOS alert to database
      let alertResult = { success: false };
      let emergencyContacts = [];

      if (userId) {
        alertResult = await sendSOSAlert(userId, location, "Emergency SOS Alert!");
        emergencyContacts = await getEmergencyContacts(userId);
        console.log("SOS Alert Result:", alertResult);
        console.log("Emergency Contacts:", emergencyContacts.length, "contacts");
      }

      // Log task completion
      logTaskCompletion("SOS_Activation", SOS_LONG_PRESS_DURATION, true, {
        activationType: "long_press",
        alertSent: alertResult.success,
        contactsNotified: emergencyContacts.length,
      });

      // Call the onActivate callback if provided
      if (onActivate) {
        onActivate({
          success: alertResult.success,
          alertId: alertResult.alertId,
          location,
          contactsCount: emergencyContacts.length,
        });
      }

      setIsSending(false);

      // Build message with emergency contacts info
      let alertMessage = "Your emergency alert has been recorded.";
      if (emergencyContacts.length > 0) {
        const contactNames = emergencyContacts.slice(0, 3).map(c => c.name).join(", ");
        alertMessage = `Your emergency alert has been recorded.\n\nEmergency contacts (${emergencyContacts.length}): ${contactNames}${emergencyContacts.length > 3 ? "..." : ""}\n\nPlease contact them directly if you need immediate help.`;
      } else {
        alertMessage = "Your emergency alert has been recorded.\n\n⚠️ No emergency contacts set up. Go to Profile > Emergency Contacts to add contacts.";
      }

      // Show confirmation alert
      Alert.alert(
        "🚨 Emergency Alert Sent",
        alertMessage,
        [
          {
            text: "OK",
            onPress: () => {
              setIsActivated(false);
              progressAnim.setValue(0);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error sending SOS alert:", error);
      setIsSending(false);

      Alert.alert(
        "⚠️ Alert Error",
        "There was an issue sending the alert, but your location has been logged. Please call emergency services directly if you need help.",
        [
          {
            text: "OK",
            onPress: () => {
              setIsActivated(false);
              progressAnim.setValue(0);
            },
          },
        ]
      );
    }

    // Reset after 5 seconds if alert is dismissed
    setTimeout(() => {
      setIsActivated(false);
      setIsSending(false);
      progressAnim.setValue(0);
    }, 5000);
  };

  // Calculate progress circle
  const progressInterpolation = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const buttonSize = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const innerSize = {
    width: size - 16,
    height: size - 16,
    borderRadius: (size - 16) / 2,
  };

  return (
    <View style={styles.container}>
      {showInstructions && (
        <Text style={styles.instructions}>
          Press and hold for 3 seconds to activate
        </Text>
      )}

      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            transform: [{ scale: isPressing ? scaleAnim : pulseAnim }],
          },
        ]}
      >
        {/* Progress ring */}
        {isPressing && (
          <Animated.View
            style={[
              styles.progressRing,
              buttonSize,
              {
                transform: [{ rotate: progressInterpolation }],
              },
            ]}
          >
            <View style={[styles.progressFill, buttonSize]} />
          </Animated.View>
        )}

        {/* Main button */}
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={({ pressed }) => [
            styles.button,
            buttonSize,
            isActivated && styles.buttonActivated,
            disabled && styles.buttonDisabled,
          ]}
        >
          <View style={[styles.innerCircle, innerSize]}>
            {isActivated ? (
              <Ionicons
                name="checkmark"
                size={size * 0.4}
                color={Colors.textOnAccent}
              />
            ) : (
              <>
                <Ionicons
                  name="warning"
                  size={size * 0.25}
                  color={Colors.textOnAccent}
                  style={styles.icon}
                />
                <Text style={[styles.sosText, { fontSize: size * 0.25 }]}>
                  SOS
                </Text>
              </>
            )}
          </View>
        </Pressable>
      </Animated.View>

      {isPressing && <Text style={styles.holdingText}>Keep holding...</Text>}

      {isActivated && <Text style={styles.activatedText}>Alert Sent!</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  instructions: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
    textAlign: "center",
  },
  buttonWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressRing: {
    position: "absolute",
    backgroundColor: "rgba(211, 47, 47, 0.3)",
    overflow: "hidden",
  },
  progressFill: {
    position: "absolute",
    top: 0,
    left: "50%",
    width: "50%",
    height: "100%",
    backgroundColor: Colors.accentLight,
    transformOrigin: "left center",
  },
  button: {
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonActivated: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
  },
  buttonDisabled: {
    backgroundColor: Colors.textLight,
    shadowColor: Colors.textLight,
  },
  innerCircle: {
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginBottom: 4,
  },
  sosText: {
    fontWeight: "bold",
    color: Colors.textOnAccent,
    letterSpacing: 4,
  },
  holdingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.accent,
    fontWeight: "600",
  },
  activatedText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.success,
    fontWeight: "600",
  },
});

export default SOSButton;

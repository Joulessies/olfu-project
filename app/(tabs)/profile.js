/**
 * Profile Screen
 * OLFU-QC Commute Smart App
 *
 * Features:
 * - User profile display
 * - Settings and preferences
 * - Emergency contacts management
 * - App information
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser, useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "../../constants/colors";
import {
  logScreenView,
  logInteraction,
  getTaskStatistics,
} from "../../utils/usabilityLogger";
import {
  getOrCreateTrackingCode,
  addFriendByCode,
  getFriends,
  syncClerkUserToSupabase,
} from "../../config/supabase";

// Cross-platform alert helper
const showAlert = (title, message, buttons = [{ text: "OK" }]) => {
  if (Platform.OS === "web") {
    // For web, use window.alert for simple messages or window.confirm for yes/no
    if (buttons.length === 1) {
      window.alert(`${title}\n\n${message}`);
      if (buttons[0].onPress) buttons[0].onPress();
    } else if (buttons.length === 2) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      const confirmButton = buttons.find(b => b.style === "destructive" || b.text !== "Cancel");
      const cancelButton = buttons.find(b => b.text === "Cancel" || b.style === "cancel");
      if (confirmed && confirmButton?.onPress) {
        confirmButton.onPress();
      } else if (!confirmed && cancelButton?.onPress) {
        cancelButton.onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const [locationSharing, setLocationSharing] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [geofenceAlerts, setGeofenceAlerts] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  // Tracking code states
  const [trackingCode, setTrackingCode] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);

  useEffect(() => {
    logScreenView("ProfileScreen");
    if (user?.id) {
      // Sync Clerk user to Supabase, then load data
      syncClerkUserToSupabase(user).then(() => {
        loadTrackingCode();
        loadFriendsCount();
      });
    }
  }, [user?.id]);

  const loadTrackingCode = async () => {
    if (!user?.id) return;
    setLoadingCode(true);
    try {
      const result = await getOrCreateTrackingCode(user.id);
      if (result.success) {
        setTrackingCode(result.code);
      }
    } catch (error) {
      console.error("Error loading tracking code:", error);
    } finally {
      setLoadingCode(false);
    }
  };

  const loadFriendsCount = async () => {
    if (!user?.id) return;
    try {
      const friends = await getFriends(user.id);
      setFriendsCount(friends.length);
    } catch (error) {
      console.error("Error loading friends count:", error);
    }
  };

  const copyCodeToClipboard = async () => {
    if (!trackingCode) return;
    await Clipboard.setStringAsync(trackingCode);
    showAlert("Copied!", "Your tracking code has been copied to clipboard.");
  };

  const shareCode = async () => {
    if (!trackingCode) return;
    try {
      await Share.share({
        message: `Track me on OLFU Commute Smart! Use my code: ${trackingCode}`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleAddFriend = async () => {
    if (!friendCode.trim()) {
      showAlert("Error", "Please enter a tracking code");
      return;
    }

    setAddingFriend(true);
    try {
      const result = await addFriendByCode(user.id, friendCode.trim());
      if (result.success) {
        showAlert("Success", result.message);
        setShowAddFriendModal(false);
        setFriendCode("");
        loadFriendsCount();
      } else {
        showAlert("Error", result.error);
      }
    } catch (error) {
      showAlert("Error", error.message || "Failed to add friend");
    } finally {
      setAddingFriend(false);
    }
  };

  // Get display name from user
  const getUserDisplayName = () => {
    if (!user) return "Guest User";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "OLFU Student";
  };

  // Get user email
  const getUserEmail = () => {
    if (!user) return "Not signed in";
    return user.primaryEmailAddress?.emailAddress || "No email";
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Set flag to prevent auto-redirect on login screen
      await AsyncStorage.setItem("isSigningOut", "true");
      await signOut();
      // Wait for Clerk to update auth state
      await new Promise(resolve => setTimeout(resolve, 200));
      // Navigate to login screen
      router.replace("/");
      // Clear the flag after navigation
      setTimeout(async () => {
        await AsyncStorage.removeItem("isSigningOut");
        setIsSigningOut(false);
      }, 1000);
    } catch (error) {
      await AsyncStorage.removeItem("isSigningOut");
      showAlert("Error", error.message || "Failed to sign out");
      setIsSigningOut(false);
    }
  };

  const handleToggle = (setting, value, setter) => {
    logInteraction("toggle", setting, { value });
    setter(value);
  };

  const handleMenuPress = (menuItem) => {
    logInteraction("tap", `menu_${menuItem}`);

    switch (menuItem) {
      case "edit_profile":
        if (!user) {
          showAlert(
            "Sign In Required",
            "Please sign in to edit your profile.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Sign In", onPress: () => router.replace("/") },
            ]
          );
        } else {
          showAlert("Edit Profile", "Profile editing coming soon!");
        }
        break;

      case "change_password":
        if (!user) {
          showAlert(
            "Sign In Required",
            "Please sign in to change your password.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Sign In", onPress: () => router.replace("/") },
            ]
          );
        } else {
          showAlert("Change Password", "Password change coming soon!");
        }
        break;

      case "email_settings":
        if (!user) {
          showAlert(
            "Sign In Required",
            "Please sign in to manage email settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Sign In", onPress: () => router.replace("/") },
            ]
          );
        } else {
          showAlert("Email Settings", `Current email: ${user.primaryEmailAddress?.emailAddress || "No email"}`);
        }
        break;

      case "usability_stats":
        const stats = getTaskStatistics();
        showAlert(
          "Usability Statistics",
          `Total Tasks: ${stats.totalTasks}\nSuccessful: ${stats.successfulTasks}\nFailed: ${stats.failedTasks}\nSuccess Rate: ${stats.successRate}\nAvg Time: ${stats.averageTimeFormatted}`,
          [{ text: "OK" }]
        );
        break;

      default:
        break;
    }
  };

  const settingsGroups = [
    {
      title: "Account",
      items: [
        {
          id: "edit_profile",
          icon: "person-circle",
          title: "Edit Profile",
          subtitle: "Update your name and photo",
          type: "link",
        },
        {
          id: "change_password",
          icon: "key",
          title: "Change Password",
          subtitle: "Update your account password",
          type: "link",
        },
        {
          id: "email_settings",
          icon: "mail",
          title: "Email Settings",
          subtitle: user?.primaryEmailAddress?.emailAddress || "Not signed in",
          type: "link",
        },
      ],
    },
    {
      title: "Safety Settings",
      items: [
        {
          id: "location_sharing",
          icon: "location",
          title: "Location Sharing",
          subtitle: "Share your location with friends",
          type: "toggle",
          value: locationSharing,
          onToggle: (v) =>
            handleToggle("location_sharing", v, setLocationSharing),
        },
        {
          id: "geofence_alerts",
          icon: "notifications",
          title: "Geofence Alerts",
          subtitle: "Notify when entering/leaving campus",
          type: "toggle",
          value: geofenceAlerts,
          onToggle: (v) =>
            handleToggle("geofence_alerts", v, setGeofenceAlerts),
        },
        {
          id: "emergency_contacts",
          icon: "people",
          title: "Emergency Contacts",
          subtitle: "Manage your emergency contacts",
          type: "link",
        },
      ],
    },
    {
      title: "App Settings",
      items: [
        {
          id: "notifications",
          icon: "notifications-outline",
          title: "Push Notifications",
          subtitle: "Receive app notifications",
          type: "toggle",
          value: notifications,
          onToggle: (v) => handleToggle("notifications", v, setNotifications),
        },
        {
          id: "language",
          icon: "language",
          title: "Language",
          subtitle: "English",
          type: "link",
        },
        {
          id: "theme",
          icon: "color-palette",
          title: "App Theme",
          subtitle: "System Default",
          type: "link",
        },
      ],
    },
    {
      title: "Research & Support",
      items: [
        {
          id: "usability_stats",
          icon: "bar-chart",
          title: "Usability Statistics",
          subtitle: "View task completion data",
          type: "link",
        },
        {
          id: "feedback",
          icon: "chatbubble-ellipses",
          title: "Send Feedback",
          subtitle: "Help us improve the app",
          type: "link",
        },
        {
          id: "help",
          icon: "help-circle",
          title: "Help & Support",
          subtitle: "FAQs and contact support",
          type: "link",
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          id: "about",
          icon: "information-circle",
          title: "About OLFU Commute Smart",
          subtitle: "Version 1.0.0",
          type: "link",
        },
        {
          id: "privacy",
          icon: "shield-checkmark",
          title: "Privacy Policy",
          subtitle: "How we handle your data",
          type: "link",
        },
        {
          id: "terms",
          icon: "document-text",
          title: "Terms of Service",
          subtitle: "App usage terms",
          type: "link",
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={Colors.primary} />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color={Colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{getUserDisplayName()}</Text>
          <Text style={styles.userEmail}>{getUserEmail()}</Text>
          <View style={styles.studentBadge}>
            <Ionicons
              name={user ? "checkmark-circle" : "alert-circle"}
              size={14}
              color={user ? Colors.primary : Colors.warning}
            />
            <Text
              style={[styles.badgeText, !user && { color: Colors.warning }]}
            >
              {user ? "OLFU Quezon City" : "Guest Mode"}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{friendsCount}</Text>
            <Text style={styles.statLabel}>Tracking</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Alerts</Text>
          </View>
        </View>

        {/* Tracking Code Section */}
        {user && (
          <View style={styles.trackingCodeSection}>
            <Text style={styles.sectionTitle}>Your Tracking Code</Text>
            <Text style={styles.sectionSubtitle}>
              Share this code with friends so they can track your location
            </Text>
            
            <View style={styles.codeContainer}>
              {loadingCode ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={styles.codeText}>{trackingCode || "------"}</Text>
              )}
            </View>

            <View style={styles.codeButtonsRow}>
              <TouchableOpacity
                style={styles.codeButton}
                onPress={copyCodeToClipboard}
                disabled={!trackingCode}
              >
                <Ionicons name="copy-outline" size={20} color={Colors.primary} />
                <Text style={styles.codeButtonText}>Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.codeButton}
                onPress={shareCode}
                disabled={!trackingCode}
              >
                <Ionicons name="share-outline" size={20} color={Colors.primary} />
                <Text style={styles.codeButtonText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.codeButton, styles.addFriendButton]}
                onPress={() => setShowAddFriendModal(true)}
              >
                <Ionicons name="person-add-outline" size={20} color={Colors.textOnPrimary} />
                <Text style={[styles.codeButtonText, { color: Colors.textOnPrimary }]}>Add Friend</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupItems}>
              {group.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingsItem,
                    itemIndex === group.items.length - 1 && styles.lastItem,
                  ]}
                  onPress={() =>
                    item.type === "link" && handleMenuPress(item.id)
                  }
                  activeOpacity={item.type === "toggle" ? 1 : 0.7}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: getIconColor(item.id) },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={Colors.textOnPrimary}
                    />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.type === "toggle" ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{
                        false: "#E0E0E0",
                        true: Colors.primaryLight,
                      }}
                      thumbColor={item.value ? Colors.primary : "#f4f3f4"}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={Colors.textLight}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          disabled={isSigningOut}
          onPress={() => {
            logInteraction("tap", "sign_out");
            showAlert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign Out",
                style: "destructive",
                onPress: handleSignOut,
              },
            ]);
          }}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Ionicons name="log-out-outline" size={20} color={Colors.accent} />
          )}
          <Text style={styles.signOutText}>
            {isSigningOut ? "Signing Out..." : "Sign Out"}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>OLFU Commute Smart v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Made with ❤️ for OLFU Students
          </Text>
        </View>
      </ScrollView>

      {/* Add Friend Modal */}
      <Modal
        visible={showAddFriendModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddFriendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Friend by Code</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddFriendModal(false);
                  setFriendCode("");
                }}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter your friend's tracking code to start tracking their location
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="Enter 6-digit code"
              placeholderTextColor={Colors.textLight}
              value={friendCode}
              onChangeText={(text) => setFriendCode(text.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.addButton, addingFriend && styles.addButtonDisabled]}
              onPress={handleAddFriend}
              disabled={addingFriend}
            >
              {addingFriend ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color={Colors.textOnPrimary} />
                  <Text style={styles.addButtonText}>Add Friend</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper function to get icon background color
const getIconColor = (id) => {
  const colors = {
    // Account
    edit_profile: "#5C6BC0",
    change_password: "#7E57C2",
    email_settings: "#26A69A",
    // Safety
    location_sharing: Colors.primary,
    geofence_alerts: Colors.warning,
    emergency_contacts: Colors.accent,
    // App Settings
    notifications: Colors.info,
    language: Colors.primaryLight,
    theme: "#9C27B0",
    // Research & Support
    usability_stats: "#009688",
    feedback: "#FF5722",
    help: "#607D8B",
    // About
    about: Colors.primary,
    privacy: Colors.success,
    terms: "#795548",
  };
  return colors[id] || Colors.primary;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  studentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: Colors.surface,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E0E0E0",
  },
  settingsGroup: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupItems: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text,
  },
  itemSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.accent,
    marginLeft: 8,
  },
  footer: {
    alignItems: "center",
    padding: 24,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  footerSubtext: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
  },
  // Tracking Code Section Styles
  trackingCodeSection: {
    backgroundColor: Colors.surface,
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  codeContainer: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: "dashed",
  },
  codeText: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.primary,
    letterSpacing: 8,
  },
  codeButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  codeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.background,
    gap: 6,
  },
  codeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  addFriendButton: {
    backgroundColor: Colors.primary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
  },
  codeInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 8,
    color: Colors.text,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: "bold",
  },
});

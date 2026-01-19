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
  removeFriend,
  syncClerkUserToSupabase,
  getEmergencyContacts,
  addEmergencyContact,
  deleteEmergencyContact,
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
  
  // Edit Profile Modal states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Emergency Contacts Modal states
  const [showEmergencyContactsModal, setShowEmergencyContactsModal] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactRelation, setNewContactRelation] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  
  // Friends List Modal states
  const [showFriendsListModal, setShowFriendsListModal] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  
  // Theme Modal states
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("system");
  
  // Language Modal states
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  useEffect(() => {
    logScreenView("ProfileScreen");
    loadSavedPreferences();
    if (user?.id) {
      // Sync Clerk user to Supabase, then load data
      syncClerkUserToSupabase(user).then(() => {
        loadTrackingCode();
        loadFriendsCount();
        loadEmergencyContacts();
      });
      // Initialize edit profile fields
      setEditFirstName(user.firstName || "");
      setEditLastName(user.lastName || "");
    }
  }, [user?.id]);
  
  // Load saved preferences from AsyncStorage
  const loadSavedPreferences = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("@olfu_theme");
      const savedLanguage = await AsyncStorage.getItem("@olfu_language");
      const savedLocationSharing = await AsyncStorage.getItem("@olfu_location_sharing");
      const savedNotifications = await AsyncStorage.getItem("@olfu_notifications");
      const savedGeofence = await AsyncStorage.getItem("@olfu_geofence");
      
      if (savedTheme) setSelectedTheme(savedTheme);
      if (savedLanguage) setSelectedLanguage(savedLanguage);
      if (savedLocationSharing !== null) setLocationSharing(savedLocationSharing === "true");
      if (savedNotifications !== null) setNotifications(savedNotifications === "true");
      if (savedGeofence !== null) setGeofenceAlerts(savedGeofence === "true");
    } catch (error) {
      showAlert("Error", "Failed to load saved preferences. Some settings may not be restored.");
    }
  };

  const loadTrackingCode = async () => {
    if (!user?.id) return;
    setLoadingCode(true);
    try {
      const result = await getOrCreateTrackingCode(user.id);
      if (result.success) {
        setTrackingCode(result.code);
      }
    } catch (error) {
      showAlert("Error", "Failed to load your tracking code. Please try again later.");
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
      showAlert("Error", "Failed to load friends count. Please refresh the page.");
    }
  };
  
  // Load full friends list
  const loadFriendsList = async () => {
    if (!user?.id) return;
    setLoadingFriends(true);
    try {
      const friends = await getFriends(user.id);
      setFriendsList(friends);
    } catch (error) {
      showAlert("Error", "Failed to load friends list. Please try again.");
    } finally {
      setLoadingFriends(false);
    }
  };
  
  // Load emergency contacts
  const loadEmergencyContacts = async () => {
    if (!user?.id) return;
    setLoadingContacts(true);
    try {
      const contacts = await getEmergencyContacts(user.id);
      setEmergencyContacts(contacts);
    } catch (error) {
      showAlert("Error", "Failed to load emergency contacts. Please try again.");
    } finally {
      setLoadingContacts(false);
    }
  };
  
  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await user.update({
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
      });
      showAlert("Success", "Profile updated successfully!");
      setShowEditProfileModal(false);
    } catch (error) {
      showAlert("Error", error.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };
  
  // Add emergency contact
  const handleAddEmergencyContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      showAlert("Error", "Please enter name and phone number");
      return;
    }
    setAddingContact(true);
    try {
      const result = await addEmergencyContact(user.id, {
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
        relationship: newContactRelation.trim() || null,
      });
      if (result.success) {
        showAlert("Success", "Emergency contact added!");
        setShowAddContactModal(false);
        setNewContactName("");
        setNewContactPhone("");
        setNewContactRelation("");
        loadEmergencyContacts();
      } else {
        showAlert("Error", result.error);
      }
    } catch (error) {
      showAlert("Error", error.message || "Failed to add contact");
    } finally {
      setAddingContact(false);
    }
  };
  
  // Delete emergency contact
  const handleDeleteContact = async (contactId) => {
    showAlert(
      "Delete Contact",
      "Are you sure you want to delete this emergency contact?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteEmergencyContact(contactId);
              if (result.success) {
                loadEmergencyContacts();
              }
            } catch (error) {
              showAlert("Error", "Failed to delete contact");
            }
          },
        },
      ]
    );
  };
  
  // Remove friend
  const handleRemoveFriend = async (friendId, friendName) => {
    showAlert(
      "Remove Friend",
      `Are you sure you want to stop tracking ${friendName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await removeFriend(user.id, friendId);
              if (result.success) {
                loadFriendsList();
                loadFriendsCount();
              }
            } catch (error) {
              showAlert("Error", "Failed to remove friend");
            }
          },
        },
      ]
    );
  };
  
  // Save theme preference
  const handleThemeChange = async (theme) => {
    setSelectedTheme(theme);
    await AsyncStorage.setItem("@olfu_theme", theme);
    setShowThemeModal(false);
    showAlert("Theme Updated", `Theme set to: ${theme === "system" ? "System Default" : theme === "light" ? "Light Mode" : "Dark Mode"}`);
  };
  
  // Save language preference
  const handleLanguageChange = async (lang) => {
    setSelectedLanguage(lang);
    await AsyncStorage.setItem("@olfu_language", lang);
    setShowLanguageModal(false);
    const langNames = { en: "English", tl: "Filipino (Tagalog)", ceb: "Cebuano" };
    showAlert("Language Updated", `Language set to: ${langNames[lang]}`);
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
      showAlert("Error", "Failed to share your tracking code. Please try again.");
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

  const handleToggle = async (setting, value, setter) => {
    logInteraction("toggle", setting, { value });
    setter(value);
    // Save toggle settings to AsyncStorage
    try {
      const storageKey = {
        location_sharing: "@olfu_location_sharing",
        notifications: "@olfu_notifications",
        geofence_alerts: "@olfu_geofence",
      }[setting];
      if (storageKey) {
        await AsyncStorage.setItem(storageKey, value.toString());
      }
    } catch (error) {
      showAlert("Error", "Failed to save your setting. The change may not persist after restart.");
    }
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
          setEditFirstName(user.firstName || "");
          setEditLastName(user.lastName || "");
          setShowEditProfileModal(true);
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
          showAlert(
            "Change Password",
            "To change your password, please use the 'Forgot Password' option on the login screen, or manage your account through Clerk's account portal."
          );
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
          showAlert("Email Settings", `Current email: ${user.primaryEmailAddress?.emailAddress || "No email"}\n\nTo change your email, please contact OLFU IT support.`);
        }
        break;

      case "emergency_contacts":
        if (!user) {
          showAlert(
            "Sign In Required",
            "Please sign in to manage emergency contacts.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Sign In", onPress: () => router.replace("/") },
            ]
          );
        } else {
          loadEmergencyContacts();
          setShowEmergencyContactsModal(true);
        }
        break;

      case "language":
        setShowLanguageModal(true);
        break;

      case "theme":
        setShowThemeModal(true);
        break;

      case "usability_stats":
        const stats = getTaskStatistics();
        showAlert(
          "Usability Statistics",
          `Total Tasks: ${stats.totalTasks}\nSuccessful: ${stats.successfulTasks}\nFailed: ${stats.failedTasks}\nSuccess Rate: ${stats.successRate}\nAvg Time: ${stats.averageTimeFormatted}`,
          [{ text: "OK" }]
        );
        break;

      case "feedback":
        showAlert(
          "Send Feedback",
          "We'd love to hear from you!\n\nPlease email your feedback to:\nolfu-commutesmart@feedback.com\n\nThank you for helping us improve!"
        );
        break;

      case "help":
        showAlert(
          "Help & Support",
          "OLFU Commute Smart Help\n\n" +
          "• Route Planning: Select origin and destination to get commute options\n" +
          "• Friend Tracking: Add friends using tracking codes to see their location\n" +
          "• SOS Button: Long press for 3 seconds to send emergency alert\n\n" +
          "For additional support, please contact the OLFU IT department."
        );
        break;

      case "about":
        showAlert(
          "About OLFU Commute Smart",
          "Version 1.0.0\n\n" +
          "A smart commuting app designed for OLFU Lagro and OLFU Regalado students.\n\n" +
          "Features:\n" +
          "• Route planning with fare estimates\n" +
          "• Real-time friend tracking\n" +
          "• Emergency SOS alerts\n" +
          "• Campus geofencing\n\n" +
          "Powered by OpenStreetMap (Free)"
        );
        break;

      case "privacy":
        showAlert(
          "Privacy Policy",
          "Your Privacy Matters\n\n" +
          "• Location data is only shared with friends you approve\n" +
          "• Your data is stored securely on Supabase servers\n" +
          "• We never sell your personal information\n" +
          "• You can delete your account at any time\n\n" +
          "For full privacy policy, visit:\nolfu-commutesmart.app/privacy"
        );
        break;

      case "terms":
        showAlert(
          "Terms of Service",
          "By using OLFU Commute Smart, you agree to:\n\n" +
          "• Use the app responsibly and legally\n" +
          "• Not misuse the SOS feature\n" +
          "• Keep your login credentials secure\n" +
          "• Respect other users' privacy\n\n" +
          "For full terms, visit:\nolfu-commutesmart.app/terms"
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
          subtitle: `${emergencyContacts.length} contacts saved`,
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
          subtitle: selectedLanguage === "en" ? "English" : selectedLanguage === "tl" ? "Filipino" : "Cebuano",
          type: "link",
        },
        {
          id: "theme",
          icon: "color-palette",
          title: "App Theme",
          subtitle: selectedTheme === "system" ? "System Default" : selectedTheme === "light" ? "Light Mode" : "Dark Mode",
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
              {user ? "OLFU Lagro / OLFU Regalado" : "Guest Mode"}
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
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => {
              if (user) {
                loadFriendsList();
                setShowFriendsListModal(true);
              } else {
                showAlert("Sign In Required", "Please sign in to view your friends list.");
              }
            }}
          >
            <Text style={styles.statValue}>{friendsCount}</Text>
            <Text style={[styles.statLabel, { color: Colors.primary }]}>Tracking</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => {
              if (user) {
                loadEmergencyContacts();
                setShowEmergencyContactsModal(true);
              } else {
                showAlert("Sign In Required", "Please sign in to view emergency contacts.");
              }
            }}
          >
            <Text style={styles.statValue}>{emergencyContacts.length}</Text>
            <Text style={[styles.statLabel, { color: Colors.accent }]}>Contacts</Text>
          </TouchableOpacity>
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

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter first name"
              placeholderTextColor={Colors.textLight}
              value={editFirstName}
              onChangeText={setEditFirstName}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter last name"
              placeholderTextColor={Colors.textLight}
              value={editLastName}
              onChangeText={setEditLastName}
              autoCapitalize="words"
            />

            <TouchableOpacity
              style={[styles.addButton, savingProfile && styles.addButtonDisabled]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={Colors.textOnPrimary} />
                  <Text style={styles.addButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Emergency Contacts Modal */}
      <Modal
        visible={showEmergencyContactsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmergencyContactsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Emergency Contacts</Text>
              <TouchableOpacity onPress={() => setShowEmergencyContactsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              These contacts will be notified when you trigger an SOS alert
            </Text>

            {loadingContacts ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : emergencyContacts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={Colors.textLight} />
                <Text style={styles.emptyStateText}>No emergency contacts yet</Text>
              </View>
            ) : (
              <ScrollView style={styles.contactsList}>
                {emergencyContacts.map((contact) => (
                  <View key={contact.id} style={styles.contactItem}>
                    <View style={styles.contactAvatar}>
                      <Ionicons name="person" size={20} color={Colors.textOnPrimary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactPhone}>{contact.phone}</Text>
                      {contact.relationship && (
                        <Text style={styles.contactRelation}>{contact.relationship}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteContactButton}
                      onPress={() => handleDeleteContact(contact.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.accent} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddContactModal(true)}
            >
              <Ionicons name="add" size={20} color={Colors.textOnPrimary} />
              <Text style={styles.addButtonText}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Emergency Contact Modal */}
      <Modal
        visible={showAddContactModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Emergency Contact</Text>
              <TouchableOpacity onPress={() => {
                setShowAddContactModal(false);
                setNewContactName("");
                setNewContactPhone("");
                setNewContactRelation("");
              }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Contact name"
              placeholderTextColor={Colors.textLight}
              value={newContactName}
              onChangeText={setNewContactName}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="+63 9XX XXX XXXX"
              placeholderTextColor={Colors.textLight}
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Relationship (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Parent, Sibling, Friend"
              placeholderTextColor={Colors.textLight}
              value={newContactRelation}
              onChangeText={setNewContactRelation}
              autoCapitalize="words"
            />

            <TouchableOpacity
              style={[styles.addButton, addingContact && styles.addButtonDisabled]}
              onPress={handleAddEmergencyContact}
              disabled={addingContact}
            >
              {addingContact ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color={Colors.textOnPrimary} />
                  <Text style={styles.addButtonText}>Add Contact</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Friends List Modal */}
      <Modal
        visible={showFriendsListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFriendsListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Friends Tracking</Text>
              <TouchableOpacity onPress={() => setShowFriendsListModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              People you are tracking and who can see your location
            </Text>

            {loadingFriends ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : friendsList.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={Colors.textLight} />
                <Text style={styles.emptyStateText}>No friends added yet</Text>
                <Text style={styles.emptyStateHint}>Add friends using their tracking code</Text>
              </View>
            ) : (
              <ScrollView style={styles.contactsList}>
                {friendsList.map((friend) => (
                  <View key={friend.id} style={styles.contactItem}>
                    <View style={[styles.contactAvatar, { backgroundColor: Colors.info }]}>
                      <Ionicons name="person" size={20} color={Colors.textOnPrimary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>
                        {friend.display_name || friend.email?.split("@")[0] || "Friend"}
                      </Text>
                      <Text style={styles.contactPhone}>{friend.email || "No email"}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteContactButton}
                      onPress={() => handleRemoveFriend(friend.id, friend.display_name || "this friend")}
                    >
                      <Ionicons name="person-remove-outline" size={20} color={Colors.accent} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setShowFriendsListModal(false);
                setShowAddFriendModal(true);
              }}
            >
              <Ionicons name="person-add" size={20} color={Colors.textOnPrimary} />
              <Text style={styles.addButtonText}>Add Friend by Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>App Theme</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Choose your preferred app theme</Text>

            {[
              { id: "system", label: "System Default", icon: "phone-portrait-outline", desc: "Match your device settings" },
              { id: "light", label: "Light Mode", icon: "sunny-outline", desc: "Always use light theme" },
              { id: "dark", label: "Dark Mode", icon: "moon-outline", desc: "Always use dark theme" },
            ].map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[styles.optionItem, selectedTheme === theme.id && styles.optionItemSelected]}
                onPress={() => handleThemeChange(theme.id)}
              >
                <View style={[styles.optionIcon, selectedTheme === theme.id && styles.optionIconSelected]}>
                  <Ionicons name={theme.icon} size={22} color={selectedTheme === theme.id ? Colors.textOnPrimary : Colors.primary} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, selectedTheme === theme.id && styles.optionLabelSelected]}>{theme.label}</Text>
                  <Text style={styles.optionDesc}>{theme.desc}</Text>
                </View>
                {selectedTheme === theme.id && (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select your preferred language</Text>

            {[
              { id: "en", label: "English", flag: "🇺🇸" },
              { id: "tl", label: "Filipino (Tagalog)", flag: "🇵🇭" },
              { id: "ceb", label: "Cebuano", flag: "🇵🇭" },
            ].map((lang) => (
              <TouchableOpacity
                key={lang.id}
                style={[styles.optionItem, selectedLanguage === lang.id && styles.optionItemSelected]}
                onPress={() => handleLanguageChange(lang.id)}
              >
                <Text style={styles.flagEmoji}>{lang.flag}</Text>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, selectedLanguage === lang.id && styles.optionLabelSelected]}>{lang.label}</Text>
                </View>
                {selectedLanguage === lang.id && (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <Text style={styles.languageNote}>
              Note: Language support is limited. Some content may remain in English.
            </Text>
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
  // New modal styles
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: 12,
  },
  emptyStateHint: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },
  contactsList: {
    maxHeight: 300,
    marginVertical: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  contactPhone: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  contactRelation: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
  },
  deleteContactButton: {
    padding: 8,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(46, 125, 50, 0.08)",
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconSelected: {
    backgroundColor: Colors.primary,
  },
  optionContent: {
    flex: 1,
    marginLeft: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  optionLabelSelected: {
    color: Colors.primary,
  },
  optionDesc: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  flagEmoji: {
    fontSize: 28,
    marginRight: 4,
  },
  languageNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
});

/**
 * Home Screen (Dashboard)
 * OLFU-QC Commute Smart App
 *
 * Features:
 * - Welcome message with user info
 * - Quick access buttons to main features
 * - Recent activity summary
 * - Safety status indicator
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import SOSButton from "../../components/SOSButton";
import { logScreenView, logInteraction } from "../../utils/usabilityLogger";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    logScreenView("HomeScreen");
  }, []);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Get user's full name
  const getUserName = () => {
    if (!user) return "OLFU Student";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) {
      return fullName;
    }
    if (user.primaryEmailAddress?.emailAddress) {
      return user.primaryEmailAddress.emailAddress.split("@")[0];
    }
    return "OLFU Student";
  };

  // Get user's first name for greeting
  const getUserFirstName = () => {
    if (!user) return "Student";
    return user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "Student";
  };

  const quickActions = [
    {
      id: "commute",
      title: "Plan Route",
      subtitle: "Find your way to OLFU",
      icon: "navigate",
      color: Colors.primary,
      route: "/commute",
    },
    {
      id: "tracking",
      title: "Track Friends",
      subtitle: "See who's nearby",
      icon: "people",
      color: Colors.info,
      route: "/safety",
    },
    {
      id: "schedule",
      title: "Class Schedule",
      subtitle: "View today's classes",
      icon: "calendar",
      color: Colors.warning,
      route: null,
    },
    {
      id: "alerts",
      title: "Safety Alerts",
      subtitle: "Campus notifications",
      icon: "notifications",
      color: Colors.accent,
      route: null,
    },
  ];

  const handleQuickAction = (action) => {
    logInteraction("tap", `quick_action_${action.id}`);
    if (action.route) {
      router.push(action.route);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeContent}>
            <Text style={styles.greeting}>
              {getGreeting()}, {getUserFirstName()}! 👋
            </Text>
            <Text style={styles.userName}>{getUserName()}</Text>
            <Text style={styles.statusText}>
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={Colors.success}
              />{" "}
              You&apos;re safe and connected
            </Text>
          </View>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color={Colors.primary} />
            </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionCard}
              onPress={() => handleQuickAction(action)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: action.color },
                ]}
              >
                <Ionicons
                  name={action.icon}
                  size={24}
                  color={Colors.textOnPrimary}
                />
              </View>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
              <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Campus Info Card */}
        <View style={styles.campusCard}>
          <View style={styles.campusHeader}>
            <Ionicons name="school" size={24} color={Colors.primary} />
            <Text style={styles.campusTitle}>OLFU Quezon City</Text>
          </View>
          <View style={styles.campusInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color={Colors.textLight} />
              <Text style={styles.infoText}>Hilltop, Novaliches, QC</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color={Colors.textLight} />
              <Text style={styles.infoText}>
                Campus Open: 6:00 AM - 9:00 PM
              </Text>
            </View>
          </View>
        </View>

        {/* Safety Section with SOS */}
        <Text style={styles.sectionTitle}>Emergency SOS</Text>
        <View style={styles.sosSection}>
          <SOSButton
            size={100}
            onActivate={() => {
              console.log("SOS activated from Home Screen");
            }}
          />
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <ActivityItem
            icon="navigate"
            title="Route completed"
            subtitle="Home → OLFU Hilltop"
            time="Yesterday, 7:30 AM"
          />
          <ActivityItem
            icon="people"
            title="Group check-in"
            subtitle="Study group arrived at library"
            time="Yesterday, 2:15 PM"
          />
          <ActivityItem
            icon="shield-checkmark"
            title="Geofence entered"
            subtitle="You arrived at OLFU campus"
            time="Yesterday, 7:45 AM"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Activity Item Component
function ActivityItem({ icon, title, subtitle, time }) {
  return (
    <View style={styles.activityItem}>
      <View style={styles.activityIcon}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activitySubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.activityTime}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textLight,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    color: Colors.success,
    marginTop: 8,
  },
  avatarContainer: {
    marginLeft: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  quickActionCard: {
    width: "48%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  campusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  campusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  campusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginLeft: 8,
  },
  campusInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 8,
  },
  sosSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 8,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  activitySubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    color: Colors.textLight,
  },
});

/**
 * Tab Navigation Layout
 * OLFU-QC Commute Smart App
 *
 * Bottom Tab Navigator with:
 * - Home: Dashboard with quick access
 * - Commute: Route planning
 * - Safety: Group tracking and SOS
 * - Profile: User settings
 */

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Platform } from "react-native";
import Colors from "../../constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTintColor: Colors.textOnPrimary,
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: "OLFU Commute Smart",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="commute"
        options={{
          title: "Commute",
          headerTitle: "Route Planner",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "navigate" : "navigate-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="safety"
        options={{
          title: "Safety",
          headerTitle: "Safety & Tracking",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "shield" : "shield-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerTitle: "My Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "person" : "person-outline"}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

// Tab Icon Component
function TabIcon({ name, color }) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={name} size={24} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    height: Platform.OS === "ios" ? 88 : 65,
    paddingBottom: Platform.OS === "ios" ? 28 : 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  header: {
    backgroundColor: Colors.primary,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    fontWeight: "bold",
    fontSize: 18,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});

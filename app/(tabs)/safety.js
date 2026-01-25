/**
 * Safety & Group Tracking Screen
 * OLFU-QC Commute Smart App
 *
 * Features:
 * - Interactive map using OpenStreetMap (FREE!)
 * - Friend markers with status
 * - OLFU campus geofence indicator
 * - SOS button integration
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import Colors from "../../constants/colors";
import {
  OLFU_CAMPUS,
  GEOFENCE_RADIUS,
} from "../../constants/config";
import SOSButton from "../../components/SOSButton";
import MapViewComponent from "../../components/MapViewComponent";
import {
  logScreenView,
  logInteraction,
  logError,
} from "../../utils/usabilityLogger";
import {
  getFriends,
  subscribeFriendLocations,
  updateUserLocation,
} from "../../config/supabase";

export default function SafetyScreen() {
  const { user } = useUser();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInsideGeofence, setIsInsideGeofence] = useState(false);
  const [showSOSPanel, setShowSOSPanel] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendLocations, setFriendLocations] = useState([]);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    logScreenView("SafetyScreen");
    requestLocationPermission();
  }, []);

  // Fetch friends and subscribe to their locations
  useEffect(() => {
    if (user?.id) {
      loadFriendsAndLocations();
    }

    return () => {
      // Cleanup subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user?.id]);

  // Update user's own location periodically
  useEffect(() => {
    if (user?.id && location) {
      updateUserLocation(user.id, location.latitude, location.longitude);
    }
  }, [user?.id, location]);

  const loadFriendsAndLocations = async () => {
    try {
      // Get friends list
      const friendsList = await getFriends(user.id);
      console.log("[Safety] Friends list loaded:", friendsList.length, "friends");
      console.log("[Safety] Friends:", JSON.stringify(friendsList.map(f => ({ id: f.id, name: f.display_name })), null, 2));
      setFriends(friendsList);

      // Subscribe to friend locations
      unsubscribeRef.current = subscribeFriendLocations(
        user.id,
        (locations) => {
          console.log("[Safety] Friend locations received:", locations.length, "locations");
          console.log("[Safety] Locations:", JSON.stringify(locations.map(l => ({
            user_id: l.user_id,
            lat: l.latitude,
            lng: l.longitude,
            shared_with: l.shared_with
          })), null, 2));
          setFriendLocations(locations);
        },
        5000 // Poll every 5 seconds
      );
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  // Check if user is inside OLFU geofence
  useEffect(() => {
    if (location) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        OLFU_CAMPUS.latitude,
        OLFU_CAMPUS.longitude
      );
      setIsInsideGeofence(distance <= GEOFENCE_RADIUS);
    }
  }, [location]);

  const requestLocationPermission = async () => {
    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        logError("permission_denied", "Location permission was denied");
        setLoading(false);
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      logInteraction("location_obtained", "user_location", {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      setLoading(false);
    } catch (error) {
      console.error("Location error:", error);
      // Use campus location as fallback
      setLocation({
        latitude: OLFU_CAMPUS.latitude,
        longitude: OLFU_CAMPUS.longitude,
      });
      setLoading(false);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Open in OpenStreetMap (FREE - no Google Maps!)
  const openInExternalMaps = () => {
    const lat = OLFU_CAMPUS.latitude;
    const lng = OLFU_CAMPUS.longitude;
    // OpenStreetMap URL - completely free!
    const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}&layers=N`;
    Linking.openURL(osmUrl);
  };

  const handleFriendSelect = (friend) => {
    logInteraction("tap", `friend_${friend.id}`);
    setSelectedFriend(friend);
  };

  const handleMarkerPress = (data) => {
    console.log("Marker pressed:", data);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare markers for the map - combine friend info with their locations
  const friendMarkers = friendLocations
    .map((loc) => {
      // Find the friend profile that matches this location
      const friend = friends.find((f) => f.id === loc.user_id);

      // Debug: log matching
      console.log(`[Safety] Matching location user_id: ${loc.user_id}, found friend:`, friend ? friend.display_name : "NOT FOUND");

      if (!friend || !loc.latitude || !loc.longitude) {
        console.log(`[Safety] Skipping location - friend: ${!!friend}, lat: ${loc.latitude}, lng: ${loc.longitude}`);
        return null;
      }

      // Calculate how long ago the location was updated
      const updatedAt = new Date(loc.updated_at);
      const now = new Date();
      const diffMs = now - updatedAt;
      const diffMins = Math.floor(diffMs / 60000);
      let lastSeen = "Just now";
      if (diffMins >= 60) {
        const hours = Math.floor(diffMins / 60);
        lastSeen = `${hours}h ago`;
      } else if (diffMins > 0) {
        lastSeen = `${diffMins} min ago`;
      }

      return {
        id: friend.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        title: friend.display_name || friend.email?.split("@")[0] || "Friend",
        description: `Last seen: ${lastSeen}`,
        color: Colors.friendMarker,
        photo_url: friend.photo_url || null, // Include profile photo for map marker
      };
    })
    .filter(Boolean); // Remove null entries

  // Also prepare list of friends without location (for UI display)
  const friendsWithoutLocation = friends.filter(
    (f) => !friendMarkers.some((m) => m.id === f.id)
  );

  console.log(`[Safety] Friends with location: ${friendMarkers.length}, without: ${friendsWithoutLocation.length}`);

  // Use real friend markers (no mock fallback when user has real friends)
  const displayMarkers = friendMarkers;

  // For UI: combine friends with location + friends waiting for location
  const allFriendsForUI = [
    ...friendMarkers.map((m) => ({ ...m, hasLocation: true })),
    ...friendsWithoutLocation.map((f) => ({
      id: f.id,
      title: f.display_name || f.email?.split("@")[0] || "Friend",
      description: "Location not shared yet",
      hasLocation: false,
    })),
  ];

  // Geofence circle
  const geofenceCircle = {
    latitude: OLFU_CAMPUS.latitude,
    longitude: OLFU_CAMPUS.longitude,
    radius: GEOFENCE_RADIUS,
    strokeColor: Colors.geofenceStroke,
    fillColor: Colors.geofenceFill,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* OpenStreetMap with Route Following (FREE!) */}
      <View style={styles.mapContainer}>
        <MapViewComponent
          center={OLFU_CAMPUS}
          zoom={15}
          markers={displayMarkers}
          circles={[geofenceCircle]}
          userLocation={location}
          destination={OLFU_CAMPUS}
          showRoute={!isInsideGeofence}
          onMarkerPress={handleMarkerPress}
          style={styles.map}
        />

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={openInExternalMaps}
          >
            <Ionicons name="open-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Geofence Status Notification */}
      <View
        style={[
          styles.geofenceNotification,
          isInsideGeofence ? styles.geofenceInside : styles.geofenceOutside,
        ]}
      >
        <Ionicons
          name={isInsideGeofence ? "shield-checkmark" : "shield-outline"}
          size={20}
          color={isInsideGeofence ? Colors.success : Colors.warning}
        />
        <Text
          style={[
            styles.geofenceText,
            isInsideGeofence
              ? styles.geofenceTextInside
              : styles.geofenceTextOutside,
          ]}
        >
          {isInsideGeofence ? "Inside OLFU Campus" : "Outside OLFU Campus"}
        </Text>
      </View>

      {/* Friends Panel */}
      <View style={styles.friendsPanel}>
        <Text style={styles.friendsPanelTitle}>
          <Ionicons name="people" size={16} color={Colors.text} /> Tracked
          Friends {allFriendsForUI.length > 0 ? `(${allFriendsForUI.length})` : ""}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.friendsScroll}
        >
          {allFriendsForUI.length > 0 ? (
            allFriendsForUI.map((friend) => (
              <TouchableOpacity
                key={friend.id}
                style={[
                  styles.friendItem,
                  selectedFriend?.id === friend.id && styles.friendItemSelected,
                  !friend.hasLocation && styles.friendItemInactive,
                ]}
                onPress={() => friend.hasLocation && handleFriendSelect(friend)}
                disabled={!friend.hasLocation}
              >
                <View style={[
                  styles.friendAvatar,
                  !friend.hasLocation && styles.friendAvatarInactive,
                ]}>
                  <Ionicons
                    name="person"
                    size={18}
                    color={friend.hasLocation ? Colors.textOnPrimary : Colors.textLight}
                  />
                </View>
                <Text style={[
                  styles.friendName,
                  !friend.hasLocation && styles.friendNameInactive,
                ]}>{friend.title}</Text>
                <View style={styles.friendStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: friend.hasLocation ? Colors.success : Colors.textLight },
                    ]}
                  />
                  <Text style={styles.friendStatus}>
                    {friend.hasLocation
                      ? (friend.description?.replace("Last seen: ", "") || "Online")
                      : "Waiting..."}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noFriendsContainer}>
              <Text style={styles.noFriendsText}>
                No friends tracking yet. Add friends using their tracking code!
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* SOS Button */}
      <TouchableOpacity
        style={styles.sosFloatingButton}
        onPress={() => setShowSOSPanel(true)}
      >
        <Ionicons name="warning" size={26} color={Colors.textOnAccent} />
        <Text style={styles.sosFloatingText}>SOS</Text>
      </TouchableOpacity>

      {/* SOS Panel Modal */}
      {showSOSPanel && (
        <View style={styles.sosPanel}>
          <TouchableOpacity
            style={styles.sosPanelClose}
            onPress={() => setShowSOSPanel(false)}
          >
            <Ionicons name="close-circle" size={32} color={Colors.textLight} />
          </TouchableOpacity>
          <Text style={styles.sosPanelTitle}>Emergency SOS</Text>
          <Text style={styles.sosPanelDescription}>
            Press and hold the button below for 3 seconds to send an emergency
            alert to your contacts.
          </Text>
          <SOSButton
            size={140}
            userId={user?.id}
            userLocation={location}
            onActivate={(result) => {
              setShowSOSPanel(false);
              console.log("Emergency SOS triggered from Safety Screen", result);
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textLight,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: "absolute",
    right: 16,
    top: 70,
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  // Geofence Notification
  geofenceNotification: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  geofenceInside: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  geofenceOutside: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  geofenceText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  geofenceTextInside: {
    color: Colors.success,
  },
  geofenceTextOutside: {
    color: Colors.warning,
  },
  // Friends Panel
  friendsPanel: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 12,
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  friendsPanelTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  friendsScroll: {
    paddingHorizontal: 12,
    gap: 10,
  },
  noFriendsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  noFriendsText: {
    fontSize: 13,
    color: Colors.textLight,
    fontStyle: "italic",
  },
  friendItem: {
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    minWidth: 100,
    marginHorizontal: 4,
  },
  friendItemSelected: {
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  friendItemInactive: {
    opacity: 0.6,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.friendMarker,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  friendAvatarInactive: {
    backgroundColor: Colors.textLight,
  },
  friendName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
  },
  friendNameInactive: {
    color: Colors.textLight,
  },
  friendStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  friendStatus: {
    fontSize: 11,
    color: Colors.textLight,
  },
  // SOS Floating Button
  sosFloatingButton: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  sosFloatingText: {
    color: Colors.textOnAccent,
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 2,
  },
  // SOS Panel
  sosPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sosPanelClose: {
    position: "absolute",
    top: 50,
    right: 20,
    padding: 8,
  },
  sosPanelTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.accent,
    marginBottom: 12,
  },
  sosPanelDescription: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: "center",
    marginBottom: 30,
    maxWidth: 300,
    lineHeight: 22,
  },
});

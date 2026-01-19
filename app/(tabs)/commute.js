/**
 * Commute Route Planner Screen
 * OLFU-QC Commute Smart App
 *
 * Local Routes & Fare Estimates
 * Uses FREE OpenStreetMap for navigation
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { OLFU_CAMPUS } from "../../constants/config";
import MapViewComponent from "../../components/MapViewComponent";
import NavigationMap from "../../components/NavigationMap";
import LocationPicker from "../../components/LocationPicker";
import {
  logScreenView,
  logInteraction,
  logTaskCompletion,
} from "../../utils/usabilityLogger";

export default function CommuteScreen() {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [origin, setOrigin] = useState("Current Location");
  const [originLocation, setOriginLocation] = useState(null);
  const [destination, setDestination] = useState("OLFU Hilltop");
  const [destinationLocation, setDestinationLocation] = useState({
    latitude: OLFU_CAMPUS.latitude,
    longitude: OLFU_CAMPUS.longitude,
    name: "OLFU Hilltop",
    address: "OLFU QC Campus",
  });
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    logScreenView("CommuteScreen");
    getUserLocation();
  }, []);

  // Get user's current location
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const currentLoc = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          name: "Current Location",
          address: `${location.coords.latitude.toFixed(
            4
          )}°N, ${location.coords.longitude.toFixed(4)}°E`,
        };
        setUserLocation(currentLoc);
        setOriginLocation(currentLoc);
        setOrigin("Current Location");
      }
    } catch (error) {
      console.log("Error getting location:", error);
    }
  };

  // Handle origin location selection from picker
  const handleLocationSelect = (location) => {
    setOriginLocation(location);
    setOrigin(location.name);
    setUserLocation({
      latitude: location.latitude,
      longitude: location.longitude,
    });
    logInteraction("select_origin", location.name, {
      latitude: location.latitude,
      longitude: location.longitude,
    });
  };

  // Handle destination location selection from picker
  const handleDestinationSelect = (location) => {
    setDestinationLocation(location);
    setDestination(location.name);
    logInteraction("select_destination", location.name, {
      latitude: location.latitude,
      longitude: location.longitude,
    });
  };

  // Legit Route data for Quezon City to OLFU
  const routes = [
    {
      id: "1",
      name: "Jeepney via Commonwealth",
      vehicleType: "jeepney",
      fare: 15,
      duration: 30,
      distance: "5.2 km",
      description:
        "Most common route. Take the Fairview-bound jeepney along Commonwealth Avenue. Affordable and frequent trips.",
      stops: "Commonwealth → Litex → Hilltop",
      steps: [
        "Walk to the nearest jeepney stop on Commonwealth Ave.",
        "Look for jeepneys with 'Fairview' or 'Hilltop' sign",
        "Ride the jeepney going to Fairview direction",
        "Tell the driver to drop you at OLFU Hilltop",
        "Fare: ₱15 (may vary slightly)",
      ],
    },
    {
      id: "2",
      name: "Bus via EDSA + Jeep",
      vehicleType: "bus",
      fare: 25,
      duration: 45,
      distance: "8.1 km",
      description:
        "Take a bus along EDSA to SM Fairview then transfer to jeepney going to OLFU. Air-conditioned option.",
      stops: "EDSA → SM Fairview → OLFU",
      steps: [
        "Go to the nearest EDSA bus stop",
        "Ride a bus going to SM Fairview/Fairview Terminal",
        "Alight at SM Fairview Bus Terminal",
        "Transfer to jeepney going to OLFU Hilltop",
        "Bus Fare: ₱15-20 | Jeep Fare: ₱10",
      ],
    },
    {
      id: "3",
      name: "Tricycle Direct",
      vehicleType: "tricycle",
      fare: 50,
      duration: 10,
      distance: "2.1 km",
      description:
        "Direct and fastest option if you're nearby. Negotiate fare with the driver. Best for short distances.",
      stops: "Direct to OLFU Gate",
      steps: [
        "Hail a tricycle from your location",
        "Tell the driver: 'OLFU Hilltop, please'",
        "Negotiate the fare (usually ₱50-80)",
        "Direct ride to OLFU main gate",
        "Tip: Agree on fare before riding",
      ],
    },
    {
      id: "4",
      name: "UV Express via Mindanao Ave",
      vehicleType: "van",
      fare: 20,
      duration: 25,
      distance: "6.5 km",
      description:
        "UV Express/FX vans along Mindanao Avenue. Faster than jeepney, air-conditioned.",
      stops: "Trinoma → Mindanao Ave → Hilltop",
      steps: [
        "Go to Trinoma or nearest UV terminal",
        "Look for UV Express going to Fairview",
        "Ride the van along Mindanao Avenue route",
        "Alight at Hilltop/OLFU area",
        "Walk 3-5 minutes to OLFU gate",
      ],
    },
    {
      id: "5",
      name: "Grab/Taxi",
      vehicleType: "car",
      fare: 150,
      duration: 15,
      distance: "Varies",
      description:
        "Most convenient door-to-door option. Book via Grab app. Price varies based on traffic and distance.",
      stops: "Door to Door Service",
      steps: [
        "Open Grab app on your phone",
        "Set pickup: Your current location",
        "Set destination: OLFU Quezon City, Hilltop",
        "Choose GrabCar or GrabShare",
        "Confirm booking and wait for driver",
      ],
    },
  ];

  // Get vehicle icon based on type
  const getVehicleIcon = (vehicleType) => {
    switch (vehicleType) {
      case "jeepney":
        return (
          <FontAwesome5 name="shuttle-van" size={24} color={Colors.primary} />
        );
      case "bus":
        return <Ionicons name="bus" size={28} color={Colors.primary} />;
      case "tricycle":
        return (
          <MaterialCommunityIcons
            name="motorbike"
            size={28}
            color={Colors.primary}
          />
        );
      case "van":
        return <Ionicons name="car-sport" size={26} color={Colors.primary} />;
      case "car":
        return <Ionicons name="car" size={26} color={Colors.primary} />;
      default:
        return <Ionicons name="navigate" size={26} color={Colors.primary} />;
    }
  };

  const handleRouteSelect = (route) => {
    logInteraction("select_route", `route_${route.id}`, {
      routeName: route.name,
      vehicleType: route.vehicleType,
    });
    setSelectedRoute(route);
    setModalVisible(true);
  };

  // Show the map with route
  const handleStartNavigation = () => {
    if (!selectedRoute) return;

    logTaskCompletion("Route_Selection", 0, true, {
      routeId: selectedRoute.id,
      routeName: selectedRoute.name,
      fare: selectedRoute.fare,
      duration: selectedRoute.duration,
    });

    setModalVisible(false);
    setShowMapModal(true);
  };

  // Open Grab app for ride-hailing
  const handleOpenGrab = async () => {
    const grabUrl = "grab://";
    const grabPlayStore =
      "https://play.google.com/store/apps/details?id=com.grabtaxi.passenger";
    const grabAppStore = "https://apps.apple.com/app/grab-app/id647268330";

    try {
      const canOpen = await Linking.canOpenURL(grabUrl);
      if (canOpen) {
        await Linking.openURL(grabUrl);
      } else {
        await Linking.openURL(
          Platform.OS === "android" ? grabPlayStore : grabAppStore
        );
      }
    } catch (_error) {
      Alert.alert("Grab", "Please install Grab app for ride-hailing service.");
    }
  };

  // Route Card Component
  const RouteCard = ({ route }) => {
    return (
      <TouchableOpacity
        style={styles.routeCard}
        onPress={() => handleRouteSelect(route)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          {getVehicleIcon(route.vehicleType)}
        </View>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>{route.name}</Text>
          <Text style={styles.routeStops}>{route.stops}</Text>
        </View>
        <View style={styles.fareTimeContainer}>
          <View style={styles.fareBox}>
            <Text style={styles.fareLabel}>Fare</Text>
            <Text style={styles.fareValue}>₱{route.fare}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Time</Text>
            <Text style={styles.timeValue}>{route.duration} min</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const [routeInfo, setRouteInfo] = useState(null);

  // Handle route calculation callback
  const handleRouteCalculated = (data) => {
    console.log("Route calculated:", data);
    setRouteInfo({
      distance: data.distance,
      duration: data.duration,
      steps: data.steps,
    });
  };

  // Start Google Maps-style navigation
  const startNavigation = async () => {
    setIsLoading(true);
    logInteraction("tap", "start_navigation");

    try {
      // Make sure we have location
      if (!userLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      }

      // Close any modals and start navigation
      setShowMapModal(false);
      setModalVisible(false);
      setIsNavigating(true);
      setIsLoading(false);

      logTaskCompletion("start_navigation", 0, true);
    } catch (error) {
      console.log("Navigation error:", error);
      setIsLoading(false);
      Alert.alert("Error", "Could not start navigation. Please try again.");
    }
  };

  // Handle arrival at destination
  const handleArrival = () => {
    Alert.alert(
      "🎉 You've Arrived!",
      "You have reached OLFU Quezon City - Hilltop Campus.",
      [{ text: "Great!", onPress: () => setIsNavigating(false) }]
    );
    logTaskCompletion("navigation_complete", 0, true);
  };

  // Markers for map (friends only, user location handled separately)
  const getMapMarkers = () => {
    return [];
  };

  // Full-screen Google Maps-style Navigation Mode
  if (isNavigating) {
    return (
      <SafeAreaView style={styles.container}>
        <NavigationMap
          destination={destinationLocation || OLFU_CAMPUS}
          destinationName={destination || "OLFU QC - Hilltop Campus"}
          onClose={() => setIsNavigating(false)}
          onArrival={handleArrival}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Local Routes & Fare Estimates</Text>
        <Text style={styles.headerSubtitle}>
          Real commute options to OLFU QC
        </Text>
      </View>

      {/* Location Selector */}
      <View style={styles.locationCard}>
        {/* FROM - Tappable to open location picker */}
        <TouchableOpacity
          style={styles.locationRow}
          onPress={() => setShowLocationPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.locationIconContainer}>
            <View style={styles.originDot} />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>FROM</Text>
            <Text style={styles.locationValue}>{origin}</Text>
            {originLocation ? (
              <Text style={styles.coordsText}>
                {originLocation.address ||
                  `${originLocation.latitude.toFixed(
                    4
                  )}°N, ${originLocation.longitude.toFixed(4)}°E`}
              </Text>
            ) : userLocation ? (
              <Text style={styles.coordsText}>
                {userLocation.latitude.toFixed(4)}°N,{" "}
                {userLocation.longitude.toFixed(4)}°E
              </Text>
            ) : (
              <Text style={styles.coordsTextHint}>Tap to select location</Text>
            )}
          </View>
          <View style={styles.locationButtons}>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={(e) => {
                e.stopPropagation();
                getUserLocation();
              }}
            >
              <Ionicons name="locate" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textLight}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.connectorContainer}>
          <View style={styles.connectorLine} />
        </View>

        {/* TO - Tappable to edit destination */}
        <TouchableOpacity
          style={styles.locationRow}
          onPress={() => setShowDestinationPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.locationIconContainer}>
            <Ionicons name="location" size={20} color={Colors.accent} />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>TO</Text>
            <Text style={styles.locationValue}>{destination}</Text>
            {destinationLocation ? (
              <Text style={styles.coordsText}>
                {destinationLocation.address || `${destinationLocation.latitude.toFixed(4)}°N, ${destinationLocation.longitude.toFixed(4)}°E`}
              </Text>
            ) : (
              <Text style={styles.coordsTextHint}>Tap to select destination</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>

        {/* Philippines Only Badge */}
        <View style={styles.phOnlyBadge}>
          <Text style={styles.phOnlyText}>🇵🇭 Philippines locations only</Text>
        </View>
      </View>

      {/* Routes Section */}
      <View style={styles.routesSection}>
        <View style={styles.routesHeader}>
          <Text style={styles.routesSectionTitle}>Available Routes</Text>
          <Text style={styles.routesCount}>{routes.length} options</Text>
        </View>
      </View>

      {/* Routes List */}
      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RouteCard route={item} />}
        contentContainerStyle={styles.routesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Route Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            {selectedRoute && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    {getVehicleIcon(selectedRoute.vehicleType)}
                  </View>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>{selectedRoute.name}</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedRoute.stops}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalStats}>
                  <View style={styles.modalStatItem}>
                    <Ionicons
                      name="cash-outline"
                      size={24}
                      color={Colors.primary}
                    />
                    <Text style={styles.modalStatValue}>
                      ₱{selectedRoute.fare}
                    </Text>
                    <Text style={styles.modalStatLabel}>Est. Fare</Text>
                  </View>
                  <View style={styles.modalStatDivider} />
                  <View style={styles.modalStatItem}>
                    <Ionicons
                      name="time-outline"
                      size={24}
                      color={Colors.primary}
                    />
                    <Text style={styles.modalStatValue}>
                      {selectedRoute.duration} min
                    </Text>
                    <Text style={styles.modalStatLabel}>Travel Time</Text>
                  </View>
                  <View style={styles.modalStatDivider} />
                  <View style={styles.modalStatItem}>
                    <Ionicons
                      name="navigate-outline"
                      size={24}
                      color={Colors.primary}
                    />
                    <Text style={styles.modalStatValue}>
                      {selectedRoute.distance}
                    </Text>
                    <Text style={styles.modalStatLabel}>Distance</Text>
                  </View>
                </View>

                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionText}>
                    {selectedRoute.description}
                  </Text>
                </View>

                <Text style={styles.stepsTitle}>How to Commute</Text>
                <ScrollView style={styles.stepsList}>
                  {selectedRoute.steps.map((step, index) => (
                    <View key={index} style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.actionButtons}>
                  {selectedRoute.vehicleType === "car" ? (
                    <TouchableOpacity
                      style={[styles.startButton, styles.grabButton]}
                      onPress={handleOpenGrab}
                    >
                      <Ionicons name="car" size={20} color="#FFFFFF" />
                      <Text style={styles.startButtonText}>Open Grab App</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      {/* Primary: Start Navigation (Google Maps style) */}
                      <TouchableOpacity
                        style={styles.startButton}
                        onPress={startNavigation}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ActivityIndicator
                            size="small"
                            color={Colors.textOnPrimary}
                          />
                        ) : (
                          <>
                            <Ionicons
                              name="navigate"
                              size={20}
                              color={Colors.textOnPrimary}
                            />
                            <Text style={styles.startButtonText}>
                              Start Navigation
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* Secondary: View on Map (Preview) */}
                      <TouchableOpacity
                        style={styles.previewMapButton}
                        onPress={handleStartNavigation}
                      >
                        <Ionicons
                          name="map-outline"
                          size={18}
                          color={Colors.primary}
                        />
                        <Text style={styles.previewMapText}>Preview Route</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                <Text style={styles.infoNote}>
                  <Ionicons name="leaf" size={14} color={Colors.success} /> Free
                  OpenStreetMap - No API key needed!
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Map View Modal (FREE OpenStreetMap) */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showMapModal}
        onRequestClose={() => setShowMapModal(false)}
      >
        <SafeAreaView style={styles.mapModalContainer}>
          {/* Map Header */}
          <View style={styles.mapHeader}>
            <TouchableOpacity
              style={styles.mapBackButton}
              onPress={() => setShowMapModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.mapHeaderContent}>
              <Text style={styles.mapHeaderTitle}>Navigation</Text>
              <Text style={styles.mapHeaderSubtitle}>
                {selectedRoute?.name || "Route"} → OLFU Hilltop
              </Text>
            </View>
          </View>

          {/* OpenStreetMap with Route Following (FREE!) */}
          <View style={styles.mapContainer}>
            <MapViewComponent
              center={destinationLocation || OLFU_CAMPUS}
              zoom={14}
              markers={getMapMarkers()}
              userLocation={userLocation}
              destination={destinationLocation || OLFU_CAMPUS}
              showRoute={true}
              onRouteCalculated={handleRouteCalculated}
              style={styles.map}
            />

            {/* Route Following Badge */}
            <View style={styles.routeBadge}>
              <Ionicons
                name="navigate"
                size={16}
                color={Colors.textOnPrimary}
              />
              <Text style={styles.routeBadgeText}>Route Following Active</Text>
            </View>
          </View>

          {/* Route Info Card */}
          <View style={styles.mapInfoCard}>
            {/* Calculated Route Info */}
            {routeInfo && (
              <View style={styles.calculatedRoute}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={Colors.success}
                />
                <Text style={styles.calculatedRouteText}>
                  Route: {routeInfo.distance} km • ~{routeInfo.duration} min
                  drive
                </Text>
              </View>
            )}

            <View style={styles.mapInfoRow}>
              <View style={styles.mapInfoItem}>
                <Ionicons name="location" size={20} color={Colors.primary} />
                <Text style={styles.mapInfoLabel}>Destination</Text>
                <Text style={styles.mapInfoValue}>OLFU Hilltop</Text>
              </View>
              <View style={styles.mapInfoDivider} />
              <View style={styles.mapInfoItem}>
                <Ionicons name="time" size={20} color={Colors.primary} />
                <Text style={styles.mapInfoLabel}>Commute Time</Text>
                <Text style={styles.mapInfoValue}>
                  {selectedRoute?.duration || 0} min
                </Text>
              </View>
              <View style={styles.mapInfoDivider} />
              <View style={styles.mapInfoItem}>
                <Ionicons name="cash" size={20} color={Colors.primary} />
                <Text style={styles.mapInfoLabel}>Est. Fare</Text>
                <Text style={styles.mapInfoValue}>
                  ₱{selectedRoute?.fare || 0}
                </Text>
              </View>
            </View>

            {/* Transport Mode Info */}
            <View style={styles.transportInfo}>
              <View style={styles.transportIcon}>
                {getVehicleIcon(selectedRoute?.vehicleType)}
              </View>
              <View style={styles.transportDetails}>
                <Text style={styles.transportName}>{selectedRoute?.name}</Text>
                <Text style={styles.transportStops}>
                  {selectedRoute?.stops}
                </Text>
              </View>
            </View>

            {/* Start Navigation Button - IN-APP ONLY, NO GOOGLE MAPS */}
            <TouchableOpacity
              style={styles.bigNavButton}
              onPress={startNavigation}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.textOnPrimary} />
              ) : (
                <>
                  <Ionicons
                    name="navigate"
                    size={22}
                    color={Colors.textOnPrimary}
                  />
                  <Text style={styles.bigNavButtonText}>
                    Start Turn-by-Turn Navigation
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Info: Using OpenStreetMap (free) */}
            <View style={styles.mapInfoBadge}>
              <Ionicons name="leaf" size={16} color={Colors.success} />
              <Text style={styles.mapInfoBadgeText}>
                Powered by OpenStreetMap (Free)
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Origin Location Picker Modal */}
      <LocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelectLocation={handleLocationSelect}
        title="Select Starting Point"
        currentLocation={originLocation}
      />

      {/* Destination Location Picker Modal */}
      <LocationPicker
        visible={showDestinationPicker}
        onClose={() => setShowDestinationPicker(false)}
        onSelectLocation={handleDestinationSelect}
        title="Select Destination"
        currentLocation={destinationLocation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.textOnPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationIconContainer: {
    width: 32,
    alignItems: "center",
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: "rgba(46, 125, 50, 0.3)",
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textLight,
    letterSpacing: 1,
  },
  locationValue: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
    marginTop: 2,
  },
  coordsText: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  coordsTextHint: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
    fontStyle: "italic",
  },
  locationButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedBadge: {
    padding: 8,
  },
  phOnlyBadge: {
    backgroundColor: "rgba(46, 125, 50, 0.08)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },
  phOnlyText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500",
  },
  connectorContainer: {
    marginLeft: 15,
    height: 24,
    justifyContent: "center",
  },
  connectorLine: {
    width: 2,
    height: "100%",
    backgroundColor: "#E0E0E0",
    marginLeft: 1,
  },
  routesSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  routesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  routesSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  routesCount: {
    fontSize: 14,
    color: Colors.textLight,
  },
  routesList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  routeInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  routeName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  routeStops: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  fareTimeContainer: {
    alignItems: "flex-end",
  },
  fareBox: {
    alignItems: "flex-end",
    marginBottom: 6,
  },
  fareLabel: {
    fontSize: 10,
    color: Colors.textLight,
    textTransform: "uppercase",
  },
  fareValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.primary,
  },
  timeBox: {
    alignItems: "flex-end",
  },
  timeLabel: {
    fontSize: 10,
    color: Colors.textLight,
    textTransform: "uppercase",
  },
  timeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
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
    padding: 20,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  modalClose: {
    padding: 4,
  },
  modalStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  modalStatItem: {
    alignItems: "center",
    flex: 1,
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 6,
  },
  modalStatLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  modalStatDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 8,
  },
  descriptionContainer: {
    backgroundColor: "rgba(46, 125, 50, 0.05)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  stepsList: {
    maxHeight: 180,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: "bold",
    color: Colors.textOnPrimary,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    paddingTop: 3,
  },
  actionButtons: {
    marginBottom: 8,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  grabButton: {
    backgroundColor: "#00B14F",
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.textOnPrimary,
  },
  infoNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 8,
  },
  // Map Modal Styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  mapBackButton: {
    padding: 8,
    marginRight: 8,
  },
  mapHeaderContent: {
    flex: 1,
  },
  mapHeaderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  mapHeaderSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapInfoCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  mapInfoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  mapInfoItem: {
    alignItems: "center",
    flex: 1,
  },
  mapInfoLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
  },
  mapInfoValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 2,
  },
  mapInfoDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
  },
  openExternalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  openExternalText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  // Preview Map Button
  previewMapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  previewMapText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  // Big Navigation Button
  bigNavButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  bigNavButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.textOnPrimary,
  },
  // Route Badge
  routeBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  routeBadgeText: {
    color: Colors.textOnPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  // Calculated Route
  calculatedRoute: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  calculatedRouteText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: "600",
  },
  // Transport Info
  transportInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  transportIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  transportDetails: {
    marginLeft: 12,
    flex: 1,
  },
  transportName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  transportStops: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  // Map info badge
  mapInfoBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginTop: 12,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 8,
  },
  mapInfoBadgeText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: "500",
  },
});

/**
 * Location Picker Component - NATIVE VERSION (iOS/Android)
 * Uses react-native-webview
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import Colors from "../constants/colors";

const LocationPicker = ({
  visible,
  onClose,
  onSelectLocation,
  title = "Select Location",
  currentLocation = null,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState({
    latitude: 14.5995, // Manila, Philippines
    longitude: 120.9842,
  });
  const webViewRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Philippines bounding box
  const PH_BOUNDS = {
    south: 4.5,
    north: 21.5,
    west: 116.0,
    east: 127.0,
  };

  // Popular locations in the Philippines
  const POPULAR_LOCATIONS = [
    {
      name: "SM North EDSA",
      address: "Quezon City",
      latitude: 14.6566,
      longitude: 121.0299,
    },
    {
      name: "Trinoma Mall",
      address: "Quezon City",
      latitude: 14.6523,
      longitude: 121.0389,
    },
    {
      name: "Quezon Memorial Circle",
      address: "Quezon City",
      latitude: 14.6515,
      longitude: 121.0497,
    },
    {
      name: "UP Diliman",
      address: "Quezon City",
      latitude: 14.6538,
      longitude: 121.0685,
    },
    {
      name: "Cubao",
      address: "Quezon City",
      latitude: 14.6192,
      longitude: 121.0509,
    },
    {
      name: "Fairview Terraces",
      address: "Quezon City",
      latitude: 14.7361,
      longitude: 121.0573,
    },
    {
      name: "SM Fairview",
      address: "Quezon City",
      latitude: 14.7328,
      longitude: 121.0595,
    },
    {
      name: "Commonwealth Ave",
      address: "Quezon City",
      latitude: 14.6854,
      longitude: 121.0561,
    },
  ];

  useEffect(() => {
    if (currentLocation) {
      setMapCenter(currentLocation);
      setSelectedLocation(currentLocation);
    }
  }, [currentLocation]);

  // Search locations using Nominatim (FREE OpenStreetMap geocoding)
  const searchLocations = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Nominatim API with Philippines country code
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&` +
          `format=json&` +
          `addressdetails=1&` +
          `countrycodes=ph&` +
          `viewbox=${PH_BOUNDS.west},${PH_BOUNDS.north},${PH_BOUNDS.east},${PH_BOUNDS.south}&` +
          `bounded=1&` +
          `limit=10`,
        {
          headers: {
            "User-Agent": "OLFU-QC-CommuteApp/1.0",
          },
        }
      );
      const data = await response.json();

      const results = data.map((item) => ({
        id: item.place_id,
        name: item.display_name.split(",")[0],
        address: item.display_name.split(",").slice(1, 3).join(","),
        fullAddress: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        type: item.type,
      }));

      setSearchResults(results);
    } catch (error) {
      console.log("Search error:", error);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  // Debounced search
  const handleSearchChange = (text) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(text);
    }, 500);
  };

  // Use current GPS location
  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        name: "Current Location",
        address: `${location.coords.latitude.toFixed(
          4
        )}°N, ${location.coords.longitude.toFixed(4)}°E`,
      };

      setSelectedLocation(newLocation);
      setMapCenter(newLocation);
      updateMapMarker(newLocation);
    } catch (error) {
      console.log("Location error:", error);
    }
  };

  // Update map marker via WebView
  const updateMapMarker = (location) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        updateSelectedLocation(${location.latitude}, ${location.longitude}, "${
        location.name || "Selected"
      }");
        true;
      `);
    }
  };

  // Handle location selection
  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    setMapCenter(location);
    updateMapMarker(location);
    setSearchResults([]);
    setSearchQuery("");
    Keyboard.dismiss();
  };

  // Handle map tap
  const handleMapMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "mapTap") {
        // Reverse geocode the tapped location
        const lat = data.latitude;
        const lng = data.longitude;

        // Check if within Philippines bounds
        if (
          lat < PH_BOUNDS.south ||
          lat > PH_BOUNDS.north ||
          lng < PH_BOUNDS.west ||
          lng > PH_BOUNDS.east
        ) {
          return; // Outside Philippines
        }

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?` +
              `lat=${lat}&lon=${lng}&format=json`,
            {
              headers: {
                "User-Agent": "OLFU-QC-CommuteApp/1.0",
              },
            }
          );
          const result = await response.json();

          const location = {
            latitude: lat,
            longitude: lng,
            name: result.display_name?.split(",")[0] || "Selected Location",
            address:
              result.display_name?.split(",").slice(1, 3).join(",") ||
              `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
          };

          setSelectedLocation(location);
        } catch (_e) {
          setSelectedLocation({
            latitude: lat,
            longitude: lng,
            name: "Selected Location",
            address: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
          });
        }
      }
    } catch (_e) {
      console.log("Map message error:", _e);
    }
  };

  // Confirm selection
  const confirmSelection = () => {
    if (selectedLocation) {
      onSelectLocation(selectedLocation);
      onClose();
    }
  };

  // Generate map HTML
  const generateMapHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; }
          .leaflet-control-attribution { font-size: 10px; }
          .selected-marker { background: transparent !important; border: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Philippines bounds
          var phBounds = L.latLngBounds(
            L.latLng(${PH_BOUNDS.south}, ${PH_BOUNDS.west}),
            L.latLng(${PH_BOUNDS.north}, ${PH_BOUNDS.east})
          );

          var map = L.map('map', {
            maxBounds: phBounds,
            maxBoundsViscosity: 1.0,
            minZoom: 6
          }).setView([${mapCenter.latitude}, ${mapCenter.longitude}], 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          }).addTo(map);

          var selectedMarker = null;

          // Add marker for selected location
          window.updateSelectedLocation = function(lat, lng, name) {
            if (selectedMarker) {
              map.removeLayer(selectedMarker);
            }
            
            selectedMarker = L.marker([lat, lng], {
              icon: L.divIcon({
                className: 'selected-marker',
                html: '<div style="background: #D32F2F; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.4);"><span style="transform: rotate(45deg); font-size: 16px;">📍</span></div>',
                iconSize: [36, 36],
                iconAnchor: [18, 36],
              })
            }).addTo(map);

            map.setView([lat, lng], 15, { animate: true });
          };

          // Handle map tap
          map.on('click', function(e) {
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;

            // Check if within Philippines
            if (phBounds.contains(e.latlng)) {
              if (selectedMarker) {
                map.removeLayer(selectedMarker);
              }
              
              selectedMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                  className: 'selected-marker',
                  html: '<div style="background: #D32F2F; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.4);"><span style="transform: rotate(45deg); font-size: 16px;">📍</span></div>',
                  iconSize: [36, 36],
                  iconAnchor: [18, 36],
                })
              }).addTo(map);

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapTap',
                latitude: lat,
                longitude: lng
              }));
            }
          });

          ${
            selectedLocation
              ? `updateSelectedLocation(${selectedLocation.latitude}, ${
                  selectedLocation.longitude
                }, "${selectedLocation.name || "Selected"}");`
              : ""
          }
        </script>
      </body>
      </html>
    `;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search location in Philippines..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoFocus={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={Colors.textLight}
                />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={useCurrentLocation}
          >
            <Ionicons name="locate" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        {isSearching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSelectLocation(item)}
                >
                  <Ionicons name="location" size={20} color={Colors.primary} />
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              style={styles.resultsList}
            />
          </View>
        )}

        {/* Popular Locations (when not searching) */}
        {searchQuery.length === 0 && searchResults.length === 0 && (
          <View style={styles.popularContainer}>
            <Text style={styles.popularTitle}>Popular Locations</Text>
            <FlatList
              data={POPULAR_LOCATIONS}
              keyExtractor={(item) => item.name}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.popularItem}
                  onPress={() => handleSelectLocation(item)}
                >
                  <Ionicons name="location" size={16} color={Colors.primary} />
                  <Text style={styles.popularName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.popularList}
            />
          </View>
        )}

        {/* Map */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: generateMapHTML() }}
            style={styles.map}
            onMessage={handleMapMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />

          {/* Tap to select hint */}
          <View style={styles.mapHint}>
            <Ionicons name="hand-left" size={14} color={Colors.textOnPrimary} />
            <Text style={styles.mapHintText}>
              Tap on map to select location
            </Text>
          </View>
        </View>

        {/* Selected Location Info */}
        {selectedLocation && (
          <View style={styles.selectedContainer}>
            <View style={styles.selectedInfo}>
              <Ionicons name="location" size={24} color={Colors.accent} />
              <View style={styles.selectedTextContainer}>
                <Text style={styles.selectedName}>{selectedLocation.name}</Text>
                <Text style={styles.selectedAddress} numberOfLines={1}>
                  {selectedLocation.address}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={confirmSelection}
            >
              <Ionicons
                name="checkmark"
                size={20}
                color={Colors.textOnPrimary}
              />
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Philippines Only Badge */}
        <View style={styles.phBadge}>
          <Text style={styles.phBadgeText}>🇵🇭 Philippines Only</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: Colors.surface,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  gpsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(46, 125, 50, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  resultsContainer: {
    maxHeight: 250,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  resultsList: {
    paddingHorizontal: 16,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  resultAddress: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  popularContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  popularTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textLight,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  popularList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  popularItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderRadius: 20,
    marginRight: 8,
  },
  popularName: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.text,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  webMapContainer: {
    minHeight: 250,
  },
  map: {
    flex: 1,
  },
  webIframe: {
    width: "100%",
    height: "100%",
    border: "none",
    display: "block",
  },
  mapHint: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  mapHintText: {
    fontSize: 13,
    color: Colors.textOnPrimary,
    fontWeight: "500",
  },
  selectedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  selectedInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedTextContainer: {
    flex: 1,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
  },
  selectedAddress: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: Colors.textOnPrimary,
  },
  phBadge: {
    position: "absolute",
    bottom: 100,
    right: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  phBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },
});

export default LocationPicker;

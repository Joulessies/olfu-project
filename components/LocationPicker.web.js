/**
 * Location Picker Component - WEB VERSION
 * Uses iframe with Leaflet for location selection
 * 
 * Note: Native version is in LocationPicker.native.js
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
  const [mapCenter, setMapCenter] = useState({ latitude: 14.5995, longitude: 120.9842 });
  const iframeRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const POPULAR_LOCATIONS = [
    { name: "SM North EDSA", address: "Quezon City", latitude: 14.6566, longitude: 121.0299 },
    { name: "Trinoma Mall", address: "Quezon City", latitude: 14.6523, longitude: 121.0389 },
    { name: "Quezon Memorial Circle", address: "Quezon City", latitude: 14.6515, longitude: 121.0497 },
    { name: "UP Diliman", address: "Quezon City", latitude: 14.6538, longitude: 121.0685 },
    { name: "Cubao", address: "Quezon City", latitude: 14.6192, longitude: 121.0509 },
    { name: "Fairview Terraces", address: "Quezon City", latitude: 14.7361, longitude: 121.0573 },
    { name: "SM Fairview", address: "Quezon City", latitude: 14.7328, longitude: 121.0595 },
    { name: "Commonwealth Ave", address: "Quezon City", latitude: 14.6854, longitude: 121.0561 },
  ];

  useEffect(() => {
    if (currentLocation) {
      setMapCenter(currentLocation);
      setSelectedLocation(currentLocation);
    }
  }, [currentLocation]);

  const searchLocations = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=ph&limit=10`,
        { headers: { "User-Agent": "OLFU-QC-CommuteApp/1.0" } }
      );
      const data = await response.json();
      const results = data.map((item) => ({
        id: item.place_id,
        name: item.display_name.split(",")[0],
        address: item.display_name.split(",").slice(1, 3).join(","),
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      }));
      setSearchResults(results);
    } catch (error) {
      console.log("Search error:", error);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchLocations(text), 500);
  };

  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        name: "Current Location",
        address: `${location.coords.latitude.toFixed(4)}°N, ${location.coords.longitude.toFixed(4)}°E`,
      };
      setSelectedLocation(newLocation);
      setMapCenter(newLocation);
    } catch (error) {
      console.log("Location error:", error);
    }
  };

  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    setMapCenter(location);
    setSearchResults([]);
    setSearchQuery("");
    Keyboard.dismiss();
  };

  const confirmSelection = () => {
    if (selectedLocation) {
      onSelectLocation(selectedLocation);
      onClose();
    }
  };

  const generateMapHTML = () => {
    const lat = selectedLocation?.latitude || mapCenter.latitude;
    const lng = selectedLocation?.longitude || mapCenter.longitude;
    return `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta charset="utf-8">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%}.leaflet-control-attribution{font-size:10px}</style>
    </head><body><div id="map"></div><script>
      var map = L.map('map').setView([${lat}, ${lng}], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© OpenStreetMap'
      }).addTo(map);
      var marker = L.marker([${lat}, ${lng}], {
        icon: L.divIcon({
          className: '',
          html: '<div style="background: #D32F2F; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
          iconSize: [30, 30], iconAnchor: [15, 30],
        })
      }).addTo(map);
    </script></body></html>`;
  };

  const renderLocationItem = ({ item }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectLocation(item)}>
      <Ionicons name="location" size={20} color={Colors.primary} />
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a place..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(""); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={20} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.gpsButton} onPress={useCurrentLocation}>
            <Ionicons name="navigate" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {isSearching && (
          <View style={styles.loadingContainer}><ActivityIndicator color={Colors.primary} /></View>
        )}

        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList data={searchResults} renderItem={renderLocationItem} keyExtractor={(item) => item.id?.toString()} style={styles.resultsList} />
          </View>
        )}

        {searchResults.length === 0 && !isSearching && searchQuery.length === 0 && (
          <View style={styles.popularContainer}>
            <Text style={styles.popularTitle}>Popular Locations</Text>
            <FlatList data={POPULAR_LOCATIONS} renderItem={renderLocationItem} keyExtractor={(item) => item.name} style={styles.resultsList} />
          </View>
        )}

        <View style={styles.mapContainer}>
          <iframe
            ref={iframeRef}
            srcDoc={generateMapHTML()}
            style={{ width: "100%", height: "100%", border: "none", display: "block", minHeight: 250 }}
            title="Location Picker Map"
            sandbox="allow-scripts allow-same-origin"
          />
          <View style={styles.mapHint}>
            <Ionicons name="hand-left" size={14} color={Colors.textOnPrimary} />
            <Text style={styles.mapHintText}>Tap on map to select location</Text>
          </View>
        </View>

        {selectedLocation && (
          <View style={styles.selectedContainer}>
            <View style={styles.selectedInfo}>
              <Ionicons name="location" size={24} color={Colors.accent} />
              <View style={styles.selectedTextContainer}>
                <Text style={styles.selectedName}>{selectedLocation.name}</Text>
                <Text style={styles.selectedAddress} numberOfLines={1}>{selectedLocation.address}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.confirmButton} onPress={confirmSelection}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E0E0E0", backgroundColor: Colors.surface },
  closeButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: "bold", color: Colors.text },
  searchContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, gap: 12 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#E0E0E0" },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: Colors.text },
  gpsButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.primary },
  loadingContainer: { padding: 20, alignItems: "center" },
  resultsContainer: { maxHeight: 200, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  popularContainer: { maxHeight: 200, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  popularTitle: { fontSize: 14, fontWeight: "600", color: Colors.textLight, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  resultsList: { flex: 1 },
  resultItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.background },
  resultTextContainer: { flex: 1, marginLeft: 12 },
  resultName: { fontSize: 15, fontWeight: "500", color: Colors.text },
  resultAddress: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  mapContainer: { flex: 1, position: "relative", minHeight: 250 },
  mapHint: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  mapHintText: { fontSize: 12, color: Colors.textOnPrimary, fontWeight: "500" },
  selectedContainer: { backgroundColor: Colors.surface, padding: 16, borderTopWidth: 1, borderTopColor: "#E0E0E0" },
  selectedInfo: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  selectedTextContainer: { flex: 1, marginLeft: 12 },
  selectedName: { fontSize: 16, fontWeight: "600", color: Colors.text },
  selectedAddress: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  confirmButton: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  confirmButtonText: { fontSize: 16, fontWeight: "bold", color: Colors.textOnPrimary },
});

export default LocationPicker;

/**
 * Navigation Map Component - NATIVE VERSION (iOS/Android)
 * Uses react-native-webview
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/colors";

const NavigationMap = ({
  destination,
  destinationName = "Destination",
  onClose,
  onArrival,
  style,
}) => {
  const webViewRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const locationSubscription = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isNavigating) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isNavigating]);

  useEffect(() => {
    startLocationTracking();
    return () => {
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading || 0,
      });

      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
        (newLocation) => {
          const newPos = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            heading: newLocation.coords.heading || 0,
          };
          setUserLocation(newPos);
          if (webViewRef.current && isNavigating) {
            webViewRef.current.injectJavaScript(`updateUserPosition(${newPos.latitude}, ${newPos.longitude}, ${newPos.heading}); true;`);
          }
          if (destination) {
            const distance = calculateDistance(newPos.latitude, newPos.longitude, destination.latitude, destination.longitude);
            if (distance < 50 && onArrival) onArrival();
          }
        }
      );
      setIsLoading(false);
    } catch (error) {
      console.error("Location error:", error);
      setIsLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return 6371e3 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "routeCalculated") {
        setRouteInfo({ distance: data.distance, duration: data.duration });
        if (data.steps?.length > 0) setCurrentStep(data.steps[0]);
        setIsNavigating(true);
      } else if (data.type === "stepUpdate") {
        setCurrentStep(data.step);
      } else if (data.type === "mapReady") {
        setIsLoading(false);
      }
    } catch (_e) {}
  };

  const recenterMap = () => {
    if (webViewRef.current && userLocation) {
      webViewRef.current.injectJavaScript(`recenterOnUser(); true;`);
    }
  };

  const getTurnIcon = (instruction) => {
    if (!instruction) return "arrow-up";
    const lower = instruction.toLowerCase();
    if (lower.includes("left")) return "arrow-back";
    if (lower.includes("right")) return "arrow-forward";
    if (lower.includes("u-turn")) return "return-down-back";
    if (lower.includes("arrive") || lower.includes("destination")) return "flag";
    if (lower.includes("roundabout")) return "sync";
    return "arrow-up";
  };

  const generateNavigationHTML = () => {
    if (!userLocation || !destination) return "<html><body>Loading...</body></html>";
    const { latitude: userLat, longitude: userLng } = userLocation;
    const { latitude: destLat, longitude: destLng } = destination;

    return `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>*{margin:0;padding:0}html,body,#map{width:100%;height:100%}.leaflet-control-attribution{display:none}.nav-marker{background:transparent!important;border:none!important}</style>
    </head><body><div id="map"></div><script>
      var map = L.map('map',{zoomControl:false}).setView([${userLat},${userLng}],17);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map);
      var userMarker = L.marker([${userLat},${userLng}],{icon:L.divIcon({className:'nav-marker',html:'<div style="width:20px;height:20px;background:#2196F3;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(map);
      L.marker([${destLat},${destLng}],{icon:L.divIcon({className:'nav-marker',html:'<div style="background:#D32F2F;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;"><span style="font-size:14px;">🏫</span></div>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map).bindPopup('${destinationName}');
      window.updateUserPosition=function(lat,lng,h){userMarker.setLatLng([lat,lng]);map.panTo([lat,lng],{animate:true});};
      window.recenterOnUser=function(){map.setView(userMarker.getLatLng(),17,{animate:true});};
      fetch('https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true')
        .then(r=>r.json()).then(data=>{if(data.code==='Ok'&&data.routes.length>0){
          var route=data.routes[0],coords=route.geometry.coordinates.map(c=>[c[1],c[0]]);
          L.polyline(coords,{color:'#4285F4',weight:6,opacity:0.9}).addTo(map);
          map.fitBounds(L.polyline(coords).getBounds(),{padding:[50,50]});
          var steps=route.legs[0].steps.map(s=>({instruction:s.maneuver.instruction||s.name,distance:s.distance}));
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'routeCalculated',distance:(route.distance/1000).toFixed(1),duration:Math.round(route.duration/60),steps:steps}));
        }});
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapReady'}));
    </script></body></html>`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Starting navigation...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
        <View style={styles.navHeaderContent}>
          <Text style={styles.navTitle}>Navigating to</Text>
          <Text style={styles.navDestination}>{destinationName}</Text>
        </View>
        {routeInfo && <View style={styles.navEta}><Text style={styles.etaTime}>{routeInfo.duration}</Text><Text style={styles.etaLabel}>min</Text></View>}
      </View>
      {currentStep && (
        <Animated.View style={[styles.instructionPanel, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.turnIconContainer}><Ionicons name={getTurnIcon(currentStep.instruction)} size={32} color={Colors.textOnPrimary} /></View>
          <View style={styles.instructionContent}>
            <Text style={styles.instructionText} numberOfLines={2}>{currentStep.instruction || "Continue straight"}</Text>
            {currentStep.distance && <Text style={styles.instructionDistance}>{currentStep.distance > 1000 ? `${(currentStep.distance/1000).toFixed(1)} km` : `${Math.round(currentStep.distance)} m`}</Text>}
          </View>
        </Animated.View>
      )}
      <View style={styles.mapContainer}>
        <WebView ref={webViewRef} source={{ html: generateNavigationHTML() }} style={styles.map} onMessage={handleMessage} javaScriptEnabled domStorageEnabled />
        <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}><Ionicons name="locate" size={24} color={Colors.primary} /></TouchableOpacity>
      </View>
      <View style={styles.bottomBar}>
        <View style={styles.osmBadge}><Ionicons name="leaf" size={14} color={Colors.success} /><Text style={styles.osmBadgeText}>OpenStreetMap • Free Navigation</Text></View>
        <View style={styles.bottomInfo}>
          <View style={styles.infoItem}><Ionicons name="time-outline" size={20} color={Colors.primary} /><Text style={styles.infoValue}>{routeInfo?.duration || "--"} min</Text></View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}><Ionicons name="navigate-outline" size={20} color={Colors.primary} /><Text style={styles.infoValue}>{routeInfo?.distance || "--"} km</Text></View>
        </View>
        <TouchableOpacity style={styles.endButton} onPress={onClose}><Text style={styles.endButtonText}>End Navigation</Text></TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: Colors.textLight },
  navHeader: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  closeButton: { padding: 8 },
  navHeaderContent: { flex: 1, marginLeft: 12 },
  navTitle: { fontSize: 12, color: Colors.textLight },
  navDestination: { fontSize: 16, fontWeight: "bold", color: Colors.text },
  navEta: { alignItems: "center", backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  etaTime: { fontSize: 18, fontWeight: "bold", color: Colors.textOnPrimary },
  etaLabel: { fontSize: 10, color: "rgba(255,255,255,0.8)" },
  instructionPanel: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.primary, marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16, elevation: 6 },
  turnIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  instructionContent: { flex: 1, marginLeft: 16 },
  instructionText: { fontSize: 18, fontWeight: "bold", color: Colors.textOnPrimary },
  instructionDistance: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  mapContainer: { flex: 1, position: "relative" },
  map: { flex: 1 },
  recenterButton: { position: "absolute", right: 16, bottom: 16, width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", elevation: 4 },
  bottomBar: { backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#E0E0E0" },
  bottomInfo: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoValue: { fontSize: 16, fontWeight: "bold", color: Colors.text },
  infoDivider: { width: 1, height: 24, backgroundColor: "#E0E0E0", marginHorizontal: 24 },
  endButton: { backgroundColor: Colors.accent, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  endButtonText: { fontSize: 16, fontWeight: "bold", color: Colors.textOnPrimary },
  osmBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, marginBottom: 12, backgroundColor: "rgba(76, 175, 80, 0.1)", borderRadius: 20 },
  osmBadgeText: { fontSize: 12, color: Colors.success, fontWeight: "600" },
});

export default NavigationMap;

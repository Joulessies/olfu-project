/**
 * MapView Component - NATIVE VERSION (iOS/Android)
 * Uses react-native-webview with Leaflet
 */

import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

const MapViewComponent = ({
  center = { latitude: 14.7198, longitude: 121.0449 },
  zoom = 15,
  markers = [],
  circles = [],
  userLocation = null,
  destination = null,
  showRoute = false,
  onMarkerPress = () => { },
  onRouteCalculated = () => { },
  style,
}) => {
  const webViewRef = useRef(null);

  const generateMapHTML = () => {
    const destLat = destination?.latitude || center.latitude;
    const destLng = destination?.longitude || center.longitude;
    const userLat = userLocation?.latitude;
    const userLng = userLocation?.longitude;

    const markersJS = markers
      .map(
        (marker) => {
          // Generate marker icon HTML - show photo if available, otherwise initials/emoji
          const photoUrl = marker.photoUrl || marker.photo_url;
          const initials = marker.title ? marker.title.charAt(0).toUpperCase() : "👤";

          let iconHtml;
          if (photoUrl) {
            // Use profile photo
            iconHtml = `<div style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); overflow: hidden; background-color: ${marker.color || "#FF9800"};"><img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null;this.parentNode.innerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px;\\'>${initials}</div>'"/></div>`;
          } else {
            // Fallback to initials or emoji
            iconHtml = `<div style="background-color: ${marker.color || "#FF9800"}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"><span style="color: white; font-size: 16px; font-weight: bold;">${initials}</span></div>`;
          }

          return `
        L.marker([${marker.latitude}, ${marker.longitude}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '${iconHtml.replace(/'/g, "\\'")}',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          })
        })
        .addTo(map)
        .bindPopup('<b>${marker.title || "Friend"}</b><br>${marker.description || ""}');
      `;
        }
      )
      .join("\n");

    const circlesJS = circles
      .map(
        (circle) => `
        L.circle([${circle.latitude}, ${circle.longitude}], {
          radius: ${circle.radius},
          color: '${circle.strokeColor || "#2E7D32"}',
          fillColor: '${circle.fillColor || "rgba(46, 125, 50, 0.2)"}',
          fillOpacity: 0.3,
          weight: 2
        }).addTo(map);
      `
      )
      .join("\n");

    const routeJS = showRoute && userLocation ? `
      async function calculateRoute() {
        try {
          const response = await fetch(
            'https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true'
          );
          const data = await response.json();
          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            const routeLine = L.polyline(coordinates, {
              color: '#2E7D32', weight: 5, opacity: 0.8, lineCap: 'round', lineJoin: 'round'
            }).addTo(map);
            L.polyline(coordinates, {
              color: '#1B5E20', weight: 3, opacity: 1, dashArray: '10, 20', lineCap: 'round'
            }).addTo(map);
            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
            const distance = (route.distance / 1000).toFixed(1);
            const duration = Math.round(route.duration / 60);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'routeCalculated', distance, duration, steps: route.legs[0].steps.length
              }));
            }
          }
        } catch (error) { console.error('Route calculation error:', error); }
      }
      calculateRoute();
    ` : '';

    const userMarkerJS = userLocation ? `
      L.marker([${userLat}, ${userLng}], {
        icon: L.divIcon({
          className: 'user-marker',
          html: '<div style="position: relative;"><div style="background-color: #2196F3; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div><div style="position: absolute; top: -8px; left: -8px; width: 40px; height: 40px; border-radius: 50%; background: rgba(33, 150, 243, 0.2); animation: pulse 2s infinite;"></div></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })
      }).addTo(map).bindPopup('<b>📍 Your Location</b><br>Start point');
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <meta charset="utf-8">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; }
          #map { width: 100%; height: 100%; }
          .leaflet-control-attribution { font-size: 10px; }
          .custom-marker, .user-marker, .dest-marker { background: transparent !important; border: none !important; }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.3); opacity: 0.4; }
            100% { transform: scale(1); opacity: 0.8; }
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${center.latitude}, ${center.longitude}], ${zoom});
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19, attribution: '© OpenStreetMap | Routing by OSRM'
          }).addTo(map);
          L.marker([${destLat}, ${destLng}], {
            icon: L.divIcon({
              className: 'dest-marker',
              html: '<div style="background-color: #2E7D32; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 4px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.4);"><span style="font-size: 22px;">🏫</span></div>',
              iconSize: [44, 44], iconAnchor: [22, 22],
            })
          }).addTo(map).bindPopup('<b>🎯 OLFU Quezon City</b><br>Hilltop Campus<br><small>Destination</small>');
          ${circlesJS}
          ${userMarkerJS}
          ${markersJS}
          ${routeJS}
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'mapReady'}));
          }
        </script>
      </body>
      </html>
    `;
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "markerPress") onMarkerPress(data);
      else if (data.type === "routeCalculated") onRouteCalculated(data);
    } catch (_e) {
      console.log("Map message:", event.nativeEvent.data);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  webview: { flex: 1, backgroundColor: "transparent" },
});

export default MapViewComponent;

/**
 * App Configuration Constants
 */

// OLFU Quezon City Campus Coordinates
export const OLFU_CAMPUS = {
  latitude: 14.7198,
  longitude: 121.0449,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Geofence radius in meters
export const GEOFENCE_RADIUS = 500;

// SOS Button Configuration
export const SOS_LONG_PRESS_DURATION = 3000; // 3 seconds

// Mock Friend Data (for tracking feature)
export const MOCK_FRIENDS = [
  {
    id: "1",
    name: "Classmate 1",
    latitude: 14.7185,
    longitude: 121.046,
    status: "online",
    lastSeen: "Just now",
  },
  {
    id: "2",
    name: "Classmate 2",
    latitude: 14.721,
    longitude: 121.0435,
    status: "online",
    lastSeen: "2 min ago",
  },
];

// Mock Route Data for Commute Screen
export const MOCK_ROUTES = [
  {
    id: "1",
    name: "Jeepney via Commonwealth",
    vehicleType: "jeepney",
    fare: 15,
    duration: 30,
    distance: "5.2 km",
    description: "Take the Fairview-bound jeepney along Commonwealth Ave.",
    steps: [
      "Walk to Commonwealth Ave.",
      "Ride Fairview jeepney",
      "Alight at OLFU Hilltop",
    ],
  },
  {
    id: "2",
    name: "Bus to SM Fairview",
    vehicleType: "bus",
    fare: 25,
    duration: 45,
    distance: "8.1 km",
    steps: [
      "Walk to bus stop",
      "Take bus to SM Fairview",
      "Transfer to tricycle",
      "Arrive at OLFU",
    ],
  },
  {
    id: "3",
    name: "Tricycle Direct",
    vehicleType: "tricycle",
    fare: 50,
    duration: 10,
    distance: "2.1 km",
    description: "Direct tricycle ride from your location.",
    steps: ["Hail a tricycle", "Direct ride to OLFU Hilltop"],
  },
];

export default {
  OLFU_CAMPUS,
  GEOFENCE_RADIUS,
  SOS_LONG_PRESS_DURATION,
  MOCK_FRIENDS,
  MOCK_ROUTES,
};

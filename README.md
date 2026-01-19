# OLFU-QC Commute Smart App

A localized student safety and navigation app for Our Lady of Fatima University (Quezon City) that combines "Life360-style" tracking with local commute route planning.

## 🎯 Features

### 🏠 Home Dashboard

- Welcome message with user status
- Quick access buttons to all features
- Campus information display
- Recent activity feed
- Emergency SOS button access

### 🚌 Commute Route Planner

- Origin/destination selection
- Multiple route options with different transport modes
- Fare estimates and travel times
- Step-by-step directions
- Vehicle type icons (Jeepney, Bus, Tricycle)

### 🛡️ Safety & Group Tracking

- Real-time map with user location
- Friend location markers
- OLFU campus geofence indicator
- Geofence entry/exit notifications
- Quick SOS access from map

### 🆘 SOS Panic Button

- Large, accessible emergency button
- 3-second long-press activation (prevents accidents)
- Haptic feedback on activation
- Visual countdown indicator
- Morse code SOS vibration pattern

### 📊 Usability Logging (Research)

- Task completion rate tracking
- Time-on-task measurement
- User interaction logging
- Exportable statistics for research

## 🛠️ Tech Stack

- **Framework**: Expo (Managed Workflow)
- **Navigation**: Expo Router (file-based routing)
- **Maps**: react-native-maps
- **Location**: expo-location
- **Backend**: Firebase (Auth, Firestore)
- **Design**: OLFU Branding (Green #2E7D32 / White / Red #D32F2F)

## 📁 Project Structure

```
olfu-project/
├── app/
│   ├── _layout.js          # Root layout with navigation
│   ├── (tabs)/
│   │   ├── _layout.js      # Tab navigation configuration
│   │   ├── index.js        # Home/Dashboard screen
│   │   ├── commute.js      # Route planner screen
│   │   ├── safety.js       # Map & tracking screen
│   │   └── profile.js      # User settings screen
│   └── modal.js            # Modal screen
├── components/
│   └── SOSButton.js        # Emergency SOS component
├── config/
│   └── firebase.js         # Firebase configuration
├── constants/
│   ├── colors.js           # OLFU color palette
│   └── config.js           # App constants & mock data
├── utils/
│   └── usabilityLogger.js  # Research logging utility
├── assets/
│   └── images/             # App icons and images
├── app.json                # Expo configuration
└── package.json            # Dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator, or Expo Go app

### Installation

1. **Clone the repository**

   ```bash
   cd olfu-project
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Firebase** (optional, for full functionality)

   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication and Firestore
   - Copy your config to `config/firebase.js`

4. **Configure Google Maps API** (for Android)

   - Get an API key from [Google Cloud Console](https://console.cloud.google.com)
   - Add it to `app.json` under `android.config.googleMaps.apiKey`

5. **Start the development server**

   ```bash
   npm start
   ```

6. **Run on device/simulator**
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app

## 📱 Screens Overview

### Home Screen

The main dashboard displaying:

- User greeting and status
- Quick action buttons for navigation
- Campus information card
- SOS button
- Recent activity list

### Commute Screen

Route planning interface with:

- Location selector (From/To)
- Sort options (Fastest/Cheapest)
- Route cards showing:
  - Vehicle type with icon
  - Estimated fare in ₱
  - Travel duration
  - Number of steps
- Detailed route modal with step-by-step directions

### Safety Screen

Interactive map featuring:

- User's current location marker
- Friend markers with status callouts
- OLFU campus geofence circle
- Geofence status notification
- Map control buttons
- Nearby friends panel
- Floating SOS button

### Profile Screen

User settings including:

- Profile information
- Safety settings (location sharing, geofence alerts)
- App settings (notifications, theme)
- Research section with usability statistics
- Sign out option

## 🎨 Design System

### Colors

```javascript
Primary:    #2E7D32  // OLFU Green
Secondary:  #FFFFFF  // White
Accent:     #D32F2F  // OLFU Red (alerts/SOS)
```

### Typography

- Headers: Bold, 18-24px
- Body: Regular, 14-16px
- Captions: Light, 11-12px

## 📊 Research Features

### Usability Logging

The app includes built-in usability logging for research purposes:

```javascript
import { logTaskCompletion, startTaskTimer } from "./utils/usabilityLogger";

// Log a task completion
logTaskCompletion("Route_Selection", timeInMs, success, metadata);

// Start a timer for a task
const timer = startTaskTimer("Task_Name");
// ... user performs task ...
timer.stop(true); // Stop and log with success=true
```

### Available Methods

- `logTaskCompletion(taskName, timeTaken, success, metadata)`
- `startTaskTimer(taskName)` - returns timer with `stop()` method
- `logScreenView(screenName)`
- `logInteraction(action, element, details)`
- `getTaskStatistics()` - returns completion rates
- `getAllLogs()` - returns all logged data

## 🔐 Permissions

The app requires the following permissions:

### iOS

- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`

### Android

- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION`
- `VIBRATE`

## 📝 Mock Data

The app uses mock data for development:

### Routes

1. Jeepney via Commonwealth - ₱15, 30 min
2. Bus to SM Fairview - ₱25, 45 min
3. Tricycle Direct - ₱50, 10 min

### Friends

- Classmate 1 - Near OLFU campus
- Classmate 2 - Near OLFU campus

### Campus Location

- OLFU Quezon City: 14.7198°N, 121.0449°E
- Geofence radius: 500 meters

## 🤝 Contributing

This project is part of an academic research study for Our Lady of Fatima University.

## 📄 License

This project is for educational purposes only.

---

Made with ❤️ for OLFU Students

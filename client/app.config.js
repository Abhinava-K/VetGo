try {
  require('dotenv/config');
} catch (e) {}

export default ({ config }) => ({
  ...config,
  name: "VetGo",
  slug: "vetgo-client",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  assetBundlePatterns: [
    "**/*"
  ],
  plugins: [
    [
      "react-native-maps",
      {
        "googleMapsApiKey": process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
      }
    ]
  ],
  ios: {
    supportsTablet: true,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
    }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#ffffff"
    },
    softwareKeyboardLayoutMode: "pan",
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
      }
    }
  },
  androidNavigationBar: {
    visible: "sticky-immersive"
  }
});

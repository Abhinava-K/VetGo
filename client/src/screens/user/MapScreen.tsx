import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';
import FloatingAddPetBtn from '../../components/FloatingAddPetBtn';

export default function MapScreen() {
  const [location, setLocation] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const navigation = useNavigation<any>();
  
  const { theme, isDark } = React.useContext(ThemeContext);

  const [region, setRegion] = useState({
    latitude: 28.6139, // Default coordinates (Delhi)
    longitude: 77.2090,
    latitudeDelta: 0.015,
    longitudeDelta: 0.0121,
  });

  useEffect(() => {
    (async () => {
      // Fetch initial doctors for fallback region immediately
      fetchNearbyDoctors(region.latitude, region.longitude);

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      // Try to get last known position (fast)
      try {
        let lastLoc = await Location.getLastKnownPositionAsync({});
        if (lastLoc) {
          setLocation(lastLoc);
          const newRegion = {
            latitude: lastLoc.coords.latitude,
            longitude: lastLoc.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.0121,
          };
          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
          fetchNearbyDoctors(lastLoc.coords.latitude, lastLoc.coords.longitude);
        }
      } catch (err) {
        console.warn('Error getting last known position:', err);
      }

      // Try to get current position (accurate but might take time)
      try {
        let loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (loc) {
          setLocation(loc);
          const newRegion = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.0121,
          };
          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
          fetchNearbyDoctors(loc.coords.latitude, loc.coords.longitude);
        }
      } catch (err) {
        console.warn('Error getting current position:', err);
      }
    })();
  }, []);

  const fetchNearbyDoctors = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/doctors/nearby?lat=${lat}&lng=${lng}`);
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestHelp = () => {
    const coords = location 
      ? [location.coords.longitude, location.coords.latitude]
      : [region.longitude, region.latitude];

    navigation.navigate('CreateRequest', {
      location: {
        type: 'Point',
        coordinates: coords
      }
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        customMapStyle={isDark ? darkMapStyle : []}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Your Location"
            pinColor={theme.primary}
          />
        )}
        
        {doctors.map((doc) => {
          if (!doc.location || !doc.location.coordinates) return null;
          return (
            <Marker
              key={doc._id}
              coordinate={{
                latitude: doc.location.coordinates[1],
                longitude: doc.location.coordinates[0],
              }}
              title={doc.name?.first ? `${doc.name.first} ${doc.name.last || ''}`.trim() : 'Verified Vet'}
              description={doc.qualifications || 'Nearby Doctor'}
              pinColor={theme.secondary}
            />
          );
        })}
      </MapView>

      {loading && (
        <View style={[styles.loadingOverlay, { top: Math.max(insets.top, 20) }]}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      )}

      {/* Floating Add Pet button always visible */}
      <FloatingAddPetBtn />

      <TouchableOpacity 
        style={[styles.requestBtn, { backgroundColor: theme.primary }]}
        onPress={handleRequestHelp}
      >
        <Text style={styles.requestBtnText}>Request Emergency Doc</Text>
      </TouchableOpacity>
    </View>
  );
}

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  // ... more styles for dark mode maps
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 8,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  requestBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  requestBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

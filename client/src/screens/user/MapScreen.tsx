import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';

let WebView: any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch (e) {}

interface Doctor {
  _id: string;
  name: { first: string; last?: string } | string;
  location: { type: string; coordinates: [number, number] };
  qualifications?: string;
  ratingAvg?: number;
  available?: boolean;
  isEmergency247?: boolean;
  isHomeVisit?: boolean;
  specialities?: string[];
  phone?: string;
  address?: string;
}

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'emergency' | 'home' | 'top'>('all');

  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const navigation = useNavigation<any>();
  const { theme, isDark } = useContext(ThemeContext);

  const [region, setRegion] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.025,
    longitudeDelta: 0.025,
  });

  useEffect(() => {
    initLocationAndDoctors();
  }, []);

  const initLocationAndDoctors = async () => {
    setLoading(true);
    let currentLat = region.latitude;
    let currentLng = region.longitude;

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // Try quick last known location first, fallback to current position
        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc) {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
        if (loc) {
          setLocation(loc);
          currentLat = loc.coords.latitude;
          currentLng = loc.coords.longitude;
          const userRegion = {
            latitude: currentLat,
            longitude: currentLng,
            latitudeDelta: 0.025,
            longitudeDelta: 0.025,
          };
          setRegion(userRegion);
          mapRef.current?.animateToRegion(userRegion, 1000);
        }
      } else {
        setErrorMsg('Location permission denied. Showing default area.');
      }
    } catch (err) {
      console.warn('Error fetching location:', err);
    } finally {
      fetchNearbyDoctors(currentLat, currentLng);
    }
  };

  const fetchNearbyDoctors = async (lat: number, lng: number) => {
    try {
      const { data } = await api.get(`/doctors/nearby?lat=${lat}&lng=${lng}`);
      if (Array.isArray(data) && data.length > 0) {
        setDoctors(data);
      } else {
        setDoctors(generateMockDoctors(lat, lng));
      }
    } catch (error) {
      console.warn('Backend doctors fetch fallback to sample data:', error);
      setDoctors(generateMockDoctors(lat, lng));
    } finally {
      setLoading(false);
    }
  };

  const generateMockDoctors = (lat: number, lng: number): Doctor[] => [
    {
      _id: 'doc-1',
      name: { first: 'Dr. Sarah', last: 'Jenkins' },
      location: { type: 'Point', coordinates: [lng + 0.003, lat + 0.002] },
      qualifications: 'BVSc & AH - Small Animal Specialist',
      ratingAvg: 4.9,
      available: true,
      isEmergency247: true,
      isHomeVisit: true,
      specialities: ['Dogs & Cats', 'Surgeries', 'Vaccinations'],
      address: 'Central Pet Hospital, Main Road',
      phone: '+18005550199',
    },
    {
      _id: 'doc-2',
      name: { first: 'Dr. Rajesh', last: 'Sharma' },
      location: { type: 'Point', coordinates: [lng - 0.004, lat + 0.003] },
      qualifications: 'MVSc Veterinary Surgery',
      ratingAvg: 4.7,
      available: true,
      isEmergency247: true,
      isHomeVisit: false,
      specialities: ['Emergency Trauma', 'Critical Care'],
      address: 'VetCare 24/7 Emergency Clinic',
      phone: '+18005550288',
    },
    {
      _id: 'doc-3',
      name: { first: 'Dr. Emily', last: 'Wong' },
      location: { type: 'Point', coordinates: [lng + 0.004, lat - 0.003] },
      qualifications: 'DVM - Avian & Exotic Pet Expert',
      ratingAvg: 4.8,
      available: true,
      isEmergency247: false,
      isHomeVisit: true,
      specialities: ['Birds', 'Reptiles', 'General Health'],
      address: 'Paws & Claws Wellness Clinic',
      phone: '+18005550377',
    },
    {
      _id: 'doc-4',
      name: { first: 'Dr. Amit', last: 'Patel' },
      location: { type: 'Point', coordinates: [lng - 0.003, lat - 0.002] },
      qualifications: 'Senior Veterinary Clinician',
      ratingAvg: 4.9,
      available: true,
      isEmergency247: true,
      isHomeVisit: true,
      specialities: ['Internal Medicine', 'Cardiology'],
      address: 'City Animal Care Center',
      phone: '+18005550466',
    },
  ];

  useEffect(() => {
    let result = doctors;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => {
        const fullName = typeof d.name === 'string' ? d.name : `${d.name.first} ${d.name.last || ''}`;
        return (
          fullName.toLowerCase().includes(q) ||
          d.qualifications?.toLowerCase().includes(q) ||
          d.specialities?.some((s) => s.toLowerCase().includes(q))
        );
      });
    }

    if (activeFilter === 'emergency') {
      result = result.filter((d) => d.isEmergency247 || d.available);
    } else if (activeFilter === 'home') {
      result = result.filter((d) => d.isHomeVisit);
    } else if (activeFilter === 'top') {
      result = result.filter((d) => (d.ratingAvg || 0) >= 4.5);
    }

    setFilteredDoctors(result);
  }, [doctors, searchQuery, activeFilter]);

  const handleRecenter = () => {
    if (location) {
      const targetRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
      mapRef.current?.animateToRegion(targetRegion, 1000);
    } else {
      initLocationAndDoctors();
    }
  };

  const handleRequestHelp = (doc?: Doctor) => {
    const coords = location
      ? [location.coords.longitude, location.coords.latitude]
      : [region.longitude, region.latitude];

    navigation.navigate('CreateRequest', {
      location: {
        type: 'Point',
        coordinates: coords,
      },
      doctorId: doc?._id || selectedDoctor?._id,
    });
  };

  const getDoctorDisplayName = (doc: Doctor) => {
    if (typeof doc.name === 'string') return doc.name;
    return `${doc.name.first} ${doc.name.last || ''}`.trim();
  };
  const handleMapMessage = (msgData: string) => {
    if (typeof msgData === 'string' && msgData.startsWith('select_doc:')) {
      const docId = msgData.split(':')[1];
      const doc = doctors.find((d) => d._id === docId);
      if (doc) setSelectedDoctor(doc);
    }
  };

  // Web / WebView Map HTML Builder
  const renderWebMapHtml = () => {
    const userLat = location ? location.coords.latitude : region.latitude;
    const userLng = location ? location.coords.longitude : region.longitude;

    const doctorMarkersJS = filteredDoctors
      .map((doc) => {
        if (!doc.location || !doc.location.coordinates) return '';
        const docLat = doc.location.coordinates[1];
        const docLng = doc.location.coordinates[0];
        const isSelected = selectedDoctor?._id === doc._id;
        const name = getDoctorDisplayName(doc);
        const qual = doc.qualifications || 'Veterinary Specialist';
        const color = isSelected ? '#E53935' : '#10B981';
        return `
          L.circleMarker([${docLat}, ${docLng}], {
            radius: ${isSelected ? 13 : 10},
            fillColor: '${color}',
            color: '#ffffff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.95
          }).addTo(map)
          .bindPopup("<div style='min-width:140px'><b>${name.replace(/'/g, "\\'")}</b><br/><span style='font-size:12px;color:#666'>${qual.replace(/'/g, "\\'")}</span><br/><button onclick=\\"selectDoc('${doc._id}')\\" style='margin-top:6px; width:100%; background:#10B981; color:#fff; border:none; padding:5px 10px; border-radius:4px; font-weight:bold; cursor:pointer;'>Select Vet</button></div>");
        `;
      })
      .join('\n');

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: ${isDark ? '#1a1a1a' : '#f3f4f6'}; }
          .user-marker {
            width: 18px;
            height: 18px;
            background: #2563EB;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 0 12px rgba(37, 99, 235, 0.9);
          }
          .leaflet-tile {
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          function selectDoc(id) {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage('select_doc:' + id);
            } else if (window.parent) {
              window.parent.postMessage('select_doc:' + id, '*');
            }
          }

          var map = L.map('map', { zoomControl: false, maxZoom: 20 }).setView([${userLat}, ${userLng}], 15);
          L.tileLayer('${tileUrl}', {
            maxZoom: 20,
            maxNativeZoom: 19,
            detectRetina: true,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          }).addTo(map);

          var userIcon = L.divIcon({ className: 'user-marker', iconSize: [18, 18] });
          L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map).bindPopup("<b>Your Location</b>");

          ${doctorMarkersJS}

          L.control.zoom({ position: 'bottomright' }).addTo(map);
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      {/* Map Renderer: Web vs WebView vs Native MapView */}
      {Platform.OS === 'web' ? (
        <React.Fragment>
          {React.createElement('iframe', {
            srcDoc: renderWebMapHtml(),
            style: { width: '100%', height: '100%', border: 'none' },
            title: 'Interactive Map',
          })}
        </React.Fragment>
      ) : WebView ? (
        <WebView
          originWhitelist={['*']}
          source={{ html: renderWebMapHtml() }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={(event: any) => handleMapMessage(event.nativeEvent.data)}
        />
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          mapType="standard"
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsBuildings={true}
          showsIndoors={true}
          showsPointsOfInterests={true}
          showsCompass={true}
          showsScale={true}
          onPress={() => setSelectedDoctor(null)}
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="Your Location"
              description="Emergency origin point"
              pinColor={theme.primary}
            />
          )}

          {filteredDoctors.map((doc) => {
            if (!doc.location || !doc.location.coordinates) return null;
            const isSelected = selectedDoctor?._id === doc._id;
            return (
              <Marker
                key={doc._id}
                coordinate={{
                  latitude: doc.location.coordinates[1],
                  longitude: doc.location.coordinates[0],
                }}
                title={getDoctorDisplayName(doc)}
                description={doc.qualifications || 'Veterinary Specialist'}
                pinColor={isSelected ? '#E53935' : theme.secondary}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedDoctor(doc);
                }}
              />
            );
          })}
        </MapView>
      )}

      {/* Floating Header & Search Bar */}
      <View style={[styles.headerContainer, { top: Math.max(insets.top + 10, 30) }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search vets, clinics, specialties..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === 'all' ? theme.primary : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setActiveFilter('all')}
          >
            <Ionicons
              name="paw"
              size={14}
              color={activeFilter === 'all' ? '#FFF' : theme.text}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterChipText, { color: activeFilter === 'all' ? '#FFF' : theme.text }]}>
              All Vets ({doctors.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === 'emergency' ? theme.primary : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setActiveFilter('emergency')}
          >
            <Ionicons
              name="flash"
              size={14}
              color={activeFilter === 'emergency' ? '#FFF' : theme.text}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterChipText, { color: activeFilter === 'emergency' ? '#FFF' : theme.text }]}>
              24/7 Emergency
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === 'home' ? theme.primary : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setActiveFilter('home')}
          >
            <Ionicons
              name="home"
              size={14}
              color={activeFilter === 'home' ? '#FFF' : theme.text}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterChipText, { color: activeFilter === 'home' ? '#FFF' : theme.text }]}>
              Home Visit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === 'top' ? theme.primary : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setActiveFilter('top')}
          >
            <Ionicons
              name="star"
              size={14}
              color={activeFilter === 'top' ? '#FFF' : theme.text}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterChipText, { color: activeFilter === 'top' ? '#FFF' : theme.text }]}>
              Top Rated (4.5+)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Floating Buttons: Recenter & Loading */}
      <View style={styles.floatingControls}>
        {loading && (
          <View style={[styles.iconButton, { backgroundColor: theme.surface, marginBottom: 10 }]}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        )}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.surface }]}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Selected Doctor Bottom Card */}
      {selectedDoctor ? (
        <View
          style={[
            styles.doctorCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={styles.closeCardBtn}
            onPress={() => setSelectedDoctor(null)}
          >
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={styles.doctorHeader}>
            <View style={[styles.avatarContainer, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="medkit" size={24} color={theme.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.doctorName, { color: theme.text }]}>
                  {getDoctorDisplayName(selectedDoctor)}
                </Text>
                <Ionicons name="checkmark-circle" size={16} color={theme.primary} style={{ marginLeft: 4 }} />
              </View>
              <Text style={[styles.doctorQuals, { color: theme.textSecondary }]}>
                {selectedDoctor.qualifications || 'Verified Vet Specialist'}
              </Text>
              {selectedDoctor.ratingAvg && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={[styles.ratingText, { color: theme.text }]}>
                    {selectedDoctor.ratingAvg.toFixed(1)}
                  </Text>
                  {selectedDoctor.isEmergency247 && (
                    <View style={styles.badge247}>
                      <Text style={styles.badge247Text}>24/7</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {selectedDoctor.address && (
            <Text style={[styles.doctorAddress, { color: theme.textSecondary }]}>
              📍 {selectedDoctor.address}
            </Text>
          )}

          <View style={styles.cardActions}>
            {selectedDoctor.phone && (
              <TouchableOpacity
                style={[styles.callBtn, { borderColor: theme.primary }]}
                onPress={() => Linking.openURL(`tel:${selectedDoctor.phone}`)}
              >
                <Ionicons name="call" size={18} color={theme.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.requestDocBtn, { backgroundColor: theme.primary }]}
              onPress={() => handleRequestHelp(selectedDoctor)}
            >
              <Text style={styles.requestDocBtnText}>Dispatch Emergency Vet</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Global Emergency Action Bar when no doctor selected */
        <TouchableOpacity
          style={[styles.globalRequestBtn, { backgroundColor: theme.primary }]}
          onPress={() => handleRequestHelp()}
          activeOpacity={0.9}
        >
          <Ionicons name="alert-circle" size={22} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.globalRequestBtnText}>Request Emergency Vet Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  headerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterScrollView: {
    marginTop: 10,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  floatingControls: {
    position: 'absolute',
    right: 16,
    bottom: 160,
    zIndex: 10,
    alignItems: 'center',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  doctorCard: {
    position: 'absolute',
    bottom: 85,
    left: 16,
    right: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 20,
  },
  closeCardBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 4,
    zIndex: 2,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  doctorQuals: {
    fontSize: 12,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  badge247: {
    backgroundColor: '#E53935',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badge247Text: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  doctorAddress: {
    fontSize: 12,
    marginTop: 10,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  requestDocBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestDocBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  globalRequestBtn: {
    position: 'absolute',
    bottom: 85,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 20,
  },
  globalRequestBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

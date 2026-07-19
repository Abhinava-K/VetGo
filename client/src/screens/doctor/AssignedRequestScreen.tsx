import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Linking, 
  Platform,
  Alert 
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ThemeContext } from '../../context/ThemeContext';
import { getSocket } from '../../services/socket';
import api from '../../services/api';

export default function AssignedRequestScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { request } = route.params; // { _id, location, userId: { name, phone } }
  
  const [doctorLocation, setDoctorLocation] = useState<any>(null);
  const [status, setStatus] = useState(request.status);
  const locationSubscription = useRef<any>(null);
  
  const { theme } = useContext(ThemeContext);
  const socket = getSocket();

  useEffect(() => {
    startLocationTracking();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const startLocationTracking = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // Update every 10 meters
      },
      (loc) => {
        setDoctorLocation(loc);
        // Send location to server via socket
        if (socket) {
          socket.emit('doctor:location', {
            requestId: request._id,
            recipientUserId: request.userId._id,
            lat: loc.coords.latitude,
            lng: loc.coords.longitude
          });
        }
      }
    );
  };

  const openNavigation = () => {
    const lat = request.location.coordinates[1];
    const lng = request.location.coordinates[0];
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const label = 'Animal Location';
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) Linking.openURL(url);
  };

  const handleStatusUpdate = async (nextStatus: string) => {
    try {
      const endpoint = nextStatus === 'IN_PROGRESS' ? 'start' : 'complete';
      await api.post(`/requests/${request._id}/${endpoint}`);
      setStatus(nextStatus);
      if (nextStatus === 'COMPLETED') {
        Alert.alert('Done', 'Request marked as completed.');
        navigation.navigate('DoctorHome');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: request.location.coordinates[1],
          longitude: request.location.coordinates[0],
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker 
          coordinate={{
            latitude: request.location.coordinates[1],
            longitude: request.location.coordinates[0]
          }}
          title="Patient Location"
          pinColor={theme.error}
        />
        {doctorLocation && (
          <Marker 
            coordinate={{
              latitude: doctorLocation.coords.latitude,
              longitude: doctorLocation.coords.longitude
            }}
            title="You"
            pinColor={theme.primary}
          />
        )}
      </MapView>

      <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.userName, { color: theme.text }]}>
          Client: {request.userId.name.first}
        </Text>
        <Text style={[styles.phone, { color: theme.primary }]} onPress={() => Linking.openURL(`tel:${request.userPhone}`)}>
          📞 {request.userPhone}
        </Text>
        
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: theme.secondary }]} onPress={openNavigation}>
          <Text style={styles.btnText}>Open in Maps</Text>
        </TouchableOpacity>

        {status === 'ASSIGNED' && (
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: theme.primary }]} 
            onPress={() => handleStatusUpdate('IN_PROGRESS')}
          >
            <Text style={styles.btnText}>Start Service</Text>
          </TouchableOpacity>
        )}

        {status === 'IN_PROGRESS' && (
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginVertical: 10 }}>
            Wait for user to mark as complete or contact support.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  infoCard: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  phone: {
    fontSize: 16,
    marginBottom: 15,
  },
  navBtn: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionBtn: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

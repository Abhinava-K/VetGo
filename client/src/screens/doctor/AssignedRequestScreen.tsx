import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';
import { initSocket } from '../../services/socket';

export default function AssignedRequestScreen() {
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { requestId } = route.params || {};

  const insets = useSafeAreaInsets();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
      setupSocket();
    }
  }, [requestId]);

  const fetchRequestDetails = async () => {
    try {
      const { data } = await api.get(`/requests/${requestId}`);
      setRequest(data);
    } catch (error) {
      console.error('Error fetching request details:', error);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = async () => {
    const socket = await initSocket();
    if (socket) {
      socket.on('request:completed', (data) => {
        if (data.requestId === requestId) {
          Alert.alert('Visit Completed', 'The pet owner has rated your service. Thank you!');
          navigation.navigate('DoctorHome');
        }
      });
    }
  };

  const handleCallUser = () => {
    const phone = request?.userPhone || request?.userId?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('No Phone', 'Phone number is unavailable for this user.');
    }
  };

  const handleOpenNavigation = () => {
    const coords = request?.location?.coordinates; // [lng, lat]
    if (coords && coords.length === 2) {
      const lng = coords[0];
      const lat = coords[1];
      const label = encodeURIComponent('Pet Emergency Location');

      const url = Platform.select({
        ios: `maps:0,0?q=${label}@${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      }) || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Coordinates unavailable for navigation.');
    }
  };

  const handleStartVisit = async () => {
    setStarting(true);
    try {
      await api.post(`/requests/${requestId}/start`);
      Alert.alert('Visit Started', 'You are now tending to the pet emergency.');
      fetchRequestDetails();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to start visit');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerBox, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 12, color: theme.textSecondary }}>Loading emergency assignment...</Text>
      </View>
    );
  }

  const requesterName = request?.userId?.name
    ? `${request.userId.name.first} ${request.userId.name.last}`.trim()
    : 'Pet Owner';

  const userPhone = request?.userPhone || 'Available upon assignment';
  const isStarted = request?.status === 'IN_PROGRESS';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.surface,
            paddingTop: Math.max(insets.top + 10, 40),
            borderBottomColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Active Emergency</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{request?.status || 'ASSIGNED'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Patient Owner Info Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={22} color="#6366F1" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.nameText, { color: theme.text }]}>{requesterName}</Text>
              <Text style={[styles.phoneText, { color: theme.textSecondary }]}>📞 {userPhone}</Text>
            </View>
          </View>

          {/* Direct Call Button */}
          <TouchableOpacity style={styles.callBtn} onPress={handleCallUser}>
            <Ionicons name="call" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.callBtnText}>Call Patient Owner</Text>
          </TouchableOpacity>
        </View>

        {/* Animal & Emergency Condition Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardSectionLabel, { color: theme.textSecondary }]}>
            EMERGENCY DESCRIPTION
          </Text>
          <Text style={[styles.descriptionText, { color: theme.text }]}>
            {request?.description || 'No description provided.'}
          </Text>

          {request?.petId && (
            <View style={styles.petBox}>
              <Ionicons name="paw" size={18} color="#6366F1" />
              <Text style={[styles.petText, { color: theme.text }]}>
                Pet: {request.petId.name || 'Registered Pet'} ({request.petId.species || 'Animal'})
              </Text>
            </View>
          )}
        </View>

        {/* Navigation & Location Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardSectionLabel, { color: theme.textSecondary }]}>LOCATION & NAVIGATION</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={24} color="#EF4444" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.locTitle, { color: theme.text }]}>Patient GPS Location</Text>
              <Text style={[styles.locSub, { color: theme.textSecondary }]}>
                Lat: {request?.location?.coordinates?.[1]?.toFixed(4)}, Lng: {request?.location?.coordinates?.[0]?.toFixed(4)}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.navBtn} onPress={handleOpenNavigation}>
            <Ionicons name="navigate" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.navBtnText}>Open Turn-by-Turn Navigation</Text>
          </TouchableOpacity>
        </View>

        {/* Visit Control Action */}
        {!isStarted ? (
          <TouchableOpacity
            style={styles.startBtn}
            onPress={handleStartVisit}
            disabled={starting}
          >
            {starting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.startBtnText}>Start Emergency Visit</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.inProgressBox}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.inProgressText}>Visit In Progress — Tending to Animal</Text>
            <Text style={styles.inProgressSub}>
              The pet owner will complete and rate the visit once service is finished.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    marginLeft: 10,
  },
  statusBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#6366F1',
    fontWeight: '800',
    fontSize: 11,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 17,
    fontWeight: '800',
  },
  phoneText: {
    fontSize: 13,
    marginTop: 2,
  },
  callBtn: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  petBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  petText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  locSub: {
    fontSize: 12,
    marginTop: 2,
  },
  navBtn: {
    flexDirection: 'row',
    backgroundColor: '#6366F1',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  startBtn: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  inProgressBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  inProgressText: {
    color: '#065F46',
    fontWeight: '800',
    fontSize: 15,
    marginTop: 6,
  },
  inProgressSub: {
    color: '#047857',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

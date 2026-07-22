import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { initSocket } from '../../services/socket';

export default function DoctorHomeScreen() {
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [available, setAvailable] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useContext(ThemeContext);
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    fetchDoctorData();
    setupSocket();
  }, []);

  const fetchDoctorData = async () => {
    try {
      const [profileRes, openReqsRes] = await Promise.allSettled([
        api.get('/doctors/profile'),
        api.get('/requests/open'),
      ]);

      if (profileRes.status === 'fulfilled') {
        setDoctorProfile(profileRes.value.data);
        setAvailable(profileRes.value.data.available);
      }

      if (openReqsRes.status === 'fulfilled') {
        setRequests(openReqsRes.value.data);
      }
    } catch (error) {
      console.error('Error loading doctor data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupSocket = async () => {
    const socket = await initSocket();
    if (socket) {
      socket.on('request:new', (data) => {
        setRequests((prev) => {
          const exists = prev.some((r) => r._id === data.requestId || r.requestId === data.requestId);
          if (exists) return prev;
          return [
            {
              _id: data.requestId,
              description: data.description,
              userName: data.userName,
              location: { coordinates: data.location },
              status: 'OPEN',
            },
            ...prev,
          ];
        });
      });

      socket.on('request:accepted', (data) => {
        setRequests((prev) => prev.filter((r) => r._id !== data.requestId));
      });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDoctorData();
  };

  const toggleAvailability = async (value: boolean) => {
    setAvailable(value);
    try {
      await api.put('/doctors/availability', { available: value });
    } catch (error) {
      setAvailable(!value);
      Alert.alert('Error', 'Failed to update availability status');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { data } = await api.post(`/requests/${requestId}/accept`);
      Alert.alert('Request Accepted', 'Respond immediately to patient location.');
      navigation.navigate('AssignedRequest', { requestId: data._id || requestId });
    } catch (error: any) {
      Alert.alert('Unavailable', error.response?.data?.message || 'Request was accepted by another doctor');
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
    }
  };

  const doctorName = doctorProfile?.user?.name
    ? `Dr. ${doctorProfile.user.name.first} ${doctorProfile.user.name.last}`.trim()
    : 'Doctor Responder';

  const qualification = doctorProfile?.qualifications || 'Veterinary Specialist';
  const ratingAvg = (doctorProfile?.ratingAvg || 5.0).toFixed(1);

  const renderRequestItem = ({ item }: { item: any }) => {
    const requesterName = item.userId
      ? `${item.userId.name?.first || 'Pet'} ${item.userId.name?.last || 'Owner'}`.trim()
      : item.userName || 'Pet Owner';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.emergencyIconCircle}>
            <Ionicons name="warning" size={20} color="#EF4444" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.requesterName, { color: theme.text }]}>{requesterName}</Text>
            <Text style={[styles.distanceText, { color: theme.textSecondary }]}>
              📍 0.2 km away • Immediate Dispatch
            </Text>
          </View>
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>URGENT</Text>
          </View>
        </View>

        <Text style={[styles.description, { color: theme.text }]}>{item.description}</Text>

        <TouchableOpacity
          style={[styles.acceptBtn, { opacity: available ? 1 : 0.6 }]}
          onPress={() => handleAcceptRequest(item._id || item.requestId)}
          disabled={!available}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.acceptBtnText}>Accept & Respond</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Doctor Header */}
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
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.doctorTitle, { color: theme.text }]}>{doctorName}</Text>
            <Text style={[styles.qualText, { color: theme.textSecondary }]}>{qualification}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={[styles.ratingText, { color: '#1F2937' }]}>
              {ratingAvg} ({doctorProfile?.ratingCount || 0})
            </Text>
          </View>

          <View style={styles.availabilityBox}>
            <Text
              style={[
                styles.availText,
                { color: available ? '#10B981' : theme.textSecondary },
              ]}
            >
              {available ? 'ONLINE / ON CALL' : 'OFFLINE'}
            </Text>
            <Switch
              value={available}
              onValueChange={toggleAvailability}
              trackColor={{ false: '#767577', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* Main Incoming Feed */}
      <View style={styles.feedHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Incoming Emergencies ({requests.length})
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 12, color: theme.textSecondary }}>
            Connecting to emergency network...
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id || item.requestId}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={54} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Active Emergencies</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                {!available
                  ? 'Switch your status to ONLINE to receive emergency broadcasts.'
                  : 'Standing by for nearby pet emergency broadcasts.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  doctorTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  qualText: {
    fontSize: 13,
    marginTop: 2,
  },
  logoutBtn: {
    padding: 6,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  availabilityBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availText: {
    fontWeight: '700',
    fontSize: 12,
    marginRight: 10,
    letterSpacing: 0.5,
  },
  feedHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  listContent: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requesterName: {
    fontSize: 16,
    fontWeight: '700',
  },
  distanceText: {
    fontSize: 12,
    marginTop: 2,
  },
  urgentBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  acceptBtn: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});

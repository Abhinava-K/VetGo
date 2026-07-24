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
  Image,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { initSocket } from '../../services/socket';
import ReportModal from '../../components/common/ReportModal';

export default function DoctorHomeScreen() {
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [available, setAvailable] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState<boolean>(false);
  const [selectedReportRequest, setSelectedReportRequest] = useState<any>(null);

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useContext(ThemeContext);
  const { logout } = useContext(AuthContext);

  const isApproved = doctorProfile?.docs && doctorProfile.docs.length > 0 && doctorProfile.docs.every((d: any) => d.status === 'APPROVED');
  const isRejected = doctorProfile?.docs && doctorProfile.docs.some((d: any) => d.status === 'REJECTED');

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
              photoUrl: data.photoUrl,
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

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const baseURL = api.defaults.baseURL?.replace(/\/api\/?$/, '') || 'http://localhost:4000';
    return `${baseURL}/${cleanPath}`;
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

    const photoFullUrl = getImageUrl(item.photoUrl);

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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>URGENT</Text>
            </View>
            <TouchableOpacity
              style={[{ padding: 6, marginLeft: 6 }, item.hasReported && { opacity: 0.5 }]}
              onPress={() => {
                if (!item.hasReported) {
                  setSelectedReportRequest(item);
                  setReportModalVisible(true);
                }
              }}
              disabled={item.hasReported}
            >
              {item.hasReported ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#16A34A', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 4 }}>
                    <Ionicons name="checkmark-sharp" size={13} color="#FFFFFF" />
                  </View>
                  <Ionicons name="flag" size={16} color="#EF4444" />
                </View>
              ) : (
                <Ionicons name="flag-outline" size={18} color="#EF4444" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.description, { color: theme.text }]}>{item.description}</Text>

        {photoFullUrl && (
          <TouchableOpacity
            style={styles.injuryPhotoContainer}
            onPress={() => setSelectedImageModal(photoFullUrl)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: photoFullUrl }}
              style={styles.injuryPhoto}
            />
            <View style={styles.preMedicalOverlay}>
              <Ionicons name="expand-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.preMedicalOverlayText}>Injury Photo (Tap to inspect)</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.acceptBtn, { opacity: available ? 1 : 0.6, marginTop: 12 }]}
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
                { color: (available && isApproved) ? '#10B981' : theme.textSecondary },
              ]}
            >
              {!isApproved ? 'AWAITING VERIFICATION' : available ? 'ONLINE / ON CALL' : 'OFFLINE'}
            </Text>
            <Switch
              value={isApproved ? available : false}
              onValueChange={toggleAvailability}
              disabled={!isApproved}
              trackColor={{ false: '#D1D5DB', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* Feed Title */}
      <View style={styles.feedHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Incoming Emergencies ({requests.length})
        </Text>
      </View>

      {/* Emergency List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 12, color: theme.textSecondary }}>
            Connecting to emergency network...
          </Text>
        </View>
      ) : !isApproved ? (
        <View style={styles.pendingContainer}>
          <Ionicons
            name={isRejected ? 'alert-circle-outline' : 'time-outline'}
            size={64}
            color={isRejected ? '#EF4444' : theme.primary}
          />
          <Text style={[styles.pendingTitle, { color: theme.text }]}>
            {isRejected ? 'Verification Rejected' : 'Account Under Review'}
          </Text>
          <Text style={[styles.pendingSub, { color: theme.textSecondary }]}>
            {isRejected
              ? 'Your medical credentials were rejected. Please re-upload valid documents.'
              : 'An administrator is currently reviewing your medical degree and credentials. You will be activated on the emergency network once verified.'}
          </Text>
          {!isRejected && (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
          )}
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

      {/* Full-Screen Pre-Medical Image Modal */}
      <Modal
        visible={!!selectedImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageModal(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setSelectedImageModal(null)}
          >
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImageModal && (
            <Image
              source={{ uri: selectedImageModal }}
              style={styles.modalFullImage}
              resizeMode="contain"
            />
          )}
          <Text style={styles.modalCaption}>Injury Photo</Text>
        </View>
      </Modal>

      {/* Safety Report Modal for Incoming Broadcast */}
      {selectedReportRequest && (
        <ReportModal
          visible={reportModalVisible}
          onClose={() => {
            setReportModalVisible(false);
            setSelectedReportRequest(null);
          }}
          requestId={selectedReportRequest._id || selectedReportRequest.requestId}
          reportedUserId={selectedReportRequest.userId?._id || selectedReportRequest.userId}
          reporterRole="DOCTOR"
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
    paddingHorizontal: 20,
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
    marginBottom: 12,
  },
  injuryPhotoContainer: {
    position: 'relative',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  injuryPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  preMedicalOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  preMedicalOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  pendingSub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  modalFullImage: {
    width: '90%',
    height: '75%',
  },
  modalCaption: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 15,
  },
});

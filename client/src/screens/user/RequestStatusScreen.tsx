import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import { Request } from '../../types';
import ReportModal from '../../components/common/ReportModal';
import PrescriptionEmbedCard from '../../components/common/PrescriptionEmbedCard';

export default function RequestStatusScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { requestId } = route.params;

  const [request, setRequest] = useState<Request | any>(null);
  const [doctorLoc, setDoctorLoc] = useState<any>(null);
  const [ratingModal, setRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const { theme, isDark } = useContext(ThemeContext);
  const { t } = useTranslation();
  const socket = getSocket();

  useEffect(() => {
    fetchRequestDetails();
    setupSocketListeners();
  }, []);

  const fetchRequestDetails = async () => {
    try {
      const { data } = await api.get(`/requests/${requestId}`);
      setRequest(data);
      if (data.status === 'TREATMENT_COMPLETED') {
        setRatingModal(true);
      }
    } catch (error) {
      console.error('Error fetching request:', error);
    }
  };

  const setupSocketListeners = () => {
    if (socket) {
      socket.on('request:accepted', (data) => {
        setRequest((prev: any) => ({ ...prev, status: 'ASSIGNED', doctor: data }));
      });

      socket.on('doctor:location', (data) => {
        setDoctorLoc({ latitude: data.lat, longitude: data.lng });
      });

      socket.on('request:treatment_completed', (data) => {
        setRequest((prev: any) => ({
          ...prev,
          status: 'TREATMENT_COMPLETED',
          prescriptions: data.prescriptions,
          doctorNotes: data.doctorNotes,
        }));
        setRatingModal(true);
      });

      socket.on('request:completed', () => {
        setRatingModal(true);
      });
    }
  };

  const handleCompleteAndRate = async () => {
    setSubmittingRating(true);
    try {
      await api.post(`/requests/${requestId}/complete`, {
        rating,
        review
      });
      setRatingModal(false);
      Alert.alert(t('success') || 'Thank you', 'Your feedback has been submitted successfully!');
      navigation.navigate('Map');
    } catch (error) {
      Alert.alert(t('error') || 'Error', 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (!request) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Finding your Doctor...</Text>
      </View>
    );
  }

  const isTreatmentCompleted = request.status === 'TREATMENT_COMPLETED';

  return (
    <View style={styles.container}>
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
          title="Your Location"
        />
        {doctorLoc && (
          <Marker
            coordinate={doctorLoc}
            title="Doctor"
            pinColor={theme.secondary}
          />
        )}
      </MapView>

      <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.status, { color: isTreatmentCompleted ? '#10B981' : theme.primary }]}>
          {request.status.replace('_', ' ')}
        </Text>

        {request.status === 'OPEN' ? (
          <Text style={{ color: theme.textSecondary }}>Waiting for a doctor to accept your request...</Text>
        ) : (
          <View>
            <Text style={[styles.docName, { color: theme.text }]}>
              {request.doctor?.doctorName ||
                (request.acceptedBy?.name ? `Dr. ${request.acceptedBy.name.first} ${request.acceptedBy.name.last}` : null) ||
                request.mockDoctor?.name ||
                'Doctor Assigned'}
            </Text>
            <Text style={{ color: theme.textSecondary, marginTop: 2 }}>
              {request.doctor?.qualification || request.mockDoctor?.qualification || 'Veterinary Specialist'}
            </Text>
            
            <TouchableOpacity
              style={[styles.callBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                const phone = request.doctor?.phone || request.doctorPhone || request.mockDoctor?.phone;
                if (phone) {
                  Linking.openURL(`tel:${phone}`);
                } else {
                  Alert.alert('No Contact Number', 'Doctor phone number is unavailable.');
                }
              }}
            >
              <Text style={styles.callBtnText}>📞 Call Doctor</Text>
            </TouchableOpacity>

            {isTreatmentCompleted ? (
              <TouchableOpacity
                style={[styles.completeBtn, { backgroundColor: '#10B981', marginTop: 10 }]}
                onPress={() => setRatingModal(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FontAwesome name="star" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.completeBtnText}>{t('confirm_and_rate_btn')}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              (request.status === 'ASSIGNED' || request.status === 'IN_PROGRESS') && (
                <TouchableOpacity
                  style={[styles.completeBtn, { backgroundColor: theme.secondary, marginTop: 10 }]}
                  onPress={() => setRatingModal(true)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <FontAwesome name="star-o" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.completeBtnText}>Complete & Rate Service</Text>
                  </View>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              style={[styles.reportBtn, { marginTop: 10 }]}
              onPress={() => setReportModalVisible(true)}
            >
              <Text style={styles.reportBtnText}>🚩 Report Doctor / Safety Concern</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Rating & Prescription Confirmation Modal */}
      <Modal visible={ratingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <ScrollView 
              style={{ width: '100%' }}
              contentContainerStyle={{ width: '100%', paddingBottom: 6 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {isTreatmentCompleted ? t('doctor_completed_treatment_title') : 'Rate the Service'}
              </Text>
              
              {isTreatmentCompleted && (
                <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                  {t('doctor_completed_treatment_sub')}
                </Text>
              )}

              {/* Digital Prescription Preview if issued */}
              {(request.prescriptions?.length > 0 || request.doctorNotes) && (
                <PrescriptionEmbedCard 
                  prescriptions={request.prescriptions}
                  doctorNotes={request.doctorNotes}
                />
              )}

              <Text style={[styles.rateLabel, { color: theme.text }]}>
                Rate your experience with Dr.
              </Text>

              {/* Chubby Star Icons */}
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map(s => (
                  <TouchableOpacity 
                    key={s} 
                    onPress={() => setRating(s)}
                    style={styles.starTouchable}
                    activeOpacity={0.7}
                  >
                    <FontAwesome 
                      name={s <= rating ? "star" : "star-o"} 
                      size={38} 
                      color={s <= rating ? "#F59E0B" : (isDark ? "#475569" : "#CBD5E1")} 
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[
                  styles.reviewInput, 
                  { 
                    borderColor: theme.border, 
                    color: theme.text, 
                    backgroundColor: isDark ? '#141e2e' : '#F8FAFC' 
                  }
                ]}
                placeholder="Leave feedback on the doctor's care (optional)"
                placeholderTextColor={theme.textSecondary}
                value={review}
                onChangeText={setReview}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#10B981' }]}
                onPress={handleCompleteAndRate}
                disabled={submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="checkmark-done-circle-outline" size={20} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>{t('confirm_and_rate_btn')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Safety Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        requestId={requestId}
        reportedUserId={request?.acceptedBy?._id || request?.acceptedBy || request?.doctor?.id}
        reporterRole="USER"
        isPostService={request?.status === 'COMPLETED' || request?.status === 'CANCELLED'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  infoCard: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  docName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  callBtn: {
    marginTop: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  callBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 24,
    width: '100%',
    maxHeight: '92%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  rateLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 6,
    textAlign: 'center',
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  starTouchable: {
    padding: 6,
    marginHorizontal: 4,
  },
  reviewInput: {
    width: '100%',
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    textAlignVertical: 'top',
    fontSize: 13,
    lineHeight: 18,
  },
  submitBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  completeBtn: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  reportBtn: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  reportBtnText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 13,
  }
});

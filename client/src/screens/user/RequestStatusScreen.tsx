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
  Alert 
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../../context/ThemeContext';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import { Request } from '../../types';

export default function RequestStatusScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { requestId } = route.params;

  const [request, setRequest] = useState<Request | any>(null);
  const [doctorLoc, setDoctorLoc] = useState<any>(null);
  const [ratingModal, setRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  
  const { theme } = useContext(ThemeContext);
  const socket = getSocket();

  useEffect(() => {
    fetchRequestDetails();
    setupSocketListeners();
  }, []);

  const fetchRequestDetails = async () => {
    try {
      const { data } = await api.get(`/requests/${requestId}`);
      setRequest(data);
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

      socket.on('request:completed', () => {
        setRatingModal(true);
      });
    }
  };

  const handleCompleteAndRate = async () => {
    try {
      await api.post(`/requests/${requestId}/complete`, {
        rating,
        review
      });
      setRatingModal(false);
      Alert.alert('Thank you', 'Your feedback helps us improve!');
      navigation.navigate('Map');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
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
        <Text style={[styles.status, { color: theme.primary }]}>{request.status}</Text>
        
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

            {(request.status === 'ASSIGNED' || request.status === 'IN_PROGRESS') && (
              <TouchableOpacity 
                style={[styles.completeBtn, { backgroundColor: theme.secondary, marginTop: 10 }]}
                onPress={() => setRatingModal(true)}
              >
                <Text style={styles.completeBtnText}>Complete & Rate Service</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <Modal visible={ratingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Rate the Service</Text>
            <View style={styles.stars}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Text style={{ fontSize: 30 }}>{s <= rating ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.reviewInput, { borderColor: theme.border, color: theme.text }]}
              placeholder="Leave a review (optional)"
              placeholderTextColor={theme.textSecondary}
              value={review}
              onChangeText={setReview}
              multiline
            />
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: theme.primary }]}
              onPress={handleCompleteAndRate}
            >
              <Text style={styles.submitBtnText}>Submit & Complete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  stars: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  reviewInput: {
    width: '100%',
    height: 80,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  submitBtn: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  completeBtn: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  }
});

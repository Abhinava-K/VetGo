import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Switch,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';
import { getSocket, initSocket } from '../../services/socket';

export default function DoctorHomeScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    fetchProfile();
    setupSocket();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/doctors/profile'); // Need this endpoint
      setAvailable(data.available);
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = async () => {
    const socket = await initSocket();
    if (socket) {
      socket.on('request:new', (data) => {
        setRequests(prev => [data, ...prev]);
      });
    }
  };

  const toggleAvailability = async (value: boolean) => {
    setAvailable(value);
    try {
      await api.put('/doctors/availability', { available: value });
    } catch (error) {
      setAvailable(!value);
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { data } = await api.post(`/requests/${requestId}/accept`);
      Alert.alert('Accepted', 'Go to the location immediately!');
      navigation.navigate('AssignedRequest', { request: data });
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.message || 'Request no longer available');
      setRequests(prev => prev.filter(r => r.requestId !== requestId));
    }
  };

  const renderRequestItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.userName, { color: theme.text }]}>{item.userName}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
        {item.description}
      </Text>
      <TouchableOpacity 
        style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
        onPress={() => handleAcceptRequest(item.requestId)}
      >
        <Text style={styles.acceptBtnText}>Accept & Respond</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, paddingTop: Math.max(insets.top + 10, 40) }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Doctor Dashboard</Text>
        <View style={styles.availability}>
          <Text style={{ color: theme.textSecondary, marginRight: 10 }}>
            {available ? 'Available' : 'Offline'}
          </Text>
          <Switch value={available} onValueChange={toggleAvailability} />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Incoming Emergencies
      </Text>

      {requests.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: theme.textSecondary }}>Waiting for new requests...</Text>
          {!available && (
            <Text style={{ color: theme.error, marginTop: 10 }}>Go online to receive requests</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.requestId}
          contentContainerStyle={{ padding: 20 }}
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
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: 20,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    marginBottom: 15,
  },
  acceptBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  }
});

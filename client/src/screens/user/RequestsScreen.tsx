import React, { useContext, useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';

export default function RequestsScreen() {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  const fetchRequests = async () => {
    try {
      const { data } = await api.get('/requests/my-requests');
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPress = (request: any) => {
    navigation.navigate('RequestStatus', { requestId: request._id });
  };

  const renderRequestItem = ({ item }: { item: any }) => {
    const isCompleted = item.status === 'COMPLETED';
    const isCancelled = item.status === 'CANCELLED';
    const statusColor = isCompleted 
      ? theme.success 
      : isCancelled 
      ? theme.error 
      : theme.primary;

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => handleRequestPress(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.status, { color: statusColor }]}>{item.status}</Text>
          <Text style={[styles.date, { color: theme.textSecondary }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.description, { color: theme.text }]} numberOfLines={2}>
          {item.description}
        </Text>
        {item.petId && (
          <Text style={[styles.petName, { color: theme.primary }]}>
            Pet: {item.petId.name} ({item.petId.species})
          </Text>
        )}
        {item.acceptedBy && (
          <Text style={[styles.docName, { color: theme.textSecondary }]}>
            Doctor: {item.acceptedBy.name ? `${item.acceptedBy.name.first} ${item.acceptedBy.name.last}` : 'Assigned'}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.background,
        paddingTop: Math.max(insets.top, 20)
      }
    ]}>
      <Text style={[styles.title, { color: theme.text }]}>My Active Requests</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
      ) : requests.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: theme.textSecondary }}>No requests found</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          renderItem={renderRequestItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  status: {
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
  },
  petName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  docName: {
    fontSize: 12,
  }
});

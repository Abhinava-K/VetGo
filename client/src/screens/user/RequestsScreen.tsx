import React, { useContext, useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';
import ReportModal from '../../components/common/ReportModal';

export default function RequestsScreen() {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State for direct card reporting
  const [selectedReportRequest, setSelectedReportRequest] = useState<any | null>(null);

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

    const doctorName = item.acceptedBy?.name
      ? `Dr. ${item.acceptedBy.name.first} ${item.acceptedBy.name.last}`.trim()
      : item.mockDoctor?.name || 'Assigned';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => handleRequestPress(item)}
        activeOpacity={0.88}
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

        <View style={styles.docRow}>
          <Text style={[styles.docName, { color: theme.textSecondary, flex: 1 }]}>
            Doctor: {doctorName}
          </Text>

          {/* Quick Direct Flag Report Button */}
          <TouchableOpacity
            style={[styles.flagBtn, item.hasReported && { opacity: 0.5 }]}
            onPress={() => {
              if (!item.hasReported) {
                setSelectedReportRequest(item);
              }
            }}
            disabled={item.hasReported}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {item.hasReported ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#16A34A', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginRight: 4 }}>
                  <Ionicons name="checkmark-sharp" size={12} color="#FFFFFF" />
                </View>
                <Ionicons name="flag" size={14} color="#EF4444" />
              </View>
            ) : (
              <Ionicons name="flag-outline" size={16} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
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
          contentContainerStyle={{ paddingBottom: 110 }}
        />
      )}

      {/* Quick Card Safety Report Modal */}
      {selectedReportRequest && (
        <ReportModal
          visible={!!selectedReportRequest}
          onClose={() => setSelectedReportRequest(null)}
          requestId={selectedReportRequest._id}
          reportedUserId={selectedReportRequest.acceptedBy?._id || selectedReportRequest.acceptedBy}
          reporterRole="USER"
          isPostService={selectedReportRequest.status === 'COMPLETED' || selectedReportRequest.status === 'CANCELLED'}
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
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  petName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  docName: {
    fontSize: 12,
  },
  flagBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    marginLeft: 8,
  },
});

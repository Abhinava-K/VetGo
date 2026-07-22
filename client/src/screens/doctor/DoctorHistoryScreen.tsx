import React, { useContext, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';

export default function DoctorHistoryScreen() {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCases = async () => {
    try {
      const { data } = await api.get('/requests/my-requests');
      setCases(data);
    } catch (error) {
      console.error('Error fetching doctor cases:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCases();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCases();
  };

  const renderStars = (score: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons 
          key={i} 
          name={i <= score ? 'star' : 'star-outline'} 
          size={14} 
          color="#F59E0B" 
          style={{ marginRight: 2 }}
        />
      );
    }
    return <View style={styles.starContainer}>{stars}</View>;
  };

  const renderCaseItem = ({ item }: { item: any }) => {
    const isCompleted = item.status === 'COMPLETED';
    const isCancelled = item.status === 'CANCELLED';
    const statusColor = isCompleted 
      ? '#10B981' 
      : isCancelled 
      ? '#EF4444' 
      : '#3B82F6';

    const reporterName = item.userId?.name
      ? `${item.userId.name.first} ${item.userId.name.last}`.trim()
      : 'Anonymous Reporter';

    const animalLabel = item.animalCategory === 'STRAY' 
      ? 'Stray / Street Animal' 
      : item.petId?.name 
      ? `Pet: ${item.petId.name} (${item.petId.species})`
      : 'Owned Pet';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {new Date(item.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
        </View>

        {/* Reporter & Animal Category info */}
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Reporter: </Text>
          <Text style={[styles.metaValue, { color: theme.text }]}>{reporterName}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Animal: </Text>
          <Text style={[styles.metaValue, { color: theme.primary, fontWeight: 'bold' }]}>{animalLabel}</Text>
        </View>

        <Text style={[styles.description, { color: theme.text }]} numberOfLines={3}>
          {item.description}
        </Text>

        {/* Treatment/Resolution Notes */}
        {item.resolutionNotes ? (
          <View style={[styles.notesContainer, { backgroundColor: `${theme.primary}0D`, borderColor: theme.border }]}>
            <Text style={[styles.notesTitle, { color: theme.primary }]}>Treatment Notes:</Text>
            <Text style={[styles.notesText, { color: theme.text }]}>{item.resolutionNotes}</Text>
          </View>
        ) : null}

        {/* Review & Rating feedback */}
        {item.rating && item.rating.score ? (
          <View style={[styles.reviewContainer, { borderTopColor: theme.border }]}>
            <View style={styles.reviewHeader}>
              <Text style={[styles.reviewLabel, { color: theme.textSecondary }]}>Feedback rating:</Text>
              {renderStars(item.rating.score)}
            </View>
            {item.rating.review ? (
              <Text style={[styles.reviewText, { color: theme.text }]}>
                "{item.rating.review}"
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.background,
        paddingTop: Math.max(insets.top + 10, 25)
      }
    ]}>
      <Text style={[styles.title, { color: theme.text }]}>Case History Logs</Text>
      
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 12, color: theme.textSecondary }}>Loading history...</Text>
        </View>
      ) : cases.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={54} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Past Rescues</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Completed and closed emergency cases will be archived here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => item._id}
          renderItem={renderCaseItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom + 110, 110) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 0.8,
    justifyContent: 'center',
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
  listContent: {
    paddingVertical: 5,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  notesContainer: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 0.8,
    marginBottom: 10,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  reviewContainer: {
    borderTopWidth: 0.8,
    paddingTop: 10,
    marginTop: 5,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  starContainer: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

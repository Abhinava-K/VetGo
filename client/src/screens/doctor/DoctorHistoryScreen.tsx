import React, { useContext, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  ScrollView,
  Linking,
  Platform
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
  
  // State for detail modal & zoom image modal
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

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

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const baseURL = api.defaults.baseURL?.replace(/\/api\/?$/, '') || 'http://localhost:4000';
    return `${baseURL}/${cleanPath}`;
  };

  const renderStars = (score: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons 
          key={i} 
          name={i <= score ? 'star' : 'star-outline'} 
          size={16} 
          color="#F59E0B" 
          style={{ marginRight: 2 }}
        />
      );
    }
    return <View style={styles.starContainer}>{stars}</View>;
  };

  const handleCasePress = (item: any) => {
    if (item.status === 'ASSIGNED' || item.status === 'IN_PROGRESS' || item.status === 'OPEN') {
      // Navigate to active assigned request page
      navigation.navigate('AssignedRequest', { requestId: item._id });
    } else {
      // Open completed case transcript detail modal
      setSelectedCase(item);
    }
  };

  const handleCallUser = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleOpenMap = (coords?: number[]) => {
    if (coords && coords.length === 2) {
      const lng = coords[0];
      const lat = coords[1];
      const label = encodeURIComponent('Emergency Case Location');
      const url = Platform.select({
        ios: `maps:0,0?q=${label}@${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      }) || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      Linking.openURL(url);
    }
  };

  const renderCaseItem = ({ item }: { item: any }) => {
    const isCompleted = item.status === 'COMPLETED';
    const isCancelled = item.status === 'CANCELLED';
    const isActive = item.status === 'ASSIGNED' || item.status === 'IN_PROGRESS' || item.status === 'OPEN';
    
    const statusColor = isCompleted 
      ? '#10B981' 
      : isCancelled 
      ? '#EF4444' 
      : '#3B82F6';

    const reporterName = item.userId?.name
      ? `${item.userId.name.first} ${item.userId.name.last}`.trim()
      : 'Pet Owner';

    const animalLabel = item.animalCategory === 'STRAY' 
      ? 'Stray / Street Animal' 
      : item.petId?.name 
      ? `Pet: ${item.petId.name} (${item.petId.species})`
      : 'Owned Pet';

    const photoUrl = getImageUrl(item.photoUrl);

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => handleCasePress(item)}
        activeOpacity={0.88}
      >
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

        <Text style={[styles.description, { color: theme.text }]} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Photo Thumbnail if available */}
        {photoUrl && (
          <View style={styles.thumbnailBox}>
            <Image source={{ uri: photoUrl }} style={styles.thumbnailImage} />
            <Text style={[styles.thumbnailLabel, { color: theme.textSecondary }]}>📷 Has Injury Photo</Text>
          </View>
        )}

        {/* Review & Rating feedback summary if completed */}
        {item.rating && item.rating.score ? (
          <View style={[styles.reviewSummary, { borderTopColor: theme.border }]}>
            <Text style={[styles.reviewLabel, { color: theme.textSecondary }]}>Feedback: </Text>
            {renderStars(item.rating.score)}
          </View>
        ) : null}

        <View style={[styles.actionRow, { borderTopColor: theme.border }]}>
          <Text style={[styles.actionText, { color: isActive ? theme.primary : theme.textSecondary }]}>
            {isActive ? '⚡ Active Case (Go to Live View)' : '📄 View Full Case Record & Transcript'}
          </Text>
          <Ionicons 
            name="chevron-forward" 
            size={18} 
            color={isActive ? theme.primary : theme.textSecondary} 
          />
        </View>
      </TouchableOpacity>
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

      {/* Case Record Transcript Modal */}
      <Modal
        visible={!!selectedCase}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCase(null)}
      >
        {selectedCase && (
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Case Record Transcript</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    ID: {selectedCase._id}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedCase(null)} style={styles.modalCloseIcon}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {/* Status & Date */}
                <View style={styles.modalStatusRow}>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: selectedCase.status === 'COMPLETED' ? '#10B9811A' : '#EF44441A' }
                  ]}>
                    <Text style={[
                      styles.statusText, 
                      { color: selectedCase.status === 'COMPLETED' ? '#10B981' : '#EF4444' }
                    ]}>
                      {selectedCase.status}
                    </Text>
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                    Logged on {new Date(selectedCase.createdAt).toLocaleString()}
                  </Text>
                </View>

                {/* Reporter & Contact Info */}
                <View style={[styles.modalSectionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>PATIENT / REPORTER INFORMATION</Text>
                  <View style={styles.reporterRow}>
                    <Ionicons name="person-circle-outline" size={32} color={theme.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.reporterNameText, { color: theme.text }]}>
                        {selectedCase.userId?.name ? `${selectedCase.userId.name.first} ${selectedCase.userId.name.last}` : 'Pet Owner'}
                      </Text>
                      {selectedCase.userPhone ? (
                        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>📞 {selectedCase.userPhone}</Text>
                      ) : (
                        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                          🔒 Contact Info Protected (Post-Service)
                        </Text>
                      )}
                    </View>
                    {selectedCase.userPhone ? (
                      <TouchableOpacity 
                        style={[styles.callBtn, { backgroundColor: theme.primary }]}
                        onPress={() => handleCallUser(selectedCase.userPhone)}
                      >
                        <Ionicons name="call" size={16} color="#FFF" />
                        <Text style={styles.callBtnText}>Call</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* Emergency Description Transcript */}
                <View style={[styles.modalSectionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>EMERGENCY DESCRIPTION</Text>
                  <Text style={[styles.descriptionFullText, { color: theme.text }]}>
                    {selectedCase.description}
                  </Text>

                  {/* Animal Info */}
                  <View style={styles.animalInfoBox}>
                    <Ionicons name="paw" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>
                      {selectedCase.animalCategory === 'STRAY'
                        ? 'Stray / Street Animal'
                        : selectedCase.petId?.name
                        ? `Owned Pet: ${selectedCase.petId.name} (${selectedCase.petId.species})`
                        : 'Owned Pet'}
                    </Text>
                  </View>
                </View>

                {/* GPS Location & Navigation */}
                {selectedCase.location?.coordinates && (
                  <View style={[styles.modalSectionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>BROADCAST GPS LOCATION</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Ionicons name="location-sharp" size={22} color="#EF4444" style={{ marginRight: 6 }} />
                        <Text style={{ color: theme.text, fontSize: 13 }}>
                          Lat: {selectedCase.location.coordinates[1]?.toFixed(4)}, Lng: {selectedCase.location.coordinates[0]?.toFixed(4)}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.mapBtn}
                        onPress={() => handleOpenMap(selectedCase.location.coordinates)}
                      >
                        <Ionicons name="map" size={14} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Map</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Injury Photo */}
                {getImageUrl(selectedCase.photoUrl) && (
                  <View style={[styles.modalSectionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>INJURY PHOTO</Text>
                    <TouchableOpacity 
                      style={styles.modalPhotoContainer}
                      onPress={() => setZoomImage(getImageUrl(selectedCase.photoUrl))}
                      activeOpacity={0.9}
                    >
                      <Image source={{ uri: getImageUrl(selectedCase.photoUrl)! }} style={styles.modalPhoto} />
                      <View style={styles.photoOverlay}>
                        <Ionicons name="expand-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.photoOverlayText}>Injury Photo (Tap to inspect)</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Doctor Resolution / Treatment Notes */}
                {selectedCase.resolutionNotes ? (
                  <View style={[styles.modalSectionCard, { backgroundColor: `${theme.primary}0F`, borderColor: theme.primary }]}>
                    <Text style={[styles.sectionHeading, { color: theme.primary }]}>TREATMENT & RESOLUTION NOTES</Text>
                    <Text style={[styles.descriptionFullText, { color: theme.text }]}>
                      {selectedCase.resolutionNotes}
                    </Text>
                  </View>
                ) : null}

                {/* User Review & Feedback Rating */}
                {selectedCase.rating && selectedCase.rating.score ? (
                  <View style={[styles.modalSectionCard, { backgroundColor: '#FEF3C72A', borderColor: '#F59E0B' }]}>
                    <Text style={[styles.sectionHeading, { color: '#B45309' }]}>USER FEEDBACK & RATING</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                      {renderStars(selectedCase.rating.score)}
                      <Text style={{ marginLeft: 8, fontWeight: 'bold', color: '#B45309', fontSize: 15 }}>
                        {selectedCase.rating.score} / 5
                      </Text>
                    </View>
                    {selectedCase.rating.review ? (
                      <Text style={{ color: theme.text, fontStyle: 'italic', fontSize: 14, lineHeight: 20 }}>
                        "{selectedCase.rating.review}"
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      {/* Full-Screen Zoom Modal */}
      <Modal
        visible={!!zoomImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setZoomImage(null)}
      >
        <View style={styles.zoomOverlay}>
          <TouchableOpacity 
            style={styles.zoomCloseBtn}
            onPress={() => setZoomImage(null)}
          >
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </TouchableOpacity>
          {zoomImage && (
            <Image 
              source={{ uri: zoomImage }} 
              style={styles.zoomFullImage} 
              resizeMode="contain"
            />
          )}
          <Text style={styles.zoomCaption}>Injury Photo</Text>
        </View>
      </Modal>
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
    marginBottom: 16,
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
    elevation: 2,
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
    marginTop: 6,
    marginBottom: 10,
  },
  thumbnailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  thumbnailImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
  },
  thumbnailLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 0.8,
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  starContainer: {
    flexDirection: 'row',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseIcon: {
    padding: 6,
  },
  modalScroll: {
    paddingVertical: 16,
    paddingBottom: 40,
  },
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalSectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  reporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reporterNameText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  callBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  descriptionFullText: {
    fontSize: 15,
    lineHeight: 22,
  },
  animalInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalPhotoContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  modalPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
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
  photoOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  zoomFullImage: {
    width: '90%',
    height: '75%',
  },
  zoomCaption: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 15,
  },
});

import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import SlideButton from '../../components/common/SlideButton';
import TranslatedText from '../../components/common/TranslatedText';

type TabType = 'applications' | 'requests' | 'reports' | 'stats';

interface AdminHomeScreenProps {
  route?: any;
}

export default function AdminHomeScreen({ route }: AdminHomeScreenProps = {}) {
  const getTabFromRouteName = (routeName?: string, initialParamTab?: TabType): TabType => {
    if (initialParamTab) return initialParamTab;
    switch (routeName) {
      case 'AdminRequests':
        return 'requests';
      case 'AdminReports':
        return 'reports';
      case 'AdminMetrics':
        return 'stats';
      case 'AdminVets':
      default:
        return 'applications';
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>(() => getTabFromRouteName(route?.name, route?.params?.initialTab));

  useEffect(() => {
    const currentTab = getTabFromRouteName(route?.name, route?.params?.initialTab);
    if (currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [route?.name, route?.params?.initialTab]);

  const [docSubTab, setDocSubTab] = useState<'pending' | 'verified'>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  // Search & Filter State (Doctors Tab)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'all' | 'above_4_5' | 'above_4' | 'below_3_5' | 'below_2_5' | 'custom' | 'terminated'>('all');
  const [customRatingValue, setCustomRatingValue] = useState('4.0');
  const [customRatingDir, setCustomRatingDir] = useState<'above' | 'below'>('above');
  const [searchLoading, setSearchLoading] = useState(false);

  // Search & Filter State (Emergency Requests Feed Tab)
  const [reqSearchQuery, setReqSearchQuery] = useState('');
  const [reqFilterTag, setReqFilterTag] = useState<'all' | 'stray' | 'pet' | 'rated' | 'completed' | 'active'>('all');

  // Search & Filter State (Safety Reports Tab)
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportFilterTag, setReportFilterTag] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [reportSubTab, setReportSubTab] = useState<'doctor_on_user' | 'user_on_doctor'>('doctor_on_user');

  // Warning Strike Modal State
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [selectedWarnReportId, setSelectedWarnReportId] = useState<string | null>(null);
  const [selectedWarnReportedName, setSelectedWarnReportedName] = useState('');
  const [selectedWarnReporterName, setSelectedWarnReporterName] = useState('');
  const [warnTargetType, setWarnTargetType] = useState<'reported' | 'reporter'>('reported');
  const [warningReason, setWarningReason] = useState('');

  // Termination Modal State
  const [terminationModalVisible, setTerminationModalVisible] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDoctorName, setSelectedDoctorName] = useState('');
  const [terminationReason, setTerminationReason] = useState('');

  // Reviews Modal State
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [doctorReviews, setDoctorReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [selectedDoctorReviewsName, setSelectedDoctorReviewsName] = useState('');

  // Case Transcript Modal State
  const [selectedTranscriptCase, setSelectedTranscriptCase] = useState<any | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const baseURL = api.defaults.baseURL?.replace(/\/api\/?$/, '') || 'http://localhost:4000';
    return `${baseURL}/${cleanPath}`;
  };

  const handleCallUser = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone Number', 'No phone number is available.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenMap = (coords?: number[]) => {
    if (!coords || coords.length < 2) return;
    const [lng, lat] = coords;
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}`,
    }) || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
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
    return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{stars}</View>;
  };

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useContext(ThemeContext);
  const { logout, user } = useContext(AuthContext);

  useEffect(() => {
    loadAdminData();
  }, []);

  // Debounce search query input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchDoctors = async (query: string, filter: string, customVal: string, customDir: string) => {
    setSearchLoading(true);
    try {
      let minRating: number | undefined;
      let maxRating: number | undefined;
      let status: string | undefined;

      if (filter === 'terminated') {
        status = 'terminated';
      } else if (filter === 'above_4_5') {
        minRating = 4.5;
      } else if (filter === 'above_4') {
        minRating = 4.0;
      } else if (filter === 'below_3_5') {
        maxRating = 3.5;
      } else if (filter === 'below_2_5') {
        maxRating = 2.5;
      } else if (filter === 'custom') {
        const val = parseFloat(customVal);
        if (!isNaN(val)) {
          if (customDir === 'above') minRating = val;
          else maxRating = val;
        }
      }

      const params: any = {};
      if (query.trim()) params.q = query.trim();
      if (minRating !== undefined) params.minRating = minRating;
      if (maxRating !== undefined) params.maxRating = maxRating;
      if (status !== undefined) params.status = status;

      if (Object.keys(params).length > 0) {
        const { data } = await api.get('/admin/doctors/search', { params });
        setApplications(data.doctors || []);
      } else {
        const { data } = await api.get('/admin/doctor-applications');
        setApplications(data || []);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchDoctors(debouncedQuery, ratingFilter, customRatingValue, customRatingDir);
    }
  }, [debouncedQuery, ratingFilter, customRatingValue, customRatingDir]);

  const loadAdminData = async () => {
    try {
      const [statsRes, appsRes, reqsRes, repsRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/doctor-applications'),
        api.get('/admin/requests'),
        api.get('/admin/reports'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (appsRes.status === 'fulfilled') setApplications(appsRes.value.data);
      if (reqsRes.status === 'fulfilled') setRequests(reqsRes.value.data);
      if (repsRes.status === 'fulfilled') setReports(repsRes.value.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      await api.put(`/admin/reports/${reportId}/status`, { status });
      Alert.alert('Report Updated', `Report marked as ${status}`);
      loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update report');
    }
  };

  const handleIssueWarningStrike = async () => {
    if (!selectedWarnReportId) return;
    if (!warningReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for issuing this warning strike.');
      return;
    }

    const targetName = warnTargetType === 'reported' ? selectedWarnReportedName : selectedWarnReporterName;

    try {
      await api.post(`/admin/reports/${selectedWarnReportId}/warn`, {
        reason: warningReason.trim(),
        targetType: warnTargetType,
      });
      Alert.alert('Warning Strike Issued', `Warning strike successfully issued to ${targetName}.`);
      setWarningModalVisible(false);
      setWarningReason('');
      loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to issue warning strike');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAdminData();
    if (debouncedQuery || ratingFilter !== 'all') {
      fetchDoctors(debouncedQuery, ratingFilter, customRatingValue, customRatingDir);
    }
  };

  const handleApproveDoctor = async (userId: string, name: string) => {
    try {
      await api.post(`/admin/doctor-applications/${userId}/approve`);
      Alert.alert('Success', `${name} has been approved!`);
      loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleRejectDoctor = async (userId: string, name: string) => {
    Alert.alert(
      'Reject Application',
      `Are you sure you want to reject ${name}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/admin/doctor-applications/${userId}/reject`, {
                reason: 'Documents require further verification',
              });
              Alert.alert('Rejected', `${name}'s application was rejected.`);
              loadAdminData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to reject');
            }
          },
        },
      ]
    );
  };

  const handleTerminateDoctor = async () => {
    if (!selectedDoctorId) return;
    try {
      await api.post(`/admin/doctors/${selectedDoctorId}/terminate`, {
        reason: terminationReason,
      });
      Alert.alert('Terminated', `${selectedDoctorName} has been terminated.`);
      setTerminationModalVisible(false);
      loadAdminData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to terminate account');
    }
  };

  const handleViewDoctorReviews = async (doctorId: string, doctorName: string) => {
    setSelectedDoctorReviewsName(doctorName);
    setReviewsModalVisible(true);
    setReviewsLoading(true);
    setDoctorReviews([]);
    try {
      const { data } = await api.get(`/admin/doctors/${doctorId}/reviews`);
      setDoctorReviews(data);
    } catch (error) {
      console.error('Error fetching doctor reviews:', error);
      Alert.alert('Error', 'Failed to load doctor reviews.');
    } finally {
      setReviewsLoading(false);
    }
  };

  const renderApplicationCard = ({ item }: { item: any }) => {
    const doctorName = item.userId
      ? `${item.userId.name?.first || 'Dr.'} ${item.userId.name?.last || ''}`.trim()
      : 'Doctor Candidate';

    const doctorEmail = item.userId?.email || 'N/A';
    const isApproved = item.isVerified === true;
    const isRejected = item.docs && item.docs.some((d: any) => d.status === 'REJECTED');
    const isPending = !isApproved && !isRejected;

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Ionicons name="medical" size={20} color="#6366F1" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{doctorName}</Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{doctorEmail}</Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isApproved ? '#DEF7EC' : isPending ? '#FEF08A' : '#FDE8E8',
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: isApproved ? '#03543F' : isPending ? '#713F12' : '#9B1C1C',
                },
              ]}
            >
              {isApproved ? 'APPROVED' : isPending ? 'PENDING REVIEW' : 'REJECTED'}
            </Text>
          </View>
        </View>

        {item.qualifications ? (
          <View style={styles.qualSection}>
            <Text style={[styles.qualLabel, { color: theme.textSecondary }]}>Qualifications:</Text>
            <Text style={[styles.qualText, { color: theme.text }]}>{item.qualifications}</Text>
          </View>
        ) : null}

        {item.docs && item.docs.length > 0 && (
          <View style={styles.docsSection}>
            <Text style={[styles.docsLabel, { color: theme.textSecondary }]}>Verification Documents:</Text>
            {item.docs.map((doc: any, index: number) => {
              const fileUrl = `${api.defaults.baseURL?.replace('/api', '')}/uploads/doctorDocs/${doc.filename}`;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.docItem, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => {
                    import('react-native').then(({ Linking }) => {
                      Linking.openURL(fileUrl).catch(() => {
                        Alert.alert('Error', 'Cannot open document URL');
                      });
                    });
                  }}
                >
                  <Ionicons name="document-text-outline" size={18} color={theme.primary} />
                  <Text style={[styles.docNameText, { color: theme.primary }]} numberOfLines={1}>
                    {doc.filename || `Document ${index + 1}`}
                  </Text>
                  <Ionicons name="open-outline" size={14} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!isApproved && item.userId?._id && (
          <View style={styles.actionColumn}>
            <View style={{ marginBottom: 8, marginTop: 14 }}>
              <SlideButton
                title="Slide to Approve Doctor"
                color="#10B981"
                icon="checkmark-circle"
                onSlideComplete={() => handleApproveDoctor(item.userId._id, doctorName)}
              />
            </View>
            <TouchableOpacity
              style={[styles.btn, styles.btnReject, { width: '100%', height: 44 }]}
              onPress={() => handleRejectDoctor(item.userId._id, doctorName)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.btnRejectText}>Reject Application</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderVerifiedDoctorCard = ({ item }: { item: any }) => {
    const doctorName = item.userId
      ? `${item.userId.name?.first || 'Dr.'} ${item.userId.name?.last || ''}`.trim()
      : 'Verified Doctor';

    const doctorEmail = item.userId?.email || 'N/A';
    const isTerminated = item.userId?.isDeleted === true;
    const ratingAvg = item.ratingAvg || 5.0;

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Ionicons name="ribbon-outline" size={20} color="#10B981" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{doctorName}</Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{doctorEmail}</Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isTerminated ? '#FDE8E8' : '#DEF7EC',
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: isTerminated ? '#9B1C1C' : '#03543F',
                },
              ]}
            >
              {isTerminated ? 'TERMINATED' : 'ACTIVE'}
            </Text>
          </View>
        </View>

        {item.qualifications ? (
          <View style={styles.qualSection}>
            <Text style={[styles.qualLabel, { color: theme.textSecondary }]}>Qualifications:</Text>
            <Text style={[styles.qualText, { color: theme.text }]}>{item.qualifications}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.statsDashboard}
          onPress={() => handleViewDoctorReviews(item.userId?._id, doctorName)}
        >
          <View style={styles.statDashboardItem}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={[styles.statDashboardText, { color: theme.textSecondary }]}>
              {' '}{ratingAvg.toFixed(1)} Rating
            </Text>
          </View>
          <View style={styles.statDashboardItem}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6366F1" />
            <Text style={[styles.statDashboardText, { color: '#6366F1', fontWeight: 'bold' }]}>
              {' '}View {item.ratingCount || 0} Reviews
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#6366F1" style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>

        {isTerminated && item.userId?.terminationReason ? (
          <View style={[styles.terminatedReasonSection, { backgroundColor: `${theme.error}10`, borderColor: theme.border }]}>
            <Text style={[styles.terminatedReasonLabel, { color: theme.error }]}>Termination Reason:</Text>
            <Text style={[styles.terminatedReasonText, { color: theme.text }]}>{item.userId.terminationReason}</Text>
          </View>
        ) : null}

        {!isTerminated && item.userId?._id && (
          <View style={[styles.actionColumn, { marginTop: 14 }]}>
            <SlideButton
              title="Slide to Terminate Account"
              color="#EF4444"
              icon="trash-outline"
              onSlideComplete={() => {
                setSelectedDoctorId(item.userId._id);
                setSelectedDoctorName(doctorName);
                setTerminationReason('');
                setTerminationModalVisible(true);
              }}
            />
          </View>
        )}
      </View>
    );
  };

  const renderRequestCard = ({ item }: { item: any }) => {
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

    const doctorName = item.acceptedBy?.name
      ? `Dr. ${item.acceptedBy.name.first} ${item.acceptedBy.name.last}`.trim()
      : item.mockDoctor?.name || 'Unassigned';

    const animalLabel = item.animalCategory === 'STRAY'
      ? 'Stray / Street Animal'
      : item.petId?.name
        ? `Pet: ${item.petId.name} (${item.petId.species})`
        : 'Owned Pet';

    const photoUrl = getImageUrl(item.photoUrl);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => setSelectedTranscriptCase(item)}
        activeOpacity={0.88}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{item.status}</Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            {new Date(item.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
        </View>

        {/* Reporter & Doctor info */}
        <View style={{ flexDirection: 'row', marginBottom: 4, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>Reporter: </Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text }}>
            {reporterName} {item.userId?.email ? `(${item.userId.email})` : ''}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 4, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>Doctor: </Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text }}>
            {doctorName} {item.acceptedBy?.email ? `(${item.acceptedBy.email})` : ''}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>Animal: </Text>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.primary }}>{animalLabel}</Text>
        </View>

        <Text style={[styles.reqDesc, { color: theme.text }]} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Photo Thumbnail if available */}
        {photoUrl && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
            <Image source={{ uri: photoUrl }} style={{ width: 40, height: 40, borderRadius: 8, marginRight: 8 }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>📷 Has Injury Photo</Text>
          </View>
        )}

        {/* Review & Rating feedback summary if completed */}
        {item.rating && item.rating.score ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6, borderTopWidth: 0.8, borderTopColor: theme.border, marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>Feedback: </Text>
            {renderStars(item.rating.score)}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10, marginTop: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary, flex: 1 }}>
            📄 View Full Case Record & Transcript
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return '#3B82F6';
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return '#8B5CF6';
      case 'COMPLETED':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const pendingApps = ratingFilter === 'terminated'
    ? []
    : applications.filter(app => !app.isVerified && !app.userId?.isDeleted);

  const verifiedVets = ratingFilter === 'terminated'
    ? applications.filter(app => app.userId?.isDeleted === true)
    : applications.filter(app => app.isVerified && !app.userId?.isDeleted);

  const filteredRequests = requests.filter((item) => {
    const q = reqSearchQuery.trim().toLowerCase();

    // Filter tag matching
    if (reqFilterTag === 'stray' && item.animalCategory !== 'STRAY') return false;
    if (reqFilterTag === 'pet' && item.animalCategory === 'STRAY') return false;
    if (reqFilterTag === 'rated' && (!item.rating || !item.rating.score)) return false;
    if (reqFilterTag === 'completed' && item.status !== 'COMPLETED') return false;
    if (reqFilterTag === 'active' && !['ASSIGNED', 'IN_PROGRESS', 'OPEN'].includes(item.status)) return false;

    // Search query matching
    if (!q) return true;

    const reporterFirstName = item.userId?.name?.first || '';
    const reporterLastName = item.userId?.name?.last || '';
    const reporterName = `${reporterFirstName} ${reporterLastName}`.trim() || item.userName || '';
    const reporterEmail = item.userId?.email || '';
    const reporterPhone = item.userId?.phone || item.userPhone || '';

    const doctorFirstName = item.acceptedBy?.name?.first || '';
    const doctorLastName = item.acceptedBy?.name?.last || '';
    const doctorName = `${doctorFirstName} ${doctorLastName}`.trim() || item.mockDoctor?.name || '';
    const doctorEmail = item.acceptedBy?.email || '';
    const doctorPhone = item.acceptedBy?.phone || '';

    const animalCategory = item.animalCategory === 'STRAY' ? 'stray street animal' : 'owned pet';
    const petName = item.petId?.name || '';
    const petSpecies = item.petId?.species || '';

    const description = item.description || '';
    const status = item.status || '';
    const ratingScore = item.rating?.score ? `${item.rating.score}` : '';
    const ratingText = item.rating?.score ? `${item.rating.score} star stars` : '';
    const ratingReview = item.rating?.review || '';
    const reqId = item._id || '';

    const searchableString = [
      reporterName,
      reporterEmail,
      reporterPhone,
      doctorName,
      doctorEmail,
      doctorPhone,
      animalCategory,
      petName,
      petSpecies,
      description,
      status,
      ratingScore,
      ratingText,
      ratingReview,
      reqId,
    ].join(' ').toLowerCase();

    return searchableString.includes(q);
  });

  const filteredReports = reports.filter((item) => {
    // 1. Sub-Tab filter: Doctor on User vs User on Doctor
    if (reportSubTab === 'doctor_on_user' && item.reporterRole !== 'DOCTOR') return false;
    if (reportSubTab === 'user_on_doctor' && item.reporterRole !== 'USER') return false;

    // 2. Filter tag matching
    if (reportFilterTag === 'pending' && item.status !== 'PENDING') return false;
    if (reportFilterTag === 'resolved' && item.status !== 'RESOLVED') return false;
    if (reportFilterTag === 'dismissed' && item.status !== 'DISMISSED') return false;

    // 3. Search query matching
    const q = reportSearchQuery.trim().toLowerCase();
    if (!q) return true;

    const reporterFirstName = item.reporterId?.name?.first || '';
    const reporterLastName = item.reporterId?.name?.last || '';
    const reporterName = `${reporterFirstName} ${reporterLastName}`.trim();
    const reporterEmail = item.reporterId?.email || '';
    const reporterRole = item.reporterRole || item.reporterId?.role || '';

    const reportedFirstName = item.reportedId?.name?.first || '';
    const reportedLastName = item.reportedId?.name?.last || '';
    const reportedName = `${reportedFirstName} ${reportedLastName}`.trim();
    const reportedEmail = item.reportedId?.email || '';
    const reportedRole = item.reportedId?.role || '';

    const categoryTag = (item.category || '').replace(/_/g, ' ');
    const description = item.description || '';
    const status = item.status || '';
    const reqId = typeof item.requestId === 'object' ? item.requestId?._id : (item.requestId || '');

    const searchableString = [
      reporterName,
      reporterEmail,
      reporterRole,
      reportedName,
      reportedEmail,
      reportedRole,
      categoryTag,
      description,
      status,
      reqId,
    ].join(' ').toLowerCase();

    return searchableString.includes(q);
  });

  const renderReportCard = ({ item }: { item: any }) => {
    const reporterName = item.reporterId?.name
      ? `${item.reporterId.name.first} ${item.reporterId.name.last}`.trim()
      : 'Unknown User';
    const reporterRole = item.reporterRole || 'USER';

    const reportedName = item.reportedId?.name
      ? `${item.reportedId.name.first} ${item.reportedId.name.last}`.trim()
      : 'Unknown Target';
    const reportedRole = item.reportedId?.role || (reporterRole === 'USER' ? 'DOCTOR' : 'USER');

    const isPending = item.status === 'PENDING';
    const isResolved = item.status === 'RESOLVED';

    const statusBg = isPending ? '#FEF3C7' : isResolved ? '#D1FAE5' : '#F3F4F6';
    const statusText = isPending ? '#D97706' : isResolved ? '#059669' : '#6B7280';

    const formatCategory = (cat: string) => {
      const categoryMap: { [key: string]: string } = {
        SPAM_FAKE_EMERGENCY: 'Fake Emergency / Spam',
        USER_NO_SHOW: 'User No-Show',
        OFFENSIVE_PHOTO: 'Offensive Photo',
        USER_HARASSMENT: 'Abusive / Harassing Behavior',
        RETALIATORY_FEEDBACK: 'Fake 1-Star Review / Unfair Rating',
        DOCTOR_NO_SHOW_LATE: 'Doctor No-Show / Late',
        RUDE_UNPROFESSIONAL: 'Rude / Unprofessional',
        OVERCHARGING: 'Overcharging / Billing Dispute',
        MEDICAL_NEGLIGENCE: 'Medical Negligence',
        UNAUTHORIZED_CONTACT: 'Post-Service Harassment',
        OTHER: 'Other Issue',
      };
      return categoryMap[cat] || cat.replace(/_/g, ' ');
    };

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="flag" size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Safety Report</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusBg }]}>
            <Text style={[styles.badgeText, { color: statusText }]}>{item.status}</Text>
          </View>
        </View>

        {/* Reporter Info */}
        <View style={styles.qualSection}>
          <Text style={[styles.qualLabel, { color: theme.textSecondary }]}>Reporter: </Text>
          <Text style={[styles.qualText, { color: theme.text, fontWeight: 'bold' }]}>
            {reporterName} ({reporterRole}) {item.reporterId?.email ? `• ${item.reporterId.email}` : ''}
          </Text>
        </View>

        {/* Reported Target Info */}
        <View style={styles.qualSection}>
          <Text style={[styles.qualLabel, { color: theme.textSecondary }]}>Reported Target: </Text>
          <Text style={[styles.qualText, { color: '#EF4444', fontWeight: 'bold' }]}>
            {reportedName} ({reportedRole}) {item.reportedId?.email ? `• ${item.reportedId.email}` : ''}
          </Text>
        </View>

        {/* Category Tag */}
        <View style={[styles.terminatedReasonSection, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', marginTop: 8 }]}>
          <Text style={[styles.terminatedReasonLabel, { color: '#DC2626' }]}>ISSUE TAG:</Text>
          <Text style={[styles.terminatedReasonText, { color: '#991B1B', fontWeight: 'bold' }]}>
            {formatCategory(item.category)}
          </Text>
        </View>

        {/* Description */}
        {item.description ? (
          <View style={[styles.qualSection, { marginTop: 8 }]}>
            <Text style={[styles.qualLabel, { color: theme.textSecondary }]}>Description / Details:</Text>
            <Text style={[styles.qualText, { color: theme.text, fontStyle: 'italic' }]}>{item.description}</Text>
          </View>
        ) : null}

        {item.requestId && (
          <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 8 }}>
            Request ID: {item.requestId._id || item.requestId} • Logged {new Date(item.createdAt).toLocaleString()}
          </Text>
        )}

        {/* Action buttons */}
        {isPending && (
          <View style={{ marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#DC2626', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginBottom: 8 }]}
              onPress={() => {
                setSelectedWarnReportId(item._id);
                setSelectedWarnReportedName(reportedName);
                setSelectedWarnReporterName(reporterName);
                setWarnTargetType('reported');
                setWarningReason('');
                setWarningModalVisible(true);
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>⚠️ Issue Warning Strike</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981', flex: 1, marginRight: 4, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }]}
                onPress={() => handleUpdateReportStatus(item._id, 'RESOLVED')}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Mark Resolved</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#6B7280', flex: 1, marginLeft: 4, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }]}
                onPress={() => handleUpdateReportStatus(item._id, 'DISMISSED')}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {item.adminNotes ? (
          <View style={{ backgroundColor: `${theme.primary}10`, borderWidth: 1, borderColor: theme.primary, borderRadius: 8, padding: 8, marginTop: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.primary }}>ADMIN RESOLUTION NOTES:</Text>
            <Text style={{ fontSize: 12, color: theme.text, marginTop: 2 }}>{item.adminNotes}</Text>
          </View>
        ) : null}

        {/* View Full Case Record & Transcript Button */}
        {item.requestId ? (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: `${theme.primary}10`,
              borderColor: theme.primary,
              borderWidth: 1,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              marginTop: 12,
            }}
            onPress={() => {
              const reqObj = typeof item.requestId === 'object' ? item.requestId : { _id: item.requestId };
              setSelectedTranscriptCase(reqObj);
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13, flex: 1 }}>
              📄 View Full Case Record & Transcript
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Bar */}
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
        <View style={styles.headerTitleRow}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#6366F1" />
            <Text style={styles.adminBadgeText}>ADMIN CONTROL</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>System Dashboard</Text>

        {/* Subtitle describing current view */}
        <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4, fontWeight: '600' }}>
          {activeTab === 'applications'
            ? 'Veterinary Control & Verification'
            : activeTab === 'requests'
              ? 'Emergency Requests Feed'
              : activeTab === 'reports'
                ? `Safety Reports ${stats?.pendingReports ? `(${stats.pendingReports} Pending)` : ''}`
                : 'System Metrics & Analytics'}
        </Text>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={{ marginTop: 12, color: theme.textSecondary }}>
            Loading System Dashboard...
          </Text>
        </View>
      ) : activeTab === 'applications' ? (
        <View style={{ flex: 1 }}>
          {/* Sub-tabs segment selector */}
          <View style={[styles.subTabsRow, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <TouchableOpacity
              style={[styles.subTabItem, docSubTab === 'pending' && { borderBottomColor: theme.secondary, borderBottomWidth: 2 }]}
              onPress={() => setDocSubTab('pending')}
            >
              <Text style={[styles.subTabText, { color: docSubTab === 'pending' ? theme.secondary : theme.textSecondary, fontWeight: docSubTab === 'pending' ? 'bold' : 'normal' }]}>
                Pending Reviews ({pendingApps.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabItem, docSubTab === 'verified' && { borderBottomColor: theme.secondary, borderBottomWidth: 2 }]}
              onPress={() => setDocSubTab('verified')}
            >
              <Text style={[styles.subTabText, { color: docSubTab === 'verified' ? theme.secondary : theme.textSecondary, fontWeight: docSubTab === 'verified' ? 'bold' : 'normal' }]}>
                Verified Doctors ({verifiedVets.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar & Rating Filter Chips */}
          <View style={[styles.searchFilterContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Search Input Bar */}
            <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search doctor by name, email, or qualification..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
              {searchLoading && <ActivityIndicator size="small" color="#6366F1" style={{ marginLeft: 6 }} />}
            </View>

            {/* Rating Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              <TouchableOpacity
                style={[styles.chip, ratingFilter === 'all' && styles.chipActive]}
                onPress={() => setRatingFilter('all')}
              >
                <Text style={[styles.chipText, ratingFilter === 'all' && styles.chipTextActive]}>All Ratings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, ratingFilter === 'above_4_5' && styles.chipActive]}
                onPress={() => setRatingFilter('above_4_5')}
              >
                <Ionicons name="star" size={12} color={ratingFilter === 'above_4_5' ? '#FFF' : '#F59E0B'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, ratingFilter === 'above_4_5' && styles.chipTextActive]}>Above ★ 4.5</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, ratingFilter === 'above_4' && styles.chipActive]}
                onPress={() => setRatingFilter('above_4')}
              >
                <Ionicons name="star" size={12} color={ratingFilter === 'above_4' ? '#FFF' : '#F59E0B'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, ratingFilter === 'above_4' && styles.chipTextActive]}>Above ★ 4.0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, ratingFilter === 'below_3_5' && styles.chipActiveBelow]}
                onPress={() => setRatingFilter('below_3_5')}
              >
                <Ionicons name="arrow-down-circle-outline" size={12} color={ratingFilter === 'below_3_5' ? '#FFF' : '#EF4444'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, ratingFilter === 'below_3_5' && styles.chipTextActive]}>Below ★ 3.5</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, ratingFilter === 'below_2_5' && styles.chipActiveBelow]}
                onPress={() => setRatingFilter('below_2_5')}
              >
                <Ionicons name="warning-outline" size={12} color={ratingFilter === 'below_2_5' ? '#FFF' : '#EF4444'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, ratingFilter === 'below_2_5' && styles.chipTextActive]}>Below ★ 2.5</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, ratingFilter === 'custom' && styles.chipActiveCustom]}
                onPress={() => setRatingFilter('custom')}
              >
                <Ionicons name="options-outline" size={12} color={ratingFilter === 'custom' ? '#FFF' : '#8B5CF6'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, ratingFilter === 'custom' && styles.chipTextActive]}>Custom Threshold</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, ratingFilter === 'terminated' && styles.chipActiveTerminated]}
                onPress={() => {
                  setRatingFilter('terminated');
                  setDocSubTab('verified');
                }}
              >
                <Ionicons name="ban-outline" size={12} color={ratingFilter === 'terminated' ? '#FFF' : '#EF4444'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, ratingFilter === 'terminated' && styles.chipTextActive]}>Terminated Accounts</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Dynamic Custom Rating Input Row */}
            {ratingFilter === 'custom' && (
              <View style={[styles.customRatingContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.customRatingLabel, { color: theme.textSecondary }]}>Direction:</Text>
                <View style={styles.dirToggleRow}>
                  <TouchableOpacity
                    style={[styles.dirBtn, customRatingDir === 'above' && styles.dirBtnActiveAbove]}
                    onPress={() => setCustomRatingDir('above')}
                  >
                    <Text style={[styles.dirBtnText, customRatingDir === 'above' && styles.dirBtnTextActive]}>≥ Above</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dirBtn, customRatingDir === 'below' && styles.dirBtnActiveBelow]}
                    onPress={() => setCustomRatingDir('below')}
                  >
                    <Text style={[styles.dirBtnText, customRatingDir === 'below' && styles.dirBtnTextActive]}>≤ Below</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.customRatingLabel, { color: theme.textSecondary, marginLeft: 12 }]}>Rating:</Text>
                <TextInput
                  style={[styles.customRatingInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  keyboardType="numeric"
                  placeholder="e.g. 4.2"
                  placeholderTextColor={theme.textSecondary}
                  value={customRatingValue}
                  onChangeText={setCustomRatingValue}
                  maxLength={4}
                />
              </View>
            )}
          </View>

          {docSubTab === 'pending' ? (
            <FlatList
              data={pendingApps}
              keyExtractor={(item) => item._id}
              renderItem={renderApplicationCard}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-done-circle-outline" size={48} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No pending doctor applications found.
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={verifiedVets}
              keyExtractor={(item) => item._id}
              renderItem={renderVerifiedDoctorCard}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No verified doctors on the network yet.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      ) : activeTab === 'requests' ? (
        <View style={{ flex: 1 }}>
          {/* Search Bar & Filter Chips for Emergency Requests */}
          <View style={[styles.searchFilterContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search user, doctor, email, stray/pet, rating (★)..."
                placeholderTextColor={theme.textSecondary}
                value={reqSearchQuery}
                onChangeText={setReqSearchQuery}
              />
              {reqSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setReqSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              <TouchableOpacity
                style={[styles.chip, reqFilterTag === 'all' && styles.chipActive]}
                onPress={() => setReqFilterTag('all')}
              >
                <Text style={[styles.chipText, reqFilterTag === 'all' && styles.chipTextActive]}>All ({requests.length})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, reqFilterTag === 'stray' && styles.chipActive]}
                onPress={() => setReqFilterTag('stray')}
              >
                <Ionicons name="paw" size={12} color={reqFilterTag === 'stray' ? '#FFF' : theme.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, reqFilterTag === 'stray' && styles.chipTextActive]}>Stray Animals</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, reqFilterTag === 'pet' && styles.chipActive]}
                onPress={() => setReqFilterTag('pet')}
              >
                <Ionicons name="heart" size={12} color={reqFilterTag === 'pet' ? '#FFF' : '#EC4899'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, reqFilterTag === 'pet' && styles.chipTextActive]}>Owned Pets</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, reqFilterTag === 'rated' && styles.chipActive]}
                onPress={() => setReqFilterTag('rated')}
              >
                <Ionicons name="star" size={12} color={reqFilterTag === 'rated' ? '#FFF' : '#F59E0B'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, reqFilterTag === 'rated' && styles.chipTextActive]}>With Rating (★)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, reqFilterTag === 'completed' && styles.chipActive]}
                onPress={() => setReqFilterTag('completed')}
              >
                <Ionicons name="checkmark-circle" size={12} color={reqFilterTag === 'completed' ? '#FFF' : '#10B981'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, reqFilterTag === 'completed' && styles.chipTextActive]}>Completed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, reqFilterTag === 'active' && styles.chipActive]}
                onPress={() => setReqFilterTag('active')}
              >
                <Ionicons name="time" size={12} color={reqFilterTag === 'active' ? '#FFF' : '#3B82F6'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, reqFilterTag === 'active' && styles.chipTextActive]}>Active / Open</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <FlatList
            data={filteredRequests}
            keyExtractor={(item) => item._id}
            renderItem={renderRequestCard}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {reqSearchQuery || reqFilterTag !== 'all'
                    ? 'No emergency requests match your search criteria.'
                    : 'No emergency requests logged yet.'}
                </Text>
              </View>
            }
          />
        </View>
      ) : activeTab === 'reports' ? (
        <View style={{ flex: 1 }}>
          {/* Sub-tabs segment selector for Safety Reports */}
          <View style={[styles.subTabsRow, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
            <TouchableOpacity
              style={[styles.subTabItem, reportSubTab === 'doctor_on_user' && { borderBottomColor: '#EF4444', borderBottomWidth: 2 }]}
              onPress={() => setReportSubTab('doctor_on_user')}
            >
              <Text style={[styles.subTabText, { color: reportSubTab === 'doctor_on_user' ? '#EF4444' : theme.textSecondary, fontWeight: reportSubTab === 'doctor_on_user' ? 'bold' : 'normal' }]}>
                Doctor Reports ({reports.filter((r: any) => r.reporterRole === 'DOCTOR').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subTabItem, reportSubTab === 'user_on_doctor' && { borderBottomColor: '#EF4444', borderBottomWidth: 2 }]}
              onPress={() => setReportSubTab('user_on_doctor')}
            >
              <Text style={[styles.subTabText, { color: reportSubTab === 'user_on_doctor' ? '#EF4444' : theme.textSecondary, fontWeight: reportSubTab === 'user_on_doctor' ? 'bold' : 'normal' }]}>
                User Reports ({reports.filter((r: any) => r.reporterRole === 'USER').length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar & Filter Chips for Safety Reports */}
          <View style={[styles.searchFilterContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search reporter, doctor, email, issue tag..."
                placeholderTextColor={theme.textSecondary}
                value={reportSearchQuery}
                onChangeText={setReportSearchQuery}
              />
              {reportSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setReportSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              <TouchableOpacity
                style={[styles.chip, reportFilterTag === 'all' && styles.chipActive]}
                onPress={() => setReportFilterTag('all')}
              >
                <Text style={[styles.chipText, reportFilterTag === 'all' && styles.chipTextActive]}>All ({reports.length})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, reportFilterTag === 'pending' && styles.chipActiveBelow]}
                onPress={() => setReportFilterTag('pending')}
              >
                <Ionicons name="alert-circle" size={12} color={reportFilterTag === 'pending' ? '#FFF' : '#D97706'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, reportFilterTag === 'pending' && styles.chipTextActive]}>Pending ({reports.filter((r: any) => r.status === 'PENDING').length})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, reportFilterTag === 'resolved' && styles.chipActive]}
                onPress={() => setReportFilterTag('resolved')}
              >
                <Ionicons name="checkmark-done" size={12} color={reportFilterTag === 'resolved' ? '#FFF' : '#10B981'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, reportFilterTag === 'resolved' && styles.chipTextActive]}>Resolved</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, reportFilterTag === 'dismissed' && styles.chipActiveTerminated]}
                onPress={() => setReportFilterTag('dismissed')}
              >
                <Ionicons name="close-circle" size={12} color={reportFilterTag === 'dismissed' ? '#FFF' : '#6B7280'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, reportFilterTag === 'dismissed' && styles.chipTextActive]}>Dismissed</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <FlatList
            data={filteredReports}
            keyExtractor={(item) => item._id}
            renderItem={renderReportCard}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="shield-checkmark-outline" size={48} color="#10B981" />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {reportSearchQuery || reportFilterTag !== 'all'
                    ? 'No safety reports match your search criteria.'
                    : 'No safety reports logged. System clean!'}
                </Text>
              </View>
            }
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.grid}>
            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="people" size={28} color="#3B82F6" />
              <Text style={[styles.statValue, { color: theme.text }]}>{stats?.totalUsers || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pet Owners</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="medical" size={28} color="#10B981" />
              <Text style={[styles.statValue, { color: theme.text }]}>{stats?.totalDoctors || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Verified Doctors</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="alert-circle" size={28} color="#F59E0B" />
              <Text style={[styles.statValue, { color: theme.text }]}>{stats?.pendingDoctors || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending Applications</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="pulse" size={28} color="#8B5CF6" />
              <Text style={[styles.statValue, { color: theme.text }]}>{stats?.totalRequests || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Emergencies</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="flag" size={28} color="#EF4444" />
              <Text style={[styles.statValue, { color: theme.text }]}>{stats?.pendingReports || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending Safety Reports</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="warning" size={28} color="#DC2626" />
              <Text style={[styles.statValue, { color: theme.text }]}>{stats?.totalWarnings || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Warning Strikes Issued</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Warning Strike Reason Input Modal */}
      <Modal
        visible={warningModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setWarningModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Issue Warning Strike</Text>

            <Text style={[styles.modalLabel, { color: theme.textSecondary, marginBottom: 8 }]}>
              Who is at fault and should receive the warning strike?
            </Text>

            {/* Target Selector Toggle Buttons */}
            <View style={{ flexDirection: 'row', marginBottom: 14 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: warnTargetType === 'reported' ? '#DC2626' : theme.border,
                  backgroundColor: warnTargetType === 'reported' ? '#FEE2E2' : theme.background,
                  marginRight: 6,
                  alignItems: 'center',
                }}
                onPress={() => setWarnTargetType('reported')}
              >
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: warnTargetType === 'reported' ? '#DC2626' : theme.text }}>
                  Reported Target
                </Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: warnTargetType === 'reported' ? '#000000' : theme.text, marginTop: 3 }} numberOfLines={1}>
                  {selectedWarnReportedName}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: warnTargetType === 'reporter' ? '#DC2626' : theme.border,
                  backgroundColor: warnTargetType === 'reporter' ? '#FEE2E2' : theme.background,
                  marginLeft: 6,
                  alignItems: 'center',
                }}
                onPress={() => setWarnTargetType('reporter')}
              >
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: warnTargetType === 'reporter' ? '#DC2626' : theme.text }}>
                  Reporter (False Claim)
                </Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: warnTargetType === 'reporter' ? '#000000' : theme.text, marginTop: 3 }} numberOfLines={1}>
                  {selectedWarnReporterName}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: theme.textSecondary, marginBottom: 6 }]}>
              Official reasoning for strike against <Text style={{ fontWeight: 'bold', color: '#DC2626' }}>{warnTargetType === 'reported' ? selectedWarnReportedName : selectedWarnReporterName}</Text>:
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder={warnTargetType === 'reported' ? "e.g. Repeated no-show, abusive behavior, misconduct..." : "e.g. False report submission, retaliatory claim..."}
              placeholderTextColor={theme.textSecondary}
              multiline={true}
              numberOfLines={4}
              value={warningReason}
              onChangeText={setWarningReason}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: theme.border }]}
                onPress={() => setWarningModalVisible(false)}
              >
                <Text style={[styles.modalBtnTextCancel, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit, { backgroundColor: '#DC2626' }]}
                onPress={handleIssueWarningStrike}
              >
                <Text style={styles.modalBtnTextSubmit}>Issue Strike</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Termination Reason Input Modal */}
      <Modal
        visible={terminationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTerminationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Terminate {selectedDoctorName}</Text>

            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>
              Provide an optional reason for terminating this doctor. The reason will be displayed on their screen on login:
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. Repeated negative user reviews, malpractice, etc."
              placeholderTextColor={theme.textSecondary}
              multiline={true}
              numberOfLines={4}
              value={terminationReason}
              onChangeText={setTerminationReason}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: theme.border }]}
                onPress={() => setTerminationModalVisible(false)}
              >
                <Text style={[styles.modalBtnTextCancel, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit, { backgroundColor: '#EF4444' }]}
                onPress={handleTerminateDoctor}
              >
                <Text style={styles.modalBtnTextSubmit}>Terminate User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Doctor Reviews Modal */}
      <Modal
        visible={reviewsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReviewsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: '80%' }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Reviews: {selectedDoctorReviewsName}</Text>

            {reviewsLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ marginTop: 10, color: theme.textSecondary }}>Fetching reviews...</Text>
              </View>
            ) : doctorReviews.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons name="chatbubble-outline" size={40} color={theme.textSecondary} />
                <Text style={{ marginTop: 10, color: theme.textSecondary, textAlign: 'center' }}>
                  No reviews submitted for this doctor yet.
                </Text>
              </View>
            ) : (
              <FlatList
                data={doctorReviews}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingVertical: 10 }}
                renderItem={({ item }) => (
                  <View style={[styles.modalReviewCard, { borderColor: theme.border }]}>
                    <View style={styles.modalReviewHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= item.score ? 'star' : 'star-outline'}
                            size={14}
                            color="#F59E0B"
                            style={{ marginRight: 2 }}
                          />
                        ))}
                      </View>
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={[styles.modalReviewUser, { color: theme.text }]}>
                      By: {item.userName}
                    </Text>
                    {item.review ? (
                      <Text style={[styles.modalReviewComment, { color: theme.textSecondary }]}>
                        "{item.review}"
                      </Text>
                    ) : null}
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              style={[styles.modalBtnClose, { backgroundColor: theme.primary }]}
              onPress={() => setReviewsModalVisible(false)}
            >
              <Text style={styles.modalBtnTextSubmit}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Case Record Transcript Modal */}
      <Modal
        visible={!!selectedTranscriptCase}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTranscriptCase(null)}
      >
        {selectedTranscriptCase && (
          <View style={styles.tsBackdrop}>
            <View style={[styles.tsContent, { backgroundColor: theme.surface }]}>
              {/* Modal Header */}
              <View style={[styles.tsHeader, { borderBottomColor: theme.border }]}>
                <View>
                  <Text style={[styles.tsTitle, { color: theme.text }]}>Case Record Transcript</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    ID: {selectedTranscriptCase._id}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedTranscriptCase(null)} style={styles.tsCloseIcon}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tsScroll}>
                {/* Status & Date */}
                <View style={styles.tsStatusRow}>
                  <View style={[
                    styles.tsStatusBadge,
                    { backgroundColor: selectedTranscriptCase.status === 'COMPLETED' ? '#10B9811A' : '#EF44441A' }
                  ]}>
                    <Text style={[
                      styles.tsStatusText,
                      { color: selectedTranscriptCase.status === 'COMPLETED' ? '#10B981' : '#EF4444' }
                    ]}>
                      {selectedTranscriptCase.status}
                    </Text>
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                    Logged on {new Date(selectedTranscriptCase.createdAt || Date.now()).toLocaleString()}
                  </Text>
                </View>

                {/* Patient / Pet Owner Info Card */}
                <View style={[styles.tsSectionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.tsSectionHeading, { color: theme.textSecondary }]}>PET OWNER / REPORTER INFORMATION</Text>
                  <View style={styles.tsReporterRow}>
                    <Ionicons name="person-circle-outline" size={32} color={theme.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.tsReporterName, { color: theme.text }]}>
                        {selectedTranscriptCase.userId?.name
                          ? `${selectedTranscriptCase.userId.name.first} ${selectedTranscriptCase.userId.name.last}`.trim()
                          : selectedTranscriptCase.userName || 'Pet Owner'}
                      </Text>
                      {selectedTranscriptCase.userId?.email && (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          ✉️ {selectedTranscriptCase.userId.email}
                        </Text>
                      )}
                      {(selectedTranscriptCase.userId?.phone || selectedTranscriptCase.userPhone) && (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          📞 {selectedTranscriptCase.userId?.phone || selectedTranscriptCase.userPhone}
                        </Text>
                      )}
                    </View>
                    {(selectedTranscriptCase.userId?.phone || selectedTranscriptCase.userPhone) && (
                      <TouchableOpacity
                        style={[styles.tsCallBtn, { backgroundColor: theme.primary }]}
                        onPress={() => handleCallUser(selectedTranscriptCase.userId?.phone || selectedTranscriptCase.userPhone)}
                      >
                        <Ionicons name="call" size={14} color="#FFF" />
                        <Text style={styles.tsCallBtnText}>Call</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Assigned Doctor Info Card */}
                <View style={[styles.tsSectionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.tsSectionHeading, { color: theme.textSecondary }]}>ASSIGNED VETERINARIAN</Text>
                  <View style={styles.tsReporterRow}>
                    <Ionicons name="medical-outline" size={32} color="#10B981" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.tsReporterName, { color: theme.text }]}>
                        {selectedTranscriptCase.acceptedBy?.name
                          ? `Dr. ${selectedTranscriptCase.acceptedBy.name.first} ${selectedTranscriptCase.acceptedBy.name.last}`.trim()
                          : selectedTranscriptCase.mockDoctor?.name || 'Unassigned / Open'}
                      </Text>
                      {selectedTranscriptCase.acceptedBy?.email && (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          ✉️ {selectedTranscriptCase.acceptedBy.email}
                        </Text>
                      )}
                      {selectedTranscriptCase.acceptedBy?.phone && (
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          📞 {selectedTranscriptCase.acceptedBy.phone}
                        </Text>
                      )}
                    </View>
                    {selectedTranscriptCase.acceptedBy?.phone && (
                      <TouchableOpacity
                        style={[styles.tsCallBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => handleCallUser(selectedTranscriptCase.acceptedBy.phone)}
                      >
                        <Ionicons name="call" size={14} color="#FFF" />
                        <Text style={styles.tsCallBtnText}>Call Doctor</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Emergency Description */}
                <View style={[styles.tsSectionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.tsSectionHeading, { color: theme.textSecondary }]}>EMERGENCY DESCRIPTION</Text>
                  <TranslatedText 
                    text={selectedTranscriptCase.description || 'No description provided.'} 
                    style={[styles.tsDescText, { color: theme.text }]} 
                  />

                  {/* Animal Info */}
                  <View style={styles.tsAnimalBox}>
                    <Ionicons name="paw" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>
                      {selectedTranscriptCase.animalCategory === 'STRAY'
                        ? 'Stray / Street Animal'
                        : selectedTranscriptCase.petId?.name
                          ? `Owned Pet: ${selectedTranscriptCase.petId.name} (${selectedTranscriptCase.petId.species})`
                          : 'Owned Pet'}
                    </Text>
                  </View>
                </View>

                {/* GPS Location & Map Button */}
                {selectedTranscriptCase.location?.coordinates && (
                  <View style={[styles.tsSectionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.tsSectionHeading, { color: theme.textSecondary }]}>BROADCAST GPS LOCATION</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Ionicons name="location-sharp" size={22} color="#EF4444" style={{ marginRight: 6 }} />
                        <Text style={{ color: theme.text, fontSize: 13 }}>
                          Lat: {selectedTranscriptCase.location.coordinates[1]?.toFixed(4)}, Lng: {selectedTranscriptCase.location.coordinates[0]?.toFixed(4)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.tsMapBtn}
                        onPress={() => handleOpenMap(selectedTranscriptCase.location.coordinates)}
                      >
                        <Ionicons name="map" size={14} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Map</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Injury Photo */}
                {getImageUrl(selectedTranscriptCase.photoUrl) && (
                  <View style={[styles.tsSectionCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.tsSectionHeading, { color: theme.textSecondary }]}>INJURY PHOTO</Text>
                    <TouchableOpacity
                      style={styles.tsPhotoContainer}
                      onPress={() => setZoomImage(getImageUrl(selectedTranscriptCase.photoUrl))}
                      activeOpacity={0.9}
                    >
                      <Image source={{ uri: getImageUrl(selectedTranscriptCase.photoUrl)! }} style={styles.tsPhoto} />
                      <View style={styles.tsPhotoOverlay}>
                        <Ionicons name="expand-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.tsPhotoOverlayText}>Injury Photo (Tap to inspect)</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Doctor Resolution / Treatment Notes */}
                {selectedTranscriptCase.resolutionNotes ? (
                  <View style={[styles.tsSectionCard, { backgroundColor: `${theme.primary}0F`, borderColor: theme.primary }]}>
                    <Text style={[styles.tsSectionHeading, { color: theme.primary }]}>TREATMENT & RESOLUTION NOTES</Text>
                    <TranslatedText 
                      text={selectedTranscriptCase.resolutionNotes} 
                      style={[styles.tsDescText, { color: theme.text }]} 
                    />
                  </View>
                ) : null}

                {/* User Rating & Feedback */}
                {selectedTranscriptCase.rating && selectedTranscriptCase.rating.score ? (
                  <View style={[styles.tsSectionCard, { backgroundColor: '#FEF3C72A', borderColor: '#F59E0B' }]}>
                    <Text style={[styles.tsSectionHeading, { color: '#B45309' }]}>USER FEEDBACK & RATING</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                      {renderStars(selectedTranscriptCase.rating.score)}
                      <Text style={{ marginLeft: 8, fontWeight: 'bold', color: '#B45309', fontSize: 15 }}>
                        {selectedTranscriptCase.rating.score} / 5
                      </Text>
                    </View>
                    {selectedTranscriptCase.rating.review ? (
                      <Text style={{ color: theme.text, fontStyle: 'italic', fontSize: 14, lineHeight: 20 }}>
                        "{selectedTranscriptCase.rating.review}"
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}
            onPress={() => setZoomImage(null)}
          >
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </TouchableOpacity>
          {zoomImage && (
            <Image
              source={{ uri: zoomImage }}
              style={{ width: '92%', height: '75%' }}
              resizeMode="contain"
            />
          )}
          <Text style={{ color: '#FFF', fontSize: 14, marginTop: 14, fontWeight: '600' }}>Injury Photo</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  adminBadgeText: {
    color: '#6366F1',
    fontWeight: '700',
    fontSize: 11,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  logoutBtn: {
    padding: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  tabItem: {
    marginRight: 20,
    paddingBottom: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
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
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  qualSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  qualLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  qualText: {
    fontSize: 13,
    marginTop: 4,
  },
  docsSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  docsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  docNameText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    flex: 0.9,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 14,
    justifyContent: 'space-between',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    flex: 0.48,
  },
  btnReject: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnRejectText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  btnApprove: {
    backgroundColor: '#6366F1',
  },
  btnApproveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  reqDesc: {
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
  reqFooter: {
    marginTop: 10,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  subTabsRow: {
    flexDirection: 'row',
    height: 48,
    borderBottomWidth: 1,
  },
  subTabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsDashboard: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statDashboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statDashboardText: {
    fontSize: 12,
    fontWeight: '600',
  },
  terminatedReasonSection: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  terminatedReasonLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  terminatedReasonText: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionColumn: {
    marginTop: 10,
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalInput: {
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0.48,
  },
  modalBtnCancel: {
    borderWidth: 1,
  },
  modalBtnSubmit: {
    // handled inline
  },
  modalBtnTextCancel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalBtnTextSubmit: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalBtnClose: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
  },
  modalReviewCard: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  modalReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalReviewUser: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalReviewComment: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  searchFilterContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  chipActiveBelow: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  chipActiveCustom: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  chipActiveTerminated: {
    backgroundColor: '#991B1B',
    borderColor: '#991B1B',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  customRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  customRatingLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  dirToggleRow: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dirBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  dirBtnActiveAbove: {
    backgroundColor: '#6366F1',
  },
  dirBtnActiveBelow: {
    backgroundColor: '#EF4444',
  },
  dirBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  dirBtnTextActive: {
    color: '#FFFFFF',
  },
  customRatingInput: {
    width: 60,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: 6,
  },
  actionBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  tsContent: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  tsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tsCloseIcon: {
    padding: 6,
  },
  tsScroll: {
    paddingVertical: 16,
    paddingBottom: 40,
  },
  tsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tsStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tsStatusText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  tsSectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  tsSectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tsReporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tsReporterName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tsCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tsCallBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  tsDescText: {
    fontSize: 15,
    lineHeight: 22,
  },
  tsAnimalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  tsMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tsPhotoContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  tsPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tsPhotoOverlay: {
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
  tsPhotoOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

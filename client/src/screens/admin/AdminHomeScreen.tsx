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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import SlideButton from '../../components/common/SlideButton';

type TabType = 'applications' | 'requests' | 'stats';

export default function AdminHomeScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('applications');
  const [docSubTab, setDocSubTab] = useState<'pending' | 'verified'>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'all' | 'above_4_5' | 'above_4' | 'below_3_5' | 'below_2_5' | 'custom' | 'terminated'>('all');
  const [customRatingValue, setCustomRatingValue] = useState('4.0');
  const [customRatingDir, setCustomRatingDir] = useState<'above' | 'below'>('above');
  const [searchLoading, setSearchLoading] = useState(false);

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
      const [statsRes, appsRes, reqsRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/doctor-applications'),
        api.get('/admin/requests'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (appsRes.status === 'fulfilled') setApplications(appsRes.value.data);
      if (reqsRes.status === 'fulfilled') setRequests(reqsRes.value.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    const userName = item.userId
      ? `${item.userId.name?.first || 'User'} ${item.userId.name?.last || ''}`.trim()
      : 'Pet Owner';

    const doctorName = item.acceptedBy
      ? `${item.acceptedBy.name?.first || ''} ${item.acceptedBy.name?.last || ''}`.trim()
      : item.mockDoctor?.name || 'Unassigned';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="warning-outline" size={22} color="#F59E0B" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{userName}</Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
              Status: {item.status}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusBadgeText}>{item.status}</Text>
          </View>
        </View>

        <Text style={[styles.reqDesc, { color: theme.text }]} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.reqFooter}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Doctor: <Text style={{ color: theme.text, fontWeight: '600' }}>{doctorName}</Text>
          </Text>
        </View>
      </View>
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

        {/* Tab Navigation */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'applications' && styles.tabActive]}
            onPress={() => setActiveTab('applications')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'applications' ? '#6366F1' : theme.textSecondary },
              ]}
            >
              Vets Control
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'requests' && styles.tabActive]}
            onPress={() => setActiveTab('requests')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'requests' ? '#6366F1' : theme.textSecondary },
              ]}
            >
              Emergency Feed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'stats' && styles.tabActive]}
            onPress={() => setActiveTab('stats')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'stats' ? '#6366F1' : theme.textSecondary },
              ]}
            >
              Metrics
            </Text>
          </TouchableOpacity>
        </View>
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
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          renderItem={renderRequestCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No emergency requests logged yet.
              </Text>
            </View>
          }
        />
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
          </View>
        </ScrollView>
      )}

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
});

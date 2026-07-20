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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

type TabType = 'applications' | 'requests' | 'stats';

export default function AdminHomeScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('applications');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [stats, setStats] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useContext(ThemeContext);
  const { logout, user } = useContext(AuthContext);

  useEffect(() => {
    loadAdminData();
  }, []);

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
  };

  const handleApproveDoctor = async (userId: string, name: string) => {
    Alert.alert(
      'Approve Doctor',
      `Are you sure you want to approve ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              await api.post(`/admin/doctor-applications/${userId}/approve`);
              Alert.alert('Success', `${name} has been approved!`);
              loadAdminData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to approve');
            }
          },
        },
      ]
    );
  };

  const handleRejectDoctor = async (userId: string, name: string) => {
    Alert.alert(
      'Reject Application',
      `Reject ${name}'s application?`,
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

  const renderApplicationCard = ({ item }: { item: any }) => {
    const doctorName = item.userId
      ? `${item.userId.name?.first || 'Dr.'} ${item.userId.name?.last || ''}`.trim()
      : 'Doctor Candidate';

    const doctorEmail = item.userId?.email || 'N/A';
    const isPending = item.docs && item.docs.some((d: any) => d.status === 'PENDING');
    const isApproved = item.docs && item.docs.every((d: any) => d.status === 'APPROVED');

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

        {isPending && item.userId?._id && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnReject]}
              onPress={() => handleRejectDoctor(item.userId._id, doctorName)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.btnRejectText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnApprove]}
              onPress={() => handleApproveDoctor(item.userId._id, doctorName)}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.btnApproveText}>Approve Doctor</Text>
            </TouchableOpacity>
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
              Doctor Applications ({applications.length})
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
              Emergency Feed ({requests.length})
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
        <FlatList
          data={applications}
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
});

import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

export default function ProfileScreen() {
  const { theme, isDark, toggleTheme } = useContext(ThemeContext);
  const { logout } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<any>(null);
  const [petCount, setPetCount] = useState<number>(0);
  const [requestCount, setRequestCount] = useState<number>(0);
  const [docProfile, setDocProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // 1. Fetch main user profile
      const profileRes = await api.get('/auth/me');
      const userObj = profileRes.data;
      setProfile(userObj);

      // 2. Fetch role-specific details
      if (userObj.role === 'DOCTOR') {
        const docRes = await api.get('/doctors/profile');
        setDocProfile(docRes.data);
      }

      // 3. Fetch count of pets
      const petsRes = await api.get('/pets');
      setPetCount(petsRes.data.length);

      // 4. Fetch requests count
      const reqsRes = await api.get('/requests/my-requests');
      setRequestCount(reqsRes.data.length);

    } catch (error: any) {
      console.warn('Error fetching profile details:', error);
      // Fallback to minimal info if API calls fail
      Alert.alert('Connection issue', 'Could not sync all profile statistics.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out of VetGo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const formatPhone = (phoneStr: string) => {
    if (!phoneStr) return 'N/A';
    if (phoneStr.length < 4) return phoneStr;
    // Show last 4 digits obfuscated for privacy
    const lastFour = phoneStr.slice(-4);
    return `•••• ••• ${lastFour}`;
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'DOCTOR':
        return { label: 'VET DOCTOR', color: theme.secondary, bg: 'rgba(21, 101, 192, 0.15)' };
      case 'ADMIN':
        return { label: 'ADMINISTRATOR', color: theme.warning, bg: 'rgba(251, 140, 0, 0.15)' };
      default:
        return { label: 'PET OWNER', color: theme.success, bg: 'rgba(67, 160, 71, 0.15)' };
    }
  };

  if (loading && !profile) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const roleDetails = getRoleLabel(profile?.role || 'USER');

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ 
        paddingTop: Math.max(insets.top + 10, 25), 
        paddingBottom: Math.max(insets.bottom + 110, 110) 
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.headerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.avatarWrapper, { borderColor: theme.primary }]}>
          <Ionicons 
            name={profile?.role === 'DOCTOR' ? 'medical-outline' : 'person-outline'} 
            size={48} 
            color={theme.primary} 
          />
        </View>
        <Text style={[styles.userName, { color: theme.text }]}>
          {profile?.name ? `${profile.name.first} ${profile.name.last}` : 'User Profile'}
        </Text>
        <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
          {profile?.email || 'user@vetgo.app'}
        </Text>

        <View style={[styles.roleBadge, { backgroundColor: roleDetails.bg }]}>
          <Text style={[styles.roleText, { color: roleDetails.color }]}>{roleDetails.label}</Text>
        </View>
      </View>

      {/* Stats Dashboard */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="paw-outline" size={24} color={theme.primary} />
          <Text style={[styles.statValue, { color: theme.text }]}>{petCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pets</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="shield-checkmark-outline" size={24} color={theme.secondary} />
          <Text style={[styles.statValue, { color: theme.text }]}>{requestCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rescues</Text>
        </View>

        {profile?.role === 'DOCTOR' && (
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="star-outline" size={24} color={theme.warning} />
            <Text style={[styles.statValue, { color: theme.text }]}>
              {docProfile?.ratingAvg ? docProfile.ratingAvg.toFixed(1) : '5.0'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rating</Text>
          </View>
        )}
      </View>

      {/* Account Info Section */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT DETAIL</Text>
      
      <View style={[styles.infoList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.infoItem, { borderBottomColor: theme.border }]}>
          <Feather name="phone" size={18} color={theme.textSecondary} style={styles.infoIcon} />
          <View>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Phone Number</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{formatPhone(profile?.phone)}</Text>
          </View>
        </View>

        {profile?.role === 'DOCTOR' && docProfile?.qualifications && (
          <View style={[styles.infoItem, { borderBottomColor: theme.border }]}>
            <Feather name="award" size={18} color={theme.textSecondary} style={styles.infoIcon} />
            <View>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Qualifications</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{docProfile.qualifications}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoItem}>
          <Feather name="calendar" size={18} color={theme.textSecondary} style={styles.infoIcon} />
          <View>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Member Since</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Preferences Section */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PREFERENCES</Text>

      <View style={[styles.infoList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.preferenceRow}>
          <View style={styles.prefLeft}>
            <Feather name="moon" size={18} color={theme.textSecondary} style={styles.infoIcon} />
            <Text style={[styles.prefText, { color: theme.text }]}>Dark Mode</Text>
          </View>
          <Switch 
            value={isDark} 
            onValueChange={toggleTheme} 
            trackColor={{ false: '#767577', true: theme.primary }}
            thumbColor="#f4f3f4"
          />
        </View>
      </View>

      {/* Action Row */}
      <TouchableOpacity 
        style={[styles.logoutBtn, { backgroundColor: theme.surface, borderColor: theme.error }]}
        onPress={handleLogoutPress}
      >
        <Feather name="log-out" size={20} color={theme.error} style={{ marginRight: 10 }} />
        <Text style={[styles.logoutText, { color: theme.error }]}>Log Out of VetGo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    alignItems: 'center',
    paddingVertical: 25,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 5,
  },
  infoList: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  infoItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 0.8,
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 15,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefText: {
    fontSize: 15,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 55,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
});


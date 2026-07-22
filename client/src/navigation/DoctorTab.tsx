import React, { useState, useEffect, useContext, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DoctorHomeScreen from '../screens/doctor/DoctorHomeScreen';
import DoctorHistoryScreen from '../screens/doctor/DoctorHistoryScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import { AnimatedTabBar } from '../components/navigation/AnimatedTabBar';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Tab = createBottomTabNavigator();

export default function DoctorTab() {
  const { theme } = useContext(ThemeContext);
  const { logout } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDoctorProfile = async () => {
    try {
      const { data } = await api.get('/doctors/profile');
      setProfile(data);
    } catch (error) {
      console.error('Error loading doctor status in tab:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorProfile();
  }, []);

  if (loading) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading workspace...</Text>
      </View>
    );
  }

  // Verification checks
  const isApproved = profile?.docs && profile.docs.length > 0 && profile.docs.every((d: any) => d.status === 'APPROVED');
  const isRejected = profile?.docs && profile.docs.some((d: any) => d.status === 'REJECTED');
  const isTerminated = profile?.userId?.isDeleted === true;
  const terminationReason = profile?.userId?.terminationReason || '';

  if (!isApproved || isTerminated) {
    let iconName = 'time-outline';
    let iconColor = '#F59E0B';
    let statusTitle = 'Awaiting Verification';
    let statusDesc = 'An administrator is currently reviewing your medical degree and credentials. You will be activated on the emergency network once verified.';

    if (isTerminated) {
      iconName = 'ban-outline';
      iconColor = '#EF4444';
      statusTitle = 'Account Terminated';
      statusDesc = `Your veterinary account has been terminated by the administrator. \n\nReason: "${terminationReason || 'Violation of platform guidelines'}"`;
    } else if (isRejected) {
      iconName = 'close-circle-outline';
      iconColor = '#EF4444';
      statusTitle = 'Application Rejected';
      statusDesc = 'Your verification documents were rejected by the VetGo administration. Please verify your certifications and apply again.';
    }

    return (
      <View style={[styles.blockScreen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.contentCard}>
          <View style={[styles.iconCircle, { backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={iconName as any} size={64} color={iconColor} />
          </View>
          <Text style={[styles.statusTitle, { color: theme.text }]}>{statusTitle}</Text>
          <Text style={[styles.statusDesc, { color: theme.textSecondary }]}>{statusDesc}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.logoutBtn, { borderColor: theme.error }]}
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.error} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: theme.error }]}>Log Out of Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { paddingBottom: 70 },
      }}
    >
      <Tab.Screen name="DoctorHome" component={DoctorHomeScreen} options={{ title: 'Alerts' }} />
      <Tab.Screen name="DoctorHistory" component={DoctorHistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  blockScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  contentCard: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
  },
  statusDesc: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    width: '100%',
    maxWidth: 260,
    position: 'absolute',
    bottom: 50,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

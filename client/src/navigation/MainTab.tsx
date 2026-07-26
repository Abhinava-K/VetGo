import React, { useEffect, useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapScreen from '../screens/user/MapScreen';
import RequestsScreen from '../screens/user/RequestsScreen';
import PetsScreen from '../screens/user/PetsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import { AnimatedTabBar } from '../components/navigation/AnimatedTabBar';
import WarningStrikeModal from '../components/common/WarningStrikeModal';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Tab = createBottomTabNavigator();

export default function MainTab() {
  const { user, updateUser } = useContext(AuthContext);

  useEffect(() => {
    syncUserProfile();
  }, []);

  const syncUserProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data) {
        updateUser(res.data);
      }
    } catch (err) {
      console.warn('Failed to sync profile on app load:', err);
    }
  };

  const handleAcknowledgeStrike = async (warningId: string) => {
    const res = await api.post(`/auth/warnings/${warningId}/acknowledge`);
    if (res.data) {
      updateUser({
        warningCount: res.data.warningCount,
        warnings: res.data.warnings
      });
    }
  };

  const unackWarning = user?.warnings?.find((w: any) => !w.acknowledged);
  const totalStrikes = user?.warningCount || user?.warnings?.length || 0;
  const strikeNumber = unackWarning && user?.warnings ? user.warnings.findIndex((w: any) => w._id === unackWarning._id) + 1 : 1;

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <AnimatedTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { paddingBottom: 70 },
        }}
      >
        <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Map' }} />
        <Tab.Screen name="Requests" component={RequestsScreen} options={{ title: 'Requests' }} />
        <Tab.Screen name="Pets" component={PetsScreen} options={{ title: 'Pets' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      </Tab.Navigator>

      {unackWarning && (
        <WarningStrikeModal
          visible={!!unackWarning}
          warning={unackWarning}
          strikeNumber={strikeNumber}
          totalStrikes={totalStrikes}
          onAcknowledge={handleAcknowledgeStrike}
        />
      )}
    </>
  );
}

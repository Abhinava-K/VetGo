import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DoctorHomeScreen from '../screens/doctor/DoctorHomeScreen';
import DoctorHistoryScreen from '../screens/doctor/DoctorHistoryScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import { AnimatedTabBar } from '../components/navigation/AnimatedTabBar';

const Tab = createBottomTabNavigator();

export default function DoctorTab() {
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

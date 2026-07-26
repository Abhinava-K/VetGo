import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import { AnimatedTabBar } from '../components/navigation/AnimatedTabBar';

const Tab = createBottomTabNavigator();

export default function AdminTab() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { paddingBottom: 70 },
      }}
    >
      <Tab.Screen
        name="AdminVets"
        component={AdminHomeScreen}
        initialParams={{ initialTab: 'applications' }}
        options={{ title: 'Vets' }}
      />
      <Tab.Screen
        name="AdminRequests"
        component={AdminHomeScreen}
        initialParams={{ initialTab: 'requests' }}
        options={{ title: 'Feed' }}
      />
      <Tab.Screen
        name="AdminReports"
        component={AdminHomeScreen}
        initialParams={{ initialTab: 'reports' }}
        options={{ title: 'Reports' }}
      />
      <Tab.Screen
        name="AdminMetrics"
        component={AdminHomeScreen}
        initialParams={{ initialTab: 'stats' }}
        options={{ title: 'Metrics' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

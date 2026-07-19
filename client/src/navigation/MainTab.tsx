import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapScreen from '../screens/user/MapScreen';
import RequestsScreen from '../screens/user/RequestsScreen';
import PetsScreen from '../screens/user/PetsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import { AnimatedTabBar } from '../components/navigation/AnimatedTabBar';

const Tab = createBottomTabNavigator();

export default function MainTab() {
  return (
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
  );
}

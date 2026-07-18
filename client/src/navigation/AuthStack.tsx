import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupUserScreen from '../screens/auth/SignupUserScreen';
import SignupDoctorScreen from '../screens/auth/SignupDoctorScreen';

const Stack = createStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignupUser" component={SignupUserScreen} />
      <Stack.Screen name="SignupDoctor" component={SignupDoctorScreen} />
    </Stack.Navigator>
  );
}

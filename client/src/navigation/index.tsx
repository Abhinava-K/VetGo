import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthStack from './AuthStack';
import MainTab from './MainTab';
import DoctorHomeScreen from '../screens/doctor/DoctorHomeScreen';
import AssignedRequestScreen from '../screens/doctor/AssignedRequestScreen';
import CreateRequestScreen from '../screens/user/CreateRequestScreen';
import RequestStatusScreen from '../screens/user/RequestStatusScreen';
import AddPetScreen from '../screens/user/AddPetScreen';
import { AuthContext } from '../context/AuthContext';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : user.role === 'DOCTOR' ? (
        <>
          <Stack.Screen name="DoctorHome" component={DoctorHomeScreen} />
          <Stack.Screen name="AssignedRequest" component={AssignedRequestScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="UserMain" component={MainTab} />
          <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
          <Stack.Screen name="RequestStatus" component={RequestStatusScreen} />
          <Stack.Screen name="AddPet" component={AddPetScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}

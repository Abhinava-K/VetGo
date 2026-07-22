import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthStack from './AuthStack';
import MainTab from './MainTab';
import DoctorTab from './DoctorTab';
import AssignedRequestScreen from '../screens/doctor/AssignedRequestScreen';
import CreateRequestScreen from '../screens/user/CreateRequestScreen';
import RequestStatusScreen from '../screens/user/RequestStatusScreen';
import AddPetScreen from '../screens/user/AddPetScreen';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
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
      ) : user.role === 'ADMIN' ? (
        <>
          <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
        </>
      ) : user.role === 'DOCTOR' ? (
        <>
          <Stack.Screen name="DoctorMain" component={DoctorTab} />
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

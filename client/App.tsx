import 'react-native-gesture-handler';
import './src/i18n';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, LogBox } from 'react-native';

LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
]);
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { View } from 'react-native';

function AppContent() {
  const { theme, isDark } = React.useContext(ThemeContext);

  const navTheme = {
    dark: isDark,
    colors: {
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

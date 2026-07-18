import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from './src/styles/theme';

export default function App() {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState(systemColorScheme || 'light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
    } catch (e) {
      console.error('Failed to load theme', e);
    }
  };

  const toggleTheme = async () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
    try {
      await AsyncStorage.setItem('themeMode', newMode);
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const currentTheme = themeMode === 'light' ? lightTheme : darkTheme;

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <Text style={{ color: currentTheme.text, fontSize: 24, fontWeight: 'bold' }}>VetGo</Text>
      <Text style={{ color: currentTheme.textSecondary, marginTop: 10 }}>
        Emergency Veterinary Assistance
      </Text>
      <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

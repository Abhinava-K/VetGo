import React, { useState, useContext } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { lightTheme, darkTheme } from '../../styles/theme';
import { useColorScheme } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();
  const { theme } = useContext(ThemeContext);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await AsyncStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
      }
      
      // Update global AuthContext state, which will automatically swap navigation stacks
      await login(data);
      // Alert.alert('Success', 'Logged in successfully');
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.primary }]}>VetGo</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Emergency Vet at your doorstep
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.surface, 
            color: theme.text,
            borderColor: theme.border
          }]}
          placeholder="Email"
          placeholderTextColor={theme.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.surface, 
            color: theme.text,
            borderColor: theme.border
          }]}
          placeholder="Password"
          placeholderTextColor={theme.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={{ alignSelf: 'flex-end', marginBottom: 15, marginTop: -5 }}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={{ color: theme.textSecondary }}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignupUser')}>
            <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.doctorSignup} 
          onPress={() => navigation.navigate('SignupDoctor')}
        >
          <Text style={{ color: theme.secondary }}>Are you a Doctor? Join us</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  form: {
    width: '100%',
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  doctorSignup: {
    alignItems: 'center',
    marginTop: 20,
  }
});

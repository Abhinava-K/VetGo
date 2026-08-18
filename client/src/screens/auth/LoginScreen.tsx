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
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { LANGUAGES, useTranslation } from '../../i18n';
import LanguageSelectModal from '../../components/LanguageSelectModal';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const navigation = useNavigation<any>();
  const { theme } = useContext(ThemeContext);
  const { login } = useContext(AuthContext);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', t('please_fill_fields'));
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await AsyncStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
      }
      
      // Update global AuthContext state
      await login(data);
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
      {/* Top Header Bar with Language Picker Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity 
          style={[styles.langPill, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => setLangModalVisible(true)}
        >
          <Ionicons name="globe-outline" size={18} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.langPillText, { color: theme.text }]}>
            {currentLang.native}
          </Text>
          <Ionicons name="chevron-down" size={14} color={theme.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.primary }]}>VetGo</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('emergency_vet_subtitle')}
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.surface, 
            color: theme.text,
            borderColor: theme.border
          }]}
          placeholder={t('email')}
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
          placeholder={t('password')}
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
            {t('forgot_password')}
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
            <Text style={styles.buttonText}>{t('login')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={{ color: theme.textSecondary }}>{t('dont_have_account')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignupUser')}>
            <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{t('sign_up')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.doctorSignup} 
          onPress={() => navigation.navigate('SignupDoctor')}
        >
          <Text style={{ color: theme.secondary }}>{t('are_you_a_doctor')}</Text>
        </TouchableOpacity>
      </View>

      {/* Reusable Language Select Modal */}
      <LanguageSelectModal 
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  topHeader: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  langPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
    textAlign: 'center',
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

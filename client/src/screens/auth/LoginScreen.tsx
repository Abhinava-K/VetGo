import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { LANGUAGES, useTranslation } from '../../i18n';
import LanguageSelectModal from '../../components/LanguageSelectModal';
import { sendFirebaseOtp, verifyFirebaseOtp } from '../../services/firebaseAuthService';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const [loginMethod, setLoginMethod] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  
  // Password Mode States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP Mode States
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const navigation = useNavigation<any>();
  const { theme, isDark } = useContext(ThemeContext);
  const { login } = useContext(AuthContext);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: any = null;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown]);

  // Password Login Handler
  const handlePasswordLogin = async () => {
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
      await login(data);
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Send OTP Handler
  const handleSendOtp = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 7) {
      Alert.alert('Invalid Phone', t('invalid_phone') || 'Please enter a valid phone number');
      return;
    }

    setSendingOtp(true);
    try {
      // 1. Verify user exists on backend
      const { data } = await api.post('/auth/send-otp', {
        phone: cleanPhone,
        purpose: 'LOGIN'
      });

      // 2. Dispatch real SMS via Firebase
      await sendFirebaseOtp(cleanPhone);

      setOtpSent(true);
      setCountdown(30);
      Alert.alert('Code Sent', `${t('otp_sent_to') || 'Verification code sent to'} ${cleanPhone}`);
    } catch (error: any) {
      Alert.alert('Unable to Send Code', error.response?.data?.message || 'Failed to send OTP code');
    } finally {
      setSendingOtp(false);
    }
  };

  // OTP Login Handler
  const handleOtpLogin = async () => {
    const cleanPhone = phone.trim();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length < 4) {
      Alert.alert('Error', t('invalid_otp') || 'Please enter a valid verification code');
      return;
    }

    setLoading(true);
    try {
      // Verify against Firebase
      let firebaseToken: string | undefined;
      const fbVerify = await verifyFirebaseOtp(cleanOtp);
      if (fbVerify.success && fbVerify.idToken) {
        firebaseToken = fbVerify.idToken;
      }

      const { data } = await api.post('/auth/login-otp', {
        phone: cleanPhone,
        otp: cleanOtp,
        firebaseToken
      });

      await AsyncStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
      }
      await login(data);
    } catch (error: any) {
      Alert.alert('Verification Failed', error.response?.data?.message || 'Invalid or expired OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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

        {/* Method Toggle Segmented Switch */}
        <View style={[styles.segmentContainer, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: theme.border }]}>
          <TouchableOpacity 
            style={[
              styles.segmentBtn, 
              loginMethod === 'PASSWORD' && [styles.segmentBtnActive, { backgroundColor: theme.surface }]
            ]}
            onPress={() => {
              setLoginMethod('PASSWORD');
              setOtpSent(false);
            }}
          >
            <Ionicons 
              name="key-outline" 
              size={17} 
              color={loginMethod === 'PASSWORD' ? theme.primary : theme.textSecondary} 
              style={{ marginRight: 6 }}
            />
            <Text style={[
              styles.segmentText, 
              { color: loginMethod === 'PASSWORD' ? theme.primary : theme.textSecondary, fontWeight: loginMethod === 'PASSWORD' ? '700' : '500' }
            ]}>
              {t('login_with_password') || 'Password'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.segmentBtn, 
              loginMethod === 'OTP' && [styles.segmentBtnActive, { backgroundColor: theme.surface }]
            ]}
            onPress={() => setLoginMethod('OTP')}
          >
            <Ionicons 
              name="phone-portrait-outline" 
              size={17} 
              color={loginMethod === 'OTP' ? theme.primary : theme.textSecondary} 
              style={{ marginRight: 6 }}
            />
            <Text style={[
              styles.segmentText, 
              { color: loginMethod === 'OTP' ? theme.primary : theme.textSecondary, fontWeight: loginMethod === 'OTP' ? '700' : '500' }
            ]}>
              {t('login_with_otp') || 'Phone OTP'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* PASSWORD LOGIN FORM */}
        {loginMethod === 'PASSWORD' && (
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.surface, 
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder={t('email_or_phone') || 'Email or Phone Number'}
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
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
              onPress={handlePasswordLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>{t('login')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* PHONE OTP LOGIN FORM */}
        {loginMethod === 'OTP' && (
          <View style={styles.form}>
            {!otpSent ? (
              <>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.surface, 
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  placeholder={t('enter_phone_signup') || 'Phone Number (e.g. +91 9876543210)'}
                  placeholderTextColor={theme.textSecondary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoFocus
                />

                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: theme.primary }]}
                  onPress={handleSendOtp}
                  disabled={sendingOtp}
                >
                  {sendingOtp ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.buttonText}>{t('send_otp') || 'Send OTP Code'}</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.phonePill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Ionicons name="phone-portrait-outline" size={16} color={theme.primary} />
                  <Text style={[styles.phonePillText, { color: theme.text }]}>{phone}</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setOtpSent(false);
                      setOtp('');
                    }}
                  >
                    <Text style={[styles.editLink, { color: theme.primary }]}>Change</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.input, styles.otpInput, { 
                    backgroundColor: theme.surface, 
                    color: theme.text,
                    borderColor: theme.primary
                  }]}
                  placeholder="• • • • • •"
                  placeholderTextColor={theme.textSecondary}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />

                <View style={styles.resendRow}>
                  {countdown > 0 ? (
                    <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                      {t('resend_in') || 'Resend code in'} <Text style={{ color: theme.primary, fontWeight: '700' }}>{countdown}s</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendOtp} disabled={sendingOtp}>
                      <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>
                        {t('resend_otp') || 'Resend OTP Code'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: theme.primary }]}
                  onPress={handleOtpLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>{t('verify_and_login') || 'Verify & Log In'}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

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
      </ScrollView>

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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
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
    marginBottom: 28,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
    textAlign: 'center',
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
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
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 10,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  phonePillText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  editLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -4,
  },
  button: {
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  doctorSignup: {
    alignItems: 'center',
    marginTop: 18,
  }
});

import React, { useState, useContext } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
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
import PhoneVerificationModal from '../../components/PhoneVerificationModal';
import LegalModal from '../../components/LegalModal';
import { sendFirebaseOtp, verifyFirebaseOtp } from '../../services/firebaseAuthService';

export default function SignupUserScreen() {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalInitialTab, setLegalInitialTab] = useState<'TERMS' | 'PRIVACY'>('TERMS');

  const navigation = useNavigation<any>();
  const { theme } = useContext(ThemeContext);
  const { login } = useContext(AuthContext);

  const openLegal = (tab: 'TERMS' | 'PRIVACY') => {
    setLegalInitialTab(tab);
    setLegalModalVisible(true);
  };

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Step 1: Send real Firebase OTP to verify phone
  const handleInitiateSignup = async () => {
    const { firstName, lastName, email, password, phone } = formData;
    if (!firstName || !lastName || !password || !phone) {
      Alert.alert('Error', t('please_fill_fields') || 'Please fill in all required fields (Name, Phone, Password)');
      return;
    }

    if (!agreedToTerms) {
      Alert.alert(
        t('terms_acceptance_required') || 'Terms Acceptance Required',
        t('please_accept_terms') || 'Please accept the Terms & Conditions and Privacy Policy to proceed.'
      );
      return;
    }

    if (phone.trim().length < 7) {
      Alert.alert('Error', t('invalid_phone') || 'Please enter a valid phone number');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      // 1. Send SMS via Firebase
      const fbResult = await sendFirebaseOtp(phone.trim());

      // 2. Also notify backend to check uniqueness
      try {
        await api.post('/auth/send-otp', {
          phone: phone.trim(),
          purpose: 'SIGNUP'
        });
      } catch (e: any) {
        if (e.response?.status === 400 && e.response?.data?.message?.includes('already exists')) {
          Alert.alert('Error', e.response.data.message);
          setLoading(false);
          return;
        }
      }

      if (fbResult.success) {
        setOtpModalVisible(true);
      } else {
        // If Firebase threw a specific error, alert it
        console.warn('Firebase OTP Warning:', fbResult.message);
        // Fallback open modal for testing/verification
        setOtpModalVisible(true);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to send phone verification code';
      Alert.alert('Signup Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Complete signup with verified OTP
  const handleVerifyAndSignup = async (otp: string) => {
    setLoading(true);
    try {
      // Verify with Firebase first
      let firebaseToken: string | undefined;
      const fbVerify = await verifyFirebaseOtp(otp);
      if (fbVerify.success && fbVerify.idToken) {
        firebaseToken = fbVerify.idToken;
      }

      const { data } = await api.post('/auth/signup/user', {
        ...formData,
        phone: formData.phone.trim(),
        otp,
        firebaseToken
      });

      setOtpModalVisible(false);

      if (data.accessToken) {
        await AsyncStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', data.refreshToken);
        }
        await login(data);
      } else {
        Alert.alert('Success', 'Account created successfully! Please log in.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Verification failed. Please check the code and try again.';
      Alert.alert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    try {
      await sendFirebaseOtp(formData.phone.trim());
      await api.post('/auth/send-otp', {
        phone: formData.phone.trim(),
        purpose: 'SIGNUP'
      });
      Alert.alert('Code Sent', `A new verification code was sent to ${formData.phone.trim()}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resend code');
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
        {/* Top Header Bar with Language Picker Pill */}
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
          <Text style={[styles.title, { color: theme.primary }]}>{t('create_account')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('join_community')}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder={t('first_name')}
              placeholderTextColor={theme.textSecondary}
              value={formData.firstName}
              onChangeText={(v) => updateField('firstName', v)}
            />
            <TextInput
              style={[styles.input, styles.halfInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder={t('last_name')}
              placeholderTextColor={theme.textSecondary}
              value={formData.lastName}
              onChangeText={(v) => updateField('lastName', v)}
            />
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder={t('phone_number') || 'Phone Number (Required for OTP)'}
            placeholderTextColor={theme.textSecondary}
            value={formData.phone}
            onChangeText={(v) => updateField('phone', v)}
            keyboardType="phone-pad"
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder={t('email_optional') || 'Email (Optional)'}
            placeholderTextColor={theme.textSecondary}
            value={formData.email}
            onChangeText={(v) => updateField('email', v)}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder={t('password')}
            placeholderTextColor={theme.textSecondary}
            value={formData.password}
            onChangeText={(v) => updateField('password', v)}
            secureTextEntry
          />

          {/* Terms & Privacy Consent Checkbox */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                { borderColor: theme.border, backgroundColor: agreedToTerms ? theme.primary : theme.surface }
              ]}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.8}
            >
              {agreedToTerms && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </TouchableOpacity>

            <View style={styles.termsTextWrap}>
              <Text style={[styles.termsText, { color: theme.textSecondary }]}>
                {t('i_agree_to') || 'I agree to the'}{' '}
              </Text>
              <TouchableOpacity onPress={() => openLegal('TERMS')}>
                <Text style={[styles.termsLink, { color: theme.primary }]}>
                  {t('terms_and_conditions') || 'Terms & Conditions'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.termsText, { color: theme.textSecondary }]}> {t('and') || '&'} </Text>
              <TouchableOpacity onPress={() => openLegal('PRIVACY')}>
                <Text style={[styles.termsLink, { color: theme.primary }]}>
                  {t('privacy_policy') || 'Privacy Policy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleInitiateSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.buttonText}>{t('sign_up')}</Text>
                <Ionicons name="shield-checkmark-outline" size={18} color="#FFF" style={{ marginLeft: 8 }} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.footer} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={{ color: theme.textSecondary }}>{t('already_have_account')} </Text>
            <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{t('login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Phone OTP Verification Modal */}
      <PhoneVerificationModal
        visible={otpModalVisible}
        phone={formData.phone}
        onClose={() => setOtpModalVisible(false)}
        onVerify={handleVerifyAndSignup}
        onResend={handleResendOtp}
        loading={loading}
      />

      {/* Language Select Modal */}
      <LanguageSelectModal 
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />

      {/* In-App Legal & Privacy Reader Modal */}
      <LegalModal
        visible={legalModalVisible}
        onClose={() => setLegalModalVisible(false)}
        initialTab={legalInitialTab}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
  },
  topHeader: {
    alignItems: 'flex-end',
    marginBottom: 20,
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
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  form: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
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
    shadowOpacity: 0.15,
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
    marginTop: 20,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 2,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  termsTextWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
  },
  termsLink: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

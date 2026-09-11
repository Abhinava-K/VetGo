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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../services/api';
import { ThemeContext } from '../../context/ThemeContext';
import { LANGUAGES, useTranslation } from '../../i18n';
import LanguageSelectModal from '../../components/LanguageSelectModal';
import PhoneVerificationModal from '../../components/PhoneVerificationModal';
import LegalModal from '../../components/LegalModal';
import { sendFirebaseOtp, verifyFirebaseOtp } from '../../services/firebaseAuthService';

export default function SignupDoctorScreen() {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    qualifications: ''
  });
  const [selectedDocs, setSelectedDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalInitialTab, setLegalInitialTab] = useState<'TERMS' | 'PRIVACY'>('TERMS');

  const navigation = useNavigation<any>();
  const { theme } = useContext(ThemeContext);

  const openLegal = (tab: 'TERMS' | 'PRIVACY') => {
    setLegalInitialTab(tab);
    setLegalModalVisible(true);
  };

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const validAssets = result.assets.filter(asset => {
          const name = (asset.name || '').toLowerCase();
          const mime = (asset.mimeType || '').toLowerCase();
          const isPdf = name.endsWith('.pdf') || mime === 'application/pdf';
          const isJpg = name.endsWith('.jpg') || name.endsWith('.jpeg') || mime.includes('jpeg') || mime.includes('jpg');
          const isPng = name.endsWith('.png') || mime.includes('png');
          return isPdf || isJpg || isPng;
        });

        if (validAssets.length < result.assets.length) {
          Alert.alert(
            t('doc_notice_title') || 'Notice', 
            t('doc_upload_format_notice') || 'Only PDF, JPG, and PNG files are accepted. Other files were skipped.'
          );
        }

        const newDocs = [...selectedDocs, ...validAssets].slice(0, 3);
        setSelectedDocs(newDocs);
      }
    } catch (err) {
      console.warn('Error picking document:', err);
      Alert.alert(t('error') || 'Error', t('failed_to_pick_doc') || 'Failed to pick document');
    }
  };

  const removeDoc = (index: number) => {
    setSelectedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const handleInitiateSignup = async () => {
    const { firstName, lastName, email, password, phone, qualifications } = formData;
    if (!firstName || !lastName || !password || !phone || !qualifications) {
      Alert.alert(t('error') || 'Error', t('please_fill_fields') || 'Please fill in all required fields (Name, Phone, Qualifications, Password)');
      return;
    }
    if (phone.trim().length < 7) {
      Alert.alert(t('error') || 'Error', t('invalid_phone') || 'Please enter a valid phone number');
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('error') || 'Error', t('password_min_length') || 'Password must be at least 6 characters long');
      return;
    }
    if (selectedDocs.length === 0) {
      Alert.alert(t('error') || 'Error', t('upload_one_doc') || 'Please upload at least one degree certification or ID proof document.');
      return;
    }

    if (!agreedToTerms) {
      Alert.alert(
        t('terms_acceptance_required') || 'Terms Acceptance Required',
        t('please_accept_terms') || 'Please accept the Terms & Conditions and Privacy Policy to proceed.'
      );
      return;
    }

    setLoading(true);
    try {
      // Send real SMS via Firebase
      const fbResult = await sendFirebaseOtp(phone.trim());

      try {
        await api.post('/auth/send-otp', {
          phone: phone.trim(),
          purpose: 'SIGNUP'
        });
      } catch (e: any) {
        if (e.response?.status === 400 && e.response?.data?.message?.includes('already exists')) {
          Alert.alert(t('error') || 'Error', e.response.data.message);
          setLoading(false);
          return;
        }
      }

      if (fbResult.success) {
        setOtpModalVisible(true);
      } else {
        console.warn('Firebase OTP Warning:', fbResult.message);
        setOtpModalVisible(true);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || t('unable_to_send_code') || 'Failed to send phone verification code';
      Alert.alert(t('error') || 'Application Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSignup = async (otp: string) => {
    const { firstName, lastName, email, password, phone, qualifications } = formData;
    setLoading(true);
    try {
      let firebaseToken = '';
      const fbVerify = await verifyFirebaseOtp(otp);
      if (fbVerify.success && fbVerify.idToken) {
        firebaseToken = fbVerify.idToken;
      }

      const data = new FormData();
      data.append('firstName', firstName);
      data.append('lastName', lastName);
      data.append('email', email);
      data.append('password', password);
      data.append('phone', phone.trim());
      data.append('qualifications', qualifications);
      data.append('otp', otp);
      if (firebaseToken) {
        data.append('firebaseToken', firebaseToken);
      }

      selectedDocs.forEach((doc, idx) => {
        let name = doc.name || `document_${idx + 1}`;
        const mimeType = doc.mimeType || 'image/jpeg';
        if (!name.includes('.')) {
          let ext = 'jpg';
          if (mimeType === 'application/pdf') ext = 'pdf';
          else if (mimeType.includes('png')) ext = 'png';
          else if (mimeType.includes('webp')) ext = 'webp';
          else if (mimeType.includes('word')) ext = 'docx';
          name = `${name}.${ext}`;
        }
        data.append('docs', {
          uri: doc.uri,
          name: name,
          type: mimeType,
        } as any);
      });

      await api.post('/auth/signup/doctor', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setOtpModalVisible(false);

      Alert.alert(
        t('application_submitted') || 'Application Submitted', 
        t('application_under_review') || 'Your application is pending review. We will contact you soon.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      const msg = error.response?.data?.message || t('application_failed') || 'Application failed. Please try again.';
      Alert.alert(t('error') || 'Application Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await sendFirebaseOtp(formData.phone.trim());
      await api.post('/auth/send-otp', {
        phone: formData.phone.trim(),
        purpose: 'SIGNUP'
      });
      Alert.alert(t('code_sent') || 'Code Sent', `${t('otp_sent_to') || 'A new verification code was sent to'} ${formData.phone.trim()}`);
    } catch (error: any) {
      Alert.alert(t('error') || 'Error', error.response?.data?.message || 'Failed to resend code');
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <Text style={[styles.title, { color: theme.secondary }]}>{t('doctor_registration')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('join_vet_network')}
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
            placeholder={t('qualifications_placeholder')}
            placeholderTextColor={theme.textSecondary}
            value={formData.qualifications}
            onChangeText={(v) => updateField('qualifications', v)}
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder={t('password')}
            placeholderTextColor={theme.textSecondary}
            value={formData.password}
            onChangeText={(v) => updateField('password', v)}
            secureTextEntry
          />

          <View style={styles.docSection}>
            <Text style={[styles.docLabel, { color: theme.textSecondary }]}>
              {t('upload_docs_label')}
            </Text>
            
            <TouchableOpacity 
              style={[styles.uploadButton, { borderColor: theme.secondary, backgroundColor: theme.surface }]}
              onPress={pickDocuments}
              disabled={selectedDocs.length >= 3}
            >
              <Ionicons name="cloud-upload-outline" size={24} color={theme.secondary} />
              <Text style={[styles.uploadButtonText, { color: theme.secondary }]}>
                {t('select_documents')} ({selectedDocs.length}/3)
              </Text>
            </TouchableOpacity>

            {selectedDocs.map((doc, index) => (
              <View key={index} style={[styles.docItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="document-text-outline" size={20} color={theme.primary} />
                <Text style={[styles.docName, { color: theme.text }]} numberOfLines={1}>
                  {doc.name}
                </Text>
                <TouchableOpacity onPress={() => removeDoc(index)}>
                  <Ionicons name="close-circle" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Terms & Privacy Consent Checkbox */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                { borderColor: theme.border, backgroundColor: agreedToTerms ? theme.secondary : theme.surface }
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
                <Text style={[styles.termsLink, { color: theme.secondary }]}>
                  {t('terms_and_conditions') || 'Terms & Conditions'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.termsText, { color: theme.textSecondary }]}> {t('and') || '&'} </Text>
              <TouchableOpacity onPress={() => openLegal('PRIVACY')}>
                <Text style={[styles.termsLink, { color: theme.secondary }]}>
                  {t('privacy_policy') || 'Privacy Policy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.secondary }]}
            onPress={handleInitiateSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.buttonText}>{t('submit_application')}</Text>
                <Ionicons name="shield-checkmark-outline" size={18} color="#FFF" style={{ marginLeft: 8 }} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.footer} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={{ color: theme.textSecondary }}>{t('already_have_account')} </Text>
            <Text style={{ color: theme.secondary, fontWeight: 'bold' }}>{t('login')}</Text>
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
    fontSize: 30,
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
  docSection: {
    marginBottom: 20,
  },
  docLabel: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '500',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginBottom: 10,
  },
  uploadButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 5,
  },
  docName: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    fontSize: 14,
  },
  button: {
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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

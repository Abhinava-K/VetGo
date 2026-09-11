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
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { ThemeContext } from '../../context/ThemeContext';
import { LANGUAGES, useTranslation } from '../../i18n';
import LanguageSelectModal from '../../components/LanguageSelectModal';

export default function ForgotPasswordScreen() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const navigation = useNavigation<any>();
  const { theme } = useContext(ThemeContext);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleResetPassword = async () => {
    if (!email || !phone || !newPassword || !confirmPassword) {
      Alert.alert(t('error') || 'Error', t('please_fill_fields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('error') || 'Error', t('new_passwords_dont_match') || 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('error') || 'Error', t('password_min_length') || 'New password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', {
        email,
        phone,
        newPassword,
      });

      Alert.alert(
        t('success') || 'Success',
        data.message || t('password_reset_success') || 'Password reset successfully! You can now log in.',
        [
          {
            text: t('go_to_login') || 'Go to Login',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        t('verification_failed') || 'Verification Failed',
        error.response?.data?.message || 'Failed to verify phone number or reset password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation & Language Row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

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
          <Text style={[styles.title, { color: theme.primary }]}>{t('reset_password')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('verify_phone_reset_sub')}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.text }]}>{t('email')}</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder={t('enter_email') || 'your.email@example.com'}
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={[styles.label, { color: theme.text }]}>{t('registered_phone_number')}</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder={t('enter_phone_signup')}
            placeholderTextColor={theme.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: theme.text }]}>{t('new_password')}</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder={t('min_pass_chars')}
            placeholderTextColor={theme.textSecondary}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />

          <Text style={[styles.label, { color: theme.text }]}>{t('confirm_new_password')}</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder={t('reenter_new_password')}
            placeholderTextColor={theme.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>{t('reset_password')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={{ color: theme.textSecondary }}>{t('back_to_login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Language Select Modal */}
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
    padding: 24,
    paddingTop: 50,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
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
    marginBottom: 25,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 15,
  },
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: 20,
  },
});

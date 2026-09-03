import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useTranslation } from '../i18n';

interface PhoneVerificationModalProps {
  visible: boolean;
  phone: string;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void> | void;
  onResend: () => Promise<void> | void;
  loading?: boolean;
}

export default function PhoneVerificationModal({
  visible,
  phone,
  onClose,
  onVerify,
  onResend,
  loading = false
}: PhoneVerificationModalProps) {
  const { t } = useTranslation();
  const { theme, isDark } = useContext(ThemeContext);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (visible) {
      setOtp('');
      setCountdown(30);
    }
  }, [visible]);

  useEffect(() => {
    let interval: any = null;
    if (visible && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible, countdown]);

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      await onResend();
      setCountdown(30);
    } finally {
      setResending(false);
    }
  };

  const handleVerify = () => {
    if (otp.trim().length >= 4) {
      onVerify(otp.trim());
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.avoidingView}
          >
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {/* Close Button */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* Icon Badge */}
              <View style={[styles.iconBadge, { backgroundColor: theme.primary + '18' }]}>
                <Ionicons name="shield-checkmark" size={32} color={theme.primary} />
              </View>

              <Text style={[styles.title, { color: theme.text }]}>
                {t('phone_verification') || 'Verify Phone Number'}
              </Text>

              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {t('phone_verification_sub') || 'Enter the 6-digit verification code sent to'}
              </Text>

              <View style={[styles.phonePill, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: theme.border }]}>
                <Ionicons name="call-outline" size={15} color={theme.primary} />
                <Text style={[styles.phoneText, { color: theme.text }]}>{phone}</Text>
              </View>

              {/* OTP Input */}
              <TextInput
                style={[styles.otpInput, { 
                  backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
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

              {/* Resend Timer */}
              <View style={styles.timerRow}>
                {countdown > 0 ? (
                  <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                    {t('resend_in') || 'Resend code in'}{' '}
                    <Text style={{ color: theme.primary, fontWeight: '700' }}>{countdown}s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResend} disabled={resending}>
                    <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>
                      {resending ? 'Sending code...' : (t('resend_otp') || 'Resend OTP Code')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.verifyBtn,
                  { backgroundColor: theme.primary },
                  otp.trim().length < 4 && { opacity: 0.6 }
                ]}
                onPress={handleVerify}
                disabled={loading || otp.trim().length < 4}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.verifyBtnText}>
                    {t('verify_and_signup') || 'Verify & Complete'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  avoidingView: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
    width: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    zIndex: 10,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 20,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  otpInput: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 10,
    textAlign: 'center',
    marginBottom: 14,
  },
  timerRow: {
    marginBottom: 20,
    alignItems: 'center',
  },
  verifyBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});

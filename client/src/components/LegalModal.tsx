import React, { useState, useContext, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useTranslation } from '../i18n';

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'TERMS' | 'PRIVACY';
}

export default function LegalModal({ visible, onClose, initialTab = 'TERMS' }: LegalModalProps) {
  const { theme, isDark } = useContext(ThemeContext);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'TERMS' | 'PRIVACY'>(initialTab);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  const handleEmailSupport = () => {
    Linking.openURL('mailto:legal@vetgo.app?subject=VetGo%20Legal%20%26%20Privacy%20Inquiry');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header Bar */}
        <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.headerLeft}>
            <Ionicons
              name={activeTab === 'TERMS' ? 'document-text-outline' : 'shield-checkmark-outline'}
              size={22}
              color={theme.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {activeTab === 'TERMS' 
                ? (t('terms_and_conditions') || 'Terms & Conditions')
                : (t('privacy_policy') || 'Privacy Policy')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Segmented Tab Switcher */}
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'TERMS' && [styles.tabItemActive, { borderBottomColor: theme.primary }]
            ]}
            onPress={() => setActiveTab('TERMS')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'TERMS' ? theme.primary : theme.textSecondary, fontWeight: activeTab === 'TERMS' ? '700' : '500' }
              ]}
            >
              {t('terms_and_conditions') || 'Terms of Service'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'PRIVACY' && [styles.tabItemActive, { borderBottomColor: theme.primary }]
            ]}
            onPress={() => setActiveTab('PRIVACY')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'PRIVACY' ? theme.primary : theme.textSecondary, fontWeight: activeTab === 'PRIVACY' ? '700' : '500' }
              ]}
            >
              {t('privacy_policy') || 'Privacy Policy'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Legal Document Body */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Compliance Badge */}
          <View style={[styles.badgeContainer, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: theme.border }]}>
            <Feather name="shield" size={14} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.badgeText, { color: theme.textSecondary }]}>
              DPDP Act 2023 • IT Act Section 79 • AES-256-GCM Encrypted
            </Text>
          </View>

          {activeTab === 'TERMS' ? (
            <View>
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                Effective Date: September 10, 2026 • Legal Charter v1.0
              </Text>

              <Text style={[styles.sectionHeading, { color: theme.primary }]}>
                1. Agreement to Terms
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                By downloading, accessing, registering, or using VetGo, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you must cease using the platform immediately.
              </Text>

              <Text style={[styles.sectionHeading, { color: theme.primary }]}>
                2. Platform Role & Medical Disclaimer (Section 79 Safe Harbor)
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                • <Text style={{ fontWeight: '700' }}>Intermediary Status (Section 79 IT Act 2000):</Text> VetGo functions strictly as a technology intermediary facilitating real-time spatial matching between animal rescuers/pet owners and independent certified veterinarians. VetGo is not a veterinary hospital.
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                • <Text style={{ fontWeight: '700' }}>Independent Medical Judgment:</Text> Clinical examination, surgery, diagnosis, and medications are the sole professional responsibility of the attending licensed veterinarian.
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                • <Text style={{ fontWeight: '700' }}>Good Samaritan Immunity:</Text> Rescuers reporting street animal emergencies in good faith are protected under PCA Act guidelines from clinical liabilities beyond agreed emergency parameters.
              </Text>

              <Text style={[styles.sectionHeading, { color: theme.primary }]}>
                3. User & Doctor Obligations
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                • <Text style={{ fontWeight: '700' }}>Anti-Hoax Policy:</Text> Broadcasting fake or non-emergency requests is strictly prohibited and subject to immediate permanent banning and legal reporting.
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                • <Text style={{ fontWeight: '700' }}>Doctor Licensure:</Text> Attending doctors must hold a recognized B.V.Sc & A.H. degree and maintain active state veterinary council registration.
              </Text>

              <Text style={[styles.sectionHeading, { color: theme.primary }]}>
                4. The 3-Strike Moderation & Safety Rule
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                To eliminate malpractice and fee extortion, VetGo enforces a strict 3-Strike Rule. Users or Doctors accumulating <Text style={{ fontWeight: '700', color: '#EF4444' }}>3 verified strikes</Text> will have their accounts immediately and permanently deactivated.
              </Text>

              <Text style={[styles.sectionHeading, { color: theme.primary }]}>
                5. Pricing & Cancellation
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                Emergency call-out fees are displayed transparently before broadcast. Rescuers may cancel free of charge prior to doctor acceptance. Standard travel compensation applies once the doctor is in-transit.
              </Text>

              <Text style={[styles.sectionHeading, { color: theme.primary }]}>
                6. Governing Law & Dispute Resolution
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                These Terms are governed by the laws of India. All disputes are subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka.
              </Text>
            </View>
          ) : (
            <View>
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                Effective Date: September 10, 2026 • DPDP Act 2023 & App Store Compliant
              </Text>

              <Text style={[styles.sectionHeading, { color: theme.primary }]}>
                1. Data Safety & Collected Information
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                • <Text style={{ fontWeight: '700' }}>Location (Precise GPS):</Text> Collected strictly for sub-second nearest veterinarian dispatching and live route telemetry.
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                • <Text style={{ fontWeight: '700' }}>Personal Identifiers:</Text> Name, phone number, and optional email for authentication and on-route contact.
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                • <Text style={{ fontWeight: '700' }}>Photos & Medical Documents:</Text> Trauma photos for pre-arrival triage; degree proofs for doctor license verification.
              </Text>

              <Text style={[styles.sectionHeading, { color: theme.primary }]}>
                2. Enterprise Cryptography & Privacy Protection
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                • <Text style={{ fontWeight: '700' }}>AES-256-GCM AEAD Encryption:</Text> Phone numbers are encrypted at rest with hardware-accelerated OpenSSL primitives using unique 12-byte IVs and 16-byte authentication tags.
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                • <Text style={{ fontWeight: '700' }}>Zero-Knowledge Contact Shielding:</Text> Contact info is decrypted in-memory on the server only when the assigned doctor actively accepts the emergency rescue.
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                • <Text style={{ fontWeight: '700' }}>Binary Magic-Byte Inspection:</Text> Uploaded files are verified at the byte level (`%PDF-`, `0xFFD8FF`, `0x89504E47`, `RIFF...WEBP`) to block disguised scripts.
              </Text>

              <Text style={[styles.sectionHeading, { color: theme.primary }]}>
                3. Sub-Processors & Zero-Monetization
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                We never sell or monetize your personal data. Secure operational sub-processors include MongoDB Atlas (Encrypted DB), Firebase Auth (SMS OTP), and Google Neural Translation (7 Indic Languages).
              </Text>

              <Text style={[styles.sectionHeading, { color: theme.primary }]}>
                4. Statutory User Rights (DPDP Act 2023)
              </Text>
              <Text style={[styles.paragraph, { color: theme.text }]}>
                You retain full statutory rights to access, correct, or permanently erase your account data at any time via the in-app account deletion button (`/api/auth/delete-account`).
              </Text>
            </View>
          )}

          {/* Contact Support Footer */}
          <View style={[styles.contactCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactTitle, { color: theme.text }]}>Grievance & Data Protection Officer</Text>
              <Text style={[styles.contactSub, { color: theme.textSecondary }]}>SLA: 24h Acknowledgment • 7-day Resolution</Text>
            </View>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: theme.primary }]}
              onPress={handleEmailSupport}
            >
              <Feather name="mail" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.contactBtnText}>Email Legal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom Action Button */}
        <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: theme.primary }]}
            onPress={onClose}
          >
            <Text style={styles.doneButtonText}>I Understand & Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 12,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
    marginBottom: 10,
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  contactSub: {
    fontSize: 11,
    marginTop: 2,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
  },
  doneButton: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

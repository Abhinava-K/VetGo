import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WarningStrikeModalProps {
  visible: boolean;
  warning: any;
  strikeNumber: number;
  totalStrikes: number;
  onAcknowledge: (warningId: string) => Promise<void>;
}

export default function WarningStrikeModal({
  visible,
  warning,
  strikeNumber,
  totalStrikes,
  onAcknowledge
}: WarningStrikeModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!warning) return null;

  const reportObj = typeof warning.reportId === 'object' ? warning.reportId : null;

  const formatCategory = (cat: string) => {
    if (!cat) return 'Conduct Misconduct';
    const categoryMap: { [key: string]: string } = {
      SPAM_FAKE_EMERGENCY: 'Fake Emergency / Spam',
      USER_NO_SHOW: 'User No-Show',
      OFFENSIVE_PHOTO: 'Offensive Photo / Content',
      USER_HARASSMENT: 'Abusive / Harassing Behavior',
      RETALIATORY_FEEDBACK: 'Unfair / Fake Review',
      DOCTOR_NO_SHOW_LATE: 'Doctor No-Show / Late',
      RUDE_UNPROFESSIONAL: 'Rude / Unprofessional Service',
      OVERCHARGING: 'Overcharging Dispute',
      MEDICAL_NEGLIGENCE: 'Medical Negligence',
      UNAUTHORIZED_CONTACT: 'Post-Service Harassment',
      OTHER: 'General Conduct Issue',
    };
    return categoryMap[cat] || cat.replace(/_/g, ' ');
  };

  const handlePressAcknowledge = async () => {
    setSubmitting(true);
    try {
      await onAcknowledge(warning._id);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to acknowledge warning strike');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      hardwareAccelerated={true}
    >
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Banner */}
          <View style={styles.banner}>
            <Ionicons name="alert-triangle" size={64} color="#FFF" />
            <Text style={styles.bannerTitle}>OFFICIAL WARNING</Text>
            <View style={styles.strikeBadge}>
              <Text style={styles.strikeBadgeText}>
                Strike {strikeNumber} of {totalStrikes}
              </Text>
            </View>
          </View>

          {/* Main Notice Box */}
          <View style={styles.contentCard}>
            <Text style={styles.noticeHeading}>Account Notice</Text>
            <Text style={styles.noticeBody}>
              An official warning strike has been issued against your VetGo account by the administration team due to a verified safety or conduct report.
            </Text>

            {/* Warning Details Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>REASON / ADMIN MESSAGE:</Text>
              <Text style={styles.detailValue}>{warning.reason || 'Misconduct in violation of community terms.'}</Text>
            </View>

            {reportObj && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>REPORT CATEGORY:</Text>
                <Text style={styles.detailTag}>{formatCategory(reportObj.category)}</Text>

                {reportObj.description ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.detailLabel}>REPORT DETAILS:</Text>
                    <Text style={styles.detailValue}>{reportObj.description}</Text>
                  </View>
                ) : null}
              </View>
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>DATE ISSUED:</Text>
              <Text style={styles.detailValue}>
                {new Date(warning.issuedAt || Date.now()).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>

            {/* Warning Terms Note */}
            <View style={styles.termsBox}>
              <Ionicons name="information-circle" size={20} color="#B91C1C" style={{ marginRight: 8 }} />
              <Text style={styles.termsText}>
                Repeated warning strikes may result in permanent termination of your VetGo account. Please review our community guidelines to maintain active standing.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Footer Action Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.acknowledgeBtn, submitting && { opacity: 0.7 }]}
            onPress={handlePressAcknowledge}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.acknowledgeBtnText}>I Understand & Agree to Rules</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  banner: {
    backgroundColor: '#DC2626',
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1.5,
    marginTop: 10,
  },
  strikeBadge: {
    backgroundColor: '#991B1B',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 12,
  },
  strikeBadgeText: {
    color: '#FEF2F2',
    fontWeight: 'bold',
    fontSize: 13,
  },
  contentCard: {
    backgroundColor: '#1E293B',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noticeHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  noticeBody: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailSection: {
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#F1F5F9',
    fontWeight: '500',
    lineHeight: 18,
  },
  detailTag: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  termsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#451A03',
    borderColor: '#78350F',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#FDE68A',
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  acknowledgeBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acknowledgeBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

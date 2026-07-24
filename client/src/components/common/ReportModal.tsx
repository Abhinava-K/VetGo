import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  requestId: string;
  reportedUserId?: string;
  reporterRole: 'USER' | 'DOCTOR';
  isPostService?: boolean;
  onSuccess?: () => void;
}

export default function ReportModal({
  visible,
  onClose,
  requestId,
  reportedUserId,
  reporterRole,
  isPostService = false,
  onSuccess,
}: ReportModalProps) {
  const { theme } = useContext(ThemeContext);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [existingReport, setExistingReport] = useState<any>(null);

  React.useEffect(() => {
    if (visible && requestId) {
      checkExistingReport();
    } else if (!visible) {
      setExistingReport(null);
      setSelectedCategory('');
      setDescription('');
    }
  }, [visible, requestId]);

  const checkExistingReport = async () => {
    setChecking(true);
    try {
      const res = await api.get(`/reports/check/${requestId}`);
      if (res.data?.hasReported) {
        setExistingReport(res.data.report);
      } else {
        setExistingReport(null);
      }
    } catch (err) {
      console.error('Error checking report status:', err);
    } finally {
      setChecking(false);
    }
  };

  const getCategories = () => {
    if (reporterRole === 'USER') {
      if (isPostService) {
        return [
          { key: 'UNAUTHORIZED_CONTACT', label: '📱 Post-Service Harassment / Spam' },
          { key: 'MEDICAL_NEGLIGENCE', label: '🩺 Medical Negligence / Care Concern' },
          { key: 'RUDE_UNPROFESSIONAL', label: '🗣️ Rude or Unprofessional Conduct' },
          { key: 'OVERCHARGING', label: '💰 Overcharging / Billing Dispute' },
          { key: 'OTHER', label: '📝 Other Issue...' },
        ];
      } else {
        return [
          { key: 'DOCTOR_NO_SHOW_LATE', label: '⏰ Doctor No-Show / Extremely Late' },
          { key: 'RUDE_UNPROFESSIONAL', label: '🗣️ Rude or Unprofessional Conduct' },
          { key: 'OVERCHARGING', label: '💰 Overcharging / Cash Extortion' },
          { key: 'OTHER', label: '📝 Other Issue...' },
        ];
      }
    } else {
      return [
        { key: 'SPAM_FAKE_EMERGENCY', label: '🚨 Fake Emergency / Spam Broadcast' },
        { key: 'USER_NO_SHOW', label: '🚫 User No-Show / Unresponsive' },
        { key: 'OFFENSIVE_PHOTO', label: '🖼️ Offensive / Inappropriate Photo' },
        { key: 'USER_HARASSMENT', label: '🗣️ Abusive / Harassing Behavior' },
        { key: 'RETALIATORY_FEEDBACK', label: '😡 Fake 1-Star Review / Unfair Rating' },
        { key: 'OTHER', label: '📝 Other Issue...' },
      ];
    };
  };

  const categories = getCategories();

  const isOther = selectedCategory === 'OTHER';
  const descLength = description.trim().length;
  const isSubmitDisabled = !selectedCategory || (isOther && descLength < 30) || loading;

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Category Required', 'Please select a report category.');
      return;
    }

    if (isOther && descLength < 30) {
      Alert.alert('Explanation Required', 'When selecting "Other", please enter a detailed explanation of at least 30 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/reports', {
        requestId,
        reportedId: reportedUserId,
        category: selectedCategory,
        description: description.trim(),
      });

      const newReport = res.data?.report;

      Alert.alert(
        'Report Submitted Successfully',
        'Your safety report has been logged and submitted to our management team for admin review.',
        [{
          text: 'OK', onPress: () => {
            if (newReport) {
              setExistingReport(newReport);
            } else {
              checkExistingReport();
            }
            if (onSuccess) onSuccess();
          }
        }]
      );
    } catch (error: any) {
      console.error('Report submission error:', error);
      Alert.alert('Notice', error.response?.data?.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory('');
    setDescription('');
    setExistingReport(null);
    onClose();
  };

  const formatCategoryLabel = (catKey: string) => {
    const matched = categories.find(c => c.key === catKey);
    if (matched) return matched.label;
    return catKey.replace(/_/g, ' ');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalBox, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="flag" size={22} color="#f70d0dff" style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: theme.text }]}>
                {existingReport ? 'Safety Report Status' : 'Report Safety Issue'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          {checking ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={{ marginTop: 12, color: theme.textSecondary }}>Checking report status...</Text>
            </View>
          ) : existingReport ? (
            /* REPORT STATUS & RESPONSE VIEW */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {/* Yellow Under Review Box */}
              <View style={[styles.statusBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons
                    name={existingReport.status === 'PENDING' ? 'time' : existingReport.status === 'RESOLVED' ? 'checkmark-circle' : 'archive'}
                    size={20}
                    color="#000000"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{ fontWeight: '800', fontSize: 14, color: '#000000' }}>
                    {existingReport.status === 'PENDING'
                      ? 'Report Under Review'
                      : existingReport.status === 'RESOLVED'
                        ? 'Report Resolved & Action Taken'
                        : 'Report Reviewed & Closed'}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: '#000000', lineHeight: 18, fontWeight: '500' }}>
                  {existingReport.status === 'PENDING'
                    ? 'Your report has been received and is currently under active investigation by our safety & operations management team.'
                    : existingReport.status === 'RESOLVED'
                      ? 'Our management team completed the review and enforced appropriate corrective action on the reported user.'
                      : 'Our management team reviewed your report and closed this issue.'}
                </Text>
              </View>

              {/* Submitted Report Details */}
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                SUBMITTED REPORT DETAILS
              </Text>

              <View style={[styles.detailCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Category:</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {formatCategoryLabel(existingReport.category)}
                </Text>

                {existingReport.description ? (
                  <>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary, marginTop: 10 }]}>Details Provided:</Text>
                    <Text style={[styles.detailValue, { color: theme.text, fontStyle: 'italic' }]}>
                      "{existingReport.description}"
                    </Text>
                  </>
                ) : null}

                <Text style={[styles.detailLabel, { color: theme.textSecondary, marginTop: 10 }]}>Logged At:</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  {new Date(existingReport.createdAt).toLocaleString()}
                </Text>
              </View>

              {/* Management Response Note (if available) */}
              {existingReport.adminNotes ? (
                <View style={[styles.adminNoteBox, { backgroundColor: `${theme.primary}12`, borderColor: theme.primary, marginTop: 14 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="chatbox-ellipses" size={18} color={theme.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.adminNoteTitle, { color: theme.primary }]}>
                      Management Response Note:
                    </Text>
                  </View>
                  <Text style={[styles.adminNoteText, { color: theme.text }]}>
                    {existingReport.adminNotes}
                  </Text>
                </View>
              ) : null}

              {/* Blurred Out Non-Functional Report Button */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC', borderWidth: 1, opacity: 0.9, marginTop: 24 }]}
                disabled={true}
              >
                <View style={{ backgroundColor: '#16A34A', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                  <Ionicons name="checkmark-sharp" size={13} color="#FFFFFF" />
                </View>
                <Text style={[styles.submitBtnText, { color: '#15803D', fontWeight: 'bold' }]}>Report Already Sent ✓</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* NEW REPORT FORM */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                SELECT REPORT REASON
              </Text>

              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? `${theme.primary}15` : theme.background,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat.key)}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? theme.primary : theme.text }]}>
                      {cat.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Description Text Input */}
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 16 }]}>
                ADDITIONAL DETAILS
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: isOther && descLength < 30 && selectedCategory ? '#EF4444' : theme.border,
                  },
                ]}
                placeholder={
                  isOther
                    ? 'Please describe the safety issue in detail (min 30 characters required)...'
                    : 'Add any relevant context or details...'
                }
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                maxLength={500}
              />

              {isOther && (
                <Text
                  style={[
                    styles.charCounter,
                    { color: descLength >= 30 ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {descLength}/30 minimum characters required
                </Text>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: isSubmitDisabled ? '#9CA3AF' : '#EF4444',
                  },
                ]}
                onPress={handleSubmit}
                disabled={isSubmitDisabled}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Submit Safety Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    paddingVertical: 16,
    paddingBottom: 30,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  charCounter: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  submitBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  alreadyReportedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  statusBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  adminNoteBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  adminNoteTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  adminNoteText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    fontWeight: '500',
  },
  detailCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
});

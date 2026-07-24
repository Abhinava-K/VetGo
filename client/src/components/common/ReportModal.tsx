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
      if (isPostService) {
        return [
          { key: 'RETALIATORY_FEEDBACK', label: '😡 Retaliatory Feedback / Rating Extortion' },
          { key: 'USER_HARASSMENT', label: '🗣️ Abusive / Harassing Behavior' },
          { key: 'OTHER', label: '📝 Other Issue...' },
        ];
      } else {
        return [
          { key: 'SPAM_FAKE_EMERGENCY', label: '🚨 Fake Emergency / Spam Broadcast' },
          { key: 'USER_NO_SHOW', label: '🚫 User No-Show / Unresponsive' },
          { key: 'OFFENSIVE_PHOTO', label: '🖼️ Offensive / Inappropriate Photo' },
          { key: 'UNSAFE_LOCATION', label: '⚠️ Unsafe / Hazardous Location' },
          { key: 'USER_HARASSMENT', label: '🗣️ Abusive / Harassing Behavior' },
          { key: 'OTHER', label: '📝 Other Issue...' },
        ];
      }
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
      await api.post('/reports', {
        requestId,
        reportedId: reportedUserId,
        category: selectedCategory,
        description: description.trim(),
      });

      Alert.alert(
        'Report Submitted',
        'Thank you. Your report has been submitted to our safety moderation team for admin review.',
        [{ text: 'OK', onPress: () => {
          setSelectedCategory('');
          setDescription('');
          onClose();
          if (onSuccess) onSuccess();
        }}]
      );
    } catch (error: any) {
      console.error('Report submission error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory('');
    setDescription('');
    onClose();
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
              <Ionicons name="flag-outline" size={22} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={[styles.title, { color: theme.text }]}>Report Safety Issue</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

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
});

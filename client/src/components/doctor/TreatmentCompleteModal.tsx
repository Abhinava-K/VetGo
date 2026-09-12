import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';
import api from '../../services/api';

interface MedicineRow {
  medicineName: string;
  dosage: string;
  description: string;
}

interface TreatmentCompleteModalProps {
  visible: boolean;
  onClose: () => void;
  requestId: string;
  onSuccess: () => void;
}

export default function TreatmentCompleteModal({
  visible,
  onClose,
  requestId,
  onSuccess,
}: TreatmentCompleteModalProps) {
  const { theme, isDark } = useContext(ThemeContext);
  const { t } = useTranslation();

  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const addMedicineRow = () => {
    setMedicines(prev => [
      ...prev,
      { medicineName: '', dosage: '', description: '' },
    ]);
  };

  const removeMedicineRow = (index: number) => {
    setMedicines(prev => prev.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, field: keyof MedicineRow, value: string) => {
    setMedicines(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async () => {
    const trimmedNotes = doctorNotes.trim();
    if (trimmedNotes.length < 20) {
      Alert.alert(
        t('error') || 'Error',
        t('doctor_notes_min_error') || 'Doctor clinical notes must be at least 20 characters long.'
      );
      return;
    }

    // Validate that every added medicine row has all 3 fields filled
    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      const missing: string[] = [];
      if (!med.medicineName.trim()) missing.push(t('medicine_name') || 'Medicine Name');
      if (!med.dosage.trim()) missing.push(t('dosage') || 'Dosage');
      if (!med.description.trim()) missing.push(t('instructions_description') || 'Description');

      if (missing.length > 0) {
        Alert.alert(
          t('error') || 'Incomplete Medication',
          `Please fill in ${missing.join(', ')} for Medication #${i + 1}, or tap the trash icon to remove it.`
        );
        return;
      }
    }

    const cleanMedicines = medicines.map(m => ({
      medicineName: m.medicineName.trim(),
      dosage: m.dosage.trim(),
      description: m.description.trim(),
    }));

    setLoading(true);
    try {
      await api.post(`/requests/${requestId}/treatment-complete`, {
        prescriptions: cleanMedicines,
        doctorNotes: trimmedNotes,
      });

      Alert.alert(
        t('success') || 'Success',
        t('treatment_submitted_sub') || 'Treatment submitted! Awaiting pet owner review & rating.'
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error submitting treatment:', error);
      Alert.alert(
        t('error') || 'Error',
        error.response?.data?.message || 'Failed to submit treatment'
      );
    } finally {
      setLoading(false);
    }
  };

  const notesLength = doctorNotes.trim().length;
  const isNotesValid = notesLength >= 20;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.iconBadge, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="medkit" size={20} color="#10B981" />
              </View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {t('complete_treatment_btn')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Prescribed Medications Section */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t('prescriptions_label')} ({medicines.length})
              </Text>
              <TouchableOpacity
                style={[styles.addMedBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
                onPress={addMedicineRow}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={[styles.addMedBtnText, { color: theme.primary }]}>
                  {t('add_medicine')}
                </Text>
              </TouchableOpacity>
            </View>

            {medicines.length === 0 ? (
              <View style={[styles.emptyPromptBox, { backgroundColor: isDark ? '#1e293b' : '#F8FAFC', borderColor: theme.border }]}>
                <Ionicons name="medical-outline" size={28} color={theme.textSecondary} />
                <Text style={[styles.emptyPromptText, { color: theme.textSecondary }]}>
                  No medications added yet. Tap "{t('add_medicine')}" if writing a prescription.
                </Text>
              </View>
            ) : (
              medicines.map((med, index) => (
                <View 
                  key={index} 
                  style={[styles.medItemCard, { backgroundColor: isDark ? '#1e293b' : '#F8FAFC', borderColor: theme.border }]}
                >
                  <View style={styles.medItemHeader}>
                    <Text style={[styles.medIndexLabel, { color: theme.primary }]}>
                      #{index + 1} {t('medication') || 'Medication'}
                    </Text>
                    <TouchableOpacity onPress={() => removeMedicineRow(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                    placeholder={t('enter_medicine_name') || "Medicine name, eg. Meloxicam 250mg syrup"}
                    placeholderTextColor={theme.textSecondary}
                    value={med.medicineName}
                    onChangeText={v => updateMedicine(index, 'medicineName', v)}
                    multiline={true}
                    scrollEnabled={false}
                    textAlignVertical="top"
                  />

                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                    placeholder={t('enter_dosage') || "Dosage, eg. 5ml oral"}
                    placeholderTextColor={theme.textSecondary}
                    value={med.dosage}
                    onChangeText={v => updateMedicine(index, 'dosage', v)}
                    multiline={true}
                    scrollEnabled={false}
                    textAlignVertical="top"
                  />

                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                    placeholder={t('enter_instructions') || "Description, eg. give after 5 days"}
                    placeholderTextColor={theme.textSecondary}
                    value={med.description}
                    onChangeText={v => updateMedicine(index, 'description', v)}
                    multiline={true}
                    scrollEnabled={false}
                    textAlignVertical="top"
                  />
                </View>
              ))
            )}

            {/* Mandatory Clinical Notes Section */}
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t('doctor_clinical_notes')} <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <Text style={[styles.charCountText, { color: isNotesValid ? '#10B981' : '#EF4444' }]}>
                {notesLength} / 20 min chars
              </Text>
            </View>

            <TextInput
              style={[
                styles.notesInput,
                { 
                  backgroundColor: theme.surface, 
                  color: theme.text, 
                  borderColor: isNotesValid ? '#10B981' : theme.border 
                }
              ]}
              placeholder={t('clinical_notes_placeholder')}
              placeholderTextColor={theme.textSecondary}
              value={doctorNotes}
              onChangeText={setDoctorNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Action Buttons */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: '#10B981' },
                (!isNotesValid || loading) && { opacity: 0.6 }
              ]}
              onPress={handleSubmit}
              disabled={!isNotesValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="checkmark-done-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>
                    {t('complete_treatment_btn')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  addMedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  emptyPromptBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPromptText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  medItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  medItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medIndexLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  charCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  notesInput: {
    height: 100,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

import React, { useContext } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { useTranslation } from '../../i18n';
import TranslatedText from './TranslatedText';

export interface PrescriptionItem {
  medicineName: string;
  dosage: string;
  description?: string;
}

interface PrescriptionEmbedCardProps {
  prescriptions?: PrescriptionItem[];
  doctorNotes?: string;
}

export default function PrescriptionEmbedCard({
  prescriptions = [],
  doctorNotes = ''
}: PrescriptionEmbedCardProps) {
  const { theme, isDark } = useContext(ThemeContext);
  const { t } = useTranslation();

  const hasPrescriptions = Array.isArray(prescriptions) && prescriptions.length > 0;
  const hasDoctorNotes = typeof doctorNotes === 'string' && doctorNotes.trim().length > 0;

  if (!hasPrescriptions && !hasDoctorNotes) {
    return null;
  }

  const borderColor = isDark ? '#1e3a29' : '#bbf7d0';
  const tableBorderColor = isDark ? '#334155' : '#cbd5e1';
  const headerBg = isDark ? '#1e293b' : '#f1f5f9';

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#0b1320' : '#f0fdf4', borderColor }]}>
      {/* Header Banner */}
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: '#10b98125' }]}>
          <Ionicons name="medical" size={18} color="#10b981" />
        </View>
        <Text style={[styles.cardHeading, { color: isDark ? '#4ade80' : '#15803d' }]}>
          {t('prescription_treatment_plan') || 'Prescription & Treatment Plan'}
        </Text>
      </View>

      {/* Medications Table Section */}
      <View style={styles.sectionBlock}>
        <View style={styles.subHeadingRow}>
          <Ionicons name="fitness" size={14} color={isDark ? '#86efac' : '#166534'} />
          <Text style={[styles.subHeading, { color: isDark ? '#86efac' : '#166534' }]}>
            {t('prescriptions_label') || 'Prescribed Medications'}
          </Text>
        </View>

        {hasPrescriptions ? (
          <View style={[styles.tableContainer, { borderColor: tableBorderColor }]}>
            {/* Table Header with 3 distinct divided columns */}
            <View style={[styles.tableHeaderRow, { backgroundColor: headerBg }]}>
              <View style={[styles.colHeaderBox, { flex: 1.3, borderRightWidth: 1, borderRightColor: tableBorderColor }]}>
                <Text style={[styles.colHeaderText, { color: theme.text }]} numberOfLines={1}>
                  {t('medicine_name') || 'Medicine'}
                </Text>
              </View>
              <View style={[styles.colHeaderBox, { flex: 1.0, borderRightWidth: 1, borderRightColor: tableBorderColor }]}>
                <Text style={[styles.colHeaderText, { color: theme.text }]} numberOfLines={1}>
                  {t('dosage') || 'Dosage'}
                </Text>
              </View>
              <View style={[styles.colHeaderBox, { flex: 1.4 }]}>
                <Text style={[styles.colHeaderText, { color: theme.text }]} numberOfLines={1}>
                  {t('instructions_description') || 'Instructions'}
                </Text>
              </View>
            </View>

            {/* Table Data Rows */}
            {prescriptions.map((item, index) => (
              <View 
                key={index} 
                style={[
                  styles.tableDataRow, 
                  { 
                    backgroundColor: index % 2 === 0 ? (isDark ? '#0f172a' : '#ffffff') : (isDark ? '#1e293b40' : '#f8fafc'),
                    borderTopWidth: 1,
                    borderTopColor: tableBorderColor,
                  }
                ]}
              >
                {/* Column 1: Medicine Name */}
                <View style={[styles.cellBox, { flex: 1.3, borderRightWidth: 1, borderRightColor: tableBorderColor }]}>
                  <Text style={[styles.medNameText, { color: theme.text }]}>
                    {item.medicineName}
                  </Text>
                </View>

                {/* Column 2: Dosage */}
                <View style={[styles.cellBox, { flex: 1.0, borderRightWidth: 1, borderRightColor: tableBorderColor }]}>
                  <View style={[styles.dosagePill, { backgroundColor: isDark ? '#0369a130' : '#e0f2fe' }]}>
                    <Text style={[styles.dosageText, { color: isDark ? '#38bdf8' : '#0284c7' }]}>
                      {item.dosage || '—'}
                    </Text>
                  </View>
                </View>

                {/* Column 3: Instructions */}
                <View style={[styles.cellBox, { flex: 1.4 }]}>
                  <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
                    {item.description || '—'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyPrescriptionBox, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
            <Text style={[styles.emptyPrescriptionText, { color: theme.textSecondary }]}>
              {t('no_prescription_issued') || 'No specific medications prescribed for this visit.'}
            </Text>
          </View>
        )}
      </View>

      {/* Doctor Clinical Notes Block */}
      {hasDoctorNotes && (
        <View style={[styles.notesContainer, { backgroundColor: isDark ? '#141e2e' : '#ffffff', borderColor: isDark ? '#334155' : '#dcfce7' }]}>
          <View style={styles.notesHeaderRow}>
            <Ionicons name="document-text" size={15} color="#10b981" />
            <Text style={[styles.notesHeading, { color: isDark ? '#4ade80' : '#15803d' }]}>
              {t('doctor_clinical_notes') || "Doctor's Clinical Notes & Care Advice"}
            </Text>
          </View>
          <TranslatedText 
            text={doctorNotes} 
            style={[styles.notesText, { color: theme.text }]} 
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginVertical: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  sectionBlock: {
    marginBottom: 10,
    width: '100%',
  },
  subHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  subHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
  },
  colHeaderBox: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  colHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 42,
  },
  cellBox: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  medNameText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  dosagePill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  dosageText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  instructionText: {
    fontSize: 11,
    lineHeight: 15,
  },
  emptyPrescriptionBox: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyPrescriptionText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  notesContainer: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    width: '100%',
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notesHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
  },
});

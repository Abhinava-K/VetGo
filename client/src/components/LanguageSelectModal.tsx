import React, { useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES, changeAppLanguage, useTranslation } from '../i18n';
import { ThemeContext } from '../context/ThemeContext';

interface LanguageSelectModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function LanguageSelectModal({ visible, onClose }: LanguageSelectModalProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useContext(ThemeContext);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('select_language')}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle-outline" size={28} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {LANGUAGES.map((lang) => {
              const isSelected = i18n.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langOption,
                    {
                      borderColor: isSelected ? theme.primary : theme.border,
                      backgroundColor: isSelected ? `${theme.primary}15` : theme.background,
                    }
                  ]}
                  onPress={() => {
                    changeAppLanguage(lang.code);
                    onClose();
                  }}
                >
                  <View style={styles.langLeft}>
                    <Text style={styles.flagText}>{lang.flag}</Text>
                    <View>
                      <Text style={[styles.nativeText, { color: theme.text }]}>
                        {lang.native}
                      </Text>
                      <Text style={[styles.englishText, { color: theme.textSecondary }]}>
                        {lang.name}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagText: {
    fontSize: 24,
    marginRight: 14,
  },
  nativeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  englishText: {
    fontSize: 12,
  },
});

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
  const [langModalVisible, setLangModalVisible] = useState(false);

  const navigation = useNavigation<any>();
  const { theme } = useContext(ThemeContext);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newDocs = [...selectedDocs, ...result.assets].slice(0, 3);
        setSelectedDocs(newDocs);
      }
    } catch (err) {
      console.warn('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeDoc = (index: number) => {
    setSelectedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSignup = async () => {
    const { firstName, lastName, email, password, phone, qualifications } = formData;
    if (!firstName || !lastName || !email || !password || !phone || !qualifications) {
      Alert.alert('Error', t('please_fill_fields'));
      return;
    }
    if (selectedDocs.length === 0) {
      Alert.alert('Error', 'Please upload at least one degree certification or ID proof document.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('firstName', firstName);
      data.append('lastName', lastName);
      data.append('email', email);
      data.append('password', password);
      data.append('phone', phone);
      data.append('qualifications', qualifications);

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
      
      Alert.alert(
        'Application Submitted', 
        'Your application is pending review. We will contact you soon.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error.response) {
        errorMessage = error.response.data?.message || `Server Error (${error.response.status}). Please try again later.`;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your internet connection or server status.';
      } else {
        errorMessage = error.message;
      }
      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            placeholder={t('qualifications_placeholder')}
            placeholderTextColor={theme.textSecondary}
            value={formData.qualifications}
            onChangeText={(v) => updateField('qualifications', v)}
            maxLength={140}
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder={t('email')}
            placeholderTextColor={theme.textSecondary}
            value={formData.email}
            onChangeText={(v) => updateField('email', v)}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder={t('phone_number')}
            placeholderTextColor={theme.textSecondary}
            value={formData.phone}
            onChangeText={(v) => updateField('phone', v)}
            keyboardType="phone-pad"
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder={t('password')}
            placeholderTextColor={theme.textSecondary}
            value={formData.password}
            onChangeText={(v) => updateField('password', v)}
            secureTextEntry
          />

          <View style={styles.uploadBox}>
            <Text style={{ color: theme.textSecondary, marginBottom: 10, fontWeight: 'bold' }}>
              {t('upload_docs_label')}
            </Text>
            <TouchableOpacity 
              style={[styles.uploadButton, { borderColor: theme.secondary, backgroundColor: `${theme.secondary}12` }]}
              onPress={pickDocuments}
            >
              <Text style={{ color: theme.secondary, fontWeight: 'bold' }}>{t('select_documents')}</Text>
            </TouchableOpacity>

            {selectedDocs.length > 0 && (
              <View style={styles.selectedFilesList}>
                {selectedDocs.map((doc, idx) => (
                  <View key={idx} style={[styles.selectedFileItem, { borderColor: theme.border }]}>
                    <Text style={{ color: theme.text, flex: 0.9 }} numberOfLines={1}>
                      {doc.name || `Document ${idx + 1}`}
                    </Text>
                    <TouchableOpacity onPress={() => removeDoc(idx)}>
                      <Text style={{ color: theme.error, fontWeight: 'bold' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.secondary }]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>{t('submit_application')}</Text>
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
    fontSize: 28,
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
  uploadBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    borderColor: '#CCC',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButton: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
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
    marginTop: 25,
    marginBottom: 40,
  },
  selectedFilesList: {
    width: '100%',
    marginTop: 15,
  },
  selectedFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
});

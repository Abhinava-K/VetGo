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
import * as DocumentPicker from 'expo-document-picker';
import api from '../../services/api';
import { ThemeContext } from '../../context/ThemeContext';

export default function SignupDoctorScreen() {
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
  const navigation = useNavigation<any>();
  const { theme } = useContext(ThemeContext);

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
      Alert.alert('Error', 'Please fill in all fields');
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

      selectedDocs.forEach((doc) => {
        data.append('docs', {
          uri: doc.uri,
          name: doc.name || 'document.pdf',
          type: doc.mimeType || 'application/pdf',
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
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.secondary }]}>Doctor Registration</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Join our network of veterinary professionals
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="First Name"
              placeholderTextColor={theme.textSecondary}
              value={formData.firstName}
              onChangeText={(v) => updateField('firstName', v)}
            />
            <TextInput
              style={[styles.input, styles.halfInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Last Name"
              placeholderTextColor={theme.textSecondary}
              value={formData.lastName}
              onChangeText={(v) => updateField('lastName', v)}
            />
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Qualifications (e.g. BVSc & AH, MVSc)"
            placeholderTextColor={theme.textSecondary}
            value={formData.qualifications}
            onChangeText={(v) => updateField('qualifications', v)}
            maxLength={140}
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            value={formData.email}
            onChangeText={(v) => updateField('email', v)}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Phone Number"
            placeholderTextColor={theme.textSecondary}
            value={formData.phone}
            onChangeText={(v) => updateField('phone', v)}
            keyboardType="phone-pad"
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            value={formData.password}
            onChangeText={(v) => updateField('password', v)}
            secureTextEntry
          />

          <View style={styles.uploadBox}>
            <Text style={{ color: theme.textSecondary, marginBottom: 10, fontWeight: 'bold' }}>
              Upload Degree Certifications / ID proof (Max 3)
            </Text>
            <TouchableOpacity 
              style={[styles.uploadButton, { borderColor: theme.secondary, backgroundColor: `${theme.secondary}12` }]}
              onPress={pickDocuments}
            >
              <Text style={{ color: theme.secondary, fontWeight: 'bold' }}>Select Documents</Text>
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
              <Text style={styles.buttonText}>Submit Application</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.footer} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={{ color: theme.textSecondary }}>Already have an account? </Text>
            <Text style={{ color: theme.secondary, fontWeight: 'bold' }}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 40,
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

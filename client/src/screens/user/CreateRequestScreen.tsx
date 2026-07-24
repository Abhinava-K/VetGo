import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';

export default function CreateRequestScreen() {
  const [description, setDescription] = useState('');
  const [animalCategory, setAnimalCategory] = useState<'PET' | 'STRAY'>('STRAY');
  const [petId, setPetId] = useState<string | undefined>(undefined);
  const [pets, setPets] = useState<any[]>([]);
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingPets, setFetchingPets] = useState(true);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { location, doctorId } = route.params || {};

  const insets = useSafeAreaInsets();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      const { data } = await api.get('/pets');
      setPets(data);
      if (data && data.length > 0) {
        setAnimalCategory('PET');
      }
    } catch (error) {
      console.error('Error fetching pets:', error);
    } finally {
      setFetchingPets(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Permission to access gallery is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() || 'injury.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      setPhoto({ uri: asset.uri, name: filename, type });
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Permission to access camera is required!');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() || 'injury.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      setPhoto({ uri: asset.uri, name: filename, type });
    }
  };

  const handleCreateRequest = async () => {
    if (!description || description.length < 10) {
      Alert.alert('Error', 'Please provide a more detailed description (min 10 chars)');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('location', JSON.stringify(location));
      if (animalCategory === 'PET' && petId) formData.append('petId', petId);
      formData.append('animalCategory', animalCategory);
      if (doctorId) formData.append('doctorId', doctorId);

      if (photo) {
        formData.append('photo', {
          uri: photo.uri,
          name: photo.name,
          type: photo.type,
        } as any);
      }

      const { data } = await api.post('/requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert('Success', 'Emergency broadcasted to nearby doctors!');
      navigation.navigate('RequestStatus', { requestId: data._id });
    } catch (error: any) {
      console.error('Create request error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create emergency request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { 
          paddingTop: Math.max(insets.top + 15, 30),
          paddingBottom: Math.max(insets.bottom + 20, 30)
        }
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.label, { color: theme.text }]}>What is the emergency?</Text>
      <TextInput
        style={[styles.textArea, { 
          backgroundColor: theme.surface, 
          color: theme.text,
          borderColor: theme.border 
        }]}
        placeholder="Describe the animal and condition (e.g., Dog injured in leg, bleeding...)"
        placeholderTextColor={theme.textSecondary}
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
        maxLength={400}
      />
      <Text style={[styles.charCount, { color: theme.textSecondary }]}>
        {description.length}/400
      </Text>

      {/* Injury Photo Section */}
      <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>
        Injury Photo for Pre-Medical Analysis
      </Text>
      <Text style={[styles.subLabel, { color: theme.textSecondary }]}>
        Help doctors evaluate the condition before responding
      </Text>

      {photo ? (
        <View style={[styles.photoPreviewContainer, { borderColor: theme.border }]}>
          <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
          <TouchableOpacity 
            style={styles.removePhotoBtn} 
            onPress={() => setPhoto(null)}
          >
            <Ionicons name="close-circle" size={26} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.photoPickerRow}>
          <TouchableOpacity 
            style={[styles.photoPickerBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={takePhoto}
          >
            <Ionicons name="camera-outline" size={24} color={theme.primary} />
            <Text style={[styles.photoPickerText, { color: theme.text }]}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.photoPickerBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={pickPhoto}
          >
            <Ionicons name="images-outline" size={24} color={theme.primary} />
            <Text style={[styles.photoPickerText, { color: theme.text }]}>Choose Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>Who is this emergency for?</Text>
      <View style={styles.categoryRow}>
        <TouchableOpacity 
          style={[
            styles.categoryBtn, 
            { 
              backgroundColor: animalCategory === 'PET' ? theme.primary : theme.surface, 
              borderColor: animalCategory === 'PET' ? theme.primary : theme.border 
            }
          ]}
          onPress={() => setAnimalCategory('PET')}
        >
          <Text style={{ color: animalCategory === 'PET' ? '#FFF' : theme.text, fontWeight: 'bold' }}>Owned Pet</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.categoryBtn, 
            { 
              backgroundColor: animalCategory === 'STRAY' ? theme.primary : theme.surface, 
              borderColor: animalCategory === 'STRAY' ? theme.primary : theme.border 
            }
          ]}
          onPress={() => {
            setAnimalCategory('STRAY');
            setPetId(undefined);
          }}
        >
          <Text style={{ color: animalCategory === 'STRAY' ? '#FFF' : theme.text, fontWeight: 'bold' }}>Stray / Street Animal</Text>
        </TouchableOpacity>
      </View>

      {animalCategory === 'PET' && (
        <>
          <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>Select Pet (Optional)</Text>
          {fetchingPets ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <View style={styles.petList}>
              {pets.map(pet => (
                <TouchableOpacity 
                  key={pet._id}
                  style={[
                    styles.petCard, 
                    { backgroundColor: theme.surface, borderColor: petId === pet._id ? theme.primary : theme.border }
                  ]}
                  onPress={() => setPetId(petId === pet._id ? undefined : pet._id)}
                >
                  <Text style={{ color: theme.text }}>{pet.name}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{pet.species}</Text>
                </TouchableOpacity>
              ))}
              {pets.length === 0 && (
                <Text style={{ color: theme.textSecondary, marginTop: 5 }}>No pets found. You can add one later.</Text>
              )}
            </View>
          )}
        </>
      )}

      <TouchableOpacity 
        style={[styles.submitBtn, { backgroundColor: theme.primary }]}
        onPress={handleCreateRequest}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitBtnText}>Broadcast Emergency Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  textArea: {
    height: 110,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    marginTop: 5,
  },
  photoPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  photoPickerBtn: {
    flex: 1,
    height: 70,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  photoPickerText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  photoPreviewContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 10,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
  },
  petList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  petCard: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 10,
    marginBottom: 10,
    minWidth: 100,
  },
  submitBtn: {
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    marginBottom: 15,
  },
  categoryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
});

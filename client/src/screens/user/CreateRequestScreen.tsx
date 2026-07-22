import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

export default function CreateRequestScreen() {
  const [description, setDescription] = useState('');
  const [animalCategory, setAnimalCategory] = useState<'PET' | 'STRAY'>('STRAY');
  const [petId, setPetId] = useState<string | undefined>(undefined);
  const [pets, setPets] = useState<any[]>([]);
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
      const { data } = await api.get('/pets'); // Need to implement this endpoint
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

  const handleCreateRequest = async () => {
    if (!description || description.length < 10) {
      Alert.alert('Error', 'Please provide a more detailed description (min 10 chars)');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/requests', {
        description,
        location,
        petId: animalCategory === 'PET' ? petId : undefined,
        animalCategory,
        doctorId
      });

      Alert.alert('Success', 'Request broadcasted to nearby doctors!');
      navigation.navigate('RequestStatus', { requestId: data._id });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create request');
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
    marginBottom: 10,
  },
  textArea: {
    height: 120,
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

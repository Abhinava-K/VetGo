import React, { useState, useContext, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';

export default function AddPetScreen() {
  const { theme } = useContext(ThemeContext);
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const petToEdit = route.params?.pet;
  const isEditing = !!petToEdit;

  const [name, setName] = useState(petToEdit?.name || '');
  const [species, setSpecies] = useState(petToEdit?.species || '');
  const [breed, setBreed] = useState(petToEdit?.breed || '');
  const [age, setAge] = useState(petToEdit?.age !== undefined && petToEdit?.age !== null ? String(petToEdit.age) : '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (petToEdit) {
      setName(petToEdit.name || '');
      setSpecies(petToEdit.species || '');
      setBreed(petToEdit.breed || '');
      setAge(petToEdit.age !== undefined && petToEdit.age !== null ? String(petToEdit.age) : '');
    }
  }, [petToEdit]);

  const handleSavePet = async () => {
    if (!name || !species) {
      Alert.alert('Error', 'Name and species are required.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await api.put(`/pets/${petToEdit._id}`, {
          name,
          species,
          breed,
          age: parseInt(age) || 0,
        });
        Alert.alert('Success', 'Pet updated successfully!');
      } else {
        await api.post('/pets', {
          name,
          species,
          breed,
          age: parseInt(age) || 0,
        });
        Alert.alert('Success', 'Pet added successfully!');
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || (isEditing ? 'Failed to update pet' : 'Failed to add pet'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.background,
        paddingTop: Math.max(insets.top, 20)
      }
    ]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {isEditing ? 'Edit Pet Details' : 'Add a New Pet'}
        </Text>
        <View style={{ width: 60 }} />
      </View>
      
      <View style={styles.form}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Pet Name (e.g. Buddy)"
          placeholderTextColor={theme.textSecondary}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Species (e.g. Dog, Cat)"
          placeholderTextColor={theme.textSecondary}
          value={species}
          onChangeText={setSpecies}
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Breed (Optional)"
          placeholderTextColor={theme.textSecondary}
          value={breed}
          onChangeText={setBreed}
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Age (Optional)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
        />

        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: theme.primary }]}
          onPress={handleSavePet}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>{isEditing ? 'Update Pet' : 'Save Pet'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    padding: 10,
    marginLeft: -10,
    width: 80,
  },
  backText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  form: {
    flex: 1,
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  submitBtn: {
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

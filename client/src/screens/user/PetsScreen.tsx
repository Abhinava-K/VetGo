import React, { useContext, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';

export default function PetsScreen() {
  const { theme } = useContext(ThemeContext);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchPets();
    }, [])
  );

  const fetchPets = async () => {
    try {
      const { data } = await api.get('/pets');
      setPets(data);
    } catch (error) {
      console.error('Error fetching pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPet = (pet: any) => {
    navigation.navigate('AddPet', { pet });
  };

  const handleDeletePet = (pet: any) => {
    Alert.alert(
      'Delete Pet',
      `Are you sure you want to delete ${pet.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/pets/${pet._id}`);
              Alert.alert('Success', `${pet.name} has been removed.`);
              fetchPets();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete pet');
            }
          },
        },
      ]
    );
  };

  const renderPet = ({ item }: { item: any }) => (
    <View style={[styles.petCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.avatarPlaceholder, { backgroundColor: theme.background }]}>
        <Ionicons name="paw" size={30} color={theme.primary} />
      </View>
      <View style={styles.petInfo}>
        <Text style={[styles.petName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.petDetails, { color: theme.textSecondary }]}>
          {item.species} {item.breed ? `• ${item.breed}` : ''} {item.age !== undefined && item.age !== null ? `• ${item.age} yrs` : ''}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditPet(item)}>
          <Ionicons name="create-outline" size={22} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeletePet(item)}>
          <Ionicons name="trash-outline" size={22} color="#E53935" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.background,
        paddingTop: Math.max(insets.top, 20)
      }
    ]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My Pets</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddPet')}>
          <Ionicons name="add-circle" size={32} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
      ) : pets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: theme.textSecondary }}>You haven't added any pets yet.</Text>
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.secondary }]}
            onPress={() => navigation.navigate('AddPet')}
          >
            <Text style={styles.btnText}>Add Your First Pet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item._id}
          renderItem={renderPet}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  petCard: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  petDetails: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 6,
    marginLeft: 6,
  }
});

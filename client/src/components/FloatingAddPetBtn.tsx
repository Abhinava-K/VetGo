import React, { useContext } from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';

export default function FloatingAddPetBtn() {
  const navigation = useNavigation<any>();
  const { theme } = useContext(ThemeContext);

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.secondary }]}
      onPress={() => navigation.navigate('AddPet')}
    >
      <View style={styles.plus}>
        <Text style={styles.text}>+</Text>
      </View>
      <Text style={styles.label}>Add Pet</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 120, // Above the main request button
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  plus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  text: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: -2,
  },
  label: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

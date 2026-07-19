import React, { useContext } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../../context/ThemeContext';

const STORE_PRODUCTS = [
  { id: '1', name: 'Premium Dog Food (15kg)', price: '$49.99', rating: '4.9', category: 'Nutrition' },
  { id: '2', name: 'Vet Formula Anti-Flea Shampoo', price: '$18.50', rating: '4.8', category: 'Grooming' },
  { id: '3', name: 'Calming Chew Supplements', price: '$24.00', rating: '4.7', category: 'Wellness' },
  { id: '4', name: 'Orthopedic Memory Foam Pet Bed', price: '$65.00', rating: '5.0', category: 'Comfort' },
];

export default function StoreScreen() {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>VetGo Store</Text>
        <TouchableOpacity style={[styles.cartBadge, { backgroundColor: theme.surface }]}>
          <Ionicons name="cart-outline" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, { backgroundColor: theme.primary }]}>
          <Ionicons name="sparkles" size={28} color="#FFF" style={{ marginBottom: 6 }} />
          <Text style={styles.bannerTitle}>Vet Recommended Care</Text>
          <Text style={styles.bannerSubtitle}>Get 20% off your first subscription order</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Popular Supplies</Text>

        <View style={styles.grid}>
          {STORE_PRODUCTS.map((prod) => (
            <View key={prod.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="bag-handle" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.category, { color: theme.primary }]}>{prod.category}</Text>
              <Text style={[styles.prodName, { color: theme.text }]} numberOfLines={2}>{prod.name}</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: theme.text }]}>{prod.price}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={[styles.ratingText, { color: theme.textSecondary }]}>{prod.rating}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  cartBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  banner: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  imagePlaceholder: {
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  category: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  prodName: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 4,
    height: 38,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 3,
  },
});

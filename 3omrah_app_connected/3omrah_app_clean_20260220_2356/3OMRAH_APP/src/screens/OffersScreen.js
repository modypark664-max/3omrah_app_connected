import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { radii, shadow, spacing, typography } from '../theme/ui';

const OffersScreen = ({ navigation, route }) => {
  const offers = route?.params?.offers || [];
  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.backButton}>
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.title}>{canGoBack ? 'كل العروض' : 'العروض'}</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={offers}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('OfferDetails', { offer: item })}
            accessibilityRole="button"
          >
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.meta}>
              <View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.days}</Text>
              </View>
              <View style={styles.price}>
                <Text style={styles.discounted}>{item.discountedPrice}</Text>
                <Text style={styles.original}>{item.originalPrice}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>لا توجد عروض حالياً.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: colors.primary,
    textAlign: 'center'
  },
  listContent: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
    ...shadow(1)
  },
  image: { width: '100%', height: 180 },
  meta: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: colors.primary,
    textAlign: 'right'
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'right'
  },
  price: { alignItems: 'flex-end' },
  discounted: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: colors.secondary
  },
  original: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: colors.muted,
    textDecorationLine: 'line-through',
    marginTop: 2
  },
  empty: { padding: 16, alignItems: 'center' },
  emptyText: { fontFamily: typography.medium, color: colors.muted }
});

export default OffersScreen;


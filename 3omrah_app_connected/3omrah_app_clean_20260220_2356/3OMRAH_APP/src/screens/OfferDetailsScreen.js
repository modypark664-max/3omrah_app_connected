import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { radii, shadow, spacing, typography } from '../theme/ui';

const OfferDetailsScreen = ({ navigation, route }) => {
  const offer = route?.params?.offer;
  const title = offer?.title || 'تفاصيل العرض';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.backButton}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        {offer?.image ? <Image source={{ uri: offer.image }} style={styles.image} /> : null}
        <View style={styles.card}>
          <Text style={styles.place}>{offer?.title || '—'}</Text>
          <Text style={styles.days}>{offer?.days || ''}</Text>

          <View style={styles.prices}>
            <Text style={styles.discounted}>{offer?.discountedPrice || ''}</Text>
            <Text style={styles.original}>{offer?.originalPrice || ''}</Text>
          </View>

          <TouchableOpacity
            style={styles.cta}
            onPress={() => navigation.navigate('Bundles', { screen: 'BundlesOverview' })}
            accessibilityRole="button"
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>احجز الآن</Text>
            <Ionicons name="chevron-back-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
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
    flex: 1,
    marginHorizontal: 12,
    fontSize: 18,
    fontFamily: typography.bold,
    color: colors.primary,
    textAlign: 'center'
  },
  content: { flex: 1 },
  image: { width: '100%', height: 240 },
  card: {
    marginTop: -18,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    flex: 1,
    ...shadow(1)
  },
  place: {
    fontSize: 22,
    fontFamily: typography.bold,
    color: colors.primary,
    textAlign: 'right'
  },
  days: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: typography.regular,
    color: colors.muted,
    textAlign: 'right'
  },
  prices: { marginTop: 16, alignItems: 'flex-end' },
  discounted: { fontSize: 20, fontFamily: typography.bold, color: colors.secondary },
  original: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: typography.regular,
    color: colors.muted,
    textDecorationLine: 'line-through'
  },
  cta: {
    marginTop: 18,
    backgroundColor: colors.secondary,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  ctaText: { fontSize: 14, fontFamily: typography.bold, color: '#fff' }
});

export default OfferDetailsScreen;


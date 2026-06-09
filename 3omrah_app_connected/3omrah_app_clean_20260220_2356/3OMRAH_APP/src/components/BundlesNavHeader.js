import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../theme/colors';

const ICON_COMPONENTS = {
  ion: Ionicons,
  material: MaterialCommunityIcons,
  fontawesome5: FontAwesome5
};

const NAV_ITEMS = [
  {
    key: 'external_tour',
    label: 'رحلات خارجية',
    subtitle: 'جولات عالمية',
    eyebrow: 'External',
    icon: 'airplane-outline'
  },
  {
    key: 'internal_tour',
    label: 'رحلات داخلية',
    subtitle: 'استكشف مصر',
    eyebrow: 'Internal',
    icon: 'train-outline'
  },
  {
    key: 'omrah',
    label: 'العمرة',
    subtitle: 'باقات روحانية',
    eyebrow: 'Umrah',
    icon: 'kaaba',
    iconSet: 'fontawesome5'
  },
  {
    key: '7ag',
    label: 'الحج',
    subtitle: 'برامج رسمية',
    eyebrow: 'Hajj',
    icon: 'kaaba',
    iconSet: 'fontawesome5'
  }
];

const BundlesNavHeader = ({ navigation, route, options, back }) => {
  const activeKey = useMemo(() => {
    if (!route) {
      return 'overview';
    }
    if (route.name === 'BundlesOverview') {
      return 'overview';
    }
    const candidate =
      route.params?.bundleType ||
      route.params?.type ||
      route.params?.fallbackCard?.type ||
      route.params?.card?.type;
    if (candidate && NAV_ITEMS.some((item) => item.key === candidate)) {
      return candidate;
    }
    return 'overview';
  }, [route]);

  const handlePress = (item) => {
    if (item.key === 'overview') {
      if (route?.name === 'BundlesOverview') {
        return;
      }
      if (navigation?.canGoBack?.()) {
        navigation?.popToTop?.();
      }
      navigation.navigate('BundlesOverview');
      return;
    }
    navigation.navigate('BundleType', {
      type: item.key,
      title: item.label,
      bundleType: item.key
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <LinearGradient
        colors={['#031727', '#0a2f47']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.topRow}>
          {back ? (
            <TouchableOpacity
              onPress={navigation.goBack}
              accessibilityRole="button"
              accessibilityLabel="عودة"
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>دليل الباقات</Text>
            <Text style={styles.screenTitle}>{options?.title || 'الباقات'}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navRow}
        >
          {NAV_ITEMS.map((item) => {
            const active = item.key === activeKey;
            const gradientColors = active
              ? ['#ffffff', '#dff4ff']
              : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)'];
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => handlePress(item)}
                style={styles.navCardTouchable}
                accessibilityRole="button"
                accessibilityLabel={`اذهب إلى ${item.label}`}
              >
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.navCard, active && styles.navCardActive]}
                >
                  <View style={styles.cardContent}>
                    <View style={[styles.iconPill, active && styles.iconPillActive]}>
                      {(() => {
                        const IconComponent = ICON_COMPONENTS[item.iconSet] || Ionicons;
                        return (
                          <IconComponent
                            name={item.icon}
                            size={18}
                            color={active ? colors.primary : '#e1f2ff'}
                          />
                        );
                      })()}
                    </View>
                    <Text style={[styles.cardEyebrow, active && styles.cardEyebrowActive]}>
                      {item.eyebrow}
                    </Text>
                    <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>{item.label}</Text>
                    <Text style={[styles.cardSubtitle, active && styles.cardSubtitleActive]}>
                      {item.subtitle}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#031727'
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#00000033',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  backPlaceholder: {
    width: 36,
    height: 36
  },
  titleBlock: {
    flex: 1,
    alignItems: 'flex-end'
  },
  eyebrow: {
    color: '#9dd8ff',
    fontFamily: 'Tajawal_500Medium',
    fontSize: 12,
    textAlign: 'right'
  },
  screenTitle: {
    color: colors.white,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 20,
    marginTop: 4,
    textAlign: 'right'
  },
  navRow: {
    paddingBottom: 8,
    paddingTop: 4
  },
  navCardTouchable: {
    marginRight: 12
  },
  navCard: {
    width: 160,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#00000033',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4
  },
  navCardActive: {
    borderColor: '#b9e9ff'
  },
  cardContent: {
    alignItems: 'flex-end'
  },
  cardEyebrow: {
    fontFamily: 'Tajawal_500Medium',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'right'
  },
  cardEyebrowActive: {
    color: colors.secondary
  },
  cardLabel: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.white,
    fontSize: 16,
    textAlign: 'right'
  },
  cardLabelActive: {
    color: colors.primary
  },
  cardSubtitle: {
    fontFamily: 'Tajawal_400Regular',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right'
  },
  cardSubtitleActive: {
    color: colors.muted
  },
  iconPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  iconPillActive: {
    borderColor: colors.primary,
    backgroundColor: '#e8f7ff'
  }
});

export default BundlesNavHeader;

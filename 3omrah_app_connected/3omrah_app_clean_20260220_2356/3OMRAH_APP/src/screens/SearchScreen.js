import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Image,
  Platform,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../theme/colors';
import { typography } from '../theme/ui';
import { scale } from '../utils/responsive';
import { searchBundles } from '../services/api';

const SearchScreen = ({ route }) => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const initialQuery = route?.params?.initialQuery || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  
  const textInputRef = useRef(null);

  // Categories mapping
  const categories = [
    { key: 'omrah', label: 'عمرة', icon: 'cube-outline', query: 'عمرة' },
    { key: 'internal_tour', label: 'رحلات داخلية', icon: 'navigate-outline', query: 'رحلات داخلية' },
    { key: 'external_tour', label: 'رحلات خارجية', icon: 'airplane-outline', query: 'رحلات خارجية' },
    { key: 'ramadan', label: 'رمضان', icon: 'moon-outline', query: 'رمضان' }
  ];

  // Popular Destinations
  const popularDestinations = ['مكة المكرمة', 'المدينة المنورة', 'اسطنبول', 'دبي', 'شرم الشيخ', 'القاهرة'];

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Handle initial query parameter
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      triggerSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Debounced search trigger for typing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (searchQuery === initialQuery) return;

    const delayDebounceFn = setTimeout(() => {
      triggerSearch(searchQuery);
    }, 450);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('@omrah_app/recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (err) {
      console.log('Error loading recent searches', err);
    }
  };

  const saveRecentSearch = async (query) => {
    if (!query || !query.trim()) return;
    const trimmed = query.trim();
    try {
      const stored = await AsyncStorage.getItem('@omrah_app/recent_searches');
      let list = stored ? JSON.parse(stored) : [];
      list = [trimmed, ...list.filter(item => item.toLowerCase() !== trimmed.toLowerCase())];
      if (list.length > 8) list = list.slice(0, 8);
      
      setRecentSearches(list);
      await AsyncStorage.setItem('@omrah_app/recent_searches', JSON.stringify(list));
    } catch (err) {
      console.log('Error saving recent search', err);
    }
  };

  const removeRecentSearch = async (query) => {
    try {
      const updated = recentSearches.filter(item => item !== query);
      setRecentSearches(updated);
      await AsyncStorage.setItem('@omrah_app/recent_searches', JSON.stringify(updated));
    } catch (err) {
      console.log('Error removing recent search', err);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem('@omrah_app/recent_searches');
    } catch (err) {
      console.log('Error clearing recent searches', err);
    }
  };

  const triggerSearch = async (queryText) => {
    const trimmed = queryText.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await searchBundles(trimmed);
      if (res && res.success) {
        setResults(res.cards || []);
        if (res.cards && res.cards.length > 0) {
          await saveRecentSearch(trimmed);
        }
      } else {
        setError('تعذر العثور على نتائج. يرجى التحقق من اتصالك بالإنترنت.');
      }
    } catch (err) {
      console.log('Search error', err);
      setError('حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearQuery = () => {
    setSearchQuery('');
    setResults([]);
    setError(null);
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };

  const getTypeLabel = (type) => {
    const mapping = {
      omrah: 'عمرة',
      internal_tour: 'رحلة داخلية',
      external_tour: 'رحلة خارجية',
      '7ag': 'حج',
      ramadan: 'رمضان'
    };
    return mapping[type] || 'رحلة';
  };

  const getResultsCountText = (count) => {
    if (count === 1) return 'تم العثور على باقة واحدة';
    if (count === 2) return 'تم العثور على باقتين';
    if (count >= 3 && count <= 10) return `تم العثور على ${count} باقات`;
    return `تم العثور على ${count} باقة`;
  };

  const renderCard = ({ item }) => {
    const formattedPrice = Number(item.lowest_price).toLocaleString('ar-EG');
    const typeLabel = getTypeLabel(item.type);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => {
          navigation.navigate('Bundles', {
            screen: 'BundleDetails',
            params: { cardId: item.id }
          });
        }}
      >
        <View style={styles.cardImageContainer}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.cardImage} />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="image-outline" size={40} color={colors.placeholder} />
            </View>
          )}

          <View style={styles.cardBadges}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
            {item.offer_type ? (
              <View style={styles.offerBadge}>
                <Text style={styles.offerBadgeText}>{item.offer_type}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>

          <View style={styles.cardDetailsRow}>
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
              <Text style={styles.durationText}>
                {item.days} أيام / {item.nights} ليالي
              </Text>
            </View>
            {item.code ? (
              <Text style={styles.cardCode}>كود: {item.code}</Text>
            ) : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.cardFooter}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>تبدأ من</Text>
              <Text style={styles.priceValue}>{formattedPrice} <Text style={styles.priceCurrency}>جنيه</Text></Text>
            </View>

            <View style={styles.routeContainer}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.going_route}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSuggestions = () => {
    return (
      <ScrollView contentContainerStyle={styles.suggestionsContainer} showsVerticalScrollIndicator={false}>
        {recentSearches.length > 0 ? (
          <View style={styles.suggestionSection}>
            <View style={styles.sectionHeaderRow}>
              <TouchableOpacity onPress={clearRecentSearches} activeOpacity={0.7}>
                <Text style={styles.clearHistoryText}>مسح السجل</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>عمليات البحث الأخيرة</Text>
            </View>
            <View style={styles.recentChipsContainer}>
              {recentSearches.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentChip}
                  onPress={() => {
                    setSearchQuery(item);
                    triggerSearch(item);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time-outline" size={14} color={colors.muted} style={{ marginLeft: 6 }} />
                  <Text style={styles.recentChipText}>{item}</Text>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      removeRecentSearch(item);
                    }}
                    style={styles.chipDeleteWrapper}
                  >
                    <Ionicons name="close-circle" size={14} color={colors.placeholder} style={{ marginRight: 6 }} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.suggestionSection}>
          <Text style={styles.sectionTitle}>تصنيفات سريعة</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={styles.categoryCard}
                onPress={() => {
                  setSearchQuery(cat.query);
                  triggerSearch(cat.query);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.categoryIconContainer}>
                  <Ionicons name={cat.icon} size={22} color={colors.primary} />
                </View>
                <Text style={styles.categoryCardText}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.suggestionSection}>
          <Text style={styles.sectionTitle}>الوجهات الشائعة</Text>
          <View style={styles.destinationsContainer}>
            {popularDestinations.map((dest, index) => (
              <TouchableOpacity
                key={index}
                style={styles.destinationChip}
                onPress={() => {
                  setSearchQuery(dest);
                  triggerSearch(dest);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="pin-outline" size={12} color={colors.secondary} style={{ marginLeft: 4 }} />
                <Text style={styles.destinationChipText}>{dest}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.statusText}>جارٍ البحث عن باقات مميزة...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => triggerSearch(searchQuery)}>
            <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (searchQuery.trim() && results.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={80} color={colors.placeholder} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>{"لم نجد نتائج مطابقة لـ \"" + searchQuery + "\""}</Text>
          <Text style={styles.emptySubtitle}>جرب البحث بكلمات أخرى أو اختر من الوجهات الشائعة.</Text>
          <TouchableOpacity 
            style={styles.clearSearchButton} 
            onPress={() => {
              setSearchQuery('');
              setResults([]);
            }}
          >
            <Text style={styles.clearSearchButtonText}>إعادة تعيين البحث</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!searchQuery.trim()) {
      return renderSuggestions();
    }

    return (
      <FlatList
        data={results}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.resultsHeaderRow}>
            <Text style={styles.resultsCountText}>
              {getResultsCountText(results.length)}
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Search Header ── */}
      <View style={styles.headerContainer}>
        {/* Search Input Container - Left in row-reverse, meaning visually RIGHT */}
        <View style={[
          styles.searchBarWrapper,
          searchFocused && styles.searchBarWrapperFocused
        ]}>
          <Ionicons name="search" size={scale(18, width)} color={searchFocused ? colors.brand : colors.placeholder} style={styles.searchIcon} />
          <TextInput
            ref={textInputRef}
            placeholder="ابحث عن وجهة، رحلة، أو شركة طيران..."
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => triggerSearch(searchQuery)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoFocus={true}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={handleClearQuery} style={styles.clearIconWrapper}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Back Button - Right in row-reverse, meaning visually LEFT */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Main Content ── */}
      <View style={styles.container}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1
  },
  headerContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 12
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    paddingHorizontal: 12,
    height: 46
  },
  searchBarWrapperFocused: {
    borderColor: colors.brand,
    backgroundColor: colors.surface
  },
  searchIcon: {
    marginLeft: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.regular,
    color: colors.text,
    textAlign: 'right',
    paddingVertical: 0
  },
  clearIconWrapper: {
    padding: 4
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  statusText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: typography.medium,
    color: colors.muted,
    textAlign: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: typography.medium,
    color: colors.muted
  },
  errorText: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary
  },
  retryButtonText: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: colors.white
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.8
  },
  emptyText: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18
  },
  clearSearchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primary
  },
  clearSearchButtonText: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: colors.primary
  },
  suggestionsContainer: {
    padding: 16,
    paddingBottom: 40
  },
  suggestionSection: {
    marginBottom: 24
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: 'right',
    marginBottom: 12
  },
  clearHistoryText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: colors.danger
  },
  recentChipsContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8
  },
  recentChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft
  },
  recentChipText: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: colors.textSecondary
  },
  chipDeleteWrapper: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  categoryGrid: {
    flexDirection: 'row-reverse',
    gap: 12,
    justifyContent: 'space-between'
  },
  categoryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4
      },
      android: {
        elevation: 1
      }
    })
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  categoryCardText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: colors.text,
    textAlign: 'center'
  },
  destinationsContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8
  },
  destinationChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft
  },
  destinationChipText: {
    fontSize: 13,
    fontFamily: typography.medium,
    color: colors.textSecondary
  },
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  resultsHeaderRow: {
    marginBottom: 16
  },
  resultsCountText: {
    fontSize: 14,
    fontFamily: typography.bold,
    color: colors.textSecondary,
    textAlign: 'right'
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8
      },
      android: {
        elevation: 2
      }
    })
  },
  cardImageContainer: {
    height: 140,
    backgroundColor: colors.surfaceMuted,
    position: 'relative'
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  cardImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  typeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  typeBadgeText: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: colors.white
  },
  offerBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  offerBadgeText: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: colors.text
  },
  cardBody: {
    padding: 16
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: 'right',
    marginBottom: 8
  },
  cardDetailsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  durationBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center'
  },
  durationText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: colors.primary
  },
  cardCode: {
    fontSize: 11,
    fontFamily: typography.regular,
    color: colors.muted
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: 12
  },
  cardFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  priceContainer: {
    alignItems: 'flex-end'
  },
  priceLabel: {
    fontSize: 10,
    fontFamily: typography.regular,
    color: colors.muted,
    marginBottom: 2
  },
  priceValue: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: colors.secondary
  },
  priceCurrency: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: colors.textSecondary
  },
  routeContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    maxWidth: '60%'
  },
  routeText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: colors.textSecondary
  }
});

export default SearchScreen;

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { fetchBundlesList } from '../services/api';
import useFavorites from '../hooks/useFavorites';
import CompareContext from '../context/CompareContext';
import ChatContext from '../context/ChatContext';
import BundlesNavHeader from '../components/BundlesNavHeader';
import { API_BASE_URL } from '../config/env';

const FilterChip = ({ label, onRemove }) => (
  <View style={styles.activeChip}>
    <Text style={styles.activeChipText}>{label}</Text>
    {onRemove ? (
      <TouchableOpacity onPress={onRemove} style={styles.activeChipRemove}>
        <Text style={styles.activeChipRemoveText}>×</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const SelectableChip = ({ label, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.filterChip, selected && styles.filterChipSelected]}
  >
    <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

const sanitizeFilters = (raw = {}) => {
  const cleaned = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    cleaned[key] = value;
  });
  return cleaned;
};

const numericOrUndefined = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const FALLBACK_PREVIEW_IMAGE = require('../../assets/hero.webp');
const getSource = (v) => (typeof v === 'string' ? { uri: v } : v);
const SHARE_BASE_URL = (API_BASE_URL || 'https://rehlatty.com').replace(/\/$/, '');

const resolveCardPreviewImage = (card) => {
  if (!card) {
    return FALLBACK_PREVIEW_IMAGE;
  }
  if (card.thumbnail) {
    return card.thumbnail;
  }
  const gallery = Array.isArray(card.images) ? card.images.filter(Boolean) : [];
  if (gallery.length) {
    return gallery[0];
  }
  return FALLBACK_PREVIEW_IMAGE;
};

const resolveCardShareUrl = (card) => {
  if (!card) {
    return `${SHARE_BASE_URL}/bundles`;
  }
  if (card.shareUrl) {
    return card.shareUrl;
  }
  const slug = card.id || card._id || card.code || card.bundleId;
  return slug ? `${SHARE_BASE_URL}/card/${slug}` : `${SHARE_BASE_URL}/bundles`;
};

const formatDateLabel = (value) => {
  if (!value) {
    return null;
  }
  try {
    return new Date(value).toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric'
    });
  } catch (_error) {
    return value;
  }
};

const formatEnglishDigits = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  try {
    return new Intl.NumberFormat('en-US').format(numeric);
  } catch (_error) {
    return String(numeric);
  }
};

const BundleTypeScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const type = route.params?.type || 'omrah';
  const title = route.params?.title || 'قائمة الباقات';

  const [cards, setCards] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const [imagePreviewCard, setImagePreviewCard] = useState(null);
  const [previewImageUri, setPreviewImageUri] = useState(null);
  const compareContext = useContext(CompareContext);
  const { openChat } = useContext(ChatContext);
  const { isFavorite: isCardFavorite, favoriteLoadingId, toggleFavoriteId } = useFavorites();

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const loadBundles = useCallback(async ({ page = 1, append = false } = {}) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const query = { type, page };
      if (filters.route) query.going_route = filters.route;
      if (filters.airline) query.plane_company = filters.airline;
      if (filters.days) query.days = filters.days;
      if (filters.nights) query.nights = filters.nights;
      if (filters.offerType) query.offer_type = filters.offerType;
      if (filters.minPrice) query.min_price = filters.minPrice;
      if (filters.maxPrice) query.max_price = filters.maxPrice;
      if (filters.showExpired) query.show_expired = '1';
      if (filters.showPastTravel) query.show_past_travel = '1';

      const response = await fetchBundlesList(query);
      if (!response?.success) {
        throw new Error(response?.message || 'تعذر تحميل الباقات.');
      }
      setFilterOptions(response.filterOptions);
      setMeta(response.meta);
      setCards((prev) => (append ? [...prev, ...response.cards] : response.cards));
    } catch (err) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, type]);

  useEffect(() => {
    loadBundles({ page: 1, append: false });
  }, [loadBundles]);

  useEffect(() => {
    if (modalVisible) {
      setLocalFilters(filters);
    }
  }, [modalVisible, filters]);

  const handleApplyFilters = () => {
    setFilters(sanitizeFilters(localFilters));
    setModalVisible(false);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const activeFilters = useMemo(() => {
    const list = [];
    if (filters.route) list.push({ key: 'route', label: `المسار: ${filters.route}` });
    if (filters.airline) list.push({ key: 'airline', label: `الطيران: ${filters.airline}` });
    if (filters.days) list.push({ key: 'days', label: `${filters.days} أيام` });
    if (filters.nights) list.push({ key: 'nights', label: `${filters.nights} ليالٍ` });
    if (filters.offerType) list.push({ key: 'offerType', label: `نوع العرض: ${filters.offerType}` });
    if (filters.minPrice || filters.maxPrice) {
      list.push({ key: 'price', label: `السعر: ${filters.minPrice || 0} - ${filters.maxPrice || '∞'}` });
    }
    if (filters.showExpired) list.push({ key: 'showExpired', label: 'تشمل المنتهية' });
    if (filters.showPastTravel) list.push({ key: 'showPastTravel', label: 'تشمل رحلات سابقة' });
    return list;
  }, [filters]);

  const handleImagePreview = (card) => {
    if (!card) return;
    setImagePreviewCard(card);
    setPreviewImageUri(resolveCardPreviewImage(card));
  };

  const closeImagePreview = () => {
    setImagePreviewCard(null);
    setPreviewImageUri(null);
  };

  const openCardDetails = (card) => {
    if (!card?.id) return;
    navigation.navigate('BundleDetails', {
      cardId: card.id,
      fallbackCard: card
    });
  };

  const handleFavoriteToggle = useCallback(
    (targetCard) => {
      const cardId = targetCard?.id || targetCard?._id;
      if (!cardId) {
        return;
      }
      toggleFavoriteId(cardId);
    },
    [toggleFavoriteId]
  );

  const handleCompareToggle = useCallback(
    (targetCard) => {
      if (!targetCard) {
        return;
      }
      const status = compareContext?.toggleCard?.(targetCard);
      if (status === 'added') {
        navigation.getParent()?.navigate?.('Compare');
      }
    },
    [compareContext, navigation]
  );

  const handleShareCard = useCallback(async (targetCard) => {
    if (!targetCard) {
      return;
    }
    const shareUrl = resolveCardShareUrl(targetCard);
    try {
      await Share.share({
        message: `${targetCard?.name || 'باقة مميزة'} - ${shareUrl}`,
        url: shareUrl
      });
    } catch (error) {
      console.log('[BundleType] Share error', error);
    }
  }, []);

  const renderItem = ({ item }) => {
    const normalizedId = item?.id || item?._id ? String(item.id || item._id) : null;
    const isFavoritePending = normalizedId ? favoriteLoadingId === normalizedId : false;
    const previewUri = resolveCardPreviewImage(item);
  const featureList = Array.isArray(item?.features) ? item.features.filter(Boolean) : [];
    const displayFeatures = featureList.slice(0, 3);
    const buildList = (candidate) => (Array.isArray(candidate) ? candidate.filter(Boolean) : []);
    const includesList =
      [buildList(item?.included_services), buildList(item?.programIncludes), buildList(item?.includes)].find(
        (list) => list.length
      ) || [];
    const displayIncludes = includesList.slice(0, 3);
    const oldPrice = item?.originalPrice || item?.previousPrice;
    const startingPrice = item?.lowest_price ?? item?.price;
  const formattedStartingPrice = formatEnglishDigits(startingPrice);
  const formattedOldPrice = formatEnglishDigits(oldPrice);
    const ratingScore = item?.rating || item?.reviewScore;
    const ratingLabel = ratingScore
      ? ratingScore >= 8
        ? 'رائع'
        : ratingScore >= 6
        ? 'جيد'
        : 'مقبول'
      : null;
    const locationLabel = item?.locations?.filter(Boolean).join(' • ');
    const nightsLabel = item?.nights ? `${item.nights} ليالٍ` : null;
    const guestsLabel = item?.maxGuests ? `${item.maxGuests} ضيف` : null;
    const dateLabel = item?.startDate && item?.endDate ? `${item.startDate} - ${item.endDate}` : null;
    const travelDateLabel = formatDateLabel(item?.travel_date || item?.startDate);
    const companyName = item?.company || item?.agencyName || item?.providerName;
  const bundleId = item?.code || item?.bundleId || item?._id || item?.id;
  const displayTitle = bundleId ? `#${bundleId}` : item?.name || '';
    const isFavorite = normalizedId ? isCardFavorite(normalizedId) : false;
    const isCompared = normalizedId ? Boolean(compareContext?.isInCompare?.(normalizedId)) : false;

    return (
      <View style={styles.cardWrapper}>
        <View style={styles.cardContainer}>
          <View style={styles.cardTopRow}>
            <TouchableOpacity
              style={styles.cardImageColumn}
              onPress={() => handleImagePreview(item)}
              activeOpacity={0.8}
            >
              <Image source={getSource(previewUri)} style={styles.cardImage} />
              {item?.offerType ? (
                <View style={styles.imageBadge}>
                  <Text style={styles.imageBadgeText}>{item.offerType}</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <View style={styles.cardInfoColumn}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {displayTitle}
                </Text>
                {ratingScore ? (
                  <View style={styles.ratingPill}>
                    <Text style={styles.ratingScore}>{Number(ratingScore).toFixed(1)}</Text>
                    <Text style={styles.ratingLabel}>{ratingLabel}</Text>
                  </View>
                ) : null}
              </View>

              {companyName ? (
                <View style={styles.companyRow}>
                  <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
                  <Text style={styles.companyText}>الشركة: {companyName}</Text>
                </View>
              ) : null}

              {travelDateLabel ? (
                <View style={styles.companyRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={styles.companyText}>موعد السفر: {travelDateLabel}</Text>
                </View>
              ) : null}

              <View style={styles.metaRow}>
                {locationLabel ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={16} color={colors.primary} />
                    <Text style={styles.metaText}>{locationLabel}</Text>
                  </View>
                ) : null}
                {nightsLabel ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="moon-outline" size={16} color={colors.primary} />
                    <Text style={styles.metaText}>{nightsLabel}</Text>
                  </View>
                ) : null}
              </View>

              {dateLabel ? <Text style={styles.metaSubText}>{dateLabel}</Text> : null}

              <Text style={styles.priceEyebrow}>السعر يبدأ من</Text>
              <View style={styles.priceRow}>
                <Text style={styles.currentPrice}>
                  {formattedStartingPrice ? `${formattedStartingPrice} جنيه` : 'غير متاح'}
                </Text>
                {formattedOldPrice ? (
                  <Text style={styles.oldPrice}>{`${formattedOldPrice} جنيه`}</Text>
                ) : null}
              </View>

              <View style={styles.featureColumn}>
                {displayFeatures.map((feature, index) => (
                  <View key={`${item?._id || item?.id}-feature-${index}`} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
                {guestsLabel ? (
                  <View style={styles.featureRow}>
                    <Ionicons name="people-outline" size={16} color={colors.primary} />
                    <Text style={styles.featureText}>{guestsLabel}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.primaryButton} onPress={() => openCardDetails(item)}>
                  <Text style={styles.primaryButtonText}>عرض التفاصيل</Text>
                </TouchableOpacity>
                <View style={styles.iconButtonsRow}>
                  <TouchableOpacity
                    style={[styles.iconButton, isFavorite && styles.iconButtonActive]}
                    onPress={() => handleFavoriteToggle(item)}
                    disabled={isFavoritePending}
                  >
                    {isFavoritePending ? (
                      <ActivityIndicator size="small" color={isFavorite ? '#fff' : colors.primary} />
                    ) : (
                      <Ionicons
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isFavorite ? '#fff' : colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconButton, styles.iconButtonCompare, isCompared && styles.iconButtonCompareActive]}
                    onPress={() => handleCompareToggle(item)}
                  >
                    <MaterialCommunityIcons
                      name="scale-balance"
                      size={18}
                      color={isCompared ? colors.secondary : colors.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={() => handleShareCard(item)}>
                    <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      if (typeof openChat === 'function') {
                        openChat(item);
                      } else {
                        navigation.getParent()?.navigate?.('Contact', { prefill: item });
                      }
                    }}
                  >
                    <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {displayIncludes.length ? (
            <View style={styles.includesBlock}>
              <Text style={styles.includesTitle}>تشمل الباقة</Text>
              {displayIncludes.map((includeItem, index) => (
                <View key={`${item?._id || item?.id}-include-${index}`} style={styles.includesRow}>
                  <View style={styles.includesBullet} />
                  <Text style={styles.includesText} numberOfLines={1}>
                    {includeItem}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const canLoadMore = meta && meta.page < meta.totalPages;

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <BundlesNavHeader
        navigation={navigation}
        route={route}
        options={{ title }}
        back={navigation.canGoBack()}
      />

      <View style={styles.headerContent}>
        <View style={styles.filterBar}>
          <Text style={styles.resultsCount}>{meta ? `${meta.total} باقات` : '...'}</Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.filterButtonText}>تصفية</Text>
          </TouchableOpacity>
        </View>

        {activeFilters.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersRow}>
            {activeFilters.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                onRemove={() => {
                  if (chip.key === 'price') {
                    setFilters((prev) => {
                      const next = { ...prev };
                      delete next.minPrice;
                      delete next.maxPrice;
                      return next;
                    });
                    return;
                  }
                  setFilters((prev) => {
                    const next = { ...prev };
                    delete next[chip.key];
                    return next;
                  });
                }}
              />
            ))}
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersBtn}>
              <Text style={styles.clearFiltersText}>مسح الكل</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : null}

        {loading && !cards.length ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.secondary} size="large" />
            <Text style={styles.loadingText}>جارٍ تحميل الباقات...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadBundles({ page: 1 })} style={styles.retryBtn}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={cards}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>لا توجد باقات مطابقة للفلاتر الحالية.</Text> : null}
        ListFooterComponent={canLoadMore ? (
          <TouchableOpacity
            onPress={() => loadBundles({ page: (meta?.page || 1) + 1, append: true })}
            style={styles.loadMoreBtn}
            disabled={loadingMore}
          >
            {loadingMore ? <ActivityIndicator color="#fff" /> : <Text style={styles.loadMoreText}>عرض المزيد</Text>}
          </TouchableOpacity>
        ) : <View style={{ height: 40 }} />}
      />

      <Modal visible={Boolean(imagePreviewCard)} transparent animationType="fade">
        <TouchableOpacity style={styles.imageModalBackdrop} onPress={closeImagePreview}>
          <Image
            source={getSource(previewImageUri || FALLBACK_PREVIEW_IMAGE)}
            style={styles.imageModalPreview}
            resizeMode="contain"
            onError={() => setPreviewImageUri(FALLBACK_PREVIEW_IMAGE)}
          />
          <TouchableOpacity style={styles.imageModalClose} onPress={closeImagePreview}>
            <Text style={styles.imageModalCloseText}>إغلاق</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>خيارات التصفية</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>إغلاق</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.filterLabel}>المسار</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {filterOptions?.routes?.map((routeOption) => (
                <SelectableChip
                  key={routeOption}
                  label={routeOption}
                  selected={localFilters?.route === routeOption}
                  onPress={() => setLocalFilters((prev) => ({ ...prev, route: prev?.route === routeOption ? undefined : routeOption }))}
                />
              ))}
            </ScrollView>

            <Text style={styles.filterLabel}>شركة الطيران</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {filterOptions?.airlines?.map((airline) => (
                <SelectableChip
                  key={airline}
                  label={airline}
                  selected={localFilters?.airline === airline}
                  onPress={() => setLocalFilters((prev) => ({ ...prev, airline: prev?.airline === airline ? undefined : airline }))}
                />
              ))}
            </ScrollView>

            <Text style={styles.filterLabel}>عدد الأيام</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {filterOptions?.dayOptions?.map((day) => (
                <SelectableChip
                  key={day}
                  label={`${day}`}
                  selected={localFilters?.days === day}
                  onPress={() => setLocalFilters((prev) => ({ ...prev, days: prev?.days === day ? undefined : day }))}
                />
              ))}
            </ScrollView>

            <Text style={styles.filterLabel}>عدد الليالي</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {filterOptions?.nightOptions?.map((night) => (
                <SelectableChip
                  key={night}
                  label={`${night}`}
                  selected={localFilters?.nights === night}
                  onPress={() => setLocalFilters((prev) => ({ ...prev, nights: prev?.nights === night ? undefined : night }))}
                />
              ))}
            </ScrollView>

            <Text style={styles.filterLabel}>نوع العرض</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {filterOptions?.offerTypes?.map((offer) => (
                <SelectableChip
                  key={offer}
                  label={offer}
                  selected={localFilters?.offerType === offer}
                  onPress={() => setLocalFilters((prev) => ({ ...prev, offerType: prev?.offerType === offer ? undefined : offer }))}
                />
              ))}
            </ScrollView>

            <View style={styles.filterPriceRow}>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.filterLabel}>أدنى سعر</Text>
                <TextInput
                  value={localFilters?.minPrice ? String(localFilters.minPrice) : ''}
                  onChangeText={(value) => setLocalFilters((prev) => ({ ...prev, minPrice: numericOrUndefined(value) }))}
                  keyboardType="numeric"
                  style={styles.textInput}
                  placeholder="مثال: 5000"
                />
              </View>
              <View style={[styles.priceInputWrapper, styles.priceInputSpacing]}>
                <Text style={styles.filterLabel}>أعلى سعر</Text>
                <TextInput
                  value={localFilters?.maxPrice ? String(localFilters.maxPrice) : ''}
                  onChangeText={(value) => setLocalFilters((prev) => ({ ...prev, maxPrice: numericOrUndefined(value) }))}
                  keyboardType="numeric"
                  style={styles.textInput}
                  placeholder="مثال: 15000"
                />
              </View>
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>عرض الباقات المنتهية</Text>
              <Switch
                value={Boolean(localFilters?.showExpired)}
                onValueChange={(value) => setLocalFilters((prev) => ({ ...prev, showExpired: value || undefined }))}
                trackColor={{ true: colors.secondary, false: '#ccc' }}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>عرض الرحلات السابقة</Text>
              <Switch
                value={Boolean(localFilters?.showPastTravel)}
                onValueChange={(value) => setLocalFilters((prev) => ({ ...prev, showPastTravel: value || undefined }))}
                trackColor={{ true: colors.secondary, false: '#ccc' }}
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={() => setLocalFilters({})}>
              <Text style={styles.resetBtnText}>مسح</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.applyBtn, styles.modalActionSpacing]} onPress={handleApplyFilters}>
              <Text style={styles.applyBtnText}>تطبيق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default BundleTypeScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  resultsCount: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 16
  },
  filterButton: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8
  },
  filterButtonText: {
    color: colors.white,
    fontFamily: 'Tajawal_500Medium'
  },
  activeFiltersRow: {
    paddingBottom: 8,
    alignItems: 'center'
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8
  },
  activeChipText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary
  },
  activeChipRemove: {
    marginLeft: 6
  },
  activeChipRemoveText: {
    color: colors.danger,
    fontSize: 16,
    fontFamily: 'Tajawal_700Bold'
  },
  clearFiltersBtn: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  clearFiltersText: {
    color: colors.danger,
    fontFamily: 'Tajawal_500Medium'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 8,
    color: colors.muted
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  listHeader: {
    paddingBottom: 12
  },
  errorText: {
    color: colors.danger,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'right'
  },
  retryBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.danger,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8
  },
  retryText: {
    color: colors.white,
    fontFamily: 'Tajawal_500Medium'
  },
  listContent: {
    paddingTop: 0,
    paddingBottom: 80
  },
  cardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    shadowColor: '#00000015',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3
  },
  cardTopRow: {
    flexDirection: 'row-reverse'
  },
  cardImageColumn: {
    width: 120
  },
  cardImage: {
    width: '100%',
    height: 130,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0
  },
  imageBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(3,23,39,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999
  },
  imageBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'Tajawal_700Bold'
  },
  cardInfoColumn: {
    flex: 1,
    padding: 16
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  cardTitle: {
    flex: 1,
    marginLeft: 10,
    color: colors.primary,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
    textAlign: 'right'
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 4
  },
  companyText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    fontSize: 13,
    marginLeft: 6
  },
  ratingPill: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  ratingScore: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.success,
    fontSize: 14
  },
  ratingLabel: {
    fontFamily: 'Tajawal_400Regular',
    fontSize: 10,
    color: colors.success
  },
  metaRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    marginBottom: 4
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12
  },
  metaText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    fontSize: 13,
    marginLeft: 4
  },
  metaSubText: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 6
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    marginBottom: 2
  },
  priceEyebrow: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right'
  },
  currentPrice: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 20,
    marginLeft: 6
  },
  oldPrice: {
    fontFamily: 'Tajawal_400Regular',
    color: '#b1b1b1',
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginRight: 12
  },
  featureColumn: {
    marginBottom: 10
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  featureText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    fontSize: 13,
    marginLeft: 6
  },
  cardFooter: {
    marginTop: 8
  },
  includesBlock: {
    backgroundColor: '#f8fbff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4ecf5'
  },
  includesTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 13,
    marginBottom: 6,
    textAlign: 'right'
  },
  includesRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 4
  },
  includesBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
    marginLeft: 8
  },
  includesText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    fontSize: 12,
    flex: 1,
    textAlign: 'right'
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: 'Tajawal_700Bold'
  },
  iconButtonsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center'
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  iconButtonCompare: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderSoft
  },
  iconButtonCompareActive: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.info
  },
  iconButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    fontFamily: 'Tajawal_400Regular',
    marginTop: 40
  },
  loadMoreBtn: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999
  },
  loadMoreText: {
    color: colors.white,
    fontFamily: 'Tajawal_700Bold'
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  imageModalPreview: {
    width: '100%',
    height: '80%'
  },
  imageModalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999
  },
  imageModalCloseText: {
    color: colors.white,
    fontFamily: 'Tajawal_700Bold'
  },
  modalContent: {
    flex: 1,
    paddingTop: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.background
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary
  },
  modalClose: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.danger
  },
  filterLabel: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'right'
  },
  chipRow: {
    marginBottom: 16
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10
  },
  filterChipSelected: {
    backgroundColor: colors.secondary
  },
  filterChipText: {
    color: colors.secondary,
    fontFamily: 'Tajawal_500Medium'
  },
  filterChipTextSelected: {
    color: colors.white
  },
  filterPriceRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  priceInputWrapper: {
    flex: 1
  },
  priceInputSpacing: {
    marginLeft: 12
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    textAlign: 'right',
    fontFamily: 'Tajawal_400Regular'
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  toggleLabel: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary
  },
  modalActions: {
    flexDirection: 'row',
    paddingVertical: 16,
    justifyContent: 'space-between'
  },
  resetBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  modalActionSpacing: {
    marginLeft: 12
  },
  resetBtnText: {
    color: colors.muted,
    fontFamily: 'Tajawal_500Medium'
  },
  applyBtn: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  applyBtnText: {
    color: colors.white,
    fontFamily: 'Tajawal_700Bold'
  }
});

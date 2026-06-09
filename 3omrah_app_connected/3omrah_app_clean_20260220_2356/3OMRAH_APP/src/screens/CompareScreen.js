import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import colors from '../theme/colors';
import CompareContext from '../context/CompareContext';
import { fetchBundleDetails, fetchBundlesList } from '../services/api';

const typeLabelMap = {
  omrah: 'باقة عمرة',
  '7ag': 'باقات الحج',
  internal_tour: 'رحلة داخلية',
  external_tour: 'رحلة خارجية',
  ramadan: 'رحلة رمضانية'
};

const CATEGORY_OPTIONS = ['omrah', '7ag', 'internal_tour', 'external_tour'].map((key) => ({
  key,
  label: typeLabelMap[key] || key
}));

const formatDate = (value) => {
  if (!value) return 'غير محدد';
  try {
    return new Date(value).toLocaleDateString('ar-EG');
  } catch (_error) {
    return 'غير محدد';
  }
};

const formatPrice = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'غير محدد';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(numeric);
  } catch (_error) {
    return `${numeric.toLocaleString('en-US')} EGP`;
  }
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getCardKey = (card) => card?.id || card?._id || card?.code || card?.cardId || String(card?.lowest_price || Math.random());

const formatTravelWindow = (card) => {
  if (!card?.travel_date) {
    return 'غير محدد';
  }
  try {
    const start = new Date(card.travel_date);
    const startLabel = start.toLocaleDateString('ar-EG');
    const days = Number(card.days) || 0;
    const end = new Date(start.getTime() + days * DAY_IN_MS);
    const endLabel = Number.isFinite(days) && days > 0 ? end.toLocaleDateString('ar-EG') : null;
    return endLabel ? `من ${startLabel} إلى ${endLabel}` : startLabel;
  } catch (_error) {
    return 'غير محدد';
  }
};

const formatRoute = (card) => {
  if (!card?.going_route && !card?.returning_route) {
    return 'غير محدد';
  }
  if (card?.going_route && card?.returning_route) {
    return `${card.going_route} → ${card.returning_route}`;
  }
  return card.going_route || card.returning_route || 'غير محدد';
};

const getHotels = (card) => {
  if (Array.isArray(card?.plane?.hotel)) {
    return card.plane.hotel.filter(Boolean);
  }
  if (Array.isArray(card?.hotels)) {
    return card.hotels.filter(Boolean);
  }
  return [];
};

const findHotelByLocation = (card, keyword) => {
  const hotels = getHotels(card);
  if (!hotels.length) {
    return null;
  }
  const match = hotels.find((hotel) => hotel?.location && hotel.location.includes(keyword));
  if (match) {
    return match;
  }
  if (keyword === 'مكة') {
    return hotels[0];
  }
  if (keyword === 'المدينة') {
    return hotels[1] || hotels[0];
  }
  return hotels[0];
};

const formatHotelDetails = (hotel) => {
  if (!hotel) return 'غير محدد';
  const bits = [];
  if (hotel.hotel_type) bits.push(hotel.hotel_type);
  if (hotel.comes_with_food) bits.push('يشمل الطعام');
  if (bits.length === 0) {
    return 'فندق سياحي';
  }
  return bits.join(' - ');
};

const formatProgramIncludes = (type) => {
  switch (type) {
    case 'omrah':
      return 'تذاكر الطيران - الإقامة - التنقلات - زيارة المسجد الحرام - زيارة المسجد النبوي - جولات دينية';
    case 'internal_tour':
      return 'تذاكر الطيران الداخلي - الإقامة - وجبات الإفطار - التنقلات - دليل سياحي - جولات سياحية';
    case 'external_tour':
      return 'تذاكر الطيران - الإقامة - بعض الوجبات - التنقلات - تأشيرة السفر - دليل سياحي';
    case '7ag':
      return 'تذاكر الطيران - السكن المكيف - التنقلات - المشاعر - خدمة العملاء';
    default:
      return 'تذاكر الطيران - الإقامة - وجبة الإفطار - التنقلات - خدمة العملاء';
  }
};

const FALLBACK_THUMBNAIL = require('../../assets/hero.webp');
const getSource = (v) => (typeof v === 'string' ? { uri: v } : v);

const getHotelName = (card, keyword) => {
  const hotel = findHotelByLocation(card, keyword);
  return hotel?.hotel || hotel?.name || 'غير محدد';
};

const CompareScreen = () => {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const { items, removeCard, clear, maxItems, addCard, isInCompare } = useContext(CompareContext);
  const [loading, setLoading] = useState(false);
  const [detailedCards, setDetailedCards] = useState({});
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState(null);
  const [pickerCards, setPickerCards] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerReloadKey, setPickerReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadDetails = async () => {
      if (!items.length) {
        setDetailedCards({});
        return;
      }
      setLoading(true);
      try {
        const results = await Promise.all(
          items.map(async (item) => {
            const id = item?.id;
            if (!id) {
              return [Math.random().toString(), item];
            }
            try {
              const response = await fetchBundleDetails(id);
              if (response?.card) {
                return [id, { ...item, ...response.card }];
              }
            } catch (error) {
              console.log('[Compare] Failed to load bundle details', { id, error });
            }
            return [id, item];
          })
        );
        if (!cancelled) {
          const map = {};
          results.forEach(([id, card]) => {
            if (id) {
              map[id] = card;
            }
          });
          setDetailedCards(map);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [items]);

  useEffect(() => {
    if (!pickerVisible || !pickerType) {
      return;
    }
    let cancelled = false;
    const loadPickerCards = async () => {
      setPickerLoading(true);
      setPickerError(null);
      try {
        const response = await fetchBundlesList({ type: pickerType, page: 1 });
        if (!response?.success) {
          throw new Error(response?.message || 'تعذر تحميل الباقات المتاحة.');
        }
        if (!cancelled) {
          setPickerCards(response.cards || []);
        }
      } catch (error) {
        if (!cancelled) {
          setPickerError(error.message || 'حدث خطأ أثناء تحميل الباقات.');
        }
      } finally {
        if (!cancelled) {
          setPickerLoading(false);
        }
      }
    };
    loadPickerCards();
    return () => {
      cancelled = true;
    };
  }, [pickerVisible, pickerType, pickerReloadKey]);

  const cardsToRender = useMemo(() => items.map((item) => detailedCards[item.id] || item), [items, detailedCards]);
  const isCompareFull = items.length >= maxItems;
  const lockedType = useMemo(() => {
    const firstWithType = items.find((item) => item?.type);
    return firstWithType?.type || null;
  }, [items]);

  const pickerCategoryOptions = useMemo(() => {
    const base = [...CATEGORY_OPTIONS];
    const seen = new Set(items.map((card) => card?.type).filter(Boolean));
    seen.forEach((type) => {
      if (!base.some((option) => option.key === type)) {
        base.push({ key: type, label: typeLabelMap[type] || type });
      }
    });
    if (lockedType) {
      return base.filter((option) => option.key === lockedType);
    }
    return base;
  }, [items, lockedType]);

  useEffect(() => {
    if (lockedType && pickerType && pickerType !== lockedType) {
      setPickerType(lockedType);
    }
  }, [lockedType, pickerType]);

  const filteredPickerCards = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();
    if (!query) {
      return pickerCards;
    }
    return pickerCards.filter((card) => {
      const pool = [card.code, card.company, card.name, card.title];
      return pool.some((value) => {
        if (!value && value !== 0) {
          return false;
        }
        return String(value).toLowerCase().includes(query);
      });
    });
  }, [pickerCards, pickerQuery]);

  const comparisonRows = [
    {
      key: 'company',
      label: 'اسم شركة السياحة',
      render: (card) => card.company || 'غير محدد'
    },
    {
      key: 'programType',
      label: 'نوع البرنامج',
      render: (card) => card.offer_type || 'غير محدد'
    },
    {
      key: 'duration',
      label: 'مدة الرحلة',
      render: (card) => `${card.days || 0} أيام / ${card.nights || 0} ليالٍ`
    },
    {
      key: 'travelWindow',
      label: 'تاريخ الانطلاق والعودة',
      render: (card) => formatTravelWindow(card)
    },
    {
      key: 'deadline',
      label: 'الموعد النهائي للحجز',
      render: (card) => formatDate(card.offer_expiry_date)
    },
    {
      key: 'airline',
      label: 'شركة الطيران',
      render: (card) => card.plane_company || 'غير محدد'
    },
    {
      key: 'route',
      label: 'خط السير',
      render: (card) => formatRoute(card)
    },
    {
      key: 'meccaHotel',
      label: 'اسم الفندق في مكة',
      render: (card) => getHotelName(card, 'مكة')
    },
    {
      key: 'hotelDetails',
      label: 'تفاصيل الفندق',
      render: (card) => formatHotelDetails(findHotelByLocation(card, 'مكة') || getHotels(card)[0])
    },
    {
      key: 'nights',
      label: 'عدد ليالي الإقامة',
      render: (card) => (Number.isFinite(card.nights) ? `${card.nights} ليالٍ` : 'غير محدد')
    },
    {
      key: 'medinaHotel',
      label: 'اسم الفندق في المدينة',
      render: (card) => getHotelName(card, 'المدينة')
    },
    {
      key: 'programIncludes',
      label: 'يشمل البرنامج',
      render: (card) => formatProgramIncludes(card.type),
      multiline: true
    },
    {
      key: 'price',
      label: 'الأسعار والتكلفة',
      render: (card) => formatPrice(card.lowest_price),
      highlight: true
    }
  ];

  const handleOpenPicker = useCallback(() => {
    const defaultType = lockedType || items[items.length - 1]?.type || items[0]?.type || 'omrah';
    setPickerType(defaultType);
    setPickerQuery('');
    setPickerCards([]);
    setPickerError(null);
    setPickerVisible(true);
    setPickerReloadKey((key) => key + 1);
  }, [items, lockedType]);

  const handleClosePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const handleSelectPickerCard = useCallback((card) => {
    if (!card) {
      return;
    }
    if (lockedType && card.type && card.type !== lockedType) {
      setPickerError('يمكن مقارنة الباقات من نفس النوع فقط.');
      return;
    }
    const result = addCard(card);
    if (result === 'added' && items.length + 1 >= maxItems) {
      setPickerVisible(false);
    }
  }, [addCard, items, maxItems, lockedType]);

  const handleRetryPicker = useCallback(() => {
    setPickerReloadKey((key) => key + 1);
  }, []);

  const handlePickerTypeChange = useCallback((type) => {
    if (!type) {
      return;
    }
    if (lockedType && type !== lockedType) {
      setPickerError('لا يمكن خلط أنواع الباقات في المقارنة.');
      return;
    }
    setPickerType((prev) => (prev === type ? prev : type));
    setPickerCards([]);
    setPickerError(null);
    setPickerReloadKey((key) => key + 1);
  }, [lockedType]);

  if (!items.length) {
    return (
      <SafeAreaView style={styles.emptySafeArea} edges={['top']}>
        {canGoBack ? (
          <TouchableOpacity style={styles.stackBackButton} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={styles.stackBackText}>رجوع</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>لا توجد باقات في المقارنة</Text>
          <Text style={styles.emptySubtitle}>قم بإضافة حتى {maxItems} باقات من شاشة الباقات لمقارنتها هنا.</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('Bundles', { screen: 'BundlesOverview' })}
          >
            <Text style={styles.emptyButtonText}>اذهب إلى الباقات</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {canGoBack ? (
        <TouchableOpacity style={styles.stackBackButton} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.stackBackText}>رجوع</Text>
        </TouchableOpacity>
      ) : null}
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>مقارنة الباقات</Text>
            <Text style={styles.subtitle}>يمكن مقارنة حتى {maxItems} باقات في آن واحد.</Text>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={clear}>
            <Text style={styles.clearButtonText}>مسح الكل</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
          {cardsToRender.map((card) => {
            const cardKey = getCardKey(card);
            return (
              <View key={cardKey} style={styles.cardColumn}>
                <Image source={getSource(card.thumbnail || FALLBACK_THUMBNAIL)} style={styles.cardImage} />
                <Text style={styles.cardCode}>{card.code || 'بدون كود'}</Text>
                <Text style={styles.cardType}>{typeLabelMap[card.type] || 'باقة'}</Text>
                <Text style={styles.cardPrice}>{formatPrice(card.lowest_price)}</Text>
                <Text style={styles.cardMeta}>{`${card.days || 0} أيام / ${card.nights || 0} ليالٍ`}</Text>
                <TouchableOpacity style={styles.removeButton} onPress={() => removeCard(card.id)}>
                  <Text style={styles.removeButtonText}>إزالة</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          {Array.from({ length: Math.max(0, maxItems - cardsToRender.length) }).map((_, index) => (
            <TouchableOpacity
              key={`placeholder-${index}`}
              style={[styles.cardColumn, styles.cardPlaceholder]}
              activeOpacity={0.85}
              onPress={handleOpenPicker}
            >
              <Text style={styles.placeholderText}>أضف باقة أخرى</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.secondary} />
            <Text style={styles.loadingText}>جارٍ تحميل التفاصيل...</Text>
          </View>
        ) : null}

        <View style={styles.comparisonGrid}>
          {comparisonRows.map((row) => (
            <View
              key={row.key}
              style={[styles.gridRow, row.highlight && styles.gridRowHighlight, row.multiline && styles.gridRowTall]}
            >
              {cardsToRender.map((card) => {
                const cardKey = getCardKey(card);
                return (
                  <Text
                    key={`${row.key}-${cardKey}`}
                    style={[
                      styles.gridValue,
                      row.multiline && styles.gridValueMultiline,
                      row.highlight && styles.gridValueHighlight
                    ]}
                  >
                    {row.render(card)}
                  </Text>
                );
              })}
              <Text style={[styles.gridLabel, styles.gridLabelRight, row.highlight && styles.gridLabelHighlight]}>
                {row.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.primaryAction, isCompareFull && styles.primaryActionDisabled]}
            onPress={handleOpenPicker}
            disabled={isCompareFull}
          >
            <Text style={styles.primaryActionText}>
              {isCompareFull ? 'وصلت للحد الأقصى' : 'أضف المزيد من الباقات'}
            </Text>
          </TouchableOpacity>
        </View>

        <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClosePicker}>
          <SafeAreaView style={styles.pickerSafeArea}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>أضف باقة للمقارنة</Text>
              <TouchableOpacity onPress={handleClosePicker}>
                <Text style={styles.pickerClose}>إغلاق</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerBody}>
              <Text style={styles.pickerLabel}>الفئة</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.pickerCategoryScroll}
                contentContainerStyle={styles.pickerCategoryRow}
              >
                {pickerCategoryOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => handlePickerTypeChange(option.key)}
                    style={[styles.pickerCategoryChip, pickerType === option.key && styles.pickerCategoryChipActive]}
                  >
                    <Text style={[styles.pickerCategoryChipText, pickerType === option.key && styles.pickerCategoryChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={styles.pickerSearchInput}
                value={pickerQuery}
                onChangeText={setPickerQuery}
                placeholder="ابحث باسم الشركة أو كود الباقة"
                placeholderTextColor="#94a3b8"
                textAlign="right"
              />

              {isCompareFull ? (
                <View style={styles.pickerLimitBox}>
                  <Text style={styles.pickerLimitText}>لا يمكنك إضافة المزيد من الباقات قبل إزالة واحدة.</Text>
                </View>
              ) : null}

              <View style={styles.pickerResultsArea}>
                {pickerLoading ? (
                  <View style={styles.pickerLoadingState}>
                    <ActivityIndicator color={colors.secondary} />
                    <Text style={styles.pickerLoadingText}>جارٍ تحميل الباقات...</Text>
                  </View>
                ) : pickerError ? (
                  <View style={styles.pickerErrorBox}>
                    <Text style={styles.pickerErrorText}>{pickerError}</Text>
                    <TouchableOpacity style={styles.pickerRetryBtn} onPress={handleRetryPicker}>
                      <Text style={styles.pickerRetryText}>أعد المحاولة</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
                    {filteredPickerCards.map((card) => {
                      const cardKey = getCardKey(card);
                      const alreadyInCompare = isInCompare(card?.id || card?._id);
                      const disabled = alreadyInCompare || isCompareFull;
                      return (
                        <TouchableOpacity
                          key={cardKey}
                          style={[styles.pickerRow, alreadyInCompare && styles.pickerRowSelected]}
                          disabled={disabled}
                          onPress={() => handleSelectPickerCard(card)}
                        >
                          <View>
                            <Text style={styles.pickerRowCode}>{card.code || 'بدون كود'}</Text>
                            <Text style={styles.pickerRowCompany}>{card.company || 'شركة غير معروفة'}</Text>
                            <Text style={styles.pickerRowPrice}>{formatPrice(card.lowest_price)}</Text>
                            <Text style={styles.pickerRowMeta}>{`${card.days || 0} أيام / ${card.nights || 0} ليالٍ`}</Text>
                            <Text style={styles.pickerRowDate}>{formatTravelWindow(card)}</Text>
                          </View>
                          <Text style={styles.pickerRowStatus}>
                            {alreadyInCompare ? 'مضافة' : typeLabelMap[card.type] || 'باقة'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {!filteredPickerCards.length ? (
                      <View style={styles.pickerEmptyState}>
                        <Text style={styles.pickerEmptyText}>لا توجد باقات مطابقة.</Text>
                      </View>
                    ) : null}
                  </ScrollView>
                )}
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  stackBackButton: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  stackBackText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    fontSize: 14
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    padding: 16,
    paddingBottom: 32
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 24,
    color: colors.primary
  },
  subtitle: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    marginTop: 2
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#eef3f8'
  },
  clearButtonText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary
  },
  cardsRow: {
    paddingVertical: 12
  },
  cardColumn: {
    width: 220,
    borderRadius: 20,
    backgroundColor: colors.surface,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#0000000f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3
  },
  cardPlaceholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#c5d7eb',
    backgroundColor: 'transparent',
    justifyContent: 'center'
  },
  placeholderText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    textAlign: 'center'
  },
  cardImage: {
    width: '100%',
    height: 110,
    borderRadius: 16,
    marginBottom: 12
  },
  cardCode: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 18,
    color: colors.primary
  },
  cardType: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.secondary,
    marginBottom: 6
  },
  cardPrice: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 18,
    color: colors.primary
  },
  cardMeta: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    marginVertical: 6
  },
  removeButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#fee2e2'
  },
  removeButtonText: {
    fontFamily: 'Tajawal_500Medium',
    color: '#b91c1c'
  },
  comparisonGrid: {
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    shadowColor: '#00000012',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 2
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  gridRowHighlight: {
    backgroundColor: '#fef9c3',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8
  },
  gridRowTall: {
    alignItems: 'flex-start'
  },
  gridLabel: {
    width: 110,
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary
  },
  gridLabelRight: {
    textAlign: 'right'
  },
  gridLabelHighlight: {
    color: '#b45309'
  },
  gridValue: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted
  },
  gridValueMultiline: {
    textAlign: 'right',
    lineHeight: 20
  },
  gridValueHighlight: {
    fontFamily: 'Tajawal_700Bold',
    color: '#b45309'
  },
  actionsRow: {
    marginTop: 20,
    gap: 12
  },
  primaryAction: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    paddingVertical: 14
  },
  primaryActionDisabled: {
    opacity: 0.5
  },
  primaryActionText: {
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Tajawal_700Bold'
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f3f7fb',
    marginTop: 12
  },
  loadingText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted
  },
  emptySafeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  emptyTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 22,
    color: colors.primary,
    marginBottom: 8
  },
  emptySubtitle: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    marginBottom: 16,
    textAlign: 'center'
  },
  emptyButton: {
    backgroundColor: colors.secondary,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12
  },
  emptyButtonText: {
    color: '#fff',
    fontFamily: 'Tajawal_700Bold'
  },
  pickerSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  pickerTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 20,
    color: colors.primary
  },
  pickerClose: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.secondary
  },
  pickerBody: {
    flex: 1
  },
  pickerLabel: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'right'
  },
  pickerCategoryScroll: {
    flexGrow: 0,
    flexShrink: 0
  },
  pickerCategoryRow: {
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  pickerCategoryChip: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginLeft: 12,
    backgroundColor: '#fff',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center'
  },
  pickerCategoryChipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary
  },
  pickerCategoryChipText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    fontSize: 13
  },
  pickerCategoryChipTextActive: {
    color: '#fff'
  },
  pickerSearchInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Tajawal_500Medium',
    marginBottom: 12,
    backgroundColor: '#fff'
  },
  pickerLimitBox: {
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#fffbeb',
    marginBottom: 12
  },
  pickerLimitText: {
    fontFamily: 'Tajawal_500Medium',
    color: '#b45309',
    textAlign: 'right'
  },
  pickerResultsArea: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 12
  },
  pickerList: {
    flex: 1
  },
  pickerLoadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  pickerLoadingText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted
  },
  pickerErrorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12
  },
  pickerErrorText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8
  },
  pickerRetryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.secondary
  },
  pickerRetryText: {
    color: '#fff',
    fontFamily: 'Tajawal_700Bold'
  },
  pickerListContent: {
    paddingBottom: 100
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  pickerRowSelected: {
    opacity: 0.5
  },
  pickerRowCode: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    textAlign: 'right'
  },
  pickerRowCompany: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    textAlign: 'right',
    marginTop: 4
  },
  pickerRowPrice: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.secondary,
    textAlign: 'right',
    marginTop: 4
  },
  pickerRowMeta: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    textAlign: 'right',
    marginTop: 4,
    fontSize: 13
  },
  pickerRowDate: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    textAlign: 'right',
    marginTop: 2,
    fontSize: 12
  },
  pickerRowStatus: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary
  },
  pickerEmptyState: {
    alignItems: 'center',
    paddingVertical: 40
  },
  pickerEmptyText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted
  }
});

export default CompareScreen;

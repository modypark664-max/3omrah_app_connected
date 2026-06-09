import React, { useMemo, useState, useEffect, useCallback, useContext, useRef } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  useWindowDimensions,
  Platform,
  Animated,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AuthContext from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import { typography } from '../theme/ui';
import { clamp, scale } from '../utils/responsive';
import { fetchBundlesOverview, toggleFavorite as toggleFavoriteApi } from '../services/api';

const BANNER_IMAGE = require('../../assets/hero.webp');
const BANNER_IMAGE_2 = require('../../assets/hero-2.webp');
const BANNER_IMAGE_3 = require('../../assets/hero-3.webp');

const HomeScreen = () => {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [likedOfferIds, setLikedOfferIds] = useState(() => new Set());
  const [homeData, setHomeData] = useState(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState(null);

  const horizontalPadding = 16;
  const bannerWidth = width - horizontalPadding * 2;
  const offerCardWidth = clamp(scale(168, width), 156, 188);

  const banners = [
    {
      id: '1',
      title: 'اكتشف العالم',
      subtitle: 'عش التجربة، ذكريات تدوم للأبد',
      image: BANNER_IMAGE
    },
    {
      id: '2',
      title: 'اكتشف العالم',
      subtitle: 'عش التجربة، ذكريات تدوم للأبد',
      image: BANNER_IMAGE_2
    },
    {
      id: '3',
      title: 'اكتشف العالم',
      subtitle: 'عش التجربة، ذكريات تدوم للأبد',
      image: BANNER_IMAGE_3
    }
  ];

  const [categories] = useState([
    {
      id: '2',
      title: 'رحلتك حسب اختيارك',
      subtitle: 'صمم رحلتك بطريقتك',
      color: colors.successSoft,
      icon: require('../../assets/رحلتك حسب اختيارك.webp'),
      action: { type: 'navigate', route: 'Bundles' }
    },
    {
      id: '3',
      title: 'رحلات داخلية',
      subtitle: 'اكتشف جمال بلدك',
      color: colors.warningSoft,
      icon: require('../../assets/رحلات داخليه.webp'),
      action: {
        type: 'navigate',
        route: 'Bundles',
        params: {
          screen: 'BundleType',
          params: {
            type: 'internal_tour',
            title: 'رحلات داخلية',
            description: 'اكتشف جمال بلدك مع برامج رحلة شاملة'
          }
        }
      }
    },
    {
      id: '4',
      title: 'رحلات خارجية',
      subtitle: 'وجهات حول العالم',
      color: colors.infoSoft,
      icon: require('../../assets/رحلات خارجيه.webp'),
      action: {
        type: 'navigate',
        route: 'Bundles',
        params: {
          screen: 'BundleType',
          params: {
            type: 'external_tour',
            title: 'رحلات خارجية',
            description: 'استمتع بوجهات عالمية وخدمات فاخرة'
          }
        }
      }
    },
    {
      id: '5',
      title: 'العمرة والحج',
      subtitle: 'رحلة روحانية لا تُنسى',
      color: colors.successSoft,
      icon: require('../../assets/عمره وحج.webp'),
      action: {
        type: 'navigate',
        route: 'Bundles',
        params: {
          screen: 'BundleType',
          params: {
            type: 'omrah',
            title: 'باقات العمرة',
            description: 'اختَر باقة عمرة مريحة ومتكاملة'
          }
        }
      }
    }
  ]);

  const specialOffers = useMemo(() => {
    if (!homeData?.bundleSections?.length) {
      return [];
    }

    return homeData.bundleSections
      .flatMap((section) => section.cards || [])
      .slice(0, 5);
  }, [homeData]);

  const likedMap = useMemo(() => likedOfferIds, [likedOfferIds]);

  const loadHomeData = useCallback(async () => {
    try {
      setHomeError(null);
      setHomeLoading(true);
      const response = await fetchBundlesOverview();
      if (!response?.success) {
        throw new Error(response?.message || 'تعذر تحميل محتوى الصفحة الرئيسية.');
      }
      setHomeData(response);
    } catch (error) {
      setHomeError(error?.message || 'حدث خطأ أثناء تحميل الصفحة الرئيسية.');
    } finally {
      setHomeLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const heroData = homeData?.hero || {
    title: 'اكتشف العالم',
    description: 'عش التجربة، ذكريات تدوم للأبد',
    buttonText: 'استكشف الآن',
    media: []
  };

  const bannerImageSource = heroData.media?.[0]?.url ? { uri: heroData.media[0].url } : BANNER_IMAGE;

  const heroBanners = [
    {
      id: '1',
      title: heroData.title,
      subtitle: heroData.description,
      image: bannerImageSource,
      buttonText: heroData.buttonText
    },
    {
      id: '2',
      title: heroData.title,
      subtitle: heroData.description,
      image: BANNER_IMAGE_2
    },
    {
      id: '3',
      title: heroData.title,
      subtitle: heroData.description,
      image: BANNER_IMAGE_3
    }
  ];

  const toggleLike = async (offerId) => {
    if (!offerId) return;
    try {
      await toggleFavoriteApi(offerId);
      setLikedOfferIds((prev) => {
        const next = new Set(prev);
        if (next.has(offerId)) {
          next.delete(offerId);
        } else {
          next.add(offerId);
        }
        return next;
      });
    } catch (error) {
      console.warn('[HomeScreen] toggleLike failed', error?.message || error);
    }
  };

  const handleBannerScroll = event => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / (bannerWidth + 12));
    setCurrentBannerIndex(index);
  };

  const navigateToBundles = () => {
    navigation.navigate('Bundles', { screen: 'BundlesOverview' });
  };

  const handleCategoryPress = item => {
    if (item?.action?.type === 'scrollTop') {
      return;
    }
    if (item?.action?.type === 'navigate' && item.action.route) {
      if (item.action.route === 'Bundles' && item.action.params) {
        navigation.navigate('Bundles', item.action.params);
        return;
      }
      if (item.action.route === 'Bundles') {
        navigation.navigate('Bundles', { screen: 'BundlesOverview' });
        return;
      }
      navigation.navigate(item.action.route, item.action.params);
    }
  };

  const handleOfferPress = offer => {
    navigation.navigate('OfferDetails', { offer });
  };

  const openOffers = () => {
    navigation.navigate('Offers', { offers: specialOffers });
  };

  const { isAuthenticated } = useContext(AuthContext);
  const { unreadCount } = useContext(NotificationContext);

  // ── Notification button animation ──
  const notifScale = useRef(new Animated.Value(1)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    // Pulsing dot animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true })
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const onNotifPressIn  = () => Animated.spring(notifScale, { toValue: 0.88, useNativeDriver: true }).start();
  const onNotifPressOut = () => Animated.spring(notifScale, { toValue: 1,    useNativeDriver: true, friction: 4 }).start();

  const openNotifications = () => {
    navigation.navigate('Notifications');
  };

  const openProfile = () => {
    navigation.navigate('More');
  };

  const openSearch = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('Search', { initialQuery: searchText });
  };

  if (homeLoading && !homeData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>جارٍ تحميل الصفحة الرئيسية...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bannerHeight = clamp(scale(210, width), 200, 240);
  const categoryCardWidth = clamp(scale(132, width), 124, 150);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>

            {/* ── زر الإشعارات المحسّن ── */}
            <Animated.View style={{ transform: [{ scale: notifScale }] }}>
              <Pressable
                onPress={openNotifications}
                onPressIn={onNotifPressIn}
                onPressOut={onNotifPressOut}
                accessibilityRole="button"
                accessibilityLabel="الإشعارات"
                style={styles.notifButton}
              >
                <Ionicons name="notifications" size={scale(22, width)} color={colors.brand} />
                {/* النقطة النابضة */}
                {unreadCount > 0 && (
                  <>
                    <Animated.View style={[styles.notificationDotRing, { transform: [{ scale: pulseAnim }] }]} />
                    <View style={styles.notificationDot} />
                  </>
                )}
              </Pressable>
            </Animated.View>

            <View style={styles.headerCenter}>
              <Text style={styles.greeting}>مرحباً بك</Text>
              <Text style={styles.question}>أين ترغب في الذهاب اليوم؟</Text>
            </View>

            <TouchableOpacity
              style={styles.profileImage}
              onPress={openProfile}
              accessibilityRole="button"
            >
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop'
                }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {homeError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{homeError}</Text>
          </View>
        ) : null}

        {/* ── مربع البحث المحسّن ── */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={openSearch}
          style={[
            styles.searchContainer,
            searchFocused && styles.searchContainerFocused
          ]}
          accessibilityRole="search"
        >
          <Ionicons
            name="search"
            size={scale(20, width)}
            color={searchFocused ? colors.brand : colors.placeholder}
          />
          <TextInput
            placeholder="ابحث عن وجهتك المفضلة"
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={openSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={openSearch}
            accessibilityRole="button"
            accessibilityLabel="خيارات البحث"
            style={styles.searchOptionsButton}
          >
            <Ionicons
              name="options-outline"
              size={scale(20, width)}
              color={searchFocused ? colors.brand : colors.placeholder}
            />
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.bannerSection}>
          <FlatList
            horizontal
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleBannerScroll}
            showsHorizontalScrollIndicator={false}
            data={heroBanners}
            keyExtractor={item => item.id}
            snapToInterval={bannerWidth + 12}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: horizontalPadding }}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            renderItem={({ item }) => (
              <View style={[styles.bannerCard, { width: bannerWidth, height: bannerHeight }]}>
                <Image
                  source={typeof item.image === 'string' ? { uri: item.image } : item.image}
                  style={styles.bannerImage}
                />
                <LinearGradient
                  colors={['transparent', colors.overlay, colors.overlayStrong]}
                  style={styles.bannerGradient}
                />
                <View style={styles.bannerContent}>
                  <Text style={styles.bannerTitle}>{item.title}</Text>
                  <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
                  <TouchableOpacity
                    style={styles.bannerButton}
                    onPress={navigateToBundles}
                    accessibilityRole="button"
                    activeOpacity={0.85}
                  >
                    <Text style={styles.bannerButtonText}>استكشف الآن</Text>
                    <Ionicons name="chevron-back" size={scale(14, width)} color={colors.white} />
                  </TouchableOpacity>
                </View>
                <View style={styles.dotsContainer}>
                  {heroBanners.map((_, index) => (
                    <View
                      key={String(index)}
                      style={[
                        styles.dot,
                        index === currentBannerIndex ? styles.dotActive : styles.dotInactive
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}
          />
        </View>

        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderDecor}>
              <View style={styles.dashedLine} />
              <View style={styles.planeCircle}>
                <Ionicons name="airplane" size={scale(14, width)} color={colors.brandSoft} />
              </View>
            </View>
            <Text style={styles.sectionTitle}>اختر نوع رحلتك</Text>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: item.color,
                    width: categoryCardWidth,
                    minHeight: clamp(scale(188, width), 176, 210)
                  }
                ]}
                onPress={() => handleCategoryPress(item)}
                accessibilityRole="button"
                activeOpacity={0.88}
              >
                <Image
                  source={typeof item.icon === 'string' ? { uri: item.icon } : item.icon}
                  style={styles.categoryBgImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={[colors.overlayLight, colors.overlayStrong]}
                  style={styles.categoryGradient}
                />
                <View style={styles.categoryArrow}>
                  <Ionicons name="chevron-back" size={scale(16, width)} color={colors.brand} />
                </View>
                <View style={styles.categoryTextContainer}>
                  <Text style={styles.categoryTitle}>{item.title}</Text>
                  <Text style={styles.categorySubtitle}>{item.subtitle}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.offersSection}>
          <View style={styles.offersHeader}>
            {specialOffers.length ? (
              <TouchableOpacity
                onPress={openOffers}
                accessibilityRole="button"
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllLink}>عرض كل العروض</Text>
                <Ionicons name="chevron-back" size={scale(14, width)} color={colors.brand} />
              </TouchableOpacity>
            ) : null}

            <View style={styles.offersTitleWrap}>
              <Ionicons name="pricetag" size={scale(18, width)} color={colors.brand} />
              <Text style={styles.offersTitle}>عروض خاصة لك</Text>
            </View>
          </View>

          {specialOffers.length ? (
            <FlatList
              horizontal
            showsHorizontalScrollIndicator={false}
            data={specialOffers}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.offersList}
            renderItem={({ item: offer }) => (
              <TouchableOpacity
                style={[styles.offerCard, { width: offerCardWidth }]}
                activeOpacity={0.88}
                onPress={() => handleOfferPress(offer)}
                accessibilityRole="button"
              >
                <View style={styles.offerImageWrap}>
                  <Image source={typeof offer.image === 'string' ? { uri: offer.image } : offer.image} style={styles.offerImage} />
                  <View style={[styles.discountBadge, { backgroundColor: offer.discountColor }]}>
                    <Text style={styles.discountText}>خصم {offer.discount}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.likeButton}
                    onPress={event => {
                      event?.stopPropagation?.();
                      toggleLike(offer.id);
                    }}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={likedMap.has(offer.id) ? 'heart' : 'heart-outline'}
                      size={scale(18, width)}
                      color={likedMap.has(offer.id) ? colors.danger : colors.placeholder}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.offerInfo}>
                  <Text style={styles.offerTitle}>
                    {offer.title} - {offer.days}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.discountedPrice, { color: offer.priceColor }]}>
                      {offer.discountedPrice}
                    </Text>
                    <Text style={styles.originalPrice}>{offer.originalPrice}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            />
          ) : (
            <View style={styles.emptyOffersPlaceholder}>
              <Text style={styles.emptyOffersText}>لا توجد عروض خاصة لك حالياً.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface
  },
  scrollContent: {
    paddingBottom: 24
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerSideButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // ── زر الإشعارات المحسّن ──
  notifButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8
      },
      android: { elevation: 3 }
    })
  },
  notificationDotRing: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
    opacity: 0.25
  },
  notificationDot: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  greeting: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: 'center'
  },
  question: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.surfaceMuted
  },
  avatar: {
    width: '100%',
    height: '100%'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 52,
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12
      },
      android: { elevation: 3 }
    })
  },
  searchContainerFocused: {
    borderColor: colors.brand,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 14
      },
      android: { elevation: 6 }
    })
  },
  searchOptionsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.regular,
    color: colors.text,
    textAlign: 'right',
    paddingVertical: 0
  },
  bannerSection: {
    marginBottom: 20
  },
  bannerCard: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative'
  },
  bannerImage: {
    width: '100%',
    height: '100%'
  },
  bannerGradient: {
    ...StyleSheet.absoluteFillObject
  },
  bannerContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 36,
    alignItems: 'flex-end'
  },
  bannerTitle: {
    fontSize: 26,
    fontFamily: typography.bold,
    color: colors.white,
    textAlign: 'right',
    alignSelf: 'stretch'
  },
  bannerSubtitle: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: colors.white,
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'right',
    alignSelf: 'stretch'
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.overlayStrong,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    gap: 4
  },
  bannerButtonText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: typography.bold
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6
  },
  dot: {
    height: 6,
    borderRadius: 3
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.white
  },
  dotInactive: {
    width: 6,
    backgroundColor: colors.white,
    opacity: 0.45
  },
  categoriesSection: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 10
  },
  sectionHeaderDecor: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dashedLine: {
    flex: 1,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.gray300
  },
  planeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: 'right'
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 12
  },
  categoryCard: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6
      },
      android: { elevation: 2 }
    })
  },
  categoryBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%'
  },
  categoryGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  categoryArrow: {
    alignSelf: 'flex-start',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    opacity: 0.9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  categoryTextContainer: {
    marginTop: 'auto',
    width: '100%'
  },
  categoryTitle: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: colors.white,
    textAlign: 'right',
    lineHeight: 18
  },
  categorySubtitle: {
    fontSize: 10,
    fontFamily: typography.regular,
    color: colors.white,
    opacity: 0.85,
    marginTop: 4,
    textAlign: 'right',
    lineHeight: 14
  },
  offersSection: {
    paddingBottom: 8
  },
  offersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14
  },
  offersTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  offersTitle: {
    fontSize: 17,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: 'right'
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  viewAllLink: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: colors.brand
  },
  offersList: {
    paddingHorizontal: 16,
    gap: 12
  },
  emptyOffersPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 136,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted
  },
  emptyOffersText: {
    fontSize: 14,
    fontFamily: typography.medium,
    color: colors.muted,
    textAlign: 'center'
  },
  offerCard: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10
      },
      android: { elevation: 4 }
    })
  },
  offerImageWrap: {
    height: 128,
    position: 'relative'
  },
  offerImage: {
    width: '100%',
    height: '100%'
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  discountText: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: colors.text
  },
  likeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    opacity: 0.95,
    justifyContent: 'center',
    alignItems: 'center'
  },
  offerInfo: {
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  offerTitle: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: 'right'
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6
  },
  discountedPrice: {
    fontSize: 16,
    fontFamily: typography.bold
  },
  originalPrice: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: colors.muted,
    textDecorationLine: 'line-through'
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.surface
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontFamily: typography.medium,
    color: colors.muted,
    textAlign: 'center'
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#E0B4B4'
  },
  errorBannerText: {
    fontSize: 13,
    fontFamily: typography.regular,
    color: '#9A1F1F',
    textAlign: 'right'
  }
});

export default HomeScreen;

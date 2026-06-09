import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import colors from '../theme/colors';
import { fetchBundlesOverview } from '../services/api';
import SectionHeader from '../components/SectionHeader';
import PackageCard from '../components/PackageCard';
import useFavorites from '../hooks/useFavorites';
import CompareContext from '../context/CompareContext';
import ChatContext from '../context/ChatContext';
import BundlesNavHeader from '../components/BundlesNavHeader';

const TestimonialCard = ({ testimonial }) => (
  <View style={styles.testimonialCard}>
    <Text style={styles.testimonialText}>{testimonial.text}</Text>
    <Text style={styles.testimonialName}>{testimonial.name}</Text>
    {testimonial.company ? <Text style={styles.testimonialCompany}>{testimonial.company}</Text> : null}
    <Text style={styles.testimonialRating}>{'⭐'.repeat(testimonial.rating || 5)}</Text>
  </View>
);

const FALLBACK_PREVIEW_IMAGE = require('../../assets/hero.webp');
const getSource = (v) => (typeof v === 'string' ? { uri: v } : v);
const FALLBACK_PARTNER_LOGOS = [
  'https://res.cloudinary.com/dxvxamtu8/image/upload/v1758812085/expertease_uploads/1758812084730-2c95b00b-5e5f-4e49-8b1e-5f00c51cfe01.jpg',
  'https://res.cloudinary.com/dxvxamtu8/image/upload/v1761636836/expertease_uploads/1761636835541-LOGO%20%28update%29.jpg',
  'https://res.cloudinary.com/dxvxamtu8/image/upload/v1763996802/expertease_uploads/1763996802169-%D8%AF%D8%B1%D9%8A%D9%85%D8%B2%D8%B1.png'
];
const PARTNER_MARQUEE_REPEAT = 3;
const PARTNER_MARQUEE_SPEED = 45; // pixels per second for consistent marquee speed

const extractLogoUri = (logo) => {
  if (!logo) {
    return '';
  }
  if (typeof logo === 'string') {
    return logo;
  }
  if (typeof logo === 'object') {
    return (
      logo.url ||
      logo.uri ||
      logo.logo ||
      logo.logoUrl ||
      logo.image ||
      logo.imageUrl ||
      logo.media?.url ||
      ''
    );
  }
  return '';
};

const buildLogoEntry = (logo, index) => ({
  key: `partner-logo-${logo?._id || logo?.id || index}`,
  uri: extractLogoUri(logo)
});

const resolveCardPreviewImage = (card) => {
  if (!card) {
    return FALLBACK_PREVIEW_IMAGE;
  }
  const gallery = Array.isArray(card.images) ? card.images.filter(Boolean) : [];
  if (gallery.length) {
    return gallery[0];
  }
  if (card.thumbnail) {
    return card.thumbnail;
  }
  return FALLBACK_PREVIEW_IMAGE;
};

const logPreviewResolution = (card, resolvedUri) => {
  const debugPayload = {
    cardId: card?.id || card?._id,
    code: card?.code,
    hasImagesArray: Array.isArray(card?.images),
    imagesCount: Array.isArray(card?.images) ? card.images.filter(Boolean).length : 0,
    thumbnail: card?.thumbnail,
    resolvedUri
  };
  console.log('[BundlesOverview] Preview resolution', debugPayload);
};

const BundlesOverviewScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const noOffersMode = route.params?.noOffersMode;
  const [imagePreviewCard, setImagePreviewCard] = useState(null);
  const [previewImageUri, setPreviewImageUri] = useState(null);
  const [categoryChooserVisible, setCategoryChooserVisible] = useState(false);
  const [pendingSection, setPendingSection] = useState(null);
  const marqueeAnim = useRef(new Animated.Value(0)).current;
  const [marqueeWidth, setMarqueeWidth] = useState(0);
  const compareContext = useContext(CompareContext);
  const { openChat } = useContext(ChatContext);
  const { isFavorite: isCardFavorite, favoriteLoadingId, toggleFavoriteId } = useFavorites();

  const loadOverview = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchBundlesOverview();
      if (!response?.success) {
        throw new Error(response?.message || 'تعذر تحميل محتوى الباقات.');
      }
      setData(response);
    } catch (err) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!noOffersMode) {
      loadOverview();
    }
  }, [loadOverview, noOffersMode]);

  const partnerLogos = useMemo(() => {
    const source = data?.partnerLogos || [];
    const normalized = source
      .map((logo, index) => {
        const entry = buildLogoEntry(logo, index);
        if (!entry.uri) {
          console.log('[BundlesOverview] Dropping partner logo with missing URI', {
            index,
            logo
          });
        }
        return entry;
      })
      .filter((entry) => Boolean(entry.uri));

    if (normalized.length) {
      console.log('[BundlesOverview] Using API partner logos', {
        requested: source.length,
        count: normalized.length,
        uris: normalized.map((logo) => logo.uri)
      });
      return normalized;
    }

    console.log('[BundlesOverview] Falling back to default partner logos');
    return FALLBACK_PARTNER_LOGOS.map((uri, index) => ({ key: `fallback-logo-${index}`, uri }));
  }, [data?.partnerLogos]);

  const marqueeLogos = useMemo(() => {
    if (!partnerLogos.length) {
      return [];
    }

    const loops = [];
    for (let loopIndex = 0; loopIndex < PARTNER_MARQUEE_REPEAT; loopIndex += 1) {
      partnerLogos.forEach((logo, index) => {
        loops.push({
          ...logo,
          key: `${logo.key || 'partner-logo'}-loop-${loopIndex}-${index}`
        });
      });
    }

    return loops;
  }, [partnerLogos]);

  useEffect(() => {
    if (!data) {
      return;
    }
    console.log('[BundlesOverview] Raw partner logos payload', {
      count: data?.partnerLogos?.length || 0,
      sample: (data?.partnerLogos || []).slice(0, 3)
    });
  }, [data]);

  useEffect(() => {
    console.log('[BundlesOverview] Processed partner logos state', {
      count: partnerLogos.length,
      uris: partnerLogos.map((logo) => logo.uri)
    });
    console.log('[BundlesOverview] Marquee track logo count', marqueeLogos.length);
  }, [partnerLogos, marqueeLogos]);

  const marqueeLoopDistance = marqueeWidth && partnerLogos.length ? marqueeWidth / PARTNER_MARQUEE_REPEAT : 0;
  const marqueeCycleDuration = marqueeLoopDistance
    ? Math.max(6000, (marqueeLoopDistance / PARTNER_MARQUEE_SPEED) * 1000)
    : 0;

  useEffect(() => {
    marqueeAnim.stopAnimation();

    if (!partnerLogos.length || !marqueeLoopDistance || !marqueeCycleDuration) {
      marqueeAnim.setValue(0);
      return;
    }

    marqueeAnim.setValue(0);

    const animation = Animated.loop(
      Animated.timing(marqueeAnim, {
        toValue: 1,
        duration: marqueeCycleDuration,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false
      })
    );
    animation.start();
    return () => animation.stop();
  }, [marqueeAnim, marqueeCycleDuration, marqueeLoopDistance, partnerLogos.length]);
  const marqueeStyle = marqueeLoopDistance
    ? {
        transform: [
          {
            translateX: marqueeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -marqueeLoopDistance]
            })
          }
        ]
      }
    : null;

  const handleRefresh = () => {
    setRefreshing(true);
    loadOverview();
  };

  const heroMedia = data?.hero?.media?.[0];
  const heroMediaUri = heroMedia?.url || FALLBACK_PREVIEW_IMAGE;
  const heroMediaIsVideo = heroMedia?.type === 'video';

  const orderedBundleSections = useMemo(() => {
    if (!Array.isArray(data?.bundleSections)) {
      return [];
    }

    const priority = ['omrah', 'ramadan', 'internal_tour', 'external_tour', '7ag'];
    const sectionsByType = data.bundleSections.reduce((acc, section) => {
      if (section?.type && !acc[section.type]) {
        acc[section.type] = section;
      }
      return acc;
    }, {});

    const prioritized = priority.map((type) => sectionsByType[type]).filter(Boolean);
    const leftovers = data.bundleSections.filter((section) => !priority.includes(section?.type));

    const result = [];
    const seenTypes = new Set();
    [...prioritized, ...leftovers].forEach((section) => {
      const typeKey = section?.type || `section-${result.length}`;
      if (typeKey && seenTypes.has(typeKey)) {
        return;
      }
      result.push(section);
      if (typeKey) {
        seenTypes.add(typeKey);
      }
    });

    return result;
  }, [data?.bundleSections]);

  const goToListing = (section) => {
    if (!section?.type) {
      return;
    }

    if (section.type === 'omrah') {
      setPendingSection(section);
      setCategoryChooserVisible(true);
      return;
    }

    navigation.navigate('BundleType', {
      type: section.type,
      title: section.title,
      description: section.description
    });
  };

  const closeCategoryChooser = () => {
    setCategoryChooserVisible(false);
    setPendingSection(null);
  };

  const handleChooseCategory = (targetType) => {
    if (!targetType) {
      return;
    }
    const section = pendingSection;
    closeCategoryChooser();
    navigation.navigate('BundleType', {
      type: targetType,
      title: targetType === '7ag' ? 'باقات الحج' : section?.title || 'قائمة الباقات',
      description:
        targetType === '7ag'
          ? 'اختر من باقات الحج المعتمدة لدينا'
          : section?.description
    });
  };

  const handleImagePreview = (card) => {
    if (!card) return;
    const resolvedUri = resolveCardPreviewImage(card);
    logPreviewResolution(card, resolvedUri);
    setImagePreviewCard(card);
    setPreviewImageUri(resolvedUri || FALLBACK_PREVIEW_IMAGE);
  };

  const closeImagePreview = () => {
    setImagePreviewCard(null);
    setPreviewImageUri(null);
  };

  const openCardDetails = (card) => {
    if (!card?.id) {
      return;
    }
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

  return (
    <View style={styles.noOffersContainer}>
      <BundlesNavHeader
        navigation={navigation}
        route={route}
        options={{ title: 'دليل الباقات' }}
        back={navigation.canGoBack()}
      />
      <View style={styles.noOffersContent}>
        <Text style={styles.noOffersTitle}>لا توجد عروض حالية</Text>
        <Text style={styles.noOffersSubtitle}>
          نعتذر، لا توجد باقات متاحة في الوقت الحالي.
        </Text>
        <TouchableOpacity
          style={styles.noOffersButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={styles.noOffersButtonText}>رجوع</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BundlesOverviewScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  contentContainer: {
    paddingBottom: 60
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    textAlign: 'right'
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20
  },
  errorTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.danger,
    fontSize: 18,
    marginBottom: 6,
    textAlign: 'right'
  },
  errorText: {
    color: colors.muted,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right'
  },
  retryBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    backgroundColor: colors.danger,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8
  },
  retryText: {
    color: '#fff',
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'right'
  },
  hero: {
    marginBottom: 24
  },
  heroCopyCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#00000026',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6
  },
  heroMediaWrapper: {
    height: 260,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0000001a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8
  },
  heroMedia: {
    width: '100%',
    height: '100%'
  },
  heroImage: {
    borderRadius: 28
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject
  },
  heroEyebrow: {
    color: '#c7d2fe',
    fontFamily: 'Tajawal_500Medium',
    marginBottom: 6,
    textAlign: 'right'
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'Tajawal_700Bold',
    marginBottom: 8,
    textAlign: 'right'
  },
  heroDescription: {
    color: '#e0e7ff',
    fontFamily: 'Tajawal_400Regular',
    fontSize: 16,
    marginBottom: 0,
    textAlign: 'right'
  },
  partnerBanner: {
    height: 140,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24
  },
  partnerBannerImage: {
    borderRadius: 24
  },
  partnerBannerContent: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 20,
    justifyContent: 'center'
  },
  partnerBannerTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right'
  },
  partnerBannerSubtext: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Tajawal_400Regular',
    marginTop: 8,
    textAlign: 'right'
  },
  partnerSection: {
    marginBottom: 24
  },
  partnerMarqueeContainer: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    paddingVertical: 12
  },
  partnerMarqueeTrack: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  partnerMarqueeLogo: {
    width: 140,
    height: 72,
    marginHorizontal: 20,
    opacity: 0.95
  },
  section: {
    marginBottom: 32
  },
  cardsRow: {
    paddingVertical: 16
  },
  emptyText: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    textAlign: 'right'
  },
  noOffersContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  noOffersContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  noOffersTitle: {
    fontSize: 24,
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 14
  },
  noOffersSubtitle: {
    fontSize: 16,
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 26,
    lineHeight: 24
  },
  noOffersButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    minWidth: 140,
    alignItems: 'center'
  },
  noOffersButtonText: {
    fontSize: 14,
    fontFamily: 'Tajawal_700Bold',
    color: '#FFFFFF'
  },
  testimonialCard: {
    width: 260,
    marginRight: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    padding: 16,
    shadowColor: '#00000014',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4
  },
  testimonialText: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.primary,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'right'
  },
  testimonialName: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    textAlign: 'right'
  },
  testimonialCompany: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right'
  },
  testimonialRating: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.secondary,
    marginTop: 8,
    textAlign: 'right'
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
    color: '#fff',
    fontFamily: 'Tajawal_700Bold',
    textAlign: 'right'
  },
  chooserBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  chooserCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20
  },
  chooserTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 20,
    color: colors.primary,
    textAlign: 'right'
  },
  chooserSubtitle: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 16
  },
  chooserButton: {
    borderWidth: 1,
    borderColor: '#e0e6ed',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.background
  },
  chooserButtonTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
    color: colors.primary,
    textAlign: 'right'
  },
  chooserButtonHint: {
    fontFamily: 'Tajawal_400Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'right'
  },
  chooserClose: {
    marginTop: 4,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10
  },
  chooserCloseText: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.secondary,
    textAlign: 'right'
  }
});

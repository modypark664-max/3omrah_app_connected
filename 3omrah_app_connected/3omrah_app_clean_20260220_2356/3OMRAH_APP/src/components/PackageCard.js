import React, { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { API_BASE_URL } from '../config/env';
import formatPrice from '../utils/formatPrice';

const formatDate = (dateString) => {
  if (!dateString) {
    return 'غير محدد';
  }
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric'
    });
  } catch (_error) {
    return 'غير محدد';
  }
};

const InfoPill = ({ label }) => (
  <View style={styles.pill}>
    <Text style={styles.pillText}>{label}</Text>
  </View>
);

const FALLBACK_IMAGE = require('../../assets/hero.webp');

const PackageCard = ({
  card,
  onPress,
  variant = 'default',
  onImagePress,
  onDetailsPress,
  onFavorite,
  onCompare,
  onShare,
  onChat,
  isFavorite = false,
  isCompared = false,
  favoritePending = false
}) => {
  const safeCard = card || {};
  const {
    code,
    lowest_price,
    days,
    nights,
    going_route,
    plane_company,
    offer_type,
    travel_date,
    offer_expiry_date,
    isExpired,
    thumbnail
  } = safeCard;
  const travelDate = formatDate(travel_date);
  const expiryDate = formatDate(offer_expiry_date);
  const initialImage = thumbnail || FALLBACK_IMAGE;
  const [imageUri, setImageUri] = useState(initialImage);

  useEffect(() => {
    setImageUri(initialImage);
  }, [initialImage]);

  const shareUrlBase = API_BASE_URL?.replace(/\/$/, '') || 'https://rehlatty.com';
  const shareUrl = card?.shareUrl || `${shareUrlBase}/card/${card?.id || card?.code || ''}`;

  const handleFavoritePress = (event) => {
    event?.stopPropagation?.();
    onFavorite?.(card);
  };

  const handleComparePress = (event) => {
    event?.stopPropagation?.();
    onCompare?.(card);
  };

  const handleSharePress = async (event) => {
    event?.stopPropagation?.();
    try {
      console.log('[PackageCard] Share pressed', { url: shareUrl });
      if (onShare) {
        onShare(card, shareUrl);
        return;
      }
      await Share.share({
        message: `${card?.name || 'باقة مميزة'} - ${shareUrl}`,
        url: shareUrl
      });
    } catch (error) {
      console.log('[PackageCard] Share error', error);
    }
  };

  const handleChatPress = (event) => {
    event?.stopPropagation?.();
    if (onChat) {
      onChat(card);
    }
  };

  if (!card) {
    return null;
  }

  return (
    <Pressable onPress={() => onPress?.(card)} style={[styles.card, variant === 'list' && styles.cardList]} accessibilityRole="button">
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={(event) => {
          event?.stopPropagation?.();
          onImagePress?.(card);
        }}
        style={styles.imageWrapper}
      >
        {
          (() => {
            const source = typeof imageUri === 'string' ? { uri: imageUri } : imageUri;
            return (
              <Image
                source={source}
                style={styles.image}
                resizeMode="cover"
                onError={() => setImageUri(FALLBACK_IMAGE)}
              />
            );
          })()
        }
        <View style={styles.imageOverlay} />
        <View style={styles.imageBadgeRow}>
          {offer_type ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{offer_type}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.viewImageLabel}>اضغط لعرض الصورة</Text>
      </TouchableOpacity>
      <View style={styles.cardHeader}>
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>كود الباقة</Text>
          <Text style={styles.codeValue}>{code || 'بدون'}</Text>
        </View>
      </View>

  <Text style={styles.price}>{`${formatPrice(lowest_price)} ج.م`}</Text>
      <Text style={styles.subtitle}>{travelDate}</Text>

      <View style={styles.row}>
        <InfoPill label={`${days || 0} أيام / ${nights || 0} ليالٍ`} />
        {going_route ? <InfoPill label={going_route} /> : null}
      </View>

      <View style={styles.row}>
        {plane_company ? <InfoPill label={`الخطوط: ${plane_company}`} /> : null}
        <InfoPill label={`السعر يبدأ من`} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.expiryLabel}>انتهاء العرض: {expiryDate}</Text>
        <View style={[styles.statusDot, isExpired ? styles.statusDotDanger : styles.statusDotSafe]} />
      </View>

      <View style={styles.actionRow}>
        <View style={styles.actionItem}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleFavoritePress}
            style={[styles.iconButton, isFavorite && styles.iconButtonFavoriteActive]}
            disabled={favoritePending}
          >
            {favoritePending ? (
              <ActivityIndicator size="small" color={isFavorite ? '#b91c1c' : colors.secondary} />
            ) : (
              <MaterialCommunityIcons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? '#b91c1c' : colors.primary}
              />
            )}
          </TouchableOpacity>
          <Text style={styles.actionLabel}>{isFavorite ? 'بالمفضلة' : 'مفضلة'}</Text>
        </View>

        <View style={styles.actionItem}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleComparePress}
            style={[styles.iconButton, isCompared && styles.iconButtonCompareActive]}
          >
            <MaterialCommunityIcons
              name="scale-balance"
              size={22}
              color={isCompared ? colors.secondary : colors.primary}
            />
          </TouchableOpacity>
          <Text style={styles.actionLabel}>{isCompared ? 'بالمقارنة' : 'قارن'}</Text>
        </View>

        <View style={styles.actionItem}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleSharePress}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons name="share-variant" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.actionLabel}>مشاركة</Text>
        </View>

        <View style={styles.actionItem}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleChatPress}
            style={[styles.iconButton, styles.iconButtonChat]}
          >
            <MaterialCommunityIcons name="message-text-outline" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={[styles.actionLabel, styles.actionLabelChat]}>دردشة</Text>
        </View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        onPress={(event) => {
          event?.stopPropagation?.();
          onDetailsPress?.(card);
        }}
        style={styles.detailsButton}
      >
        <Text style={styles.detailsButtonText}>عرض التفاصيل</Text>
      </TouchableOpacity>
    </Pressable>
  );
};

export default memo(PackageCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
    width: 280,
    shadowColor: '#00000014',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4
  },
  cardList: {
    width: '100%',
    marginRight: 0,
    marginBottom: 16
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 140,
    marginBottom: 12,
    backgroundColor: colors.background
  },
  image: {
    width: '100%',
    height: '100%'
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)'
  },
  imageBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  viewImageLabel: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontFamily: 'Tajawal_500Medium',
    fontSize: 12,
    textAlign: 'right'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end'
  },
  codeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  codeLabel: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: 'Tajawal_400Regular',
    marginBottom: 2,
    textAlign: 'right'
  },
  codeValue: {
    fontSize: 18,
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    textAlign: 'right'
  },
  badge: {
    backgroundColor: `${colors.secondary}22`,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  badgeText: {
    color: colors.secondary,
    fontFamily: 'Tajawal_500Medium',
    fontSize: 12,
    textAlign: 'right'
  },
  price: {
    fontSize: 28,
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    marginTop: 12,
    textAlign: 'right'
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 12,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right'
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    justifyContent: 'flex-end'
  },
  pill: {
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8
  },
  pillText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'right'
  },
  footer: {
    marginTop: 12,
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  expiryLabel: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right',
    marginLeft: 8
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 999
  },
  statusDotSafe: {
    backgroundColor: colors.success
  },
  statusDotDanger: {
    backgroundColor: colors.danger
  },
  detailsButton: {
    marginTop: 14,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 10
  },
  detailsButtonText: {
    textAlign: 'center',
    color: colors.white,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 14
  },
  actionRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionItem: {
    flex: 1,
    alignItems: 'center'
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconButtonFavoriteActive: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft
  },
  iconButtonCompareActive: {
    borderColor: colors.info,
    backgroundColor: colors.infoSoft
  },
  iconButtonChat: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary
  },
  actionLabel: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    textAlign: 'right'
  },
  actionLabelChat: {
    color: colors.secondary
  }
});

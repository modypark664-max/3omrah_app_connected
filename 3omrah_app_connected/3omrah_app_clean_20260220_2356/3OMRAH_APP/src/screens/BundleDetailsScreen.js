import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import colors from '../theme/colors';
import { fetchBundleDetails, submitBundleReservation } from '../services/api';
import ChatContext from '../context/ChatContext';
import BundlesNavHeader from '../components/BundlesNavHeader';
import useFavorites from '../hooks/useFavorites';
import formatPrice from '../utils/formatPrice';

const DEFAULT_IMAGE = require('../../assets/hero.webp');
const getSource = (v) => (typeof v === 'string' ? { uri: v } : v);
const DEFAULT_INCLUDED = [
  'استخراج التأشيرة + الباركود',
  'الإقامة بالفنادق المذكورة',
  'الانتقالات الداخلية بين مكة والمدينة',
  'الانتقالات من وإلى المطار',
  'إشراف إداري وديني طوال الرحلة'
];
const DEFAULT_NOT_INCLUDED = ['أسعار البرنامج لا تشمل تذاكر الطيران'];
const DEFAULT_NOTES = [
  'يتم سداد 50% من قيمة الرحلة عند التعاقد',
  'أي تغيير في سعر الصرف يُضاف على المبلغ المتبقي',
  'خصم لحاملي التأشيرات السارية والمستخدمة مسبقاً'
];
const DEFAULT_CANCELLATION = [
  'قبل موعد السفر بأكثر من 30 يوم → استرداد 100% من المبلغ المدفوع',
  'قبل أقل من 30 يوم → تطبق غرامات حسب سياسة الشركة'
];
const DEFAULT_GALLERY = [
  'https://rehlatty.com/imgs/Rectangle%2010%20(1).png',
  'https://rehlatty.com/imgs/Rectangle%2017.png',
  'https://rehlatty.com/imgs/Rectangle%2018.png',
  'https://rehlatty.com/imgs/Rectangle%2019.png'
];

const InfoCard = ({ label, value }) => (
  <View style={styles.infoCard}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || 'غير متوفر'}</Text>
  </View>
);

const BulletSection = ({ title, items = [], fallback = [] }) => {
  const list = items.length ? items : fallback;
  if (!list.length) {
    return null;
  }
  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailTitle}>{title}</Text>
      {list.map((item, index) => (
        <View key={`${title}-${index}`} style={styles.bulletRow}>
          <Text style={styles.bulletIcon}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
};

const HotelItem = ({ hotel }) => (
  <View style={styles.hotelRow}>
    <Text style={styles.hotelName}>{hotel.name}</Text>
    <Text style={styles.hotelMeta}>{`${hotel.nights || 0} ليالٍ - ${hotel.location || 'غير محدد'}`}</Text>
    <Text style={styles.hotelMeta}>{hotel.type || 'غير مصنف'}</Text>
    <Text style={styles.hotelMeta}>{hotel.includesMeals ? 'تشمل الوجبات' : 'بدون وجبات'}</Text>
  </View>
);

const HousingOption = ({ option }) => (
  <View style={styles.housingRow}>
    <Text style={styles.housingType}>{option.roomType}</Text>
    <Text style={styles.housingPrice}>{`${formatPrice(option.price)} ج.م`}</Text>
  </View>
);

const formatDate = (dateString) => {
  if (!dateString) return 'غير محدد';
  try {
    return new Date(dateString).toLocaleDateString('ar-EG');
  } catch (_error) {
    return 'غير محدد';
  }
};

const BundleDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { openChat } = useContext(ChatContext);
  const { isFavorite: isCardFavorite, favoriteLoadingId, toggleFavoriteId } = useFavorites();
  const cardId = route.params?.cardId;
  const fallbackCard = route.params?.fallbackCard;
  const [card, setCard] = useState(fallbackCard || null);
  const [loading, setLoading] = useState(!fallbackCard);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImage, setSelectedImage] = useState(fallbackCard?.thumbnail || DEFAULT_IMAGE);
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [peopleCount, setPeopleCount] = useState('1');
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [note, setNote] = useState('');
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [reservationResult, setReservationResult] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: fallbackCard?.code ? `باقة ${fallbackCard.code}` : 'تفاصيل الباقة' });
  }, [fallbackCard?.code, navigation]);

  useEffect(() => {
    if (!cardId) {
      setError('لا يوجد معرف لهذه الباقة');
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadDetails = async () => {
      try {
        if (!fallbackCard) {
          setLoading(true);
        }
        const response = await fetchBundleDetails(cardId);
        if (!response?.success) {
          throw new Error(response?.message || 'تعذر تحميل تفاصيل الباقة');
        }
        if (isMounted) {
          setCard(response.card);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'حدث خطأ غير متوقع');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [cardId, fallbackCard]);

  useEffect(() => {
    setSelectedImage(card?.thumbnail || DEFAULT_IMAGE);
  }, [card?.thumbnail]);

  const housingOptions = useMemo(() => {
    if (!Array.isArray(card?.plane?.housingOptions)) {
      return [];
    }
    return card.plane.housingOptions.filter((option) => option?.roomType);
  }, [card?.plane?.housingOptions]);

  const hasHousingOptions = housingOptions.length > 0;

  const cardIdentifier = card?._id || card?.id || cardId;

  const isFavorite = cardIdentifier ? isCardFavorite(cardIdentifier) : false;
  const favoritePending = cardIdentifier ? favoriteLoadingId === cardIdentifier : false;
  const handleToggleFavorite = async () => {
    if (!cardIdentifier) {
      return;
    }
    await toggleFavoriteId(cardIdentifier);
  };

  useEffect(() => {
    if (!cardIdentifier) {
      return;
    }
    setApplicantName('');
    setApplicantPhone('');
    setPeopleCount('1');
    setNote('');
    setReservationResult(null);
    const defaultRoom = housingOptions[0]?.roomType || '';
    setSelectedRoomType(defaultRoom);
  }, [cardIdentifier, housingOptions]);

  const selectedHousingOption = useMemo(
    () => housingOptions.find((option) => option.roomType === selectedRoomType),
    [housingOptions, selectedRoomType]
  );

  const peopleCountNumber = useMemo(() => {
    const parsed = parseInt(peopleCount, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return 1;
    }
    return parsed;
  }, [peopleCount]);

  const estimatedUnitPrice = selectedHousingOption?.price ?? card?.lowest_price ?? 0;
  const hasEstimatedPrice = estimatedUnitPrice > 0;
  const estimatedTotal = estimatedUnitPrice * peopleCountNumber;

  const galleryImages = useMemo(() => {
    if (card?.images?.length) {
      return card.images;
    }
    return DEFAULT_GALLERY;
  }, [card]);

  const openImage = (image = selectedImage) => setImagePreview(image);
  const closeImage = () => setImagePreview(null);
  const goToContact = () => navigation.getParent()?.navigate?.('Contact');
  const handlePhoneChange = (value) => {
    setApplicantPhone(value.replace(/[^0-9]/g, ''));
  };
  const handlePeopleCountChange = (value) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setPeopleCount(sanitized);
  };

  const handleOpenPayment = useCallback(
    async (resultOverride) => {
      const target = resultOverride || reservationResult;
      console.log('[BundleDetails] handleOpenPayment:start', {
        hasResult: Boolean(target),
        reservationId: target?.reservationId
      });
      if (!target?.reservationId) {
        return;
      }
      navigation.navigate('BundlePayment', {
        reservationId: target.reservationId,
        fallbackPaymentUrl: target.paymentUrl || null
      });
    },
    [navigation, reservationResult]
  );

  const closeReservationModal = () => setReservationResult(null);

  const handleSubmitReservation = async () => {
    if (submittingReservation) {
      return;
    }

    console.log('[BundleDetails] handleSubmitReservation:start', {
      applicantName,
      applicantPhone,
      peopleCount,
      selectedRoomType,
      noteLength: note?.length,
      cardIdentifier
    });

    if (!applicantName.trim()) {
      Alert.alert('بيانات غير مكتملة', 'يرجى إدخال اسمك الكامل كما سيظهر في الحجز.');
      return;
    }

    if (!/^[0-9]{11}$/.test(applicantPhone)) {
      Alert.alert('بيانات غير مكتملة', 'رقم الهاتف يجب أن يتكون من 11 رقماً (مثال: 01012345678).');
      return;
    }

    if (!selectedRoomType.trim()) {
      Alert.alert('بيانات غير مكتملة', 'يرجى تحديد نوع الغرفة أو كتابته بشكل صحيح.');
      return;
    }

    if (!cardIdentifier) {
      Alert.alert('حدث خطأ', 'لا يمكن تحديد هذه الباقة حالياً.');
      return;
    }

    const numericPeopleCount = Math.max(1, parseInt(peopleCount || '1', 10) || 1);

    try {
      setSubmittingReservation(true);
      console.log('[BundleDetails] handleSubmitReservation:requesting');
      const result = await submitBundleReservation({
        cardId: cardIdentifier,
        username: applicantName.trim(),
        phoneNumber: applicantPhone.trim(),
        peopleCount: numericPeopleCount,
        roomType: selectedRoomType.trim(),
        note: note.trim()
      });
      console.log('[BundleDetails] handleSubmitReservation:success', result);
      await handleOpenPayment(result);
      setReservationResult(result);
    } catch (err) {
      console.log('[BundleDetails] handleSubmitReservation:error', err);
      Alert.alert('تعذر إرسال الطلب', err?.message || 'حدث خطأ غير متوقع. حاول مرة أخرى.');
    } finally {
      console.log('[BundleDetails] handleSubmitReservation:finished');
      setSubmittingReservation(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.secondary} size="large" />
        <Text style={styles.loadingText}>جارٍ تحميل تفاصيل الباقة...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>عودة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!card) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <BundlesNavHeader
          navigation={navigation}
          route={route}
          options={{ title: fallbackCard?.code ? `باقة ${fallbackCard.code}` : 'تفاصيل الباقة' }}
          back={navigation.canGoBack()}
        />
        <View style={styles.body}>
          <View style={styles.gallery}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => openImage()}>
              <Image source={getSource(selectedImage || DEFAULT_IMAGE)} style={styles.mainImage} />
              <Text style={styles.tapHint}>اضغط لمعاينة كاملة</Text>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow}>
              {galleryImages.map((img, index) => (
                <TouchableOpacity
                  key={`thumb-${index}`}
                  onPress={() => setSelectedImage(img)}
                  onLongPress={() => openImage(img)}
                >
                  <Image
                    source={getSource(img)}
                    style={[styles.thumbnail, selectedImage === img && styles.thumbnailActive]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.titleCard}>
            <Text style={styles.bundleTitle}>{card.name || `باقة ${card.code || ''}`}</Text>
            <Text style={styles.bundleCode}>
              كود العرض: <Text style={styles.bundleCodeValue}>{card.code}</Text>
            </Text>
          </View>

          <View style={styles.infoGrid}>
            <InfoCard label="تاريخ السفر" value={formatDate(card.travel_date)} />
            <InfoCard label="مدة العرض" value={`${card.days || 0} أيام / ${card.nights || 0} ليالٍ`} />
            <InfoCard label="انتهاء العرض" value={formatDate(card.offer_expiry_date)} />
            <InfoCard label="خط سير الذهاب" value={card.going_route} />
            <InfoCard label="خط سير العودة" value={card.returning_route} />
            <InfoCard label="شركة الطيران" value={card.plane_company} />
            {card.company ? <InfoCard label="الشركة المنظمة" value={card.company} /> : null}
          </View>

          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>السعر يبدأ من</Text>
            <Text style={styles.priceValue}>{`${formatPrice(card.lowest_price)} ج.م`}</Text>
            <View style={styles.detailActionRow}>
              <TouchableOpacity style={styles.contactBtn} onPress={goToContact}>
                <Text style={styles.contactBtnText}>تواصل للحجز</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.favoriteBtn, isFavorite && styles.favoriteBtnActive]}
                onPress={handleToggleFavorite}
                disabled={favoritePending}
              >
                {favoritePending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.favoriteBtnText}>{isFavorite ? 'بالمفضلة' : 'أضف للمفضلة'}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => {
                  console.log('[BundleDetails] Chat pressed', { id: card.id || card.code });
                  if (typeof openChat === 'function') {
                    openChat(card);
                  } else {
                    navigation.getParent()?.navigate?.('Contact', { prefill: card });
                  }
                }}
              >
                <Text style={styles.chatBtnText}>دردشة</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.applyCard}>
            <Text style={styles.applyTitle}>قدّم طلب الاشتراك الآن</Text>
            <Text style={styles.applyDescription}>
              بمجرد إدخال بياناتك سننشئ حجزاً مبدئياً ونفتح لك صفحة الدفع الآمنة لمتابعة التعليمات.
            </Text>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>الاسم الكامل</Text>
              <TextInput
                style={styles.textInput}
                placeholder="مثال: أحمد علي"
                placeholderTextColor="#9aa5b7"
                value={applicantName}
                onChangeText={setApplicantName}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>رقم الهاتف</Text>
              <TextInput
                style={styles.textInput}
                placeholder="01012345678"
                placeholderTextColor="#9aa5b7"
                keyboardType="phone-pad"
                maxLength={11}
                value={applicantPhone}
                onChangeText={handlePhoneChange}
              />
            </View>

            <View style={styles.inlineFields}>
              <View style={[styles.formField, styles.inlineField]}>
                <Text style={styles.inputLabel}>عدد الأفراد</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="1"
                  placeholderTextColor="#9aa5b7"
                  keyboardType="number-pad"
                  value={peopleCount}
                  onChangeText={handlePeopleCountChange}
                />
              </View>
              {!hasHousingOptions ? (
                <View style={[styles.formField, styles.inlineField]}>
                  <Text style={styles.inputLabel}>نوع الغرفة</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="مثال: غرفة مزدوجة"
                    placeholderTextColor="#9aa5b7"
                    value={selectedRoomType}
                    onChangeText={setSelectedRoomType}
                  />
                </View>
              ) : null}
            </View>

            {hasHousingOptions ? (
              <View style={styles.roomOptions}>
                {housingOptions.map((option, index) => {
                  const isActive = option.roomType === selectedRoomType;
                  return (
                    <TouchableOpacity
                      key={`room-option-${option.roomType || index}`}
                      style={[styles.roomOption, isActive && styles.roomOptionActive]}
                      onPress={() => setSelectedRoomType(option.roomType)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.roomOptionTitle}>{option.roomType}</Text>
                      <Text style={styles.roomOptionPrice}>{`${formatPrice(option.price)} ج.م`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.formField}>
              <Text style={styles.inputLabel}>ملاحظات إضافية</Text>
              <TextInput
                style={[styles.textInput, styles.noteInput]}
                placeholder="أي تفاصيل تود إضافتها (اختياري)"
                placeholderTextColor="#9aa5b7"
                multiline
                numberOfLines={3}
                value={note}
                onChangeText={setNote}
              />
            </View>

            <View style={styles.estimateBox}>
              <Text style={styles.estimateLabel}>التكلفة التقديرية</Text>
              <Text style={styles.estimateValue}>
                {hasEstimatedPrice ? `${formatPrice(estimatedTotal)} ج.م` : 'سيتم تحديد التكلفة بعد مراجعة الشركة'}
              </Text>
              {hasEstimatedPrice ? (
                <Text style={styles.estimateSubtext}>{`مبني على سعر ${selectedHousingOption?.roomType || 'أقل باقة'} × ${peopleCountNumber} أشخاص`}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.applyButton, submittingReservation && styles.applyButtonDisabled]}
              onPress={handleSubmitReservation}
              disabled={submittingReservation}
              activeOpacity={0.85}
            >
              {submittingReservation ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.applyButtonText}>التقديم وفتح صفحة الدفع</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.applyHint}>
              بعد الضغط على الزر سنوجهك مباشرةً إلى صفحة الدفع المشابهة لصفحة الموقع لمتابعة تعليمات الدفع والتأكيد.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>تفاصيل البرنامج</Text>
          <BulletSection title="يشمل البرنامج" items={card.included_services} fallback={DEFAULT_INCLUDED} />
          <BulletSection title="لا يشمل البرنامج" items={card.not_included_services} fallback={DEFAULT_NOT_INCLUDED} />
          <BulletSection title="ملاحظات هامة" items={card.notes} fallback={DEFAULT_NOTES} />
          <BulletSection title="سياسة الإلغاء" items={card.cancelling_rules} fallback={DEFAULT_CANCELLATION} />

          {card.plane?.hotel?.length ? (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>الفنادق وخطة الإقامة</Text>
              {card.plane.hotel.map((hotel, index) => (
                <HotelItem key={`hotel-${index}`} hotel={hotel} />
              ))}
            </View>
          ) : null}

          {card.plane?.housingOptions?.length ? (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>خيارات الغرف والأسعار</Text>
              {card.plane.housingOptions.map((option, index) => (
                <HousingOption key={`housing-${index}`} option={option} />
              ))}
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <Modal visible={Boolean(imagePreview)} transparent animationType="fade">
        <TouchableOpacity style={styles.imageModalBackdrop} onPress={closeImage}>
          <Image source={getSource(imagePreview || DEFAULT_IMAGE)} style={styles.imageModalPreview} resizeMode="contain" />
          <TouchableOpacity style={styles.imageModalClose} onPress={closeImage}>
            <Text style={styles.imageModalCloseText}>إغلاق</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={Boolean(reservationResult)} transparent animationType="fade" onRequestClose={closeReservationModal}>
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>تم إرسال طلبك بنجاح</Text>
            {reservationResult?.reservationId ? (
              <Text style={styles.successSubtitle}>{`رقم الحجز: ${reservationResult.reservationId}`}</Text>
            ) : null}
            <Text style={styles.successHint}>يمكنك فتح صفحة الدفع الآن لإتمام التعليمات أو العودة في أي وقت.</Text>
            <TouchableOpacity style={styles.successButton} onPress={handleOpenPayment}>
              <Text style={styles.successButtonText}>فتح صفحة الدفع</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.successSecondary} onPress={closeReservationModal}>
              <Text style={styles.successSecondaryText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default BundleDetailsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 32
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted
  },
  errorText: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center'
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10
  },
  retryText: {
    color: colors.white,
    fontFamily: 'Tajawal_700Bold'
  },
  gallery: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: 20
  },
  mainImage: {
    width: '100%',
    height: 220
  },
  tapHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    fontFamily: 'Tajawal_500Medium',
    fontSize: 12
  },
  thumbnailRow: {
    padding: 12,
    gap: 12
  },
  thumbnail: {
    width: 80,
    height: 70,
    borderRadius: 16,
    opacity: 0.7
  },
  thumbnailActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: colors.secondary
  },
  titleCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16
  },
  bundleTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 20,
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'right'
  },
  bundleCode: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    textAlign: 'right'
  },
  bundleCodeValue: {
    color: colors.secondary
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  infoCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 12
  },
  infoLabel: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    marginBottom: 4
  },
  infoValue: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 16
  },
  priceCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'flex-end',
    marginBottom: 16
  },
  priceLabel: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted
  },
  priceValue: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 28,
    marginVertical: 8
  },
  contactBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10
  },
  contactBtnText: {
    color: colors.white,
    fontFamily: 'Tajawal_700Bold'
  },
  favoriteBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  favoriteBtnActive: {
    backgroundColor: colors.danger
  },
  favoriteBtnText: {
    color: colors.white,
    fontFamily: 'Tajawal_700Bold'
  },
  detailActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12
  },
  chatBtn: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft
  },
  chatBtnText: {
    color: colors.primary,
    fontFamily: 'Tajawal_700Bold'
  },
  applyCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderSoft
  },
  applyTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 20,
    marginBottom: 6,
    textAlign: 'right'
  },
  applyDescription: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
    textAlign: 'right'
  },
  formField: {
    marginBottom: 14
  },
  inputLabel: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    marginBottom: 6,
    textAlign: 'right'
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    textAlign: 'right'
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 12
  },
  inlineField: {
    flex: 1
  },
  roomOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10
  },
  roomOption: {
    flexBasis: '48%',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
    backgroundColor: colors.background
  },
  roomOptionActive: {
    borderColor: colors.secondary,
    backgroundColor: colors.surfaceAlt
  },
  roomOptionTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    marginBottom: 4
  },
  roomOptionPrice: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.secondary
  },
  noteInput: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  estimateBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft
  },
  estimateLabel: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    marginBottom: 4,
    textAlign: 'right'
  },
  estimateValue: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.secondary,
    fontSize: 22,
    textAlign: 'right'
  },
  estimateSubtext: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    marginTop: 4,
    textAlign: 'right'
  },
  applyButton: {
    backgroundColor: colors.secondary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12
  },
  applyButtonDisabled: {
    opacity: 0.7
  },
  applyButtonText: {
    color: colors.white,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16
  },
  applyHint: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right'
  },
  sectionTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'right'
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16
  },
  detailTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'right'
  },
  bulletRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  bulletIcon: {
    fontSize: 18,
    marginLeft: 8,
    color: colors.secondary
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Tajawal_400Regular',
    color: colors.primary,
    textAlign: 'right'
  },
  hotelRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000011',
    paddingVertical: 8
  },
  hotelName: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    textAlign: 'right'
  },
  hotelMeta: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right'
  },
  housingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000011'
  },
  housingType: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary
  },
  housingPrice: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.secondary
  },
  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  successCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center'
  },
  successTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 20,
    marginBottom: 8
  },
  successSubtitle: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.secondary,
    marginBottom: 6
  },
  successHint: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18
  },
  successButton: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12
  },
  successButtonText: {
    color: colors.white,
    fontFamily: 'Tajawal_700Bold'
  },
  successSecondary: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center'
  },
  successSecondaryText: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary
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
  }
});

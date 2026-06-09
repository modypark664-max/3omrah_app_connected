import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { fetchReservationPaymentSummary } from '../services/api';
import BundlesNavHeader from '../components/BundlesNavHeader';

const paymentStatusLabels = {
  pending: 'في انتظار الدفع',
  paid: 'تم الدفع',
  cancelled: 'ملغي'
};

const paymentMethodLabels = {
  vodafone_cash: 'فودافون كاش',
  bank_transfer: 'تحويل بنكي',
  instapay: 'إنستا باي',
  cash: 'دفع نقدي'
};

const cardTypeLabels = {
  omrah: 'عمرة',
  internal_tour: 'رحلة داخلية',
  external_tour: 'رحلة خارجية',
  '7ag': 'حج',
  ramadan: 'رحلة رمضان'
};

const formatCurrency = (value) => {
  const numeric = Number(value) || 0;
  return `${numeric.toLocaleString('ar-EG')} ج.م`;
};

const buildWhatsappMessage = (reservation) => {
  if (!reservation) {
    return '';
  }
  const parts = [
    'السلام عليكم ورحمة الله وبركاته',
    '',
    'أرغب في تأكيد الحجز التالي:',
    '',
    `🎫 *رقم الحجز:* ${reservation.reservationNumber}`,
    `👤 *اسم العميل:* ${reservation.username}`,
    `📞 *رقم الهاتف:* ${reservation.phoneNumber}`,
    `🎯 *كود الرحلة:* ${reservation.card?.code || ''}`,
    `🕌 *نوع الرحلة:* ${cardTypeLabels[reservation.card?.type] || 'رحلة'}`,
    `📅 *مدة الرحلة:* ${reservation.card?.days || 0} أيام / ${reservation.card?.nights || 0} ليالي`,
    `👥 *عدد الأشخاص:* ${reservation.peopleCount || 1} شخص`,
    `🏨 *نوع الغرفة:* ${reservation.roomType || 'غير محدد'}`
  ];

  if (reservation.note?.trim()) {
    parts.push(`📝 *ملاحظات:* ${reservation.note.trim()}`);
  }

  parts.push(`💰 *إجمالي المبلغ:* ${formatCurrency(reservation.totalAmount)}`);
  parts.push('', 'أرجو تأكيد الحجز ومناقشة طرق الدفع المتاحة.', 'شكراً لكم.');

  return parts.join('\n');
};

const SummaryRow = ({ label, value, isHighlight }) => (
  <View style={[styles.summaryRow, isHighlight && styles.summaryHighlight]}>
    <Text style={[styles.summaryLabel, isHighlight && styles.summaryLabelHighlight]}>{label}</Text>
    <Text style={[styles.summaryValue, isHighlight && styles.summaryValueHighlight]}>{value}</Text>
  </View>
);

const BundlePaymentScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const reservationId = route.params?.reservationId;
  const fallbackPaymentUrl = route.params?.fallbackPaymentUrl;
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState(null);
  const [contact, setContact] = useState(null);
  const [error, setError] = useState(null);

  const loadSummary = useCallback(async () => {
    if (!reservationId) {
      setError('لا يوجد معرف لهذا الحجز.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await fetchReservationPaymentSummary(reservationId);
      setReservation(response.reservation);
      setContact(response.contact);
      setError(null);
    } catch (err) {
      setError(err?.message || 'تعذر تحميل تفاصيل الدفع.');
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const cardTypeLabel = useMemo(() => cardTypeLabels[reservation?.card?.type] || 'برنامج سفر', [reservation?.card?.type]);
  const paymentStatusLabel = useMemo(
    () => paymentStatusLabels[reservation?.paymentStatus] || 'غير محدد',
    [reservation?.paymentStatus]
  );
  const paymentMethodLabel = useMemo(
    () => paymentMethodLabels[reservation?.paymentMethod] || 'غير محدد',
    [reservation?.paymentMethod]
  );

  const handleWhatsappPress = useCallback(async () => {
    if (!reservation || !contact?.whatsappNumber) {
      Alert.alert('لا يتوفر رقم واتساب حالياً');
      return;
    }
    const sanitizedNumber = contact.whatsappNumber.replace(/[^0-9]/g, '');
    const message = buildWhatsappMessage(reservation);
    const url = `https://wa.me/${sanitizedNumber}?text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('unsupported');
      }
      await Linking.openURL(url);
    } catch (_err) {
      Alert.alert('تعذر فتح واتساب', `يمكنك التواصل يدوياً على الرقم: ${contact.whatsappNumber}`);
    }
  }, [contact?.whatsappNumber, reservation]);

  const handleOpenWebVersion = useCallback(async () => {
    const url = reservation?.paymentUrl || fallbackPaymentUrl;
    if (!url) {
      Alert.alert('لا يتوفر رابط الدفع حالياً.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('unsupported');
      }
      await Linking.openURL(url);
    } catch (_err) {
      Alert.alert('تعذر فتح الرابط', 'يمكنك نسخه وفتحه يدوياً من المتصفح.');
    }
  }, [fallbackPaymentUrl, reservation?.paymentUrl]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.secondary} size="large" />
        <Text style={styles.loadingText}>جارٍ تحميل تفاصيل الحجز...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadSummary}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!reservation) {
    return null;
  }

  const summaryRows = [
    { label: 'اسم العميل', value: reservation.username },
    { label: 'رقم الهاتف', value: reservation.phoneNumber },
    { label: 'كود الرحلة', value: reservation.card?.code || 'غير متوفر' },
    { label: 'نوع الرحلة', value: cardTypeLabel },
    { label: 'مدة الرحلة', value: `${reservation.card?.days || 0} أيام / ${reservation.card?.nights || 0} ليالي` },
    { label: 'عدد الأشخاص', value: `${reservation.peopleCount || 1} شخص` },
    { label: 'نوع الغرفة', value: reservation.roomType || 'غير محدد' }
  ];

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <BundlesNavHeader
          navigation={navigation}
          route={route}
          options={{ title: 'إتمام الدفع' }}
          back={navigation.canGoBack()}
        />

        <View style={styles.body}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>إتمام عملية الدفع</Text>
            <Text style={styles.reservationNumberLabel}>رقم الحجز</Text>
            <Text style={styles.reservationNumber}>{reservation.reservationNumber}</Text>
            <Text style={styles.statusBadge}>{paymentStatusLabel}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>ملخص الحجز</Text>
            <View style={styles.summaryGrid}>
              {summaryRows.map((row) => (
                <SummaryRow key={row.label} label={row.label} value={row.value} />
              ))}
              <SummaryRow
                label="إجمالي المبلغ"
                value={formatCurrency(reservation.totalAmount)}
                isHighlight
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>طريقة الدفع الحالية</Text>
            <SummaryRow label="طريقة الدفع" value={paymentMethodLabel} />
            <SummaryRow
              label="حالة الدفع"
              value={paymentStatusLabel}
            />
            <TouchableOpacity style={styles.webButton} onPress={handleOpenWebVersion}>
              <MaterialCommunityIcons name="web" size={22} color={colors.white} />
              <Text style={styles.webButtonText}>فتح نسخة الويب</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>تأكيد الحجز عبر واتساب</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>لتأكيد حجزك، تواصل معنا الآن عبر واتساب</Text>
              <Text style={styles.infoText}>
                سيتم إرسال رسالة تحتوي على جميع تفاصيل حجزك لتأكيد الحجز والاتفاق على طريقة الدفع.
              </Text>
            </View>

            <View style={styles.reservationList}>
              {summaryRows.map((row) => (
                <View key={`info-${row.label}`} style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>{row.label}</Text>
                  <Text style={styles.infoRowValue}>{row.value}</Text>
                </View>
              ))}
              {reservation.note?.trim() ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>ملاحظات</Text>
                  <Text style={styles.infoRowValue}>{reservation.note}</Text>
                </View>
              ) : null}
              <View style={[styles.infoRow, styles.infoRowHighlight]}>
                <Text style={[styles.infoRowLabel, styles.infoRowHighlightLabel]}>إجمالي المبلغ</Text>
                <Text style={[styles.infoRowValue, styles.infoRowHighlightValue]}>
                  {formatCurrency(reservation.totalAmount)}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsappPress}>
              <MaterialCommunityIcons name="whatsapp" size={28} color={colors.white} />
              <View style={styles.whatsappTextContainer}>
                <Text style={styles.whatsappMainText}>لتفاصيل الدفع</Text>
                <Text style={styles.whatsappSubText}>اضغط للتواصل وإرسال تفاصيل الحجز</Text>
              </View>
            </TouchableOpacity>
            {contact?.whatsappNumber ? (
              <Text style={styles.contactHint}>رقم واتساب: {contact.whatsappNumber}</Text>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>معلومات الاتصال الأخرى</Text>
            {contact?.phoneNumber ? (
              <SummaryRow label="رقم الهاتف" value={contact.phoneNumber} />
            ) : null}
            {contact?.email ? <SummaryRow label="البريد الإلكتروني" value={contact.email} /> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default BundlePaymentScreen;

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
    paddingTop: 16,
    gap: 20
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
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft
  },
  heroTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 22,
    marginBottom: 12
  },
  reservationNumberLabel: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted
  },
  reservationNumber: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.secondary,
    fontSize: 26,
    marginVertical: 8
  },
  statusBadge: {
    backgroundColor: colors.warning,
    color: colors.white,
    fontFamily: 'Tajawal_700Bold',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 999
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft
  },
  sectionTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'right'
  },
  summaryGrid: {
    gap: 12
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft
  },
  summaryLabel: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    textAlign: 'right'
  },
  summaryValue: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    textAlign: 'right'
  },
  summaryHighlight: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 16,
    borderBottomWidth: 0
  },
  summaryLabelHighlight: {
    color: colors.white
  },
  summaryValueHighlight: {
    color: '#FFD700'
  },
  infoCard: {
    backgroundColor: colors.infoSoft,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.info,
    marginBottom: 16
  },
  infoTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: '#0369a1',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  infoText: {
    fontFamily: 'Tajawal_400Regular',
    color: '#075985',
    textAlign: 'center',
    lineHeight: 20
  },
  reservationList: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft
  },
  infoRowLabel: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    textAlign: 'right'
  },
  infoRowValue: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    textAlign: 'right'
  },
  infoRowHighlight: {
    backgroundColor: colors.secondary,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16
  },
  infoRowHighlightLabel: {
    color: colors.white
  },
  infoRowHighlightValue: {
    color: '#FFD700'
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#25D366',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 10
  },
  whatsappTextContainer: {
    flex: 1
  },
  whatsappMainText: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.white,
    fontSize: 16
  },
  whatsappSubText: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.white,
    opacity: 0.9,
    fontSize: 13
  },
  contactHint: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted
  },
  webButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.secondary,
    borderRadius: 16,
    paddingVertical: 12
  },
  webButtonText: {
    color: colors.white,
    fontFamily: 'Tajawal_700Bold'
  }
});
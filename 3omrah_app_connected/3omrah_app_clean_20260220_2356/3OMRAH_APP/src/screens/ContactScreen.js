import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import colors from '../theme/colors';
import { CONTACT_INFO, CTA_TEXT } from '../constants/contact';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  message: ''
};

const ContactScreen = () => {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const whatsappLink = useMemo(() => {
    const digits = CONTACT_INFO.whatsapp.replace(/\D/g, '');
    const normalized = digits.startsWith('0') ? `2${digits}` : digits;
    return `https://wa.me/${normalized}`;
  }, []);

  const mapImageUrl = useMemo(() => {
    const { latitude, longitude } = CONTACT_INFO.map;
    const base = 'https://staticmap.openstreetmap.de/staticmap.php';
    const query = `center=${latitude},${longitude}&zoom=14&size=640x320&markers=${latitude},${longitude},red&maptype=mapnik`;
    return `${base}?${query}`;
  }, []);

  const mapDirectionsUrl = useMemo(() => {
    const { latitude, longitude } = CONTACT_INFO.map;
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }, []);

  const contentPadding = useMemo(
    () => ({
      paddingTop: 16 + insets.top,
      paddingBottom: Math.max(160, 40 + insets.bottom)
    }),
    [insets]
  );

  const whatsappPosition = useMemo(
    () => ({
      bottom: 12 + insets.bottom,
      right: 20 + insets.right
    }),
    [insets.bottom, insets.right]
  );

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!/^\d{11}$/.test(form.phone)) {
      Alert.alert('تنبيه', 'رقم الهاتف يجب أن يحتوي على 11 رقمًا.');
      return;
    }

    setSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      Alert.alert('تم الإرسال', 'تم تسجيل رسالتك وسنتواصل معك قريبًا.');
      setForm(initialForm);
    } catch (_error) {
      Alert.alert('خطأ', 'حدث خطأ غير متوقع، حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCall = () => Linking.openURL(`tel:${CONTACT_INFO.phone}`);
  const handleEmail = () => Linking.openURL(`mailto:${CONTACT_INFO.email}`);

  const infoCards = [
    {
      key: 'phone',
      icon: 'phone',
      label: 'رقم الهاتف',
      value: CONTACT_INFO.phone,
      onPress: handleCall
    },
    {
      key: 'email',
      icon: 'email',
      label: 'البريد الإلكتروني',
      value: CONTACT_INFO.email,
      onPress: handleEmail
    },
    {
      key: 'hours',
      icon: 'clock-outline',
      label: 'ساعات العمل',
      value: CONTACT_INFO.hours
    },
    {
      key: 'location',
      icon: 'map-marker',
      label: 'الموقع',
      value: CONTACT_INFO.locationLabel
    }
  ];

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true
        })
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const animatedFabStyle = {
    transform: [
      {
        scale: pulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.06]
        })
      },
      {
        translateY: pulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4]
        })
      }
    ],
    opacity: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.92]
    })
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {canGoBack ? (
        <TouchableOpacity style={styles.stackBackButton} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.stackBackText}>رجوع</Text>
        </TouchableOpacity>
      ) : null}
      <View style={styles.contentWrapper}>
        <ScrollView
          contentContainerStyle={[styles.container, contentPadding]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.ctaCard}>
          <View style={styles.ctaHeader}>
            <View style={styles.ctaIcon}>
              <MaterialCommunityIcons name="headset" size={32} color={colors.primary} />
            </View>
            <View style={styles.ctaTextWrapper}>
              <Text style={styles.ctaLabel}>{CTA_TEXT.title}</Text>
              <Text style={styles.ctaPhone}>{CONTACT_INFO.phone}</Text>
              <Text style={styles.ctaDescription}>{CONTACT_INFO.hours}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.ctaButton} onPress={handleCall}>
            <Text style={styles.ctaButtonText}>{CTA_TEXT.button}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapCard}>
          <Image source={{ uri: mapImageUrl }} style={styles.map} resizeMode="cover" />
          <View style={styles.mapOverlay}>
            <Text style={styles.mapTitle}>موقعنا</Text>
            <Text style={styles.mapSubtitle}>{CONTACT_INFO.locationLabel}</Text>
            <TouchableOpacity style={styles.mapButton} onPress={() => Linking.openURL(mapDirectionsUrl)}>
              <Ionicons name="navigate" size={18} color="#fff" style={{ marginLeft: 6 }} />
              <Text style={styles.mapButtonText}>افتح في الخرائط</Text>
            </TouchableOpacity>
          </View>
        </View>

        <LinearGradient colors={[colors.primary, '#1b465f']} style={styles.formCard}>
        <Text style={styles.formTitle}>راسلنا</Text>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>الاسم بالكامل</Text>
          <TextInput
            placeholder="أدخل اسمك الكامل"
            placeholderTextColor="#dce9ef"
            style={styles.input}
            value={form.fullName}
            onChangeText={(text) => handleInputChange('fullName', text)}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>البريد الإلكتروني</Text>
          <TextInput
            placeholder="example@email.com"
            placeholderTextColor="#dce9ef"
            keyboardType="email-address"
            style={styles.input}
            value={form.email}
            onChangeText={(text) => handleInputChange('email', text)}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>رقم الهاتف</Text>
          <TextInput
            placeholder="01xxxxxxxxx (11 رقم)"
            placeholderTextColor="#dce9ef"
            keyboardType="number-pad"
            style={styles.input}
            value={form.phone}
            maxLength={11}
            onChangeText={(text) => handleInputChange('phone', text.replace(/\D/g, ''))}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>الرسالة</Text>
          <TextInput
            placeholder="اكتب رسالتك هنا"
            placeholderTextColor="#dce9ef"
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            value={form.message}
            onChangeText={(text) => handleInputChange('message', text)}
          />
        </View>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitButtonText}>{submitting ? 'جاري الإرسال...' : 'إرسال الرسالة'}</Text>
        </TouchableOpacity>
      </LinearGradient>

        <View style={styles.infoGrid}>
          {infoCards.map((card, index) => (
            <InfoCard
              key={card.key}
              icon={card.icon}
              label={card.label}
              value={card.value}
              onPress={card.onPress}
              style={index % 2 === 0 ? styles.infoCardLeft : undefined}
            />
          ))}
        </View>
        </ScrollView>
        <AnimatedTouchableOpacity
          style={[styles.whatsappFab, whatsappPosition, animatedFabStyle]}
          onPress={() => Linking.openURL(whatsappLink)}
          activeOpacity={0.9}
        >
          <Ionicons name="logo-whatsapp" size={32} color="#fff" />
        </AnimatedTouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const InfoCard = ({ icon, label, value, onPress, style }) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.9 : 1}
    style={[styles.infoCard, style]}
    onPress={onPress}
  >
    <View style={styles.infoHeader}>
      <Text style={styles.infoLabel}>{label}</Text>
      <MaterialCommunityIcons name={icon} size={26} color={colors.secondary} style={styles.infoIcon} />
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  stackBackButton: {
    alignSelf: 'flex-start',
    marginHorizontal: 20,
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
  contentWrapper: {
    flex: 1
  },
  container: {
    paddingHorizontal: 20,
    backgroundColor: colors.background
  },
  ctaCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 16,
    marginBottom: 20,
    shadowColor: '#0000001a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6
  },
  ctaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  ctaIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.secondary
  },
  ctaTextWrapper: {
    flex: 1,
    alignItems: 'flex-end'
  },
  ctaLabel: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 18,
    color: colors.primary,
    textAlign: 'right'
  },
  ctaPhone: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 24,
    color: colors.success,
    marginTop: 4,
    textAlign: 'right'
  },
  ctaDescription: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    marginTop: 4,
    textAlign: 'right'
  },
  ctaButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ctaButtonText: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.white
  },
  mapCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 260,
    marginBottom: 20,
    shadowColor: '#0000001a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4
  },
  map: {
    flex: 1
  },
  mapOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(3, 23, 39, 0.75)'
  },
  mapTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16,
    color: colors.white,
    marginBottom: 4,
    textAlign: 'right'
  },
  mapSubtitle: {
    fontFamily: 'Tajawal_400Regular',
    color: '#d9eaf5',
    fontSize: 13,
    textAlign: 'right'
  },
  mapButton: {
    marginTop: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999
  },
  mapButtonText: {
    color: colors.white,
    fontFamily: 'Tajawal_500Medium'
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#00000033',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 32
  },
  formTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 28,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 24
  },
  formGroup: {
    marginBottom: 16
  },
  formLabel: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 16,
    color: colors.secondary,
    marginBottom: 6,
    textAlign: 'right'
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: 'Tajawal_400Regular',
    fontSize: 15,
    color: colors.primary,
    textAlign: 'right'
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top'
  },
  submitButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10
  },
  submitButtonText: {
    color: colors.white,
    fontFamily: 'Tajawal_700Bold',
    fontSize: 16
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  infoCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0000001a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 2
  },
  infoCardLeft: {
    marginRight: '4%'
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
    gap: 10
  },
  infoIcon: {
    marginLeft: 0,
    marginRight: 0
  },
  infoLabel: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    fontSize: 14,
    textAlign: 'right'
  },
  infoValue: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 16,
    textAlign: 'right'
  },
  whatsappFab: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00000033',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  }
});

export default ContactScreen;

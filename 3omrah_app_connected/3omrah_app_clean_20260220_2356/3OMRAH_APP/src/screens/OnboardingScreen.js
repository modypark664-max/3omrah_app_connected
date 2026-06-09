import React, { useMemo, useRef, useState, useContext } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../theme/colors';
import AuthContext from '../context/AuthContext';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: 'journey',
    title: 'رحلة العمرة تبدأ من هنا',
    description:
      'نرشدك خطوة بخطوة منذ لحظة الحجز وحتى أداء المناسك، مع فريق يهتم بكل التفاصيل حتى تنعم بالطمأنينة.',
    icon: 'mosque-outline',
    accent: colors.secondary
  },
  {
    key: 'bundles',
    title: 'باقات تناسب الجميع',
    description:
      'اختر من بين باقات متنوعة مستوحاة من موقعنا الرسمي، تجمع بين السكن المريح والتنقلات السلسة.',
    icon: 'gift-outline',
    accent: '#f5a623'
  },
  {
    key: 'partners',
    title: 'شركاء نجاح موثوقون',
    description:
      'نحن شريك رسمي لقطار الحرمين السريع ونعمل مع وكالات مرخصة لتقديم أفضل تجربة للمعتمرين.',
    icon: 'handshake-outline',
    accent: '#7c5dfa'
  },
  {
    key: 'support',
    title: 'دعم شخصي على مدار الساعة',
    description:
      'يعمل فريق خدمة العملاء على مدار اليوم ليجيب عن استفساراتك بسرعة ويؤمن كل ما تحتاجه.',
    icon: 'headset',
    accent: colors.primary
  }
];

const OnboardingScreen = () => {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { completeOnboarding } = useContext(AuthContext);

  const indicatorWidth = useMemo(() => width / slides.length, []);

  const handleMomentumEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    setActiveIndex(newIndex);
  };

  const handleNext = () => {
    if (activeIndex === slides.length - 1) {
      return;
    }
    scrollRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
  };

  const goToAuth = (target) => {
    completeOnboarding(target);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>رحلة عمرة</Text>
        <TouchableOpacity onPress={() => goToAuth('Login')}>
          <Text style={styles.skipText}>تخطي</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={styles.sliderContent}
      >
        {slides.map((slide) => (
          <View key={slide.key} style={[styles.slide, { width }]}> 
            <LinearGradient
              colors={[slide.accent, colors.primary]}
              style={styles.cardBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.iconBadge}>
                <MaterialCommunityIcons name={slide.icon} size={36} color="#fff" />
              </View>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideDescription}>{slide.description}</Text>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>

      <View style={styles.progressRail}>
        <View style={[styles.progressThumb, { width: indicatorWidth, left: indicatorWidth * activeIndex }]} />
      </View>

      {activeIndex === slides.length - 1 ? (
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaTitle}>جاهز للبدء؟</Text>
          <Text style={styles.ctaSubtitle}>أنشئ حسابًا أو سجل دخولك للوصول إلى كل المزايا داخل التطبيق.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => goToAuth('Signup')}>
            <Text style={styles.primaryButtonText}>إنشاء حساب جديد</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => goToAuth('Login')}>
            <Text style={styles.secondaryButtonText}>لدي حساب بالفعل</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.nextWrapper}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>التالي</Text>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  brand: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 20,
    color: colors.primary
  },
  skipText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    fontSize: 16
  },
  sliderContent: {
    alignItems: 'center'
  },
  slide: {
    paddingHorizontal: 20
  },
  cardBackground: {
    borderRadius: 28,
    padding: 28,
    minHeight: 360,
    justifyContent: 'center',
    shadowColor: '#00000033',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 10
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  slideTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 28,
    color: '#fff',
    marginBottom: 12
  },
  slideDescription: {
    fontFamily: 'Tajawal_400Regular',
    color: '#f5f9fc',
    fontSize: 16,
    lineHeight: 24
  },
  progressRail: {
    height: 4,
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#ffffff55',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressThumb: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.secondary,
    borderRadius: 2
  },
  nextWrapper: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#5D5FEF33',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6
  },
  nextButtonText: {
    color: '#fff',
    fontFamily: 'Tajawal_700Bold',
    fontSize: 18
  },
  ctaContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#0000001a',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12
  },
  ctaTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 24,
    color: colors.primary,
    marginBottom: 6
  },
  ctaSubtitle: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    lineHeight: 22,
    marginBottom: 18
  },
  primaryButton: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12
  },
  primaryButtonText: {
    fontFamily: 'Tajawal_700Bold',
    color: '#fff',
    fontSize: 17
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center'
  },
  secondaryButtonText: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 17
  }
});

export default OnboardingScreen;

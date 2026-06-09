# دليل دمج النموذج متعدد الخطوات

## 📌 نظرة عامة

> ملاحظة: المجلد الفعلي للتطبيق الأمامي ما زال يسمى `3OMRAH_APP` في هذا المستودع، لكن الاسم التجاري والتكوين داخل التطبيق تم تحديثهما إلى Rehlatty.

تم إنشاء نموذج جديد متعدد الخطوات بشكل كامل ومستقل عن الكود الحالي. يمكن دمجه بسهولة في التطبيق الموجود.

## 🔗 خطوات الدمج

### 1. إضافة المسار (Route) في Navigator

في ملف `src/screens/BundlesScreen.js`، أضف المسار الجديد:

```javascript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BundlesOverviewScreen from './BundlesOverviewScreen';
import BundleTypeScreen from './BundleTypeScreen';
import BundleDetailsScreen from './BundleDetailsScreen';
import BundlePaymentScreen from './BundlePaymentScreen';
import MultiStepBundleForm from '../components/MultiStepBundleForm'; // الجديد
import colors from '../theme/colors';

const Stack = createNativeStackNavigator();

const BundlesScreen = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background }
    }}
  >
    <Stack.Screen
      name="BundlesOverview"
      component={BundlesOverviewScreen}
      options={{ title: 'الباقات' }}
    />
    {/* المسار الجديد */}
    <Stack.Screen
      name="MultiStepForm"
      component={MultiStepBundleForm}
      options={{ 
        title: 'حجز رحلتك',
        headerShown: false 
      }}
    />
    <Stack.Screen
      name="BundleType"
      component={BundleTypeScreen}
      options={({ route }) => ({ title: route.params?.title || 'قائمة الباقات' })}
    />
    <Stack.Screen
      name="BundleDetails"
      component={BundleDetailsScreen}
      options={{ title: 'تفاصيل الباقة' }}
    />
    <Stack.Screen
      name="BundlePayment"
      component={BundlePaymentScreen}
      options={{ title: 'إتمام الدفع' }}
    />
  </Stack.Navigator>
);

export default BundlesScreen;
```

### 2. إضافة زر للوصول إلى النموذج

في `BundlesOverviewScreen.js` أو أي شاشة أخرى، أضف زر للانتقال:

```javascript
import { useNavigation } from '@react-navigation/native';

// داخل الـ component
const navigation = useNavigation();

<TouchableOpacity
  style={styles.customButton}
  onPress={() => navigation.navigate('MultiStepForm')}
>
  <Text style={styles.buttonText}>حجز رحلتك حسب اختيارك</Text>
</TouchableOpacity>
```

### 3. تحديث Navigation

تأكد من أن ملف `navigation/index.js` يحتوي على `BundlesScreen`:

```javascript
import BundlesScreen from '../screens/BundlesScreen';

// في الـ TabNavigator
<Tab.Screen
  name="Bundles"
  component={BundlesScreen}
  // ... options
/>
```

## 📦 الملفات المضافة

### Backend Files:
```
3omrah_backend/
├── models/
│   ├── Airport.js (جديد)
│   └── Airline.js (جديد)
├── airportAirlineRoutes.js (جديد)
├── seedData.js (جديد)
├── schemas.js (محدث - أضيفت airportSchema و airlineSchema)
└── index.js (محدث - أضيف استيراد الـ routes)
```

### Frontend Files:
```
3OMRAH_APP/src/
├── components/
│   ├── StepIndicator.js (جديد)
│   ├── Step1BundleType.js (جديد)
│   ├── Step2Umrah.js (جديد)
│   ├── Step2InternalTour.js (جديد)
│   ├── Step2ExternalTour.js (جديد)
│   ├── Step3Review.js (جديد)
│   └── MultiStepBundleForm.js (جديد)
└── services/
    └── api.js (محدث - أضيفت دوال جديدة)
```

## 🎨 تخصيص الألوان والتصاميم

### تعديل الألوان (اختياري)

في `src/theme/colors.js`، تأكد من وجود:

```javascript
export default {
  primary: '#1a73e8', // اللون الأساسي
  success: '#34a853', // لون النجاح
  error: '#ea4335', // لون الخطأ
  warning: '#fbbc04', // لون التحذير
  white: '#ffffff',
  text: '#202124',
  gray600: '#5f6368',
  gray500: '#80868b',
  // ... باقي الألوان
};
```

## 🧪 اختبار التكامل

### اختبار Backend:

```bash
# 1. تأكد من أن المسارات موجودة
curl http://localhost:3000/api/airports

# 2. تشغيل البيانات الافتراضية
cd 3omrah_backend/3omrah_sanitized_20260221_002919
node seedData.js

# 3. اختبار إضافة مطار (يتطلب أدمن)
curl -X POST http://localhost:3000/api/admin/airports \
  -H "Content-Type: application/json" \
  -d '{"name": "مطار جديد", "code": "NEW", "city": "مدينة"}'
```

### اختبار Frontend:

1. **تشغيل التطبيق:**
   ```bash
   cd 3OMRAH_APP
   npm start
   expo start
   ```

2. **الانتقال إلى النموذج:**
   - اضغط على تبويب "الباقات"
   - اضغط على زر "حجز رحلتك حسب اختيارك"
   - يجب أن ترى النموذج متعدد الخطوات

3. **اختبار جميع الخطوات:**
   - اختر نوع الرحلة
   - ملء البيانات المطلوبة
   - مراجعة البيانات
   - التأكيد

## 🔧 استكشاف الأخطاء الشائعة

### المشكلة: المطارات لا تظهر

**الحل:**
```javascript
// تأكد من استدعاء seedData
// في backend:
node seedData.js

// أو في frontend، تحقق من Console:
console.log('Airports:', airports);
```

### المشكلة: الـ Navigation لا يعمل

**الحل:**
```javascript
// تأكد من import Navigation بشكل صحيح:
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();
// وليس:
const { navigation } = props; // ❌ خطأ
```

### المشكلة: API Calls تفشل

**الحل:**
```javascript
// تأكد من أن API_BASE_URL صحيح في config/env.js
export const API_BASE_URL = 'http://your-api-url:3000';

// تأكد من أن البيانات تأتي بشكل صحيح:
console.log('API Response:', data);
```

## 📊 مثال على التدفق الكامل

```javascript
// 1. المستخدم يضغط على زر "حجز رحلتك"
navigation.navigate('MultiStepForm');

// 2. النموذج يحمل المطارات والشركات
useEffect(() => {
  loadAirportsAndAirlines();
}, []);

// 3. المستخدم يختار نوع الرحلة
handleTypeSelect('omrah');

// 4. المستخدم يملأ البيانات
handleFormChange('airport', selectedAirportId);
handleFormChange('airline', selectedAirlineId);

// 5. المستخدم ينتقل للخطوة التالية
handleNext(); // تحقق من صحة البيانات

// 6. المستخدم يراجع البيانات
// (شاشة مراجعة)

// 7. المستخدم يؤكد الطلب
handleConfirm(); // إرسال البيانات للـ backend
```

## 🚀 التحسينات المستقبلية

### مرحلة 1: التكامل الأساسي
- ✅ إنشاء النموذج
- ✅ إضافة Models
- ✅ إنشاء Routes
- ✅ تحميل البيانات الافتراضية

### مرحلة 2: تحسينات UX
- [ ] إضافة animations
- [ ] تحسين معالجة الأخطاء
- [ ] إضافة تنبيهات Toast
- [ ] ذاكرة تخزين مؤقتة (Caching)

### مرحلة 3: ميزات إضافية
- [ ] حفظ مسودة الطلب
- [ ] التحقق من التاريخ الديناميكي
- [ ] اقتراحات ذكية
- [ ] دعم لغات متعددة

## 📚 موارد إضافية

### ملفات مرجعية:
- `Rehlatty_UPDATES_GUIDE.md` - دليل شامل للتحديثات
- `src/components/MultiStepBundleForm.js` - الكود الرئيسي
- `airportAirlineRoutes.js` - Routes الـ Backend

### التوثيق الخارجي:
- [React Navigation Docs](https://reactnavigation.org/)
- [Express.js Docs](https://expressjs.com/)
- [Mongoose Docs](https://mongoosejs.com/)

---

## ❓ أسئلة شائعة

**س: هل يمكنني استخدام النموذج مع الـ Web؟**
ج: النموذج الحالي مصمم لـ React Native، لكن يمكن تكييفه بسهولة للـ Web.

**س: كيف أضيف حقول إضافية؟**
ج: أضف الحقل في الـ State والـ Schema والـ Component.

**س: هل البيانات آمنة؟**
ج: نعم، تم تطبيق التحقق من البيانات والحماية على جميع المستويات.

---

**تاريخ الإنشاء:** 2026-05-05
**الإصدار:** 1.0.0
**الحالة:** جاهز للإنتاج

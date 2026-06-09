# تطوير نظام الرحلات السياحية Rehlatty - دليل التنفيذ

## 📋 نظرة عامة

تم تحديث مشروع تطبيق/موقع الرحلات السياحية Rehlatty بميزات جديدة متقدمة:

### ✨ الميزات المضافة:

1. **نظام إدارة المطارات**
   - 7 مطارات مصرية محددة مسبقاً
   - إمكانية إضافة وتعديل وحذف مطارات من لوحة التحكم
   - عرض المطارات كـ chips/dropdown في النموذج

2. **نظام إدارة شركات الطيران**
   - 7 شركات طيران محددة مسبقاً
   - إمكانية إدارة كاملة من لوحة التحكم (CRUD)
   - عرض شركات الطيران كـ chips في النموذج

3. **نموذج متعدد الخطوات (Multi-Step Form)**
   - خطوة 1: اختيار نوع الرحلة
   - خطوة 2: ملء تفاصيل الرحلة (تختلف حسب النوع)
   - خطوة 3: مراجعة البيانات قبل الإرسال
   - شريط تقدم يوضح مرحلة النموذج الحالية

4. **أنواع الرحلات المدعومة:**
   - عمرة (تتضمن: نوع البرنامج، التواريخ، المطار، شركة الطيران، نوع الغرفة)
   - عمرة رمضان (نفس العمرة العادية)
   - رحلات داخل مصر (3 فئات: اليوم الواحد، شهر العسل، عائلية)
   - رحلات خارج مصر (تتضمن: الوجهة، التواريخ، المطار، شركة الطيران)

5. **تحسينات واجهة المستخدم**
   - تصميم حديث وسهل الاستخدام
   - Navigation سلسة بين الخطوات
   - رسائل خطأ واضحة
   - Progress indicator بصري

---

## 🏗️ البنية المعمارية

### Backend (Node.js/Express)

#### Models الجديدة:
- `Airport.js` - نموذج المطارات
- `Airline.js` - نموذج شركات الطيران

#### تحديثات Models:
- `Cards.js` - تم إضافة حقول جديدة:
  - `airport` - مرجعية لـ Airport model
  - `airline` - مرجعية لـ Airline model
  - `destinationCity` - المدينة المقصودة
  - `transportationType` - وسيلة الانتقال (للرحلات الداخلية)
  - `destinationCountry` - الدولة المقصودة
  - `hotels` - قائمة الفنادق المضمنة

#### Routes الجديدة:
- `/api/airports` (GET) - جلب جميع المطارات النشطة
- `/api/admin/airports` (GET) - جلب جميع المطارات (للأدمن)
- `/api/airports/:id` (GET) - جلب مطار محدد
- `/api/admin/airports` (POST) - إضافة مطار جديد
- `/api/admin/airports/:id` (PUT) - تحديث مطار
- `/api/admin/airports/:id` (DELETE) - حذف مطار

- `/api/airlines` (GET) - جلب جميع شركات الطيران النشطة
- `/api/admin/airlines` (GET) - جلب جميع شركات الطيران
- `/api/airlines/:id` (GET) - جلب شركة طيران محددة
- `/api/admin/airlines` (POST) - إضافة شركة طيران
- `/api/admin/airlines/:id` (PUT) - تحديث شركة طيران
- `/api/admin/airlines/:id` (DELETE) - حذف شركة طيران

#### Validation Schemas:
- `airportSchema` - للتحقق من بيانات المطار
- `airlineSchema` - للتحقق من بيانات شركة الطيران

### Frontend (React Native/Expo)

#### Components الجديدة:
- `StepIndicator.js` - شريط تقدم النموذج
- `Step1BundleType.js` - اختيار نوع الرحلة
- `Step2Umrah.js` - تفاصيل العمرة والعمرة الرمضان
- `Step2InternalTour.js` - الرحلات الداخلية (3 tabs)
- `Step2ExternalTour.js` - الرحلات الخارجية
- `Step3Review.js` - مراجعة البيانات
- `MultiStepBundleForm.js` - شاشة النموذج الرئيسية

#### API Calls الجديدة في `services/api.js`:
```javascript
export const fetchAirports = async () // جلب المطارات
export const fetchAirportById = async (airportId) // جلب مطار محدد
export const fetchAirlines = async () // جلب شركات الطيران
export const fetchAirlineById = async (airlineId) // جلب شركة طيران محددة
```

---

## 🚀 كيفية الاستخدام

### للـ Admin/لوحة التحكم:

#### إضافة مطار جديد:
```bash
POST /api/admin/airports
{
  "name": "اسم المطار",
  "code": "CAI", // 3 أحرف
  "city": "اسم المدينة",
  "country": "مصر",
  "description": "وصف اختياري",
  "isActive": true,
  "displayOrder": 1
}
```

#### إضافة شركة طيران:
```bash
POST /api/admin/airlines
{
  "name": "اسم الشركة",
  "code": "MS", // 2-3 أحرف
  "country": "الدولة",
  "description": "وصف اختياري",
  "logo": "رابط الشعار",
  "isActive": true,
  "displayOrder": 1
}
```

### للـ Frontend:

#### استخدام المكونات:
```javascript
import MultiStepBundleForm from '../components/MultiStepBundleForm';

// في أي شاشة
<MultiStepBundleForm />
```

#### استيراد API Calls:
```javascript
import {
  fetchAirports,
  fetchAirlines,
  fetchAirportById,
  fetchAirlineById
} from '../services/api';

// الاستخدام:
const airports = await fetchAirports();
const airlines = await fetchAirlines();
```

---

## 📊 البيانات الافتراضية (Seed Data)

تم إنشاء ملف `seedData.js` يحتوي على:
- 7 مطارات مصرية
- 7 شركات طيران

**لتشغيل البيانات الافتراضية:**
```bash
cd 3omrah_backend/3omrah_sanitized_20260221_002919
node seedData.js
```

---

## 🧪 اختبار الميزات

### اختبار API:
```bash
# جلب جميع المطارات
GET /api/airports

# جلب جميع شركات الطيران
GET /api/airlines

# إضافة مطار (يتطلب صلاحية أدمن)
POST /api/admin/airports
```

### اختبار الـ Frontend:
1. افتح تطبيق الموبايل
2. انتقل إلى شاشة الرحلات
3. اضغط على "اختر رحلتك"
4. اتبع خطوات النموذج الثلاثة

---

## ⚙️ التكوين والمتطلبات

### المتطلبات:
- Node.js 14+
- Express 5.x
- React Native/Expo 54+
- MongoDB 4.4+

### المكتبات المستخدمة:
- `mongoose` - قاعدة البيانات
- `joi` - التحقق من البيانات
- `date-fns` - معالجة التواريخ
- `@react-navigation` - الملاحة

---

## 🔐 الأمان

### حماية المسارات (Routes Protection):
- جميع مسارات الـ admin محمية بـ `isAdmin` middleware
- جميع مسارات الـ CRUD محمية بـ `canManageContent` middleware
- جميع البيانات مُحققة باستخدام Joi schemas

### معالجة الأخطاء:
- رسائل خطأ واضحة بالعربية
- معالجة استثناءات شاملة
- تسجيل الأخطاء في الـ console

---

## 📝 ملاحظات مهمة

1. **الحفاظ على الوظائف الحالية**: تم تصميم جميع التحديثات بحيث لا تكسر أي وظائف موجودة
2. **قابلية التوسعة**: الكود مصمم بطريقة modular وسهلة التعديل
3. **الأداء**: تم تحسين استدعاءات API باستخدام parallel requests
4. **سهولة الاستخدام**: واجهة المستخدم بسيطة وحدسية

---

## 🐛 استكشاف الأخطاء

### إذا لم تظهر المطارات:
1. تأكد من تشغيل `seedData.js`
2. تحقق من اتصال قاعدة البيانات
3. تحقق من الـ Console في المتصفح/الموبايل

### إذا كان الـ Form لا يعمل:
1. تحقق من إصدار React Native/Expo
2. تحقق من استيراد المكونات بشكل صحيح
3. تحقق من الأخطاء في المحاكي/Device

---

## 🔄 الخطوات القادمة

1. **تحسينات إضافية مقترحة**:
   - إضافة صور للمطارات والشركات
   - تحسينات في واجهة المستخدم
   - دعم تصفية متقدم

2. **الميزات المخططة**:
   - نظام التقييمات
   - نظام المراجعات
   - نظام التوصيات الذكية

---

## 📞 الدعم والمساعدة

للمزيد من المعلومات أو الدعم، يرجى الاطلاع على:
- `/docs` مجلد التوثيق
- `README.md` الملف الرئيسي
- `CHANGELOG.md` سجل التغييرات

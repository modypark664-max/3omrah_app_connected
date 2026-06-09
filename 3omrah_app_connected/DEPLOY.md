الخطوات النهائية لنشر المشروع (Backend على Render + الواجهة على Vercel)

ملاحظة مهمة: لا يمكنني ربط حسابات GitHub/Vercel/Render من هنا بدون صلاحياتك. هذه الخطوات تُحضّر المشروع لتكون قابلاً للنشر بسرعة — يمكنك تنفيذها محليًا أو مشاركتها لمن ينشر بالنيابة عنك.

1) تحضير المستودع ورفع الشيفرة إلى GitHub

```bash
# من داخل مجلد المشروع الجذري
git init
git add .
git commit -m "Prepare project for Render + Vercel deployment"
# أنشئ مستودعًا على GitHub ثم:
git remote add origin git@github.com:YOURUSERNAME/REPO_NAME.git
git push -u origin main
```

2) نشر الباكند على Render (مستحسن)
- ادخل إلى https://platform.render.com
- أنشئ خدمة جديدة "Web Service" واربطها بالمستودع الذي رفعتَه
- Render سيستخدم `npm install` ثم `npm start` (يمكن ترك الإعدادات كما في `render.yaml`)
- اضف متغير بيئة `MONGODB_URI` في إعدادات الخدمة وأعطه قيمة رابط Atlas الموجود في `3omrah_backend/.../.env`.

ملاحظة: لتشغيل نشر تلقائي بعد رفع الكود، احفظ سرين في إعدادات مستودع GitHub > Settings > Secrets:
- `RENDER_API_KEY` — أنشئ API key في https://dashboard.render.com/account/api-keys
- `RENDER_SERVICE_ID` — رقم الخدمة (Service ID) الموجود في صفحة الخدمة على Render

بعد إضافة الأسرار، كل دفعة إلى الفرع `main` ستطلق الـ workflow الذي ينشئ Deploy تلقائيًا.

3) نشر الواجهة على Vercel
- ادخل إلى https://vercel.com وأنشئ مشروعًا جديدًا مرتبطًا بنفس المستودع
- في إعدادات المشروع أضف متغير البيئة `EXPO_PUBLIC_API_URL` بقيمة URL الباكند المنشور من Render
- في إعدادات Build، غيّر أمر البناء إلى: `npm run vercel-build` وخرج البناء `web-build`

- 4) تحقق
- بعد اكتمال النشر ستحصل على رابط Vercel (واجهة) ورابط Render (باكند). تأكد من أن الواجهة تتصل بالـ API عبر `EXPO_PUBLIC_API_URL` وأن جميع endpoints تعمل.

إضافة ملفات تم إنشاؤها آليًا:
- `.github/workflows/deploy-backend-render.yml` — workflow لنشر الباكند على Render عند دفع `main`.
- `push_to_github.sh` — سكربت لمرة واحدة لتهيئة git ودفع الشيفرة إلى GitHub.

- بعد اكتمال النشر ستحصل على رابط Vercel (واجهة) ورابط Render (باكند). تأكد من أن الواجهة تتصل بالـ API عبر `EXPO_PUBLIC_API_URL` وأن جميع endpoints تعمل.

إن احتجت أتمتة رفع المستودع وبدء النشر، سترسل لي صلاحية دفع إلى GitHub (token) وربط Vercel/Render أو أقوم بتوجيهك خطوة بخطوة لتشغيل الأوامر السابقة.

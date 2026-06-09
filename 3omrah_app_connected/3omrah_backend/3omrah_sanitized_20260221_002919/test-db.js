require('dotenv').config();
const mongoose = require('mongoose');
const Card = require('./models/Cards');

const dbUriSRV = process.env.MONGODB_URI || 'mongodb+srv://modypark664_db_user:MMoh01001898321@cluster0.40qhsae.mongodb.net/?appName=Cluster0';
const dbUriFallback = 'mongodb://modypark664_db_user:MMoh01001898321@ac-zzubhw4-shard-00-00.40qhsae.mongodb.net:27017,ac-zzubhw4-shard-00-01.40qhsae.mongodb.net:27017,ac-zzubhw4-shard-00-02.40qhsae.mongodb.net:27017/?ssl=true&replicaSet=atlas-3owaci-shard-0&authSource=admin';

async function testConnection(uri, label) {
  console.log(`\n⏳ [${label}] جاري محاولة الاتصال...`);
  console.log(`رابط الاتصال: ${uri.replace(/:([^:@]+)@/, ':****@')}`);
  
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`✅ [${label}] تم الاتصال بنجاح!`);
    
    console.log(`⏳ [${label}] جاري استعلام قاعدة البيانات للتأكد من إمكانية القراءة...`);
    const card = await Card.findOne();
    if (card) {
      console.log(`🎉 [${label}] نجاح! تم العثور على باقة باسم: ${card.name || card.title || card.code}`);
    } else {
      console.log(`ℹ️ [${label}] الاتصال ناجح ولكن لم يتم العثور على أي باقات في قاعدة البيانات.`);
    }
    
    await mongoose.connection.close();
    console.log(`🔌 [${label}] تم إغلاق الاتصال.`);
    return true;
  } catch (error) {
    console.error(`❌ [${label}] فشل الاتصال!`);
    console.error(`تفاصيل الخطأ: ${error.message}`);
    try { await mongoose.connection.close(); } catch(e) {}
    return false;
  }
}

async function run() {
  // 1. Try SRV Connection
  const srvSuccess = await testConnection(dbUriSRV, 'SRV Connection');
  if (srvSuccess) {
    console.log('\n🎉 تم الاتصال بنجاح باستخدام الرابط الأصلي SRV.');
    process.exit(0);
  }
  
  console.log('\n⚠️ فشل الاتصال بالرابط الأصلي. سنحاول الآن الاتصال باستخدام الرابط الاحتياطي المباشر (Non-SRV Fallback)...');
  
  // 2. Try Fallback Connection
  const fallbackSuccess = await testConnection(dbUriFallback, 'Fallback Connection');
  if (fallbackSuccess) {
    console.log('\n🎉 تم الاتصال بنجاح باستخدام الرابط المباشر الاحتياطي!');
    console.log('💡 نصيحة: يرجى تحديث ملف .env بالرابط المباشر لتجنب مشاكل DNS الخاصة بـ Node.js.');
    process.exit(0);
  }
  
  console.log('\n❌ فشل الاتصال بكلا الرابطين. يرجى التحقق من إعدادات جدار الحماية أو اتصال الإنترنت أو صلاحيات الوصول IP في MongoDB Atlas.');
  process.exit(1);
}

run();

// Airports List - قائمة المطارات المصرية
const EGYPTIAN_AIRPORTS = [
    { code: 'CAI', name: 'مطار القاهرة الدولي', englishName: 'Cairo International Airport' },
    { code: 'HRG', name: 'مطار الغردقة الدولي', englishName: 'Hurghada International Airport' },
    { code: 'SSH', name: 'مطار شرم الشيخ الدولي', englishName: 'Sharm El-Sheikh International Airport' },
    { code: 'ALY', name: 'مطار برج العرب الدولي', englishName: 'Borg El-Arab International Airport' },
    { code: 'SKX', name: 'مطار سفنكس الدولي', englishName: 'Sphinx International Airport' },
    { code: 'LXR', name: 'مطار الأقصر الدولي', englishName: 'Luxor International Airport' },
    { code: 'AST', name: 'مطار أسيوط الدولي', englishName: 'Assiut International Airport' }
];

// Airlines List - قائمة خطوط الطيران
const DEFAULT_AIRLINES = [
    { name: 'مصر للطيران', englishName: 'Egypt Air', code: 'MS' },
    { name: 'Air Cairo', englishName: 'Air Cairo', code: 'AC' },
    { name: 'النيل للطيران', englishName: 'Nile Air', code: 'NA' },
    { name: 'العربية للطيران', englishName: 'Arabair', code: 'AB' },
    { name: 'الخطوط السعودية', englishName: 'Saudi Arabian Airlines', code: 'SV' },
    { name: 'طيران الإمارات', englishName: 'Emirates', code: 'EK' },
    { name: 'الاتحاد للطيران', englishName: 'Etihad Airways', code: 'EY' }
];

// Transportation Methods for Internal Tours - وسائل النقل للرحلات الداخلية
const INTERNAL_TRANSPORT_METHODS = [
    { id: 'bus', name: 'حافلة سياحية', englishName: 'Tour Bus' },
    { id: 'car', name: 'سيارة خاصة', englishName: 'Private Car' },
    { id: 'train', name: 'قطار', englishName: 'Train' },
    { id: 'flight', name: 'رحلة جوية', englishName: 'Flight' }
];

// Room Types - أنواع الغرف
const ROOM_TYPES = [
    { id: 'single', name: 'فردي', englishName: 'Single' },
    { id: 'double', name: 'ثنائي', englishName: 'Double' },
    { id: 'triple', name: 'ثلاثي', englishName: 'Triple' },
    { id: 'quad', name: 'رباعي', englishName: 'Quad' },
    { id: 'quintet', name: 'خماسي', englishName: 'Quintet' }
];

// Program Types for Omrah - أنواع البرامج للعمرة
const PROGRAM_TYPES = [
    { id: 'economic', name: 'اقتصادي', englishName: 'Economic' },
    { id: 'premium', name: 'مميز', englishName: 'Premium' },
    { id: 'luxury', name: 'فاخر', englishName: 'Luxury' }
];

// Egyptian Cities for Internal Tours - المدن المصرية للرحلات الداخلية
const EGYPTIAN_CITIES = [
    { id: 'cairo', name: 'القاهرة', englishName: 'Cairo' },
    { id: 'giza', name: 'الجيزة', englishName: 'Giza' },
    { id: 'hurghada', name: 'الغردقة', englishName: 'Hurghada' },
    { id: 'sharm', name: 'شرم الشيخ', englishName: 'Sharm El-Sheikh' },
    { id: 'luxor', name: 'الأقصر', englishName: 'Luxor' },
    { id: 'aswan', name: 'أسوان', englishName: 'Aswan' },
    { id: 'alexandria', name: 'الإسكندرية', englishName: 'Alexandria' },
    { id: 'sinai', name: 'سيناء', englishName: 'Sinai' },
    { id: 'mansoura', name: 'المنصورة', englishName: 'Mansoura' },
    { id: 'tanta', name: 'طنطا', englishName: 'Tanta' }
];

module.exports = {
    EGYPTIAN_AIRPORTS,
    DEFAULT_AIRLINES,
    INTERNAL_TRANSPORT_METHODS,
    ROOM_TYPES,
    PROGRAM_TYPES,
    EGYPTIAN_CITIES
};
const mongoose = require('mongoose');

const pageContentSchema = new mongoose.Schema({
    contentType: {
        type: String,
        required: true,
        unique: true,
        enum: [
            // Hero Section
            'hero_title',
            'hero_description', 
            'hero_button_text',
            // Omrah Section
            'omrah_title',
            'omrah_description',
            'omrah_button_text',
            'omrah_no_packages_title',
            'omrah_no_packages_description',
            // Internal Tours Section
            'internal_tours_title',
            'internal_tours_description', 
            'internal_tours_button_text',
            'internal_tours_no_packages_title',
            'internal_tours_no_packages_description',
            // External Tours Section
            'external_tours_title',
            'external_tours_description',
            'external_tours_button_text',
            'external_tours_no_packages_title',
            'external_tours_no_packages_description',
            // Partners Section
            'partners_title',
            'partners_description',
            // Gallery Section
            'gallery_title',
            'gallery_description',
            // Testimonials Section
            'testimonials_title',
            'testimonials_description',
            'testimonial_user_name',
            'testimonial_text',
            // About Section
            'about_title',
            'about_description',
            'about_button_text',
            // Common Elements
            'view_more_text',
            'contact_us_text',
            'coming_soon_text',
            // Package Page Headers and Descriptions
            'bundles_page_title',
            'bundles_page_description',
            'inner_tours_page_title',
            'inner_tours_page_description',
            'external_tours_page_title',
            'external_tours_page_description',
            'haj_tours_page_title',
            'haj_tours_page_description',
            'ramadan_tours_page_title',
            'ramadan_tours_page_description',
            'all_packages_page_title',
            'all_packages_page_description'
        ]
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Default data for all page content
pageContentSchema.statics.getDefaultContent = function() {
    return [
        // Hero Section
        {
            contentType: 'hero_title',
            content: 'دعنا نصحبك في رحلة إلى مكة المكرمة، واستمتع بتجربة عمرة مريحة مع باقاتنا المتنوعة وعروضنا المميزة.',
            isActive: true
        },
        {
            contentType: 'hero_description',
            content: 'ابدأ رحلتك إلى مكة المكرمة معنا. استمتع بأفضل الباقات والخدمات المتكاملة التي تجعل رحلتك مريحة وسهلة من البداية وحتى العودة.',
            isActive: true
        },
        {
            contentType: 'hero_button_text',
            content: 'تواصل معنا',
            isActive: true
        },
        // Omrah Section
        {
            contentType: 'omrah_title',
            content: 'باقات العمرة',
            isActive: true
        },
        {
            contentType: 'omrah_description',
            content: 'معنا رحلة العمرة أصبحت أسهل وأكثر راحة، حيث نوفر لك باقات متنوعة تناسب جميع الاحتياجات والميزانيات',
            isActive: true
        },
        {
            contentType: 'omrah_button_text',
            content: 'عرض المزيد',
            isActive: true
        },
        {
            contentType: 'omrah_no_packages_title',
            content: 'لا توجد باقات عمرة متاحة حالياً',
            isActive: true
        },
        {
            contentType: 'omrah_no_packages_description',
            content: 'نحن نعمل على إضافة باقات عمرة مميزة قريباً. تابعونا للحصول على أفضل العروض والباقات المتاحة.',
            isActive: true
        },
        // Internal Tours Section
        {
            contentType: 'internal_tours_title',
            content: 'العروض الرحلات الداخلية خلال رحلة العمرة',
            isActive: true
        },
        {
            contentType: 'internal_tours_description',
            content: 'استمتع بأفضل العروض الداخلية على رحلات العمرة، مع باقات مصممة لتلبية جميع احتياجاتك بأسعار مميزة وخدمات شاملة.',
            isActive: true
        },
        {
            contentType: 'internal_tours_button_text',
            content: 'عرض المزيد',
            isActive: true
        },
        {
            contentType: 'internal_tours_no_packages_title',
            content: 'لا توجد رحلات داخلية متاحة حالياً',
            isActive: true
        },
        {
            contentType: 'internal_tours_no_packages_description',
            content: 'نحن نعمل على إضافة رحلات داخلية مميزة قريباً. تابعونا للحصول على أفضل العروض والرحلات المتاحة.',
            isActive: true
        },
        // External Tours Section
        {
            contentType: 'external_tours_title',
            content: 'العروض الرحلات الخارجية خلال رحلة العمرة',
            isActive: true
        },
        {
            contentType: 'external_tours_description',
            content: 'اكتشف العالم مع رحلاتنا الخارجية المميزة، باقات مصممة لتجمع بين الروحانية والاستكشاف بأسعار مميزة وخدمات شاملة.',
            isActive: true
        },
        {
            contentType: 'external_tours_button_text',
            content: 'عرض المزيد',
            isActive: true
        },
        {
            contentType: 'external_tours_no_packages_title',
            content: 'لا توجد رحلات خارجية متاحة حالياً',
            isActive: true
        },
        {
            contentType: 'external_tours_no_packages_description',
            content: 'نحن نعمل على إضافة رحلات خارجية مميزة قريباً. تابعونا للحصول على أفضل العروض والرحلات المتاحة.',
            isActive: true
        },
        // Partners Section
        {
            contentType: 'partners_title',
            content: 'شركاء النجاح',
            isActive: true
        },
        {
            contentType: 'partners_description',
            content: 'نتعاون مع العديد من شركات السياحه المرخصه من وزارة السياحة المصرية',
            isActive: true
        },
        // Gallery Section
        {
            contentType: 'gallery_title',
            content: 'عروض حصريه',
            isActive: true
        },
        {
            contentType: 'gallery_description',
            content: 'نوفّر لعملائنا رحلة مريحة، مع مجموعة متنوعة من الخدمات المميزة التي تجعل كل سفر ممتعاً وخالياً من المتاعب.',
            isActive: true
        },
        // Testimonials Section
        {
            contentType: 'testimonials_title',
            content: 'آراء العملاء عن <br>تجربتهم معنا',
            isActive: true
        },
        {
            contentType: 'testimonials_description',
            content: 'استمع إلى قصص معتمرينا وحجاجنا الكرام، وتعرّف كيف ساعدتهم خدماتنا المتميزة في عيش تجربة روحية مريحة ومتكاملة، من التخطيط وحتى أداء المناسك بكل طمأنينة.',
            isActive: true
        },
        {
            contentType: 'testimonial_user_name',
            content: 'مصطفى حامد',
            isActive: true
        },
        {
            contentType: 'testimonial_text',
            content: 'أكثر ما أعجبني هو اهتمامهم بأدق التفاصيل، حتى الاستقبال في المطار كان بابتسامة. شعرت أنني مع عائلتي طوال الرحلة.',
            isActive: true
        },
        // About Section
        {
            contentType: 'about_title',
            content: 'من نحن ؟',
            isActive: true
        },
        {
            contentType: 'about_description',
            content: 'منصة متخصصة في تقديم باقات العمرة الشاملة، تغطي جميع تفاصيل الرحلة — من ترتيبات السفر وحتى الإقامة في أفخم فنادق مكة المكرمة والمدينة المنورة — لضمان راحة ورضا كل معتمر. مهمتنا تتجاوز الباقات التقليدية، فنحن نصنع تجارب روحانية شخصية تبقى خالدة في الذاكرة، وبأسعار تناسب الجميع. وبالاعتماد على أحدث الحلول الرقمية، نجعل رحلتك أكثر سلاسة وراحة واتصالًا، منذ لحظة الحجز وحتى العودة. "رحلتعمرة" – دعنا نأخذك هناك، ونحوّل كل خطوة إلى ذكرى مضيئة ترافقك مدى الحياة.',
            isActive: true
        },
        {
            contentType: 'about_button_text',
            content: 'اقرأ المزيد',
            isActive: true
        },
        // Common Elements
        {
            contentType: 'view_more_text',
            content: 'عرض المزيد',
            isActive: true
        },
        {
            contentType: 'contact_us_text',
            content: 'تواصل معنا',
            isActive: true
        },
        {
            contentType: 'coming_soon_text',
            content: 'قريباً',
            isActive: true
        },
        // Package Page Headers and Descriptions
        {
            contentType: 'bundles_page_title',
            content: 'باقات العمرة الحصرية في مكة المكرمة',
            isActive: true
        },
        {
            contentType: 'bundles_page_description',
            content: 'استمتع مع رحلة عمرة بأرقى الباقات العمرية الحصرية في مكة المكرمة، والتي تجمع بين الراحة والخدمات المميزة لتجعل رحلتك الإيمانية أكثر سلاسة وطمأنينة.',
            isActive: true
        },
        {
            contentType: 'inner_tours_page_title',
            content: 'الرحلات الداخلية المميزة',
            isActive: true
        },
        {
            contentType: 'inner_tours_page_description',
            content: 'اكتشف جمال المملكة العربية السعودية مع رحلاتنا الداخلية المميزة التي تأخذك في جولة استكشافية رائعة.',
            isActive: true
        },
        {
            contentType: 'external_tours_page_title',
            content: 'الرحلات الخارجية الاستثنائية',
            isActive: true
        },
        {
            contentType: 'external_tours_page_description',
            content: 'استكشف العالم مع رحلاتنا الخارجية المختارة بعناية لتوفر لك تجربة سفر لا تُنسى.',
            isActive: true
        },
        {
            contentType: 'haj_tours_page_title',
            content: 'رحلات الحج المباركة',
            isActive: true
        },
        {
            contentType: 'haj_tours_page_description',
            content: 'أدِ فريضة الحج مع باقاتنا المتنوعة التي تلبي جميع الاحتياجات، من الاقتصادية إلى الفاخرة، لتجعل رحلتك المقدسة مريحة ومباركة.',
            isActive: true
        },
        {
            contentType: 'ramadan_tours_page_title',
            content: 'رحلات رمضان الروحانية',
            isActive: true
        },
        {
            contentType: 'ramadan_tours_page_description',
            content: 'اقضِ شهر رمضان المبارك في الأماكن المقدسة مع باقاتنا الرمضانية الخاصة التي تجمع بين العبادة والراحة في أجواء روحانية فريدة.',
            isActive: true
        },
        {
            contentType: 'all_packages_page_title',
            content: 'جميع الباقات والرحلات المتاحة',
            isActive: true
        },
        {
            contentType: 'all_packages_page_description',
            content: 'اختر من بين مجموعة متنوعة من الباقات والرحلات المصممة خصيصاً لتلبية جميع احتياجاتك ومتطلباتك.',
            isActive: true
        }
    ];
};

// Static method to initialize default content
pageContentSchema.statics.initializeDefaults = async function() {
  try {
    const count = await this.countDocuments();
    if (count === 0) {
      console.log('Creating default page content...');
      
      // Create all 23 content types with their default values
      const defaultContents = [
        // Hero Section
        { contentType: 'hero_title', content: 'دعنا نصحبك في رحلة إلى مكة المكرمة، واستمتع بتجربة عمرة مريحة مع باقاتنا المتنوعة وعروضنا المميزة.' },
        { contentType: 'hero_description', content: 'ابدأ رحلتك إلى مكة المكرمة معنا. استمتع بأفضل الباقات والخدمات المتكاملة التي تجعل رحلتك مريحة وسهلة من البداية وحتى العودة.' },
        { contentType: 'hero_button_text', content: 'تواصل معنا' },
        
        // Omrah Section
        { contentType: 'omrah_title', content: 'باقات العمرة' },
        { contentType: 'omrah_description', content: 'معنا رحلة العمرة أصبحت أسهل وأكثر راحة، حيث نوفر لك باقات متنوعة تناسب جميع الاحتياجات والميزانيات' },
        { contentType: 'omrah_button_text', content: 'عرض المزيد' },
        { contentType: 'omrah_no_packages_title', content: 'لا توجد باقات عمرة متاحة حالياً' },
        { contentType: 'omrah_no_packages_description', content: 'نحن نعمل على إضافة باقات عمرة مميزة قريباً. تابعونا للحصول على أفضل العروض والباقات المتاحة.' },
        
        // Internal Tours Section
        { contentType: 'internal_tours_title', content: 'العروض الرحلات الداخلية خلال رحلة العمرة' },
        { contentType: 'internal_tours_description', content: 'استمتع بأفضل العروض الداخلية على رحلات العمرة، مع باقات مصممة لتلبية جميع احتياجاتك بأسعار مميزة وخدمات شاملة.' },
        { contentType: 'internal_tours_button_text', content: 'عرض المزيد' },
        { contentType: 'internal_tours_no_packages_title', content: 'لا توجد رحلات داخلية متاحة حالياً' },
        { contentType: 'internal_tours_no_packages_description', content: 'نحن نعمل على إضافة رحلات داخلية مميزة قريباً. تابعونا للحصول على أفضل العروض والرحلات المتاحة.' },
        
        // External Tours Section
        { contentType: 'external_tours_title', content: 'العروض الرحلات الخارجية خلال رحلة العمرة' },
        { contentType: 'external_tours_description', content: 'اكتشف العالم مع رحلاتنا الخارجية المميزة، باقات مصممة لتجمع بين الروحانية والاستكشاف بأسعار مميزة وخدمات شاملة.' },
        { contentType: 'external_tours_button_text', content: 'عرض المزيد' },
        { contentType: 'external_tours_no_packages_title', content: 'لا توجد رحلات خارجية متاحة حالياً' },
        { contentType: 'external_tours_no_packages_description', content: 'نحن نعمل على إضافة رحلات خارجية مميزة قريباً. تابعونا للحصول على أفضل العروض والرحلات المتاحة.' },
        
        // Partners Section
        { contentType: 'partners_title', content: 'شركاء النجاح' },
        { contentType: 'partners_description', content: 'نتعاون مع العديد من شركات السياحه المرخصه من وزارة السياحة المصرية' },
        
        // Gallery Section
        { contentType: 'gallery_title', content: 'عروض حصريه' },
        { contentType: 'gallery_description', content: 'نوفّر لعملائنا رحلة مريحة، مع مجموعة متنوعة من الخدمات المميزة التي تجعل كل سفر ممتعاً وخالياً من المتاعب.' },
        
        // Testimonials Section
        { contentType: 'testimonials_title', content: 'آراء العملاء عن <br>تجربتهم معنا' },
        { contentType: 'testimonials_description', content: 'استمع إلى قصص معتمرينا وحجاجنا الكرام، وتعرّف كيف ساعدتهم خدماتنا المتميزة في عيش تجربة روحية مريحة ومتكاملة، من التخطيط وحتى أداء المناسك بكل طمأنينة.' },
        { contentType: 'testimonial_user_name', content: 'مصطفى حامد' },
        { contentType: 'testimonial_text', content: 'أكثر ما أعجبني هو اهتمامهم بأدق التفاصيل، حتى الاستقبال في المطار كان بابتسامة. شعرت أنني مع عائلتي طوال الرحلة.' },
        
        // About Section
        { contentType: 'about_title', content: 'من نحن ؟' },
        { contentType: 'about_description', content: 'منصة متخصصة في تقديم باقات العمرة الشاملة، تغطي جميع تفاصيل الرحلة — من ترتيبات السفر وحتى الإقامة في أفخم فنادق مكة المكرمة والمدينة المنورة — لضمان راحة ورضا كل معتمر. مهمتنا تتجاوز الباقات التقليدية، فنحن نصنع تجارب روحانية شخصية تبقى خالدة في الذاكرة، وبأسعار تناسب الجميع. وبالاعتماد على أحدث الحلول الرقمية، نجعل رحلتك أكثر سلاسة وراحة واتصالًا، منذ لحظة الحجز وحتى العودة. "رحلتعمرة" – دعنا نأخذك هناك، ونحوّل كل خطوة إلى ذكرى مضيئة ترافقك مدى الحياة.' },
        { contentType: 'about_button_text', content: 'اقرأ المزيد' },
        
        // Common Elements
        { contentType: 'view_more_text', content: 'عرض المزيد' },
        { contentType: 'contact_us_text', content: 'تواصل معنا' },
        { contentType: 'coming_soon_text', content: 'قريباً' },
        
        // Package Page Headers and Descriptions
        { contentType: 'bundles_page_title', content: 'باقات العمرة الحصرية في مكة المكرمة' },
        { contentType: 'bundles_page_description', content: 'استمتع مع رحلة عمرة بأرقى الباقات العمرية الحصرية في مكة المكرمة، والتي تجمع بين الراحة والخدمات المميزة لتجعل رحلتك الإيمانية أكثر سلاسة وطمأنينة.' },
        { contentType: 'inner_tours_page_title', content: 'الرحلات الداخلية المميزة' },
        { contentType: 'inner_tours_page_description', content: 'اكتشف جمال المملكة العربية السعودية مع رحلاتنا الداخلية المميزة التي تأخذك في جولة استكشافية رائعة.' },
        { contentType: 'external_tours_page_title', content: 'الرحلات الخارجية الاستثنائية' },
        { contentType: 'external_tours_page_description', content: 'استكشف العالم مع رحلاتنا الخارجية المختارة بعناية لتوفر لك تجربة سفر لا تُنسى.' },
        { contentType: 'haj_tours_page_title', content: 'رحلات الحج المباركة' },
        { contentType: 'haj_tours_page_description', content: 'أدِ فريضة الحج مع باقاتنا المتنوعة التي تلبي جميع الاحتياجات، من الاقتصادية إلى الفاخرة، لتجعل رحلتك المقدسة مريحة ومباركة.' },
        { contentType: 'ramadan_tours_page_title', content: 'رحلات رمضان الروحانية' },
        { contentType: 'ramadan_tours_page_description', content: 'اقضِ شهر رمضان المبارك في الأماكن المقدسة مع باقاتنا الرمضانية الخاصة التي تجمع بين العبادة والراحة في أجواء روحانية فريدة.' },
        { contentType: 'all_packages_page_title', content: 'جميع الباقات والرحلات المتاحة' },
        { contentType: 'all_packages_page_description', content: 'اختر من بين مجموعة متنوعة من الباقات والرحلات المصممة خصيصاً لتلبية جميع احتياجاتك ومتطلباتك.' }
      ];

      await this.insertMany(defaultContents);
      console.log('Default page content created successfully');
    } else {
      console.log('Page content already exists, skipping initialization');
    }
  } catch (error) {
    console.error('Error initializing default page content:', error);
  }
};

module.exports = mongoose.model('PageContent', pageContentSchema);
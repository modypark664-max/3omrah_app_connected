const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

// Sanitize HTML function with custom options
const sanitizeOptions = {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
};

// Custom Joi extension for sanitizing HTML
const joiWithSanitize = Joi.extend((joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.sanitized': '{{#label}} contains invalid characters'
    },
    rules: {
        sanitize: {
            method() {
                return this.$_addRule({ name: 'sanitize' });
            },
            validate(value, helpers) {
                const sanitized = sanitizeHtml(value, sanitizeOptions).trim();
                return sanitized;
            }
        }
    }
}));

// User Registration Schema
const userRegistrationSchema = joiWithSanitize.object({
    username: joiWithSanitize.string()
        .sanitize()
        .min(3)
        .max(30)
        .pattern(/^[a-zA-Z0-9_\u0600-\u06FF\s]+$/) // Allow Arabic characters, English, numbers, underscore, spaces
        .required()
        .messages({
            'string.min': 'اسم المستخدم يجب أن يكون على الأقل 3 أحرف',
            'string.max': 'اسم المستخدم يجب أن لا يزيد عن 30 حرف',
            'string.pattern.base': 'اسم المستخدم يحتوي على أحرف غير صالحة',
            'any.required': 'اسم المستخدم مطلوب'
        }),
    
    phoneNumber: joiWithSanitize.string()
        .sanitize()
        .pattern(/^[0-9]{11}$/) // Exactly 11 digits for Egyptian phone numbers
        .required()
        .messages({
            'string.pattern.base': 'رقم الهاتف يجب أن يكون 11 رقم بالضبط',
            'any.required': 'رقم الهاتف مطلوب'
        }),
    
    password: joiWithSanitize.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/)
        .required()
        .messages({
            'string.min': 'كلمة المرور يجب أن تكون على الأقل 8 أحرف',
            'string.max': 'كلمة المرور طويلة جداً',
            'string.pattern.base': 'كلمة المرور يجب أن تحتوي على: حرف كبير، حرف صغير، رقم، ورمز خاص (!@#$%^&*)',
            'any.required': 'كلمة المرور مطلوبة'
        }),
    
    confirmPassword: joiWithSanitize.string()
        .valid(joiWithSanitize.ref('password'))
        .required()
        .messages({
            'any.only': 'تأكيد كلمة المرور غير متطابق',
            'any.required': 'تأكيد كلمة المرور مطلوب'
        })
});

// User Login Schema
const userLoginSchema = joiWithSanitize.object({
    phoneNumber: joiWithSanitize.string()
        .sanitize()
        .pattern(/^[0-9]{11}$/)
        .required()
        .messages({
            'string.pattern.base': 'رقم الهاتف يجب أن يكون 11 رقم بالضبط',
            'any.required': 'رقم الهاتف مطلوب'
        }),
    
    password: joiWithSanitize.string()
        .min(1)
        .max(128)
        .required()
        .messages({
            'string.min': 'كلمة المرور مطلوبة',
            'any.required': 'كلمة المرور مطلوبة'
        })
});

// Partner Signup Schema
const partnerSignupSchema = joiWithSanitize.object({
    companyName: joiWithSanitize.string().sanitize().min(2).max(100).required().messages({
        'string.min': 'اسم الشركة يجب أن يكون على الأقل 2 أحرف',
        'string.max': 'اسم الشركة يجب أن لا يزيد عن 100 حرف',
        'any.required': 'اسم الشركة مطلوب'
    }),
    companyCode: joiWithSanitize.string().sanitize().min(2).max(50).required().messages({
        'string.min': 'كود الشركة يجب أن يكون على الأقل 2 أحرف',
        'string.max': 'كود الشركة يجب أن لا يزيد عن 50 حرف',
        'any.required': 'كود الشركة مطلوب'
    }),
    companyRepresentative: joiWithSanitize.string().sanitize().min(2).max(50).required().messages({
        'string.min': 'اسم المسئول يجب أن يكون على الأقل 2 أحرف',
        'string.max': 'اسم المسئول يجب أن لا يزيد عن 50 حرف',
        'any.required': 'اسم المسئول مطلوب'
    }),
    partnerPackage: joiWithSanitize.string().valid('basic', 'professional', 'premium').required().messages({
        'any.only': 'نوع الباقة يجب أن يكون أساسية أو احترافية أو مميزة',
        'any.required': 'نوع الباقة مطلوب'
    }),
    branches: joiWithSanitize.string().sanitize().min(2).max(200).required().messages({
        'string.min': 'فروع الشركة يجب أن تكون على الأقل 2 أحرف',
        'string.max': 'فروع الشركة يجب أن لا تزيد عن 200 حرف',
        'any.required': 'فروع الشركة مطلوبة'
    }),
    address1: joiWithSanitize.string().sanitize().min(5).max(200).required().messages({
        'string.min': 'عنوان الشركة الأول يجب أن يكون على الأقل 5 أحرف',
        'string.max': 'عنوان الشركة الأول يجب أن لا يزيد عن 200 حرف',
        'any.required': 'عنوان الشركة الأول مطلوب'
    }),
    address2: joiWithSanitize.string().sanitize().allow('').max(200).messages({
        'string.max': 'عنوان الشركة الثاني يجب أن لا يزيد عن 200 حرف'
    }),
    phoneNumbers: joiWithSanitize.string().sanitize().pattern(/^[0-9,+\s,-]+$/).min(8).max(100).required().messages({
        'string.pattern.base': 'أرقام التليفونات يجب أن تكون أرقام مفصولة بفواصل',
        'string.min': 'يجب إدخال رقم هاتف واحد على الأقل',
        'string.max': 'عدد الأرقام أو طولها كبير جداً',
        'any.required': 'أرقام التليفونات مطلوبة'
    }),
    companyDocs: joiWithSanitize.any().optional().messages({
        'any.required': 'رفع أوراق الشركة مطلوب'
    }),
    phoneNumber: joiWithSanitize.string().sanitize().pattern(/^[0-9]{11}$/).required().messages({
        'string.pattern.base': 'رقم الهاتف يجب أن يكون 11 رقم بالضبط',
        'any.required': 'رقم الهاتف مطلوب'
    }),
    password: joiWithSanitize.string().min(8).max(128).required().messages({
        'string.min': 'كلمة المرور يجب أن تكون على الأقل 8 أحرف',
        'string.max': 'كلمة المرور طويلة جداً',
        'any.required': 'كلمة المرور مطلوبة'
    }),
    confirmPassword: joiWithSanitize.string().valid(joiWithSanitize.ref('password')).required().messages({
        'any.only': 'تأكيد كلمة المرور غير متطابق',
        'any.required': 'تأكيد كلمة المرور مطلوب'
    })
});

// Card Creation Schema
const cardCreationSchema = joiWithSanitize.object({
    type: joiWithSanitize.string()
        .valid('omrah', 'internal_tour', 'external_tour', '7ag', 'ramadan')
        .required()
        .messages({
            'any.only': 'نوع الرحلة غير صالح',
            'any.required': 'نوع الرحلة مطلوب'
        }),
    
    offer_type: joiWithSanitize.string()
        .sanitize()
        // Updated options to match new UI selections:
        // omrah / 7ag / ramadan: اقتصادي | مميز | فاخر
        // internal_tour: رحله يوم الواحد | رحلات شهر العسل | رحلات سياحيه
        // external_tour: رحلات بتاشيره | رحلات بدون تاشيره | رحلات شهر العسل
        // NOTE: Old values (تأشيرة سياحية/عمل/دراسة, رحلة يوم واحد/يومين/أسبوع) removed.
        .valid(
            'اقتصادي', 'مميز', 'فاخر',
            'رحله يوم الواحد', 'رحلات شهر العسل', 'رحلات سياحيه',
            'رحلات بتاشيره', 'رحلات بدون تاشيره'
        )
        .optional()
        .messages({
            'any.only': 'نوع العرض غير صالح'
        }),
    
    days: joiWithSanitize.number()
        .integer()
        .min(1)
        .required()
        .messages({
            'number.min': 'عدد الأيام يجب أن يكون على الأقل 1',
            'any.required': 'عدد الأيام مطلوب'
        }),
    
    nights: joiWithSanitize.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.min': 'عدد الليالي يجب أن يكون أكبر من أو يساوي صفر',
            'any.required': 'عدد الليالي مطلوب'
        }),
    
    travel_date: joiWithSanitize.date()
        .iso()
        .min('now')
        .required()
        .messages({
            'date.min': 'تاريخ السفر يجب أن يكون في المستقبل',
            'any.required': 'تاريخ السفر مطلوب'
        }),

    offer_expiry_date: joiWithSanitize.date()
        .iso()
        .min('now')
        .when('travel_date', {
            is: joiWithSanitize.date().required(),
            then: joiWithSanitize.date().max(joiWithSanitize.ref('travel_date')),
            otherwise: joiWithSanitize.date()
        })
        .required()
        .messages({
            'date.min': 'تاريخ انتهاء العرض يجب أن يكون في المستقبل',
            'date.max': 'تاريخ انتهاء العرض يجب أن يكون قبل تاريخ السفر',
            'any.required': 'تاريخ انتهاء العرض مطلوب'
        }),
    
    code: joiWithSanitize.string()
        .sanitize()
        .alphanum()
        .min(3)
        .max(20)
        .required()
        .messages({
            'string.alphanum': 'كود الرحلة يجب أن يحتوي على أحرف وأرقام فقط',
            'string.min': 'كود الرحلة يجب أن يكون على الأقل 3 أحرف',
            'string.max': 'كود الرحلة يجب أن لا يزيد عن 20 حرف',
            'any.required': 'كود الرحلة مطلوب'
        }),
    
    going_route: joiWithSanitize.string()
        .sanitize()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'مسار الذهاب يجب أن يكون على الأقل حرفين',
            'string.max': 'مسار الذهاب طويل جداً',
            'any.required': 'مسار الذهاب مطلوب'
        }),
    
    returning_route: joiWithSanitize.string()
        .sanitize()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'مسار العودة يجب أن يكون على الأقل حرفين',
            'string.max': 'مسار العودة طويل جداً',
            'any.required': 'مسار العودة مطلوب'
        }),
    
    plane_company: joiWithSanitize.string()
        .sanitize()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.min': 'اسم شركة الطيران يجب أن يكون على الأقل حرفين',
            'string.max': 'اسم شركة الطيران طويل جداً',
            'any.required': 'اسم شركة الطيران مطلوب'
        }),
    
    included_services: joiWithSanitize.array()
        .items(joiWithSanitize.string().sanitize().min(1).max(200))
        .optional()
        .messages({
            'array.includesRequiredUnknowns': 'الخدمات المشمولة يجب أن تكون نصوص صالحة'
        }),
    
    not_included_services: joiWithSanitize.array()
        .items(joiWithSanitize.string().sanitize().min(1).max(200))
        .optional()
        .messages({
            'array.includesRequiredUnknowns': 'الخدمات غير المشمولة يجب أن تكون نصوص صالحة'
        }),
    
    notes: joiWithSanitize.array()
        .items(joiWithSanitize.string().sanitize().min(1).max(500))
        .optional()
        .messages({
            'array.includesRequiredUnknowns': 'الملاحظات يجب أن تكون نصوص صالحة'
        }),
    
    cancelling_rules: joiWithSanitize.array()
        .items(joiWithSanitize.string().sanitize().min(1).max(500))
        .optional()
        .messages({
            'array.includesRequiredUnknowns': 'قواعد الإلغاء يجب أن تكون نصوص صالحة'
        }),
    
    plane: joiWithSanitize.object({
        hotel: joiWithSanitize.array()
            .items(joiWithSanitize.object({
                nights: joiWithSanitize.number()
                    .integer()
                    .min(1)
                    .required()
                    .messages({
                        'number.min': 'عدد الليالي في الفندق يجب أن يكون على الأقل 1',
                        'any.required': 'عدد الليالي في الفندق مطلوب'
                    }),
                hotel: joiWithSanitize.string()
                    .sanitize()
                    .min(1)
                    .max(100)
                    .required()
                    .messages({
                        'string.min': 'اسم الفندق مطلوب',
                        'string.max': 'اسم الفندق طويل جداً',
                        'any.required': 'اسم الفندق مطلوب'
                    }),
                hotel_type: joiWithSanitize.string()
                    .valid('اقتصادي', 'سياحي', 'VIP')
                    .required()
                    .messages({
                        'any.only': 'نوع الفندق يجب أن يكون: اقتصادي، سياحي، أو VIP',
                        'any.required': 'نوع الفندق مطلوب'
                    }),
                location: joiWithSanitize.string()
                    .sanitize()
                    .min(1)
                    .max(100)
                    .required()
                    .messages({
                        'string.min': 'موقع الفندق مطلوب',
                        'string.max': 'موقع الفندق طويل جداً',
                        'any.required': 'موقع الفندق مطلوب'
                    }),
                comes_with_food: joiWithSanitize.boolean()
                    .required()
                    .messages({
                        'any.required': 'يجب تحديد ما إذا كان الفندق يشمل الطعام أم لا'
                    })
            }))
            .min(1)
            .required()
            .messages({
                'array.min': 'يجب إضافة فندق واحد على الأقل'
            }),
        
        housingOptions: joiWithSanitize.array()
            .items(joiWithSanitize.object({
                roomType: joiWithSanitize.string()
                    .sanitize()
                    .min(1)
                    .max(50)
                    .required()
                    .messages({
                        'any.required': 'نوع الغرفة مطلوب'
                    }),
                price: joiWithSanitize.number()
                    .min(0)
                    .required()
                    .messages({
                        'number.min': 'سعر الغرفة يجب أن يكون أكبر من أو يساوي صفر',
                        'any.required': 'سعر الغرفة مطلوب'
                    })
            }))
            .min(1)
            .required()
            .messages({
                'array.min': 'خيارات الإقامة يجب أن تحتوي على خيار واحد على الأقل'
            })
    }).required(),
    
    company: joiWithSanitize.string()
        .sanitize()
        .max(100)
        .optional()
        .allow('')
        .messages({
            'string.max': 'اسم الشركة طويل جداً'
        })
});

// Contact Form Schema
const contactSchema = joiWithSanitize.object({
    name: joiWithSanitize.string()
        .sanitize()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\u0600-\u06FF\s]+$/) // Allow Arabic and English characters and spaces
        .required()
        .messages({
            'string.min': 'الاسم يجب أن يكون على الأقل حرفين',
            'string.max': 'الاسم طويل جداً',
            'string.pattern.base': 'الاسم يحتوي على أحرف غير صالحة',
            'any.required': 'الاسم مطلوب'
        }),
    
    email: joiWithSanitize.string()
        .sanitize()
        .email()
        .required()
        .messages({
            'string.email': 'البريد الإلكتروني غير صحيح',
            'any.required': 'البريد الإلكتروني مطلوب'
        }),
    
    phoneNumber: joiWithSanitize.string()
        .sanitize()
        .pattern(/^[0-9]{11}$/)
        .required()
        .messages({
            'string.pattern.base': 'رقم الهاتف يجب أن يكون 11 رقم بالضبط',
            'any.required': 'رقم الهاتف مطلوب'
        }),
    
    message: joiWithSanitize.string()
        .sanitize()
        .min(10)
        .max(1000)
        .required()
        .messages({
            'string.min': 'الرسالة يجب أن تكون على الأقل 10 أحرف',
            'string.max': 'الرسالة طويلة جداً',
            'any.required': 'الرسالة مطلوبة'
        })
});

// Reservation Schema
const reservationSchema = joiWithSanitize.object({
    username: joiWithSanitize.string()
        .sanitize()
        .min(3)
        .max(30)
        .pattern(/^[a-zA-Z0-9_\u0600-\u06FF\s]+$/)
        .required()
        .messages({
            'string.min': 'اسم المستخدم يجب أن يكون على الأقل 3 أحرف',
            'string.max': 'اسم المستخدم يجب أن لا يزيد عن 30 حرف',
            'string.pattern.base': 'اسم المستخدم يحتوي على أحرف غير صالحة',
            'any.required': 'اسم المستخدم مطلوب'
        }),
    
    phoneNumber: joiWithSanitize.string()
        .sanitize()
        .pattern(/^[0-9]{11}$/)
        .required()
        .messages({
            'string.pattern.base': 'رقم الهاتف يجب أن يكون 11 رقم بالضبط',
            'any.required': 'رقم الهاتف مطلوب'
        }),
    
    peopleCount: joiWithSanitize.number()
        .integer()
        .min(1)
        .required()
        .messages({
            'number.min': 'عدد الأشخاص يجب أن يكون على الأقل 1',
            'any.required': 'عدد الأشخاص مطلوب'
        }),
    
    note: joiWithSanitize.string()
        .sanitize()
        .allow('')
        .max(500)
        .optional()
        .messages({
            'string.max': 'الملاحظة طويلة جداً',
        }),
    
    cardId: joiWithSanitize.string()
        .required()
        .messages({
            'any.required': 'معرف البطاقة مطلوب'
        }),
    
    roomType: joiWithSanitize.string()
        .sanitize()
        .min(1)
        .max(50)
        .required()
        .messages({
            'string.min': 'نوع الغرفة مطلوب',
            'any.required': 'نوع الغرفة مطلوب'
        })
});

// Partner Banner Schema
const partnerBannerSchema = joiWithSanitize.object({
    title: joiWithSanitize.string()
        .sanitize()
    
        .required()
        .messages({
            'string.min': 'العنوان يجب أن يكون على الأقل 5 أحرف',
            'string.max': 'العنوان يجب أن لا يزيد عن 200 حرف',
            'any.required': 'العنوان مطلوب'
        }),
    
    logoText: joiWithSanitize.string()
        .sanitize()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.min': 'نص الشعار يجب أن يكون على الأقل 3 أحرف',
            'string.max': 'نص الشعار يجب أن لا يزيد عن 100 حرف',
            'any.required': 'نص الشعار مطلوب'
        }),
    
    logoSubtext: joiWithSanitize.string()
        .sanitize()
        .min(3)
        .max(150)
        .required()
        .messages({
            'string.min': 'النص الفرعي للشعار يجب أن يكون على الأقل 3 أحرف',
            'string.max': 'النص الفرعي للشعار يجب أن لا يزيد عن 150 حرف',
            'any.required': 'النص الفرعي للشعار مطلوب'
        }),
    
    backgroundImage: joiWithSanitize.string()
        .sanitize()
        .uri()
        .allow('')
        .optional()
        .messages({
            'string.uri': 'رابط الصورة الخلفية يجب أن يكون صحيحًا'
        }),
    
    expirationDate: joiWithSanitize.date()
        .min('now')
        .required()
        .messages({
            'date.min': 'تاريخ الانتهاء يجب أن يكون في المستقبل',
            'any.required': 'تاريخ الانتهاء مطلوب',
            'date.base': 'تاريخ الانتهاء غير صحيح'
        }),
    
    priority: joiWithSanitize.number()
        .integer()
        .min(0)
        .max(100)
        .default(0)
        .messages({
            'number.base': 'الأولوية يجب أن تكون رقم',
            'number.integer': 'الأولوية يجب أن تكون رقم صحيح',
            'number.min': 'الأولوية يجب أن تكون 0 أو أكثر',
            'number.max': 'الأولوية يجب أن تكون 100 أو أقل'
        }),
    
    isActive: joiWithSanitize.boolean()
        .default(true)
        .messages({
            'boolean.base': 'حالة التفعيل يجب أن تكون صحيحة أو خاطئة'
        })
});

// Hero Media Schema (for validating non-file fields)
const heroMediaSchema = joiWithSanitize.object({
    type: joiWithSanitize.string()
        .valid('image','video')
        .required()
        .messages({ 'any.only': 'نوع الوسائط غير صالح', 'any.required': 'نوع الوسائط مطلوب' }),
    url: joiWithSanitize.string()
        .sanitize()
        .uri({ allowRelative: true })
        .allow('', null)
        .messages({ 'string.uri': 'الرابط غير صالح' }),
    order: joiWithSanitize.number()
        .integer()
        .min(0)
        .optional()
        .messages({ 'number.base': 'الترتيب يجب أن يكون رقم صحيح' })
});

// Partner Logos Schema - Support unlimited logos
const partnerLogosSchema = joiWithSanitize.object({
    images: joiWithSanitize.array().items(
        joiWithSanitize.string().sanitize().uri().allow('')
    ).min(1).required()
});

// Exclusive Gallery Schema
const exclusiveGallerySchema = joiWithSanitize.object({
    cardIds: joiWithSanitize.array().items(
        joiWithSanitize.string().required()
    ).length(3).required()
});

// Partner Tier Limits Schema
const partnerTierLimitsSchema = joiWithSanitize.object({
    basic: joiWithSanitize.number().integer().min(0).required(),
    professional: joiWithSanitize.number().integer().min(0).required(),
    premium: joiWithSanitize.number().integer().min(-1).required() // -1 means unlimited
});

// Validation middleware factory
const booleanFlag = () =>
    joiWithSanitize
        .boolean()
        .truthy('1')
        .truthy(1)
        .truthy('true')
        .truthy(true)
        .falsy('0')
        .falsy(0)
        .falsy('false')
        .falsy(false);

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const mobileBundlesQuerySchema = joiWithSanitize
    .object({
        type: joiWithSanitize
            .string()
            .sanitize()
            .lowercase()
            .valid('omrah', 'internal_tour', 'external_tour', '7ag', 'ramadan')
            .default('omrah'),
        going_route: joiWithSanitize.string().sanitize().max(100).optional().empty('').empty(null),
        plane_company: joiWithSanitize.string().sanitize().max(100).optional().empty('').empty(null),
        offer_type: joiWithSanitize.string().sanitize().max(100).optional().empty('').empty(null),
        company: joiWithSanitize.string().sanitize().max(100).optional().empty('').empty(null),
        min_price: joiWithSanitize.number().integer().min(0).optional().empty('').empty(null),
        max_price: joiWithSanitize.number().integer().min(0).optional().empty('').empty(null),
        days: joiWithSanitize.number().integer().min(1).optional().empty('').empty(null),
        nights: joiWithSanitize.number().integer().min(0).optional().empty('').empty(null),
        travel_date_from: joiWithSanitize.date().iso().optional().empty('').empty(null),
        travel_date_to: joiWithSanitize.date().iso().optional().empty('').empty(null),
        show_expired: booleanFlag().default(false),
        show_past_travel: booleanFlag().default(false),
        include_details: booleanFlag().default(false),
        limit: joiWithSanitize.number().integer().min(1).max(100).default(12),
        page: joiWithSanitize.number().integer().min(1).default(1)
    })
    .rename('includeDetails', 'include_details', { alias: true, override: true });

const mobileCardIdSchema = joiWithSanitize.object({
    cardId: joiWithSanitize
        .string()
        .sanitize()
        .pattern(objectIdPattern)
        .length(24)
        .required()
        .messages({
            'string.pattern.base': 'معرف الباقة غير صالح',
            'string.length': 'معرف الباقة غير صالح'
        })
});

const mobileReservationLookupSchema = joiWithSanitize.object({
    reservationId: joiWithSanitize
        .string()
        .sanitize()
        .min(4)
        .max(64)
        .pattern(/^[A-Za-z0-9_-]+$/)
        .required()
        .messages({
            'string.pattern.base': 'معرف الحجز غير صالح'
        })
});

const accountDeletionSchema = joiWithSanitize.object({
    password: joiWithSanitize.string().min(6).max(128).required().messages({
        'string.min': 'كلمة المرور قصيرة جداً',
        'any.required': 'كلمة المرور مطلوبة'
    }),
    reason: joiWithSanitize.string().sanitize().max(500).allow('', null).messages({
        'string.max': 'السبب طويل جداً'
    })
});

// Bundle Travel Request Schema (from mobile multi-step form)
const bundleTravelRequestSchema = joiWithSanitize.object({
    bundleType: joiWithSanitize.string()
        .valid('omrah', 'ramadan', 'internal_tour', 'external_tour')
        .required()
        .messages({ 'any.required': 'نوع الرحلة مطلوب' }),

    // Umrah / Ramadan fields
    programType: joiWithSanitize.string().valid('economic', 'premium', 'luxury').allow('', null),
    travelStartDate: joiWithSanitize.string().allow('', null),
    travelEndDate: joiWithSanitize.string().allow('', null),
    days: Joi.number().integer().min(0).allow(null),
    airport: joiWithSanitize.string().allow('', null),
    airline: joiWithSanitize.string().allow('', null),
    numberOfPeople: Joi.number().integer().min(1).allow(null),
    roomType: joiWithSanitize.string().allow('', null),

    // Internal tour fields
    activeTab: joiWithSanitize.string().valid('day', 'honeymoon', 'family').allow('', null),
    dayTour: Joi.object({
        day: joiWithSanitize.string().allow('', null),
        city: joiWithSanitize.string().allow('', null),
        numberOfPeople: Joi.number().integer().min(1).allow(null),
    }).allow(null),
    honeymoonTour: Joi.object({
        days: Joi.number().integer().min(0).allow(null),
        startDate: joiWithSanitize.string().allow('', null),
        endDate: joiWithSanitize.string().allow('', null),
        city: joiWithSanitize.string().allow('', null),
        hotel: joiWithSanitize.string().allow('', null),
    }).allow(null),
    familyTour: Joi.object({
        numberOfPeople: Joi.number().integer().min(1).allow(null),
        days: Joi.number().integer().min(0).allow(null),
        startDate: joiWithSanitize.string().allow('', null),
        endDate: joiWithSanitize.string().allow('', null),
        city: joiWithSanitize.string().allow('', null),
    }).allow(null),

    // External tour fields
    destinationCountry: joiWithSanitize.string().allow('', null),
    destinationCity: joiWithSanitize.string().allow('', null),
    hotel: joiWithSanitize.string().allow('', null),

    // Optional note from user
    note: joiWithSanitize.string().sanitize().max(1000).allow('', null),
});

const validateSchema = (schema, target = 'body', options = {}) => {
    const supportedTargets = ['body', 'query', 'params'];
    const normalizedTarget = supportedTargets.includes(target) ? target : 'body';
    const middlewareOptions = {
        failureRedirect: null,
        ...options
    };

    return (req, res, next) => {
        const payload = req[normalizedTarget] || {};
        const { error, value } = schema.validate(payload, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });

        if (error) {
            const errorMessages = error.details.map((detail) => detail.message);
            req.flash('error', errorMessages.join(', '));

            const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);
            if (isAjax || normalizedTarget !== 'body') {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errorMessages
                });
            }

            let fallbackUrl = req.get('referer') || req.get('referrer') || middlewareOptions.failureRedirect;

            if (!fallbackUrl) {
                const baseUrl = typeof req.baseUrl === 'string' ? req.baseUrl : '';
                if (baseUrl && baseUrl.startsWith('/admin')) {
                    fallbackUrl = '/admin/dashboard';
                }
            }

            if (!fallbackUrl && req.session && req.session.returnTo) {
                fallbackUrl = req.session.returnTo;
            }

            if (!fallbackUrl) {
                fallbackUrl = req.originalUrl && req.method === 'GET' ? req.originalUrl : '/';
            }

            return res.redirect(fallbackUrl);
        }

        req[normalizedTarget] = value;
        next();
    };
};

// Airport Schema
const airportSchema = joiWithSanitize.object({
    name: joiWithSanitize.string()
        .sanitize()
        .trim()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.min': 'اسم المطار يجب أن يكون على الأقل 3 أحرف',
            'string.max': 'اسم المطار يجب أن لا يزيد عن 100 حرف',
            'any.required': 'اسم المطار مطلوب'
        }),
    code: joiWithSanitize.string()
        .uppercase()
        .trim()
        .length(3)
        .pattern(/^[A-Z]{3}$/)
        .required()
        .messages({
            'string.length': 'كود المطار يجب أن يكون 3 أحرف',
            'string.pattern.base': 'كود المطار يجب أن يحتوي على أحرف إنجليزية فقط',
            'any.required': 'كود المطار مطلوب'
        }),
    city: joiWithSanitize.string()
        .sanitize()
        .trim()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.min': 'المدينة يجب أن تكون على الأقل حرفين',
            'string.max': 'المدينة يجب أن لا تزيد عن 50 حرف',
            'any.required': 'المدينة مطلوبة'
        }),
    country: joiWithSanitize.string()
        .sanitize()
        .trim()
        .max(50)
        .default('Egypt'),
    description: joiWithSanitize.string()
        .sanitize()
        .trim()
        .max(500),
    isActive: Joi.boolean().default(true),
    displayOrder: Joi.number().default(0)
});

// Airline Schema
const airlineSchema = joiWithSanitize.object({
    name: joiWithSanitize.string()
        .sanitize()
        .trim()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.min': 'اسم شركة الطيران يجب أن يكون على الأقل 3 أحرف',
            'string.max': 'اسم شركة الطيران يجب أن لا يزيد عن 100 حرف',
            'any.required': 'اسم شركة الطيران مطلوب'
        }),
    code: joiWithSanitize.string()
        .uppercase()
        .trim()
        .min(2)
        .max(3)
        .pattern(/^[A-Z0-9]{2,3}$/)
        .required()
        .messages({
            'string.min': 'كود شركة الطيران يجب أن يكون على الأقل حرفين',
            'string.max': 'كود شركة الطيران يجب أن لا يزيد عن 3 أحرف',
            'string.pattern.base': 'كود شركة الطيران يجب أن يحتوي على أحرف إنجليزية وأرقام فقط',
            'any.required': 'كود شركة الطيران مطلوب'
        }),
    description: joiWithSanitize.string()
        .sanitize()
        .trim()
        .max(500),
    logo: joiWithSanitize.string()
        .trim()
        .uri()
        .max(500),
    country: joiWithSanitize.string()
        .sanitize()
        .trim()
        .max(50),
    isActive: Joi.boolean().default(true),
    displayOrder: Joi.number().default(0)
});

// Export schemas and validation middleware
module.exports = {
    userRegistrationSchema,
    userLoginSchema,
    cardCreationSchema,
    contactSchema,
    reservationSchema,
    partnerBannerSchema,
    partnerSignupSchema,
    heroMediaSchema,
    partnerLogosSchema,
    exclusiveGallerySchema,
    partnerTierLimitsSchema,
    mobileBundlesQuerySchema,
    mobileCardIdSchema,
    mobileReservationLookupSchema,
    accountDeletionSchema,
    bundleTravelRequestSchema,
    airportSchema,
    airlineSchema,
    validateSchema,
    sanitizeHtml: (text) => sanitizeHtml(text, sanitizeOptions)
};

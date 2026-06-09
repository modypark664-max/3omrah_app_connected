const route = require("express").Router()
const Card = require("./models/Cards")
const { 
    isAdmin, 
    hasAdminPortalAccess,
    hasPermission, 
    canManageCards, 
    canEditCards, 
    canDeleteCards,
    canApproveCards,
    canViewUsers, 
    canEditUsers, 
    canDeleteUsers,
    canManageUserPermissions,
    canManagePartners,
    canVerifyPartners,
    canManageReservations,
    canVerifyPayments,
    canManageContent,
    canViewAnalytics
} = require("./middlware")
const User = require("./models/User")
const Reserve = require("./models/Reserve")
const PartnerBanner = require("./models/PartnerBanner")
const SectionContent = require("./models/SectionContent")
const PageContent = require("./models/PageContent")
const upload = require("./upload")
const { cardCreationSchema, partnerBannerSchema, validateSchema } = require("./schemas")
const HeroMedia = require('./models/HeroMedia');
const PartnerLogos = require('./models/PartnerLogos');
const { partnerLogosSchema } = require('./schemas');
const ExclusiveGallery = require('./models/ExclusiveGallery');
const { exclusiveGallerySchema } = require('./schemas');
const PartnerTierLimits = require('./models/PartnerTierLimits');
const { partnerTierLimitsSchema } = require('./schemas');
const ContactSettings = require('./models/ContactSettings');
const Testimonials = require('./models/Testimonials');
const AboutSettings = require('./models/AboutSettings');
const passport = require("passport");
const Airline = require('./models/Airline');
const Airport = require('./models/Airport');
const { DEFAULT_AIRLINES, EGYPTIAN_AIRPORTS } = require('./constants');
const CustomTripRequest = require('./models/CustomTripRequest');

// Admin logout route
route.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error("Admin logout error:", err);
            return res.redirect("/admin/dashboard");
        }
        req.flash("success", "تم تسجيل الخروج بنجاح!");
        res.redirect("/login");
    });
});

// Admin dashboard route
route.get("/dashboard", isAdmin, async (req, res) => {
    try {
        // Fetch all data server-side for security
        const [
            totalCards,
            totalUsers,
            totalReservations,
            activeUsers,
            totalPartners,
            verifiedPartners,
            pendingPartnerCards,
            users,
            reservations,
            cards,
            partnerBanners,
            heroMedia,
            sectionContents,
            pageContents,
            partnerLogos,
            exclusiveGallery,
            partnerTierLimits,
            contactSettings
        ] = await Promise.all([
            Card.countDocuments(),
            User.countDocuments(),
            Reserve.countDocuments(),
            User.countDocuments({ role: 'user' }),
            User.countDocuments({ role: 'partner' }),
            User.countDocuments({ role: 'partner', isVerified: true }),
            Card.countDocuments({ createdBy: 'partner', isApproved: false }),
            User.find({}, 'username phoneNumber phone_number role createdAt companyName companyCode companyRepresentative branches address1 address2 phoneNumbers companyDocs partnerPackage isVerified').sort({ createdAt: -1 }),
            Reserve.find({})
                .populate('user', 'username phone_number')
                .populate('card', 'code type')
                .sort({ createdAt: -1 }),
            Card.find({}, 'type code travel_date days nights rate offer_type createdBy isApproved partnerId displayOrder')
                .populate('partnerId', 'companyName username')
                .sort({ displayOrder: 1, travel_date: 1, createdAt: -1 }),
            PartnerBanner.find().sort({ priority: -1, createdAt: -1 }),
            HeroMedia.find({}).sort({ order: 1, createdAt: -1 }),
            SectionContent.find({}).sort({ sectionType: 1 }),
            PageContent.find({}).sort({ contentType: 1 }),
            PartnerLogos.findOne(),
            ExclusiveGallery.findOne(),
            PartnerTierLimits.getSingleton(),
            ContactSettings.getSingleton(),
            Airport.find({ isActive: true }).sort({ name: 1 }),
            Airline.find({ isActive: true }).sort({ name: 1 }),
            CustomTripRequest.find().sort({ createdAt: -1 }).limit(10)
        ]);

        // Auto-migrate admin users to have normalized role and full_admin_access permission
        const adminUsers = await User.find({ role: { $regex: /^admin$/i } });
        for (const admin of adminUsers) {
            const normalizedRole = (admin.role || '').toLowerCase();
            let shouldSave = false;

            if (admin.role !== normalizedRole) {
                admin.role = normalizedRole;
                shouldSave = true;
            }

            if (!admin.permissions || !admin.permissions.includes('full_admin_access')) {
                admin.permissions = admin.permissions || [];
                admin.permissions.push('full_admin_access');
                shouldSave = true;
            }

            if (shouldSave) {
                await admin.save();
            }
        }

        res.render("admin-dashboard", {
            stats: {
                totalCards,
                totalUsers,
                totalReservations,
                activeUsers,
                totalPartners,
                verifiedPartners,
                pendingPartnerCards
            },
            users,
            reservations,
            cards,
            partnerBanners,
            heroMedia,
            sectionContents,
            pageContents,
            partnerLogos: partnerLogos ? partnerLogos.images : [],
            exclusiveGallery: exclusiveGallery ? exclusiveGallery.cardIds : [],
            partnerTierLimits,
            contactSettings,
            airports,
            airlines,
            customTripRequests
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render("error", { 
            user: req.user,
            title: "خطأ في لوحة التحكم",
            errorCode: 500,
            message: "حدث خطأ أثناء تحميل لوحة التحكم. يرجى المحاولة مرة أخرى لاحقاً.",
            error: process.env.NODE_ENV === 'development' ? error : null
        });
    }
});

// Admin Access Page - Role-based dashboard
route.get("/access", hasAdminPortalAccess, async (req, res) => {
    try {
        // Permission translations for UI
        const permissionTranslations = {
            // Card Management
            'add_card': 'إضافة بطاقات',
            'edit_card': 'تعديل البطاقات', 
            'delete_card': 'حذف البطاقات',
            'approve_card': 'الموافقة على البطاقات',
            'view_all_cards': 'عرض جميع البطاقات',
            // User Management
            'view_users': 'عرض المستخدمين',
            'edit_users': 'تعديل المستخدمين',
            'delete_users': 'حذف المستخدمين',
            'manage_user_permissions': 'إدارة صلاحيات المستخدمين',
            // Partner Management
            'view_partners': 'عرض الشركاء',
            'verify_partners': 'تفعيل الشركاء',
            'suspend_partners': 'إيقاف الشركاء',
            'delete_partners': 'حذف الشركاء',
            'edit_partners': 'تعديل الشركاء',
            // Reservation Management
            'view_reservations': 'عرض الحجوزات',
            'verify_payments': 'تأكيد المدفوعات',
            'cancel_payments': 'إلغاء المدفوعات',
            'delete_reservations': 'حذف الحجوزات',
            // Content Management
            'manage_banners': 'إدارة الإعلانات',
            'manage_hero_media': 'إدارة وسائط الواجهة',
            'manage_section_content': 'إدارة أقسام الصفحة',
            'manage_page_content': 'إدارة نصوص الصفحات',
            'manage_partner_logos': 'إدارة شعارات الشركاء',
            'manage_exclusive_gallery': 'إدارة المعرض الحصري',
            'manage_testimonials': 'إدارة التقييمات',
            'manage_about_settings': 'إدارة صفحة من نحن',
            'manage_contact_settings': 'إدارة إعدادات التواصل',
            'manage_partner_tiers': 'إدارة مستويات الشركاء',
            // Analytics & Reports
            'view_analytics': 'عرض التحليلات',
            'view_dashboard_stats': 'عرض إحصائيات اللوحة',
            // System Administration
            'full_admin_access': 'صلاحيات المدير الكاملة'
        };

        // Get basic stats for the page
        const [
            totalCards,
            totalUsers,
            totalReservations,
            totalPartners
        ] = await Promise.all([
            Card.countDocuments(),
            User.countDocuments(),
            Reserve.countDocuments(),
            User.countDocuments({ role: 'partner' })
        ]);

        const stats = {
            totalCards,
            totalUsers,
            totalReservations,
            totalPartners
        };

        res.render("admin-access", {
            user: req.user,
            title: "لوحة التحكم",
            permissionTranslations,
            stats
        });
    } catch (error) {
        console.error('Admin access page error:', error);
        res.status(500).render("error", { 
            user: req.user,
            title: "خطأ في لوحة التحكم",
            errorCode: 500,
            message: "حدث خطأ أثناء تحميل لوحة التحكم. يرجى المحاولة مرة أخرى لاحقاً.",
            error: process.env.NODE_ENV === 'development' ? error : null
        });
    }
});

// ================= Airport Management =================
route.get("/airports", isAdmin, async (req, res) => {
    try {
        const airports = await Airport.find().sort({ name: 1 });
        res.render("admin-airports", { airports });
    } catch (error) {
        console.error('Error fetching airports:', error);
        res.redirect('/admin/dashboard?error=fetch-airports-failed');
    }
});

route.post("/airports/add", isAdmin, async (req, res) => {
    try {
        const { code, name, englishName, city } = req.body;
        await Airport.create({ code, name, englishName, city });
        res.redirect('/admin/airports?success=airport-added');
    } catch (error) {
        console.error('Error adding airport:', error);
        res.redirect('/admin/airports?error=add-airport-failed');
    }
});

route.post("/airports/edit/:id", isAdmin, async (req, res) => {
    try {
        const { code, name, englishName, city, isActive } = req.body;
        await Airport.findByIdAndUpdate(req.params.id, {
            code, name, englishName, city,
            isActive: isActive === 'on'
        });
        res.redirect('/admin/airports?success=airport-updated');
    } catch (error) {
        console.error('Error updating airport:', error);
        res.redirect('/admin/airports?error=update-airport-failed');
    }
});

route.post("/airports/delete/:id", isAdmin, async (req, res) => {
    try {
        await Airport.findByIdAndDelete(req.params.id);
        res.redirect('/admin/airports?success=airport-deleted');
    } catch (error) {
        console.error('Error deleting airport:', error);
        res.redirect('/admin/airports?error=delete-airport-failed');
    }
});

// ================= Airline Management =================
route.get("/airlines", isAdmin, async (req, res) => {
    try {
        const airlines = await Airline.find().sort({ name: 1 });
        res.render("admin-airlines", { airlines });
    } catch (error) {
        console.error('Error fetching airlines:', error);
        res.redirect('/admin/dashboard?error=fetch-airlines-failed');
    }
});

route.post("/airlines/add", isAdmin, async (req, res) => {
    try {
        const { name, englishName, code } = req.body;
        await Airline.create({ name, englishName, code });
        res.redirect('/admin/airlines?success=airline-added');
    } catch (error) {
        console.error('Error adding airline:', error);
        res.redirect('/admin/airlines?error=add-airline-failed');
    }
});

route.post("/airlines/edit/:id", isAdmin, async (req, res) => {
    try {
        const { name, englishName, code, isActive } = req.body;
        await Airline.findByIdAndUpdate(req.params.id, {
            name, englishName, code,
            isActive: isActive === 'on'
        });
        res.redirect('/admin/airlines?success=airline-updated');
    } catch (error) {
        console.error('Error updating airline:', error);
        res.redirect('/admin/airlines?error=update-airline-failed');
    }
});

route.post("/airlines/delete/:id", isAdmin, async (req, res) => {
    try {
        await Airline.findByIdAndDelete(req.params.id);
        res.redirect('/admin/airlines?success=airline-deleted');
    } catch (error) {
        console.error('Error deleting airline:', error);
        res.redirect('/admin/airlines?error=delete-airline-failed');
    }
});

// ================= Custom Trip Requests =================
route.get("/custom-trips", isAdmin, async (req, res) => {
    try {
        const requests = await CustomTripRequest.find()
            .populate('user', 'username phoneNumber')
            .sort({ createdAt: -1 });
        res.render("admin-custom-trips", { requests });
    } catch (error) {
        console.error('Error fetching custom trips:', error);
        res.redirect('/admin/dashboard?error=fetch-custom-trips-failed');
    }
});

route.post("/custom-trips/status/:id", isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await CustomTripRequest.findByIdAndUpdate(req.params.id, { status });
        res.redirect('/admin/custom-trips?success=status-updated');
    } catch (error) {
        console.error('Error updating custom trip status:', error);
        res.redirect('/admin/custom-trips?error=status-update-failed');
    }
});

// Update Contact Settings (WhatsApp, phone, email)
route.post('/contact-settings', isAdmin, async (req, res) => {
    try {
        const settings = await ContactSettings.getSingleton();
        const { whatsappNumber, phoneNumber, email } = req.body || {};

        // Basic normalization: trim and strip non-digits for phone fields; keep email as provided
        const cleanDigits = (v) => (v || '').toString().replace(/\D/g, '');
        if (typeof whatsappNumber !== 'undefined') settings.whatsappNumber = whatsappNumber.trim();
        if (typeof phoneNumber !== 'undefined') settings.phoneNumber = phoneNumber.trim();
        if (typeof email !== 'undefined') settings.email = (email || '').trim();

        // Optionally store cleaned numeric versions (keep original formatting as entered by admin)
        // settings.whatsappNumber = cleanDigits(whatsappNumber);
        // settings.phoneNumber = cleanDigits(phoneNumber);

        await settings.save();
        return res.redirect('/admin/dashboard?success=contact-settings-updated');
    } catch (err) {
        console.error('Failed to update contact settings:', err);
        return res.redirect('/admin/dashboard?error=contact-settings-failed');
    }
});

// ================= Testimonials (Reviews) Management =================
route.post('/testimonials/add', isAdmin, async (req, res) => {
    try {
        const { name = '', text = '', rating = '' } = req.body || {};
        const clean = (s) => (s || '').toString().trim();
        const review = {
            name: clean(name).slice(0, 100),
            text: clean(text).slice(0, 1000),
            rating: Math.max(1, Math.min(5, parseInt(rating, 10) || 5))
        };
        const doc = await Testimonials.getSingleton();
        doc.reviews.push(review);
        await doc.save();
        return res.redirect('/admin/dashboard?success=testimonial-added');
    } catch (err) {
        console.error('Failed to add testimonial:', err);
        return res.redirect('/admin/dashboard?error=testimonial-add-failed');
    }
});

route.post('/testimonials/delete/:index', isAdmin, async (req, res) => {
    try {
        const idx = parseInt(req.params.index, 10);
        const doc = await Testimonials.getSingleton();
        if (!isNaN(idx) && idx >= 0 && idx < doc.reviews.length) {
            doc.reviews.splice(idx, 1);
            await doc.save();
            return res.redirect('/admin/dashboard?success=testimonial-deleted');
        }
        return res.redirect('/admin/dashboard?error=invalid-testimonial-index');
    } catch (err) {
        console.error('Failed to delete testimonial:', err);
        return res.redirect('/admin/dashboard?error=testimonial-delete-failed');
    }
});

route.post('/testimonials/update/:index', isAdmin, async (req, res) => {
    try {
        const idx = parseInt(req.params.index, 10);
        const { name = '', text = '', rating = '' } = req.body || {};
        const doc = await Testimonials.getSingleton();
        if (isNaN(idx) || idx < 0 || idx >= doc.reviews.length) {
            return res.redirect('/admin/dashboard?error=invalid-testimonial-index');
        }
        const clean = (s) => (s || '').toString().trim();
        doc.reviews[idx].name = clean(name).slice(0, 100);
        doc.reviews[idx].text = clean(text).slice(0, 1000);
        doc.reviews[idx].rating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));
        await doc.save();
        return res.redirect('/admin/dashboard?success=testimonial-updated');
    } catch (err) {
        console.error('Failed to update testimonial:', err);
        return res.redirect('/admin/dashboard?error=testimonial-update-failed');
    }
});

// ================= About Image Management =================
route.post('/about-settings', isAdmin, upload.single('aboutImage'), async (req, res) => {
    try {
        const doc = await AboutSettings.getSingleton();
        // Prefer uploaded file if present; otherwise fallback to text URL
        if (req.file && req.file.path) {
            doc.aboutImageUrl = req.file.path; // Cloudinary URL from multer-storage-cloudinary
        } else if (req.body && typeof req.body.aboutImageUrl !== 'undefined') {
            doc.aboutImageUrl = (req.body.aboutImageUrl || '').toString().trim();
        }
        await doc.save();
        return res.redirect('/admin/dashboard?success=about-updated');
    } catch (err) {
        console.error('Failed to update about image:', err);
        return res.redirect('/admin/dashboard?error=about-update-failed');
    }
});

// POST route for creating a card
route.post("/post_card", hasPermission('add_card'), upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 10 }
]), async (req, res) => {
    // Set timeout for this operation
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            return res.status(408).render("error", {
                user: req.user,
                title: "انتهت مهلة الطلب",
                errorCode: 408,
                message: "استغرق الطلب وقتاً أطول من المتوقع. يرجى المحاولة مرة أخرى.",
                error: null
            });
        }
    }, 30000); // 30 seconds timeout

    try {
        // Parse arrays from form data if they come as strings
        if (typeof req.body.included_services === 'string' && req.body.included_services.trim()) {
            try {
                req.body.included_services = JSON.parse(req.body.included_services);
            } catch (e) {
                return res.status(400).render("error", {
                    user: req.user,
                    title: "خطأ في تنسيق البيانات",
                    errorCode: 400,
                    message: "تنسيق JSON غير صحيح للخدمات المشمولة",
                    error: null
                });
            }
        }
        
        if (typeof req.body.not_included_services === 'string' && req.body.not_included_services.trim()) {
            try {
                req.body.not_included_services = JSON.parse(req.body.not_included_services);
            } catch (e) {
                return res.status(400).render("error", {
                    user: req.user,
                    title: "خطأ في تنسيق البيانات",
                    errorCode: 400,
                    message: "تنسيق JSON غير صحيح للخدمات غير المشمولة",
                    error: null
                });
            }
        }
        
        if (typeof req.body.notes === 'string' && req.body.notes.trim()) {
            try {
                req.body.notes = JSON.parse(req.body.notes);
            } catch (e) {
                return res.status(400).render("error", {
                    user: req.user,
                    title: "خطأ في تنسيق البيانات",
                    errorCode: 400,
                    message: "تنسيق JSON غير صحيح للملاحظات",
                    error: null
                });
            }
        }
        
        if (typeof req.body.cancelling_rules === 'string' && req.body.cancelling_rules.trim()) {
            try {
                req.body.cancelling_rules = JSON.parse(req.body.cancelling_rules);
            } catch (e) {
                return res.status(400).render("error", {
                    user: req.user,
                    title: "خطأ في تنسيق البيانات",
                    errorCode: 400,
                    message: "تنسيق JSON غير صحيح لقواعد الإلغاء",
                    error: null
                });
            }
        }
        
        if (typeof req.body.plane === 'string' && req.body.plane.trim()) {
            try {
                req.body.plane = JSON.parse(req.body.plane);
            } catch (e) {
                return res.status(400).render("error", {
                    user: req.user,
                    title: "خطأ في تنسيق البيانات",
                    errorCode: 400,
                    message: "تنسيق JSON غير صحيح لبيانات الطيران والفنادق",
                    error: null
                });
            }
        }
        
        // Validate the data using schema
        const { error, value } = cardCreationSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });
        
        if (error) {
            const errorMessages = error.details.map(detail => detail.message);
            return res.status(400).render("error", {
                user: req.user,
                title: "خطأ في التحقق من البيانات",
                errorCode: 400,
                message: "فشل في التحقق من صحة البيانات: " + errorMessages.join(', '),
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
        
        const cardData = value;
        
        // Handle thumbnail upload
        if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
            cardData.thumbnail = req.files.thumbnail[0].path;
        } else {
            return res.status(400).render("error", {
                user: req.user,
                title: "خطأ في رفع الصورة",
                errorCode: 400,
                message: "الصورة الرئيسية مطلوبة",
                error: null
            });
        }
        
        // Handle multiple images upload
        if (req.files && req.files.images) {
            cardData.images = req.files.images.map(file => file.path);
        } else {
            return res.status(400).render("error", {
                user: req.user,
                title: "خطأ في رفع الصور",
                errorCode: 400,
                message: "صورة واحدة على الأقل مطلوبة",
                error: null
            });
        }
        
        cardData.lowest_price = Math.min(...cardData.plane.housingOptions.map(option => option.price));
        const newCard = new Card(cardData);
        await newCard.save();
        
        // Clear timeout
        clearTimeout(timeout);
        
        // Redirect to dashboard with success message
        res.redirect("/admin/dashboard?success=card-created");
    } catch (error) {
        // Clear timeout
        clearTimeout(timeout);
        
        console.error("Error creating card:", error);
        
        // Handle specific error types
        if (error.name === 'ValidationError') {
            return res.status(400).render("error", {
                user: req.user,
                title: "خطأ في التحقق من البيانات",
                errorCode: 400,
                message: "البيانات المدخلة غير صحيحة: " + Object.values(error.errors).map(e => e.message).join(', '),
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
        
        if (error.code === 11000) {
            return res.status(409).render("error", {
                user: req.user,
                title: "بيانات مكررة",
                errorCode: 409,
                message: "كود البطاقة موجود مسبقاً. يرجى استخدام كود مختلف.",
                error: null
            });
        }
        
        res.status(500).render("error", {
            user: req.user,
            title: "خطأ في إنشاء البطاقة",
            errorCode: 500,
            message: "حدث خطأ أثناء إنشاء البطاقة. يرجى المحاولة مرة أخرى لاحقاً.",
            error: process.env.NODE_ENV === 'development' ? error : null
        });
    }
});

// Partner Banner form submission route
route.post("/partner-banner", isAdmin, upload.single('backgroundImage'), validateSchema(partnerBannerSchema, 'body', { failureRedirect: '/admin/dashboard' }), async (req, res) => {
    // Set timeout for this operation
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            return res.status(408).json({
                success: false,
                message: "انتهت مهلة الطلب"
            });
        }
    }, 10000); // 10 seconds timeout

    const requestLogContext = {
        timestamp: new Date().toISOString(),
        userId: req.user?._id,
        username: req.user?.username,
        hasFile: Boolean(req.file),
        fileName: req.file?.originalname,
        bodyKeys: Object.keys(req.body || {})
    };
    console.log('[PartnerBanner] Upload attempt received', requestLogContext);

    try {
        const bannerData = req.body;
        
        // Handle background image upload if provided
        if (req.file) {
            bannerData.backgroundImage = req.file.path; // Cloudinary path
        }
        
        // Create new banner (don't deactivate existing ones - support multiple banners)
        const newBanner = new PartnerBanner(bannerData);
        await newBanner.save();

        console.log('[PartnerBanner] Upload succeeded', {
            ...requestLogContext,
            hasFile: Boolean(req.file),
            bannerId: newBanner._id,
            storagePath: req.file?.path || bannerData.backgroundImage || null
        });
        
        // Clear timeout
        clearTimeout(timeout);
        
        res.redirect("/admin/dashboard?success=partner-banner-created");
    } catch (error) {
        // Clear timeout
        clearTimeout(timeout);
        
        console.error('[PartnerBanner] Upload failed', {
            ...requestLogContext,
            errorMessage: error?.message,
            stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
        res.redirect("/admin/dashboard?error=partner-banner-failed");
    }
});

// Toggle banner active status
route.post("/partner-banner/toggle/:id", isAdmin, async (req, res) => {
    try {
        const banner = await PartnerBanner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "البانر غير موجود"
            });
        }
        
        banner.isActive = !banner.isActive;
        await banner.save();
        
        res.json({
            success: true,
            message: `تم ${banner.isActive ? 'تفعيل' : 'إلغاء تفعيل'} البانر بنجاح`,
            isActive: banner.isActive
        });
    } catch (error) {
        console.error('Banner toggle error:', error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء تعديل حالة البانر"
        });
    }
});

// Delete banner route
route.delete("/partner-banner/:id", isAdmin, async (req, res) => {
    try {
        const banner = await PartnerBanner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "البانر غير موجود"
            });
        }
        
        await PartnerBanner.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: "تم حذف البانر بنجاح"
        });
    } catch (error) {
        console.error("Error deleting banner:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء حذف البانر"
        });
    }
});

// GET route for editing a card
route.get("/edit-card/:id", hasPermission('edit_card'), async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);
        if (!card) {
            return res.status(404).render("error", {
                user: req.user,
                title: "البطاقة غير موجودة",
                errorCode: 404,
                message: "البطاقة المطلوبة غير موجودة",
                error: null
            });
        }
        
        res.render("admin-edit-card", { card });
    } catch (error) {
        console.error('Error fetching card for edit:', error);
        res.status(500).render("error", {
            user: req.user,
            title: "خطأ في تحميل البطاقة",
            errorCode: 500,
            message: "حدث خطأ أثناء تحميل بيانات البطاقة",
            error: process.env.NODE_ENV === 'development' ? error : null
        });
    }
});

// PUT route for updating a card
route.post("/edit-card/:id", hasPermission('edit_card'), upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 10 }
]), async (req, res) => {
    // Set timeout for this operation
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            return res.status(408).render("error", {
                user: req.user,
                title: "انتهت مهلة الطلب",
                errorCode: 408,
                message: "استغرق تحديث البطاقة وقتاً أطول من المتوقع. يرجى المحاولة مرة أخرى.",
                error: null
            });
        }
    }, 30000); // 30 seconds timeout

    try {
        // Parse arrays from form data if they come as strings
        if (typeof req.body.included_services === 'string' && req.body.included_services.trim()) {
            try {
                req.body.included_services = JSON.parse(req.body.included_services);
            } catch (e) {
                return res.status(400).render("error", {
                    user: req.user,
                    title: "خطأ في تنسيق البيانات",
                    errorCode: 400,
                    message: "تنسيق JSON غير صحيح للخدمات المشمولة",
                    error: null
                });
            }
        }
        
        if (typeof req.body.not_included_services === 'string' && req.body.not_included_services.trim()) {
            try {
                req.body.not_included_services = JSON.parse(req.body.not_included_services);
            } catch (e) {
                return res.status(400).render("error", {
                    user: req.user,
                    title: "خطأ في تنسيق البيانات",
                    errorCode: 400,
                    message: "تنسيق JSON غير صحيح للخدمات غير المشمولة",
                    error: null
                });
            }
        }
        
        if (typeof req.body.notes === 'string' && req.body.notes.trim()) {
            try {
                req.body.notes = JSON.parse(req.body.notes);
            } catch (e) {
                return res.status(400).render("error", {
                    user: req.user,
                    title: "خطأ في تنسيق البيانات",
                    errorCode: 400,
                    message: "تنسيق JSON غير صحيح للملاحظات",
                    error: null
                });
            }
        }
        
        if (typeof req.body.cancelling_rules === 'string' && req.body.cancelling_rules.trim()) {
            try {
                req.body.cancelling_rules = JSON.parse(req.body.cancelling_rules);
            } catch (e) {
                return res.status(400).render("error", {
                    user: req.user,
                    title: "خطأ في تنسيق البيانات",
                    errorCode: 400,
                    message: "تنسيق JSON غير صحيح لقواعد الإلغاء",
                    error: null
                });
            }
        }
        
        if (typeof req.body.plane === 'string' && req.body.plane.trim()) {
            try {
                req.body.plane = JSON.parse(req.body.plane);
            } catch (e) {
                return res.status(400).render("error", {
                    user: req.user,
                    title: "خطأ في تنسيق البيانات",
                    errorCode: 400,
                    message: "تنسيق JSON غير صحيح لبيانات الطيران والفنادق",
                    error: null
                });
            }
        }
        
        // Validate the data using schema
        const { error, value } = cardCreationSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });
        
        if (error) {
            const errorMessages = error.details.map(detail => detail.message);
            return res.status(400).render("error", {
                user: req.user,
                title: "خطأ في التحقق من البيانات",
                errorCode: 400,
                message: "فشل في التحقق من صحة البيانات: " + errorMessages.join(', '),
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
        
        const cardData = value;
        
        // Find existing card
        const existingCard = await Card.findById(req.params.id);
        if (!existingCard) {
            return res.status(404).render("error", {
                user: req.user,
                title: "البطاقة غير موجودة",
                errorCode: 404,
                message: "البطاقة المطلوبة غير موجودة",
                error: null
            });
        }
        
        // Handle thumbnail upload
        if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
            cardData.thumbnail = req.files.thumbnail[0].path;
        } else {
            // Keep existing thumbnail if no new one uploaded
            cardData.thumbnail = existingCard.thumbnail;
        }
        
        // Handle multiple images upload
        if (req.files && req.files.images && req.files.images.length > 0) {
            cardData.images = req.files.images.map(file => file.path);
        } else {
            // Keep existing images if no new ones uploaded
            cardData.images = existingCard.images;
        }
        
        cardData.lowest_price = Math.min(...cardData.plane.housingOptions.map(option => option.price));
        
        // Update the card
        await Card.findByIdAndUpdate(req.params.id, cardData, { new: true });
        
        // Clear timeout
        clearTimeout(timeout);
        
        // Redirect to dashboard with success message
        res.redirect("/admin/dashboard?success=card-updated");
    } catch (error) {
        // Clear timeout
        clearTimeout(timeout);
        
        console.error("Error updating card:", error);
        
        // Handle specific error types
        if (error.name === 'ValidationError') {
            return res.status(400).render("error", {
                user: req.user,
                title: "خطأ في التحقق من البيانات",
                errorCode: 400,
                message: "البيانات المدخلة غير صحيحة: " + Object.values(error.errors).map(e => e.message).join(', '),
                error: process.env.NODE_ENV === 'development' ? error : null
            });
        }
        
        if (error.code === 11000) {
            return res.status(409).render("error", {
                user: req.user,
                title: "بيانات مكررة",
                errorCode: 409,
                message: "كود البطاقة موجود مسبقاً. يرجى استخدام كود مختلف.",
                error: null
            });
        }
        
        res.status(500).render("error", {
            user: req.user,
            title: "خطأ في تحديث البطاقة",
            errorCode: 500,
            message: "حدث خطأ أثناء تحديث البطاقة. يرجى المحاولة مرة أخرى لاحقاً.",
            error: process.env.NODE_ENV === 'development' ? error : null
        });
    }
});

// DELETE route for deleting a card
route.delete("/delete-card/:id", hasPermission('delete_card'), async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: "البطاقة غير موجودة"
            });
        }
        
        await Card.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: "تم حذف البطاقة بنجاح"
        });
    } catch (error) {
        console.error("Error deleting card:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء حذف البطاقة"
        });
    }
});

// Payment verification routes
route.post("/reservation/verify-payment/:id", isAdmin, async (req, res) => {
    try {
        const reservation = await Reserve.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "الحجز غير موجود"
            });
        }
        
        reservation.paymentStatus = 'paid';
        await reservation.save();
        
        res.json({
            success: true,
            message: "تم تأكيد الدفع بنجاح"
        });
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء تأكيد الدفع"
        });
    }
});

route.post("/reservation/cancel-payment/:id", isAdmin, async (req, res) => {
    try {
        const reservation = await Reserve.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "الحجز غير موجود"
            });
        }
        
        reservation.paymentStatus = 'pending';
        await reservation.save();
        
        res.json({
            success: true,
            message: "تم إلغاء تأكيد الدفع بنجاح"
        });
    } catch (error) {
        console.error("Error canceling payment:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء إلغاء تأكيد الدفع"
        });
    }
});

route.delete("/reservation/delete/:id", isAdmin, async (req, res) => {
    try {
        const reservation = await Reserve.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "الحجز غير موجود"
            });
        }
        
        await Reserve.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: "تم حذف الحجز بنجاح"
        });
    } catch (error) {
        console.error("Error deleting reservation:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء حذف الحجز"
        });
    }
});

// Partner management routes
route.post("/partner/verify/:id", isAdmin, async (req, res) => {
    try {
        const partner = await User.findById(req.params.id);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "الشريك غير موجود"
            });
        }
        
        if (partner.role !== 'partner') {
            return res.status(400).json({
                success: false,
                message: "المستخدم ليس شريكاً"
            });
        }
        
        partner.isVerified = true;
        await partner.save();
        
        res.json({
            success: true,
            message: "تم تفعيل الشريك بنجاح"
        });
    } catch (error) {
        console.error("Error verifying partner:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء تفعيل الشريك"
        });
    }
});

route.post("/partner/suspend/:id", isAdmin, async (req, res) => {
    try {
        const partner = await User.findById(req.params.id);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "الشريك غير موجود"
            });
        }
        
        if (partner.role !== 'partner') {
            return res.status(400).json({
                success: false,
                message: "المستخدم ليس شريكاً"
            });
        }
        
        partner.isVerified = false;
        await partner.save();
        
        res.json({
            success: true,
            message: "تم إيقاف الشريك بنجاح"
        });
    } catch (error) {
        console.error("Error suspending partner:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء إيقاف الشريك"
        });
    }
});

route.delete("/partner/delete/:id", isAdmin, async (req, res) => {
    try {
        const partner = await User.findById(req.params.id);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "الشريك غير موجود"
            });
        }
        
        if (partner.role !== 'partner') {
            return res.status(400).json({
                success: false,
                message: "المستخدم ليس شريكاً"
            });
        }
        
        // Note: In a production environment, you might want to:
        // 1. Soft delete instead of hard delete
        // 2. Archive partner's trips and bookings
        // 3. Handle existing reservations
        // 4. Notify customers of partner deletion
        
        await User.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: "تم حذف الشريك بنجاح"
        });
    } catch (error) {
        console.error("Error deleting partner:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء حذف الشريك"
        });
    }
});

route.get("/partner/details/:id", isAdmin, async (req, res) => {
    try {
        const partner = await User.findById(req.params.id);
        if (!partner || partner.role !== 'partner') {
            return res.status(404).render("error", {
                user: req.user,
                title: "الشريك غير موجود",
                errorCode: 404,
                message: "الشريك المطلوب غير موجود أو تم حذفه"
            });
        }

        // Get partner's posted cards
        const partnerCards = await Card.find({ partnerId: partner._id })
            .sort({ createdAt: -1 });

        // Get partner's reservations
        const partnerReservations = await Reserve.find({ 
            card: { $in: partnerCards.map(card => card._id) }
        })
            .populate('user', 'username phoneNumber')
            .populate('card', 'code title type')
            .sort({ createdAt: -1 });

        // Calculate statistics
        const stats = {
            totalCards: partnerCards.length,
            approvedCards: partnerCards.filter(card => card.isApproved).length,
            pendingCards: partnerCards.filter(card => !card.isApproved).length,
            totalReservations: partnerReservations.length,
            totalRevenue: partnerReservations
                .filter(res => res.paymentStatus === 'paid')
                .reduce((sum, res) => sum + (res.totalAmount || 0), 0),
            activeCards: partnerCards.filter(card => card.isApproved && new Date(card.travel_date) > new Date()).length
        };

        res.render("admin-partner-details", {
            partner,
            partnerCards,
            partnerReservations,
            stats,
            user: req.user
        });
    } catch (error) {
        console.error("Error getting partner details:", error);
        res.status(500).render("error", {
            user: req.user,
            title: "خطأ في تحميل بيانات الشريك",
            errorCode: 500,
            message: "حدث خطأ أثناء تحميل بيانات الشريك",
            error: process.env.NODE_ENV === 'development' ? error : null
        });
    }
});

// Edit partner route
route.get("/partner/edit/:id", isAdmin, async (req, res) => {
    try {
        const partner = await User.findById(req.params.id);
        if (!partner || partner.role !== 'partner') {
            return res.status(404).render("error", {
                user: req.user,
                title: "الشريك غير موجود",
                errorCode: 404,
                message: "الشريك المطلوب غير موجود أو تم حذفه"
            });
        }

        res.render("admin-partner-edit", {
            partner,
            user: req.user
        });
    } catch (error) {
        console.error("Error fetching partner for edit:", error);
        res.status(500).render("error", {
            user: req.user,
            title: "خطأ في تحميل بيانات الشريك",
            errorCode: 500,
            message: "حدث خطأ أثناء تحميل بيانات الشريك للتعديل"
        });
    }
});

// Update partner route
route.post("/partner/edit/:id", isAdmin, upload.array('companyDocs', 10), async (req, res) => {
    try {
        const partner = await User.findById(req.params.id);
        if (!partner || partner.role !== 'partner') {
            return res.status(404).json({
                success: false,
                message: "الشريك غير موجود"
            });
        }

        // Update partner data
        const updateData = {
            username: req.body.username,
            companyName: req.body.companyName,
            companyCode: req.body.companyCode,
            companyRepresentative: req.body.companyRepresentative,
            partnerPackage: req.body.partnerPackage,
            branches: req.body.branches,
            address1: req.body.address1,
            address2: req.body.address2,
            phoneNumbers: req.body.phoneNumbers
        };

        // Handle document uploads
        if (req.files && req.files.length > 0) {
            const newDocs = req.files.map(file => file.path);
            updateData.companyDocs = req.body.keepExistingDocs === 'true' 
                ? [...(partner.companyDocs || []), ...newDocs]
                : newDocs;
        }

        await User.findByIdAndUpdate(req.params.id, updateData);

        res.json({
            success: true,
            message: "تم تحديث بيانات الشريك بنجاح"
        });
    } catch (error) {
        console.error("Error updating partner:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء تحديث بيانات الشريك"
        });
    }
});

// Partner card approval routes
route.post("/partner-card/approve/:id", hasPermission('approve_card'), async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: "البطاقة غير موجودة"
            });
        }
        
        if (card.createdBy !== 'partner') {
            return res.status(400).json({
                success: false,
                message: "هذه البطاقة ليست من إنشاء شريك"
            });
        }
        
        card.isApproved = true;
        card.approvedBy = req.user._id;
        card.approvedAt = new Date();
        await card.save();
        
        res.json({
            success: true,
            message: "تم اعتماد البطاقة بنجاح"
        });
    } catch (error) {
        console.error("Error approving partner card:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء اعتماد البطاقة"
        });
    }
});

route.post("/partner-card/reject/:id", isAdmin, async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: "البطاقة غير موجودة"
            });
        }
        
        if (card.createdBy !== 'partner') {
            return res.status(400).json({
                success: false,
                message: "هذه البطاقة ليست من إنشاء شريك"
            });
        }
        
        // Delete the rejected card
        await Card.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: "تم رفض البطاقة وحذفها"
        });
    } catch (error) {
        console.error("Error rejecting partner card:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء رفض البطاقة"
        });
    }
});

// Revoke approval for partner card
route.post("/partner-card/revoke/:id", isAdmin, async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);
        
        if (!card) {
            return res.status(404).json({
                success: false,
                message: "البطاقة غير موجودة"
            });
        }
        
        if (card.createdBy !== 'partner') {
            return res.status(400).json({
                success: false,
                message: "هذه البطاقة ليست من إنشاء شريك"
            });
        }
        
        // Revoke approval
        card.isApproved = false;
        card.approvedBy = null;
        card.approvedAt = null;
        await card.save();
        
        res.json({
            success: true,
            message: "تم إلغاء اعتماد البطاقة"
        });
    } catch (error) {
        console.error("Error revoking partner card:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء إلغاء اعتماد البطاقة"
        });
    }
});

// Delete partner card
route.delete("/partner-card/delete/:id", isAdmin, async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);
        
        if (!card) {
            return res.status(404).json({
                success: false,
                message: "البطاقة غير موجودة"
            });
        }
        
        if (card.createdBy !== 'partner') {
            return res.status(400).json({
                success: false,
                message: "هذه البطاقة ليست من إنشاء شريك"
            });
        }
        
        // Delete the card
        await Card.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: "تم حذف البطاقة بنجاح"
        });
    } catch (error) {
        console.error("Error deleting partner card:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء حذف البطاقة"
        });
    }
});

// ================= Hero Media Management =================
// Upload hero media (image or video) - expects fields: type (image|video), url (if external) OR file upload
route.post('/hero-media', isAdmin, upload.single('file'), async (req, res) => {
    try {
        let { type, url, order } = req.body;
        let mediaUrl = url && url.trim() !== '' ? url.trim() : null;

        if (req.file) {
            // Cloudinary response is attached to file
            // Some multer-storage-cloudinary versions put result in file.path (public_id) and file.filename
            // and provide file.originalname, file.mimetype, file.size
            // We can build the delivery URL from file.path if secure_url not present
            const isVideo = req.file.mimetype && req.file.mimetype.startsWith('video/');
            type = isVideo ? 'video' : 'image';
            // Prefer file.path when storage sets it as the full URL; fallback constructing
            mediaUrl = req.file.path || req.file.secure_url || req.file.url || mediaUrl;
        }

        if (!type || !['image','video'].includes(type)) {
            return res.status(400).json({ success:false, message:'نوع الوسائط غير صالح' });
        }
        if (!mediaUrl) {
            return res.status(400).json({ success:false, message:'يجب توفير رابط أو ملف للوسائط' });
        }

        const count = await HeroMedia.countDocuments();
        const hero = new HeroMedia({
            type,
            url: mediaUrl,
            order: typeof order !== 'undefined' && order !== '' ? parseInt(order) : count,
            isActive: true
        });
        await hero.save();
        res.redirect('/admin/dashboard?success=hero-media-created');
    } catch (err) {
        console.error('Hero media upload error:', err);
        res.redirect('/admin/dashboard?error=hero-media-failed');
    }
});

// Toggle active state
route.post('/hero-media/toggle/:id', isAdmin, async (req, res) => {
    try {
        const item = await HeroMedia.findById(req.params.id);
        if (!item) return res.status(404).json({ success:false, message:'العنصر غير موجود'});
        item.isActive = !item.isActive;
        await item.save();
        res.json({ success:true, isActive:item.isActive });
    } catch (err) {
        console.error('Hero media toggle error:', err);
        res.status(500).json({ success:false, message:'خطأ أثناء التعديل'});
    }
});

// Reorder hero media (simple swap or set order) expects body: order (Number)
route.post('/hero-media/order/:id', isAdmin, async (req, res) => {
    try {
        const { order } = req.body;
        if (order === undefined) return res.status(400).json({ success:false, message:'الترتيب مطلوب'});
        const item = await HeroMedia.findByIdAndUpdate(req.params.id, { order: parseInt(order) }, { new:true });
        if (!item) return res.status(404).json({ success:false, message:'العنصر غير موجود'});
        res.json({ success:true, item });
    } catch (err) {
        console.error('Hero media order error:', err);
        res.status(500).json({ success:false, message:'خطأ أثناء تعديل الترتيب'});
    }
});

// Delete hero media
route.delete('/hero-media/:id', isAdmin, async (req, res) => {
    try {
        const item = await HeroMedia.findById(req.params.id);
        if (!item) return res.status(404).json({ success:false, message:'العنصر غير موجود'});
        await HeroMedia.findByIdAndDelete(req.params.id);
        res.json({ success:true, message:'تم الحذف بنجاح'});
    } catch (err) {
        console.error('Hero media delete error:', err);
        res.status(500).json({ success:false, message:'خطأ أثناء الحذف'});
    }
});

// ================= Section Content Management =================
// Update section content
route.post('/section-content/:id', isAdmin, async (req, res) => {
    try {
        const { title, description, isActive } = req.body;
        
        // Validate input
        if (!title || !description) {
            return res.redirect('/admin/dashboard?error=section-missing-fields');
        }
        
        if (title.length > 200) {
            return res.redirect('/admin/dashboard?error=section-title-too-long');
        }
        
        if (description.length > 500) {
            return res.redirect('/admin/dashboard?error=section-description-too-long');
        }
        
        // Update section
        const updatedSection = await SectionContent.findByIdAndUpdate(
            req.params.id,
            {
                title: title.trim(),
                description: description.trim(),
                isActive: Boolean(isActive)
            },
            { new: true, runValidators: true }
        );
        
        if (!updatedSection) {
            return res.redirect('/admin/dashboard?error=section-not-found');
        }
        
        console.log('Section content updated:', updatedSection.sectionType);
        res.redirect('/admin/dashboard?success=section-updated');
        
    } catch (error) {
        console.error('Section content update error:', error);
        res.redirect('/admin/dashboard?error=section-update-failed');
    }
});

// ================= Page Content Management =================
// Update page content
route.post('/page-content/:id', isAdmin, async (req, res) => {
    try {
        const { content, isActive } = req.body;
        const contentLines = req.body.contentLines;

        const pageContent = await PageContent.findById(req.params.id);
        if (!pageContent) {
            return res.redirect('/admin/dashboard?error=content-not-found');
        }

        const isHeroDescription = pageContent.contentType === 'hero_description';

        let normalizedContent = typeof content === 'string' ? content : '';

        if (isHeroDescription) {
            let lines = [];
            if (Array.isArray(contentLines)) {
                lines = contentLines;
            } else if (typeof contentLines === 'string') {
                lines = [contentLines];
            } else if (normalizedContent) {
                lines = normalizedContent.split(/\r?\n/);
            }

            normalizedContent = lines
                .map((line) => (line || '').toString().trim())
                .filter((line) => line.length > 0)
                .join('\n');
        }

        normalizedContent = (normalizedContent || '').trim();

        if (!normalizedContent) {
            return res.redirect('/admin/dashboard?error=content-missing');
        }

        if (normalizedContent.length > 1000) {
            return res.redirect('/admin/dashboard?error=content-too-long');
        }

        pageContent.content = normalizedContent;
        pageContent.isActive = Boolean(isActive);
        await pageContent.save();

        console.log('Page content updated:', pageContent.contentType);
        res.redirect('/admin/dashboard?success=content-updated');
    } catch (error) {
        console.error('Page content update error:', error);
        res.redirect('/admin/dashboard?error=content-update-failed');
    }
});

// GET route for editing partner logos
route.get('/partner-logos', isAdmin, async (req, res) => {
    let logosDoc = await PartnerLogos.findOne();
    if (!logosDoc) {
        logosDoc = new PartnerLogos({ images: [ '', '', '', '' ] });
        await logosDoc.save();
    }
    res.render('admin-partner-logos', { logos: logosDoc.images });
});

// POST route for updating partner logos
route.post('/partner-logos', isAdmin, upload.array('images', 20), async (req, res) => {
    try {
        // Get existing logos document or create default
        let logosDoc = await PartnerLogos.findOne();
        if (!logosDoc) {
            logosDoc = new PartnerLogos({ images: [] });
            await logosDoc.save();
        }

        // Check if this is an add operation or replace operation
        const operation = req.body.operation || 'add';
        let updatedImages = [];

        if (operation === 'replace') {
            // Replace all images with new uploads
            if (req.files && req.files.length > 0) {
                updatedImages = req.files.map(file => file.path);
            }
        } else {
            // Add new images to existing ones
            updatedImages = [...logosDoc.images];
            if (req.files && req.files.length > 0) {
                const newImages = req.files.map(file => file.path);
                updatedImages.push(...newImages);
            }
        }

        // Filter out empty strings
        updatedImages = updatedImages.filter(img => img && img.trim() !== '');

        // Validate the updated images array
        if (updatedImages.length === 0) {
            return res.redirect('/admin/dashboard?error=partner-logos-empty');
        }

        const { error } = partnerLogosSchema.validate({ images: updatedImages });
        if (error) {
            return res.redirect('/admin/dashboard?error=partner-logos-validation');
        }

        // Update the document
        logosDoc.images = updatedImages;
        await logosDoc.save();
        
        res.redirect('/admin/dashboard?success=partner-logos-updated');
    } catch (err) {
        console.error('Error updating partner logos:', err);
        res.redirect('/admin/dashboard?error=partner-logos-failed');
    }
});

// DELETE route for removing individual partner logo
route.delete('/partner-logos/:index', isAdmin, async (req, res) => {
    try {
        const logosDoc = await PartnerLogos.findOne();
        if (!logosDoc) {
            return res.json({ success: false, message: 'لا توجد شعارات مسجلة' });
        }

        const index = parseInt(req.params.index);
        if (index < 0 || index >= logosDoc.images.length) {
            return res.json({ success: false, message: 'فهرس غير صحيح' });
        }

        // Remove the logo at the specified index
        logosDoc.images.splice(index, 1);
        await logosDoc.save();

        res.json({ 
            success: true, 
            message: 'تم حذف الشعار بنجاح',
            remainingCount: logosDoc.images.length 
        });
    } catch (err) {
        console.error('Error deleting partner logo:', err);
        res.json({ success: false, message: 'حدث خطأ أثناء حذف الشعار' });
    }
});

// GET route for editing exclusive gallery
route.get('/exclusive-gallery', isAdmin, async (req, res) => {
  const galleryDoc = await ExclusiveGallery.findOne() || { cardIds: [] };
  const allCards = await Card.find({}, 'title code');
  res.render('admin-exclusive-gallery', { gallery: galleryDoc.cardIds, allCards });
});

// POST route for updating exclusive gallery
route.post('/exclusive-gallery', isAdmin, async (req, res) => {
  let cardIds = req.body.cardIds;
  if (!Array.isArray(cardIds)) cardIds = [cardIds];
  // Validate
  const { error } = exclusiveGallerySchema.validate({ cardIds });
  if (error) {
    const allCards = await Card.find({}, 'title code');
    return res.status(400).render('admin-exclusive-gallery', { gallery: cardIds, allCards, error: error.details });
  }
  let galleryDoc = await ExclusiveGallery.findOne();
  if (!galleryDoc) {
    galleryDoc = new ExclusiveGallery({ cardIds });
  } else {
    galleryDoc.cardIds = cardIds;
  }
  await galleryDoc.save();
  res.redirect('/admin/dashboard?success=exclusive-gallery-updated');
});

// Partner tier limits management
route.post('/partner-tier-limits', isAdmin, async (req, res) => {
  try {
    // Validate the request data
    const { error, value } = partnerTierLimitsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data provided',
        details: error.details
      });
    }

    // Get the singleton document and update it
    let tierLimits = await PartnerTierLimits.getSingleton();
    tierLimits.basic = value.basic;
    tierLimits.professional = value.professional;
    tierLimits.premium = value.premium;
    
    await tierLimits.save();
    
    res.redirect('/admin/dashboard?success=partner-tier-limits-updated');
  } catch (error) {
    console.error('Partner tier limits update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update partner tier limits'
    });
  }
});

// ================= User Management Routes =================
// Get user details
route.get("/user/details/:id", hasPermission('view_users'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).render("error", {
                user: req.user,
                title: "المستخدم غير موجود",
                errorCode: 404,
                message: "المستخدم المطلوب غير موجود",
                error: null
            });
        }

        // Get user's reservations
        const userReservations = await Reserve.find({ user: user._id })
            .populate('card', 'code title type travel_date days nights rate')
            .sort({ createdAt: -1 });

        // Get user's created cards if they are a partner
        let userCards = [];
        if (user.role === 'partner') {
            userCards = await Card.find({ partnerId: user._id })
                .sort({ createdAt: -1 });
        }

        // Calculate statistics
        const stats = {
            totalReservations: userReservations.length,
            paidReservations: userReservations.filter(res => res.paymentStatus === 'paid').length,
            pendingReservations: userReservations.filter(res => res.paymentStatus === 'pending').length,
            cancelledReservations: userReservations.filter(res => res.paymentStatus === 'cancelled').length,
            totalSpent: userReservations
                .filter(res => res.paymentStatus === 'paid')
                .reduce((sum, res) => sum + (res.totalAmount || 0), 0),
            totalCards: userCards.length,
            approvedCards: userCards.filter(card => card.isApproved).length
        };

        res.render("admin-user-details", {
            targetUser: user,
            userReservations,
            userCards,
            stats,
            user: req.user
        });
    } catch (error) {
        console.error("Error getting user details:", error);
        res.status(500).render("error", {
            user: req.user,
            title: "خطأ في تحميل بيانات المستخدم",
            errorCode: 500,
            message: "حدث خطأ أثناء تحميل بيانات المستخدم",
            error: process.env.NODE_ENV === 'development' ? error : null
        });
    }
});

// Delete user
route.delete("/user/delete/:id", hasPermission('delete_users'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "المستخدم غير موجود"
            });
        }

        // Prevent deletion of admin users
        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: "لا يمكن حذف المدراء"
            });
        }

        // Note: In a production environment, you might want to:
        // 1. Soft delete instead of hard delete
        // 2. Archive user's reservations and data
        // 3. Handle existing bookings gracefully
        // 4. Notify related parties

        // Delete user's reservations
        await Reserve.deleteMany({ user: user._id });

        // If user is a partner, delete their cards
        if (user.role === 'partner') {
            await Card.deleteMany({ partnerId: user._id });
        }

        // Delete the user
        await User.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: "تم حذف المستخدم وجميع بياناته بنجاح"
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء حذف المستخدم"
        });
    }
});

// ================= Card Order Management Routes =================
// Update card display order
route.post("/card/update-order/:id", isAdmin, async (req, res) => {
    try {
        const cardId = req.params.id;
        const { displayOrder } = req.body;
        
        // Validate inputs
        if (!cardId) {
            return res.status(400).json({
                success: false,
                message: "معرف البطاقة مطلوب"
            });
        }
        
        if (displayOrder === undefined || displayOrder === null) {
            return res.status(400).json({
                success: false,
                message: "ترتيب العرض مطلوب"
            });
        }
        
        const orderValue = parseInt(displayOrder);
        if (isNaN(orderValue) || orderValue < 0) {
            return res.status(400).json({
                success: false,
                message: "ترتيب العرض يجب أن يكون رقم موجب"
            });
        }
        
        // Find and update the card
        const card = await Card.findById(cardId);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: "البطاقة غير موجودة"
            });
        }
        
        card.displayOrder = orderValue;
        await card.save();
        
        res.json({
            success: true,
            message: "تم تحديث ترتيب البطاقة بنجاح",
            displayOrder: orderValue
        });
    } catch (error) {
        console.error("Error updating card order:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء تحديث ترتيب البطاقة"
        });
    }
});

// ================= User Permission Management Routes =================

// Get available permissions list
route.get("/permissions/available", isAdmin, (req, res) => {
    const permissions = [
        // Card Management
        { key: 'add_card', label: 'إضافة البطاقات', category: 'إدارة البطاقات' },
        { key: 'edit_card', label: 'تعديل البطاقات', category: 'إدارة البطاقات' },
        { key: 'delete_card', label: 'حذف البطاقات', category: 'إدارة البطاقات' },
        { key: 'approve_card', label: 'الموافقة على البطاقات', category: 'إدارة البطاقات' },
        { key: 'view_all_cards', label: 'عرض جميع البطاقات', category: 'إدارة البطاقات' },
        
        // User Management
        { key: 'view_users', label: 'عرض المستخدمين', category: 'إدارة المستخدمين' },
        { key: 'edit_users', label: 'تعديل المستخدمين', category: 'إدارة المستخدمين' },
        { key: 'delete_users', label: 'حذف المستخدمين', category: 'إدارة المستخدمين' },
        { key: 'manage_user_permissions', label: 'إدارة صلاحيات المستخدمين', category: 'إدارة المستخدمين' },
        
        // Partner Management
        { key: 'view_partners', label: 'عرض الشركاء', category: 'إدارة الشركاء' },
        { key: 'verify_partners', label: 'التحقق من الشركاء', category: 'إدارة الشركاء' },
        { key: 'suspend_partners', label: 'تعليق الشركاء', category: 'إدارة الشركاء' },
        { key: 'delete_partners', label: 'حذف الشركاء', category: 'إدارة الشركاء' },
        { key: 'edit_partners', label: 'تعديل الشركاء', category: 'إدارة الشركاء' },
        
        // Reservation Management
        { key: 'view_reservations', label: 'عرض الحجوزات', category: 'إدارة الحجوزات' },
        { key: 'verify_payments', label: 'التحقق من المدفوعات', category: 'إدارة الحجوزات' },
        { key: 'cancel_payments', label: 'إلغاء المدفوعات', category: 'إدارة الحجوزات' },
        { key: 'delete_reservations', label: 'حذف الحجوزات', category: 'إدارة الحجوزات' },
        
        // Content Management
        { key: 'manage_banners', label: 'إدارة اللافتات', category: 'إدارة المحتوى' },
        { key: 'manage_hero_media', label: 'إدارة الوسائط الرئيسية', category: 'إدارة المحتوى' },
        { key: 'manage_section_content', label: 'إدارة محتوى الأقسام', category: 'إدارة المحتوى' },
        { key: 'manage_page_content', label: 'إدارة محتوى الصفحات', category: 'إدارة المحتوى' },
        { key: 'manage_partner_logos', label: 'إدارة شعارات الشركاء', category: 'إدارة المحتوى' },
        { key: 'manage_exclusive_gallery', label: 'إدارة المعرض الحصري', category: 'إدارة المحتوى' },
        { key: 'manage_testimonials', label: 'إدارة الشهادات', category: 'إدارة المحتوى' },
        { key: 'manage_about_settings', label: 'إدارة إعدادات عن الموقع', category: 'إدارة المحتوى' },
        { key: 'manage_contact_settings', label: 'إدارة إعدادات التواصل', category: 'إدارة المحتوى' },
        { key: 'manage_partner_tiers', label: 'إدارة مستويات الشركاء', category: 'إدارة المحتوى' },
        
        // Analytics & Reports
        { key: 'view_analytics', label: 'عرض الإحصائيات', category: 'التقارير والإحصائيات' },
        { key: 'view_dashboard_stats', label: 'عرض إحصائيات لوحة التحكم', category: 'التقارير والإحصائيات' },
        
        // System Administration
        { key: 'full_admin_access', label: 'صلاحيات إدارية كاملة', category: 'إدارة النظام' }
    ];
    
    res.json(permissions);
});

// Get user permissions
route.get("/user/:id/permissions", canViewUsers, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('username phoneNumber role permissions');
        if (!user) {
            return res.status(404).json({ error: "المستخدم غير موجود" });
        }
        
        res.json({
            user: {
                _id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                role: user.role,
                permissions: user.permissions || []
            }
        });
    } catch (error) {
        console.error("Error fetching user permissions:", error);
        res.status(500).json({ error: "حدث خطأ أثناء جلب صلاحيات المستخدم" });
    }
});

// Update user permissions
route.post("/user/:id/permissions", canManageUserPermissions, async (req, res) => {
    try {
        const { permissions } = req.body;
        
        // Validate permissions array
        if (!Array.isArray(permissions)) {
            return res.status(400).json({ error: "الصلاحيات يجب أن تكون مصفوفة" });
        }
        
        // Get available permissions for validation
        const availablePermissions = [
            'add_card', 'edit_card', 'delete_card', 'approve_card', 'view_all_cards',
            'view_users', 'edit_users', 'delete_users', 'manage_user_permissions',
            'view_partners', 'verify_partners', 'suspend_partners', 'delete_partners', 'edit_partners',
            'view_reservations', 'verify_payments', 'cancel_payments', 'delete_reservations',
            'manage_banners', 'manage_hero_media', 'manage_section_content', 'manage_page_content',
            'manage_partner_logos', 'manage_exclusive_gallery', 'manage_testimonials',
            'manage_about_settings', 'manage_contact_settings', 'manage_partner_tiers',
            'view_analytics', 'view_dashboard_stats', 'full_admin_access'
        ];
        
        // Validate each permission
        const invalidPermissions = permissions.filter(p => !availablePermissions.includes(p));
        if (invalidPermissions.length > 0) {
            return res.status(400).json({ 
                error: "صلاحيات غير صحيحة",
                invalid: invalidPermissions 
            });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "المستخدم غير موجود" });
        }
        
        // Prevent modifying admin role permissions unless current user has full_admin_access
        if (user.role === 'admin' && !req.user.permissions?.includes('full_admin_access')) {
            return res.status(403).json({ 
                error: "لا يمكنك تعديل صلاحيات المدير بدون صلاحية الإدارة الكاملة" 
            });
        }
        
        user.permissions = permissions;
        await user.save();
        
        res.json({ 
            success: true,
            message: "تم تحديث الصلاحيات بنجاح",
            user: {
                _id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                role: user.role,
                permissions: user.permissions
            }
        });
    } catch (error) {
        console.error("Error updating user permissions:", error);
        res.status(500).json({ error: "حدث خطأ أثناء تحديث الصلاحيات" });
    }
});

// Bulk update permissions for multiple users
route.post("/users/permissions/bulk", canManageUserPermissions, async (req, res) => {
    try {
        const { userIds, permissions, action } = req.body; // action: 'add', 'remove', 'set'
        
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: "يجب تحديد مستخدمين" });
        }
        
        if (!Array.isArray(permissions) || permissions.length === 0) {
            return res.status(400).json({ error: "يجب تحديد صلاحيات" });
        }
        
        const validActions = ['add', 'remove', 'set'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ error: "نوع العملية غير صحيح" });
        }
        
        let updateOperation = {};
        
        switch (action) {
            case 'add':
                updateOperation = { $addToSet: { permissions: { $each: permissions } } };
                break;
            case 'remove':
                updateOperation = { $pullAll: { permissions: permissions } };
                break;
            case 'set':
                updateOperation = { $set: { permissions: permissions } };
                break;
        }
        
        const result = await User.updateMany(
            { _id: { $in: userIds }, role: { $ne: 'admin' } }, // Don't modify admin permissions
            updateOperation
        );
        
        res.json({
            success: true,
            message: `تم تحديث صلاحيات ${result.modifiedCount} مستخدم`,
            modifiedCount: result.modifiedCount
        });
        
    } catch (error) {
        console.error("Error bulk updating permissions:", error);
        res.status(500).json({ error: "حدث خطأ أثناء التحديث المجمع للصلاحيات" });
    }
});

module.exports = route
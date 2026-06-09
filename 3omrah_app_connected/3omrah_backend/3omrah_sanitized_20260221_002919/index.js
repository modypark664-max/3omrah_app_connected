require('dotenv').config();

const express = require("express");
const path = require("path");
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require("mongoose");
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rehlatty';
let startServer;
const MongoStore = require("connect-mongo");
const app = express();
const upload = require("./upload")
const port = process.env.PORT || 3000;
const { sendEmail } = require("./emailHandler");
const flash = require("connect-flash");

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    if (require.main === module) {
      startServer?.();
    }
  })
  .catch(err => {
    console.error('[DB] MongoDB connection failed:', err);
    process.exit(1);
  });
const session = require("express-session");
const helmet = require("helmet");
const cors = require("cors");
const Reserve = require("./models/Reserve");
const Card = require("./models/Cards");
const PartnerBanner = require("./models/PartnerBanner");
const SectionContent = require("./models/SectionContent");
const PageContent = require("./models/PageContent");
const PartnerLogos = require('./models/PartnerLogos');
const ExclusiveGallery = require('./models/ExclusiveGallery');
const PartnerTierLimits = require('./models/PartnerTierLimits');
const ContactSettings = require('./models/ContactSettings');
const Testimonials = require('./models/Testimonials');
const AboutSettings = require('./models/AboutSettings');
const HeroMedia = require('./models/HeroMedia');
const CardChatThread = require('./models/CardChatThread');
const CardChatMessage = require('./models/CardChatMessage');
const chatRoutes = require('./chatRoutes');
const {
  loadThreadForUser,
  markThreadReadByUser,
  serializeMessage,
  appendMessage,
  emitChatMessage
} = require('./services/chatService');

// Import routes
const adminRoutes = require("./adminRoutes");
const airportAirlineRoutes = require("./airportAirlineRoutes");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require('./models/User');
const Admin = require('./models/Admin');
const {
  userRegistrationSchema,
  userLoginSchema,
  contactSchema,
  reservationSchema,
  partnerSignupSchema,
  cardCreationSchema,
  mobileBundlesQuerySchema,
  mobileCardIdSchema,
  mobileReservationLookupSchema,
  accountDeletionSchema,
  bundleTravelRequestSchema,
  validateSchema
} = require('./schemas');
const {isLoggedIn, isNotLoggedIn} = require("./middlware");
const { title } = require('process');

const PUBLIC_ASSET_BASE_URL =
  process.env.PUBLIC_ASSET_BASE_URL ||
  process.env.MEDIA_CDN_URL ||
  process.env.FRONTEND_URL ||
  'https://rehlatty.com';

const PRIVACY_POLICY_URL = process.env.PRIVACY_POLICY_URL || '/privacy';

const toAbsoluteUrl = (value) => {
  if (!value) {
    return '';
  }
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }
  const base = (PUBLIC_ASSET_BASE_URL || '').replace(/\/$/, '');
  const normalizedPath = value.startsWith('/') ? value.slice(1) : value;
  if (!base) {
    return value;
  }
  return `${base}/${normalizedPath}`;
};

const DEFAULT_CARD_IMAGE = toAbsoluteUrl(process.env.DEFAULT_CARD_IMAGE_URL || '/imgs/logo.png') || '/imgs/logo.png';
const PUBLIC_CARD_FILTER = {
  $or: [
    { createdBy: 'admin' },
    { createdBy: { $exists: false } },
    { createdBy: null },
    { createdBy: 'partner', isApproved: true }
  ]
};
const PARTNER_APPROVED_FILTER = {
  $or: [
    { createdBy: 'admin' },
    { createdBy: 'partner', isApproved: true }
  ]
};
const BUNDLE_SORT = { displayOrder: 1, travel_date: 1, offer_expiry_date: 1, createdAt: -1 };

const serializeCardForClient = (card = {}, options = {}) => {
  const { includeDetails = false } = options;
  const safe = typeof card.toObject === 'function' ? card.toObject() : card;
  if (!safe) {
    return null;
  }

  const toDate = (value) => (value ? new Date(value) : null);
  const offerExpiry = toDate(safe.offer_expiry_date);
  const travelDate = toDate(safe.travel_date);

  const thumbnail = toAbsoluteUrl(safe.thumbnail) || DEFAULT_CARD_IMAGE;
  const base = {
    id: safe._id,
    name: safe.name || safe.title || '',
    code: safe.code,
    type: safe.type,
    thumbnail,
    lowest_price: safe.lowest_price || 0,
    days: safe.days || 0,
    nights: safe.nights || 0,
    travel_date: travelDate ? travelDate.toISOString() : null,
    offer_expiry_date: offerExpiry ? offerExpiry.toISOString() : null,
    going_route: safe.going_route || '',
    returning_route: safe.returning_route || '',
    plane_company: safe.plane_company || '',
    offer_type: safe.offer_type || '',
    createdAt: safe.createdAt,
    updatedAt: safe.updatedAt,
    isExpired: offerExpiry ? offerExpiry < new Date() : false
  };

  if (!includeDetails) {
    return base;
  }

  const normalizeHotels = (list = []) =>
    Array.isArray(list)
      ? list.map((hotel) => ({
          nights: hotel.nights,
          name: hotel.hotel,
          type: hotel.hotel_type,
          location: hotel.location,
          includesMeals: Boolean(hotel.comes_with_food)
        }))
      : [];

  const normalizeHousingOptions = (list = []) =>
    Array.isArray(list)
      ? list.map((option) => ({
          roomType: option.roomType,
          price: option.price
        }))
      : [];

  return {
    ...base,
    images: (() => {
      const rawList = Array.isArray(safe.images) ? safe.images : [];
      const normalized = rawList.map((img) => toAbsoluteUrl(img)).filter(Boolean);
      const list = normalized.length ? normalized : [thumbnail];
      return [...new Set(list)];
    })(),
    included_services: safe.included_services || [],
    not_included_services: safe.not_included_services || [],
    notes: safe.notes || [],
    cancelling_rules: safe.cancelling_rules || [],
    company: safe.company || '',
    plane: {
      hotel: normalizeHotels(safe.plane?.hotel),
      housingOptions: normalizeHousingOptions(safe.plane?.housingOptions)
    }
  };
};

// Rate limiting for password changes
const passwordChangeAttempts = new Map();

// Clean up old attempts every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, attempts] of passwordChangeAttempts.entries()) {
    passwordChangeAttempts.set(key, attempts.filter(time => time > oneHourAgo));
    if (passwordChangeAttempts.get(key).length === 0) {
      passwordChangeAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}



// Custom sanitization function to prevent NoSQL injection
const sanitize = (payload) => {
  if (typeof payload === 'object' && payload !== null) {
    Object.keys(payload).forEach(key => {
      if (typeof payload[key] === 'string') {
        // Remove potentially dangerous characters
        payload[key] = payload[key].replace(/[<>'"${}]/g, '');
      } else if (typeof payload[key] === 'object') {
        sanitize(payload[key]);
      }
    });
  }
  return payload;
};

// Custom middleware for sanitizing request data
const sanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    // Create a new sanitized query object
    const sanitizedQuery = {};
    Object.keys(req.query).forEach(key => {
      sanitizedQuery[key] = typeof req.query[key] === 'string' 
        ? req.query[key].replace(/[<>'"${}]/g, '') 
        : req.query[key];
    });
    // Replace the query object properties without changing the object reference
    Object.keys(req.query).forEach(key => delete req.query[key]);
    Object.assign(req.query, sanitizedQuery);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }
  next();
};


// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://stackpath.bootstrapcdn.com", "https://fonts.googleapis.com", "https://unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://stackpath.bootstrapcdn.com", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "https://*.tile.openstreetmap.org", "https://res.cloudinary.com"],
      mediaSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
  connectSrc: ["'self'", "https://*.tile.openstreetmap.org", "https://res.cloudinary.com", "wss:", "ws:"],
      frameSrc: ["'self'", "https://res.cloudinary.com"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    const resolvedOrigin = origin.replace(/\/$/, '');
    const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(resolvedOrigin);
    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    if (isLocalDev || (frontendUrl && resolvedOrigin === frontendUrl)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware
app.use((req, res, next) => {
  // Set timeout for all requests (60 seconds)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      const error = new AppError('Request Timeout', 408);
      error.name = 'TimeoutError';
      next(error);
    }
  }, 60000);

  // Clear timeout when response finishes
  res.on('finish', () => {
    clearTimeout(timeout);
  });

  // Clear timeout when response is closed
  res.on('close', () => {
    clearTimeout(timeout);
  });

  next();
});

app.set("trust proxy", 1);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "your_secret_key_please_change_in_production",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/rehlatty',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
});

// Custom data sanitization against NoSQL query injection
app.use(sessionMiddleware);
app.use(sanitizeMiddleware);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(passport.initialize())
app.use(passport.session())
passport.use(
  new LocalStrategy({ usernameField: "phoneNumber" }, User.authenticate())
);
passport.use('admin-local', new LocalStrategy(Admin.authenticate()));

passport.serializeUser((user, done) => {
  const type = (user && user.constructor && user.constructor.modelName === 'Admin') ? 'Admin' : 'User';
  done(null, { id: user.id, type });
});

passport.deserializeUser(async (obj, done) => {
  try {
    if (obj.type === 'Admin') {
      const admin = await Admin.findById(obj.id);
      done(null, admin);
    } else {
      const user = await User.findById(obj.id);
      done(null, user);
    }
  } catch (err) {
    done(err);
  }
});

const serializeUserForClient = (user) => {
  if (!user) return null;
  return {
    id: user._id,
    username: user.username,
    phoneNumber: user.phoneNumber,
    role: user.role,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    isVerified: Boolean(user.isVerified),
    profileImage: user.profileImage || null,
    createdAt: user.createdAt || null
  };
};

app.use((req, res, next) => {
  if (req.user && typeof req.user.role === 'string') {
    req.user.role = req.user.role.toLowerCase();
  }
  res.locals.user = req.user;
  res.locals.privacyPolicyUrl = PRIVACY_POLICY_URL;
  next();
});

app.use(flash());
app.use( async (req, res, next) => {
  const contactInfo = await ContactSettings.getSingleton();
  res.locals.success_msg = req.flash("success");
  res.locals.error_msg = req.flash("error");
  res.locals.email = contactInfo.email;
  res.locals.phone = contactInfo.phoneNumber;
  res.locals.whatsapp= contactInfo.whatsappNumber;
  next();
});

// Load contact settings into all views
app.use(async (req, res, next) => {
  try {
    const contactSettings = await ContactSettings.getSingleton();
    res.locals.contactSettings = contactSettings;
  } catch (e) {
    console.error('Failed loading contact settings:', e);
    res.locals.contactSettings = { whatsappNumber: '01225993443', phoneNumber: '01225993443', email: 'info@rehlatty.com' };
  }
  next();
});

// Load testimonials and about settings into all views
app.use(async (req, res, next) => {
  try {
    const [testimonialsDoc, aboutDoc] = await Promise.all([
      Testimonials.getSingleton(),
      AboutSettings.getSingleton()
    ]);
    res.locals.testimonialsReviews = testimonialsDoc.reviews || [];
    res.locals.aboutImageUrl = aboutDoc.aboutImageUrl || '';
  } catch (e) {
    console.error('Failed loading testimonials/about settings:', e);
    res.locals.testimonialsReviews = [];
    res.locals.aboutImageUrl = '';
  }
  next();
});


// PAGES
// Routes
app.use("/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", airportAirlineRoutes);

const appendCompanySearchFilter = (filters, companyQuery) => {
  if (!filters || typeof filters !== 'object') return;
  if (!companyQuery || typeof companyQuery !== 'string') return;
  const normalized = companyQuery.trim();
  if (!normalized.length) return;
  const regex = new RegExp(normalized, 'i');
  if (!filters.$and) {
    filters.$and = [];
  }
  filters.$and.push({ $or: [{ company: regex }, { plane_company: regex }] });
};

const extractUniqueCompanies = (cards = []) => {
  const normalizedMap = new Map();

  cards.forEach((card) => {
    const original = (card?.company || '').trim();
    if (!original) {
      return;
    }

    const normalizedKey = original
      .normalize('NFKC')
      .toLocaleLowerCase('ar')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalizedKey.length) {
      return;
    }

    if (!normalizedMap.has(normalizedKey)) {
      normalizedMap.set(normalizedKey, original);
    }
  });

  return [...normalizedMap.values()].sort((a, b) =>
    a.localeCompare(b, 'ar', { sensitivity: 'base', ignorePunctuation: true })
  );
};

const buildExactMatchRegex = (value = '') => {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}$`, 'i');
};

const normalizeArrayField = (input) => {
  const accumulator = [];

  const tryJsonParse = (value) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  };

  const visit = (value) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (typeof value === 'string') {
      let trimmed = value.trim();
      if (!trimmed.length) {
        return;
      }

      const deQuoted = trimmed.replace(/&quot;/g, '"');
      const looksLikeArray = (str) => str.startsWith('[') && str.endsWith(']');

      if (looksLikeArray(deQuoted)) {
        const parsed = tryJsonParse(deQuoted);
        if (Array.isArray(parsed)) {
          parsed.forEach(visit);
          return;
        }
      }

      if ((deQuoted.startsWith('"') && deQuoted.endsWith('"'))) {
        const parsedString = tryJsonParse(deQuoted);
        if (typeof parsedString === 'string') {
          visit(parsedString);
          return;
        }
      }

      trimmed = deQuoted.replace(/^[\[]|[\]]$/g, '').trim();
      const parts = trimmed
        .split(/[\n•,]+/)
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length > 1) {
        parts.forEach(visit);
        return;
      }

      return accumulator.push(parts[0] || trimmed);
    }

    accumulator.push(String(value).trim());
  };

  visit(input);

  const seen = new Set();
  return accumulator
    .map((value) => value.replace(/^"+|"+$/g, '').trim())
    .filter((value) => {
      if (!value) {
        return false;
      }
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

app.get("/", async (req, res) => {
  try {
    const title = "الرئيسية";
    const now = new Date();
    const activeCardFilter = { offer_expiry_date: { $gte: now } };
    const upcomingTravelFilter = { travel_date: { $gte: now } };
    
    // Fetch cards by type, sorted by proximity to travel date
    const publicCardFilter = {
      $or: [
        { createdBy: 'admin' },
        { createdBy: { $exists: false } },
        { createdBy: null },
        { createdBy: 'partner', isApproved: true }
      ]
    };
    const departureSort = { travel_date: 1, offer_expiry_date: 1, displayOrder: 1, createdAt: -1 };
    const partnerApprovedFilter = {
      $or: [
        { createdBy: 'admin' },
        { createdBy: 'partner', isApproved: true }
      ]
    };

    const fetchClosestCards = async (baseFilter, limit, excludeIds = []) => {
      const sanitizedExclude = (excludeIds || []).filter(Boolean);
      const upcomingFilter = {
        ...baseFilter,
        ...upcomingTravelFilter,
        ...(sanitizedExclude.length ? { _id: { $nin: sanitizedExclude } } : {})
      };

      let cards = await Card.find(upcomingFilter)
        .sort(departureSort)
        .limit(limit);

      const remaining = limit - cards.length;
      if (remaining > 0) {
        const fallbackExclude = [...sanitizedExclude, ...cards.map(card => card?._id).filter(Boolean)];
        const fallbackFilter = {
          ...baseFilter,
          ...(fallbackExclude.length ? { _id: { $nin: fallbackExclude } } : {})
        };

        const fallbackCards = await Card.find(fallbackFilter)
          .sort(departureSort)
          .limit(remaining);

        cards = cards.concat(fallbackCards);
      }

      return cards;
    };

    const highlightedOmrah = await fetchClosestCards(
      { type: 'omrah', ...publicCardFilter, ...activeCardFilter },
      2
    );
    const highlightedHajj = await fetchClosestCards(
      { type: '7ag', ...publicCardFilter, ...activeCardFilter },
      1
    );

    const omrahCards = [...highlightedOmrah, ...highlightedHajj];

    if (omrahCards.length < 3) {
      const excludeIds = omrahCards.map((card) => card?._id).filter(Boolean);
      const filler = await fetchClosestCards(
        {
          type: { $in: ['omrah', '7ag'] },
          ...publicCardFilter,
          ...activeCardFilter
        },
        3 - omrahCards.length,
        excludeIds
      );
      omrahCards.push(...filler);
    }
    const internalTourCards = await fetchClosestCards({ 
      type: 'internal_tour',
      ...partnerApprovedFilter,
      ...activeCardFilter
    }, 3);
    const externalTourCards = await fetchClosestCards({ 
      type: 'external_tour',
      ...partnerApprovedFilter,
      ...activeCardFilter
    }, 3);
    
  // Fetch active partner banners (using the new method that filters expired ones)
  const partnerBanners = await PartnerBanner.getActiveBanners();
  const partnerBanner = partnerBanners.length > 0 ? partnerBanners[0] : null;

  // Fetch hero media (active only)
  const heroMedia = await require('./models/HeroMedia').find({ isActive: true }).sort({ order: 1, createdAt: -1 });
  
  // Fetch section content and organize by type
  const sectionContentList = await SectionContent.find({ isActive: true });
  const sectionContents = {};
  sectionContentList.forEach(section => {
    sectionContents[section.sectionType] = section;
  });
  
  // Fetch page content and organize by content type
  const pageContentList = await PageContent.find({ isActive: true });
  const pageContents = {};
  pageContentList.forEach(content => {
    pageContents[content.contentType] = content.content;
  });
    
    // Fetch partner logos
    let partnerLogosDoc = await PartnerLogos.findOne();
    const partnerLogos = partnerLogosDoc ? partnerLogosDoc.images : [];
    // Fetch exclusive gallery cards
    let galleryDoc = await ExclusiveGallery.findOne();
    let galleryCards = [];
    if (galleryDoc && galleryDoc.cardIds && galleryDoc.cardIds.length === 3) {
      galleryCards = await Card.find({ _id: { $in: galleryDoc.cardIds } });
      // Sort by the order in galleryDoc.cardIds
      const idOrder = galleryDoc.cardIds.map(id => id.toString());
      galleryCards.sort((a, b) => idOrder.indexOf(a._id.toString()) - idOrder.indexOf(b._id.toString()));
    }
    res.render("home", { 
      user: req.user, 
      title,
      omrahCards,
      internalTourCards,
      externalTourCards,
      partnerBanner,
      heroMedia,
      sectionContents,
      pageContents,
      partnerLogos,
      galleryCards,
      currentRoute: '/'
    });
  } catch (error) {
    console.error('Error fetching home page data:', error);
    res.render("home", { 
      user: req.user, 
      title: "الرئيسية",
      omrahCards: [],
      internalTourCards: [],
      externalTourCards: [],
      partnerBanner: null,
      heroMedia: [],
      sectionContents: {},
      pageContents: {},
      partnerLogos: [],
      galleryCards: [],
      currentRoute: '/'
    });
  }
});
app.get("/bundles", async (req, res) => {
  try {
    const title = "الباقات";
    const now = new Date();
    
    // Fetch page content for headers
    const pageContentList = await PageContent.find({ isActive: true });
    const pageContents = {};
    pageContentList.forEach(content => {
      pageContents[content.contentType] = content.content;
    });
    
    // Get filter parameters from query
    const filters = { type: 'omrah' }; // Only show omrah type cards
    const {
      going_route,
      hotel_type,
      min_price,
      max_price,
      days,
      nights,
      plane_company,
      travel_date_from,
      travel_date_to,
      offer_type,
      company
    } = req.query;
    
    // Build filter object (type is fixed to 'omrah')
    filters.type = 'omrah';
    filters.$or = [
      { createdBy: 'admin' },
      { createdBy: 'partner', isApproved: true }
    ];
    
    if (going_route) filters.going_route = new RegExp(going_route, 'i');
    if (hotel_type) filters['plane.hotel.hotel_type'] = hotel_type;
  if (plane_company) filters.plane_company = new RegExp(plane_company, 'i');
  appendCompanySearchFilter(filters, company);
  appendCompanySearchFilter(filters, company);
  appendCompanySearchFilter(filters, company);
  appendCompanySearchFilter(filters, company);
  appendCompanySearchFilter(filters, company);
    if (days) filters.days = parseInt(days);
    if (nights) filters.nights = parseInt(nights);
    if (offer_type) filters.offer_type = offer_type;
    
    // Price range filter
    if (min_price || max_price) {
      filters.lowest_price = {};
      if (min_price) filters.lowest_price.$gte = parseInt(min_price);
      if (max_price) filters.lowest_price.$lte = parseInt(max_price);
    }
    
    // Date range filter
    const travelDateFilter = {};
    if (travel_date_from) {
      travelDateFilter.$gte = new Date(travel_date_from);
    }
    if (travel_date_to) {
      travelDateFilter.$lte = new Date(travel_date_to);
    }
    if (!travel_date_from && !travel_date_to) {
      travelDateFilter.$gte = now;
    }
    if (Object.keys(travelDateFilter).length > 0) {
      filters.travel_date = travelDateFilter;
    }
    
    // Fetch filtered cards (only omrah type)
    // Sort by: 1) displayOrder (admin override), 2) travel_date (soonest first), 3) createdAt (newest first)
  const cards = await Card.find(filters).sort({ travel_date: 1, displayOrder: 1, createdAt: -1 });
    
    // Get unique values for filter options (only from approved omrah cards)
    const allOmrahCards = await Card.find({ 
      type: 'omrah',
      $or: [
        { createdBy: 'admin' },
        { createdBy: 'partner', isApproved: true }
      ]
    });
    const filterOptions = {
      routes: [...new Set(allOmrahCards.map(card => card.going_route))],
      hotelTypes: [...new Set(allOmrahCards.flatMap(card => card.plane.hotel.map(h => h.hotel_type)))],
      airlines: [...new Set(allOmrahCards.map(card => card.plane_company))],
      dayOptions: [...new Set(allOmrahCards.map(card => card.days))].sort((a, b) => a - b),
      nightOptions: [...new Set(allOmrahCards.map(card => card.nights))].sort((a, b) => a - b),
      offerTypes: [...new Set(allOmrahCards.map(card => card.offer_type).filter(Boolean))],
      companies: extractUniqueCompanies(allOmrahCards)
    };
    
    res.render("bundles", { 
      user: req.user, 
      title,
      cards,
      filterOptions,
      currentFilters: req.query,
      currentRoute: '/bundles',
      pageContents
    });
  } catch (error) {
    console.error('Error fetching bundles data:', error);
    res.render("bundles", { 
      user: req.user, 
      title: "الباقات",
      cards: [],
      filterOptions: {
        routes: [],
        hotelTypes: [],
        airlines: [],
        dayOptions: [],
        nightOptions: [],
        offerTypes: [],
        companies: []
      },
      currentFilters: {},
      currentRoute: '/bundles',
      pageContents: {}
    });
  }
});

app.get("/tours", async (req, res) => {
  try {
    const title = "جميع الرحلات";
    
    // Fetch page content for headers
    const pageContentList = await PageContent.find({ isActive: true });
    const pageContents = {};
    pageContentList.forEach(content => {
      pageContents[content.contentType] = content.content;
    });
    
    // Get filter parameters from query
    const filters = {}; // Show all types of tours
    const {
      type,
      going_route,
      hotel_type,
      min_price,
      max_price,
      days,
      nights,
      plane_company,
      rate,
      travel_date_from,
      travel_date_to,
      company
    } = req.query;
    
    // Build filter object
    filters.$or = [
      { createdBy: 'admin' },
      { createdBy: 'partner', isApproved: true }
    ];
    
    if (type) filters.type = type;
    if (going_route) filters.going_route = new RegExp(going_route, 'i');
    if (hotel_type) filters['plane.hotel.hotel_type'] = hotel_type;
    if (plane_company) filters.plane_company = new RegExp(plane_company, 'i');
    appendCompanySearchFilter(filters, company);
    if (days) filters.days = parseInt(days);
    if (nights) filters.nights = parseInt(nights);
    if (rate) filters.rate = { $gte: parseFloat(rate) };
    
    // Price range filter
    if (min_price || max_price) {
      filters.lowest_price = {};
      if (min_price) filters.lowest_price.$gte = parseInt(min_price);
      if (max_price) filters.lowest_price.$lte = parseInt(max_price);
    }
    
    // Date range filter
    if (travel_date_from || travel_date_to) {
      filters.travel_date = {};
      if (travel_date_from) filters.travel_date.$gte = new Date(travel_date_from);
      if (travel_date_to) filters.travel_date.$lte = new Date(travel_date_to);
    }
    
    // Fetch filtered cards (all types)
    // Sort by: 1) displayOrder (admin override), 2) travel_date (soonest first), 3) createdAt (newest first)
    const cards = await Card.find(filters).sort({ displayOrder: 1, travel_date: 1, createdAt: -1 });
    
    // Get unique values for filter options (from all approved cards)
    const allCards = await Card.find({
      $or: [
        { createdBy: 'admin' },
        { createdBy: 'partner', isApproved: true }
      ]
    });
    const filterOptions = {
      types: [...new Set(allCards.map(card => card.type))],
      routes: [...new Set(allCards.map(card => card.going_route))],
      hotelTypes: [...new Set(allCards.flatMap(card => card.plane.hotel.map(h => h.hotel_type)))],
      airlines: [...new Set(allCards.map(card => card.plane_company))],
      dayOptions: [...new Set(allCards.map(card => card.days))].sort((a, b) => a - b),
      nightOptions: [...new Set(allCards.map(card => card.nights))].sort((a, b) => a - b),
      companies: extractUniqueCompanies(allCards)
    };
    
    res.render("bundles", { 
      user: req.user, 
      title,
      cards,
      filterOptions,
      currentFilters: req.query,
      currentRoute: '/tours',
      pageContents
    });
  } catch (error) {
    console.error('Error fetching tours data:', error);
    res.render("bundles", { 
      user: req.user, 
      title: "جميع الرحلات",
      cards: [],
      filterOptions: {
        types: [],
        routes: [],
        hotelTypes: [],
        airlines: [],
        dayOptions: [],
        nightOptions: [],
        companies: []
      },
      currentFilters: {},
      currentRoute: '/tours',
      pageContents: {}
    });
  }
});

app.get("/inner-tours", async (req, res) => {
  try {
    const title = "الجولات الداخلية";
    
    // Fetch page content for headers
    const pageContentList = await PageContent.find({ isActive: true });
    const pageContents = {};
    pageContentList.forEach(content => {
      pageContents[content.contentType] = content.content;
    });
    
    // Get filter parameters from query
    const filters = { 
      type: 'internal_tour',
      $or: [
        { createdBy: 'admin' },
        { createdBy: 'partner', isApproved: true }
      ]
    }; // Only show approved internal tour type cards
    const {
      going_route,
      hotel_type,
      min_price,
      max_price,
      days,
      nights,
      plane_company,
      travel_date_from,
      travel_date_to,
      offer_type,
      company
    } = req.query;
    
    // Build filter object (type is fixed to 'internal_tour')
    if (going_route) filters.going_route = new RegExp(going_route, 'i');
    if (hotel_type) filters['plane.hotel.hotel_type'] = hotel_type;
    if (plane_company) filters.plane_company = new RegExp(plane_company, 'i');
    appendCompanySearchFilter(filters, company);
    if (days) filters.days = parseInt(days);
    if (nights) filters.nights = parseInt(nights);
    if (offer_type) filters.offer_type = offer_type;
    
    // Price range filter
    if (min_price || max_price) {
      filters.lowest_price = {};
      if (min_price) filters.lowest_price.$gte = parseInt(min_price);
      if (max_price) filters.lowest_price.$lte = parseInt(max_price);
    }
    
    // Date range filter
    if (travel_date_from || travel_date_to) {
      filters.travel_date = {};
      if (travel_date_from) filters.travel_date.$gte = new Date(travel_date_from);
      if (travel_date_to) filters.travel_date.$lte = new Date(travel_date_to);
    }
    
    // Fetch filtered cards (only internal_tour type)
    // Sort by: 1) displayOrder (admin override), 2) travel_date (soonest first), 3) createdAt (newest first)
    const cards = await Card.find(filters).sort({ displayOrder: 1, travel_date: 1, createdAt: -1 });
    
    // Get unique values for filter options (only from approved internal_tour cards)
    const allInternalTourCards = await Card.find({ 
      type: 'internal_tour',
      $or: [
        { createdBy: 'admin' },
        { createdBy: 'partner', isApproved: true }
      ]
    });
    const filterOptions = {
      routes: [...new Set(allInternalTourCards.map(card => card.going_route))],
      hotelTypes: [...new Set(allInternalTourCards.flatMap(card => card.plane.hotel.map(h => h.hotel_type)))],
      airlines: [...new Set(allInternalTourCards.map(card => card.plane_company))],
      dayOptions: [...new Set(allInternalTourCards.map(card => card.days))].sort((a, b) => a - b),
      nightOptions: [...new Set(allInternalTourCards.map(card => card.nights))].sort((a, b) => a - b),
      offerTypes: [...new Set(allInternalTourCards.map(card => card.offer_type).filter(Boolean))],
      companies: extractUniqueCompanies(allInternalTourCards)
    };
    
    res.render("bundles", { 
      user: req.user, 
      title,
      cards,
      filterOptions,
      currentFilters: req.query,
      currentRoute: '/inner-tours',
      pageContents
    });
  } catch (error) {
    console.error('Error fetching inner tours data:', error);
    res.render("bundles", { 
      user: req.user,
      title: "الجولات الداخلية",
      cards: [],
      filterOptions: {
        routes: [],
        hotelTypes: [],
        airlines: [],
        dayOptions: [],
        nightOptions: [],
        offerTypes: [],
        companies: []
      },
      currentFilters: {},
      currentRoute: '/inner-tours',
      pageContents: {}
    });
  }
});
app.get("/external-tours", async (req, res) => {
  try {
    const title = "الجولات الخارجية";
    
    // Fetch page content for headers
    const pageContentList = await PageContent.find({ isActive: true });
    const pageContents = {};
    pageContentList.forEach(content => {
      pageContents[content.contentType] = content.content;
    });
    
    // Get filter parameters from query
    const filters = { 
      type: 'external_tour',
      $or: [
        { createdBy: 'admin' },
        { createdBy: 'partner', isApproved: true }
      ]
    }; // Only show approved external tour type cards
    const {
      going_route,
      hotel_type,
      min_price,
      max_price,
      days,
      nights,
      plane_company,
      travel_date_from,
      travel_date_to,
      offer_type,
      company
    } = req.query;
    
    // Build filter object (type is fixed to 'external_tour')
    if (going_route) filters.going_route = new RegExp(going_route, 'i');
    if (hotel_type) filters['plane.hotel.hotel_type'] = hotel_type;
    if (plane_company) filters.plane_company = new RegExp(plane_company, 'i');
    appendCompanySearchFilter(filters, company);
    if (days) filters.days = parseInt(days);
    if (nights) filters.nights = parseInt(nights);
    if (offer_type) filters.offer_type = offer_type;
    
    // Price range filter
    if (min_price || max_price) {
      filters.lowest_price = {};
      if (min_price) filters.lowest_price.$gte = parseInt(min_price);
      if (max_price) filters.lowest_price.$lte = parseInt(max_price);
    }
    
    // Date range filter
    if (travel_date_from || travel_date_to) {
      filters.travel_date = {};
      if (travel_date_from) filters.travel_date.$gte = new Date(travel_date_from);
      if (travel_date_to) filters.travel_date.$lte = new Date(travel_date_to);
    }
    
    // Fetch filtered cards (only external_tour type)
    // Sort by: 1) displayOrder (admin override), 2) travel_date (soonest first), 3) createdAt (newest first)
    const cards = await Card.find(filters).sort({ displayOrder: 1, travel_date: 1, createdAt: -1 });
    
    // Get unique values for filter options (only from approved external_tour cards)
    const allExternalTourCards = await Card.find({ 
      type: 'external_tour',
      $or: [
        { createdBy: 'admin' },
        { createdBy: 'partner', isApproved: true }
      ]
    });
    const filterOptions = {
      routes: [...new Set(allExternalTourCards.map(card => card.going_route))],
      hotelTypes: [...new Set(allExternalTourCards.flatMap(card => card.plane.hotel.map(h => h.hotel_type)))],
      airlines: [...new Set(allExternalTourCards.map(card => card.plane_company))],
      dayOptions: [...new Set(allExternalTourCards.map(card => card.days))].sort((a, b) => a - b),
      nightOptions: [...new Set(allExternalTourCards.map(card => card.nights))].sort((a, b) => a - b),
      offerTypes: [...new Set(allExternalTourCards.map(card => card.offer_type).filter(Boolean))],
      companies: extractUniqueCompanies(allExternalTourCards)
    };
    
    res.render("bundles", { 
      user: req.user, 
      title,
      cards,
      filterOptions,
      currentFilters: req.query,
      currentRoute: '/external-tours',
      pageContents
    });
  } catch (error) {
    console.error('Error fetching external tours data:', error);
    res.render("bundles", { 
      user: req.user,
      title: "الجولات الخارجية",
      cards: [],
      filterOptions: {
        routes: [],
        hotelTypes: [],
        airlines: [],
        dayOptions: [],
        nightOptions: [],
        offerTypes: [],
        companies: []
      },
      currentFilters: {},
      currentRoute: '/external-tours',
      pageContents: {}
    });
  }
});
app.get("/7ag-tours", async (req, res) => {
  try {
    const title = "رحلات الحج";
    
    // Fetch page content for headers
    const pageContentList = await PageContent.find({ isActive: true });
    const pageContents = {};
    pageContentList.forEach(content => {
      pageContents[content.contentType] = content.content;
    });
    
    // Get filter parameters from query
    const filters = { 
      type: '7ag',
      $or: [
        { createdBy: 'admin' },
        { createdBy: 'partner', isApproved: true }
      ]
    }; // Only show approved 7ag type cards
    const {
      going_route,
      hotel_type,
      min_price,
      max_price,
      days,
      nights,
      plane_company,
      travel_date_from,
      travel_date_to,
      offer_type,
      company
    } = req.query;
    
    // Build filter object (type is fixed to '7ag')
    if (going_route) filters.going_route = new RegExp(going_route, 'i');
    if (hotel_type) filters['plane.hotel.hotel_type'] = hotel_type;
    if (plane_company) filters.plane_company = new RegExp(plane_company, 'i');
    appendCompanySearchFilter(filters, company);
    if (days) filters.days = parseInt(days);
    if (nights) filters.nights = parseInt(nights);
    if (offer_type) filters.offer_type = offer_type;
    
    // Price range filter
    if (min_price || max_price) {
      filters.lowest_price = {};
      if (min_price) filters.lowest_price.$gte = parseInt(min_price);
      if (max_price) filters.lowest_price.$lte = parseInt(max_price);
    }
    
    // Date range filter
    if (travel_date_from || travel_date_to) {
      filters.travel_date = {};
      if (travel_date_from) filters.travel_date.$gte = new Date(travel_date_from);
      if (travel_date_to) filters.travel_date.$lte = new Date(travel_date_to);
    }
    
    // Fetch filtered cards (only 7ag type)
    // Sort by: 1) displayOrder (admin override), 2) travel_date (soonest first), 3) createdAt (newest first)
    const cards = await Card.find(filters).sort({ displayOrder: 1, travel_date: 1, createdAt: -1 });
    
    // Get unique values for filter options (only from approved 7ag cards)
    const all7agCards = await Card.find({ 
      type: '7ag',
      $or: [
        { createdBy: 'admin' },
        { createdBy: 'partner', isApproved: true }
      ]
    });
    const filterOptions = {
      routes: [...new Set(all7agCards.map(card => card.going_route))],
      hotelTypes: [...new Set(all7agCards.flatMap(card => card.plane.hotel.map(h => h.hotel_type)))],
      airlines: [...new Set(all7agCards.map(card => card.plane_company))],
      dayOptions: [...new Set(all7agCards.map(card => card.days))].sort((a, b) => a - b),
      nightOptions: [...new Set(all7agCards.map(card => card.nights))].sort((a, b) => a - b),
      offerTypes: [...new Set(all7agCards.map(card => card.offer_type).filter(Boolean))],
      companies: extractUniqueCompanies(all7agCards)
    };
    
    res.render("bundles", { 
      user: req.user, 
      title,
      cards,
      filterOptions,
      currentFilters: req.query,
      currentRoute: '/7ag-tours',
      pageContents
    });
  } catch (error) {
    console.error('Error fetching 7ag tours data:', error);
    res.render("bundles", { 
      user: req.user,
      title: "رحلات الحج",
      cards: [],
      filterOptions: {
        routes: [],
        hotelTypes: [],
        airlines: [],
        dayOptions: [],
        nightOptions: [],
        offerTypes: [],
        companies: []
      },
      currentFilters: {},
      currentRoute: '/7ag-tours',
      pageContents: {}
    });
  }
});

app.get("/ramadan-tours", async (req, res) => {
  try {
    const title = "رحلات رمضان";
    
    // Fetch page content for headers
    const pageContentList = await PageContent.find({ isActive: true });
    const pageContents = {};
    pageContentList.forEach(content => {
      pageContents[content.contentType] = content.content;
    });
    
    // Get filter parameters from query
    const filters = { 
      type: 'ramadan',
      $or: [
        { createdBy: 'admin' },
        { createdBy: 'partner', isApproved: true }
      ]
    }; // Only show approved ramadan type cards
    const {
      going_route,
      hotel_type,
      min_price,
      max_price,
      days,
      nights,
      plane_company,
      travel_date_from,
      travel_date_to,
      offer_type,
      company
    } = req.query;
    
    // Build filter object (type is fixed to 'ramadan')
    if (going_route) filters.going_route = new RegExp(going_route, 'i');
    if (hotel_type) filters['plane.hotel.hotel_type'] = hotel_type;
    if (plane_company) filters.plane_company = new RegExp(plane_company, 'i');
    appendCompanySearchFilter(filters, company);
    if (days) filters.days = parseInt(days);
    if (nights) filters.nights = parseInt(nights);
    if (offer_type) filters.offer_type = offer_type;
    
    // Price range filter
    if (min_price || max_price) {
      filters.lowest_price = {};
      if (min_price) filters.lowest_price.$gte = parseInt(min_price);
      if (max_price) filters.lowest_price.$lte = parseInt(max_price);
    }
    
    // Date range filter
    if (travel_date_from || travel_date_to) {
      filters.travel_date = {};
      if (travel_date_from) filters.travel_date.$gte = new Date(travel_date_from);
      if (travel_date_to) filters.travel_date.$lte = new Date(travel_date_to);
    }
    
    // Fetch filtered cards (only ramadan type)
    // Sort by: 1) displayOrder (admin override), 2) travel_date (soonest first), 3) createdAt (newest first)
    const cards = await Card.find(filters).sort({ displayOrder: 1, travel_date: 1, createdAt: -1 });
    
    // Get unique values for filter options (only from approved ramadan cards)
    const allRamadanCards = await Card.find({ 
      type: 'ramadan',
      $or: [
        { createdBy: 'admin' },
        { createdBy: 'partner', isApproved: true }
      ]
    });
    const filterOptions = {
      routes: [...new Set(allRamadanCards.map(card => card.going_route))],
      hotelTypes: [...new Set(allRamadanCards.flatMap(card => card.plane.hotel.map(h => h.hotel_type)))],
      airlines: [...new Set(allRamadanCards.map(card => card.plane_company))],
      dayOptions: [...new Set(allRamadanCards.map(card => card.days))].sort((a, b) => a - b),
      nightOptions: [...new Set(allRamadanCards.map(card => card.nights))].sort((a, b) => a - b),
      offerTypes: [...new Set(allRamadanCards.map(card => card.offer_type).filter(Boolean))],
      companies: extractUniqueCompanies(allRamadanCards)
    };
    
    res.render("bundles", { 
      user: req.user, 
      title,
      cards,
      filterOptions,
      currentFilters: req.query,
      currentRoute: '/ramadan-tours',
      pageContents
    });
  } catch (error) {
    console.error('Error fetching ramadan tours data:', error);
    res.render("bundles", { 
      user: req.user,
      title: "رحلات رمضان",
      cards: [],
      filterOptions: {
        routes: [],
        hotelTypes: [],
        airlines: [],
        dayOptions: [],
        nightOptions: [],
        offerTypes: [],
        companies: []
      },
      currentFilters: {},
      currentRoute: '/ramadan-tours',
      pageContents: {}
    });
  }
});
app.get("/bundles/:id", catchAsync(async (req, res, next) => {
  const cardId = req.params.id;
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(cardId)) {
    return next(new AppError('معرف الباقة غير صحيح', 400));
  }
  
  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('الباقة غير موجودة', 404));
  }
  
  // Check if card is approved (except for admins and the partner who created it)
  if (card.createdBy === 'partner' && !card.isApproved) {
    // Allow access only to admin or the partner who created it
    if (!req.user || (req.user.role !== 'admin' && card.partnerId.toString() !== req.user._id.toString())) {
      return next(new AppError('هذه الباقة في انتظار الموافقة', 403));
    }
  }
  
  const title = `تفاصيل الباقة - ${card.code}`;
  res.render("bundle-details", { user: req.user, title, card, currentRoute: '/bundles' });
}));

// Add route for /card/:id for compatibility with existing links
app.get("/card/:id", catchAsync(async (req, res, next) => {
  const cardId = req.params.id;
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(cardId)) {
    return next(new AppError('معرف الباقة غير صحيح', 400));
  }
  
  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('الباقة غير موجودة', 404));
  }
  
  // Check if card is approved (except for admins and the partner who created it)
  if (card.createdBy === 'partner' && !card.isApproved) {
    // Allow access only to admin or the partner who created it
    if (!req.user || (req.user.role !== 'admin' && card.partnerId.toString() !== req.user._id.toString())) {
      return next(new AppError('هذه الباقة في انتظار الموافقة', 403));
    }
  }
  
  const title = `تفاصيل الباقة - ${card.code}`;
  res.render("bundle-details", { user: req.user, title, card, currentRoute: '/bundles' });
}));

// Compare route
app.get("/compare", catchAsync(async (req, res, next) => {
  const cardIds = req.query.cards ? req.query.cards.split(',') : [];
  
  // Validate and filter valid ObjectId formats
  const validCardIds = cardIds.filter(id => mongoose.Types.ObjectId.isValid(id));
  
  if (validCardIds.length === 0) {
    return res.redirect('/bundles');
  }
  
  // Fetch cards by IDs
  const cards = await Card.find({
    _id: { $in: validCardIds },
    $or: [
      { createdBy: 'admin' },
      { createdBy: 'partner', isApproved: true }
    ]
  }).sort({ displayOrder: 1, travel_date: 1, createdAt: -1 });
  
  if (cards.length === 0) {
    return res.redirect('/bundles');
  }
  
  const title = "مقارنة الباقات";
  res.render("compare", { 
    user: req.user, 
    title, 
    cards,
    currentRoute: '/compare'
  });
}));

// API endpoint for available cards (for comparison)
app.get("/api/cards/available", catchAsync(async (req, res) => {
  const { type, exclude = '', limit } = req.query;
  const now = new Date();
  const baseFilter = {
    $or: [
      { createdBy: 'admin' },
      { createdBy: 'partner', isApproved: true }
    ],
    $and: [
      {
        $or: [
          { offer_expiry_date: { $exists: false } },
          { offer_expiry_date: { $gte: now } }
        ]
      },
      {
        $or: [
          { travel_date: { $exists: false } },
          { travel_date: { $gte: now } }
        ]
      }
    ]
  };

  if (type) {
    baseFilter.type = type;
  }

  const excludeIds = exclude
    .split(',')
    .map((id) => id.trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (excludeIds.length) {
    baseFilter._id = { $nin: excludeIds };
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 300);

  const cards = await Card.find(baseFilter)
    .select('_id code offer_type lowest_price thumbnail type travel_date days')
    .sort({ displayOrder: 1, travel_date: 1, createdAt: -1 })
    .limit(parsedLimit);
  
  res.json(cards);
}));

app.get("/contact", (req, res) => {
  const title = "اتصل بنا";
  res.render("contact", { user: req.user, title, currentRoute: '/contact' });
});

// Partner routes
app.get("/partner", async (req, res) => {
  try {
    const title = "شريك سياحي";
    const tierLimits = await PartnerTierLimits.getSingleton();
    res.render("partner", { user: req.user, title, currentRoute: '/partner', tierLimits });
  } catch (error) {
    console.error('Partner page error:', error);
    // Fallback with default values
    const tierLimits = { basic: 5, professional: 15, premium: -1 };
    res.render("partner", { user: req.user, title: "شريك سياحي", currentRoute: '/partner', tierLimits });
  }
});

app.get("/partner-signup", (req, res) => {
  const title = "تسجيل شريك سياحي";
  const selectedPackage = req.query.package || 'professional';
  res.render("partner-signup", { 
    user: req.user, 
    title, 
    selectedPackage,
    currentRoute: '/partner-signup'
  });
});

app.post("/partner-signup", upload.array('companyDocs'), validateSchema(partnerSignupSchema), catchAsync(async (req, res) => {
  const { 
    companyName, 
    companyCode,
    companyRepresentative, 
    phoneNumber, 
    password, 
    confirmPassword, 
    partnerPackage,
    branches,
    address1,
    address2,
    phoneNumbers
  } = req.body;
  
  try {
    // Debug: Log all received data
    console.log('Full req.body:', req.body);
    console.log('partnerPackage value:', partnerPackage);
    
    // Check if company documents are uploaded
    if (!req.files || req.files.length === 0) {
      req.flash('error', 'رفع أوراق الشركة مطلوب');
      return res.redirect('/partner-signup?package=' + (partnerPackage || 'professional'));
    }

    // Handle company documents
    let companyDocs = [];
    if (req.files && req.files.length > 0) {
      companyDocs = req.files.map(file => file.path || file.filename);
    }

    // Create username from company name
    const username = companyName.trim();

    const trimmedCompanyCode = (companyCode || '').trim();
    const trimmedCompanyName = (companyName || '').trim();

    const [codeConflict, nameConflict] = await Promise.all([
      trimmedCompanyCode ? User.findOne({ role: 'partner', companyCode: { $regex: buildExactMatchRegex(trimmedCompanyCode) } }) : null,
      trimmedCompanyName ? User.findOne({ role: 'partner', companyName: { $regex: buildExactMatchRegex(trimmedCompanyName) } }) : null
    ]);

    if (codeConflict) {
      req.flash('error', 'كود الشركة مسجل بالفعل. يرجى استخدام كود مختلف أو التواصل مع الدعم.');
      return res.redirect('/partner-signup?package=' + (partnerPackage || 'professional'));
    }

    if (nameConflict) {
      req.flash('error', 'اسم الشركة مستخدم بالفعل. يرجى التأكد من عدم امتلاكك حساباً سابقاً.');
      return res.redirect('/partner-signup?package=' + (partnerPackage || 'professional'));
    }
    
    const newUser = new User({
      username,
      phoneNumber,
      role: 'partner',
      companyName,
      companyCode,
      companyRepresentative,
      partnerPackage,
      branches,
      address1,
      address2,
      phoneNumbers,
      companyDocs,
      isVerified: false
    });

    await User.register(newUser, password);
    
    req.flash('success', 'تم إنشاء حساب الشريك بنجاح! يرجى تسجيل الدخول.');
    res.redirect('/login');
  } catch (error) {
    console.error('Partner signup error:', error);
    
    if (error.name === 'UserExistsError') {
      req.flash('error', 'رقم الهاتف مستخدم بالفعل');
    } else {
      req.flash('error', 'حدث خطأ أثناء إنشاء الحساب');
    }
    
    res.redirect('/partner-signup?package=' + (partnerPackage || 'professional'));
  }
}));

// Partner dashboard (requires login and partner role)
function isPartner(req, res, next) {
  if (!req.isAuthenticated()) {
    req.flash('error_msg', 'يجب تسجيل الدخول أولاً');
    return res.redirect('/login');
  }
  
  if (req.user.role !== 'partner') {
    req.flash('error_msg', 'غير مسموح بالوصول لهذه الصفحة');
    return res.redirect('/');
  }
  
  next();
}

app.get("/partner-dashboard", isPartner, async (req, res) => {
  try {
    const title = "لوحة تحكم الشريك";
    
    // Get partner statistics
    const partnerId = req.user._id;
    const [
      totalTrips,
      totalBookings,
      pendingTrips,
      totalRevenue
    ] = await Promise.all([
      Card.countDocuments({ partnerId }),
      Reserve.countDocuments({ 
        card: { $in: await Card.find({ partnerId }).select('_id') }
      }),
      Card.countDocuments({ partnerId, isApproved: false }),
      Reserve.aggregate([
        {
          $lookup: {
            from: 'cards',
            localField: 'card',
            foreignField: '_id',
            as: 'cardDetails'
          }
        },
        {
          $match: {
            'cardDetails.partnerId': partnerId,
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ])
    ]);
    
    // Get partner's cards
    const partnerCards = await Card.find({ partnerId })
      .sort({ displayOrder: 1, travel_date: 1, createdAt: -1 })
      .populate('approvedBy', 'username');
    
    // Get partner's reservations
    const partnerReservations = await Reserve.find({
      card: { $in: await Card.find({ partnerId }).select('_id') }
    })
      .populate('user', 'username email phone')
      .populate('card', 'title price images location')
      .sort({ currentDate: -1 });

    // Get tier limits for dynamic display
    const tierLimits = await PartnerTierLimits.getSingleton();

    res.render("partner-dashboard", { 
      user: req.user, 
      title, 
      currentRoute: '/partner-dashboard',
      stats: {
        totalTrips,
        totalBookings,
        pendingTrips,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
      },
      partnerCards,
      partnerReservations,
      tierLimits
    });
  } catch (error) {
    console.error('Partner dashboard error:', error);
    req.flash('error_msg', 'حدث خطأ أثناء تحميل لوحة التحكم');
    
    // Get tier limits for error fallback as well
    const tierLimits = await PartnerTierLimits.getSingleton();
    
    res.render("partner-dashboard", { 
      user: req.user, 
      title: "لوحة تحكم الشريك", 
      currentRoute: '/partner-dashboard',
      stats: { totalTrips: 0, totalBookings: 0, pendingTrips: 0, totalRevenue: 0 },
      partnerCards: [],
      partnerReservations: [],
      tierLimits
    });
  }
});

// Partner card management routes
app.post("/partner/add-card", isPartner, upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), catchAsync(async (req, res) => {
  // Check if partner is verified
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: "يجب أن يكون حسابك محققاً لإضافة رحلات"
    });
  }
  
  // Check package limits
  const currentCardCount = await Card.countDocuments({ partnerId: req.user._id });
  const tierLimits = await PartnerTierLimits.getSingleton();
  
  let limit;
  switch (req.user.partnerPackage) {
    case 'basic':
      limit = tierLimits.basic;
      break;
    case 'professional':
      limit = tierLimits.professional;
      break;
    case 'premium':
      limit = tierLimits.premium === -1 ? Infinity : tierLimits.premium;
      break;
    default:
      limit = tierLimits.basic; // fallback to basic
  }
  if (currentCardCount >= limit) {
    return res.status(403).json({
      success: false,
      message: `لقد وصلت للحد الأقصى من الرحلات في باقتك (${limit === Infinity ? 'غير محدود' : limit})`
    });
  }
  
  try {
    // Parse arrays from form data with normalization
    const included_services = normalizeArrayField(req.body.included_services);
    const not_included_services = normalizeArrayField(req.body.not_included_services);
    const notes = normalizeArrayField(req.body.notes);
    const cancelling_rules = normalizeArrayField(req.body.cancelling_rules);

    req.body.included_services = included_services;
    req.body.not_included_services = not_included_services;
    req.body.notes = notes;
    req.body.cancelling_rules = cancelling_rules;

    // Validate card data using the cardCreationSchema
    const { error, value } = cardCreationSchema.validate(req.body, {
      allowUnknown: true, // Allow additional fields like arrays
      stripUnknown: false
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: "فشل في التحقق من صحة البيانات: " + errorMessages.join(', ')
      });
    }
    
    // Parse hotel and housing data
    const hotels = JSON.parse(req.body.hotels || '[]');
    const housingOptions = JSON.parse(req.body.housingOptions || '[]');
    
    // Handle file uploads (thumbnails and gallery images are required)
    const thumbnail = (req.files.thumbnail && req.files.thumbnail[0]?.path)
      ? req.files.thumbnail[0].path
      : null;
    
    const images = req.files.images ? req.files.images.map(file => file.path) : [];
    
    if (!thumbnail) {
      return res.status(400).json({
        success: false,
        message: "الصورة الرئيسية مطلوبة"
      });
    }

    if (!images.length) {
      return res.status(400).json({
        success: false,
        message: "يجب إضافة صورة واحدة على الأقل في معرض الرحلة"
      });
    }
    
    // Calculate lowest price from housing options
    const lowest_price = housingOptions.length > 0 
      ? Math.min(...housingOptions.map(option => option.price))
      : 0;
    
    // Create the card
    const cardData = {
      ...req.body,
      included_services,
      not_included_services,
      notes,
      cancelling_rules,
      plane: {
        hotel: hotels,
        housingOptions
      },
      thumbnail,
      images,
      lowest_price,
      partnerId: req.user._id,
      createdBy: 'partner',
      isApproved: false // Partner cards require approval
    };
    
    const newCard = new Card(cardData);
    await newCard.save();
    
    res.json({
      success: true,
      message: "تم إرسال الرحلة للمراجعة بنجاح",
      cardId: newCard._id
    });
    
  } catch (error) {
    console.error('Partner card creation error:', error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إضافة الرحلة: " + error.message
    });
  }
}));

app.delete("/partner/delete-card/:id", isPartner, catchAsync(async (req, res) => {
  try {
    const card = await Card.findOne({ 
      _id: req.params.id, 
      partnerId: req.user._id 
    });
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "الرحلة غير موجودة"
      });
    }
    
    // Check if card has active reservations
    const activeReservations = await Reserve.countDocuments({ 
      card: card._id, 
      paymentStatus: { $in: ['paid', 'pending'] }
    });
    
    if (activeReservations > 0) {
      return res.status(400).json({
        success: false,
        message: "لا يمكن حذف رحلة لها حجوزات نشطة"
      });
    }
    
    await Card.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: "تم حذف الرحلة بنجاح"
    });
    
  } catch (error) {
    console.error('Partner card deletion error:', error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف الرحلة"
    });
  }
}));

app.get("/partner/card-stats", isPartner, catchAsync(async (req, res) => {
  try {
    const partnerId = req.user._id;
    
    const [
      totalTrips,
      approvedTrips,
      pendingTrips,
      totalBookings,
      totalRevenue
    ] = await Promise.all([
      Card.countDocuments({ partnerId }),
      Card.countDocuments({ partnerId, isApproved: true }),
      Card.countDocuments({ partnerId, isApproved: false }),
      Reserve.countDocuments({ 
        card: { $in: await Card.find({ partnerId }).select('_id') }
      }),
      Reserve.aggregate([
        {
          $lookup: {
            from: 'cards',
            localField: 'card',
            foreignField: '_id',
            as: 'cardDetails'
          }
        },
        {
          $match: {
            'cardDetails.partnerId': partnerId,
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ])
    ]);
    
    // Get dynamic tier limits
    const tierLimits = await PartnerTierLimits.getSingleton();
    let packageLimit;
    switch (req.user.partnerPackage) {
      case 'basic':
        packageLimit = tierLimits.basic;
        break;
      case 'professional':
        packageLimit = tierLimits.professional;
        break;
      case 'premium':
        packageLimit = tierLimits.premium === -1 ? 'غير محدود' : tierLimits.premium;
        break;
      default:
        packageLimit = tierLimits.basic;
    }

    res.json({
      totalTrips,
      approvedTrips,
      pendingTrips,
      totalBookings,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      packageLimit
    });
  } catch (error) {
    console.error('Partner stats error:', error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الإحصائيات"
    });
  }
}));

// Partner API routes
app.get("/api/partner/stats", isPartner, catchAsync(async (req, res) => {
  const partnerId = req.user._id;
  
  try {
    const [
      totalTrips,
      totalBookings,
      pendingTrips,
      totalRevenue,
      pendingReservations,
      confirmedReservations,
      rejectedReservations
    ] = await Promise.all([
      Card.countDocuments({ partnerId }),
      Reserve.countDocuments({ 
        card: { $in: await Card.find({ partnerId }).select('_id') }
      }),
      Card.countDocuments({ partnerId, isApproved: false }),
      Reserve.aggregate([
        {
          $lookup: {
            from: 'cards',
            localField: 'card',
            foreignField: '_id',
            as: 'cardDetails'
          }
        },
        {
          $match: {
            'cardDetails.partnerId': partnerId,
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ]),
      Reserve.countDocuments({
        card: { $in: await Card.find({ partnerId }).select('_id') },
        partnerStatus: 'pending'
      }),
      Reserve.countDocuments({
        card: { $in: await Card.find({ partnerId }).select('_id') },
        partnerStatus: 'confirmed'
      }),
      Reserve.countDocuments({
        card: { $in: await Card.find({ partnerId }).select('_id') },
        partnerStatus: 'rejected'
      })
    ]);
    
    res.json({
      totalTrips,
      totalBookings,
      pendingTrips,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      pendingReservations,
      confirmedReservations,
      rejectedReservations
    });
  } catch (error) {
    console.error('Partner stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ أثناء تحميل الإحصائيات',
      stats: {
        totalTrips: 0,
        totalBookings: 0,
        pendingTrips: 0,
        totalRevenue: 0,
        pendingReservations: 0,
        confirmedReservations: 0,
        rejectedReservations: 0
      }
    });
  }
}));

// Partner reports API
app.get("/api/partner/reports", isPartner, catchAsync(async (req, res) => {
  const partnerId = req.user._id;
  
  try {
    // Get partner's cards
    const partnerCardIds = await Card.find({ partnerId }).select('_id');
    const cardIds = partnerCardIds.map(card => card._id);
    
    // Monthly revenue data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRevenue = await Reserve.aggregate([
      {
        $match: {
          card: { $in: cardIds },
          paymentStatus: 'paid',
          currentDate: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$currentDate' },
            month: { $month: '$currentDate' }
          },
          revenue: { $sum: '$totalAmount' },
          bookings: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    // Top performing trips
    const topTrips = await Reserve.aggregate([
      {
        $match: {
          card: { $in: cardIds },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: '$card',
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'cards',
          localField: '_id',
          foreignField: '_id',
          as: 'cardDetails'
        }
      },
      {
        $unwind: '$cardDetails'
      },
      {
        $sort: { bookings: -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    // Booking status distribution
    const bookingStatusStats = await Reserve.aggregate([
      {
        $match: {
          card: { $in: cardIds }
        }
      },
      {
        $group: {
          _id: '$partnerStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Payment status distribution
    const paymentStatusStats = await Reserve.aggregate([
      {
        $match: {
          card: { $in: cardIds }
        }
      },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Recent activity (last 10 reservations)
    const recentActivity = await Reserve.find({
      card: { $in: cardIds }
    })
      .populate('card', 'code title')
      .populate('user', 'username')
      .sort({ currentDate: -1 })
      .limit(10);
    
    // Trip type performance
    const tripTypeStats = await Card.aggregate([
      {
        $match: { partnerId }
      },
      {
        $lookup: {
          from: 'reserves',
          localField: '_id',
          foreignField: 'card',
          as: 'reservations'
        }
      },
      {
        $group: {
          _id: '$type',
          trips: { $sum: 1 },
          bookings: { $sum: { $size: '$reservations' } }
        }
      }
    ]);
    
    res.json({
      monthlyRevenue,
      topTrips,
      bookingStatusStats,
      paymentStatusStats,
      recentActivity,
      tripTypeStats
    });
  } catch (error) {
    console.error('Partner reports error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ أثناء تحميل التقارير'
    });
  }
}));

app.get("/profile", isLoggedIn, (req, res) => {
  const title = "الملف الشخصي";
  res.render("profile", { user: req.user, title, currentRoute: '/profile' });
});

// API routes for profile page
app.get("/api/user/stats", isLoggedIn, catchAsync(async (req, res) => {
  const userId = req.user._id;
  
  const totalReservations = await Reserve.countDocuments({ user: userId });
  const totalPaid = await Reserve.countDocuments({ user: userId, paymentStatus: 'paid' });
  
  res.json({
    totalReservations,
    totalPaid
  });
}));

// Profile image upload endpoint
app.post("/api/user/profile-image", isLoggedIn, upload.single('profileImage'), catchAsync(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يتم تحديد ملف للرفع' });
    }

    const userId = req.user._id;
    const profileImageUrl = req.file.path; // Cloudinary URL

    // Update user's profile image
    await User.findByIdAndUpdate(userId, { profileImage: profileImageUrl });

    res.json({
      success: true,
      message: 'تم تحديث صورة الملف الشخصي بنجاح',
      profileImageUrl: profileImageUrl
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء رفع الصورة' });
  }
}));

// Change password endpoint
app.post("/api/user/change-password", isLoggedIn, catchAsync(async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const userIP = req.ip || req.connection.remoteAddress;
    const rateLimitKey = `${userId}-${userIP}`;
    
    // Rate limiting: Max 5 attempts per hour
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    if (!passwordChangeAttempts.has(rateLimitKey)) {
      passwordChangeAttempts.set(rateLimitKey, []);
    }
    
    const attempts = passwordChangeAttempts.get(rateLimitKey).filter(time => time > oneHourAgo);
    
    if (attempts.length >= 5) {
      return res.status(429).json({ 
        success: false, 
        message: 'تم تجاوز الحد المسموح من المحاولات. يرجى المحاولة بعد ساعة' 
      });
    }
    
    // Add current attempt
    attempts.push(now);
    passwordChangeAttempts.set(rateLimitKey, attempts);
    
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'جميع الحقول مطلوبة' 
      });
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'كلمة المرور الجديدة وتأكيدها غير متطابقتين' 
      });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' 
      });
    }

    // Additional password strength requirements
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    
    if (newPassword.length >= 8 && !(hasUpperCase && hasLowerCase && hasNumbers)) {
      return res.status(400).json({ 
        success: false, 
        message: 'كلمة المرور يجب أن تحتوي على حروف كبيرة وصغيرة وأرقام للحصول على حماية أفضل' 
      });
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية' 
      });
    }

    const user = await User.findById(userId);

    // Verify current password using passport-local-mongoose
    user.authenticate(currentPassword, (err, thisUser, passwordErr) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'حدث خطأ في التحقق من كلمة المرور' 
        });
      }

      if (!thisUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'كلمة المرور الحالية غير صحيحة' 
        });
      }

      // Change password using passport-local-mongoose
      user.setPassword(newPassword, async (err) => {
        if (err) {
          console.error('Set password error:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ أثناء تغيير كلمة المرور' 
          });
        }

        try {
          await user.save();
          
          // Clear rate limit attempts on successful change
          passwordChangeAttempts.delete(rateLimitKey);
          
          // Log password change for security
          console.log(`Password changed successfully for user: ${user.username} (${userId})`);
          
          res.json({
            success: true,
            message: 'تم تغيير كلمة المرور بنجاح'
          });
        } catch (saveErr) {
          console.error('Error saving user after password change:', saveErr);
          res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ أثناء حفظ كلمة المرور الجديدة' 
          });
        }
      });
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ غير متوقع' 
    });
  }
}));

app.get("/api/user/reservations", isLoggedIn, catchAsync(async (req, res) => {
  const userId = req.user._id;
  
  const reservations = await Reserve.find({ user: userId })
    .populate('card', 'code type days nights title')
    .sort({ createdAt: -1 })
    .limit(10);
  
  res.json({
    reservations
  });
}));

// Favorites API routes
app.get("/api/user/favorites", isLoggedIn, catchAsync(async (req, res) => {
  const userId = req.user._id;
  
  const user = await User.findById(userId).populate('favorites');
  
  res.json({
    favorites: user.favorites || []
  });
}));

app.get('/api/mobile/bundles/overview', catchAsync(async (req, res) => {
  const now = new Date();
  const activeCardFilter = { offer_expiry_date: { $gte: now } };
  const upcomingTravelFilter = { travel_date: { $gte: now } };

  const fetchClosestCards = async (baseFilter, limit, excludeIds = []) => {
    const sanitizedExclude = (excludeIds || []).filter(Boolean);
    const upcomingFilter = {
      ...baseFilter,
      ...upcomingTravelFilter,
      ...(sanitizedExclude.length ? { _id: { $nin: sanitizedExclude } } : {})
    };

    let cards = await Card.find(upcomingFilter)
      .sort(BUNDLE_SORT)
      .limit(limit);

    const remaining = limit - cards.length;
    if (remaining > 0) {
      const fallbackExclude = [...sanitizedExclude, ...cards.map((card) => card?._id).filter(Boolean)];
      const fallbackFilter = {
        ...baseFilter,
        ...(fallbackExclude.length ? { _id: { $nin: fallbackExclude } } : {})
      };

      const fallbackCards = await Card.find(fallbackFilter)
        .sort(BUNDLE_SORT)
        .limit(remaining);

      cards = cards.concat(fallbackCards);
    }

    return cards;
  };

  const highlightedOmrah = await fetchClosestCards(
    { type: 'omrah', ...PUBLIC_CARD_FILTER, ...activeCardFilter },
    2
  );
  const highlightedHajj = await fetchClosestCards(
    { type: '7ag', ...PUBLIC_CARD_FILTER, ...activeCardFilter },
    1
  );

  const omrahCards = [...highlightedOmrah, ...highlightedHajj];

  if (omrahCards.length < 3) {
    const excludeIds = omrahCards.map((card) => card?._id).filter(Boolean);
    const filler = await fetchClosestCards(
      {
        type: { $in: ['omrah', '7ag'] },
        ...PUBLIC_CARD_FILTER,
        ...activeCardFilter
      },
      3 - omrahCards.length,
      excludeIds
    );
    omrahCards.push(...filler);
  }

  const [internalTourCards, externalTourCards, ramadanCards, partnerBanners, heroMediaDocs, sectionContentList, pageContentList, partnerLogosDoc, testimonialsDoc] = await Promise.all([
    fetchClosestCards({ type: 'internal_tour', ...PARTNER_APPROVED_FILTER, ...activeCardFilter }, 3),
    fetchClosestCards({ type: 'external_tour', ...PARTNER_APPROVED_FILTER, ...activeCardFilter }, 3),
    fetchClosestCards({ type: 'ramadan', ...PUBLIC_CARD_FILTER, ...activeCardFilter }, 3),
    PartnerBanner.getActiveBanners(),
    HeroMedia.find({ isActive: true }).sort({ order: 1, createdAt: -1 }),
    SectionContent.find({ isActive: true }),
    PageContent.find({ isActive: true }),
    PartnerLogos.findOne(),
    Testimonials.getSingleton()
  ]);

  const sectionContents = {};
  sectionContentList.forEach((section) => {
    sectionContents[section.sectionType] = section;
  });

  const pageContents = {};
  pageContentList.forEach((content) => {
    pageContents[content.contentType] = content.content;
  });

  const bundleSections = [
    {
      type: 'omrah',
      title: sectionContents.omrah?.title || pageContents.omrah_title || 'باقات العمرة',
      description:
        sectionContents.omrah?.description ||
        pageContents.omrah_description ||
        'رحلات عمرة مريحة بخيارات متنوعة تناسب كل الميزانيات.',
      seeMoreLabel: pageContents.omrah_button_text || pageContents.view_more_text || 'عرض المزيد',
      cards: omrahCards.map(serializeCardForClient).filter(Boolean)
    },
    {
      type: 'internal_tour',
      title:
        sectionContents.internal_tours?.title ||
        pageContents.internal_tours_title ||
        'الرحلات الداخلية',
      description:
        sectionContents.internal_tours?.description ||
        pageContents.internal_tours_description ||
        'اكتشف العروض الداخلية المصممة بعناية لرحلة متكاملة.',
      seeMoreLabel:
        pageContents.internal_tours_button_text || pageContents.view_more_text || 'عرض المزيد',
      cards: internalTourCards.map(serializeCardForClient).filter(Boolean)
    },
    {
      type: 'external_tour',
      title:
        sectionContents.external_tours?.title ||
        pageContents.external_tours_title ||
        'الرحلات الخارجية',
      description:
        sectionContents.external_tours?.description ||
        pageContents.external_tours_description ||
        'رحلات خارجية تجمع بين الراحة والاستكشاف بأسعار مميزة.',
      seeMoreLabel:
        pageContents.external_tours_button_text || pageContents.view_more_text || 'عرض المزيد',
      cards: externalTourCards.map(serializeCardForClient).filter(Boolean)
    },
    {
      type: 'ramadan',
      title:
        sectionContents.ramadan?.title ||
        pageContents.ramadan_title ||
        'باقات رمضانية خاصة',
      description:
        sectionContents.ramadan?.description ||
        pageContents.ramadan_description ||
        'استفد من برامج عمرة رمضان المصممة بروحانية عالية وخدمات مميزة.',
      seeMoreLabel:
        pageContents.ramadan_button_text || pageContents.view_more_text || 'عرض المزيد',
      cards: ramadanCards.map(serializeCardForClient).filter(Boolean)
    }
  ];

  const partnerBanner = partnerBanners && partnerBanners.length > 0 ? partnerBanners[0] : null;

  const hero = {
    title: pageContents.hero_title || 'دعنا نصحبك في رحلة لا تُنسى',
    description:
      pageContents.hero_description ||
      'ابدأ رحلتك إلى مكة المكرمة معنا واستمتع بباقات متكاملة وخدمات استثنائية.',
    buttonText: pageContents.hero_button_text || 'تواصل معنا',
    media: heroMediaDocs.map((media) => ({
      id: media._id,
      type: media.type,
      url: media.url,
      thumbnail: media.thumbnailUrl,
      order: media.order
    }))
  };

  const testimonials = (testimonialsDoc?.reviews || []).map((review) => ({
    id: review._id || review.id,
    name: review.name,
    company: review.company,
    rating: review.rating,
    text: review.text,
    createdAt: review.createdAt
  }));

  res.json({
    success: true,
    hero,
    partnerBanner: partnerBanner
      ? {
          title: partnerBanner.title,
          backgroundImage: partnerBanner.backgroundImage,
          logoText: partnerBanner.logoText,
          logoSubtext: partnerBanner.logoSubtext
        }
      : null,
    partnerLogos: partnerLogosDoc?.images || [],
    bundleSections,
    testimonials
  });
}));

app.get('/api/mobile/bundles', validateSchema(mobileBundlesQuerySchema, 'query'), catchAsync(async (req, res) => {
  const allowedTypes = ['omrah', 'internal_tour', 'external_tour', '7ag', 'ramadan'];
  const {
    type: requestedType,
    going_route,
    plane_company,
    min_price,
    max_price,
    days,
    nights,
    offer_type,
    travel_date_from,
    travel_date_to,
    show_expired,
    show_past_travel,
    company,
    include_details,
    limit: queryLimit,
    page: queryPage
  } = req.query;

  if (!allowedTypes.includes(requestedType)) {
    return res.status(400).json({ success: false, message: 'نوع الباقة غير مدعوم' });
  }

  const now = new Date();
  const filters = {
    type: requestedType,
    ...PUBLIC_CARD_FILTER
  };

  if (!show_expired) {
    filters.offer_expiry_date = { $gte: now };
  }

  const travelDateFilter = {};
  if (travel_date_from) {
    travelDateFilter.$gte = travel_date_from;
  }
  if (travel_date_to) {
    travelDateFilter.$lte = travel_date_to;
  }
  if (!travel_date_from && !travel_date_to && !show_past_travel) {
    travelDateFilter.$gte = now;
  }
  if (Object.keys(travelDateFilter).length > 0) {
    filters.travel_date = travelDateFilter;
  }

  if (going_route) {
    filters.going_route = new RegExp(going_route, 'i');
  }
  if (plane_company) {
    filters.plane_company = new RegExp(plane_company, 'i');
  }
  if (typeof days === 'number') {
    filters.days = days;
  }
  if (typeof nights === 'number') {
    filters.nights = nights;
  }
  if (offer_type) {
    filters.offer_type = offer_type;
  }

  if (min_price !== undefined || max_price !== undefined) {
    const priceFilter = {};
    if (min_price !== undefined) {
      priceFilter.$gte = min_price;
    }
    if (max_price !== undefined) {
      priceFilter.$lte = max_price;
    }
    if (Object.keys(priceFilter).length > 0) {
      filters.lowest_price = priceFilter;
    }
  }

  appendCompanySearchFilter(filters, company);

  const limit = Math.min(queryLimit, 50);
  const page = queryPage;
  const skip = (page - 1) * limit;

  const [cards, total, allTypeCards] = await Promise.all([
    Card.find(filters).sort(BUNDLE_SORT).skip(skip).limit(limit),
    Card.countDocuments(filters),
    Card.find({ type: requestedType, ...PUBLIC_CARD_FILTER }).select(
      'going_route plane plane_company lowest_price days nights offer_type travel_date'
    )
  ]);

  const filterOptions = {
    routes: [...new Set(allTypeCards.map((card) => card.going_route).filter(Boolean))],
    airlines: [...new Set(allTypeCards.map((card) => card.plane_company).filter(Boolean))],
    dayOptions: [...new Set(allTypeCards.map((card) => card.days).filter(Boolean))].sort((a, b) => a - b),
    nightOptions: [...new Set(allTypeCards.map((card) => card.nights).filter(Boolean))].sort((a, b) => a - b),
    offerTypes: [...new Set(allTypeCards.map((card) => card.offer_type).filter(Boolean))],
    companies: extractUniqueCompanies(allTypeCards)
  };

  const includeDetails = Boolean(include_details);

  res.json({
    success: true,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    filterOptions,
    filtersApplied: req.query,
    cards: cards
      .map((card) => serializeCardForClient(card, { includeDetails }))
      .filter(Boolean)
  });
}));

app.get('/api/mobile/bundles/:cardId', validateSchema(mobileCardIdSchema, 'params'), catchAsync(async (req, res) => {
  const { cardId } = req.params;

  const card = await Card.findOne({ _id: cardId, ...PUBLIC_CARD_FILTER });

  if (!card) {
    return res.status(404).json({ success: false, message: 'لم يتم العثور على الباقة المطلوبة.' });
  }

  res.json({
    success: true,
    card: serializeCardForClient(card, { includeDetails: true })
  });
}));

app.post("/api/favorites/toggle/:cardId", isLoggedIn, catchAsync(async (req, res) => {
  const { cardId } = req.params;
  const userId = req.user._id;
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(cardId)) {
    return res.status(400).json({ success: false, message: 'معرف الباقة غير صحيح' });
  }
  
  // Check if card exists
  const card = await Card.findById(cardId);
  if (!card) {
    return res.status(404).json({ success: false, message: 'الباقة غير موجودة' });
  }
  
  const user = await User.findById(userId);
  const isFavorite = user.favorites.includes(cardId);
  
  if (isFavorite) {
    // Remove from favorites
    user.favorites = user.favorites.filter(id => id.toString() !== cardId);
    await user.save();
    res.json({ success: true, isFavorite: false, message: 'تم إزالة الباقة من المفضلة' });
  } else {
    // Add to favorites
    user.favorites.push(cardId);
    await user.save();
    res.json({ success: true, isFavorite: true, message: 'تم إضافة الباقة إلى المفضلة' });
  }
}));

app.get('/api/mobile/profile', isLoggedIn, catchAsync(async (req, res) => {
  const userId = req.user._id;

  const [userDoc, totalReservations, totalPaid, reservations] = await Promise.all([
    User.findById(userId)
      .populate({
        path: 'favorites',
        select: 'code type days nights lowest_price offer_type thumbnail travel_date'
      })
      .select('username phoneNumber role profileImage createdAt favorites'),
    Reserve.countDocuments({ user: userId }),
    Reserve.countDocuments({ user: userId, paymentStatus: 'paid' }),
    Reserve.find({ user: userId })
      .populate('card', 'code type days nights lowest_price offer_type travel_date')
      .sort({ currentDate: -1 })
      .limit(10)
  ]);

  if (!userDoc) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  const favorites = (userDoc.favorites || []).map((favorite) => ({
    id: favorite._id,
    code: favorite.code,
    type: favorite.type,
    days: favorite.days,
    nights: favorite.nights,
    lowestPrice: favorite.lowest_price,
    offerType: favorite.offer_type,
    travelDate: favorite.travel_date,
    thumbnail: favorite.thumbnail
  }));

  const reservationsPayload = reservations.map((reservation) => ({
    id: reservation._id,
    reservationNumber: reservation.reservationNumber,
    peopleCount: reservation.people_count,
    totalAmount: reservation.totalAmount,
    paymentStatus: reservation.paymentStatus,
    partnerStatus: reservation.partnerStatus,
    partnerNotes: reservation.partnerNotes || '',
    currentDate: reservation.currentDate,
    card: reservation.card
      ? {
          id: reservation.card._id,
          code: reservation.card.code,
          type: reservation.card.type,
          days: reservation.card.days,
          nights: reservation.card.nights,
          lowestPrice: reservation.card.lowest_price,
          offerType: reservation.card.offer_type,
          travelDate: reservation.card.travel_date
        }
      : null
  }));

  res.json({
    success: true,
    user: serializeUserForClient(userDoc),
    stats: {
      totalReservations,
      totalPaid,
      favoritesCount: favorites.length
    },
    reservations: reservationsPayload,
    favorites
  });
}));

app.delete('/api/mobile/profile',
  isLoggedIn,
  validateSchema(accountDeletionSchema),
  catchAsync(async (req, res) => {
    const { password, reason } = req.body;
    const userId = req.user._id;
    const authenticate = User.authenticate();

    const verifiedUser = await new Promise((resolve, reject) => {
      authenticate(req.user.phoneNumber, password, (err, user, passwordError) => {
        if (err) {
          return reject(err);
        }
        if (passwordError || !user) {
          return resolve(null);
        }
        return resolve(user);
      });
    });

    if (!verifiedUser) {
      return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة.' });
    }

    const viewerThreads = await CardChatThread.find({ viewer: userId }).select('_id');
    const threadIds = viewerThreads.map((thread) => thread._id);

    const [reservationResult, threadResult, messageResult] = await Promise.all([
      Reserve.deleteMany({ user: userId }),
      CardChatThread.deleteMany({ _id: { $in: threadIds } }),
      CardChatMessage.deleteMany({ $or: [{ sender: userId }, { thread: { $in: threadIds } }] })
    ]);

    await User.deleteOne({ _id: userId });

    const deletionMeta = {
      reservationsRemoved: reservationResult.deletedCount || 0,
      threadsRemoved: threadResult.deletedCount || 0,
      messagesRemoved: messageResult.deletedCount || 0,
      reason: reason || ''
    };

    await new Promise((resolve) => {
      req.logout(() => resolve());
    });

    if (req.session) {
      req.session.destroy(() => {});
    }

    res.clearCookie('connect.sid');

    res.json({
      success: true,
      message: 'تم حذف الحساب وجميع البيانات المرتبطة به.',
      meta: deletionMeta
    });
  })
);

app.post('/api/mobile/profile/delete',
  isLoggedIn,
  validateSchema(accountDeletionSchema),
  catchAsync(async (req, res) => {
    const { password, reason } = req.body;
    const userId = req.user._id;
    const authenticate = User.authenticate();

    const verifiedUser = await new Promise((resolve, reject) => {
      authenticate(req.user.phoneNumber, password, (err, user, passwordError) => {
        if (err) {
          return reject(err);
        }
        if (passwordError || !user) {
          return resolve(null);
        }
        return resolve(user);
      });
    });

    if (!verifiedUser) {
      return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة.' });
    }

    const viewerThreads = await CardChatThread.find({ viewer: userId }).select('_id');
    const threadIds = viewerThreads.map((thread) => thread._id);

    const [reservationResult, threadResult, messageResult] = await Promise.all([
      Reserve.deleteMany({ user: userId }),
      CardChatThread.deleteMany({ _id: { $in: threadIds } }),
      CardChatMessage.deleteMany({ $or: [{ sender: userId }, { thread: { $in: threadIds } }] })
    ]);

    await User.deleteOne({ _id: userId });

    const deletionMeta = {
      reservationsRemoved: reservationResult.deletedCount || 0,
      threadsRemoved: threadResult.deletedCount || 0,
      messagesRemoved: messageResult.deletedCount || 0,
      reason: reason || ''
    };

    await new Promise((resolve) => {
      req.logout(() => resolve());
    });

    if (req.session) {
      req.session.destroy(() => {});
    }

    res.clearCookie('connect.sid');

    res.json({
      success: true,
      message: 'تم حذف الحساب وجميع البيانات المرتبطة به.',
      meta: deletionMeta
    });
  })
);

app.get("/login", isNotLoggedIn,(req, res) => {
    const title = "تسجيل الدخول";
    res.render("login", { user: req.user, title, currentRoute: '/login' });
});

app.post('/api/mobile/login', validateSchema(userLoginSchema), (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      const message = info?.message || 'بيانات تسجيل الدخول غير صحيحة.';
      return res.status(401).json({ success: false, message });
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }

      return res.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        user: serializeUserForClient(user)
      });
    });
  })(req, res, next);
});

app.post('/api/mobile/logout', isLoggedIn, (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Mobile logout error:', err);
      return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تسجيل الخروج' });
    }

    res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  });
});

// Register Expo push token for mobile push notifications
app.post('/api/mobile/push-token', isLoggedIn, catchAsync(async (req, res) => {
  const { token, deviceId } = req.body;
  const userId = req.user._id;

  // Relaxed validation to allow ExpoPushToken or other valid formats
  if (!token || typeof token !== 'string' || token.length < 15) {
    return res.status(400).json({ success: false, message: 'Invalid push token format' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Initialize expoPushTokens array if not exists
  if (!user.expoPushTokens) {
    user.expoPushTokens = [];
  }

  // Remove existing token with same value or deviceId to avoid duplicates
  user.expoPushTokens = user.expoPushTokens.filter(
    (t) => t.token !== token && (!deviceId || t.deviceId !== deviceId)
  );

  // Add the new token
  user.expoPushTokens.push({ token, deviceId, createdAt: new Date() });

  // Keep only the last 5 tokens per user (for multiple devices)
  if (user.expoPushTokens.length > 5) {
    user.expoPushTokens = user.expoPushTokens.slice(-5);
  }

  await user.save();

  console.log(`[Push] Registered token for user ${userId}: ${token.slice(0, 30)}...`);
  res.json({ success: true, message: 'Push token registered' });
}));

// Remove Expo push token (e.g., on logout)
app.delete('/api/mobile/push-token', isLoggedIn, catchAsync(async (req, res) => {
  const { token } = req.body;
  const userId = req.user._id;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token required' });
  }

  await User.findByIdAndUpdate(userId, {
    $pull: { expoPushTokens: { token } }
  });

  console.log(`[Push] Removed token for user ${userId}`);
  res.json({ success: true, message: 'Push token removed' });
}));

// Debug endpoint to test push notifications (admin only)
app.post('/api/mobile/test-push', isLoggedIn, catchAsync(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).select('username role expoPushTokens');
  
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  console.log('[Push Test] User:', user.username, 'Tokens:', user.expoPushTokens?.length || 0);

  if (!user.expoPushTokens?.length) {
    return res.status(400).json({ 
      success: false, 
      message: 'No push tokens registered for this user',
      tokenCount: 0
    });
  }

  const tokens = user.expoPushTokens.map(t => t.token);
  console.log('[Push Test] Sending to tokens:', tokens);

  // Call Expo Push API directly
  const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title: '🔔 اختبار الإشعارات',
    body: 'إذا رأيت هذه الرسالة، الإشعارات تعمل بشكل صحيح!',
    data: { test: true }
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messages)
    });

    const result = await response.json();
    console.log('[Push Test] Expo API response:', JSON.stringify(result, null, 2));

    res.json({ 
      success: true, 
      message: 'Test push sent',
      tokenCount: tokens.length,
      expoResponse: result
    });
  } catch (error) {
    console.error('[Push Test] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
}));

app.get("/signup", isNotLoggedIn,(req, res) => {
    const title = "إنشاء حساب";
    res.render("signup", { user: req.user, title, currentRoute: '/signup' });
});

app.get('/privacy', (req, res) => {
  const title = 'سياسة الخصوصية';
  res.render('privacy', { user: req.user, title, currentRoute: '/privacy' });
});

app.post('/api/mobile/signup', validateSchema(userRegistrationSchema), async (req, res, next) => {
  try {
    const { username, phoneNumber, password } = req.body;

    const existingUser = await User.findOne({ phoneNumber }).lean();
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'هذا الرقم مسجل بالفعل. حاول تسجيل الدخول بدلاً من ذلك.'
      });
    }

    const user = new User({ username, phoneNumber, role: 'user' });
    const registeredUser = await User.register(user, password);

    await new Promise((resolve, reject) => {
      req.logIn(registeredUser, (err) => {
        if (err) return reject(err);
        return resolve();
      });
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب وتسجيل الدخول بنجاح',
      user: serializeUserForClient(registeredUser)
    });
  } catch (error) {
    if (error?.name === 'UserExistsError') {
      return res.status(409).json({
        success: false,
        message: 'هذا الرقم مسجل بالفعل. حاول تسجيل الدخول.'
      });
    }
    return next(error);
  }
});
app.post("/signup", isNotLoggedIn, validateSchema(userRegistrationSchema), async (req, res) => {
    try {
        const { username, phoneNumber, password, confirmPassword } = req.body;
        
        // Additional server-side password validation
        if (password !== confirmPassword) {
            req.flash("error", "كلمات المرور غير متطابقة");
            return res.redirect("/signup");
        }
        
        // Additional server-side phone number validation
        const phonePattern = /^[0-9]{11}$/;
        if (!phonePattern.test(phoneNumber)) {
            req.flash("error", "رقم الهاتف يجب أن يكون 11 رقم بالضبط");
            return res.redirect("/signup");
        }
        
        // Check password strength requirements
        const passwordRequirements = {
            minLength: password.length >= 8,
            hasUpper: /[A-Z]/.test(password),
            hasLower: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };
        
        const unmetRequirements = Object.entries(passwordRequirements)
            .filter(([key, met]) => !met)
            .map(([key]) => key);
        
        if (unmetRequirements.length > 0) {
            req.flash("error", "كلمة المرور يجب أن تحتوي على: 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم، ورمز خاص");
            return res.redirect("/signup");
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { phoneNumber: phoneNumber },
                { username: username }
            ]
        });
        
        if (existingUser) {
            if (existingUser.phoneNumber === phoneNumber) {
                req.flash("error", "رقم الهاتف مسجل مسبقاً");
            } else {
                req.flash("error", "اسم المستخدم مستخدم مسبقاً");
            }
            return res.redirect("/signup");
        }
        
        const newUser = new User({ username, phoneNumber });
        await User.register(newUser, password);
        
        console.log(`New user registered: ${username} (${phoneNumber})`);
        req.flash("success", "تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.");
        res.redirect("/login");
    } catch (error) {
        console.error("Error during signup:", error);
        
        // Handle specific registration errors
        if (error.name === 'UserExistsError') {
            req.flash("error", "المستخدم موجود مسبقاً");
        } else if (error.name === 'ValidationError') {
            req.flash("error", "بيانات غير صحيحة. يرجى التحقق من المعلومات المدخلة");
        } else {
            req.flash("error", "حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.");
        }
        res.redirect("/signup");
    }
});
app.post("/login", isNotLoggedIn, validateSchema(userLoginSchema), passport.authenticate("local", {
  failureRedirect: "/login",
  failureFlash: "رقم الهاتف أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى."
}), (req, res) => {
    req.flash("success", "تم تسجيل الدخول بنجاح!");
  const userRole = (req.user && typeof req.user.role === 'string') ? req.user.role.toLowerCase() : '';
  if (userRole) {
    req.user.role = userRole;
  }
    
    // Redirect based on user role and permissions
  if (userRole === 'admin') {
        // If user has full admin access or no permissions array (legacy admin), go to full dashboard
        if (!req.user.permissions || req.user.permissions.length === 0 || req.user.permissions.includes('full_admin_access')) {
            res.redirect("/admin/dashboard");
        } else {
            // Otherwise go to the simplified access page
            res.redirect("/admin/access");
        }
  } else if (userRole === 'partner') {
        res.redirect("/partner-dashboard");
    } else {
        res.redirect("/");
    }
});

app.get("/logout", isLoggedIn, (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error("Error during logout:", err);
            req.flash("error", "حدث خطأ أثناء تسجيل الخروج.");
            return res.redirect("/");
        }
        req.flash("success", "تم تسجيل الخروج بنجاح!");
        res.redirect("/");
    });
});
app.post("/contact", validateSchema(contactSchema), async (req, res) => {
    try {
        const { name, email, phoneNumber, message } = req.body;
        await sendEmail(name, email, phoneNumber, message);
        req.flash("success", "تم إرسال رسالتك بنجاح!");
        res.redirect("/contact");
    } catch (error) {
        console.error("Error sending email:", error);
        req.flash("error", "حدث خطأ أثناء إرسال الرسالة.");
        res.redirect("/contact");
    }
});
app.post("/reserve", isLoggedIn, validateSchema(reservationSchema), async (req, res) => {
    try {
        const { username, phoneNumber, peopleCount, cardId, roomType } = req.body;
        let note = req.body.note || "a";
        
        // Find the card to get pricing information
        const card = await Card.findById(cardId);
        if (!card) {
            req.flash("error", "البطاقة المطلوبة غير موجودة");
            return res.redirect("back");
        }
        
        // Check if offer has expired
        const now = new Date();
        if (card.offer_expiry_date && now > new Date(card.offer_expiry_date)) {
            req.flash("error", "عذراً، لقد انتهت صلاحية هذا العرض ولا يمكن الحجز عليه");
            return res.redirect(`/bundle-details/${cardId}`);
        }
        
        // Calculate total amount based on room type and people count
        let roomPrice = card.lowest_price; // Default price
        
        if (card.plane && card.plane.housingOptions) {
            const selectedRoom = card.plane.housingOptions.find(option => option.roomType === roomType);
            if (selectedRoom) {
                roomPrice = selectedRoom.price;
            }
        }
        
        const totalAmount = roomPrice * peopleCount;
        
        // Create reservation with pending payment status
    const reserveData = {
            user: req.user._id,
            username,
            phoneNumber,
            people_count: peopleCount,
            note,
      roomType,
            card: cardId,
            totalAmount,
            paymentStatus: 'pending',
            paymentMethod: 'vodafone_cash'
        };
        
        const newReserve = new Reserve(reserveData);
        await newReserve.save();
        
        // Redirect to payment page with reservation ID
        res.redirect(`/payment/${newReserve._id}`);
        
    } catch (error) {
        console.error("Error during reservation:", error);
        req.flash("error", "حدث خطأ أثناء الحجز. حاول مرة أخرى.");
        res.redirect("back");
    }
});

// Payment page route
app.get("/payment/:reservationId", isLoggedIn, catchAsync(async (req, res, next) => {
    const reservationId = req.params.reservationId;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
        return next(new AppError('معرف الحجز غير صحيح', 400));
    }
    
    const reservation = await Reserve.findById(reservationId)
        .populate('user', 'username phoneNumber')
        .populate('card', 'code type days nights');
    
    if (!reservation) {
        return next(new AppError('الحجز غير موجود', 404));
    }
    
    // Check if user owns this reservation
    if (reservation.user._id.toString() !== req.user._id.toString()) {
        return next(new AppError('غير مصرح لك بالوصول لهذا الحجز', 403));
    }
    
    const title = `إتمام الدفع - ${reservation.reservationNumber}`;
    res.render("payment", { 
        user: req.user, 
        title, 
        reservation,
        currentRoute: '/payment'
    });
}));

// Mobile payment summary API
app.get('/api/mobile/reservations/:reservationId/payment-summary',
  isLoggedIn,
  validateSchema(mobileReservationLookupSchema, 'params'),
  catchAsync(async (req, res, next) => {
  const reservationId = req.params.reservationId;

  let reservationQuery;
  if (mongoose.Types.ObjectId.isValid(reservationId)) {
    reservationQuery = Reserve.findById(reservationId);
  } else {
    reservationQuery = Reserve.findOne({ reservationNumber: reservationId });
  }

  const reservation = await reservationQuery
    .populate('user', 'username phoneNumber')
    .populate('card', 'code type days nights name lowest_price offer_type plane company travel_date');

  if (!reservation) {
    return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
  }

  if (reservation.user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'غير مصرح لك بالوصول لهذا الحجز' });
  }

  const contactSettings = await ContactSettings.getSingleton();

  const card = reservation.card || {};
  const paymentPath = `/payment/${reservation._id}`;
  const paymentUrl = `${req.protocol}://${req.get('host')}${paymentPath}`;
  const summary = {
    id: reservation._id,
    reservationNumber: reservation.reservationNumber,
    username: reservation.username,
    phoneNumber: reservation.phoneNumber,
    peopleCount: reservation.people_count,
    roomType: reservation.roomType || '',
    note: reservation.note || '',
    totalAmount: reservation.totalAmount,
    paymentStatus: reservation.paymentStatus,
    paymentMethod: reservation.paymentMethod,
    createdAt: reservation.currentDate,
    paymentPath,
    paymentUrl,
    card: {
      id: card._id,
      code: card.code,
      name: card.name,
      type: card.type,
      days: card.days,
      nights: card.nights,
      company: card.company,
      offerType: card.offer_type,
      lowestPrice: card.lowest_price,
      travelDate: card.travel_date
    }
  };

  res.json({
    success: true,
    reservation: summary,
    contact: {
      whatsappNumber: contactSettings?.whatsappNumber || '',
      phoneNumber: contactSettings?.phoneNumber || '',
      email: contactSettings?.email || ''
    }
  });
}));

// Mobile Bundle Travel Request - submit tour inquiry from multi-step form
app.post('/api/mobile/bundle-request',
  isLoggedIn,
  validateSchema(bundleTravelRequestSchema),
  catchAsync(async (req, res) => {
    const {
      bundleType,
      programType,
      travelStartDate, travelEndDate, days,
      airport, airline, numberOfPeople, roomType,
      activeTab, dayTour, honeymoonTour, familyTour,
      destinationCountry, destinationCity, hotel,
      note
    } = req.body;

    // Build a human-readable note describing the request
    const bundleLabels = {
      omrah: 'عمرة', ramadan: 'عمرة رمضان',
      internal_tour: 'رحلات داخل مصر', external_tour: 'رحلات خارج مصر'
    };
    const programLabels = { economic: 'اقتصادي', premium: 'مميز', luxury: 'فاخر' };
    const tabLabels = { day: 'رحلة يوم', honeymoon: 'شهر عسل', family: 'رحلة عائلية' };

    let requestSummary = `نوع الرحلة: ${bundleLabels[bundleType] || bundleType}`;

    if (['omrah', 'ramadan'].includes(bundleType)) {
      requestSummary += ` | البرنامج: ${programLabels[programType] || programType}`;
      requestSummary += ` | من: ${travelStartDate} إلى: ${travelEndDate}`;
      requestSummary += ` | عدد الأيام: ${days}`;
      requestSummary += ` | عدد الأفراد: ${numberOfPeople}`;
      requestSummary += ` | نوع الغرفة: ${roomType}`;
    } else if (bundleType === 'internal_tour') {
      requestSummary += ` | نوع: ${tabLabels[activeTab] || activeTab}`;
      if (activeTab === 'day' && dayTour) {
        requestSummary += ` | اليوم: ${dayTour.day} | المدينة: ${dayTour.city} | عدد الأفراد: ${dayTour.numberOfPeople}`;
      } else if (activeTab === 'honeymoon' && honeymoonTour) {
        requestSummary += ` | الأيام: ${honeymoonTour.days} | من: ${honeymoonTour.startDate} إلى: ${honeymoonTour.endDate} | المدينة: ${honeymoonTour.city}`;
        if (honeymoonTour.hotel) requestSummary += ` | الفندق: ${honeymoonTour.hotel}`;
      } else if (activeTab === 'family' && familyTour) {
        requestSummary += ` | عدد الأفراد: ${familyTour.numberOfPeople} | الأيام: ${familyTour.days} | من: ${familyTour.startDate} إلى: ${familyTour.endDate} | المدينة: ${familyTour.city}`;
      }
    } else if (bundleType === 'external_tour') {
      requestSummary += ` | الدولة: ${destinationCountry} | المدينة: ${destinationCity}`;
      requestSummary += ` | من: ${travelStartDate} إلى: ${travelEndDate}`;
      requestSummary += ` | عدد الأيام: ${days} | عدد الأفراد: ${numberOfPeople}`;
      if (hotel) requestSummary += ` | الفندق: ${hotel}`;
    }

    if (note) requestSummary += ` | ملاحظات: ${note}`;

    // Find a matching card if possible (best-effort, optional)
    let matchedCard = null;
    try {
      const typeMap = {
        omrah: 'omrah', ramadan: 'ramadan',
        internal_tour: 'internal', external_tour: 'external'
      };
      const cardType = typeMap[bundleType];
      if (cardType) {
        matchedCard = await Card.findOne({
          type: cardType,
          $or: [
            { createdBy: 'admin' },
            { createdBy: { $exists: false } },
            { createdBy: null },
            { createdBy: 'partner', isApproved: true }
          ]
        }).sort({ displayOrder: 1, travel_date: 1 });
      }
    } catch (_) {}

    // Save as a reservation linked to a placeholder card or a matched card
    if (matchedCard) {
      // Calculate price
      let roomPrice = matchedCard.lowest_price || 0;
      if (roomType && matchedCard.plane && matchedCard.plane.housingOptions) {
        const opt = matchedCard.plane.housingOptions.find(o => o.roomType === roomType);
        if (opt) roomPrice = opt.price;
      }
      const people = numberOfPeople || (dayTour?.numberOfPeople) || (familyTour?.numberOfPeople) || 1;
      const totalAmount = roomPrice * people;

      const newReserve = new Reserve({
        user: req.user._id,
        username: req.user.username,
        phoneNumber: req.user.phoneNumber,
        people_count: people,
        note: requestSummary,
        roomType: roomType || '',
        card: matchedCard._id,
        totalAmount,
        paymentStatus: 'pending',
        paymentMethod: 'vodafone_cash'
      });
      await newReserve.save();

      return res.json({
        success: true,
        message: 'تم إرسال طلبك بنجاح! سيتواصل معك فريقنا قريباً.',
        reservationId: newReserve._id,
        reservationNumber: newReserve.reservationNumber,
        bundleType,
      });
    }

    // No matching card found — still accept request, notify via email if configured
    try {
      if (typeof sendEmail === 'function') {
        await sendEmail(
          req.user.username,
          req.user.email || '',
          req.user.phoneNumber,
          `طلب رحلة جديد من التطبيق:\n${requestSummary}`
        );
      }
    } catch (_) {}

    return res.json({
      success: true,
      message: 'تم استلام طلبك بنجاح! سيتواصل معك فريقنا قريباً.',
      bundleType,
      noMatchedCard: true,
    });
  })
);

// Payment confirmation route
app.post("/payment/confirm/:reservationId", isLoggedIn, catchAsync(async (req, res, next) => {
    const reservationId = req.params.reservationId;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
        return next(new AppError('معرف الحجز غير صحيح', 400));
    }
    
  const reservation = await Reserve.findById(reservationId);
    
    if (!reservation) {
        return next(new AppError('الحجز غير موجود', 404));
    }
    
    // Check if user owns this reservation
    if (reservation.user._id.toString() !== req.user._id.toString()) {
        return next(new AppError('غير مصرح لك بالوصول لهذا الحجز', 403));
    }
    
  // Accept and validate chosen payment method
  const { paymentMethod } = req.body;
  const allowedMethods = ['vodafone_cash', 'bank_transfer', 'cash', 'instapay'];
  if (paymentMethod && !allowedMethods.includes(paymentMethod)) {
    return next(new AppError('طريقة دفع غير صالحة', 400));
  }
  if (paymentMethod) {
    reservation.paymentMethod = paymentMethod;
  }

  // For offline methods (cash), keep pending until staff marks paid
  if (reservation.paymentMethod === 'cash') {
    reservation.paymentStatus = 'pending';
  } else {
    // For transfer methods, mark as paid (placeholder until integrated)
    reservation.paymentStatus = 'paid';
  }
    await reservation.save();
    
  req.flash("success", "تم تسجيل طريقة الدفع. سيتم التواصل معك لتأكيد الدفع وإتمام الإجراءات.");
    res.redirect("/");
}));

// Partner reservation verification routes
app.post("/partner/reservation/:id/confirm", isPartner, async (req, res) => {
  try {
    const reservationId = req.params.id;
    const { partnerNotes } = req.body;
    const partnerId = req.user._id;
    
    // Find the reservation and check if it belongs to partner's cards
    const reservation = await Reserve.findById(reservationId)
      .populate('card', 'title code')
      .populate('user', 'username phoneNumber');
      
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }
    
    if (reservation.card.partnerId.toString() !== partnerId.toString()) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذا الحجز' });
    }
    
    // Update reservation status
    reservation.partnerStatus = 'confirmed';
    if (partnerNotes) {
      reservation.partnerNotes = partnerNotes;
    }
    await reservation.save();
    
    // Send notification email to user
    try {
      const emailContent = `
        مرحباً ${reservation.user.username},
        
        نود إعلامكم بأن حجزكم رقم ${reservation.reservationNumber} للرحلة "${reservation.card.title}" قد تم تأكيده من قبل الشريك السياحي.
        
        ${partnerNotes ? `ملاحظات الشريك: ${partnerNotes}` : ''}
        
        يمكنكم مراجعة تفاصيل حجزكم من خلال حسابكم الشخصي على الموقع.
        
        مع تحيات فريق منصة عمرة
      `;
      
      await sendEmail(
        reservation.user.phoneNumber, // Using phone as email identifier
        'تم تأكيد حجزكم - منصة عمرة',
        emailContent
      );
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }
    
    res.json({ success: true, message: 'تم تأكيد الحجز بنجاح' });
  } catch (error) {
    console.error('Partner reservation confirmation error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تأكيد الحجز' });
  }
});

app.post("/partner/reservation/:id/reject", isPartner, async (req, res) => {
  try {
    const reservationId = req.params.id;
    const { partnerNotes } = req.body;
    const partnerId = req.user._id;
    
    // Find the reservation and check if it belongs to partner's cards
    const reservation = await Reserve.findById(reservationId)
      .populate('card', 'title code')
      .populate('user', 'username phoneNumber');
      
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }
    
    if (reservation.card.partnerId.toString() !== partnerId.toString()) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذا الحجز' });
    }
    
    // Update reservation status
    reservation.partnerStatus = 'rejected';
    if (partnerNotes) {
      reservation.partnerNotes = partnerNotes;
    }
    await reservation.save();
    
    // Send notification email to user
    try {
      const emailContent = `
        مرحباً ${reservation.user.username},
        
        نأسف لإعلامكم بأن حجزكم رقم ${reservation.reservationNumber} للرحلة "${reservation.card.title}" قد تم رفضه من قبل الشريك السياحي.
        
        ${partnerNotes ? `سبب الرفض: ${partnerNotes}` : ''}
        
        يمكنكم التواصل معنا لمعرفة المزيد من التفاصيل أو البحث عن بدائل أخرى.
        
        مع تحيات فريق منصة عمرة
      `;
      
      await sendEmail(
        reservation.user.phoneNumber, // Using phone as email identifier
        'تم رفض حجزكم - منصة عمرة',
        emailContent
      );
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Don't fail the request if email fails
    }
    
    res.json({ success: true, message: 'تم رفض الحجز وإرسال إشعار للعميل' });
  } catch (error) {
    console.error('Partner reservation rejection error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء رفض الحجز' });
  }
});

// Error handling routes
app.get("/error", (req, res) => {
  const errorCode = req.query.code || 404;
  const message = req.query.message || null;
  const title = `خطأ ${errorCode}`;
  
  res.status(errorCode).render("error", { 
    user: req.user, 
    title,
    errorCode,
    message,
    error: null,
    currentRoute: '/error'
  });
});

// 404 Handler - must be after all other routes
app.use((req, res) => {
  res.status(404).render("error", { 
    user: req.user, 
    title: "الصفحة غير موجودة",
    errorCode: 404,
    message: "عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى مكان آخر.",
    error: null,
    currentRoute: '/error'
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', {
    message: error.message,
    http_code: error.statusCode || error.status || 500,
    name: error.name,
    storageErrors: error.storageErrors || []
  });
  
  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة مرة أخرى لاحقاً.';
  
  // Handle specific error types
  if (error.name === 'TimeoutError' || error.message === 'Request Timeout') {
    statusCode = 408;
    message = 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى مع اتصال انترنت أفضل.';
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'البيانات المدخلة غير صحيحة. يرجى التحقق من المعلومات والمحاولة مرة أخرى.';
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'البيانات المدخلة موجودة مسبقاً. يرجى استخدام معلومات مختلفة.';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'معرف غير صحيح. يرجى التحقق من الرابط والمحاولة مرة أخرى.';
  } else if (error.name === 'MongoNetworkError') {
    statusCode = 503;
    message = 'مشكلة في الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.';
  }
  
  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(error);
  }
  
  res.status(statusCode).render("error", { 
    user: req.user, 
    title: `خطأ ${statusCode}`,
    errorCode: statusCode,
    message: message,
    error: process.env.NODE_ENV === 'development' ? error : null,
    currentRoute: '/error'
  });
});

const server = http.createServer(app);

const parseSocketOrigins = () => {
  const raw = process.env.SOCKET_ALLOWED_ORIGINS || process.env.FRONTEND_URL || '';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

const isDevOrigin = (origin = '') => /^http:\/\/localhost:3000\/?$/.test(origin);
const allowedSocketOrigins = parseSocketOrigins();

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        isDevOrigin(origin) ||
        !allowedSocketOrigins.length ||
        allowedSocketOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Socket.IO allowing unlisted origin ${origin} (development mode)`);
        return callback(null, true);
      }

      console.warn(`Socket.IO blocked origin ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true
  }
});

const wrap = (middleware) => (socket, next) => middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));

io.use(async (socket, next) => {
  try {
    const session = socket.request.session;
    const sessionUserId = session?.passport?.user;
    if (sessionUserId) {
      let user = null;
      if (mongoose.Types.ObjectId.isValid(sessionUserId)) {
        user = await User.findById(sessionUserId).select('username role permissions companyName phoneNumber');
      } else {
        user = await User.findOne({ phoneNumber: sessionUserId }).select('username role permissions companyName phoneNumber');
      }
      if (user) {
        socket.user = user;
        return next();
      }
    }
    console.warn('[socket] Unauthorized connection attempt');
    next(new Error('UNAUTHORIZED'));
  } catch (error) {
    console.error('[socket] Auth middleware error', error);
    next(error);
  }
});

io.on('connection', (socket) => {
  const userLabel = `${socket.user?.username || 'مستخدم'} (${socket.user?._id || 'مجهول'})`;
  console.log('[socket] Connected:', userLabel);

  socket.on('disconnect', (reason) => {
    console.log('[socket] Disconnected:', userLabel, 'reason:', reason);
  });

  socket.on('chat:subscribeOwner', () => {
    const role = (socket.user.role || '').toLowerCase();
    if (role === 'partner') {
      const room = `owner:partner:${socket.user._id}`;
      socket.join(room);
      console.log('[socket] Owner subscribed to room:', room);
    } else if (role === 'admin') {
      socket.join('owner:admin');
      console.log('[socket] Admin subscribed to owner:admin');
    } else {
      console.log('[socket] Ignored subscribeOwner for role:', role);
    }
  });

  socket.on('chat:join', async ({ threadId }) => {
    try {
      const thread = await loadThreadForUser(threadId, socket.user);
      if (!thread) {
        console.warn('[socket] chat:join denied for thread', threadId, 'user', userLabel);
        return socket.emit('chat:error', { message: 'لا يمكنك الانضمام لهذه المحادثة' });
      }
      await markThreadReadByUser(thread, socket.user);
      socket.join(thread._id.toString());
      console.log('[socket] Joined room', thread._id.toString(), 'user', userLabel);
      socket.emit('chat:joined', { threadId: thread._id.toString() });
    } catch (error) {
      console.error('Socket join error:', error);
      socket.emit('chat:error', { message: 'تعذر الانضمام للمحادثة' });
    }
  });

  socket.on('chat:leave', ({ threadId }) => {
    if (threadId) {
      socket.leave(threadId.toString());
      console.log('[socket] Left room', threadId.toString(), 'user', userLabel);
    }
  });

  socket.on('chat:message', async ({ threadId, message }) => {
    try {
      const thread = await loadThreadForUser(threadId, socket.user);
      if (!thread) {
        console.warn('[socket] chat:message denied for thread', threadId, 'user', userLabel);
        return socket.emit('chat:error', { message: 'لا يمكنك إرسال رسائل في هذه المحادثة' });
      }
      const savedMessage = await appendMessage(thread, socket.user, message || '');
      const payload = serializeMessage(savedMessage, socket.user);
      console.log('[socket] Broadcasting message for thread', threadId, 'user', userLabel);
      emitChatMessage(io, thread, payload);
    } catch (error) {
      const messageKey = error.code === 'EMPTY_MESSAGE'
        ? 'لا يمكن إرسال رسالة فارغة'
        : 'تعذر إرسال الرسالة';
      socket.emit('chat:error', { message: messageKey });
      console.error('[socket] chat:message error', error);
    }
  });
});

app.set('io', io);

startServer = () => {
  server.listen(port, async () => {
    console.log(`Server is running at http://localhost:${port}`);
    
    try {
      await SectionContent.initializeDefaults();
      await PageContent.initializeDefaults();
      await ContactSettings.getSingleton();
    } catch (error) {
      console.error('Error initializing content:', error);
    }
  });
};

module.exports = {
  app,
  server,
  normalizeArrayField,
  startServer
};
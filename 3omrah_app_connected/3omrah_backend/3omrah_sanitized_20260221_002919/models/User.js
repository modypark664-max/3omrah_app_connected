const mongoose = require("mongoose");
const {Schema, model} = mongoose;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'partner'],
        default: 'user'
    },
    // Partner-specific fields
    companyName: {
        type: String,
        required: function() { return this.role === 'partner'; }
    },
    companyCode: {
        type: String,
        required: function() { return this.role === 'partner'; }
    },
    companyRepresentative: {
        type: String,
        required: function() { return this.role === 'partner'; }
    },
    partnerPackage: {
        type: String,
        enum: ['basic', 'professional', 'premium'],
        required: function() { return this.role === 'partner'; }
    },
    branches: {
        type: String,
        required: function() { return this.role === 'partner'; }
    },
    address1: {
        type: String,
        required: function() { return this.role === 'partner'; }
    },
    address2: {
        type: String,
        default: ''
    },
    phoneNumbers: {
        type: String,
        required: function() { return this.role === 'partner'; }
    },
    companyDocs: [{
        type: String // Array of file paths/URLs
    }],
    isVerified: {
        type: Boolean,
        default: false
    },
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card'
    }],
    profileImage: {
        type: String,
        default: null // URL or path to the profile image
    },
    // Expo push notification tokens for mobile app
    expoPushTokens: [{
        token: { type: String, required: true },
        deviceId: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],
    // Permission system for granular access control
    permissions: [{
        type: String,
        enum: [
            // Card Management
            'add_card',
            'edit_card', 
            'delete_card',
            'approve_card',
            'view_all_cards',
            // User Management
            'view_users',
            'edit_users',
            'delete_users',
            'manage_user_permissions',
            // Partner Management
            'view_partners',
            'verify_partners',
            'suspend_partners',
            'delete_partners',
            'edit_partners',
            // Reservation Management
            'view_reservations',
            'verify_payments',
            'cancel_payments',
            'delete_reservations',
            // Content Management
            'manage_banners',
            'manage_hero_media',
            'manage_section_content',
            'manage_page_content',
            'manage_partner_logos',
            'manage_exclusive_gallery',
            'manage_testimonials',
            'manage_about_settings',
            'manage_contact_settings',
            'manage_partner_tiers',
            // Analytics & Reports
            'view_analytics',
            'view_dashboard_stats',
            // System Administration
            'full_admin_access'
        ]
    }]
}, {
    timestamps: true // This will automatically add createdAt and updatedAt fields
})
userSchema.plugin(passportLocalMongoose, {usernameField: "phoneNumber"})

module.exports = model("User", userSchema);

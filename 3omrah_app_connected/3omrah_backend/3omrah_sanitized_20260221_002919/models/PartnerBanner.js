const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const partnerBannerSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    logoText: {
        type: String,
        required: true,
        trim: true
    },
    logoSubtext: {
        type: String,
        required: true,
        trim: true
    },
    backgroundImage: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expirationDate: {
        type: Date,
        required: true
    },
    priority: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Add a pre-find middleware to automatically filter out expired banners
partnerBannerSchema.pre(/^find/, function() {
    this.find({ 
        expirationDate: { $gte: new Date() },
        isActive: true 
    });
});

// Static method to get active banners
partnerBannerSchema.statics.getActiveBanners = function() {
    return this.find({ 
        expirationDate: { $gte: new Date() },
        isActive: true 
    }).sort({ priority: -1, createdAt: -1 });
};

module.exports = model("PartnerBanner", partnerBannerSchema);

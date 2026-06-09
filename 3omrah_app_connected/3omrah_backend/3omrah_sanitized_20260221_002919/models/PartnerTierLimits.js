const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const partnerTierLimitsSchema = new Schema({
    basic: {
        type: Number,
        default: 5,
        min: 0,
        required: true
    },
    professional: {
        type: Number,
        default: 15,
        min: 0,
        required: true
    },
    premium: {
        type: Number,
        default: -1, // -1 means unlimited
        min: -1,
        required: true
    }
}, {
    timestamps: true
});

// Ensure only one document exists (singleton pattern)
partnerTierLimitsSchema.statics.getSingleton = async function() {
    let limits = await this.findOne();
    if (!limits) {
        limits = await this.create({
            basic: 5,
            professional: 15,
            premium: -1
        });
    }
    return limits;
};

module.exports = model('PartnerTierLimits', partnerTierLimitsSchema);
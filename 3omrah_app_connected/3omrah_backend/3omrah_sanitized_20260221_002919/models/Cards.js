const mongoose = require("mongoose")
const {Schema, model} = mongoose;
const dayjs = require("dayjs");
const { use } = require("passport");
const cardSchema = new Schema({
    lowest_price: {
        type: Number,
        min: 0
    },
    type: {
        type: String,
        enum: ["omrah", "internal_tour", "external_tour", "7ag", "ramadan"],
    },
    offer_type: {
        type: String,
        trim: true
    },
    days: {
        type: Number,
        required: true,
        min: 0
    },
    nights: {
        type: Number,
        required: true,
        min: 0
    },
    travel_date: {
        type: Date,
        required: true,
        set: (val) => dayjs(val, "D/M/YYYY").toDate()
    },
    offer_expiry_date: {
        type: Date,
        required: true,
        set: (val) => dayjs(val, "D/M/YYYY").toDate()
    },
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    going_route: {
        type: String,
        required: true,
        trim: true
    },
    returning_route: {
        type: String,
        required: true,
        trim: true
    },plane_company: {
        type: String,
        required: true,
        trim: true
    },    // New fields for airport and airline management
    airport: {
        type: Schema.Types.ObjectId,
        ref: "Airport",
        required: function() {
            // Airport is required for international tours, umrah, and ramadan
            return ['omrah', 'external_tour', 'ramadan'].includes(this.type);
        }
    },
    airline: {
        type: Schema.Types.ObjectId,
        ref: "Airline",
        required: function() {
            // Airline is required for international tours, umrah, and ramadan
            return ['omrah', 'external_tour', 'ramadan'].includes(this.type);
        }
    },
    // For internal tours - destination city and optional transport type
    destinationCity: {
        type: String,
        trim: true,
        required: function() {
            // Required for internal tours
            return this.type === 'internal_tour';
        }
    },
    transportationType: {
        type: String,
        enum: ['bus', 'train', 'flight', 'car', 'none'],
        default: 'none'
    },
    // For external tours - destination country
    destinationCountry: {
        type: String,
        trim: true
    },
    // For honeymoon tours
    isHoneymoonPackage: {
        type: Boolean,
        default: false
    },
    // For family tours
    isFamilyPackage: {
        type: Boolean,
        default: false
    },
    // Included hotels
    hotels: [{
        hotelId: {
            type: Schema.Types.ObjectId,
            ref: "Hotel"
        },
        name: {type: String, trim: true},
        location: {type: String, trim: true},
        stars: {type: Number, min: 1, max: 5},
        mealPlan: {type: String, enum: ['breakfast', 'half-board', 'full-board', 'all-inclusive']},
        nights: {type: Number, required: true}
    }],    included_services: {
        type: [String],
    },
    not_included_services: {
        type: [String],
    },
    notes: {
        type: [String],
    },
    cancelling_rules: {
        type: [String],
    },
    plane: {
        hotel: [{
            nights: {type: Number, required: true},
            hotel: {type: String, required: true, trim: true},
            hotel_type: {type: String, enum:["اقتصادي", "سياحي", "VIP"], required: true, trim: true},
            location: {type: String, required: true, trim: true},
            comes_with_food: {type: Boolean, required: true}
        }],
        housingOptions: [{
            roomType: {type: String, required: true, trim: true},
            price: {type: Number, required: true, min: 0}
        }]
    },
    reservedUsers: [{
        type: Schema.Types.ObjectId, ref: "User"
    }],
    thumbnail: {
        type: String,
        required: true,
    },
    images: [{
        type:String,
        required: true
    }],
    partnerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: function() {
            // Only required if the card is created by a partner
            return this.createdBy === 'partner';
        }
    },
    createdBy: {
        type: String,
        enum: ['admin', 'partner'],
        default: 'admin'
    },
    isApproved: {
        type: Boolean,
        default: function() {
            // Auto-approve admin cards, require approval for partner cards
            return this.createdBy === 'admin';
        }
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    approvedAt: {
        type: Date
    },
    company: {
        type: String,
        trim: true,
        maxlength: 100,
        default: ''
    },
    displayOrder: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
})

module.exports = model("Card", cardSchema)
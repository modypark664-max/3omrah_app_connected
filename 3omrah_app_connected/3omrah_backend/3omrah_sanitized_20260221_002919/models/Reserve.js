const mongoose = require("mongoose");
const {Schema, model} = mongoose;

const reserveSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    username: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    people_count: {
        type: Number,
        required: true,
        min: 1
    },
    note: {
        type: String,
        trim: true,
    },
    roomType: {
        type: String,
        trim: true,
        default: ''
    },
    currentDate: {
        type: Date,
        default: Date.now
    },
    card: {
        type: Schema.Types.ObjectId,
        ref: "Card",
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'cancelled'],
        default: 'pending'
    },
    
    // Partner verification status
    partnerStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'rejected'],
        default: 'pending'
    },
    
    partnerNotes: {
        type: String,
        trim: true
    },
    
    paymentMethod: {
        type: String,
        enum: ['vodafone_cash', 'bank_transfer', 'cash', 'instapay'],
        default: 'vodafone_cash'
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    reservationNumber: {
        type: String,
        unique: true
    }
})

// Generate unique reservation number before saving
reserveSchema.pre('save', function(next) {
    if (!this.reservationNumber) {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.reservationNumber = `RES${timestamp}${random}`;
    }
    next();
});

module.exports = model("Reserve", reserveSchema);
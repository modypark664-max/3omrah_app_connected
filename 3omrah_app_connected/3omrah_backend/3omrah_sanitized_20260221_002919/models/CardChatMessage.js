const mongoose = require('mongoose');
const { Schema } = mongoose;

const cardChatMessageSchema = new Schema({
    thread: {
        type: Schema.Types.ObjectId,
        ref: 'CardChatThread',
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    sentAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

cardChatMessageSchema.index({ thread: 1, createdAt: 1 });

module.exports = mongoose.model('CardChatMessage', cardChatMessageSchema);

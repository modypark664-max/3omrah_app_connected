const mongoose = require('mongoose');
const { Schema } = mongoose;

const cardChatThreadSchema = new Schema({
    card: {
        type: Schema.Types.ObjectId,
        ref: 'Card',
        required: true
    },
    viewer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ownerType: {
        type: String,
        enum: ['admin', 'partner'],
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: function () {
            return this.ownerType === 'partner';
        }
    },
    lastMessagePreview: {
        type: String,
        default: ''
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    unreadByOwner: {
        type: Number,
        default: 0
    },
    unreadByViewer: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

cardChatThreadSchema.index({ card: 1, viewer: 1 }, { unique: true });
cardChatThreadSchema.index({ owner: 1, updatedAt: -1 });
cardChatThreadSchema.index({ ownerType: 1, updatedAt: -1 });

module.exports = mongoose.model('CardChatThread', cardChatThreadSchema);

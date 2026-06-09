const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const exclusiveGallerySchema = new Schema({
  cardIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Card',
    required: true
  }]
}, { timestamps: true });

module.exports = model('ExclusiveGallery', exclusiveGallerySchema);
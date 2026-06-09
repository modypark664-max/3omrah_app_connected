const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const partnerLogosSchema = new Schema({
  images: [{
    type: String, // URL to image
    trim: true
  }]
}, { timestamps: true });

module.exports = model('PartnerLogos', partnerLogosSchema);
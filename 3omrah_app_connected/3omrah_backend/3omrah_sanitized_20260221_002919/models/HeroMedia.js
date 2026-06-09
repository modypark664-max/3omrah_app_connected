const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const heroMediaSchema = new Schema({
  type: { type: String, enum: ['image', 'video'], required: true },
  url: { type: String, required: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('HeroMedia', heroMediaSchema);

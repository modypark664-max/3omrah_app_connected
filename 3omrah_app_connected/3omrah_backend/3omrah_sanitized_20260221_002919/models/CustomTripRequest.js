const mongoose = require('mongoose');

const customTripRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  departureAirport: { type: String, required: true },
  arrivalAirport: { type: String, required: true },
  departureDate: { type: String, required: true },
  returnDate: { type: String },
  programType: { type: String, required: true },
  nights: { type: Number, required: true },
  rooms: {
    adults: { type: Number, default: 0 },
    children: { type: Number, default: 0 },
    infants: { type: Number, default: 0 },
  },
  transportMethod: { type: String },
  notes: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CustomTripRequest', customTripRequestSchema);

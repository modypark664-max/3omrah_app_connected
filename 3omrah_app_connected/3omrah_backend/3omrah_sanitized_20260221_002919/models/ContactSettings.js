const mongoose = require('mongoose');

const ContactSettingsSchema = new mongoose.Schema({
  whatsappNumber: { type: String, default: '01225993443' },
  phoneNumber: { type: String, default: '01225993443' },
  email: { type: String, default: 'info@rehlatty.com' },
}, { timestamps: true });

// Ensure singleton-like behavior
ContactSettingsSchema.statics.getSingleton = async function() {
  let doc = await this.findOne();
  if (!doc) {
    doc = new this();
    await doc.save();
  }
  return doc;
}

module.exports = mongoose.model('ContactSettings', ContactSettingsSchema);

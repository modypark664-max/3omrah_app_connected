const mongoose = require('mongoose');

const aboutSettingsSchema = new mongoose.Schema({
	aboutImageUrl: { type: String, default: '' }
}, { timestamps: true });

aboutSettingsSchema.statics.getSingleton = async function () {
	let doc = await this.findOne();
	if (!doc) {
		doc = await this.create({ aboutImageUrl: '' });
	}
	return doc;
}

module.exports = mongoose.model('AboutSettings', aboutSettingsSchema);


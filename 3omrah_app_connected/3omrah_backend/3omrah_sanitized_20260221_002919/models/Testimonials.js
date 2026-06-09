const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	text: { type: String, required: true, trim: true },
	rating: { type: Number, required: true, min: 1, max: 5 }
}, { _id: false });

const testimonialsSchema = new mongoose.Schema({
	reviews: { type: [reviewSchema], default: [] }
}, { timestamps: true });

testimonialsSchema.statics.getSingleton = async function() {
	let doc = await this.findOne();
	if (!doc) {
		doc = await this.create({ reviews: [] });
	}
	return doc;
}

module.exports = mongoose.model('Testimonials', testimonialsSchema);


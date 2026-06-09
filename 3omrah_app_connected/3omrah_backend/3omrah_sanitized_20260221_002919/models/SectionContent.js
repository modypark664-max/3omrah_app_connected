const mongoose = require('mongoose');

const sectionContentSchema = new mongoose.Schema({
    sectionType: {
        type: String,
        required: true,
        unique: true,
        enum: ['omrah', 'internal_tours', 'external_tours']
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Default data for sections
sectionContentSchema.statics.getDefaultSections = function() {
    return [
        {
            sectionType: 'omrah',
            title: 'باقات العمرة',
            description: 'معنا رحلة العمرة أصبحت أسهل وأكثر راحة، حيث نوفر لك باقات متنوعة تناسب جميع الاحتياجات والميزانيات',
            isActive: true
        },
        {
            sectionType: 'internal_tours',
            title: 'العروض الرحلات الداخلية خلال رحلة العمرة',
            description: 'استمتع بأفضل العروض الداخلية على رحلات العمرة، مع باقات مصممة لتلبية جميع احتياجاتك بأسعار مميزة وخدمات شاملة.',
            isActive: true
        },
        {
            sectionType: 'external_tours',
            title: 'العروض الرحلات الخارجية خلال رحلة العمرة',
            description: 'اكتشف العالم مع رحلاتنا الخارجية المميزة، باقات مصممة لتجمع بين الروحانية والاستكشاف بأسعار مميزة وخدمات شاملة.',
            isActive: true
        }
    ];
};

// Initialize default sections if they don't exist
sectionContentSchema.statics.initializeDefaults = async function() {
    try {
        const existingSections = await this.countDocuments();
        if (existingSections === 0) {
            const defaultSections = this.getDefaultSections();
            await this.insertMany(defaultSections);
            console.log('Default section content initialized');
        }
    } catch (error) {
        console.error('Error initializing default sections:', error);
    }
};

module.exports = mongoose.model('SectionContent', sectionContentSchema);
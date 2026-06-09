const mongoose = require('mongoose');
require('dotenv').config();

const Airport = require('./models/Airport');
const Airline = require('./models/Airline');

// Seed data for Egyptian airports
const airportsSeedData = [
  {
    name: "مطار القاهرة الدولي",
    code: "CAI",
    city: "القاهرة",
    country: "مصر",
    description: "أكبر مطار في مصر والعالم العربي",
    displayOrder: 1,
    isActive: true
  },
  {
    name: "مطار الغردقة الدولي",
    code: "HRG",
    city: "الغردقة",
    country: "مصر",
    description: "مطار دولي في مدينة الغردقة السياحية",
    displayOrder: 2,
    isActive: true
  },
  {
    name: "مطار شرم الشيخ الدولي",
    code: "SSH",
    city: "شرم الشيخ",
    country: "مصر",
    description: "مطار دولي في مدينة شرم الشيخ",
    displayOrder: 3,
    isActive: true
  },
  {
    name: "مطار برج العرب الدولي",
    code: "ALY",
    city: "الإسكندرية",
    country: "مصر",
    description: "مطار دولي بالإسكندرية",
    displayOrder: 4,
    isActive: true
  },
  {
    name: "مطار سفنكس الدولي",
    code: "SPX",
    city: "الجيزة",
    country: "مصر",
    description: "مطار سفنكس القريب من القاهرة",
    displayOrder: 5,
    isActive: true
  },
  {
    name: "مطار الأقصر الدولي",
    code: "LXR",
    city: "الأقصر",
    country: "مصر",
    description: "مطار دولي في مدينة الأقصر",
    displayOrder: 6,
    isActive: true
  },
  {
    name: "مطار أسيوط الدولي",
    code: "AUT",
    city: "أسيوط",
    country: "مصر",
    description: "مطار دولي في مدينة أسيوط",
    displayOrder: 7,
    isActive: true
  }
];

// Seed data for airlines
const airlinesSeedData = [
  {
    name: "مصر للطيران",
    code: "MS",
    country: "مصر",
    description: "الخطوط الجوية الوطنية المصرية",
    displayOrder: 1,
    isActive: true
  },
  {
    name: "Air Cairo",
    code: "SM",
    country: "مصر",
    description: "شركة طيران مصرية خاصة",
    displayOrder: 2,
    isActive: true
  },
  {
    name: "النيل للطيران",
    code: "NL",
    country: "مصر",
    description: "شركة النيل للطيران",
    displayOrder: 3,
    isActive: true
  },
  {
    name: "العربية للطيران",
    code: "ADB",
    country: "الإمارات",
    description: "الخطوط الجوية العربية",
    displayOrder: 4,
    isActive: true
  },
  {
    name: "الخطوط السعودية",
    code: "SV",
    country: "السعودية",
    description: "الخطوط الجوية السعودية",
    displayOrder: 5,
    isActive: true
  },
  {
    name: "طيران الإمارات",
    code: "EK",
    country: "الإمارات",
    description: "طيران الإمارات",
    displayOrder: 6,
    isActive: true
  },
  {
    name: "الاتحاد للطيران",
    code: "EY",
    country: "الإمارات",
    description: "الاتحاد للطيران",
    displayOrder: 7,
    isActive: true
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rehlatty');
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Airport.deleteMany({});
    await Airline.deleteMany({});
    console.log('🗑️ Cleared existing airports and airlines');

    // Seed airports
    const insertedAirports = await Airport.insertMany(airportsSeedData);
    console.log(`✅ Inserted ${insertedAirports.length} airports`);

    // Seed airlines
    const insertedAirlines = await Airline.insertMany(airlinesSeedData);
    console.log(`✅ Inserted ${insertedAirlines.length} airlines`);

    console.log('\n✨ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();

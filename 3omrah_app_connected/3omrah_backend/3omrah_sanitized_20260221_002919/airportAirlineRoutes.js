const route = require("express").Router();
const Airport = require("./models/Airport");
const Airline = require("./models/Airline");
const { airportSchema, airlineSchema, validateSchema } = require("./schemas");
const { isAdmin, canManageContent } = require("./middlware");
const upload = require("./upload");

// ==================== AIRPORT ROUTES ====================

// Get all airports (public)
route.get("/airports", async (req, res) => {
  try {
    const airports = await Airport.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    res.json({
      success: true,
      data: airports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all airports (admin - including inactive)
route.get("/admin/airports", isAdmin, canManageContent, async (req, res) => {
  try {
    const airports = await Airport.find().sort({ displayOrder: 1, name: 1 });
    res.json({
      success: true,
      data: airports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get airport by ID
route.get("/airports/:id", async (req, res) => {
  try {
    const airport = await Airport.findById(req.params.id);
    if (!airport) {
      return res.status(404).json({
        success: false,
        error: "المطار غير موجود"
      });
    }
    if (!airport.isActive) {
      return res.status(404).json({
        success: false,
        error: "المطار غير متاح"
      });
    }
    res.json({
      success: true,
      data: airport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create airport (admin only)
route.post("/admin/airports", 
  isAdmin, 
  canManageContent, 
  validateSchema(airportSchema, 'body'), 
  async (req, res) => {
    try {
      const { name, code, city, country, description, isActive, displayOrder } = req.body;

      // Check if airport with this code already exists
      const existingAirport = await Airport.findOne({ code: code.toUpperCase() });
      if (existingAirport) {
        return res.status(400).json({
          success: false,
          error: "كود المطار مستخدم بالفعل"
        });
      }

      // Check if airport with this name already exists
      const existingByName = await Airport.findOne({ name });
      if (existingByName) {
        return res.status(400).json({
          success: false,
          error: "اسم المطار مستخدم بالفعل"
        });
      }

      const airport = new Airport({
        name,
        code: code.toUpperCase(),
        city,
        country: country || 'Egypt',
        description,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0
      });

      await airport.save();

      res.status(201).json({
        success: true,
        message: "تم إضافة المطار بنجاح",
        data: airport
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Update airport (admin only)
route.put("/admin/airports/:id", 
  isAdmin, 
  canManageContent, 
  validateSchema(airportSchema, 'body'), 
  async (req, res) => {
    try {
      const { name, code, city, country, description, isActive, displayOrder } = req.body;

      const airport = await Airport.findById(req.params.id);
      if (!airport) {
        return res.status(404).json({
          success: false,
          error: "المطار غير موجود"
        });
      }

      // Check if new code is already taken by another airport
      if (code && code.toUpperCase() !== airport.code) {
        const existingAirport = await Airport.findOne({ code: code.toUpperCase() });
        if (existingAirport) {
          return res.status(400).json({
            success: false,
            error: "كود المطار مستخدم بالفعل"
          });
        }
      }

      // Check if new name is already taken by another airport
      if (name && name !== airport.name) {
        const existingByName = await Airport.findOne({ name });
        if (existingByName) {
          return res.status(400).json({
            success: false,
            error: "اسم المطار مستخدم بالفعل"
          });
        }
      }

      // Update fields
      airport.name = name || airport.name;
      airport.code = code ? code.toUpperCase() : airport.code;
      airport.city = city || airport.city;
      airport.country = country !== undefined ? country : airport.country;
      airport.description = description || airport.description;
      airport.isActive = isActive !== undefined ? isActive : airport.isActive;
      airport.displayOrder = displayOrder !== undefined ? displayOrder : airport.displayOrder;

      await airport.save();

      res.json({
        success: true,
        message: "تم تحديث المطار بنجاح",
        data: airport
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Delete airport (admin only)
route.delete("/admin/airports/:id", isAdmin, canManageContent, async (req, res) => {
  try {
    const airport = await Airport.findByIdAndDelete(req.params.id);
    if (!airport) {
      return res.status(404).json({
        success: false,
        error: "المطار غير موجود"
      });
    }

    res.json({
      success: true,
      message: "تم حذف المطار بنجاح",
      data: airport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== AIRLINE ROUTES ====================

// Get all airlines (public)
route.get("/airlines", async (req, res) => {
  try {
    const airlines = await Airline.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    res.json({
      success: true,
      data: airlines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all airlines (admin - including inactive)
route.get("/admin/airlines", isAdmin, canManageContent, async (req, res) => {
  try {
    const airlines = await Airline.find().sort({ displayOrder: 1, name: 1 });
    res.json({
      success: true,
      data: airlines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get airline by ID
route.get("/airlines/:id", async (req, res) => {
  try {
    const airline = await Airline.findById(req.params.id);
    if (!airline) {
      return res.status(404).json({
        success: false,
        error: "شركة الطيران غير موجودة"
      });
    }
    if (!airline.isActive) {
      return res.status(404).json({
        success: false,
        error: "شركة الطيران غير متاحة"
      });
    }
    res.json({
      success: true,
      data: airline
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create airline (admin only)
route.post("/admin/airlines", 
  isAdmin, 
  canManageContent, 
  validateSchema(airlineSchema, 'body'), 
  async (req, res) => {
    try {
      const { name, code, description, logo, country, isActive, displayOrder } = req.body;

      // Check if airline with this code already exists
      const existingAirline = await Airline.findOne({ code: code.toUpperCase() });
      if (existingAirline) {
        return res.status(400).json({
          success: false,
          error: "كود شركة الطيران مستخدم بالفعل"
        });
      }

      // Check if airline with this name already exists
      const existingByName = await Airline.findOne({ name });
      if (existingByName) {
        return res.status(400).json({
          success: false,
          error: "اسم شركة الطيران مستخدم بالفعل"
        });
      }

      const airline = new Airline({
        name,
        code: code.toUpperCase(),
        description,
        logo,
        country,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0
      });

      await airline.save();

      res.status(201).json({
        success: true,
        message: "تم إضافة شركة الطيران بنجاح",
        data: airline
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Update airline (admin only)
route.put("/admin/airlines/:id", 
  isAdmin, 
  canManageContent, 
  validateSchema(airlineSchema, 'body'), 
  async (req, res) => {
    try {
      const { name, code, description, logo, country, isActive, displayOrder } = req.body;

      const airline = await Airline.findById(req.params.id);
      if (!airline) {
        return res.status(404).json({
          success: false,
          error: "شركة الطيران غير موجودة"
        });
      }

      // Check if new code is already taken by another airline
      if (code && code.toUpperCase() !== airline.code) {
        const existingAirline = await Airline.findOne({ code: code.toUpperCase() });
        if (existingAirline) {
          return res.status(400).json({
            success: false,
            error: "كود شركة الطيران مستخدم بالفعل"
          });
        }
      }

      // Check if new name is already taken by another airline
      if (name && name !== airline.name) {
        const existingByName = await Airline.findOne({ name });
        if (existingByName) {
          return res.status(400).json({
            success: false,
            error: "اسم شركة الطيران مستخدم بالفعل"
          });
        }
      }

      // Update fields
      airline.name = name || airline.name;
      airline.code = code ? code.toUpperCase() : airline.code;
      airline.description = description || airline.description;
      airline.logo = logo || airline.logo;
      airline.country = country !== undefined ? country : airline.country;
      airline.isActive = isActive !== undefined ? isActive : airline.isActive;
      airline.displayOrder = displayOrder !== undefined ? displayOrder : airline.displayOrder;

      await airline.save();

      res.json({
        success: true,
        message: "تم تحديث شركة الطيران بنجاح",
        data: airline
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Delete airline (admin only)
route.delete("/admin/airlines/:id", isAdmin, canManageContent, async (req, res) => {
  try {
    const airline = await Airline.findByIdAndDelete(req.params.id);
    if (!airline) {
      return res.status(404).json({
        success: false,
        error: "شركة الطيران غير موجودة"
      });
    }

    res.json({
      success: true,
      message: "تم حذف شركة الطيران بنجاح",
      data: airline
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = route;

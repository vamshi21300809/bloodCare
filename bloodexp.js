require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
  console.error("❌ Admin credentials missing");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI missing");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI,)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ Mongo Error:", err));

const donorSchema = new mongoose.Schema({
  fname: String,
  lname: String,
  blood: String,
  dob: String,
  city: String,
  phone: String,
  lastDonate: String,
  notes: String,
  gender: String,
  weight: Number,
  email: String
});

const Donor = mongoose.model("Donor", donorSchema);

app.get("/donors", async (req, res) => {
  try {
    const donors = await Donor.find();
    res.json(donors);
  } catch (err) {
    res.status(500).json({ 
      error: "Failed to fetch donors" 
    });
  }
});

app.post("/donors", async (req, res) => {
  try {
    console.log(req.body);
  const { fname, lname, blood, dob, city, phone, weight, gender } = req.body;
  if (!fname || !lname || !blood || !dob || !city || !phone || weight == null || !gender) {
    return res.status(400).json({ 
      error: "Missing required fields" 
    });
  }
  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ 
      error: "Invalid phone number" 
    });
  }
  const donor = new Donor(req.body);
  await donor.save();
  res.json(donor);
  } 
  catch (err) {
    console.log(err);
    res.status(500).json({ 
      error: "Server error" 
    });
  }
});

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader === 'Basic ' + Buffer.from(process.env.ADMIN_USER + ":" + process.env.ADMIN_PASS).toString('base64')) {
    next();
  } 
  else {
    res.status(401).json({ 
      error: "Unauthorized. Admin access required." 
    });
  }
};

app.delete("/donors/:id", authenticateAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: "Invalid ID" 
      });
    }
    const deleted = await Donor.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ 
        error: "Donor not found" 
      });
    }
    res.json({ 
      message: "Deleted" 
    });
  } 
  catch (err) {
    res.status(500).json({ 
      error: "Delete failed" 
    });
  }
});

app.put("/donors/:id", authenticateAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: "Invalid ID" 
      });
    }
    const updated = await Donor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ 
        error: "Donor not found" 
      });
    }
    res.json(updated);
  } 
  catch (err) {
    console.log(err);
    res.status(500).json({ 
      error: "Update failed" 
    });
  }
});

const ADMIN = {
  username:process.env.ADMIN_USER,
  password: process.env.ADMIN_PASS
};

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN.username && password === ADMIN.password) {
    return res.json({ 
      success: true 
    });
  }
  res.status(401).json({ 
    success: false, message: "Invalid credentials" 
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
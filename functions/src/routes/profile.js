const express = require("express");
const { profileDoc } = require("../services/firestore");

const router = express.Router();

const GENDERS = ["male", "female"];
const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"];

// GET /api/profile
router.get("/", async (req, res) => {
  const snap = await profileDoc(req.userId).get();
  res.json(snap.exists ? snap.data() : {});
});

// PUT /api/profile
router.put("/", async (req, res) => {
  const { weightKg, heightCm, age, gender, activityLevel } = req.body;

  if (!weightKg || !heightCm || !age || !gender || !activityLevel) {
    return res.status(400).json({ error: "all_fields_required" });
  }
  if (!GENDERS.includes(gender)) {
    return res.status(400).json({ error: "invalid_gender" });
  }
  if (!ACTIVITY_LEVELS.includes(activityLevel)) {
    return res.status(400).json({ error: "invalid_activity_level" });
  }

  const doc = {
    weightKg: Number(weightKg),
    heightCm: Number(heightCm),
    age: Number(age),
    gender,
    activityLevel,
    updatedAt: new Date().toISOString(),
  };

  await profileDoc(req.userId).set(doc, { merge: true });
  res.json(doc);
});

module.exports = router;

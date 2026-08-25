const express = require("express");
const { supabase, ensureUser } = require("../services/supabase");

const router = express.Router();

const GENDERS = ["male", "female"];
const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"];

const toApi = (row) =>
  row
    ? {
        weightKg: row.weight_kg,
        heightCm: row.height_cm,
        age: row.age,
        gender: row.gender,
        activityLevel: row.activity_level,
        updatedAt: row.updated_at,
      }
    : {};

// GET /api/profile
router.get("/", async (req, res) => {
  const { data, error } = await supabase().from("profiles").select("*").eq("user_id", req.userId).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(toApi(data));
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

  await ensureUser(req.userId);

  const row = {
    user_id: req.userId,
    weight_kg: Number(weightKg),
    height_cm: Number(heightCm),
    age: Number(age),
    gender,
    activity_level: activityLevel,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase().from("profiles").upsert(row, { onConflict: "user_id" }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(toApi(data));
});

module.exports = router;

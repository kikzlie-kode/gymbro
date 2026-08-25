const express = require("express");
const { supabase, ensureUser } = require("../services/supabase");

const router = express.Router();

const toApi = (row) => ({
  id: row.id,
  name: row.name,
  exerciseType: row.exercise_type,
  createdAt: row.created_at,
});

// GET /api/presets
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("presets")
    .select("*")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(toApi));
});

// POST /api/presets
router.post("/", async (req, res) => {
  const { name, exerciseType } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name_required" });
  }

  await ensureUser(req.userId);

  const { data, error } = await supabase
    .from("presets")
    .insert({ user_id: req.userId, name: name.trim(), exercise_type: exerciseType || null })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(toApi(data));
});

// DELETE /api/presets/:id
router.delete("/:id", async (req, res) => {
  const { error } = await supabase().from("presets").delete().eq("id", req.params.id).eq("user_id", req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

module.exports = router;

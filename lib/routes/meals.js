const express = require("express");
const { supabase, ensureUser } = require("../services/supabase");

const router = express.Router();

const toApi = (row) => ({
  id: row.id,
  name: row.name,
  calories: row.calories,
  date: row.date,
  note: row.note,
  createdAt: row.created_at,
});

// GET /api/meals?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", async (req, res) => {
  const { from, to } = req.query;
  let q = supabase.from("meals").select("*").eq("user_id", req.userId).order("date", { ascending: false }).limit(200);
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(toApi));
});

// POST /api/meals
router.post("/", async (req, res) => {
  const { name, calories, date, note } = req.body;

  if (!name || !calories || !date) {
    return res.status(400).json({ error: "name_calories_and_date_required" });
  }

  await ensureUser(req.userId);

  const { data, error } = await supabase
    .from("meals")
    .insert({ user_id: req.userId, name, calories: Number(calories), date, note: note || null })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(toApi(data));
});

// DELETE /api/meals/:id
router.delete("/:id", async (req, res) => {
  const { error } = await supabase.from("meals").delete().eq("id", req.params.id).eq("user_id", req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

module.exports = router;

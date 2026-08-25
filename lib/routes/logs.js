const express = require("express");
const { supabase, ensureUser } = require("../services/supabase");

const router = express.Router();

const toApi = (row) => ({
  id: row.id,
  todoId: row.todo_id,
  exerciseType: row.exercise_type,
  date: row.date,
  durationMin: row.duration_min,
  sets: row.sets,
  reps: row.reps,
  weightKg: row.weight_kg,
  note: row.note,
  exercises: row.exercises,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// GET /api/logs?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", async (req, res) => {
  const { from, to } = req.query;
  let q = supabase.from("logs").select("*").eq("user_id", req.userId).order("date", { ascending: false }).limit(200);
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(toApi));
});

// POST /api/logs
router.post("/", async (req, res) => {
  const { todoId, exerciseType, date, durationMin, sets, reps, weightKg, note, exercises } = req.body;

  if (!exerciseType || !date) {
    return res.status(400).json({ error: "exerciseType_and_date_required" });
  }

  await ensureUser(req.userId);

  const { data, error } = await supabase
    .from("logs")
    .insert({
      user_id: req.userId,
      todo_id: todoId || null,
      exercise_type: exerciseType,
      date,
      duration_min: durationMin ?? null,
      sets: sets ?? null,
      reps: reps ?? null,
      weight_kg: weightKg ?? null,
      note: note || null,
      exercises: Array.isArray(exercises) ? exercises : null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (todoId) {
    await supabase.from("todos").update({ status: "done" }).eq("id", todoId).eq("user_id", req.userId);
  }

  res.status(201).json(toApi(data));
});

// PATCH /api/logs/:id
router.patch("/:id", async (req, res) => {
  const allowed = ["exerciseType", "date", "durationMin", "sets", "reps", "weightKg", "note", "exercises"];
  const columnFor = {
    exerciseType: "exercise_type",
    date: "date",
    durationMin: "duration_min",
    sets: "sets",
    reps: "reps",
    weightKg: "weight_kg",
    note: "note",
    exercises: "exercises",
  };

  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[columnFor[key]] = req.body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("logs")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "not_found" });
  res.json(toApi(data));
});

// DELETE /api/logs/:id
router.delete("/:id", async (req, res) => {
  const { error } = await supabase.from("logs").delete().eq("id", req.params.id).eq("user_id", req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

module.exports = router;

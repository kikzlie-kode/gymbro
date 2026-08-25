const express = require("express");
const { supabase, ensureUser } = require("../services/supabase");

const router = express.Router();

const toApi = (row) => ({
  id: row.id,
  title: row.title,
  exerciseType: row.exercise_type,
  scheduledDate: row.scheduled_date,
  scheduledTime: row.scheduled_time,
  recurring: row.recurring,
  reminderEnabled: row.reminder_enabled,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// GET /api/todos?date=YYYY-MM-DD  (defaults to today, scoped to req.userId)
router.get("/", async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", req.userId)
    .eq("scheduled_date", date);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(toApi));
});

// POST /api/todos
router.post("/", async (req, res) => {
  const { title, exerciseType, scheduledDate, scheduledTime, recurring, reminderEnabled } = req.body;

  if (!title || !scheduledDate) {
    return res.status(400).json({ error: "title_and_scheduledDate_required" });
  }

  await ensureUser(req.userId);

  const { data, error } = await supabase
    .from("todos")
    .insert({
      user_id: req.userId,
      title,
      exercise_type: exerciseType || null,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || null,
      recurring: recurring || "none",
      reminder_enabled: reminderEnabled !== false,
      status: "pending",
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(toApi(data));
});

// PATCH /api/todos/:id
router.patch("/:id", async (req, res) => {
  const allowed = ["title", "exerciseType", "scheduledDate", "scheduledTime", "recurring", "reminderEnabled", "status"];
  const columnFor = {
    title: "title",
    exerciseType: "exercise_type",
    scheduledDate: "scheduled_date",
    scheduledTime: "scheduled_time",
    recurring: "recurring",
    reminderEnabled: "reminder_enabled",
    status: "status",
  };

  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[columnFor[key]] = req.body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("todos")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "not_found" });
  res.json(toApi(data));
});

// DELETE /api/todos/:id
router.delete("/:id", async (req, res) => {
  const { error } = await supabase().from("todos").delete().eq("id", req.params.id).eq("user_id", req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

module.exports = router;

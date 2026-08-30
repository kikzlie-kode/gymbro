const express = require("express");
const { todosCol } = require("../services/firestore");

const router = express.Router();

// GET /api/todos?date=YYYY-MM-DD  (defaults to today, scoped to req.userId)
router.get("/", async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const snap = await todosCol(req.userId).where("scheduledDate", "==", date).get();
  res.json(snap.docs.map(toJson));
});

// POST /api/todos
router.post("/", async (req, res) => {
  const {
    title,
    exerciseType,
    scheduledDate,
    scheduledTime,
    recurring,
    reminderEnabled,
    exercises
  } = req.body;

  if (!title || !scheduledDate) {
    return res.status(400).json({
      error: "title_and_scheduledDate_required"
    });
  }

  const doc = {
    title,
    exerciseType: exerciseType || null,
    scheduledDate,
    scheduledTime: scheduledTime || null,

    recurring: recurring || "none",
    reminderEnabled: reminderEnabled !== false,

    exercises: Array.isArray(exercises)
      ? exercises
      : [],

    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const ref = await todosCol(req.userId).add(doc);

  res.status(201).json({
    id: ref.id,
    ...doc
  });
});

// PATCH /api/todos/:id
router.patch("/:id", async (req, res) => {
  const allowed = [
    "title",
    "exerciseType",
    "scheduledDate",
    "scheduledTime",
    "recurring",
    "reminderEnabled",
    "status",
    "exercises"
  ]; const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
  updates.updatedAt = new Date().toISOString();

  await todosCol(req.userId).doc(req.params.id).set(updates, { merge: true });
  res.json({ id: req.params.id, ...updates });
});

// DELETE /api/todos/:id
router.delete("/:id", async (req, res) => {
  await todosCol(req.userId).doc(req.params.id).delete();
  res.status(204).end();
});

function toJson(doc) {
  return { id: doc.id, ...doc.data() };
}

module.exports = router;

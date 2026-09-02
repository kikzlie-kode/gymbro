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
    exercises,
    entryType,
    weightKg,
    reps,
    sets
  } = req.body;

  if (!title || !scheduledDate) {
    return res.status(400).json({
      error: "title_and_scheduledDate_required"
    });
  }

  // entryType แยกให้ชัดเจนว่าเป็นการเพิ่มแบบ manual (กรอก weight/reps/set เอง)
  // หรือแบบ set (built-in / custom preset ที่มีหลายท่า) — ค่า default เดาจาก exercises
  // ให้ backward-compatible กับ client เก่าที่ยังไม่ส่ง entryType มา
  const resolvedEntryType =
    entryType === "manual" || entryType === "set"
      ? entryType
      : (Array.isArray(exercises) && exercises.length > 0 ? "set" : "manual");

  const doc = {
    title,
    exerciseType: exerciseType || null,
    scheduledDate,
    scheduledTime: scheduledTime || null,

    recurring: recurring || "none",
    reminderEnabled: reminderEnabled !== false,

    entryType: resolvedEntryType,

    // manual entry เท่านั้นที่ใช้ field เหล่านี้ — ไม่ปะปนกับ exercises ของ custom set
    weightKg: resolvedEntryType === "manual" && weightKg != null ? Number(weightKg) : null,
    reps: resolvedEntryType === "manual" && reps != null ? Number(reps) : null,
    sets: resolvedEntryType === "manual" && sets != null ? Number(sets) : null,

    // custom set เท่านั้นที่ใช้ exercises — manual entry จะเป็น [] เสมอ
    exercises: resolvedEntryType === "set" && Array.isArray(exercises)
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
    "exercises",
    "entryType",
    "weightKg",
    "reps",
    "sets"
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
const express = require("express");
const { logsCol, todosCol } = require("../services/firestore");

const router = express.Router();

// GET /api/logs?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", async (req, res) => {
  const { from, to } = req.query;
  let q = logsCol(req.userId).orderBy("date", "desc");
  if (from) q = q.where("date", ">=", from);
  if (to) q = q.where("date", "<=", to);
  const snap = await q.limit(200).get();
  res.json(snap.docs.map(toJson));
});

// POST /api/logs
router.post("/", async (req, res) => {
  const { todoId, exerciseType, date, durationMin, sets, reps, weightKg, note } = req.body;

  if (!exerciseType || !date) {
    return res.status(400).json({ error: "exerciseType_and_date_required" });
  }

  const doc = {
    todoId: todoId || null,
    exerciseType,
    date,
    durationMin: durationMin ?? null,
    sets: sets ?? null,
    reps: reps ?? null,
    weightKg: weightKg ?? null,
    note: note || null,
    createdAt: new Date().toISOString(),
  };

  const ref = await logsCol(req.userId).add(doc);

  if (todoId) {
    await todosCol(req.userId).doc(todoId).set({ status: "done" }, { merge: true });
  }

  res.status(201).json({ id: ref.id, ...doc });
});

// DELETE /api/logs/:id
router.delete("/:id", async (req, res) => {
  await logsCol(req.userId).doc(req.params.id).delete();
  res.status(204).end();
});

function toJson(doc) {
  return { id: doc.id, ...doc.data() };
}

module.exports = router;

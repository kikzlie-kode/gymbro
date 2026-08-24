const express = require("express");
const { mealsCol } = require("../services/firestore");

const router = express.Router();

// GET /api/meals?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", async (req, res) => {
  const { from, to } = req.query;
  let q = mealsCol(req.userId).orderBy("date", "desc");
  if (from) q = q.where("date", ">=", from);
  if (to) q = q.where("date", "<=", to);
  const snap = await q.limit(200).get();
  res.json(snap.docs.map(toJson));
});

// POST /api/meals
router.post("/", async (req, res) => {
  const { name, calories, date, note } = req.body;

  if (!name || !calories || !date) {
    return res.status(400).json({ error: "name_calories_and_date_required" });
  }

  const doc = {
    name,
    calories: Number(calories),
    date,
    note: note || null,
    createdAt: new Date().toISOString(),
  };

  const ref = await mealsCol(req.userId).add(doc);
  res.status(201).json({ id: ref.id, ...doc });
});

// DELETE /api/meals/:id
router.delete("/:id", async (req, res) => {
  await mealsCol(req.userId).doc(req.params.id).delete();
  res.status(204).end();
});

function toJson(doc) {
  return { id: doc.id, ...doc.data() };
}

module.exports = router;

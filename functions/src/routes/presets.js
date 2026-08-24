const express = require("express");
const { presetsCol } = require("../services/firestore");

const router = express.Router();

// GET /api/presets
router.get("/", async (req, res) => {
  const snap = await presetsCol(req.userId).orderBy("createdAt", "asc").get();
  res.json(snap.docs.map(toJson));
});

// POST /api/presets
router.post("/", async (req, res) => {
  const { name, exerciseType } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name_required" });
  }

  const doc = {
    name: name.trim(),
    exerciseType: exerciseType || null,
    createdAt: new Date().toISOString(),
  };
  const ref = await presetsCol(req.userId).add(doc);
  res.status(201).json({ id: ref.id, ...doc });
});

// DELETE /api/presets/:id
router.delete("/:id", async (req, res) => {
  await presetsCol(req.userId).doc(req.params.id).delete();
  res.status(204).end();
});

function toJson(doc) {
  return { id: doc.id, ...doc.data() };
}

module.exports = router;

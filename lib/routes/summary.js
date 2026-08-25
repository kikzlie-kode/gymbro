const express = require("express");
const { supabase } = require("../services/supabase");

const router = express.Router();

// GET /api/summary?days=30
// Returns per-day totals for charting + a simple streak count.
router.get("/", async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 30, 180);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("logs")
    .select("date, duration_min")
    .eq("user_id", req.userId)
    .gte("date", sinceStr)
    .order("date", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const byDate = {};
  for (const log of data) {
    if (!byDate[log.date]) {
      byDate[log.date] = { date: log.date, sessions: 0, totalDurationMin: 0 };
    }
    byDate[log.date].sessions += 1;
    byDate[log.date].totalDurationMin += Number(log.duration_min) || 0;
  }

  const series = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  const streak = computeStreak(new Set(series.map((s) => s.date)));

  res.json({ days, series, streak, totalSessions: data.length });
});

function computeStreak(dateSet) {
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (dateSet.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

module.exports = router;

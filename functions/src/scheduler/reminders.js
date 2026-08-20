const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { db } = require("../services/firestore");
const { client } = require("../line/client");
const { reminderMessage } = require("../line/messages");

const LINE_CHANNEL_ACCESS_TOKEN = defineSecret("LINE_CHANNEL_ACCESS_TOKEN");

// Runs every 15 minutes. Finds today's pending todos whose scheduledTime falls
// within the last 15-minute window and pushes a LINE reminder for each.
const sendReminders = onSchedule(
  { schedule: "every 15 minutes", timeZone: "Asia/Bangkok", secrets: [LINE_CHANNEL_ACCESS_TOKEN] },
  async () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const nowHHMM = now.toTimeString().slice(0, 5);
    const windowStart = minutesAgo(nowHHMM, 15);

    const snap = await db
      .collectionGroup("todos")
      .where("scheduledDate", "==", today)
      .where("status", "==", "pending")
      .where("reminderEnabled", "==", true)
      .get();

    const sends = [];
    for (const doc of snap.docs) {
      const todo = doc.data();
      if (!todo.scheduledTime) continue;
      if (todo.scheduledTime <= windowStart || todo.scheduledTime > nowHHMM) continue;

      const userId = doc.ref.parent.parent.id;
      sends.push(
        client
          .pushMessage({ to: userId, messages: [reminderMessage({ id: doc.id, ...todo })] })
          .catch((err) => console.error(`push failed for ${userId}`, err))
      );
    }

    await Promise.all(sends);
    console.log(`sendReminders: checked ${snap.size} todos, sent ${sends.length} reminders`);
  }
);

function minutesAgo(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m - minutes);
  return d.toTimeString().slice(0, 5);
}

module.exports = { sendReminders };

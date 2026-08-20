const express = require("express");
const cors = require("cors");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const webhookRouter = require("./line/webhook");
const { requireLineAuth } = require("./routes/auth");
const todosRouter = require("./routes/todos");
const logsRouter = require("./routes/logs");
const summaryRouter = require("./routes/summary");
const { sendReminders } = require("./scheduler/reminders");

// Declared here and bound per-function below; values come from
// `firebase functions:secrets:set <NAME>` (production) or functions/.env (emulator).
const LINE_CHANNEL_ACCESS_TOKEN = defineSecret("LINE_CHANNEL_ACCESS_TOKEN");
const LINE_CHANNEL_SECRET = defineSecret("LINE_CHANNEL_SECRET");
const LIFF_CHANNEL_ID = defineSecret("LIFF_CHANNEL_ID");

// --- LINE Messaging API webhook (signature-verified, no CORS needed) ---
const webhookApp = express();
webhookApp.use("/", webhookRouter);
exports.webhook = onRequest(
  { region: "asia-southeast1", secrets: [LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET] },
  webhookApp
);

// --- LIFF-facing REST API (LINE ID token auth) ---
const apiApp = express();
apiApp.use(cors({ origin: true }));
apiApp.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
apiApp.use(express.json());
apiApp.use(requireLineAuth);
// Firebase Hosting's rewrite forwards the full "/api/..." path to this
// function without stripping the "/api" prefix, so routes must mount there.
apiApp.use("/api/todos", todosRouter);
apiApp.use("/api/logs", logsRouter);
apiApp.use("/api/summary", summaryRouter);
exports.api = onRequest({ region: "asia-southeast1", secrets: [LIFF_CHANNEL_ID] }, apiApp);

// --- Scheduled reminder push (every 15 min) ---
exports.sendReminders = sendReminders;

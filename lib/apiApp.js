const express = require("express");
const cors = require("cors");
const { requireLineAuth } = require("./auth");
const todosRouter = require("./routes/todos");
const logsRouter = require("./routes/logs");
const mealsRouter = require("./routes/meals");
const profileRouter = require("./routes/profile");
const presetsRouter = require("./routes/presets");
const summaryRouter = require("./routes/summary");

const apiApp = express();
apiApp.use(cors({ origin: true }));
apiApp.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
apiApp.use(express.json());
apiApp.use(requireLineAuth);

// Mounted at the router root because the Vercel catch-all
// (api/[...slug].js) already strips nothing — it forwards the full
// "/api/..." path through, same as the old Firebase Hosting rewrite did.
apiApp.use("/api/todos", todosRouter);
apiApp.use("/api/logs", logsRouter);
apiApp.use("/api/meals", mealsRouter);
apiApp.use("/api/profile", profileRouter);
apiApp.use("/api/presets", presetsRouter);
apiApp.use("/api/summary", summaryRouter);

module.exports = apiApp;

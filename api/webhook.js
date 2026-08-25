// Separate function from the rest of the API on purpose: LINE's signature
// verification (inside lineSignatureMiddleware) needs the raw, unparsed
// request body. This app never calls express.json(), so the body stream
// reaches line.middleware() untouched — same as it did on Firebase
// Functions.
//
// IMPORTANT: Vercel auto-parses application/json request bodies before
// your code runs, which destroys the raw bytes LINE's HMAC signature was
// computed over (JSON.stringify never round-trips byte-for-byte). The
// `config.api.bodyParser = false` below tells Vercel to skip that and
// hand us the untouched stream instead — required for signature
// verification to ever succeed on this endpoint.
const express = require("express");
const serverless = require("serverless-http");
const webhookRouter = require("../lib/line/webhook");

const webhookApp = express();
webhookApp.use("/", webhookRouter);

const handler = serverless(webhookApp);
handler.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = handler;
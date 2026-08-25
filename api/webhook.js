// Separate function from the rest of the API on purpose: LINE's signature
// verification (inside lineSignatureMiddleware) needs the raw, unparsed
// request body. This app never calls express.json(), so the body stream
// reaches line.middleware() untouched — same as it did on Firebase
// Functions.
//
// IMPORTANT #1: Vercel auto-parses application/json request bodies before
// your code runs, which destroys the raw bytes LINE's HMAC signature was
// computed over (JSON.stringify never round-trips byte-for-byte). The
// `config.api.bodyParser = false` below tells Vercel to skip that and
// hand us the untouched stream instead — required for signature
// verification to ever succeed on this endpoint.
//
// IMPORTANT #2: export the Express app directly. Vercel's Node.js runtime
// already understands a plain `(req, res) => {}` handler — which is
// exactly what an Express app is — so no adapter is needed. (An earlier
// version of this file wrapped the app with `serverless-http`, a package
// built for AWS Lambda's `(event, context)` calling convention. Vercel
// calls handlers with `(req, res)` instead, so that wrapper received the
// wrong arguments and crashed with a 500 on every request — including
// LINE's webhook "Verify" check.)
const express = require("express");
const webhookRouter = require("../lib/line/webhook");

const webhookApp = express();
webhookApp.use("/", webhookRouter);

webhookApp.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = webhookApp;

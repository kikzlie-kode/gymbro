// Catch-all for every /api/* route except /api/webhook (that one has its
// own file). Exports the Express app directly — Vercel's Node.js runtime
// natively understands a `(req, res) => {}` handler, which an Express app
// already is. No `serverless-http` adapter needed (that package targets
// AWS Lambda's `(event, context)` signature, not Vercel's).
//
// bodyParser is turned off here too: apiApp already calls express.json()
// itself, so we let Express do the JSON parsing instead of letting Vercel
// consume the stream first (which would leave nothing for express.json()
// to read).
const apiApp = require("../lib/apiApp");

apiApp.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = apiApp;

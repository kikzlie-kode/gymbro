// Catch-all for every /api/* route except /api/webhook (that one has its
// own file — see api/webhook.js — because it needs the raw request body
// for LINE signature verification, while this app needs JSON parsing).
const serverless = require("serverless-http");
const apiApp = require("../lib/apiApp");

module.exports = serverless(apiApp);

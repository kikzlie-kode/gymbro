const line = require("@line/bot-sdk");

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

// line.middleware() validates channelSecret eagerly and throws if it's missing.
// Secrets aren't available yet when Firebase's deploy-time static analysis
// requires this module, so build the middleware lazily on first real request
// instead of at module load.
let cachedMiddleware = null;
function lineSignatureMiddleware(req, res, next) {
  if (!cachedMiddleware) {
    cachedMiddleware = line.middleware({ channelSecret: process.env.LINE_CHANNEL_SECRET });
  }
  return cachedMiddleware(req, res, next);
}

module.exports = { line, client, config, lineSignatureMiddleware };

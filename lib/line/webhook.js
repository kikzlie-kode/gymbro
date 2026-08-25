const express = require("express");
const { client, lineSignatureMiddleware } = require("./client");
const { welcomeMessage, unknownCommandMessage } = require("./messages");
const { upsertUser } = require("../services/supabase");

const router = express.Router();

router.post("/", lineSignatureMiddleware, async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error("webhook error", err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  const userId = event.source && event.source.userId;
  if (!userId) return;

  if (event.type === "follow") {
    await upsertProfile(userId);
    return client.replyMessage({ replyToken: event.replyToken, messages: [welcomeMessage()] });
  }

  if (event.type === "message" && event.message.type === "text") {
    const text = event.message.text.trim();
    if (text === "เมนู" || text.toLowerCase() === "menu") {
      return client.replyMessage({ replyToken: event.replyToken, messages: [welcomeMessage()] });
    }
    return client.replyMessage({ replyToken: event.replyToken, messages: [unknownCommandMessage()] });
  }
}

async function upsertProfile(userId) {
  let profile = {};
  try {
    profile = await client.getProfile(userId);
  } catch (err) {
    console.warn("could not fetch profile", err.message);
  }
  await upsertUser(userId, { displayName: profile.displayName, pictureUrl: profile.pictureUrl });
}

module.exports = router;

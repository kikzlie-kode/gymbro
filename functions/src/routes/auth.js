// Verifies the LIFF ID token sent by the frontend and attaches req.userId.
// The LIFF app gets this token via liff.getIDToken() and sends it as
// "Authorization: Bearer <idToken>" on every API request.

const LIFF_CHANNEL_ID = process.env.LIFF_CHANNEL_ID;

async function requireLineAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!idToken) {
    return res.status(401).json({ error: "missing_token" });
  }

  try {
    const params = new URLSearchParams({ id_token: idToken, client_id: LIFF_CHANNEL_ID });
    const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!verifyRes.ok) {
      return res.status(401).json({ error: "invalid_token" });
    }

    const payload = await verifyRes.json();
    req.userId = payload.sub;
    req.lineProfile = { name: payload.name, picture: payload.picture };
    next();
  } catch (err) {
    console.error("auth verify failed", err);
    res.status(401).json({ error: "invalid_token" });
  }
}

module.exports = { requireLineAuth };

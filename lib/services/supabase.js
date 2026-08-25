const { createClient } = require("@supabase/supabase-js");

// IMPORTANT: this uses the *service_role* key, which bypasses Row Level
// Security. It must only ever be used server-side (inside /api handlers),
// never sent to the LIFF frontend. Every query below is manually scoped by
// userId (taken from the verified LINE ID token) to keep the same
// per-user isolation the old firestore.rules gave us.

// Lazy-load to avoid crashing at module-load time if env vars are missing.
// The client is created on first use (first API request), not at import time.
let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return supabase;
}

async function upsertUser(userId, { displayName, pictureUrl } = {}) {
  const client = getSupabaseClient();
  const { error } = await client
    .from("users")
    .upsert(
      { id: userId, display_name: displayName ?? null, picture_url: pictureUrl ?? null, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
  if (error) throw error;
}

// Makes sure a `users` row exists before writing child rows (todos/logs/...),
// since those tables have a foreign key on user_id. Cheap upsert, safe to
// call on every authenticated request.
async function ensureUser(userId) {
  const client = getSupabaseClient();
  const { error } = await client
    .from("users")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

module.exports = { supabase: getSupabaseClient, upsertUser, ensureUser };

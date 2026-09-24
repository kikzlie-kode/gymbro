import liff from "@line/liff";

/**
 * Get current LINE ID Token
 */
async function authHeader() {
  const idToken = liff.getIDToken();

  if (!idToken) {
    throw new Error("not logged in");
  }

  return {
    Authorization: `Bearer ${idToken}`,
  };
}

/**
 * Make API request
 *
 * If LINE ID Token is expired/invalid (401),
 * reload the LIFF app once so that liff.init()
 * can obtain a fresh authentication context.
 */
async function request(path, options = {}, retry = true) {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(options.headers || {}),
  };

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  /**
   * LINE ID Token expired / invalid
   *
   * Don't immediately show "session timeout".
   * Reload the LIFF app so App.jsx can run liff.init()
   * again and obtain a fresh ID token.
   */
  if (res.status === 401 && retry) {
    console.warn("LINE ID Token expired. Re-initializing LIFF...");

    // Prevent infinite reload loop
    const reauthKey = "gymbro_reauth_attempt";

    if (!sessionStorage.getItem(reauthKey)) {
      sessionStorage.setItem(reauthKey, "1");

      window.location.reload();

      // Stop execution while page is reloading
      return new Promise(() => {});
    }

    // Already tried re-authentication once
    sessionStorage.removeItem(reauthKey);

    throw new Error("session_expired");
  }

  /**
   * Request failed
   */
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    throw new Error(
      body.error || `request_failed_${res.status}`
    );
  }

  /**
   * No content
   */
  if (res.status === 204) {
    return null;
  }

  return res.json();
}


/* =========================================================
   API
   ========================================================= */

export const api = {

  /* -------------------------
     Todos
  ------------------------- */

  getTodos: (date) =>
    request(
      `/todos${date ? `?date=${date}` : ""}`
    ),

  createTodo: (todo) =>
    request("/todos", {
      method: "POST",
      body: JSON.stringify(todo),
    }),

  updateTodo: (id, updates) =>
    request(`/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  deleteTodo: (id) =>
    request(`/todos/${id}`, {
      method: "DELETE",
    }),


  /* -------------------------
     Logs
  ------------------------- */

  getLogs: (from, to) =>
    request(
      `/logs?${new URLSearchParams({
        ...(from && { from }),
        ...(to && { to }),
      })}`
    ),

  createLog: (log) =>
    request("/logs", {
      method: "POST",
      body: JSON.stringify(log),
    }),

  updateLog: (id, updates) =>
    request(`/logs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  deleteLog: (id) =>
    request(`/logs/${id}`, {
      method: "DELETE",
    }),


  /* -------------------------
     Meals
  ------------------------- */

  getMeals: (from, to) =>
    request(
      `/meals?${new URLSearchParams({
        ...(from && { from }),
        ...(to && { to }),
      })}`
    ),

  createMeal: (meal) =>
    request("/meals", {
      method: "POST",
      body: JSON.stringify(meal),
    }),

  deleteMeal: (id) =>
    request(`/meals/${id}`, {
      method: "DELETE",
    }),


  /* -------------------------
     Profile
  ------------------------- */

  getProfile: () =>
    request("/profile"),

  saveProfile: (profile) =>
    request("/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),


  /* -------------------------
     Presets
  ------------------------- */

  getPresets: () =>
    request("/presets"),

  createPreset: (
    name,
    exerciseType,
    exercises = []
  ) =>
    request("/presets", {
      method: "POST",
      body: JSON.stringify({
        name,
        exerciseType,
        exercises,
      }),
    }),

  deletePreset: (id) =>
    request(`/presets/${id}`, {
      method: "DELETE",
    }),

  updatePreset: (id, data) =>
    request(`/presets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),


  /* -------------------------
     Summary
  ------------------------- */

  getSummary: (days = 30) =>
    request(`/summary?days=${days}`),
};
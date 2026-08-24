import liff from "@line/liff";

async function authHeader() {
  const idToken = liff.getIDToken();
  if (!idToken) throw new Error("not logged in");
  return { Authorization: `Bearer ${idToken}` };
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(options.headers || {}),
  };
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `request_failed_${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getTodos: (date) => request(`/todos${date ? `?date=${date}` : ""}`),
  createTodo: (todo) => request("/todos", { method: "POST", body: JSON.stringify(todo) }),
  updateTodo: (id, updates) => request(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
  deleteTodo: (id) => request(`/todos/${id}`, { method: "DELETE" }),

  getLogs: (from, to) => request(`/logs?${new URLSearchParams({ ...(from && { from }), ...(to && { to }) })}`),
  createLog: (log) => request("/logs", { method: "POST", body: JSON.stringify(log) }),
  updateLog: (id, updates) => request(`/logs/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
  deleteLog: (id) => request(`/logs/${id}`, { method: "DELETE" }),

  getMeals: (from, to) => request(`/meals?${new URLSearchParams({ ...(from && { from }), ...(to && { to }) })}`),
  createMeal: (meal) => request("/meals", { method: "POST", body: JSON.stringify(meal) }),
  deleteMeal: (id) => request(`/meals/${id}`, { method: "DELETE" }),

  getProfile: () => request("/profile"),
  saveProfile: (profile) => request("/profile", { method: "PUT", body: JSON.stringify(profile) }),

  getPresets: () => request("/presets"),
  createPreset: (name, exerciseType) =>
    request("/presets", { method: "POST", body: JSON.stringify({ name, exerciseType }) }),
  deletePreset: (id) => request(`/presets/${id}`, { method: "DELETE" }),

  getSummary: (days = 30) => request(`/summary?days=${days}`),
};

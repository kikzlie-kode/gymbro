import { api } from "../api/client.js";
import { useLoad } from "../hooks/useLoad.js";

const today = new Date().toISOString().slice(0, 10);

export default function Today() {
  const { data: todos, error, reload } = useLoad(() => api.getTodos(today), []);

  async function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.createTodo({
      title: fd.get("title"),
      exerciseType: fd.get("exerciseType") || null,
      scheduledDate: today,
      scheduledTime: fd.get("scheduledTime") || null,
      reminderEnabled: fd.get("reminderEnabled") === "on",
    });
    e.target.reset();
    reload();
  }

  async function toggleDone(todo) {
    await api.updateTodo(todo.id, { status: todo.status === "done" ? "pending" : "done" });
    reload();
  }

  async function remove(id) {
    await api.deleteTodo(id);
    reload();
  }

  if (error) {
    return (
      <div className="empty">
        โหลดข้อมูลไม่สำเร็จ: {error}
        <div>
          <button className="ghost" onClick={reload} style={{ marginTop: 8 }}>
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }
  if (todos === null) return <div className="empty">กำลังโหลด...</div>;

  const sorted = [...todos].sort((a, b) => (a.scheduledTime || "").localeCompare(b.scheduledTime || ""));

  return (
    <>
      <form className="card" onSubmit={handleSubmit}>
        <label>กิจกรรมวันนี้</label>
        <input name="title" placeholder="เช่น วิ่ง 5 กม." required />
        <div className="row">
          <input name="exerciseType" placeholder="ประเภท (cardio, weight...)" />
          <input name="scheduledTime" type="time" style={{ maxWidth: 120 }} />
        </div>
        <label className="row" style={{ gap: 6, marginBottom: 8 }}>
          <input type="checkbox" name="reminderEnabled" style={{ width: "auto" }} defaultChecked />
          แจ้งเตือนเมื่อถึงเวลา
        </label>
        <button className="primary" type="submit" style={{ width: "100%" }}>
          + เพิ่มรายการ
        </button>
      </form>

      {sorted.length === 0 ? (
        <div className="empty">วันนี้ยังไม่มีตารางออกกำลังกาย</div>
      ) : (
        sorted.map((t) => (
          <div key={t.id} className={`card ${t.status === "done" ? "done" : ""}`}>
            <div className="row between">
              <div>
                <div className="card-title">{t.title}</div>
                <div className="card-meta">
                  {t.scheduledTime ? `${t.scheduledTime} · ` : ""}
                  {t.exerciseType || ""}
                </div>
              </div>
              <div className="row">
                <button className="ghost" onClick={() => toggleDone(t)}>
                  {t.status === "done" ? "↺" : "✓"}
                </button>
                <button className="ghost" onClick={() => remove(t.id)}>
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );
}

import { api } from "../api/client.js";
import { useLoad } from "../hooks/useLoad.js";

const today = new Date().toISOString().slice(0, 10);

export default function Log() {
  const { data: logs, error, reload } = useLoad(() => api.getLogs(), []);

  async function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.createLog({
      exerciseType: fd.get("exerciseType"),
      date: fd.get("date"),
      durationMin: fd.get("durationMin") ? Number(fd.get("durationMin")) : null,
      sets: fd.get("sets") ? Number(fd.get("sets")) : null,
      reps: fd.get("reps") ? Number(fd.get("reps")) : null,
      weightKg: fd.get("weightKg") ? Number(fd.get("weightKg")) : null,
      note: fd.get("note") || null,
    });
    e.target.reset();
    reload();
  }

  async function remove(id) {
    await api.deleteLog(id);
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
  if (logs === null) return <div className="empty">กำลังโหลด...</div>;

  return (
    <>
      <form className="card" onSubmit={handleSubmit}>
        <label>บันทึกผลการออกกำลังกาย</label>
        <input name="exerciseType" placeholder="ประเภท เช่น squat, วิ่ง" required />
        <div className="row">
          <input name="date" type="date" defaultValue={today} required />
          <input name="durationMin" type="number" placeholder="นาที" />
        </div>
        <div className="row">
          <input name="sets" type="number" placeholder="เซ็ต" />
          <input name="reps" type="number" placeholder="ครั้ง/เซ็ต" />
          <input name="weightKg" type="number" step="0.5" placeholder="น้ำหนัก (กก.)" />
        </div>
        <textarea name="note" placeholder="โน้ต (ถ้ามี)" rows="2" />
        <button className="primary" type="submit" style={{ width: "100%" }}>
          บันทึกผล
        </button>
      </form>

      {logs.length === 0 ? (
        <div className="empty">ยังไม่มีบันทึกผล</div>
      ) : (
        logs.map((l) => (
          <div key={l.id} className="card">
            <div className="row between">
              <div>
                <div className="card-title">{l.exerciseType}</div>
                <div className="card-meta">
                  {l.date}
                  {l.durationMin ? ` · ${l.durationMin} นาที` : ""}
                  {l.sets ? ` · ${l.sets}x${l.reps || "-"}` : ""}
                  {l.weightKg ? ` · ${l.weightKg} กก.` : ""}
                </div>
              </div>
              <button className="ghost" onClick={() => remove(l.id)}>
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}

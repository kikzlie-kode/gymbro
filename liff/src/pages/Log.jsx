import { Fragment, useState } from "react";
import { api } from "../api/client.js";
import { useSettings } from "../i18n.jsx";

const today = new Date().toISOString().slice(0, 10);

export default function Log({ logs, reload }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyIds, setBusyIds] = useState(() => new Set());

  const [editingId, setEditingId] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [exerciseDrafts, setExerciseDrafts] = useState({}); // { [logId]: [{name, sets, reps, kcal, done}] }
  const [savingExercises, setSavingExercises] = useState(() => new Set());

  const { t } = useSettings();

  // Get unique Sets values from past logs + BUILT_IN_SET_EXERCISES
  const uniqueSetsOptions = () => {
    const setsSet = new Set();
    
    // Add from past logs
    logs.forEach((l) => {
      if (l.sets) setsSet.add(l.sets);
    });
    
    // Add common preset values (1, 3, 4, 5)
    [1, 3, 4, 5].forEach((s) => setsSet.add(s));
    
    return Array.from(setsSet).sort((a, b) => a - b);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    const form = e.target;
    const fd = new FormData(form);
    setSubmitting(true);
    try {
      await api.createLog({
        exerciseType: fd.get("exerciseType"),
        date: fd.get("date"),
        sets: fd.get("sets") ? Number(fd.get("sets")) : null,
        reps: fd.get("reps") ? Number(fd.get("reps")) : null,
        note: fd.get("note") || null,
      });
      form.reset();
      setShowAddForm(false);
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id) {
    if (busyIds.has(id)) return;
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      await api.deleteLog(id);
      reload();
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleEditSubmit(e, id) {
    e.preventDefault();
    if (savingEdit) return;
    const fd = new FormData(e.target);
    setSavingEdit(true);
    try {
      await api.updateLog(id, {
        exerciseType: fd.get("exerciseType"),
        date: fd.get("date"),
        sets: fd.get("sets") ? Number(fd.get("sets")) : null,
        reps: fd.get("reps") ? Number(fd.get("reps")) : null,
        note: fd.get("note") || null,
      });
      setEditingId(null);
      reload();
    } finally {
      setSavingEdit(false);
    }
  }

  function toggleExpand(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function startEditExercises(log) {
    setExerciseDrafts((d) => ({ ...d, [log.id]: log.exercises.map((ex) => ({ ...ex })) }));
    setEditingId(log.id);
  }

  function updateDraftField(logId, index, field, value) {
    setExerciseDrafts((prev) => {
      const list = [...(prev[logId] || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [logId]: list };
    });
  }

  function toggleDraftDone(logId, index) {
    setExerciseDrafts((prev) => {
      const list = [...(prev[logId] || [])];
      list[index] = { ...list[index], done: !list[index].done };
      return { ...prev, [logId]: list };
    });
  }

  async function saveExercises(logId) {
    const list = exerciseDrafts[logId];
    if (!list) return;
    setSavingExercises((prev) => new Set(prev).add(logId));
    try {
      const cleaned = list.map((ex) => ({
        name: ex.name,
        sets: Number(ex.sets) || 0,
        reps: ex.reps,
        kcal: Number(ex.kcal) || 0,
        done: !!ex.done,
      }));
      await api.updateLog(logId, { exercises: cleaned });
      setEditingId(null);
      reload();
    } finally {
      setSavingExercises((prev) => {
        const next = new Set(prev);
        next.delete(logId);
        return next;
      });
    }
  }

  return (
    <>
      {showAddForm ? (
        <form className="card" onSubmit={handleSubmit}>
          <span className="card-eyebrow">{t("logEyebrow")}</span>
          <input name="exerciseType" placeholder={t("logTypePlaceholder")} required autoFocus />
          <input name="date" type="date" defaultValue={today} required />
          <div className="row">
            <select name="sets" defaultValue="">
              <option value="">{t("setsPlaceholder")}</option>
              {uniqueSetsOptions().map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input name="reps" type="number" placeholder={t("repsPlaceholder")} />
          </div>
          <textarea name="note" placeholder={t("notePlaceholder")} rows="2" />
          <div className="row">
            <button className="primary" type="submit" style={{ flex: 1 }} disabled={submitting}>
              {t("saveLog")}
            </button>
            <button type="button" className="ghost" onClick={() => setShowAddForm(false)}>
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : (
        <div className="card add-log-prompt" onClick={() => setShowAddForm(true)}>
          <div className="row between">
            <span className="card-eyebrow" style={{ marginBottom: 0 }}>
              {t("logEyebrow")}
            </span>
            <span className="add-log-plus">+</span>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="empty">{t("emptyLogs")}</div>
      ) : (
        logs.map((l) => {
          const hasExercises = Array.isArray(l.exercises) && l.exercises.length > 0;

          // Basic-field edit form (non-set logs), or the free-text fallback for a
          // set log if it somehow has no exercises breakdown.
          if (editingId === l.id && !hasExercises) {
            return (
              <form key={l.id} className="card" onSubmit={(e) => handleEditSubmit(e, l.id)}>
                <input name="exerciseType" defaultValue={l.exerciseType} placeholder={t("logTypePlaceholder")} required />
                <input name="date" type="date" defaultValue={l.date} required />
                <div className="row">
                  <select name="sets" defaultValue={l.sets ?? ""}>
                    <option value="">{t("setsPlaceholder")}</option>
                    {uniqueSetsOptions().map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input name="reps" type="number" defaultValue={l.reps ?? ""} placeholder={t("repsPlaceholder")} />
                </div>
                <textarea name="note" defaultValue={l.note ?? ""} placeholder={t("notePlaceholder")} rows="2" />
                <div className="row">
                  <button className="primary" type="submit" style={{ flex: 1 }} disabled={savingEdit}>
                    {t("saveChanges")}
                  </button>
                  <button type="button" className="ghost" onClick={() => setEditingId(null)}>
                    {t("cancel")}
                  </button>
                </div>
              </form>
            );
          }

          // Exercise-column edit form (set logs), entered only via the pencil button.
          if (editingId === l.id && hasExercises) {
            const draft = exerciseDrafts[l.id] || [];
            return (
              <div key={l.id} className="card">
                <span className="card-eyebrow">{l.exerciseType}</span>
                <div className="exercise-table">
                  <div className="col-head"></div>
                  <div className="col-head">{t("exNameHead")}</div>
                  <div className="col-head">{t("exRepsHead")}</div>
                  <div className="col-head">{t("exSetsHead")}</div>
                  {draft.map((ex, i) => (
                    <Fragment key={i}>
                      <button
                        type="button"
                        className={`plate small ${ex.done ? "done" : ""}`}
                        onClick={() => toggleDraftDone(l.id, i)}
                        aria-label={t("markDone")}
                      >
                        ✓
                      </button>
                      <input value={ex.name} onChange={(e) => updateDraftField(l.id, i, "name", e.target.value)} />
                      <input value={ex.reps} onChange={(e) => updateDraftField(l.id, i, "reps", e.target.value)} />
                      <input
                        type="number"
                        value={ex.sets}
                        onChange={(e) => updateDraftField(l.id, i, "sets", e.target.value)}
                      />
                    </Fragment>
                  ))}
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="primary"
                    style={{ flex: 1 }}
                    onClick={() => saveExercises(l.id)}
                    disabled={savingExercises.has(l.id)}
                  >
                    {t("saveChanges")}
                  </button>
                  <button type="button" className="ghost" onClick={() => setEditingId(null)}>
                    {t("cancel")}
                  </button>
                </div>
              </div>
            );
          }

          const expanded = expandedIds.has(l.id);
          const doneCount = hasExercises ? l.exercises.filter((ex) => ex.done).length : 0;
          const totalKcal = hasExercises
            ? l.exercises.reduce((sum, ex) => sum + (ex.done ? Number(ex.kcal) || 0 : 0), 0)
            : 0;

          return (
            <div key={l.id} className="card">
              <div
                className="row between"
                onClick={hasExercises ? () => toggleExpand(l.id) : undefined}
                style={hasExercises ? { cursor: "pointer" } : undefined}
              >
                <div>
                  <div className="card-title">
                    {l.exerciseType}
                    {hasExercises && <span className="expand-caret">{expanded ? "▲" : "▼"}</span>}
                  </div>
                  <div className="card-meta">
                    {hasExercises ? (
                      `${doneCount}/${l.exercises.length} · ${totalKcal} kcal`
                    ) : (
                      <>
                        {l.date}
                        {l.durationMin ? ` · ${l.durationMin} ${t("minUnit")}` : ""}
                        {l.sets ? ` · ${l.sets}x${l.reps || "-"}` : ""}
                        {l.weightKg ? ` · ${l.weightKg} ${t("kgUnit")}` : ""}
                      </>
                    )}
                  </div>
                </div>
                <div className="row" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="icon-btn"
                    onClick={() => (hasExercises ? startEditExercises(l) : setEditingId(l.id))}
                    aria-label={t("edit")}
                  >
                    ✎
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => remove(l.id)}
                    disabled={busyIds.has(l.id)}
                    aria-label={t("delete")}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {hasExercises && expanded && (
                <div className="exercise-table">
                  <div className="col-head"></div>
                  <div className="col-head">{t("exNameHead")}</div>
                  <div className="col-head">{t("exRepsHead")}</div>
                  <div className="col-head">{t("exSetsHead")}</div>
                  {l.exercises.map((ex, i) => (
                    <Fragment key={i}>
                      <span className={`plate small ${ex.done ? "done" : ""}`}>✓</span>
                      <span className={ex.done ? "done-text" : ""}>{ex.name}</span>
                      <span>{ex.reps}</span>
                      <span>{ex.sets}</span>
                    </Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

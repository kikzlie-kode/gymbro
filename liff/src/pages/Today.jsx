import { Fragment, useState } from "react";
import { api } from "../api/client.js";
import { useSettings, EXERCISE_TYPES, BUILT_IN_SET_EXERCISES } from "../i18n.jsx";

const today = new Date().toISOString().slice(0, 10);
const BUILT_IN_SETS = ["HIIT", "Cardio", "Weight Training"];
const EMPTY_SET = new Set();

export default function Today({ todos, reload, reloadLogs, reloadSummary, customPresets, reloadPresets }) {
  const [titleMode, setTitleModeRaw] = useState("manual"); // manual | set
  const [submitting, setSubmitting] = useState(false);
  const [busyIds, setBusyIds] = useState(() => new Set());

  const [setChoice, setSetChoice] = useState("");
  const [showCustomBox, setShowCustomBox] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetType, setNewSetType] = useState("");
  const [creatingSet, setCreatingSet] = useState(false);

  // Custom exercises for building a custom set
  const [customExercises, setCustomExercises] = useState([]);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseSets, setNewExerciseSets] = useState("");
  const [newExerciseReps, setNewExerciseReps] = useState("");

  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [exerciseDone, setExerciseDone] = useState({}); // { [todoId]: Set(exerciseIndex) }

  // เก็บรายละเอียด exercises ของแต่ละ todo
  const [todoExercises, setTodoExercises] = useState({});

  const { t, lang } = useSettings();

  function setTitleMode(mode) {
    setTitleModeRaw(mode);
    setSetChoice("");
    setShowCustomBox(false);
    setNewSetName("");
    setNewSetType("");
  }

  function handleSetChoiceChange(value) {
    setSetChoice(value);
    setShowCustomBox(value === "__custom__");
    if (value === "__custom__") {
      setCustomExercises([]);
      setNewSetName("");
      setNewSetType("");
      setNewExerciseName("");
      setNewExerciseSets("");
      setNewExerciseReps("");
    }
  }

  function addCustomExercise() {
    if (!newExerciseName.trim()) return;
    setCustomExercises((prev) => [
      ...prev,
      {
        name: newExerciseName,
        sets: newExerciseSets ? Number(newExerciseSets) : null,
        reps: newExerciseReps || null,
      },
    ]);
    setNewExerciseName("");
    setNewExerciseSets("");
    setNewExerciseReps("");
  }

  function removeCustomExercise(index) {
    setCustomExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    let title, exerciseType, customExercisesData;

    if (titleMode === "manual") {
      const fd = new FormData(e.target);

      title = fd.get("title");
      exerciseType = fd.get("exerciseType") || null;

    } else {

      if (setChoice === "__custom__") {

        if (!newSetName.trim() || customExercises.length === 0) {
          alert(
            t("fillRequiredFields") ||
            "Please fill in set name and add exercises"
          );
          return;
        }

        title = newSetName;
        exerciseType = newSetType || null;

        // เก็บรายละเอียดท่าออกกำลังกาย
        customExercisesData = customExercises;

      } else if (!setChoice) {

        return;

      } else if (BUILT_IN_SETS.includes(setChoice)) {

        title = setChoice;
        exerciseType = setChoice;

      } else {

        const preset = customPresets.find((p) => p.id === setChoice);

        if (!preset) return;

        title = preset.name;
        exerciseType = preset.exerciseType || null;

        // ถ้า Custom Preset มี exercises ติดมาด้วย
        customExercisesData = preset.exercises || [];
      }
    }

    setSubmitting(true);

    try {
      await api.createTodo({
        title,
        exerciseType,
        scheduledDate: today,
        exercises: customExercisesData || null,
      });

      e.target.reset();
      setTitleMode("manual");
      setCustomExercises([]);

      reload();

    } finally {
      setSubmitting(false);
    }
  }

  async function withBusy(id, fn) {
    if (busyIds.has(id)) return;
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      await fn();
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function complete(todo) {
    return withBusy(todo.id, async () => {
      const isSet = BUILT_IN_SETS.includes(todo.title);
      const done = exerciseDone[todo.id] || EMPTY_SET;
      const exercises = isSet
        ? BUILT_IN_SET_EXERCISES[todo.title][lang].map((ex, i) => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          kcal: ex.kcal,
          done: done.has(i),
        }))
        : undefined;

      await api.createLog({
        todoId: todo.id,
        exerciseType: todo.exerciseType || todo.title,
        date: today,
        note: todo.exerciseType ? todo.title : null,
        exercises,
      });
      await api.deleteTodo(todo.id);
      reload();
      reloadLogs();
      reloadSummary();
    });
  }

  function remove(id) {
    return withBusy(id, async () => {
      await api.deleteTodo(id);
      reload();
    });
  }

  async function createCustomSet() {
    const name = newSetName.trim();
    if (!name || creatingSet) return;
    setCreatingSet(true);
    try {
      const created = await api.createPreset(
        name,
        newSetType || null,
        customExercises
      );
      await reloadPresets();
      setSetChoice(created.id);
      setShowCustomBox(false);
      setNewSetName("");
      setNewSetType("");
    } finally {
      setCreatingSet(false);
    }
  }

  function cancelCustomBox() {
    setShowCustomBox(false);
    setSetChoice("");
  }

  function toggleExpanded(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleExerciseDone(todoId, index) {
    setExerciseDone((prev) => {
      const current = new Set(prev[todoId] || []);
      current.has(index) ? current.delete(index) : current.add(index);
      return { ...prev, [todoId]: current };
    });
  }

  return (
    <>
      <form className="card" onSubmit={handleSubmit}>
        <span className="card-eyebrow">{t("todayEyebrow")}</span>

        <div className="seg">
          <button
            type="button"
            className={titleMode === "manual" ? "active" : ""}
            onClick={() => setTitleMode("manual")}
          >
            {t("modeManual")}
          </button>
          <button
            type="button"
            className={titleMode === "set" ? "active" : ""}
            onClick={() => setTitleMode("set")}
          >
            {t("modePreset")}
          </button>
        </div>

        {titleMode === "manual" ? (
          <>
            <input name="title" placeholder={t("titlePlaceholder")} required />
            <select name="exerciseType" defaultValue="">
              <option value="">{t("typeEmpty")}</option>
              {EXERCISE_TYPES.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            {showCustomBox ? (
              <>
                <input
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder={t("newSetNamePlaceholder")}
                  autoFocus
                />
                <input
                  value={newSetType}
                  onChange={(e) => setNewSetType(e.target.value)}
                  placeholder={t("typeEmpty")}
                />

                {/* Add exercises section */}
                <div style={{ marginTop: 16, marginBottom: 16, borderTop: "1px solid #e0e0e0", paddingTop: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>เพิ่มท่าออกกำลังกาย:</p>

                  <div className="row">
                    <input
                      value={newExerciseName}
                      onChange={(e) => setNewExerciseName(e.target.value)}
                      placeholder="ชื่อท่า"
                      style={{ flex: 1 }}
                    />
                  </div>

                  <div className="row">
                    <input
                      value={newExerciseSets}
                      onChange={(e) => setNewExerciseSets(e.target.value)}
                      placeholder="Sets"
                      type="number"
                      style={{ flex: 1 }}
                    />
                    <input
                      value={newExerciseReps}
                      onChange={(e) => setNewExerciseReps(e.target.value)}
                      placeholder="Reps/set"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="primary"
                      onClick={addCustomExercise}
                      style={{ flex: "0 0 auto" }}
                    >
                      +
                    </button>
                  </div>

                  {/* List of added exercises */}
                  {customExercises.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      {customExercises.map((ex, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                          <span style={{ fontSize: 13 }}>
                            {ex.name} {ex.sets && `• ${ex.sets}x${ex.reps || "?"}`}
                          </span>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => removeCustomExercise(idx)}
                            style={{ fontSize: 12, padding: "4px 8px" }}
                          >
                            ลบ
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="row" style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    className="primary"
                    style={{ flex: 1 }}
                    onClick={createCustomSet}
                    disabled={!newSetName.trim() || customExercises.length === 0 || creatingSet}
                  >
                    {t("createSetBtn")}
                  </button>
                  <button type="button" className="ghost" onClick={cancelCustomBox}>
                    {t("cancel")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <select
                  value={setChoice}
                  onChange={(e) => handleSetChoiceChange(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    {t("setPlaceholder")}
                  </option>
                  {BUILT_IN_SETS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {customPresets.length > 0 && (
                    <optgroup label={t("presetCustom")}>
                      {customPresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value="__custom__">{t("addCustomOption")}</option>
                </select>

                {BUILT_IN_SETS.includes(setChoice) && (
                  <div className="set-detail">
                    <span className="card-eyebrow">{setChoice}</span>
                    <div className="exercise-table no-check">
                      <div className="col-head">{t("exNameHead")}</div>
                      <div className="col-head">{t("exRepsHead")}</div>
                      <div className="col-head">{t("exSetsHead")}</div>
                      {BUILT_IN_SET_EXERCISES[setChoice][lang].map((ex) => (
                        <Fragment key={ex.name}>
                          <span>{ex.name}</span>
                          <span>{ex.reps}</span>
                          <span>{ex.sets}</span>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                )}
                {customPresets.includes(setChoice) && (
                  <div className="set-detail">
                    <span className="card-eyebrow">{setChoice}</span>
                    <div className="exercise-table no-check">
                      <div className="col-head">{t("exNameHead")}</div>
                      <div className="col-head">{t("exRepsHead")}</div>
                      <div className="col-head">{t("exSetsHead")}</div>
                      {customPresets[setChoice][lang].map((ex) => (
                        <Fragment key={ex.name}>
                          <span>{ex.name}</span>
                          <span>{ex.reps}</span>
                          <span>{ex.sets}</span>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <button className="primary" type="submit" style={{ width: "100%" }} disabled={submitting}>
          {t("addTodo")}
        </button>
      </form>

      {todos.length === 0 ? (
        <div className="empty">{t("emptyToday")}</div>
      ) : (
        todos.map((td) => {
          const isBuiltInSet = BUILT_IN_SETS.includes(td.title);
          // const isBuiltOutSet = BUILT_OUT_SETS.includes(td.title);
          const exercises = isBuiltInSet
            ? BUILT_IN_SET_EXERCISES[td.title][lang]
            : (td.exercises || []);
          const isSet = exercises.length > 0;
          const doneSet = exerciseDone[td.id] || EMPTY_SET;
          const expanded = expandedIds.has(td.id);
          const totalKcal = isSet
            ? exercises.reduce(
              (sum, ex, i) =>
                sum + (doneSet.has(i) ? (ex.kcal || 0) : 0),
              0
            )
            : 0;

          return (
            <div key={td.id} className="card">
              <div
                className="row between"
                onClick={isSet ? () => toggleExpanded(td.id) : undefined}
                style={isSet ? { cursor: "pointer" } : undefined}
              >
                <div>
                  <div className="card-title">
                    {td.title}
                    {isSet && <span className="expand-caret">{expanded ? "▲" : "▼"}</span>}
                  </div>
                  <div className="card-meta">
                    {isSet ? `${doneSet.size}/${exercises.length} · ${totalKcal} kcal` : td.exerciseType || ""}
                  </div>
                </div>
                <div className="row" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="plate"
                    onClick={() => complete(td)}
                    disabled={busyIds.has(td.id)}
                    aria-label={t("markDone")}
                  >
                    ✓
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => remove(td.id)}
                    disabled={busyIds.has(td.id)}
                    aria-label={t("delete")}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {isSet && expanded && (
                <div className="exercise-table">

                  <div className="col-head"></div>
                  <div className="col-head">
                    {t("exNameHead")}
                  </div>
                  <div className="col-head">
                    {t("exRepsHead")}
                  </div>
                  <div className="col-head">
                    {t("exSetsHead")}
                  </div>

                  {exercises.map((ex, i) => (
                    <Fragment key={`${ex.name}-${i}`}>

                      <button
                        type="button"
                        className={`plate small ${doneSet.has(i) ? "done" : ""
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExerciseDone(td.id, i);
                        }}
                        aria-label={t("markDone")}
                      >
                        ✓
                      </button>

                      <span
                        className={
                          doneSet.has(i)
                            ? "done-text"
                            : ""
                        }
                      >
                        {ex.name}
                      </span>

                      <span>
                        {ex.reps || "-"}
                      </span>

                      <span>
                        {ex.sets || "-"}
                      </span>

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

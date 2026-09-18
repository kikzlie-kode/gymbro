import { Fragment, useState, useEffect } from "react";
import { api } from "../api/client.js";
import { useSettings, BUILT_IN_SET_EXERCISES } from "../i18n.jsx";

const today = new Date().toISOString().slice(0, 10);
const BUILT_IN_SETS = ["HIIT", "Cardio", "Weight Training"];
const EMPTY_SET = new Set();

export default function Today({ todos, reload, reloadLogs, reloadSummary, customPresets = [], reloadPresets }) {
  const [titleMode, setTitleModeRaw] = useState("manual"); // manual | set
  const [submitting, setSubmitting] = useState(false);
  const [busyIds, setBusyIds] = useState(() => new Set());

  const [setChoice, setSetChoice] = useState("");
  const [showCustomBox, setShowCustomBox] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetType, setNewSetType] = useState("");
  const [creatingSet, setCreatingSet] = useState(false);

  // Edit preset modal
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editExercises, setEditExercises] = useState([]);
  const [editingExerciseIdx, setEditingExerciseIdx] = useState(null);
  const [editExName, setEditExName] = useState("");
  const [editExSets, setEditExSets] = useState("");
  const [editExReps, setEditExReps] = useState("");
  const [editExWeight, setEditExWeight] = useState("");
  const [editExFocus, setEditExFocus] = useState("");

  // Custom exercises for building a custom set
  const [customExercises, setCustomExercises] = useState([]);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseSets, setNewExerciseSets] = useState("");
  const [newExerciseReps, setNewExerciseReps] = useState("");
  const [newExerciseWeight, setNewExerciseWeight] = useState("");
  const [newExerciseFocus, setNewExerciseFocus] = useState("");

  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [exerciseDone, setExerciseDone] = useState({}); // { [todoId]: Set(exerciseIndex) }
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [selectedExerciseFocus, setSelectedExerciseFocus] = useState("");
  const [selectedExerciseWeight, setSelectedExerciseWeight] = useState(null);

  // Edit exercise in add item session
  const [editingSessionEx, setEditingSessionEx] = useState(null);
  const [editSessionExName, setEditSessionExName] = useState("");
  const [editSessionExSets, setEditSessionExSets] = useState("");
  const [editSessionExReps, setEditSessionExReps] = useState("");
  const [editSessionExWeight, setEditSessionExWeight] = useState("");
  const [sessionExercises, setSessionExercises] = useState({});

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
        weight: newExerciseWeight ? Number(newExerciseWeight) : null,
        focus: newExerciseFocus || null,
      },
    ]);
    setNewExerciseName("");
    setNewExerciseSets("");
    setNewExerciseReps("");
    setNewExerciseWeight("");
    setNewExerciseFocus("");
  }

  function openEditSessionEx(idx, ex) {
    setEditingSessionEx(idx);
    setEditSessionExName(ex.name);
    setEditSessionExSets(ex.sets || "");
    setEditSessionExReps(ex.reps || "");
    setEditSessionExWeight(sessionExercises[ex.name] || ex.weight || "");
  }

  function closeEditSessionEx() {
    setEditingSessionEx(null);
    setEditSessionExName("");
    setEditSessionExSets("");
    setEditSessionExReps("");
    setEditSessionExWeight("");
  }

  function saveEditSessionEx(oldName) {
    if (!editSessionExName.trim()) return;
    // Update sessionExercises weight
    if (editSessionExWeight) {
      setSessionExercises((prev) => ({
        ...prev,
        [editSessionExName]: Number(editSessionExWeight),
      }));
    }
    closeEditSessionEx();
  }

  function openEditPreset(preset) {
    setEditingPresetId(preset.id);
    setEditName(preset.name);
    setEditType(preset.exerciseType || "");
    setEditExercises(preset.exercises || []);
  }

  function closeEditPreset() {
    setEditingPresetId(null);
    setEditName("");
    setEditType("");
    setEditExercises([]);
    setEditingExerciseIdx(null);
    setEditExName("");
    setEditExSets("");
    setEditExReps("");
    setEditExWeight("");
    setEditExFocus("");
  }

  function startEditExercise(idx) {
    const ex = editExercises[idx];
    setEditingExerciseIdx(idx);
    setEditExName(ex.name || "");
    setEditExSets(ex.sets || "");
    setEditExReps(ex.reps || "");
    setEditExWeight(ex.weight || "");
    setEditExFocus(ex.focus || "");
  }

  function cancelEditExercise() {
    setEditingExerciseIdx(null);
    setEditExName("");
    setEditExSets("");
    setEditExReps("");
    setEditExWeight("");
    setEditExFocus("");
  }

  function saveEditExercise() {
    if (!editExName.trim()) return;
    setEditExercises((prev) =>
      prev.map((ex, idx) =>
        idx === editingExerciseIdx
          ? {
              name: editExName,
              sets: editExSets ? Number(editExSets) : null,
              reps: editExReps || null,
              weight: editExWeight ? Number(editExWeight) : null,
              focus: editExFocus || null,
            }
          : ex
      )
    );
    cancelEditExercise();
  }

  function removeEditExercise(idx) {
    setEditExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function addEditExercise() {
    if (!editExName.trim()) return;
    setEditExercises((prev) => [
      ...prev,
      {
        name: editExName,
        sets: editExSets ? Number(editExSets) : null,
        reps: editExReps || null,
        weight: editExWeight ? Number(editExWeight) : null,
        focus: editExFocus || null,
      },
    ]);
    setEditExName("");
    setEditExSets("");
    setEditExReps("");
    setEditExWeight("");
    setEditExFocus("");
  }

  async function handleSaveEditPreset() {
    if (!editName.trim()) return;
    try {
      // Update via API
      await api.updatePreset(editingPresetId, {
        name: editName,
        exerciseType: editType || null,
        exercises: editExercises,
      });
      await reloadPresets();
      closeEditPreset();
    } catch (err) {
      console.error("Error saving preset:", err);
    }
  }

  function getExercisesForSetChoice(choice) {
    if (!choice) return [];

    if (BUILT_IN_SETS.includes(choice)) {
      return BUILT_IN_SET_EXERCISES[choice]?.[lang] || [];
    }

    const preset = customPresets?.find((p) => p.id === choice);

    return preset?.exercises || [];
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    let title, exerciseType, entryType, customExercisesData;
    let weightKg = null, reps = null, sets = null;

    if (titleMode === "manual") {
      const fd = new FormData(e.target);

      entryType = "manual";
      title = fd.get("title");
      exerciseType = null;

      const weightRaw = fd.get("weight");
      const repsRaw = fd.get("reps");
      const setsRaw = fd.get("sets");

      weightKg = weightRaw ? Number(weightRaw) : null;
      reps = repsRaw ? Number(repsRaw) : null;
      sets = setsRaw ? Number(setsRaw) : null;

    } else {

      entryType = "set";

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
        entryType,
        // manual และ set แยกกันเด็ดขาด: manual ใช้ weightKg/reps/sets, set ใช้ exercises
        weightKg: entryType === "manual" ? weightKg : null,
        reps: entryType === "manual" ? reps : null,
        sets: entryType === "manual" ? sets : null,
        exercises: entryType === "set" ? (customExercisesData || []) : [],
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
      const isBuiltInSet = BUILT_IN_SETS.includes(todo.title);
      const isManual = todo.entryType === "manual";

      if (isManual) {
        // manual entry: ไม่มี exercises array, ใช้ weightKg/reps/sets ที่เก็บบน todo ตรง ๆ
        await api.createLog({
          todoId: todo.id,
          exerciseType: todo.exerciseType || todo.title,
          date: today,
          note: todo.title,
          weightKg: todo.weightKg ?? null,
          reps: todo.reps ?? null,
          sets: todo.sets ?? null,
        });

        await api.deleteTodo(todo.id);

        reload();
        reloadLogs();
        reloadSummary();
        return;
      }

      const exercises = isBuiltInSet
        ? (BUILT_IN_SET_EXERCISES[todo.title]?.[lang] || [])
        : (todo.exercises || []);

      const isSet = exercises.length > 0;
      const done = exerciseDone[todo.id] || EMPTY_SET;

      const logExercises = isSet
        ? exercises.map((ex, i) => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          kcal: ex.kcal || 0,
          done: done.has(i),
        }))
        : undefined;

      await api.createLog({
        todoId: todo.id,
        exerciseType: todo.exerciseType || todo.title,
        date: today,
        note: todo.exerciseType ? todo.title : null,
        exercises: logExercises,
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
        newSetName,
        newSetType || null,
        customExercises
      );
      await reloadPresets();
      setSetChoice(created.id);
      setShowCustomBox(false);
      setNewSetName("");
      setNewSetType("");
      setCustomExercises([]);
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
            <div className="row">
              <input
                name="weight"
                type="number"
                step="any"
                min="0"
                placeholder={t("weightPlaceholder") || "น้ำหนัก (กก.)"}
                style={{ flex: 1 }}
              />
              <input
                name="reps"
                type="number"
                min="0"
                placeholder={t("repsPlaceholder") || "Reps"}
                style={{ flex: 1 }}
              />
              <input
                name="sets"
                type="number"
                min="0"
                placeholder={t("setsPlaceholder") || "Sets"}
                style={{ flex: 1 }}
              />
            </div>
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
                    <input
                      value={newExerciseWeight}
                      onChange={(e) => setNewExerciseWeight(e.target.value)}
                      placeholder="Weight (kg)"
                      type="number"
                      step="0.5"
                      style={{ flex: 1 }}
                    />
                    <input
                      value={newExerciseFocus}
                      onChange={(e) => setNewExerciseFocus(e.target.value)}
                      placeholder="Focus (Chest, Back, etc)"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="primary"
                      onClick={addCustomExercise}
                      style={{ flex: "0 0 auto" }}
                    >
                      + เพิ่ม
                    </button>
                  </div>

                  {/* List of added exercises */}
                  {customExercises.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      {customExercises.map((ex, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                          <span style={{ fontSize: 13 }}>
                            {ex.name} {ex.sets && `• ${ex.sets}x${ex.reps || "?"}`} {ex.weight && `• ${ex.weight}kg`} {ex.focus && `• ${ex.focus}`}
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

                {setChoice && getExercisesForSetChoice(setChoice).length > 0 && (() => {
                  const exercises = getExercisesForSetChoice(setChoice);
                  const selectedPreset = customPresets?.find(
                    (p) => p.id === setChoice
                  );

                  const title = BUILT_IN_SETS.includes(setChoice)
                    ? setChoice
                    : selectedPreset?.name || "";

                  return (
                    <div className="set-detail">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="card-eyebrow">{title}</span>
                        {!BUILT_IN_SETS.includes(setChoice) && selectedPreset && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => openEditPreset(selectedPreset)}
                            style={{ fontSize: "12px", padding: "4px 8px" }}
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </div>

                      <div className="exercise-table no-check" style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "12px",
                        wordBreak: "break-word",
                        whiteSpace: "normal"
                      }}>
                        <div className="col-head">{t("exNameHead")}</div>
                        <div className="col-head">{t("exRepsHead")}</div>
                        <div className="col-head">{t("exSetsHead")}</div>
                        <div className="col-head">Weight</div>

                        {exercises.map((ex, index) => (
                          <Fragment key={`${ex.name}-${index}`}>
                            <span style={{ wordBreak: "break-word" }}>{ex.name}</span>
                            <span>{ex.reps || "-"}</span>
                            <span>{ex.sets || "-"}</span>
                            <span>{ex.weight ? `${ex.weight}kg` : "-"}</span>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
          const customPreset = customPresets?.find(
            (preset) => preset.name === td.title
          );

          const isManual = td.entryType === "manual";

          const exercises = isBuiltInSet
            ? BUILT_IN_SET_EXERCISES[td.title]?.[lang] || []
            : (td.exercises && td.exercises.length > 0)
              ? td.exercises
              : customPreset?.exercises || [];

          const isSet = !isManual && exercises.length > 0;
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
                    {isSet
                      ? `${doneSet.size}/${exercises.length} · ${totalKcal} kcal`
                      : isManual
                        ? [
                          td.weightKg != null && `${td.weightKg} kg`,
                          td.reps != null && `${td.reps} reps`,
                          td.sets != null && `${td.sets} sets`,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                        : ""}
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
                  {/* <div className="col-head">
                    Focus
                  </div> */}

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
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        {ex.name}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExerciseFocus(ex.focus || "Not specified");
                            setSelectedExerciseWeight(sessionExercises[ex.name] || ex.weight || null);
                            setShowFocusModal(true);
                          }}
                          style={{
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "#666",
                            fontWeight: "bold",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            border: "1px solid #ddd",
                            backgroundColor: "#f5f5f5",
                            padding: "0",
                            margin: "0",
                            background: "none",
                          }}
                          aria-label="Show info"
                        >
                          ℹ
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditSessionEx(i, ex)}
                          style={{
                            cursor: "pointer",
                            fontSize: "12px",
                            color: "#666",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "20px",
                            height: "20px",
                            borderRadius: "3px",
                            border: "1px solid #ddd",
                            backgroundColor: "#f5f5f5",
                            padding: "0",
                            margin: "0",
                            background: "none",
                          }}
                          aria-label="Edit"
                        >
                          ✏️
                        </button>
                      </span>

                      <span>
                        {ex.reps || "-"}
                      </span>

                      <span>
                        {ex.sets || "-"}
                      </span>

                      {/* <span>
                        {ex.focus || "-"}
                      </span> */}

                    </Fragment>
                  ))}

                </div>
              )}
            </div>
          );
        })
      )}

      {/* Focus Info Modal */}
      {showFocusModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "300px",
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Exercise Info</h3>
            
            {/* Focus Area */}
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", fontWeight: "600", color: "#666", margin: "0 0 8px 0" }}>Focus Area</p>
              <p style={{ fontSize: "18px", fontWeight: "600", color: "#ff9500", margin: 0 }}>
                {selectedExerciseFocus}
              </p>
            </div>

            {/* Weight */}
            {selectedExerciseWeight && (
              <div style={{ marginBottom: "16px", paddingTop: "16px", borderTop: "1px solid #e0e0e0" }}>
                <p style={{ fontSize: "12px", fontWeight: "600", color: "#666", margin: "0 0 8px 0" }}>Weight</p>
                <p style={{ fontSize: "24px", fontWeight: "700", color: "#333", margin: 0 }}>
                  {selectedExerciseWeight}kg
                </p>
              </div>
            )}

            <button
              className="primary"
              onClick={() => setShowFocusModal(false)}
              style={{ width: "100%", marginTop: "16px" }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Preset Modal */}
      {editingPresetId && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "flex-end",
          zIndex: 1000
        }}>
          <div style={{
            width: "100%",
            background: "#fff",
            borderRadius: "12px 12px 0 0",
            padding: "20px",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Edit Preset</h3>
            
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Preset Name"
              style={{ width: "100%", marginBottom: "12px", padding: "8px", boxSizing: "border-box" }}
            />
            
            <input
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              placeholder="Type (optional)"
              style={{ width: "100%", marginBottom: "16px", padding: "8px", boxSizing: "border-box" }}
            />
            
            <div style={{ marginBottom: "16px", borderTop: "1px solid #e0e0e0", paddingTop: "12px" }}>
              <p style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>Exercises:</p>
              
              {/* Exercises List */}
              {editExercises.map((ex, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <span style={{ fontSize: "13px", flex: 1 }}>
                    {ex.name} {ex.sets && `• ${ex.sets}x${ex.reps || "?"}`} {ex.weight && `• ${ex.weight}kg`} {ex.focus && `• ${ex.focus}`}
                  </span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => startEditExercise(idx)}
                      style={{ fontSize: "11px", padding: "2px 6px" }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => removeEditExercise(idx)}
                      style={{ fontSize: "11px", padding: "2px 6px", color: "#d32f2f" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {/* Edit Exercise Form */}
              {editingExerciseIdx !== null ? (
                <div style={{ marginTop: "12px", padding: "12px", background: "#f5f5f5", borderRadius: "8px" }}>
                  <p style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px" }}>Edit Exercise</p>
                  <input
                    value={editExName}
                    onChange={(e) => setEditExName(e.target.value)}
                    placeholder="Exercise Name"
                    style={{ width: "100%", marginBottom: "8px", padding: "6px", boxSizing: "border-box", fontSize: "12px" }}
                  />
                  <input
                    value={editExSets}
                    onChange={(e) => setEditExSets(e.target.value)}
                    placeholder="Sets"
                    type="number"
                    style={{ width: "48%", marginRight: "4%", marginBottom: "8px", padding: "6px", boxSizing: "border-box", fontSize: "12px" }}
                  />
                  <input
                    value={editExReps}
                    onChange={(e) => setEditExReps(e.target.value)}
                    placeholder="Reps"
                    style={{ width: "48%", marginBottom: "8px", padding: "6px", boxSizing: "border-box", fontSize: "12px" }}
                  />
                  <input
                    value={editExWeight}
                    onChange={(e) => setEditExWeight(e.target.value)}
                    placeholder="Weight (kg)"
                    type="number"
                    step="0.5"
                    style={{ width: "48%", marginRight: "4%", marginBottom: "8px", padding: "6px", boxSizing: "border-box", fontSize: "12px" }}
                  />
                  <input
                    value={editExFocus}
                    onChange={(e) => setEditExFocus(e.target.value)}
                    placeholder="Focus (Chest, Back, etc)"
                    style={{ width: "48%", marginBottom: "8px", padding: "6px", boxSizing: "border-box", fontSize: "12px" }}
                  />
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      type="button"
                      className="primary"
                      onClick={saveEditExercise}
                      style={{ flex: 1, fontSize: "12px", padding: "6px" }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={cancelEditExercise}
                      style={{ flex: 1, fontSize: "12px", padding: "6px" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Add New Exercise Form */
                <div style={{ marginTop: "12px", padding: "12px", background: "#f5f5f5", borderRadius: "8px" }}>
                  <p style={{ fontSize: "11px", fontWeight: "600", marginBottom: "8px" }}>Add Exercise</p>
                  <input
                    value={editExName}
                    onChange={(e) => setEditExName(e.target.value)}
                    placeholder="Exercise Name"
                    style={{ width: "100%", marginBottom: "8px", padding: "6px", boxSizing: "border-box", fontSize: "12px" }}
                  />
                  <input
                    value={editExSets}
                    onChange={(e) => setEditExSets(e.target.value)}
                    placeholder="Sets"
                    type="number"
                    style={{ width: "48%", marginRight: "4%", marginBottom: "8px", padding: "6px", boxSizing: "border-box", fontSize: "12px" }}
                  />
                  <input
                    value={editExReps}
                    onChange={(e) => setEditExReps(e.target.value)}
                    placeholder="Reps"
                    style={{ width: "48%", marginBottom: "8px", padding: "6px", boxSizing: "border-box", fontSize: "12px" }}
                  />
                  <input
                    value={editExWeight}
                    onChange={(e) => setEditExWeight(e.target.value)}
                    placeholder="Weight (kg)"
                    type="number"
                    step="0.5"
                    style={{ width: "48%", marginRight: "4%", marginBottom: "8px", padding: "6px", boxSizing: "border-box", fontSize: "12px" }}
                  />
                  <input
                    value={editExFocus}
                    onChange={(e) => setEditExFocus(e.target.value)}
                    placeholder="Focus (Chest, Back, etc)"
                    style={{ width: "48%", marginBottom: "8px", padding: "6px", boxSizing: "border-box", fontSize: "12px" }}
                  />
                  <button
                    type="button"
                    className="primary"
                    onClick={addEditExercise}
                    style={{ width: "100%", fontSize: "12px", padding: "6px" }}
                  >
                    + Add Exercise
                  </button>
                </div>
              )}
            </div>
            
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="primary"
                onClick={handleSaveEditPreset}
                style={{ flex: 1 }}
              >
                Save
              </button>
              <button
                className="ghost"
                onClick={closeEditPreset}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exercise Weight Modal (Session) */}
      {editingSessionEx !== null && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "flex-end",
          zIndex: 1000
        }}>
          <div style={{
            width: "100%",
            background: "#fff",
            borderRadius: "12px 12px 0 0",
            padding: "20px",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Edit Exercise</h3>
            
            <input
              type="text"
              value={editSessionExName}
              onChange={(e) => setEditSessionExName(e.target.value)}
              placeholder="Exercise Name"
              style={{ width: "100%", padding: "8px", marginBottom: "12px", boxSizing: "border-box", fontSize: "14px" }}
            />
            
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                type="number"
                value={editSessionExSets}
                onChange={(e) => setEditSessionExSets(e.target.value)}
                placeholder="Sets"
                style={{ flex: 1, padding: "8px", boxSizing: "border-box", fontSize: "14px" }}
              />
              <input
                type="number"
                value={editSessionExReps}
                onChange={(e) => setEditSessionExReps(e.target.value)}
                placeholder="Reps"
                style={{ flex: 1, padding: "8px", boxSizing: "border-box", fontSize: "14px" }}
              />
            </div>

            <input
              type="number"
              step="0.5"
              value={editSessionExWeight}
              onChange={(e) => setEditSessionExWeight(e.target.value)}
              placeholder="Weight (kg)"
              style={{ width: "100%", padding: "8px", marginBottom: "12px", boxSizing: "border-box", fontSize: "14px" }}
            />
            
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="primary"
                onClick={() => saveEditSessionEx(editSessionExName)}
                style={{ flex: 1 }}
              >
                Save
              </button>
              <button
                className="ghost"
                onClick={closeEditSessionEx}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

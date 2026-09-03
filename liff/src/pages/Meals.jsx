import { useState } from "react";
import { api } from "../api/client.js";
import { useSettings, ACTIVITY_LEVELS } from "../i18n.jsx";

const today = new Date().toISOString().slice(0, 10);

const ACTIVITY_LABEL_KEYS = {
  sedentary: "activitySedentary",
  light: "activityLight",
  moderate: "activityModerate",
  active: "activityActive",
  very_active: "activityVeryActive",
};

function calcTargets({ weightKg, heightCm, age, gender, activityLevel }) {
  const bmr =
    gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const multiplier = ACTIVITY_LEVELS.find((a) => a.value === activityLevel)?.multiplier || 1.2;
  const tdee = bmr * multiplier;
  return {
    kcal: Math.round(tdee),
    protein: Math.round((tdee * 0.3) / 4),
    carb: Math.round((tdee * 0.4) / 4),
    fat: Math.round((tdee * 0.3) / 9),
  };
}

export default function Meals({ meals, profile, reload, reloadProfile }) {
  const { t } = useSettings();
  const [savingProfile, setSavingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [selectedDate, setSelectedDate] = useState(today);
  const [sortOrder, setSortOrder] = useState("newest"); // newest | oldest

  async function handleProfileSubmit(e) {
    e.preventDefault();
    if (savingProfile) return;
    const fd = new FormData(e.target);
    setSavingProfile(true);
    try {
      await api.saveProfile({
        weightKg: Number(fd.get("weightKg")),
        heightCm: Number(fd.get("heightCm")),
        age: Number(fd.get("age")),
        gender: fd.get("gender"),
        activityLevel: fd.get("activityLevel"),
      });
      reloadProfile();
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    const form = e.target;
    const fd = new FormData(form);
    setSubmitting(true);
    try {
      const protein = fd.get("protein") ? Number(fd.get("protein")) : null;
      const carb = fd.get("carb") ? Number(fd.get("carb")) : null;
      const fat = fd.get("fat") ? Number(fd.get("fat")) : null;
      
      await api.createMeal({
        name: fd.get("name"),
        calories: Number(fd.get("calories")),
        date: fd.get("date"),
        protein,
        carb,
        fat,
      });
      form.reset();
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id) {
    if (busyIds.has(id)) return;
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      await api.deleteMeal(id);
      reload();
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const todayCal = meals.filter((m) => m.date === today).reduce((sum, m) => sum + (m.calories || 0), 0);
  
  const selectedMeals = meals.filter((m) => m.date === selectedDate);
  
  // Sort meals by createdAt
  const getSortedMeals = () => {
    const sorted = [...selectedMeals];
    if (sortOrder === "newest") {
      return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else {
      return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }
  };
  
  const sortedMeals = getSortedMeals();
  
  const totalCal = sortedMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = sortedMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarb = sortedMeals.reduce((sum, m) => sum + (m.carb || 0), 0);
  const totalFat = sortedMeals.reduce((sum, m) => sum + (m.fat || 0), 0);
  
  const hasProfile = Boolean(profile.weightKg);
  const targets = hasProfile ? calcTargets(profile) : null;

  return (
    <>
      <form className="card" onSubmit={handleProfileSubmit}>
        <span className="card-eyebrow">{t("profileEyebrow")}</span>
        <div className="row">
          <input name="weightKg" type="number" step="0.1" placeholder={t("weightPlaceholder")} defaultValue={profile.weightKg || ""} required />
          <input name="heightCm" type="number" placeholder={t("heightPlaceholder")} defaultValue={profile.heightCm || ""} required />
        </div>
        <div className="row">
          <input name="age" type="number" placeholder={t("agePlaceholder")} defaultValue={profile.age || ""} required />
          <select name="gender" defaultValue={profile.gender || ""} required>
            <option value="" disabled>
              —
            </option>
            <option value="male">{t("genderMale")}</option>
            <option value="female">{t("genderFemale")}</option>
          </select>
        </div>
        <select name="activityLevel" defaultValue={profile.activityLevel || ""} required>
          <option value="" disabled>
            —
          </option>
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a.value} value={a.value}>
              {t(ACTIVITY_LABEL_KEYS[a.value])}
            </option>
          ))}
        </select>
        <button className="primary" type="submit" style={{ width: "100%" }} disabled={savingProfile}>
          {t("saveProfile")}
        </button>

        {targets ? (
          <div className="macro-row">
            <div className="macro">
              <div className="macro-num">{targets.kcal}</div>
              <div className="macro-label">{t("targetKcalLabel")}</div>
            </div>
            <div className="macro">
              <div className="macro-num">{targets.protein}g</div>
              <div className="macro-label">{t("proteinLabel")}</div>
            </div>
            <div className="macro">
              <div className="macro-num">{targets.carb}g</div>
              <div className="macro-label">{t("carbLabel")}</div>
            </div>
            <div className="macro">
              <div className="macro-num">{targets.fat}g</div>
              <div className="macro-label">{t("fatLabel")}</div>
            </div>
          </div>
        ) : (
          <div className="card-meta" style={{ marginTop: 8 }}>
            {t("fillProfileHint")}
          </div>
        )}
      </form>

      <div className="stat-row" style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12 }}>{t("selectDate") || "Select Date"}</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: "100%", marginTop: 4 }}
          />
        </div>
        <div style={{ position: "relative", width: "40px" }}>
          <button
            onClick={(e) => {
              const menu = e.currentTarget.nextElementSibling;
              menu.style.display = menu.style.display === "block" ? "none" : "block";
            }}
            style={{
              width: "40px",
              height: "40px",
              padding: "0",
              border: "none",
              borderRadius: "6px",
              background: "#ff9500",
              cursor: "pointer",
              fontSize: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            🔻
          </button>
          
          <div
            data-sort-menu
            style={{
              position: "absolute",
              top: "45px",
              right: "0",
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              display: "none",
              zIndex: "1000",
              minWidth: "140px"
            }}
          >
            <button
              onClick={() => {
                setSortOrder("newest");
                document.querySelector('[data-sort-menu]').style.display = "none";
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "none",
                background: sortOrder === "newest" ? "#f0f0f0" : "transparent",
                cursor: "pointer",
                fontSize: "13px",
                textAlign: "left",
                color: "#333",
                borderRadius: "6px 6px 0 0"
              }}
            >
              ⬇️ Newest First
            </button>
            <button
              onClick={() => {
                setSortOrder("oldest");
                document.querySelector('[data-sort-menu]').style.display = "none";
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "none",
                borderTop: "1px solid #eee",
                background: sortOrder === "oldest" ? "#f0f0f0" : "transparent",
                cursor: "pointer",
                fontSize: "13px",
                textAlign: "left",
                color: "#333",
                borderRadius: "0 0 6px 6px"
              }}
            >
              ⬆️ Oldest First
            </button>
          </div>
        </div>
      </div>

      <div style={{
        display: "flex",
        background: "#1a1f2e",
        borderRadius: "12px",
        padding: "20px",
        gap: "20px",
        alignItems: "center",
        color: "#fff",
        marginBottom: "16px"
      }}>
        {/* Left side - Calories */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "48px", fontWeight: "bold", color: "#ff9500" }}>
            {totalCal}
          </div>
          <div style={{ fontSize: "12px", color: "#8a92a8", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Calories Label
          </div>
        </div>
        
        {/* Separator */}
        <div style={{ width: "1px", height: "80px", background: "#8a92a8", opacity: 0.5 }} />
        
        {/* Right side - Macros */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", color: "#8a92a8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Protein</span>
            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#ff9500" }}>{totalProtein.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", color: "#8a92a8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Carbs</span>
            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#ff9500" }}>{totalCarb.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#8a92a8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Fat</span>
            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#ff9500" }}>{totalFat.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <span className="card-eyebrow">{t("mealsEyebrow")}</span>
        <input name="name" placeholder={t("foodPlaceholder")} required />
        <div className="row">
          <input name="date" type="date" defaultValue={today} required />
          <input name="calories" type="number" placeholder={t("caloriesPlaceholder")} required />
        </div>
        <div className="row">
          <input name="protein" type="number" step="0.1" placeholder="Protein (g)" />
          <input name="carb" type="number" step="0.1" placeholder="Carb (g)" />
          <input name="fat" type="number" step="0.1" placeholder="Fat (g)" />
        </div>
        <button className="primary" type="submit" style={{ width: "100%" }} disabled={submitting}>
          {t("saveMeal")}
        </button>
      </form>

      <div style={{ marginTop: "20px", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#666" }}>
          {t("mealsLog") || "Meal Log"}
        </span>
      </div>

      {sortedMeals.length === 0 ? (
        <div className="empty">{t("emptyMeals")}</div>
      ) : (
        <>
          {sortedMeals.map((m) => (
              <div key={m.id} className="card">
                <div className="row between">
                  <div style={{ flex: 1 }}>
                    <div className="card-title">{m.name}</div>
                    <div className="card-meta">
                      {m.date} · {m.calories} kcal
                    </div>
                    <div className="card-meta">
                      {m.protein !== undefined && m.protein !== null && `Protein: ${m.protein}g`}
                      {m.carb !== undefined && m.carb !== null && ` | Carb: ${m.carb}g`}
                      {m.fat !== undefined && m.fat !== null && ` | Fat: ${m.fat}g`}
                    </div>
                  </div>
                  <button
                    className="icon-btn"
                    onClick={() => remove(m.id)}
                    disabled={busyIds.has(m.id)}
                    aria-label={t("delete")}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          
        </>
      )}
    </>
  );
}

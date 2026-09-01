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
  const totalCal = selectedMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = selectedMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalCarb = selectedMeals.reduce((sum, m) => sum + (m.carb || 0), 0);
  const totalFat = selectedMeals.reduce((sum, m) => sum + (m.fat || 0), 0);
  
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

      <div className="stat-row">
        <div>
          <label style={{ fontSize: 12 }}>{t("selectDate") || "Select Date:"}</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: "100%", marginTop: 4 }}
          />
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="num">{totalCal}</div>
          <div className="label">{t("caloriesLabel") || "Calories"}</div>
        </div>
        <div className="stat">
          <div className="num">{totalProtein.toFixed(1)}g</div>
          <div className="label">{t("proteinLabel") || "Protein"}</div>
        </div>
        <div className="stat">
          <div className="num">{totalCarb.toFixed(1)}g</div>
          <div className="label">{t("carbLabel") || "Carb"}</div>
        </div>
        <div className="stat">
          <div className="num">{totalFat.toFixed(1)}g</div>
          <div className="label">{t("fatLabel") || "Fat"}</div>
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

      {meals.filter((m) => m.date === selectedDate).length === 0 ? (
        <div className="empty">{t("emptyMeals")}</div>
      ) : (
        meals
          .filter((m) => m.date === selectedDate)
          .map((m) => (
            <div key={m.id} className="card">
              <div className="row between">
                <div>
                  <div className="card-title">{m.name}</div>
                  <div className="card-meta">
                    {m.date} · {m.calories} {t("kcalUnit")}
                  </div>
                  <div className="card-meta">
                    {m.protein !== undefined && m.protein !== null && `P: ${m.protein}g`}
                    {m.carb !== undefined && m.carb !== null && ` C: ${m.carb}g`}
                    {m.fat !== undefined && m.fat !== null && ` F: ${m.fat}g`}
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
        ))
      )}
    </>
  );
}

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LANG_KEY = "gymbro_lang";
const THEME_KEY = "gymbro_theme";

export const EXERCISE_TYPES = ["HIIT", "Cardio", "Weight Training", "Other"];

// Mock data for the built-in sets' exercise breakdown — placeholder content
// to test the detail display; not wired to any real workout-planning data yet.
// kcal values are rough placeholder estimates, not measured figures.
export const BUILT_IN_SET_EXERCISES = {
  HIIT: {
    th: [
      { name: "เบอร์พี", sets: 3, reps: "15", kcal: 60 },
      { name: "กระโดดสควอท", sets: 3, reps: "20", kcal: 45 },
      { name: "เมาน์เทนไคลม์เบอร์", sets: 3, reps: "30 วิ", kcal: 35 },
      { name: "เตะเข่าสูง", sets: 3, reps: "30 วิ", kcal: 30 },
    ],
    en: [
      { name: "Burpees", sets: 3, reps: "15", kcal: 60 },
      { name: "Jump Squats", sets: 3, reps: "20", kcal: 45 },
      { name: "Mountain Climbers", sets: 3, reps: "30s", kcal: 35 },
      { name: "High Knees", sets: 3, reps: "30s", kcal: 30 },
    ],
  },
  Cardio: {
    th: [
      { name: "วิ่ง", sets: 1, reps: "20 นาที", kcal: 200 },
      { name: "กระโดดเชือก", sets: 1, reps: "10 นาที", kcal: 100 },
      { name: "ปั่นจักรยาน", sets: 1, reps: "15 นาที", kcal: 120 },
    ],
    en: [
      { name: "Running", sets: 1, reps: "20 min", kcal: 200 },
      { name: "Jump Rope", sets: 1, reps: "10 min", kcal: 100 },
      { name: "Cycling", sets: 1, reps: "15 min", kcal: 120 },
    ],
  },
  "Weight Training": {
    th: [
      { name: "สควอท", sets: 4, reps: "8", kcal: 40 },
      { name: "เบนช์เพรส", sets: 4, reps: "8", kcal: 35 },
      { name: "เดดลิฟต์", sets: 3, reps: "6", kcal: 45 },
      { name: "พูลอัพ", sets: 3, reps: "10", kcal: 30 },
    ],
    en: [
      { name: "Squat", sets: 4, reps: "8", kcal: 40 },
      { name: "Bench Press", sets: 4, reps: "8", kcal: 35 },
      { name: "Deadlift", sets: 3, reps: "6", kcal: 45 },
      { name: "Pull Up", sets: 3, reps: "10", kcal: 30 },
    ],
  },
};

export const ACTIVITY_LEVELS = [
  { value: "sedentary", multiplier: 1.2 },
  { value: "light", multiplier: 1.375 },
  { value: "moderate", multiplier: 1.55 },
  { value: "active", multiplier: 1.725 },
  { value: "very_active", multiplier: 1.9 },
];

const STRINGS = {
  connecting: { th: "กำลังเชื่อมต่อ LINE...", en: "Connecting to LINE..." },
  connectError: { th: "เชื่อมต่อ LINE ไม่สำเร็จ", en: "LINE connection failed" },
  loading: { th: "กำลังโหลด...", en: "Loading..." },
  loadError: { th: "โหลดข้อมูลไม่สำเร็จ", en: "Failed to load" },
  retry: { th: "ลองใหม่", en: "Retry" },
  delete: { th: "ลบ", en: "Delete" },
  edit: { th: "แก้ไข", en: "Edit" },
  saveChanges: { th: "บันทึกการแก้ไข", en: "Save changes" },

  tabToday: { th: "วันนี้", en: "Today" },
  tabLog: { th: "บันทึกผล", en: "Log" },
  tabMeals: { th: "อาหาร", en: "Meals" },
  tabSummary: { th: "สรุป", en: "Summary" },

  todayEyebrow: { th: "Today's Session", en: "Today's Session" },
  modeManual: { th: "พิมพ์เอง", en: "Manual" },
  modePreset: { th: "Set", en: "Set" },
  titlePlaceholder: { th: "เช่น วิ่ง 5 กม.", en: "e.g. Run 5 km" },
  typeEmpty: { th: "ประเภท (ไม่ระบุ)", en: "Type (unspecified)" },
  addTodo: { th: "+ เพิ่มรายการ", en: "+ Add item" },
  emptyToday: { th: "วันนี้ยังไม่มีตารางออกกำลังกาย", en: "No workouts scheduled today" },
  markDone: { th: "ทำแล้ว", en: "Done" },

  exNameHead: { th: "ท่า", en: "Exercise" },
  exRepsHead: { th: "จำนวนครั้ง", en: "Reps" },
  exSetsHead: { th: "จำนวน Set", en: "Sets" },

  setPlaceholder: { th: "เลือกชุดออกกำลังกาย", en: "Choose a set" },
  presetCustom: { th: "ชุดที่สร้างเอง", en: "Your Custom Sets" },
  addCustomOption: { th: "+ กำหนดเอง", en: "+ Custom" },
  newSetNamePlaceholder: { th: "ชื่อชุดใหม่", en: "New set name" },
  createSetBtn: { th: "สร้างชุด", en: "Create set" },
  cancel: { th: "ยกเลิก", en: "Cancel" },

  logEyebrow: { th: "Log a Set", en: "Log a Set" },
  logTypePlaceholder: { th: "ประเภท เช่น squat, วิ่ง", en: "Type e.g. squat, run" },
  minutesPlaceholder: { th: "นาที", en: "Minutes" },
  setsPlaceholder: { th: "เซ็ต", en: "Sets" },
  repsPlaceholder: { th: "ครั้ง/เซ็ต", en: "Reps/set" },
  weightPlaceholder: { th: "น้ำหนัก (กก.)", en: "Weight (kg)" },
  notePlaceholder: { th: "โน้ต (ถ้ามี)", en: "Note (optional)" },
  saveLog: { th: "บันทึกผล", en: "Save log" },
  emptyLogs: { th: "ยังไม่มีบันทึกผล", en: "No logs yet" },
  minUnit: { th: "นาที", en: "min" },
  kgUnit: { th: "กก.", en: "kg" },

  mealsEyebrow: { th: "Log a Meal", en: "Log a Meal" },
  foodPlaceholder: { th: "ชื่ออาหาร เช่น ข้าวผัด", en: "Food e.g. Fried rice" },
  caloriesPlaceholder: { th: "แคลอรี่ (kcal)", en: "Calories (kcal)" },
  saveMeal: { th: "บันทึกอาหาร", en: "Save meal" },
  emptyMeals: { th: "ยังไม่มีบันทึกอาหาร", en: "No meals logged yet" },
  todayCalLabel: { th: "แคลวันนี้", en: "Today's kcal" },
  kcalUnit: { th: "kcal", en: "kcal" },

  profileEyebrow: { th: "ข้อมูลร่างกาย", en: "Body Profile" },
  heightPlaceholder: { th: "ส่วนสูง (ซม.)", en: "Height (cm)" },
  agePlaceholder: { th: "อายุ (ปี)", en: "Age (years)" },
  genderMale: { th: "ชาย", en: "Male" },
  genderFemale: { th: "หญิง", en: "Female" },
  activitySedentary: { th: "แทบไม่ออกกำลังกาย", en: "Sedentary (little exercise)" },
  activityLight: { th: "ออกกำลังกายเบา 1-3 วัน/สัปดาห์", en: "Light (1-3 days/week)" },
  activityModerate: { th: "ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์", en: "Moderate (3-5 days/week)" },
  activityActive: { th: "ออกกำลังกายหนัก 6-7 วัน/สัปดาห์", en: "Active (6-7 days/week)" },
  activityVeryActive: { th: "ออกกำลังกายหนักมาก / งานใช้แรงกาย", en: "Very active (hard exercise/physical job)" },
  saveProfile: { th: "บันทึกข้อมูล", en: "Save profile" },
  fillProfileHint: {
    th: "กรอกข้อมูลร่างกายด้านบนเพื่อคำนวณเป้าหมายสารอาหารต่อวัน",
    en: "Fill in your body info above to calculate daily nutrition targets",
  },
  targetKcalLabel: { th: "เป้าหมาย", en: "Target" },
  proteinLabel: { th: "โปรตีน", en: "Protein" },
  carbLabel: { th: "คาร์บ", en: "Carbs" },
  fatLabel: { th: "ไขมัน", en: "Fat" },

  streakLabel: { th: "วันติดต่อกัน", en: "Day streak" },
  sessionsLabel: { th: "ครั้งใน {days} วัน", en: "sessions in {days} days" },
  last: { th: "Last", en: "Last" },
  days: { th: "Days", en: "Days" },
  durationMinutes: { th: "นาทีที่ออกกำลังกาย", en: "Minutes exercised" },
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || "en");
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang: () => setLang((l) => (l === "th" ? "en" : "th")),
      theme,
      toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
      t: (key, vars) => {
        const entry = STRINGS[key];
        if (!entry) return key;
        let str = entry[lang] || entry.th;
        if (vars) {
          for (const [k, v] of Object.entries(vars)) str = str.replace(`{${k}}`, v);
        }
        return str;
      },
    }),
    [lang, theme]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

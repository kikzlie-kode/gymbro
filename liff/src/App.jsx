import { useEffect, useState, lazy, Suspense } from "react";
import liff from "@line/liff";
import Today from "./pages/Today.jsx";
import LogPage from "./pages/Log.jsx";
import Meals from "./pages/Meals.jsx";
import { api } from "./api/client.js";
import { useSettings } from "./i18n.jsx";
import bgDark from "./img/bg_dark.png";
import bgLight from "./img/bg_light.png";

// const Summary = lazy(() => import("./pages/Summary.jsx"));

const LIFF_ID = import.meta.env.VITE_LIFF_ID || "2010843483-9zepqJaU";
const today = new Date().toISOString().slice(0, 10);


const ICONS = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l2 2 4-4" />
      <rect x="3" y="4" width="18" height="17" rx="3" />
    </svg>
  ),
  log: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16M18 4v16M2 9h4M2 15h4M18 9h4M18 15h4" />
    </svg>
  ),
  meals: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v7a2 2 0 0 0 4 0V3M9 3v18M17 3c-1.5 0-3 1.5-3 4v4h3M17 3v18" />
    </svg>
  ),
  // summary: (
  //   <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  //     <path d="M4 20V10M12 20V4M20 20v-7" />
  //   </svg>
  // ),
};

const SUN_ICON = (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MOON_ICON = (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
  </svg>
);

function Splash() {
  return (
    <div className="splash">
      <span className="logo">
        GYM<span className="dot">BRO</span>
      </span>
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState("connecting"); // connecting | ready | error
  const [error, setError] = useState(null);
  const [bootStatus, setBootStatus] = useState("idle"); // idle | loading | ready | error
  const [bootError, setBootError] = useState(null);
  const [activeTab, setActiveTab] = useState("today");
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(["today"]));
  const [initialTodoId, setInitialTodoId] = useState(null);
  const { t, lang, toggleLang, theme, toggleTheme } = useSettings();
  const isDarkMode = theme === "dark";
  const [todos, setTodos] = useState(null);
  const [logs, setLogs] = useState(null);
  const [meals, setMeals] = useState(null);
  const [profile, setProfile] = useState(null);
  // const [summary, setSummary] = useState(null);
  const [customPresets, setCustomPresets] = useState(null);



  useEffect(() => {
    (async () => {
      try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const params = new URLSearchParams(window.location.search);
        setInitialTodoId(params.get("todoId"));
        setStatus("ready");
      } catch (err) {
        setError(err.message);
        setStatus("error");
      }
    })();
  }, []);

  async function loadAll() {
    setBootStatus("loading");
    setBootError(null);
    try {
      const [todosRes, logsRes, mealsRes, profileRes, summaryRes, presetsRes] = await Promise.all([
        api.getTodos(today),
        api.getLogs(),
        api.getMeals(),
        api.getProfile(),
        // api.getSummary(30),
        api.getPresets(),
      ]);
      setTodos(todosRes);
      setLogs(logsRes);
      setMeals(mealsRes);
      setProfile(profileRes);
      // setSummary(summaryRes);
      setCustomPresets(presetsRes);
      setBootStatus("ready");
    } catch (err) {
      setBootError(err.message || String(err));
      setBootStatus("error");
    }
  }

  useEffect(() => {
    if (status === "ready") loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const reloadTodos = async () => setTodos(await api.getTodos(today));
  const reloadLogs = async () => setLogs(await api.getLogs());
  const reloadMeals = async () => setMeals(await api.getMeals());
  const reloadProfile = async () => setProfile(await api.getProfile());
  // const reloadSummary = async () => setSummary(await api.getSummary(30));
  const reloadPresets = async () => setCustomPresets(await api.getPresets());

  function switchTab(key) {
    setActiveTab(key);
    setVisitedTabs((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  const TABS = {
    today: {
      label: t("tabToday"),
      Component: Today,
      props: {
        todos,
        reload: reloadTodos,
        reloadLogs,
        // reloadSummary,
        customPresets,
        reloadPresets,
      },
    },
    log: { label: t("tabLog"), Component: LogPage, props: { logs, reload: reloadLogs } },
    meals: {
      label: t("tabMeals"),
      Component: Meals,
      props: { meals, profile, reload: reloadMeals, reloadProfile },
    },
    // summary: { label: t("tabSummary"), Component: Summary, props: { summary } },
  };

  if (status === "connecting") {
    return <div className="empty">{t("connecting")}</div>;
  }
  if (status === "error") {
    return (
      <div className="empty">
        {t("connectError")}: {error}
      </div>
    );
  }
  if (bootStatus === "idle" || bootStatus === "loading") {
    return <Splash />;
  }
  if (bootStatus === "error") {
    return (
      <div className="empty">
        {t("loadError")}: {bootError}
        <div>
          <button className="ghost" onClick={loadAll} style={{ marginTop: 8 }}>
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${isDarkMode ? bgDark : bgLight})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        position: "relative"
      }}
    >
      {/* Semi-transparent overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)",
          pointerEvents: "none",
          zIndex: 0
        }}
      />

      {/* Content wrapper */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <>
          <header className="topbar">
            <span className="logo">
              GYM<span className="dot">BRO</span>
            </span>
            <div className="topbar-actions">
              <button className="chip-btn" onClick={toggleLang} aria-label="Switch language">
                {lang === "th" ? "EN" : "TH"}
              </button>
              <button className="chip-btn icon" onClick={toggleTheme} aria-label="Switch theme">
                {theme === "light" ? MOON_ICON : SUN_ICON}
              </button>
            </div>
          </header>
          <main>
            {/* All data is fetched once at boot (see Splash above); tabs just render
            from that shared state, so switching between them never re-fetches. */}
            {Object.entries(TABS).map(([key, tab]) =>
              visitedTabs.has(key) ? (
                <div key={key} style={{ display: activeTab === key ? "block" : "none" }}>
                  <Suspense fallback={<div className="empty">{t("loading")}</div>}>
                    <tab.Component {...tab.props} initialTodoId={initialTodoId} />
                  </Suspense>
                </div>
              ) : null
            )}
          </main>
          <nav className="tabbar">
            {Object.entries(TABS).map(([key, tab]) => (
              <button
                key={key}
                className={activeTab === key ? "active" : ""}
                onClick={() => switchTab(key)}
              >
                {ICONS[key]}
                {tab.label}
              </button>
            ))}
          </nav>
        </>
      </div>
    </div>
  );
}

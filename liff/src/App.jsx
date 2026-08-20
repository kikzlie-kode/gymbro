import { useEffect, useState } from "react";
import liff from "@line/liff";
import Today from "./pages/Today.jsx";
import LogPage from "./pages/Log.jsx";
import Summary from "./pages/Summary.jsx";

const LIFF_ID = import.meta.env.VITE_LIFF_ID || "YOUR-LIFF-ID";

const TABS = {
  today: { label: "วันนี้", Component: Today },
  log: { label: "บันทึกผล", Component: LogPage },
  summary: { label: "สรุป", Component: Summary },
};

export default function App() {
  const [status, setStatus] = useState("connecting"); // connecting | ready | error
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("today");
  const [initialTodoId, setInitialTodoId] = useState(null);

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

  if (status === "connecting") {
    return <div className="empty">กำลังเชื่อมต่อ LINE...</div>;
  }
  if (status === "error") {
    return <div className="empty">เชื่อมต่อ LINE ไม่สำเร็จ: {error}</div>;
  }

  const { Component } = TABS[activeTab];

  return (
    <>
      <header className="topbar">GymBro 💪</header>
      <main>
        <Component initialTodoId={initialTodoId} />
      </main>
      <nav className="tabbar">
        {Object.entries(TABS).map(([key, t]) => (
          <button
            key={key}
            className={activeTab === key ? "active" : ""}
            onClick={() => setActiveTab(key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </>
  );
}

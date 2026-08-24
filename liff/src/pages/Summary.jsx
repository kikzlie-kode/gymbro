import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";
import { useSettings } from "../i18n.jsx";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

export default function Summary({ summary }) {
  const { t, theme } = useSettings();

  const data = {
    labels: summary.series.map((s) => s.date.slice(5)),
    datasets: [
      {
        label: t("durationMinutes"),
        data: summary.series.map((s) => s.totalDurationMin),
        backgroundColor: theme === "dark" ? "#ffc400" : "#ff7a00",
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <>
      <div className="stat-row">
        <div className="stat">
          <div className="num">{summary.streak}</div>
          <div className="label">{t("streakLabel")}</div>
        </div>
        <div className="stat">
          <div className="num">{summary.totalSessions}</div>
          <div className="label">{t("sessionsLabel", { days: summary.days })}</div>
        </div>
      </div>
      <div className="card">
        <span className="card-eyebrow">
          {t("last")} {summary.days} {t("days")}
        </span>
        <Bar data={data} options={options} height={220} />
      </div>
    </>
  );
}

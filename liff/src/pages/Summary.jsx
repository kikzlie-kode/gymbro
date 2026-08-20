import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";
import { api } from "../api/client.js";
import { useLoad } from "../hooks/useLoad.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

export default function Summary() {
  const { data: summary, error, reload } = useLoad(() => api.getSummary(30), []);

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
  if (summary === null) return <div className="empty">กำลังโหลด...</div>;

  const data = {
    labels: summary.series.map((s) => s.date.slice(5)),
    datasets: [
      {
        label: "นาทีที่ออกกำลังกาย",
        data: summary.series.map((s) => s.totalDurationMin),
        backgroundColor: "#06c755",
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
          <div className="label">วันติดต่อกัน</div>
        </div>
        <div className="stat">
          <div className="num">{summary.totalSessions}</div>
          <div className="label">ครั้งใน {summary.days} วัน</div>
        </div>
      </div>
      <div className="card">
        <Bar data={data} options={options} height={220} />
      </div>
    </>
  );
}

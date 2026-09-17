import { Clock } from "lucide-react";
import BottomNav from "../../component/BottomNav/BottomNav";
import { useLanguage } from "../../context/LanguageContext";
import "./History.css";

interface HistoryItem {
  id: string;
  techName: string;
  techType: string;
  date: string;
  status: "done" | "cancelled";
}

function History() {
  const { t } = useLanguage();
  const items: HistoryItem[] = [];

  return (
    <div className="history-page">
      <header className="history-appbar">
        <h1>{t.history.title}</h1>
      </header>

      {items.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty__icon">
            <Clock size={36} />
          </div>
          <p>{t.history.empty}</p>
          <span>{t.history.emptyDesc}</span>
        </div>
      ) : (
        <div className="history-list">
          {items.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-item__icon">
                <Clock size={20} />
              </div>
              <div className="history-item__info">
                <div className="history-item__top">
                  <p className="history-item__name">{item.techName}</p>
                  <span
                    className={`history-item__status ${
                      item.status === "done"
                        ? "history-item__status--done"
                        : "history-item__status--cancelled"
                    }`}
                  >
                    {item.status === "done" ? t.history.done : t.history.cancelled}
                  </span>
                </div>
                <p className="history-item__type">{item.techType}</p>
                <p className="history-item__date">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default History;
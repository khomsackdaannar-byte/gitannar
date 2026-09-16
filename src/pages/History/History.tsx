import { Clock } from "lucide-react";
import BottomNav from "../../component/BottomNav/BottomNav";
import "./History.css";

// ໂຄງສ້າງຂໍ້ມູນປະຫວັດ (ໄວ້ຮັບຂໍ້ມູນຈິງຈາກ Firestore ໃນອະນາຄົດ)
interface HistoryItem {
  id: string;
  techName: string;
  techType: string;
  date: string;
  status: "done" | "cancelled";
}

function History() {
  // TODO: ໃນອະນາຄົດ ໃຫ້ດຶງຂໍ້ມູນຈິງຈາກ Firestore ແທນ array ຫວ່າງນີ້
  const items: HistoryItem[] = [];

  return (
    <div className="history-page">
      <header className="history-appbar">
        <h1>ປະຫວັດການໃຊ້ບໍລິການ</h1>
      </header>

      {items.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty__icon">
            <Clock size={36} />
          </div>
          <p>ຍັງບໍ່ມີປະຫວັດ</p>
          <span>ປະຫວັດການໃຊ້ບໍລິການຂອງທ່ານຈະສະແດງຢູ່ນີ້</span>
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
                    {item.status === "done" ? "ສຳເລັດ" : "ຍົກເລີກ"}
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
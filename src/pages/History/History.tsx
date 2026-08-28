import { Clock } from "lucide-react";
import BottomNav from "../../component/BottomNav/BottomNav";
import "../Bookings/Bookings.css";

function History() {
  return (
    <div className="placeholder-page">
      <header className="placeholder-appbar">
        <h1>ປະຫວັດການໃຊ້ງານ</h1>
      </header>

      <div className="placeholder-empty">
        <Clock size={48} color="#3d8983" />
        <p>ຍັງບໍ່ມີປະຫວັດ</p>
      </div>

      <BottomNav />
    </div>
  );
}

export default History;
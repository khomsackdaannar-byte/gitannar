import { Bookmark } from "lucide-react";
import BottomNav from "../../component/BottomNav/BottomNav";
import "./Bookings.css";

function Bookings() {
  return (
    <div className="placeholder-page">
      <header className="placeholder-appbar">
        <h1>ສັ່ງຈອງໄວ້</h1>
      </header>

      <div className="placeholder-empty">
        <Bookmark size={48} color="#3d8983" />
        <p>ຍັງບໍ່ມີການສັ່ງຈອງ</p>
      </div>

      <BottomNav />
    </div>
  );
}

export default Bookings;
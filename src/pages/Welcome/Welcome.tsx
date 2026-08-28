import { useNavigate } from "react-router-dom";
import { Wrench } from "lucide-react";
import "./Welcome.css";

// ທຽບເທົ່າ WelcomeScreen ໃນ Flutter (welcome_screen.dart)
function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-hero">
        <div className="welcome-hero__box">
          <Wrench size={90} color="#fff" />
        </div>
        <button className="welcome-skip" onClick={() => navigate("/login")}>
          ຂ້າມ
        </button>
      </div>

      <div className="welcome-content">
        <h1 className="welcome-title">
          ຍິນດີຕ້ອນຮັບສູ່
          <br />
          <span className="welcome-title--accent">ຊ່າງດ່ວນ</span>
        </h1>
        <p className="welcome-subtitle">
          ຄົ້ນຫາຊ່າງໃກ້ບ້ານທ່ານໄດ້ໄວ ປອດໄພ ແລະ ເຊື່ອຖືໄດ້
        </p>

        <button className="welcome-btn welcome-btn--primary" onClick={() => navigate("/login")}>
          ເລີ່ມຕົ້ນ
        </button>

        <button className="welcome-btn welcome-btn--text" onClick={() => navigate("/technician-login")}>
          ເຂົ້າສູ່ລະບົບໃນນາມຊ່າງ
        </button>
      </div>
    </div>
  );
}

export default Welcome;
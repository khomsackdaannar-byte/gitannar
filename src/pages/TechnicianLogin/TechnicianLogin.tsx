import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HardHat } from "lucide-react";
import { techList } from "../../Types/Technician";
import "./TechnicianLogin.css";

function TechnicianLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  // ★ ເພີ່ມ: ຕອນເປີດໜ້ານີ້ ໃຫ້ເຊັກກ່ອນວ່າເຄີຍ login ໄວ້ບໍ
  useEffect(() => {
    const savedPhone = localStorage.getItem("tech_logged_in_phone");
    if (savedPhone) {
      const tech = techList.find((t) => t.phone === savedPhone);
      if (tech) {
        navigate(`/technician-home/${encodeURIComponent(tech.phone)}`, { replace: true });
      }
    }
  }, []);

  const handleLogin = () => {
    const value = phone.trim();
    const tech = techList.find((t) => t.phone === value);
    if (!tech) {
      setErrorText("ບໍ່ພົບເບີໂທນີ້ໃນລະບົບຊ່າງ");
      return;
    }
    // ★ ເພີ່ມ: ຈື່ເບີໂທໄວ້ໃນເຄື່ອງ ຫລັງ login ສຳເລັດ
    localStorage.setItem("tech_logged_in_phone", tech.phone);
    navigate(`/technician-home/${encodeURIComponent(tech.phone)}`, { replace: true });
  };

  const handleGoToRegister = () => {
    navigate("/register-technician");
  };

  return (
    <div className="tech-login-page">
      <header className="tech-login-appbar">
        <h1>ເຂົ້າສູ່ລະບົບ (ຊ່າງ)</h1>
      </header>

      <div className="tech-login-body">
        <HardHat size={64} color="#5bb8c4" />
        <h2>ໃສ່ເບີໂທຂອງທ່ານ</h2>
        <p className="tech-login-hint">
          ໃຊ້ເບີໂທທີ່ລົງທະບຽນໄວ້ໃນລະບົບ (ຕົວຢ່າງ: 02055512345)
        </p>

        <input
          className="tech-login-input"
          type="tel"
          placeholder="ເບີໂທ"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setErrorText(null);
          }}
        />
        {errorText && <p className="tech-login-error">{errorText}</p>}

        <button className="tech-login-submit" onClick={handleLogin}>
          ເຂົ້າສູ່ລະບົບ
        </button>

        <button className="tech-login-register" onClick={handleGoToRegister}>
          ລົງທະບຽນ
        </button>
      </div>
    </div>
  );
}

export default TechnicianLogin;
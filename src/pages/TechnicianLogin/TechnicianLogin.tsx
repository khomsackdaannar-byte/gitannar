import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HardHat } from "lucide-react";
import { techList } from "../../Types/Technician";
import "./TechnicianLogin.css";

// ທຽບເທົ່າ TechnicianLoginScreen ໃນ Flutter (technician_login_screen.dart)
function TechnicianLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  // ທຽບເທົ່າ _handleLogin()
  const handleLogin = () => {
    const value = phone.trim();
    const tech = techList.find((t) => t.phone === value);
    if (!tech) {
      setErrorText("ບໍ່ພົບເບີໂທນີ້ໃນລະບົບຊ່າງ");
      return;
    }
    navigate(`/technician-home/${encodeURIComponent(tech.phone)}`, { replace: true });
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
      </div>
    </div>
  );
}

export default TechnicianLogin;
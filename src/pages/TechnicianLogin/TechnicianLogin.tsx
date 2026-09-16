import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { HardHat } from "lucide-react";
import { db } from "../../firebase/Firebase";
import { techList } from "../../Types/Technician";
import "./TechnicianLogin.css";

function TechnicianLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ★ ຕອນເປີດໜ້ານີ້ ໃຫ້ເຊັກກ່ອນວ່າເຄີຍ login ໄວ້ບໍ
  useEffect(() => {
    const savedPhone = localStorage.getItem("tech_logged_in_phone");
    if (savedPhone) {
      navigate(`/technician-home/${encodeURIComponent(savedPhone)}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    const value = phone.trim();
    setErrorText(null);

    if (!value) {
      setErrorText("ກະລຸນາໃສ່ເບີໂທ");
      return;
    }

    setLoading(true);
    try {
      // ຫາໃນ techList ຄົງທີ່ກ່ອນ
      const staticTech = techList.find((t) => t.phone === value);
      if (staticTech) {
        localStorage.setItem("tech_logged_in_phone", staticTech.phone);
        navigate(`/technician-home/${encodeURIComponent(staticTech.phone)}`, { replace: true });
        return;
      }

      // ຖ້າບໍ່ພົບ, ໄປຫາໃນ Firestore (ຊ່າງທີ່ລົງທະບຽນຜ່ານແອັບ)
      const snap = await getDoc(doc(db, "technicians", value));
      if (snap.exists()) {
        localStorage.setItem("tech_logged_in_phone", value);
        navigate(`/technician-home/${encodeURIComponent(value)}`, { replace: true });
        return;
      }

      setErrorText("ບໍ່ພົບເບີໂທນີ້ໃນລະບົບຊ່າງ");
    } catch (err) {
      console.error(err);
      setErrorText("ເກີດຂໍ້ຜິດພາດ, ກະລຸນາລອງໃໝ່");
    } finally {
      setLoading(false);
    }
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

        <button className="tech-login-submit" onClick={handleLogin} disabled={loading}>
          {loading ? "ກຳລັງກວດສອບ..." : "ເຂົ້າສູ່ລະບົບ"}
        </button>

        <button className="tech-login-register" onClick={handleGoToRegister}>
          ລົງທະບຽນ
        </button>
      </div>
    </div>
  );
}

export default TechnicianLogin;
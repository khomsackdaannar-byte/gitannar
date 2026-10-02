import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { HardHat } from "lucide-react";
import { auth, db } from "../../firebase/Firebase";
import { techList } from "../../Types/Technician";
import "./TechnicianLogin.css";

function TechnicianLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ໝາຍເຫດ: ຕັ້ງໃຈ "ບໍ່" ກວດ localStorage ແລ້ວ auto-redirect ອີກຕໍ່ໄປ —
  // ຕ້ອງໃຫ້ພິມເບີທຸກຄັ້ງ ເພື່ອໃຫ້ສາມາດສະຫຼັບໄປ login ເປັນຊ່າງຄົນອື່ນໄດ້

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
      let techExists = !!staticTech;

      // ຖ້າບໍ່ພົບ, ໄປຫາໃນ Firestore (ຊ່າງທີ່ລົງທະບຽນຜ່ານແອັບ)
      if (!techExists) {
        const snap = await getDoc(doc(db, "technicians", value));
        techExists = snap.exists();
      }

      if (!techExists) {
        setErrorText("ບໍ່ພົບເບີໂທນີ້ໃນລະບົບຊ່າງ");
        setLoading(false);
        return;
      }

      // ສຳຄັນ: ຕ້ອງ sign-in ກັບ Firebase Auth ຈິງ (ບໍ່ອີງແຕ່ localStorage)
      // ບໍ່ດັ່ງນັ້ນ Firestore rules (request.auth != null) ຈະບລັອກທຸກການອ່ານ/ຂຽນ
      // ຂອງຊ່າງ ທັນທີທີ່ບໍ່ມີ session ອື່ນໃຫ້ "ຢືມ" ຈາກ tab ອື່ນແລ້ວ
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      localStorage.setItem("tech_logged_in_phone", value);
      navigate(`/technician-home/${encodeURIComponent(value)}`, { replace: true });
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
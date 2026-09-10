import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { Wrench } from "lucide-react";
import { db } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import "./Welcome.css";

function Welcome() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<{ role: string; phone: string } | null>(null);

  // ກວດວ່າ user ນີ້ເຄີຍລົງທະບຽນແລ້ວບໍ່ (ອ່ານຈາກ users/{uid})
  useEffect(() => {
    const loadProfile = async () => {
      if (authLoading) return; // ລໍຖ້າ Firebase ກວດ session ກ່ອນ

      if (!user) {
        setProfile(null);
        setChecking(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          setProfile(null);
          setChecking(false);
          return;
        }

        const data = snap.data();
        const role = data.role;
        const phone = data.phone;

        // ຖ້າແມ່ນຊ່າງ, ໃຫ້ກວດອີກຄັ້ງວ່າຂໍ້ມູນຊ່າງນີ້ຍັງມີແທ້ຢູ່ໃນ Firestore ບໍ່
        // (ປ້ອງກັນກໍລະນີຂໍ້ມູນເສຍ/ຖືກລຶບ ແຕ່ browser ຍັງຈື່ session ເກົ່າຄ້າງຢູ່)
        if (role === "technician" && phone) {
          const techSnap = await getDoc(doc(db, "technicians", phone));
          if (!techSnap.exists()) {
            setProfile(null);
            setChecking(false);
            return;
          }
        }

        setProfile({ role, phone });
      } catch (err) {
        console.error(err);
        setProfile(null);
      } finally {
        setChecking(false);
      }
    };

    loadProfile();
  }, [user, authLoading]);

  const handleStart = () => {
    if (checking) return;

    if (profile?.role === "customer") {
      navigate("/home");
    } else if (profile?.role === "technician" && profile.phone) {
      navigate(`/technician-home/${encodeURIComponent(profile.phone)}`);
    } else {
      navigate("/choose-role");
    }
  };

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

        <button
          className="welcome-btn welcome-btn--primary"
          onClick={handleStart}
          disabled={checking}
        >
          {checking ? "ກຳລັງກວດສອບ..." : "ເລີ່ມຕົ້ນ"}
        </button>
      </div>
    </div>
  );
}

export default Welcome;
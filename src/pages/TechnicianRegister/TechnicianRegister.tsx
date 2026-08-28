import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import { TechCategory, TechCategoryType } from "../../Types/Technician";
import "../Register/Register.css";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const categoryOptions: { value: TechCategoryType; label: string; type: string; icon: string }[] = [
  { value: TechCategory.electric, label: "ຊ່າງໄຟຟ້າ", type: "ໄຟຟ້າ", icon: "electrical_services" },
  { value: TechCategory.plumbing, label: "ຊ່າງນ້ຳປະປາ", type: "ຊ່າງສ້ອມແປງນ້ຳປະປາ", icon: "plumbing" },
  { value: TechCategory.beauty, label: "ຊ່າງເສີມສວຍ", type: "ເສີມສວຍ", icon: "content_cut" },
  { value: TechCategory.carRepair, label: "ຊ່າງສ້ອມແປງລົດ", type: "ສ້ອມແປງລົດ", icon: "car_repair" },
  { value: TechCategory.phoneRepair, label: "ຊ່າງສ້ອມແປງໂທລະສັບ", type: "ສ້ອມແປງໂທລະສັບ", icon: "phone_android" },
];

function TechnicianRegister() {
  const [step, setStep] = useState<"info" | "otp">("info");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<TechCategoryType>(TechCategory.electric);
  const [area, setArea] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { sendPhoneOtp, confirmPhoneOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const requestOtp = async () => {
    setError("");
    if (!name.trim()) {
      setError("ກະລຸນາໃສ່ຊື່");
      return;
    }
    if (!/^0\d{7,10}$/.test(phone)) {
      setError("ກະລຸນາໃສ່ເບີໂທໃຫ້ຖືກຕ້ອງ");
      return;
    }
    if (!area.trim()) {
      setError("ກະລຸນາໃສ່ພື້ນທີ່ບໍລິການ");
      return;
    }
    setLoading(true);
    try {
      await sendPhoneOtp(phone);
      setStep("otp");
      setCountdown(RESEND_SECONDS);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "ສົ່ງລະຫັດ OTP ບໍ່ສຳເລັດ");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    requestOtp();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otp.length !== OTP_LENGTH) {
      setError("ກະລຸນາໃສ່ລະຫັດ OTP ໃຫ້ຄົບ 6 ຫຼັກ");
      return;
    }

    setLoading(true);
    try {
      await confirmPhoneOtp(otp);

      const user = auth.currentUser;
      const selected = categoryOptions.find((c) => c.value === category)!;

      if (user) {
        await updateProfile(user, { displayName: name.trim() });

        // ບັນທຶກຂໍ້ມູນຜູ້ໃຊ້ (ສຳລັບ auth/role)
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: name.trim(),
          phone: phone.trim(),
          role: "technician",
          createdAt: new Date(),
        });

        // ບັນທຶກຂໍ້ມູນຊ່າງ (doc ID = ເບີໂທ, ໃຊ້ຄົ້ນຫາຢູ່ໜ້າ TechnicianHome/Home/Detail)
        await setDoc(doc(db, "technicians", phone.trim()), {
          name: name.trim(),
          phone: phone.trim(),
          category: selected.value,
          type: selected.type,
          icon: selected.icon,
          area: area.trim(),
          hometown: "",
          birthDate: "",
          age: "",
          rating: 0,
          image: "",
          createdAt: new Date(),
        });
      }

      navigate(`/technician-home/${encodeURIComponent(phone.trim())}`, { replace: true });
    } catch (err) {
      console.error(err);
      setError("ລະຫັດ OTP ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸແລ້ວ");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    requestOtp();
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <div className="logo">🛠️</div>
          <h1>Oud Care - ຊ່າງ</h1>
          <p>
            {step === "info"
              ? "ລົງທະບຽນເປັນຊ່າງ ດ້ວຍເບີໂທຂອງທ່ານ"
              : `ໃສ່ລະຫັດ OTP ທີ່ສົ່ງໄປຫາ ${phone}`}
          </p>
        </div>

        {step === "info" && (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label>ຊື່</label>
              <input
                type="text"
                placeholder="ໃສ່ຊື່ຂອງທ່ານ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>ເບີໂທລະສັບ</label>
              <input
                type="tel"
                placeholder="020xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
                maxLength={11}
                required
              />
            </div>

            <div className="form-group">
              <label>ປະເພດຊ່າງ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TechCategoryType)}
              >
                {categoryOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>ພື້ນທີ່ບໍລິການ</label>
              <input
                type="text"
                placeholder="ເຊັ່ນ: ເມືອງໄຊເສດຖາ"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                required
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "ກຳລັງສົ່ງລະຫັດ..." : "ສົ່ງລະຫັດ OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label>ລະຫັດ OTP (6 ຫຼັກ)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="••••••"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/[^\d]/g, "").slice(0, OTP_LENGTH))
                }
                maxLength={OTP_LENGTH}
                className="otp-input"
                required
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="login-options">
              <button type="button" className="link-btn" onClick={() => setStep("info")}>
                ← ແກ້ໄຂຂໍ້ມູນ
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={handleResend}
                disabled={countdown > 0}
              >
                {countdown > 0 ? `ສົ່ງລະຫັດຄືນໃໝ່ (${countdown}s)` : "ສົ່ງລະຫັດຄືນໃໝ່"}
              </button>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "ກຳລັງກວດສອບ..." : "ຢືນຢັນ ແລະ ລົງທະບຽນ"}
            </button>
          </form>
        )}

        <p className="signup">
          ມີບັນຊີແລ້ວບໍ່?
          <a href="/technician-login"> ເຂົ້າສູ່ລະບົບຊ່າງ</a>
        </p>

        {/* ຈຳເປັນສຳລັບ Firebase Phone Auth reCAPTCHA */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

export default TechnicianRegister;
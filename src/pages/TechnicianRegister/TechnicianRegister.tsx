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

  // ຂໍ້ມູນສ່ວນຕົວ
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<TechCategoryType>(TechCategory.electric);
  const [area, setArea] = useState("");
  const [address, setAddress] = useState(""); // ທີ່ຢູ່ປັດຈຸບັນ

  // ບັດປະຈຳຕົວ / ສຳມະໂນຄົວ (ບັງຄັບຕ້ອງແນບ)
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);

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

  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setIdCardFile(file);
    setError("");

    if (file) {
      const reader = new FileReader();
      reader.onload = () => setIdCardPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setIdCardPreview(null);
    }
  };

  const requestOtp = async () => {
    setError("");
    if (!firstName.trim()) {
      setError("ກະລຸນາໃສ່ຊື່");
      return;
    }
    if (!lastName.trim()) {
      setError("ກະລຸນາໃສ່ນາມສະກຸນ");
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
    if (!address.trim()) {
      setError("ກະລຸນາໃສ່ທີ່ຢູ່ປັດຈຸບັນ");
      return;
    }
    if (!idCardFile) {
      setError("ກະລຸນາແນບຮູບບັດປະຈຳຕົວ ຫຼື ສຳມະໂນຄົວ");
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
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      if (user) {
        await updateProfile(user, { displayName: fullName });

        // ບັນທຶກຂໍ້ມູນຜູ້ໃຊ້ (ສຳລັບ auth/role)
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: fullName,
          phone: phone.trim(),
          role: "technician",
          createdAt: new Date(),
        });

        // ບັນທຶກຂໍ້ມູນຊ່າງ (doc ID = ເບີໂທ, ໃຊ້ຄົ້ນຫາຢູ່ໜ້າ TechnicianHome/Home/Detail)
        // ໝາຍເຫດ: idCardFile ຍັງບໍ່ໄດ້ອັບໂຫຼດຂຶ້ນ Firebase Storage,
        // ຕອນນີ້ບັນທຶກແຕ່ຊື່ໄຟລ໌ໄວ້ກ່ອນ, ຄ່ອຍເພີ່ມການອັບໂຫຼດຮູບຈິງພາຍຫຼັງ
        await setDoc(doc(db, "technicians", phone.trim()), {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: fullName,
          phone: phone.trim(),
          category: selected.value,
          type: selected.type,
          icon: selected.icon,
          area: area.trim(),
          address: address.trim(),
          idCardFileName: idCardFile ? idCardFile.name : "",
          idCardUrl: "", // TODO: ຈະໃສ່ URL ຫຼັງຈາກອັບໂຫຼດ Firebase Storage
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
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>ນາມສະກຸນ</label>
              <input
                type="text"
                placeholder="ໃສ່ນາມສະກຸນຂອງທ່ານ"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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

            <div className="form-group">
              <label>ທີ່ຢູ່ປັດຈຸບັນ</label>
              <input
                type="text"
                placeholder="ບ້ານ, ເມືອງ, ແຂວງ"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>ບັດປະຈຳຕົວ ຫຼື ສຳມະໂນຄົວ (ຮູບ)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleIdCardChange}
                required
              />
              {idCardPreview && (
                <img
                  src={idCardPreview}
                  alt="ຕົວຢ່າງບັດປະຈຳຕົວ"
                  style={{ marginTop: 8, maxWidth: "100%", borderRadius: 8 }}
                />
              )}
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
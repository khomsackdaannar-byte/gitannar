import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import { TechCategory, TechCategoryType } from "../../Types/Technician";
import "../Register/Register.css";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

// ຮູບບັດຕ້ອງຍັງອ່ານອອກ ຈຶ່ງຫຍໍ້ໜ້ອຍກວ່າຮູບໂປຣໄຟລ໌ (ຍັງຕ້ອງຢູ່ໃຕ້ຂີດຈຳກັດ 1MB ຂອງ Firestore)
const ID_CARD_MAX_DIMENSION = 900;
const ID_CARD_QUALITIES = [0.75, 0.6, 0.45];
const MAX_BASE64_LENGTH = 800_000;

function resizeIdCardToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const longest = Math.max(width, height);
        if (longest > ID_CARD_MAX_DIMENSION) {
          const scale = ID_CARD_MAX_DIMENSION / longest;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("ບໍ່ສາມາດຫຍໍ້ຮູບໄດ້"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // ລອງຄຸນນະພາບສູງກ່ອນ ຖ້າໄຟລ໌ຍັງໃຫຍ່ເກີນຈຶ່ງຄ່ອຍຫຼຸດລົງ
        for (const q of ID_CARD_QUALITIES) {
          const data = canvas.toDataURL("image/jpeg", q);
          if (data.length <= MAX_BASE64_LENGTH) {
            resolve(data);
            return;
          }
        }
        reject(new Error("ຮູບໃຫຍ່ເກີນໄປ ກະລຸນາຖ່າຍໃໝ່ ຫຼື ເລືອກຮູບອື່ນ"));
      };
      img.onerror = () => reject(new Error("ອ່ານໄຟລ໌ຮູບບໍ່ໄດ້"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("ອ່ານໄຟລ໌ຮູບບໍ່ໄດ້"));
    reader.readAsDataURL(file);
  });
}

const categoryOptions: { value: TechCategoryType; label: string; type: string; icon: string }[] = [
  { value: TechCategory.electric, label: "ຊ່າງໄຟຟ້າ", type: "ໄຟຟ້າ", icon: "electrical_services" },
  { value: TechCategory.plumbing, label: "ຊ່າງນ້ຳປະປາ", type: "ຊ່າງສ້ອມແປງນ້ຳປະປາ", icon: "plumbing" },
  { value: TechCategory.beauty, label: "ຊ່າງເສີມສວຍ", type: "ເສີມສວຍ", icon: "content_cut" },
  { value: TechCategory.carRepair, label: "ຊ່າງສ້ອມແປງລົດ", type: "ສ້ອມແປງລົດ", icon: "car_repair" },
  { value: TechCategory.phoneRepair, label: "ຊ່າງສ້ອມແປງໂທລະສັບ", type: "ສ້ອມແປງໂທລະສັບ", icon: "phone_android" },
  { value: TechCategory.airRepair, label: "ຊ່າງແອ", type: "ຊ່າງແອ", icon: "air_repair" },
];

const vientianeDistricts = [
  "ເມືອງຈັນທະບູລີ",
  "ເມືອງສີໂຄດຕະບອງ",
  "ເມືອງໄຊເສດຖາ",
  "ເມືອງສີສັດຕະນາກ",
  "ເມືອງນາຊາຍທອງ",
  "ເມືອງໄຊທານີ",
  "ເມືອງຫາດຊາຍຟອງ",
  "ເມືອງສັງທອງ",
  "ເມືອງປາກງື່ມ",
];

function TechnicianRegister() {
  const [step, setStep] = useState<"info" | "otp">("info");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<TechCategoryType>(TechCategory.electric);
  const [area, setArea] = useState(vientianeDistricts[0]);
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState(vientianeDistricts[0]);
  const PROVINCE = "ນະຄອນຫຼວງວຽງຈັນ";

  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  // ຮູບບັດທີ່ຫຍໍ້ແລ້ວ (base64) — ໃຊ້ທັງສະແດງຕົວຢ່າງ ແລະ ເກັບລົງ Firestore
  const [idCardBase64, setIdCardBase64] = useState<string | null>(null);

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { sendPhoneOtp, confirmPhoneOtp, devOtpCode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleIdCardChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setError("");

    if (!file) {
      setIdCardFile(null);
      setIdCardBase64(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("ກະລຸນາເລືອກໄຟລ໌ຮູບພາບເທົ່ານັ້ນ");
      e.target.value = "";
      return;
    }

    try {
      const base64 = await resizeIdCardToBase64(file);
      setIdCardFile(file);
      setIdCardBase64(base64);
    } catch (err: any) {
      setIdCardFile(null);
      setIdCardBase64(null);
      e.target.value = "";
      setError(err?.message || "ປະມວນຜົນຮູບບໍ່ສຳເລັດ");
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
    if (!birthDate.trim()) {
      setError("ກະລຸນາໃສ່ວັນເດືອນປີເກີດ");
      return;
    }
    if (!age.trim()) {
      setError("ກະລຸນາໃສ່ອາຍຸ");
      return;
    }
    if (!/^0\d{7,10}$/.test(phone)) {
      setError("ກະລຸນາໃສ່ເບີໂທໃຫ້ຖືກຕ້ອງ");
      return;
    }
    if (!area) {
      setError("ກະລຸນາເລືອກພື້ນທີ່ບໍລິການ");
      return;
    }
    if (!village.trim()) {
      setError("ກະລຸນາໃສ່ຊື່ບ້ານ");
      return;
    }
    if (!idCardBase64) {
      setError("ກະລຸນາແນບຮູບບັດປະຈຳຕົວ ສຳມະໂນຄົວ ຫລື ໃບຢັ້ງຢືນອາຊີບຊ່າງ");
      return;
    }

    setLoading(true);
    try {
      // ກັນບໍ່ໃຫ້ລົງທະບຽນທັບເບີຂອງຊ່າງທີ່ມີຢູ່ແລ້ວ (ລວມທັງທີ່ຍັງລໍຖ້າອະນຸມັດ)
      // ຊ່າງທີ່ຖືກປະຕິເສດ ສາມາດສະໝັກໃໝ່ໄດ້
      const existing = await getDoc(doc(db, "technicians", phone.trim()));
      if (existing.exists() && (existing.data().status ?? "approved") !== "rejected") {
        setError("ເບີນີ້ລົງທະບຽນເປັນຊ່າງແລ້ວ ກະລຸນາເຂົ້າສູ່ລະບົບຊ່າງ");
        return;
      }

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
      await confirmPhoneOtp(otp, "technician");

      const user = auth.currentUser;
      const selected = categoryOptions.find((c) => c.value === category)!;
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      if (user) {
        // 1. ເກັບຮູບບັດໄວ້ໃນ collection ລັບ (ສະເພາະ admin ອ່ານໄດ້ ຕາມ Firestore Rules)
        //    ບໍ່ໃສ່ໃນ technicians ເພາະ collection ນັ້ນທຸກຄົນອ່ານໄດ້
        await setDoc(doc(db, "technicianVerifications", phone.trim()), {
          phone: phone.trim(),
          name: fullName,
          idCardImage: idCardBase64,
          idCardFileName: idCardFile ? idCardFile.name : "",
          createdAt: new Date(),
        });

        // 2. ສ້າງໂປຣໄຟລ໌ຊ່າງ ດ້ວຍສະຖານະ "ລໍຖ້າອະນຸມັດ"
        await setDoc(doc(db, "technicians", phone.trim()), {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: fullName,
          phone: phone.trim(),
          category: selected.value,
          type: selected.type,
          icon: selected.icon,
          area: area,
          address: `ບ້ານ${village.trim()} ${district} ${PROVINCE}`,
          hometown: "",
          birthDate: birthDate.trim(),
          age: age.trim(),
          rating: 0,
          image: "",
          status: "pending",
          rejectReason: "",
          createdAt: new Date(),
        });
      }

      navigate(`/technician-home/${encodeURIComponent(phone.trim())}`, { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "ລະຫັດ OTP ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸແລ້ວ");
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
          <h1>ຊ່າງດ່ວນ - ຊ່າງ</h1>
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
                placeholder="ຊື່"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>ນາມສະກຸນ</label>
              <input
                type="text"
                placeholder="ນາມສະກຸນ"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>ວັນເດືອນປີເກີດ</label>
              <input
                type="text"
                placeholder="ວັນທີ່ເດືອນປີເກີດ"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>ອາຍຸ</label>
              <input
                type="text"
                placeholder="ອາຍຸ"
                value={age}
                onChange={(e) => setAge(e.target.value)}
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
              <select value={area} onChange={(e) => setArea(e.target.value)}>
                {vientianeDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>ບ້ານ</label>
              <input
                type="text"
                placeholder="ຊື່ບ້ານ"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>ເມືອງ</label>
              <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                {vientianeDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>ແຂວງ</label>
              <input type="text" value={PROVINCE} disabled />
            </div>

            <div className="form-group">
              <label>ບັດປະຈຳຕົວ ຫຼື ສຳມະໂນຄົວ (ຮູບ)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleIdCardChange}
                required
              />
              <p style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
                ຮູບນີ້ໃຊ້ກວດສອບຕົວຕົນເທົ່ານັ້ນ ແລະ ຈະເຫັນໄດ້ສະເພາະຜູ້ດູແລລະບົບ
              </p>
              {idCardBase64 && (
                <img
                  src={idCardBase64}
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
            {devOtpCode && (
              <p style={{ color: "#0a7", fontWeight: 600 }}>
                (ໂໝດທົດສອບ) ລະຫັດ OTP: {devOtpCode}
              </p>
            )}

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

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

export default TechnicianRegister;
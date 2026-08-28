import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/Authcontext";
import "./Login.css";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const Login = () => {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
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
    if (!/^0\d{7,10}$/.test(phone)) {
      setError("ກະລຸນາໃສ່ເບີໂທໃຫ້ຖືກຕ້ອງ");
      return;
    }
    setLoading(true);
    try {
      await sendPhoneOtp(phone);
      setStep("otp");
      setCountdown(RESEND_SECONDS);
    } catch (err: any) {
      console.error(err);
    setError("ສົ່ງລະຫັດບໍ່ສຳເລັດ: " + (err?.code || "") + " " + (err?.message || String(err)));
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
      navigate("/home");
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
          <div className="logo">♡</div>
          <h1> ຊ່າງດ່ວນ </h1>
          <p>
            {step === "phone"
              ? "Welcome back! ໃສ່ເບີໂທເພື່ອເຂົ້າສູ່ລະບົບ"
              : `ໃສ່ລະຫັດ OTP ທີ່ສົ່ງໄປຫາ ${phone}`}
          </p>
        </div>

        {step === "phone" && (
          <form onSubmit={handleSendOtp}>
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
              <button type="button" className="link-btn" onClick={() => setStep("phone")}>
                ← ປ່ຽນເບີໂທ
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
              {loading ? "ກຳລັງກວດສອບ..." : "ຢືນຢັນ ແລະ ເຂົ້າສູ່ລະບົບ"}
            </button>
          </form>
        )}

        <div className="divider">
          <span>Or sign in with</span>
        </div>

        <div className="social-login">
          <button type="button">G</button>
          <button type="button">f</button>
        </div>

        <p className="signup">
          Don't have an account?
          <a href="/register"> Sign Up</a>
        </p>

        {/* ຈຳເປັນສຳລັບ Firebase Phone Auth reCAPTCHA (ເບິ່ງບໍ່ເຫັນ) */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default Login;
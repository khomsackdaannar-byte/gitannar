import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import { useLanguage } from "../../context/LanguageContext";
import "./Register.css";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function Register() {
  const [step, setStep] = useState<"info" | "otp">("info");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { sendPhoneOtp, confirmPhoneOtp, devOtpCode } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const requestOtp = async () => {
    setError("");
    if (!name.trim()) {
      setError(t.register.nameRequired);
      return;
    }
    if (!/^0\d{7,10}$/.test(phone)) {
      setError(t.register.phoneInvalid);
      return;
    }
    setLoading(true);
    try {
      await sendPhoneOtp(phone);
      setStep("otp");
      setCountdown(RESEND_SECONDS);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || t.register.otpInvalid);
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
      setError(t.register.otpIncomplete);
      return;
    }

    setLoading(true);
    try {
      await confirmPhoneOtp(otp);

      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { displayName: name.trim() });

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: name.trim(),
          phone: phone.trim(),
          role: "customer",
          createdAt: new Date(),
        });
      }

      navigate("/home", { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || t.register.otpInvalid);
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
          <h1>{t.register.brand}</h1>
          <p>
            {step === "info" ? t.register.createTitle : t.register.enterOtpSent(phone)}
          </p>
        </div>

        {step === "info" && (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label>{t.register.nameLabel}</label>
              <input
                type="text"
                placeholder={t.register.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>{t.register.phoneLabel}</label>
              <input
                type="tel"
                placeholder={t.register.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
                maxLength={11}
                required
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? t.register.sending : t.register.sendOtp}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerify}>
            {devOtpCode && (
              <p style={{ color: "#0a7", fontWeight: 600 }}>
                {t.register.devModeLabel} {devOtpCode}
              </p>
            )}

            <div className="form-group">
              <label>{t.register.otpLabel}</label>
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
                {t.register.editInfo}
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={handleResend}
                disabled={countdown > 0}
              >
                {countdown > 0 ? t.register.resend(countdown) : t.register.resendNow}
              </button>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? t.register.verifying : t.register.verify}
            </button>
          </form>
        )}

        <p className="signup">
          {t.register.alreadyHave}
          <a href="/login"> {t.register.loginLink}</a>
        </p>
        <p className="signup"></p>
        {/* ຈຳເປັນສຳລັບ Firebase Phone Auth reCAPTCHA */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

export default Register;
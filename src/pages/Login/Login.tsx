import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { auth, db } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import { useLanguage } from "../../context/LanguageContext";
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
    if (!/^0\d{7,10}$/.test(phone)) {
      setError(t.login.phoneInvalid);
      return;
    }
    setLoading(true);
    try {
      await sendPhoneOtp(phone);
      setStep("otp");
      setCountdown(RESEND_SECONDS);
    } catch (err: any) {
      console.error(err);
      setError(`${t.login.sendFailed}: ${err?.code || ""} ${err?.message || String(err)}`);
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
      setError(t.login.otpIncomplete);
      return;
    }

    setLoading(true);
    try {
      await confirmPhoneOtp(otp);

      const newUser = auth.currentUser;
      if (!newUser) {
        throw new Error("ບໍ່ພົບ session ຂອງຜູ້ໃຊ້");
      }

      const trimmedPhone = phone.trim();

      const q = query(collection(db, "users"), where("phone", "==", trimmedPhone));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError(t.login.noAccountFound);
        setLoading(false);
        return;
      }

      const oldData = snap.docs[0].data();
      await setDoc(doc(db, "users", newUser.uid), {
        ...oldData,
        uid: newUser.uid,
      });

      if (oldData.role === "technician" && oldData.phone) {
        navigate(`/technician-home/${encodeURIComponent(oldData.phone)}`, { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || t.login.otpInvalid);
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
          <h1>{t.login.brand}</h1>
          <p>
            {step === "phone" ? t.login.welcomeBack : t.login.enterOtpSent(phone)}
          </p>
        </div>

        {step === "phone" && (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label>{t.login.phoneLabel}</label>
              <input
                type="tel"
                placeholder={t.login.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
                maxLength={11}
                required
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? t.login.sending : t.login.sendOtp}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerify}>
            {devOtpCode && (
              <p style={{ color: "#0a7", fontWeight: 600 }}>
                {t.login.devModeLabel} {devOtpCode}
              </p>
            )}

            <div className="form-group">
              <label>{t.login.otpLabel}</label>
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
                {t.login.changePhone}
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={handleResend}
                disabled={countdown > 0}
              >
                {countdown > 0 ? t.login.resend(countdown) : t.login.resendNow}
              </button>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? t.login.verifying : t.login.verify}
            </button>
          </form>
        )}

        <div className="divider">
          <span>{t.login.orSignInWith}</span>
        </div>

        <div className="social-login">
          <button type="button">G</button>
          <button type="button">f</button>
        </div>

        <p className="signup">
          {t.login.noAccount}
          <a href="/register"> {t.login.signUp}</a>
        </p>

        {/* ຈຳເປັນສຳລັບ Firebase Phone Auth reCAPTCHA (ເບິ່ງບໍ່ເຫັນ) */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default Login;
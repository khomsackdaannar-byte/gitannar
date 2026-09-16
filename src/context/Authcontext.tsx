import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "../firebase/Firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  customerPhone: string | null;
  devOtpCode: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  confirmPhoneOtp: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const OTP_KEY = "mock_otp_code";
const OTP_EXPIRES_KEY = "mock_otp_expires";
const OTP_TTL_MS = 5 * 60 * 1000; // ໝົດອາຍຸໃນ 5 ນາທີ

const PENDING_PHONE_KEY = "pending_phone";
const CUSTOMER_PHONE_KEY = "customer_phone";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  const [customerPhone, setCustomerPhone] = useState<string | null>(
    localStorage.getItem(CUSTOMER_PHONE_KEY)
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    sessionStorage.removeItem(OTP_KEY);
    sessionStorage.removeItem(OTP_EXPIRES_KEY);
    setDevOtpCode(null);
  };

  // ຈຳລອງການສົ່ງ OTP — ເກັບໄວ້ໃນ sessionStorage ບໍ່ຫາຍເມື່ອ hot-reload
  const sendPhoneOtp = async (phone: string) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        sessionStorage.setItem(OTP_KEY, code);
        sessionStorage.setItem(OTP_EXPIRES_KEY, String(Date.now() + OTP_TTL_MS));
        sessionStorage.setItem(PENDING_PHONE_KEY, phone);
        setDevOtpCode(code); // ສະແດງເທິງໜ້າຈໍແທນ alert()
        resolve();
      }, 500);
    });
  };

  // ຈຳລອງການຢືນຢັນ OTP
  const confirmPhoneOtp = async (code: string) => {
    const savedCode = sessionStorage.getItem(OTP_KEY);
    const expiresAt = Number(sessionStorage.getItem(OTP_EXPIRES_KEY) || 0);

    if (!savedCode || Date.now() > expiresAt) {
      sessionStorage.removeItem(OTP_KEY);
      sessionStorage.removeItem(OTP_EXPIRES_KEY);
      setDevOtpCode(null);
      throw new Error("ລະຫັດ OTP ໝົດອາຍຸແລ້ວ ກະລຸນາຂໍລະຫັດໃໝ່");
    }
    if (code !== savedCode) {
      throw new Error("ລະຫັດ OTP ບໍ່ຖືກຕ້ອງ");
    }

    await signInAnonymously(auth);

    const pendingPhone = sessionStorage.getItem(PENDING_PHONE_KEY);
    if (pendingPhone) {
      localStorage.setItem(CUSTOMER_PHONE_KEY, pendingPhone);
      setCustomerPhone(pendingPhone);
      sessionStorage.removeItem(PENDING_PHONE_KEY);
    }

    sessionStorage.removeItem(OTP_KEY);
    sessionStorage.removeItem(OTP_EXPIRES_KEY);
    setDevOtpCode(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        customerPhone,
        devOtpCode,
        login,
        logout,
        sendPhoneOtp,
        confirmPhoneOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth ຕ້ອງໃຊ້ພາຍໃນ AuthProvider");
  }
  return context;
}
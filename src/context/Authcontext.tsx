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
  // role: "customer" (default) = ການເຂົ້າສູ່ລະບົບ/ລົງທະບຽນຂອງລູກຄ້າ, ຈະບັນທຶກ customerPhone
  // role: "technician" = ແຄ່ຢືນຢັນ OTP ເພື່ອລົງທະບຽນຊ່າງ, ຈະບໍ່ແຕະ customerPhone
  confirmPhoneOtp: (code: string, role?: "customer" | "technician") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ໃຊ້ sessionStorage: ແຍກຕາມແຕ່ລະແທັບ ເພື່ອໃຫ້ຫຼາຍແທັບລັອກອິນຄົນລະບັນຊີໄດ້
// (OTP ສະແດງເທິງໜ້າຈໍແທັບດຽວກັນຢູ່ແລ້ວ ຈຶ່ງບໍ່ຕ້ອງແບ່ງປັນຂ້າມແທັບ)
const store = sessionStorage;

const OTP_KEY = "mock_otp_code";
const OTP_EXPIRES_KEY = "mock_otp_expires";
const OTP_TTL_MS = 5 * 60 * 1000; // ໝົດອາຍຸໃນ 5 ນາທີ

const PENDING_PHONE_KEY = "pending_phone";
const CUSTOMER_PHONE_KEY = "customer_phone";
const DISPLAY_NAME_KEY = "displayName";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(store.getItem(OTP_KEY));

  const [customerPhone, setCustomerPhone] = useState<string | null>(
    store.getItem(CUSTOMER_PHONE_KEY)
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
    store.removeItem(OTP_KEY);
    store.removeItem(OTP_EXPIRES_KEY);
    store.removeItem(CUSTOMER_PHONE_KEY);
    store.removeItem(DISPLAY_NAME_KEY);
    setCustomerPhone(null);
    setDevOtpCode(null);
  };

  // ຈຳລອງການສົ່ງ OTP
  const sendPhoneOtp = async (phone: string) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        store.setItem(OTP_KEY, code);
        store.setItem(OTP_EXPIRES_KEY, String(Date.now() + OTP_TTL_MS));
        store.setItem(PENDING_PHONE_KEY, phone);
        setDevOtpCode(code); // ສະແດງເທິງໜ້າຈໍແທນ alert()
        resolve();
      }, 500);
    });
  };

  // ຈຳລອງການຢືນຢັນ OTP
  const confirmPhoneOtp = async (code: string, role: "customer" | "technician" = "customer") => {
    const savedCode = store.getItem(OTP_KEY);
    const expiresAt = Number(store.getItem(OTP_EXPIRES_KEY) || 0);

    if (!savedCode) {
      throw new Error("ບໍ່ພົບລະຫັດ OTP ກະລຸນາຂໍລະຫັດໃໝ່");
    }
    if (Date.now() > expiresAt) {
      store.removeItem(OTP_KEY);
      store.removeItem(OTP_EXPIRES_KEY);
      setDevOtpCode(null);
      throw new Error("ລະຫັດ OTP ໝົດອາຍຸແລ້ວ ກະລຸນາຂໍລະຫັດໃໝ່");
    }
    if (code !== savedCode) {
      throw new Error("ລະຫັດ OTP ບໍ່ຖືກຕ້ອງ");
    }

    await signInAnonymously(auth);

    const pendingPhone = store.getItem(PENDING_PHONE_KEY);

    // ບັນທຶກ customerPhone ສະເພາະຕອນເປັນການເຂົ້າສູ່ລະບົບຂອງ "ລູກຄ້າ" ເທົ່ານັ້ນ
    if (role === "customer" && pendingPhone) {
      store.setItem(CUSTOMER_PHONE_KEY, pendingPhone);
      setCustomerPhone(pendingPhone);
    }

    if (pendingPhone) {
      store.removeItem(PENDING_PHONE_KEY);
    }

    store.removeItem(OTP_KEY);
    store.removeItem(OTP_EXPIRES_KEY);
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
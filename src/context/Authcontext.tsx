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
  // role: "customer" (default) = ນີ້ແມ່ນການເຂົ້າສູ່ລະບົບ/ລົງທະບຽນຂອງລູກຄ້າ, ຈະບັນທຶກ customerPhone
  // role: "technician" = ແຄ່ຢືນຢັນ OTP ເພື່ອລົງທະບຽນຊ່າງ, ຈະບໍ່ແຕະ customerPhone ຂອງລູກຄ້າເລີຍ
  confirmPhoneOtp: (code: string, role?: "customer" | "technician") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ໝາຍເຫດ: ປ່ຽນຈາກ sessionStorage ເປັນ localStorage ໂດຍເຈດຕະນາ —
// sessionStorage ແຍກກັນຄົນລະ browser tab, ຖ້າຂໍ OTP ຢູ່ tab ໜຶ່ງ
// ແລ້ວໄປພິມຢືນຢັນຢູ່ອີກ tab ໜຶ່ງ ຈະຫາລະຫັດບໍ່ພົບ (ຂຶ້ນ error ຜິດວ່າ "ໝົດອາຍຸ")
// localStorage ໃຊ້ຮ່ວມກັນທຸກ tab ໃນ origin ດຽວກັນ ແກ້ບັນຫານີ້ໄດ້
const OTP_KEY = "mock_otp_code";
const OTP_EXPIRES_KEY = "mock_otp_expires";
const OTP_TTL_MS = 5 * 60 * 1000; // ໝົດອາຍຸໃນ 5 ນາທີ

const PENDING_PHONE_KEY = "pending_phone";
const CUSTOMER_PHONE_KEY = "customer_phone";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(
    localStorage.getItem(OTP_KEY)
  );

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
    localStorage.removeItem(OTP_KEY);
    localStorage.removeItem(OTP_EXPIRES_KEY);
    setDevOtpCode(null);
  };

  // ຈຳລອງການສົ່ງ OTP — ເກັບໄວ້ໃນ localStorage ໃຊ້ຮ່ວມກັນໄດ້ທຸກ tab
  const sendPhoneOtp = async (phone: string) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem(OTP_KEY, code);
        localStorage.setItem(OTP_EXPIRES_KEY, String(Date.now() + OTP_TTL_MS));
        localStorage.setItem(PENDING_PHONE_KEY, phone);
        setDevOtpCode(code); // ສະແດງເທິງໜ້າຈໍແທນ alert()
        resolve();
      }, 500);
    });
  };

  // ຈຳລອງການຢືນຢັນ OTP
  // role = "customer" (default): ນີ້ແມ່ນການເຂົ້າສູ່ລະບົບ/ລົງທະບຽນຂອງ "ລູກຄ້າ" -> ບັນທຶກ customerPhone
  // role = "technician": ແຄ່ຢືນຢັນຕົວຕົນເພື່ອລົງທະບຽນເປັນ "ຊ່າງ" -> ຫ້າມແຕະ customerPhone
  //   (ບໍ່ດັ່ງນັ້ນ ຖ້າຊ່າງລົງທະບຽນຢູ່ browser ດຽວກັນກັບທີ່ລູກຄ້າເຄີຍເຂົ້າສູ່ລະບົບ
  //    customerPhone ຈະຖືກຂຽນທັບເປັນເບີຂອງຊ່າງ ເຮັດໃຫ້ໜ້າລູກຄ້າໄປສະແດງຂໍ້ມູນຊ່າງແທນ)
  const confirmPhoneOtp = async (code: string, role: "customer" | "technician" = "customer") => {
    const savedCode = localStorage.getItem(OTP_KEY);
    const expiresAt = Number(localStorage.getItem(OTP_EXPIRES_KEY) || 0);

    if (!savedCode) {
      throw new Error("ບໍ່ພົບລະຫັດ OTP ກະລຸນາຂໍລະຫັດໃໝ່ (ຖ້າຂໍໄວ້ຄົນລະ tab ໃຫ້ພິມຢືນຢັນຢູ່ tab ດຽວກັນ)");
    }
    if (Date.now() > expiresAt) {
      localStorage.removeItem(OTP_KEY);
      localStorage.removeItem(OTP_EXPIRES_KEY);
      setDevOtpCode(null);
      throw new Error("ລະຫັດ OTP ໝົດອາຍຸແລ້ວ ກະລຸນາຂໍລະຫັດໃໝ່");
    }
    if (code !== savedCode) {
      throw new Error("ລະຫັດ OTP ບໍ່ຖືກຕ້ອງ");
    }

    await signInAnonymously(auth);

    const pendingPhone = localStorage.getItem(PENDING_PHONE_KEY);

    // ສຳຄັນ: ບັນທຶກ customerPhone ສະເພາະຕອນເປັນການເຂົ້າສູ່ລະບົບຂອງ "ລູກຄ້າ" ເທົ່ານັ້ນ
    if (role === "customer" && pendingPhone) {
      localStorage.setItem(CUSTOMER_PHONE_KEY, pendingPhone);
      setCustomerPhone(pendingPhone);
    }

    if (pendingPhone) {
      localStorage.removeItem(PENDING_PHONE_KEY);
    }

    localStorage.removeItem(OTP_KEY);
    localStorage.removeItem(OTP_EXPIRES_KEY);
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
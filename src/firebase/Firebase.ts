import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, browserSessionPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDGX0u82vMu_3CTxrhrII0EB910YeyRTgc",
  authDomain: "annar-7d24a.firebaseapp.com",
  projectId: "annar-7d24a",
  storageBucket: "annar-7d24a.firebasestorage.app",
  messagingSenderId: "189343299994",
  appId: "1:189343299994:web:0942b6e34e6dde0ecaa223",
  measurementId: "G-W0CER3PK94",
};

// ກັນ initialize ຊ້ຳຕອນ Vite hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ເກັບ session ຕໍ່ແທັບ (ແຕ່ລະແທັບລັອກອິນຄົນລະບັນຊີໄດ້ ບໍ່ທັບກັນ)
function createAuth() {
  try {
    return initializeAuth(app, { persistence: browserSessionPersistence });
  } catch {
    // ຖືກ initialize ໄປແລ້ວ (ເຊັ່ນຕອນ hot reload)
    return getAuth(app);
  }
}

export const auth = createAuth();
export const storage = getStorage(app);
export const db = getFirestore(app);
export default app;
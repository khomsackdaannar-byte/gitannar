import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { ArrowLeft, Send, Camera, Image as ImageIcon, MapPin, X, Mic, Trash2, CheckCircle2, Star, CalendarPlus, User } from "lucide-react";
import { db, auth } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import { techList, type Technician } from "../../Types/Technician";
import ReviewModal from "../../component/ReviewModal/ReviewModal";
import BookingFormModal from "../../component/BookingFormModal/BookingFormModal";
import "./Chat.css";

// @ts-ignore - leaflet ships its own JS, types are optional (install @types/leaflet if you want them)
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon paths breaking under Vite/webpack bundling
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface ChatMessage {
  id: string;
  type?: "text" | "image" | "location" | "audio" | "booking" | "booking_request";
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  lat?: number;
  lng?: number;
  bookingName?: string;
  bookingPhone?: string;
  bookingAddress?: string;
  bookingTime?: string;
  bookingPhotoUrl?: string | null;
  senderId: string;
  timestamp?: { seconds: number };
}

interface Booking {
  id: string;
  techPhone: string;
  customerId: string;
  status: "in_progress" | "pending_confirm" | "completed";
  createdAt?: { seconds: number };
}

// ---------------- ຫຍໍ້ຮູບ ແລະ ປ່ຽນເປັນ base64 (ເກັບກົງໃນ Firestore, ບໍ່ຕ້ອງໃຊ້ Firebase Storage) ----------------
const CHAT_IMAGE_MAX_DIMENSION = 500;
const CHAT_IMAGE_JPEG_QUALITY = 0.6;

function resizeFileToBase64(
  file: File,
  maxDimension = CHAT_IMAGE_MAX_DIMENSION,
  quality = CHAT_IMAGE_JPEG_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
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
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Firestore ຈຳກັດ 1 document ບໍ່ໃຫ້ເກີນ 1MB — ກັນໄວ້ບໍ່ໃຫ້ຊົນຂອບ
const MAX_BASE64_LENGTH = 900_000;
// ຈຳກັດຄວາມຍາວການບັນທຶກສຽງ ເພື່ອບໍ່ໃຫ້ໄຟລ໌ໃຫຍ່ເກີນໄປ
const MAX_RECORD_SECONDS = 60;

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  height: 38,
  borderRadius: "50%",
  border: "none",
  background: "transparent",
  color: "#3d8983",
  cursor: "pointer",
  flexShrink: 0,
};

function BookingCard({ msg, isMe, onOpen }: { msg: ChatMessage; isMe: boolean; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      style={{
        maxWidth: 260,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid #dcece7",
        background: "#fff",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          background: isMe ? "#3d8983" : "#eef3f2",
          color: isMe ? "#fff" : "#2f7d6f",
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        <CalendarPlus size={14} /> ຂໍ້ມູນການຈອງ (ກົດເບິ່ງລາຍລະອຽດ)
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {msg.bookingPhotoUrl && (
          <img
            src={msg.bookingPhotoUrl}
            alt="ຮູບບັນຫາ"
            style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 4 }}
          />
        )}
        <div style={{ fontSize: 13, color: "#2b3a37", display: "flex", alignItems: "center", gap: 5 }}>
          <User size={13} color="#3d8983" /> {msg.bookingName}
        </div>
        <div style={{ fontSize: 13, color: "#2b3a37" }}>☎ {msg.bookingPhone}</div>
        <div style={{ fontSize: 13, color: "#2b3a37" }}>📍 {msg.bookingAddress}</div>
        {msg.bookingTime && <div style={{ fontSize: 13, color: "#2b3a37" }}>🕒 {msg.bookingTime}</div>}
      </div>
    </div>
  );
}

function BookingDetailModal({ msg, onClose }: { msg: ChatMessage; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 380,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #eee",
          }}
        >
          <strong style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 16 }}>
            <CalendarPlus size={17} color="#3d8983" /> ລາຍລະອຽດການຈອງ
          </strong>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {msg.bookingPhotoUrl && (
            <img
              src={msg.bookingPhotoUrl}
              alt="ຮູບບັນຫາ"
              style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 10, cursor: "pointer" }}
              onClick={() => window.open(msg.bookingPhotoUrl!, "_blank")}
            />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
            <User size={17} color="#3d8983" /> {msg.bookingName}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
            ☎ {msg.bookingPhone}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
            📍 {msg.bookingAddress}
          </div>
          {msg.bookingTime && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
              🕒 {msg.bookingTime}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chat() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { customerPhone } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // ---- Voice recording state ----
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Map picker state ----
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickedPos, setPickedPos] = useState<{ lat: number; lng: number } | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  // ---- Booking state ----
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [hasReview, setHasReview] = useState(false);
  const [detailBookingMsg, setDetailBookingMsg] = useState<ChatMessage | null>(null);

  // ---- ຊື່ແທ້ຂອງລູກຄ້າ (ດຶງຈາກ Firestore users/{uid}) ----
  // ບໍ່ໃຊ້ auth.currentUser?.displayName ອີກຕໍ່ໄປ ເພາະຄ່ານັ້ນຕິດຄ້າງຢູ່ Firebase Auth
  // session ດຽວກັນໃນ browser ນີ້ ແລະ ອາດຈະຖືກຂຽນທັບໂດຍບັນຊີອື່ນ (ເຊັ່ນ ຊ່າງ) ມາກ່ອນ
  const [customerDisplayName, setCustomerDisplayName] = useState("ລູກຄ້າ");
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsubscribe = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        const name = snap.data().name as string | undefined;
        if (name && name.trim() !== "") setCustomerDisplayName(name);
      }
    });
    return () => unsubscribe();
  }, []);

  const decodedPhone = decodeURIComponent(phone ?? "");
  const staticTech = techList.find((t) => t.phone === decodedPhone);

  const [tech, setTech] = useState<Technician | null>(staticTech ?? null);
  const [techLoading, setTechLoading] = useState(!staticTech);

  useEffect(() => {
    if (staticTech) {
      setTech(staticTech);
      setTechLoading(false);
      return;
    }
    if (!decodedPhone) {
      setTech(null);
      setTechLoading(false);
      return;
    }

    let cancelled = false;
    setTechLoading(true);

    const loadTech = async () => {
      try {
        const snap = await getDoc(doc(db, "technicians", decodedPhone));
        if (cancelled) return;

        if (snap.exists()) {
          const data = snap.data();
          setTech({
            name: data.name ?? "",
            type: data.type ?? "",
            category: data.category ?? "electric",
            phone: data.phone ?? decodedPhone,
            area: data.area ?? "",
            hometown: data.hometown ?? "",
            birthDate: data.birthDate ?? "",
            age: data.age ?? "",
            rating: data.rating ?? 0,
            icon: data.icon ?? "electrical_services",
            image: data.image || undefined,
            address: data.address || undefined,
          });
        } else {
          setTech(null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setTech(null);
      } finally {
        if (!cancelled) setTechLoading(false);
      }
    };

    loadTech();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedPhone]);

  const myId = customerPhone ?? auth.currentUser?.uid ?? "anonymous";

  const chatRoomId =
    tech && myId !== "anonymous" ? `${tech.phone}_${myId}` : "unknown";

  useEffect(() => {
    if (!tech || chatRoomId === "unknown") return;

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const q = query(
      collection(db, "chats", chatRoomId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));

      if (docs.length > prevCountRef.current && prevCountRef.current !== 0) {
        const newest = docs[docs.length - 1];
        if (newest.senderId !== myId) {
          new Audio("/notification.mp3").play().catch(() => {});

          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.hidden
          ) {
            new Notification(`ຂໍ້ຄວາມໃໝ່ຈາກ ${tech.name}`, {
              body:
                newest.type === "image"
                  ? "📷 ຮູບພາບ"
                  : newest.type === "location"
                  ? "📍 ຕໍາແໜ່ງທີ່ຕັ້ງ"
                  : newest.type === "booking"
                  ? "📋 ຂໍ້ມູນການຈອງ"
                  : newest.type === "booking_request"
                  ? "📋 ຂໍໃຫ້ກອກຂໍ້ມູນຈອງ"
                  : newest.text ?? "",
              icon: "/logo192.png",
            });
          }
        }
      }
      prevCountRef.current = docs.length;
      setMessages(docs);
      setLoading(false);

      setDoc(
        doc(db, "chats", chatRoomId),
        { customerLastRead: serverTimestamp() },
        { merge: true }
      ).catch(() => {});
    });
    return () => unsubscribe();
  }, [chatRoomId, tech, myId]);

  // ---- ຟັງການຈອງ (booking) ຫຼ້າສຸດ ຂອງລູກຄ້າ-ຊ່າງຄູ່ນີ້ (ບໍ່ສ້າງອັດຕະໂນມັດອີກຕໍ່ໄປ) ----
  useEffect(() => {
    if (!tech || myId === "anonymous") return;

    const q = query(
      collection(db, "bookings"),
      where("techPhone", "==", tech.phone),
      where("customerId", "==", myId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setActiveBooking(null);
        } else {
          const latest = snapshot.docs[0];
          setActiveBooking({ id: latest.id, ...latest.data() } as Booking);
        }
        setBookingLoading(false);
      },
      (err) => {
        console.error("booking query error:", err.message);
        setBookingLoading(false);
      }
    );
    return () => unsubscribe();
  }, [tech, myId]);

  // ---- ຖ້າມາຈາກໜ້າ Detail ດ້ວຍ ?book=1 ໃຫ້ເປີດແບບຟອມການຈອງອັດຕະໂນມັດ ----
  useEffect(() => {
    if (!bookingLoading && searchParams.get("book") === "1" && (!activeBooking || activeBooking.status === "completed")) {
      setShowBookingForm(true);
      searchParams.delete("book");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingLoading, activeBooking]);

  // ---- ເບິ່ງວ່າການຈອງນີ້ຮີວິວແລ້ວບໍ່ ----
  useEffect(() => {
    if (!activeBooking || activeBooking.status !== "completed") {
      setHasReview(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "reviews", activeBooking.id))
      .then((snap) => {
        if (!cancelled) setHasReview(snap.exists());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeBooking]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const touchChatRoomMeta = async (lastMessage: string) => {
    if (!tech || chatRoomId === "unknown") return;
    const chatDocRef = doc(db, "chats", chatRoomId);
    await setDoc(
      chatDocRef,
      {
        techPhone: tech.phone,
        customerPhone: myId,
        customerName: customerDisplayName,
        lastMessage,
        lastSenderId: myId,
        lastTimestamp: serverTimestamp(),
      },
      { merge: true }
    );
  };

  // ---- ລູກຄ້າຢືນຢັນວ່າວຽກສຳເລັດແທ້ (ຫຼັງຊ່າງກົດ "ວຽກແລ້ວ") ----
  const confirmBookingDone = async () => {
    if (!activeBooking) return;
    setMarking(true);
    try {
      await setDoc(
        doc(db, "bookings", activeBooking.id),
        { status: "completed", confirmedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
      alert("ຢືນຢັນບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
    } finally {
      setMarking(false);
    }
  };

  // ---- ກົດ "ວຽກສຳເລັດແລ້ວ": ຖ້າຍັງບໍ່ໄດ້ຢືນຢັນ ໃຫ້ຢືນຢັນກ່ອນ ຈາກນັ້ນເປີດ popup ໃຫ້ຄະແນນ/ຣີວິວທັນທີ ----
  const handleJobDoneClick = async () => {
    if (!activeBooking) return;
    if (activeBooking.status !== "completed") {
      await confirmBookingDone();
    }
    setShowReviewModal(true);
  };
  const sendMessage = async () => {
    const value = text.trim();
    if (!value || !tech || chatRoomId === "unknown") return;
    setText("");
    const chatDocRef = doc(db, "chats", chatRoomId);
    await addDoc(collection(chatDocRef, "messages"), {
      type: "text",
      text: value,
      senderId: myId,
      timestamp: serverTimestamp(),
    });
    await touchChatRoomMeta(value);
  };

  const uploadAndSendImage = async (file: File) => {
    if (!tech || chatRoomId === "unknown") return;
    if (!file.type.startsWith("image/")) {
      alert("ກະລຸນາເລືອກໄຟລ໌ຮູບພາບເທົ່ານັ້ນ");
      return;
    }

    setUploading(true);
    try {
      // ຫຍໍ້ຮູບ ແລະ ເກັບເປັນ base64 ກົງໃນ Firestore (ບໍ່ໃຊ້ Firebase Storage)
      const base64 = await resizeFileToBase64(file);
      if (base64.length > MAX_BASE64_LENGTH) {
        alert("ຮູບໃຫຍ່ເກີນໄປ ກະລຸນາເລືອກຮູບອື່ນ ຫຼື ຖ່າຍໃໝ່ແບບຄວາມລະອຽດນ້ອຍກວ່າ");
        return;
      }

      const chatDocRef = doc(db, "chats", chatRoomId);
      await addDoc(collection(chatDocRef, "messages"), {
        type: "image",
        imageUrl: base64,
        senderId: myId,
        timestamp: serverTimestamp(),
      });
      await touchChatRoomMeta("📷 ຮູບພາບ");
    } catch (err: any) {
      console.error("Image upload failed:", err);
      alert("ສົ່ງຮູບບໍ່ສຳເລັດ: " + (err?.message || "ບໍ່ຮູ້ສາເຫດ"));
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadAndSendImage(file);
  };

  // ---------------- Voice recording ----------------

  const uploadAndSendAudio = async (blob: Blob) => {
    if (!tech || chatRoomId === "unknown") return;
    setUploading(true);
    try {
      // ເກັບສຽງເປັນ base64 ກົງໃນ Firestore (ບໍ່ໃຊ້ Firebase Storage)
      const base64 = await blobToBase64(blob);
      if (base64.length > MAX_BASE64_LENGTH) {
        alert("ສຽງຍາວເກີນໄປ ກະລຸນາບັນທຶກສັ້ນກວ່ານີ້ (ບໍ່ເກີນ " + MAX_RECORD_SECONDS + " ວິນາທີ)");
        return;
      }

      const chatDocRef = doc(db, "chats", chatRoomId);
      await addDoc(collection(chatDocRef, "messages"), {
        type: "audio",
        audioUrl: base64,
        senderId: myId,
        timestamp: serverTimestamp(),
      });
      await touchChatRoomMeta("🎤 ຂໍ້ຄວາມສຽງ");
    } catch (err: any) {
      console.error("Audio upload failed:", err);
      alert("ສົ່ງສຽງບໍ່ສຳເລັດ: " + (err?.message || "ບໍ່ຮູ້ສາເຫດ"));
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    if (!tech || chatRoomId === "unknown") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("ອຸປະກອນ/ຕົວທ່ອງເວັບນີ້ບໍ່ຮອງຮັບການບັນທຶກສຽງ");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          const next = s + 1;
          // ບັນທຶກຍາວເກີນທີ່ກຳນົດ -> ຢຸດ ແລະ ສົ່ງອັດຕະໂນມັດ
          if (next >= MAX_RECORD_SECONDS) {
            setTimeout(() => stopRecordingAndSend(), 0);
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      alert("ບໍ່ສາມາດເຂົ້າເຖິງໄມໂຄຣໂຟນໄດ້ ກະລຸນາອະນຸຍາດການໃຊ້ໄມໂຄຣໂຟນ");
    }
  };

  const stopRecordingAndSend = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;

    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    mediaRecorder.onstop = async () => {
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      audioChunksRef.current = [];
      if (blob.size > 0) await uploadAndSendAudio(blob);
    };
    mediaRecorder.stop();
  };

  const cancelRecording = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder) {
      mediaRecorder.onstop = () => {
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      };
      if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
  };

  const formatRecordTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ---------------- Location picker (Leaflet) ----------------

  const DEFAULT_CENTER: [number, number] = [17.9757, 102.6331]; // Vientiane fallback

  const openMapPicker = () => {
    if (!tech || chatRoomId === "unknown") return;
    setShowMapPicker(true);
  };

  useEffect(() => {
    if (!showMapPicker || !mapDivRef.current) return;

    let center: [number, number] = DEFAULT_CENTER;

    const initMap = (c: [number, number]) => {
      const map = L.map(mapDivRef.current!).setView(c, 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(c, { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setPickedPos({ lat: pos.lat, lng: pos.lng });
      });

      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        setPickedPos({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
      setPickedPos({ lat: c[0], lng: c[1] });

      setTimeout(() => map.invalidateSize(), 100);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          center = [pos.coords.latitude, pos.coords.longitude];
          initMap(center);
        },
        () => initMap(center),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      initMap(center);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, [showMapPicker]);

  const closeMapPicker = () => {
    setShowMapPicker(false);
    setPickedPos(null);
  };

  const confirmSendLocation = async () => {
    if (!tech || chatRoomId === "unknown" || !pickedPos) return;
    setUploading(true);
    try {
      const chatDocRef = doc(db, "chats", chatRoomId);
      await addDoc(collection(chatDocRef, "messages"), {
        type: "location",
        lat: pickedPos.lat,
        lng: pickedPos.lng,
        senderId: myId,
        timestamp: serverTimestamp(),
      });
      await touchChatRoomMeta("📍 ຕໍາແໜ່ງທີ່ຕັ້ງ");
      closeMapPicker();
    } catch (err) {
      console.error(err);
      alert("ສົ່ງຕໍາແໜ່ງບໍ່ສຳເລັດ");
    } finally {
      setUploading(false);
    }
  };

  if (techLoading) {
    return (
      <div className="chat-page">
        <p>ກຳລັງໂຫລດ...</p>
      </div>
    );
  }

  if (!tech) {
    return (
      <div className="chat-page">
        <p>ບໍ່ພົບຂໍ້ມູນຊ່າງ</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      <header className="chat-appbar">
        <button className="detail-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>ແຊັດກັບ {tech.name}</h1>
      </header>

      {/* ---------------- Booking status bar (ອັນດຽວ, ລວມທຸກຂັ້ນຕອນ) ---------------- */}
      {!bookingLoading && activeBooking && !(activeBooking.status === "completed" && hasReview) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 14px",
            background: "#eaf6f1",
            borderBottom: "1px solid #d9ece5",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              color: "#2f7d6f",
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={15} /> ວຽກສຳເລັດແລ້ວບໍ?
          </span>
          <button
            onClick={handleJobDoneClick}
            disabled={marking}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              border: "none",
              background: "#3d8983",
              color: "#fff",
              borderRadius: 20,
              padding: "6px 13px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Star size={13} /> {marking ? "..." : "ວຽກສຳເລັດແລ້ວ"}
          </button>
        </div>
      )}

      <div className="chat-messages">
        {loading && <p className="chat-loading">ກຳລັງໂຫລດ...</p>}
        {!loading && messages.length === 0 && (
          <p className="chat-loading">ຍັງບໍ່ມີຂໍ້ຄວາມ, ເລີ່ມແຊັດເລີຍ!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === myId;
          return (
            <div key={msg.id} className={`chat-bubble-wrap ${isMe ? "chat-bubble-wrap--me" : ""}`}>
              {msg.type === "booking" ? (
                <BookingCard msg={msg} isMe={isMe} onOpen={() => setDetailBookingMsg(msg)} />
              ) : msg.type === "booking_request" ? (
                isMe ? (
                  <div
                    style={{
                      maxWidth: 240,
                      borderRadius: 14,
                      padding: "10px 14px",
                      background: "#3d8983",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <CalendarPlus size={15} /> ຂໍໃຫ້ຊ່າງກອກຂໍ້ມູນຈອງແລ້ວ
                  </div>
                ) : (
                  <div
                    style={{
                      maxWidth: 260,
                      borderRadius: 14,
                      padding: "12px 14px",
                      background: "#eef6f4",
                      border: "1px solid #d9ece5",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#2f7d6f", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <CalendarPlus size={15} /> ຊ່າງຂໍໃຫ້ທ່ານກອກຂໍ້ມູນການຈອງ
                    </span>
                    <button
                      onClick={() => setShowBookingForm(true)}
                      style={{
                        border: "none",
                        background: "#3d8983",
                        color: "#fff",
                        borderRadius: 10,
                        padding: "8px 0",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ກອກຂໍ້ມູນຈອງເລີຍ
                    </button>
                  </div>
                )
              ) : msg.type === "image" && msg.imageUrl ? (
                <img
                  src={msg.imageUrl}
                  alt="ຮູບພາບ"
                  style={{
                    maxWidth: 200,
                    maxHeight: 260,
                    borderRadius: 14,
                    cursor: "pointer",
                    display: "block",
                    objectFit: "cover",
                  }}
                  onClick={() => window.open(msg.imageUrl, "_blank")}
                />
              ) : msg.type === "location" && msg.lat != null && msg.lng != null ? (
                <a
                  href={`https://www.google.com/maps?q=${msg.lat},${msg.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`chat-bubble ${isMe ? "chat-bubble--me" : ""}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    textDecoration: "none",
                  }}
                >
                  <MapPin size={16} />
                  ເບິ່ງຕໍາແໜ່ງໃນແຜນທີ່
                </a>
              ) : msg.type === "audio" && msg.audioUrl ? (
                <audio
                  controls
                  src={msg.audioUrl}
                  style={{ maxWidth: 230, height: 36 }}
                />
              ) : (
                <div className={`chat-bubble ${isMe ? "chat-bubble--me" : ""}`}>{msg.text}</div>
              )}
            </div>
          );
        })}
        {uploading && <p className="chat-loading">ກຳລັງສົ່ງ...</p>}
        <div ref={bottomRef} />
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      <div className="chat-input-bar">
        {isRecording ? (
          <>
            <button
              type="button"
              style={iconBtnStyle}
              onClick={cancelRecording}
              title="ຍົກເລີກ"
            >
              <Trash2 size={20} color="#e05353" />
            </button>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: "#e05353",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#e05353",
                  display: "inline-block",
                  animation: "pulse 1s infinite",
                }}
              />
              ກຳລັງບັນທຶກສຽງ... {formatRecordTime(recordSeconds)}
            </div>
            <button
              className="chat-send"
              onClick={stopRecordingAndSend}
              disabled={uploading}
              title="ສົ່ງສຽງ"
            >
              <Send size={18} color="#fff" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              style={iconBtnStyle}
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              title="ຖ່າຍຮູບ"
            >
              <Camera size={20} />
            </button>
            <button
              type="button"
              style={iconBtnStyle}
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploading}
              title="ສົ່ງຮູບ"
            >
              <ImageIcon size={20} />
            </button>
            <button
              type="button"
              style={iconBtnStyle}
              onClick={openMapPicker}
              disabled={uploading}
              title="ເລືອກຕໍາແໜ່ງ"
            >
              <MapPin size={20} />
            </button>
            <button
              type="button"
              style={iconBtnStyle}
              onClick={startRecording}
              disabled={uploading}
              title="ບັນທຶກສຽງ"
            >
              <Mic size={20} />
            </button>
            <input
              ref={textInputRef}
              type="text"
              placeholder="ພິມຂໍ້ຄວາມ..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button className="chat-send" onClick={sendMessage} disabled={uploading}>
              <Send size={18} color="#fff" />
            </button>
          </>
        )}
      </div>

      {/* ---------------- Location picker modal ---------------- */}
      {showMapPicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              height: "80vh",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid #eee",
              }}
            >
              <strong>ເລືອກຕໍາແໜ່ງ</strong>
              <button
                type="button"
                onClick={closeMapPicker}
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ flex: 1, position: "relative" }}>
              <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
              <div
                style={{
                  position: "absolute",
                  bottom: 8,
                  left: 8,
                  right: 8,
                  background: "rgba(255,255,255,0.9)",
                  padding: "6px 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                ແຕະຫຼືລາກໝຸດເພື່ອເລືອກຕໍາແໜ່ງ
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, padding: 12, borderTop: "1px solid #eee" }}>
              <button
                type="button"
                onClick={closeMapPicker}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "1px solid #ccc",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                onClick={confirmSendLocation}
                disabled={!pickedPos || uploading}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "#3d8983",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: !pickedPos || uploading ? 0.6 : 1,
                }}
              >
                ສົ່ງຕໍາແໜ່ງນີ້
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Review modal ---------------- */}
      {showReviewModal && tech && activeBooking && myId !== "anonymous" && (
        <ReviewModal
          bookingId={activeBooking.id}
          techPhone={tech.phone}
          techName={tech.name}
          customerId={myId}
          customerName={customerDisplayName}
          onClose={() => setShowReviewModal(false)}
          onSaved={() => setHasReview(true)}
        />
      )}

      {/* ---------------- Booking form modal ---------------- */}
      {showBookingForm && tech && myId !== "anonymous" && chatRoomId !== "unknown" && (
        <BookingFormModal
          techPhone={tech.phone}
          techName={tech.name}
          customerId={myId}
          chatRoomId={chatRoomId}
          defaultName={customerDisplayName !== "ລູກຄ້າ" ? customerDisplayName : ""}
          defaultPhone={customerPhone || ""}
          onClose={() => setShowBookingForm(false)}
        />
      )}
      {/* ---------------- Booking detail modal (ກົດບັດເພື່ອເບິ່ງລາຍລະອຽດເຕັມ) ---------------- */}
      {detailBookingMsg && (
        <BookingDetailModal msg={detailBookingMsg} onClose={() => setDetailBookingMsg(null)} />
      )}
    </div>
  );
}

export default Chat;
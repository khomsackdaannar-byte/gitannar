import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { ArrowLeft, Send, Camera, Image as ImageIcon, MapPin, CheckCircle2, Clock3, CalendarPlus, User, Mic, Trash2 } from "lucide-react";
import { db, storage } from "../../firebase/Firebase";
import { techList } from "../../Types/Technician";
import "../Chat/Chat.css";

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
}

interface TechLite {
  name: string;
  phone: string;
}

interface Booking {
  id: string;
  techPhone: string;
  customerId: string;
  status: "in_progress" | "pending_confirm" | "completed";
  createdAt?: { seconds: number };
}

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  height: 38,
  borderRadius: "50%",
  border: "none",
  background: "transparent",
  color: "#5bb8c4",
  cursor: "pointer",
  flexShrink: 0,
};

function BookingCard({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  return (
    <div
      style={{
        maxWidth: 260,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid #d7edf0",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          background: isMe ? "#5bb8c4" : "#eaf6f8",
          color: isMe ? "#fff" : "#2b7c87",
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        <CalendarPlus size={14} /> ຂໍ້ມູນການຈອງ
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {msg.bookingPhotoUrl && (
          <img
            src={msg.bookingPhotoUrl}
            alt="ຮູບບັນຫາ"
            style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 4, cursor: "pointer" }}
            onClick={() => window.open(msg.bookingPhotoUrl!, "_blank")}
          />
        )}
        <div style={{ fontSize: 13, color: "#2b3a37", display: "flex", alignItems: "center", gap: 5 }}>
          <User size={13} color="#5bb8c4" /> {msg.bookingName}
        </div>
        <div style={{ fontSize: 13, color: "#2b3a37" }}>☎ {msg.bookingPhone}</div>
        <div style={{ fontSize: 13, color: "#2b3a37" }}>📍 {msg.bookingAddress}</div>
        {msg.bookingTime && <div style={{ fontSize: 13, color: "#2b3a37" }}>🕒 {msg.bookingTime}</div>}
      </div>
    </div>
  );
}

function TechnicianChat() {
  const { phone, chatRoomId } = useParams<{ phone: string; chatRoomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // undefined = ກຳລັງໂຫລດຂໍ້ມູນຊ່າງ, null = ຫາບໍ່ພົບ, object = ພົບແລ້ວ
  const [tech, setTech] = useState<TechLite | null | undefined>(undefined);

  // ---- Booking state ----
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [marking, setMarking] = useState(false);

  // ---- Voice recording state ----
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const roomId = decodeURIComponent(chatRoomId ?? "");

  // ---- ຫາຂໍ້ມູນຊ່າງ: ລອງໃນ techList (ຄົງທີ່) ກ່ອນ, ຖ້າບໍ່ພົບໃຫ້ໄປຫາໃນ Firestore ----
  useEffect(() => {
    const p = decodeURIComponent(phone ?? "");
    if (!p) {
      setTech(null);
      return;
    }

    const fromList = techList.find((t) => t.phone === p);
    if (fromList) {
      setTech({ name: fromList.name, phone: fromList.phone });
      return;
    }

    let cancelled = false;
    setTech(undefined);

    getDoc(doc(db, "technicians", p))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data();
          setTech({ name: d.name ?? "", phone: d.phone ?? p });
        } else {
          setTech(null);
        }
      })
      .catch(() => {
        if (!cancelled) setTech(null);
      });

    return () => {
      cancelled = true;
    };
  }, [phone]);

  const myId = `tech_${tech?.phone ?? ""}`;

  // ---- ເອົາ customerId ອອກຈາກ roomId (ຮູບແບບ "{techPhone}_{customerId}") ----
  const customerIdFromRoom =
    tech && roomId.startsWith(`${tech.phone}_`) ? roomId.slice(tech.phone.length + 1) : null;

  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(db, "chats", roomId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      setMessages(docs);
      setLoading(false);

      setDoc(
        doc(db, "chats", roomId),
        { techLastRead: serverTimestamp() },
        { merge: true }
      ).catch(() => {});
    });
    return () => unsubscribe();
  }, [roomId]);

  // ---- ຟັງການຈອງ (booking) ຫຼ້າສຸດ ຂອງລູກຄ້າຄົນນີ້ ----
  useEffect(() => {
    if (!tech || !customerIdFromRoom) return;
    const q = query(
      collection(db, "bookings"),
      where("techPhone", "==", tech.phone),
      where("customerId", "==", customerIdFromRoom),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setActiveBooking(null);
          return;
        }
        const latest = snapshot.docs[0];
        setActiveBooking({ id: latest.id, ...latest.data() } as Booking);
      },
      (err) => console.error("booking query error:", err.message)
    );
    return () => unsubscribe();
  }, [tech, customerIdFromRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const touchChatRoomMeta = async (lastMessage: string) => {
    if (!roomId) return;
    const chatDocRef = doc(db, "chats", roomId);
    await setDoc(
      chatDocRef,
      {
        lastMessage,
        lastSenderId: myId,
        lastTimestamp: serverTimestamp(),
      },
      { merge: true }
    );
  };

  // ---- ຊ່າງແຈ້ງວ່າວຽກສຳເລັດ (ລໍຖ້າລູກຄ້າຢືນຢັນ) ----
  const markBookingDone = async () => {
    if (!activeBooking) return;
    if (!window.confirm("ຢືນຢັນວ່າວຽກນີ້ສຳເລັດແລ້ວບໍ່? (ລູກຄ້າຈະຕ້ອງຢືນຢັນອີກເທື່ອ)")) return;
    setMarking(true);
    try {
      await setDoc(
        doc(db, "bookings", activeBooking.id),
        { status: "pending_confirm", techMarkedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
      alert("ແຈ້ງວຽກສຳເລັດບໍ່ໄດ້ ກະລຸນາລອງໃໝ່");
    } finally {
      setMarking(false);
    }
  };

  // ---- ຊ່າງກົດຂໍໃຫ້ລູກຄ້າກອກຂໍ້ມູນການຈອງ (ສົ່ງເປັນຂໍ້ຄວາມພິເສດ) ----
  const sendBookingRequest = async () => {
    if (!roomId) return;
    setMarking(true);
    try {
      const chatDocRef = doc(db, "chats", roomId);
      await addDoc(collection(chatDocRef, "messages"), {
        type: "booking_request",
        senderId: myId,
        timestamp: serverTimestamp(),
      });
      await touchChatRoomMeta("📋 ຂໍໃຫ້ກອກຂໍ້ມູນຈອງ");
    } catch (err) {
      console.error(err);
      alert("ສົ່ງຄຳຂໍບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
    } finally {
      setMarking(false);
    }
  };

  const sendMessage = async () => {
    const value = text.trim();
    if (!value || !roomId) return;
    setText("");
    const chatDocRef = doc(db, "chats", roomId);
    await addDoc(collection(chatDocRef, "messages"), {
      type: "text",
      text: value,
      senderId: myId,
      timestamp: serverTimestamp(),
    });
    await touchChatRoomMeta(value);
  };

  const uploadAndSendImage = async (file: File) => {
    if (!roomId) return;
    if (!file.type.startsWith("image/")) {
      alert("ກະລຸນາເລືອກໄຟລ໌ຮູບພາບເທົ່ານັ້ນ");
      return;
    }

    setUploading(true);
    try {
      const path = `chat-images/${roomId}/${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      const chatDocRef = doc(db, "chats", roomId);
      await addDoc(collection(chatDocRef, "messages"), {
        type: "image",
        imageUrl: url,
        senderId: myId,
        timestamp: serverTimestamp(),
      });
      await touchChatRoomMeta("📷 ຮູບພາບ");
    } catch (err) {
      console.error(err);
      alert("ສົ່ງຮູບບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadAndSendImage(file);
  };

  const sendLocation = () => {
    if (!roomId) return;
    if (!navigator.geolocation) {
      alert("ອຸປະກອນນີ້ບໍ່ຮອງຮັບການສົ່ງຕໍາແໜ່ງ");
      return;
    }
    setUploading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const chatDocRef = doc(db, "chats", roomId);
          await addDoc(collection(chatDocRef, "messages"), {
            type: "location",
            lat: latitude,
            lng: longitude,
            senderId: myId,
            timestamp: serverTimestamp(),
          });
          await touchChatRoomMeta("📍 ຕໍາແໜ່ງທີ່ຕັ້ງ");
        } catch (err) {
          console.error(err);
          alert("ສົ່ງຕໍາແໜ່ງບໍ່ສຳເລັດ");
        } finally {
          setUploading(false);
        }
      },
      (err) => {
        console.error(err);
        alert("ບໍ່ສາມາດດຶງຕໍາແໜ່ງໄດ້ ກະລຸນາອະນຸຍາດການເຂົ້າເຖິງທີ່ຕັ້ງໃນຕົວທ່ອງເວັບ/ອຸປະກອນ");
        setUploading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ---------------- Voice recording ----------------

  const uploadAndSendAudio = async (blob: Blob) => {
    if (!roomId) return;
    setUploading(true);
    try {
      const path = `chat-audio/${roomId}/${Date.now()}.webm`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, blob);
      const url = await getDownloadURL(fileRef);

      const chatDocRef = doc(db, "chats", roomId);
      await addDoc(collection(chatDocRef, "messages"), {
        type: "audio",
        audioUrl: url,
        senderId: myId,
        timestamp: serverTimestamp(),
      });
      await touchChatRoomMeta("🎤 ຂໍ້ຄວາມສຽງ");
    } catch (err: any) {
      console.error("Audio upload failed:", err);
      alert(
        "ສົ່ງສຽງບໍ່ສຳເລັດ: " +
          (err?.code || err?.message || "ບໍ່ຮູ້ສາເຫດ") +
          "\n\nກະລຸນາກວດ Firebase Storage rules ຫຼືເບິ່ງ console (F12)."
      );
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    if (!roomId) return;
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
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
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

  // ບໍ່ມີການຈອງເລີຍ, ຫຼືການຈອງລ່າສຸດສຳເລັດແລ້ວ -> ໃຫ້ຊ່າງກົດຂໍໃຫ້ລູກຄ້າກອກຂໍ້ມູນຈອງໄດ້
  const showRequestButton = !activeBooking || activeBooking.status === "completed";

  if (tech === undefined) {
    return (
      <div className="chat-page">
        <p>ກຳລັງໂຫລດ...</p>
      </div>
    );
  }

  if (tech === null) {
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
      <header className="chat-appbar" style={{ background: "#5bb8c4" }}>
        <button className="detail-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} color="#fff" />
        </button>
        <h1 style={{ color: "#fff" }}>ແຊັດກັບລູກຄ້າ ({tech.name})</h1>
      </header>

      {/* ---------------- Booking status bar ---------------- */}
      {showRequestButton && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 14px",
            background: "#eaf6f8",
            borderBottom: "1px solid #d7edf0",
          }}
        >
          <span style={{ fontSize: 12.5, color: "#2b5f66" }}>
            {activeBooking?.status === "completed" ? "ຢາກໃຫ້ຈອງໃໝ່ອີກຄັ້ງບໍ?" : "ຍັງບໍ່ໄດ້ຈອງບໍລິການ"}
          </span>
          <button
            onClick={sendBookingRequest}
            disabled={marking}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              border: "none",
              background: "#5bb8c4",
              color: "#fff",
              borderRadius: 20,
              padding: "6px 13px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <CalendarPlus size={14} /> {marking ? "ກຳລັງສົ່ງ..." : "ຂໍໃຫ້ກອກຂໍ້ມູນຈອງ"}
          </button>
        </div>
      )}

      {activeBooking && (
        <>
          {activeBooking.status === "in_progress" && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "6px 14px",
                background: "#f5f7f6",
                borderBottom: "1px solid #eceeed",
              }}
            >
              <button
                onClick={markBookingDone}
                disabled={marking}
                style={{
                  border: "1px solid #5bb8c4",
                  background: "#fff",
                  color: "#5bb8c4",
                  borderRadius: 20,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {marking ? "ກຳລັງແຈ້ງ..." : "✓ ວຽກແລ້ວ"}
              </button>
            </div>
          )}

          {activeBooking.status === "pending_confirm" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "#fff6e5",
                borderBottom: "1px solid #f0e2bd",
                fontSize: 13,
                color: "#8a6413",
                fontWeight: 600,
              }}
            >
              <Clock3 size={14} /> ລໍຖ້າລູກຄ້າຢືນຢັນວຽກສຳເລັດ
            </div>
          )}

          {activeBooking.status === "completed" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "#eaf6f1",
                borderBottom: "1px solid #d9ece5",
                fontSize: 13,
                color: "#2f7d6f",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={15} /> ວຽກສຳເລັດແລ້ວ (ລູກຄ້າຢືນຢັນແລ້ວ)
            </div>
          )}
        </>
      )}

      <div className="chat-messages">
        {loading && <p className="chat-loading">ກຳລັງໂຫລດ...</p>}
        {!loading && messages.length === 0 && (
          <p className="chat-loading">ຍັງບໍ່ມີຂໍ້ຄວາມ</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === myId;
          return (
            <div key={msg.id} className={`chat-bubble-wrap ${isMe ? "chat-bubble-wrap--me" : ""}`}>
              {msg.type === "booking" ? (
                <BookingCard msg={msg} isMe={isMe} />
              ) : msg.type === "booking_request" ? (
                <div
                  style={{
                    maxWidth: 240,
                    borderRadius: 14,
                    padding: "10px 14px",
                    background: isMe ? "#5bb8c4" : "#eaf6f8",
                    color: isMe ? "#fff" : "#2b7c87",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CalendarPlus size={15} />
                  {isMe ? "ໄດ້ຂໍໃຫ້ລູກຄ້າກອກຂໍ້ມູນຈອງແລ້ວ" : "ຂໍໃຫ້ທ່ານກອກຂໍ້ມູນການຈອງ"}
                </div>
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
                  className="chat-bubble"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    textDecoration: "none",
                    ...(isMe ? { background: "#5bb8c4", color: "#fff" } : {}),
                  }}
                >
                  <MapPin size={16} />
                  ເບິ່ງຕໍາແໜ່ງໃນແຜນທີ່
                </a>
              ) : msg.type === "audio" && msg.audioUrl ? (
                <audio controls src={msg.audioUrl} style={{ maxWidth: 230, height: 36 }} />
              ) : (
                <div
                  className="chat-bubble"
                  style={isMe ? { background: "#5bb8c4", color: "#fff" } : undefined}
                >
                  {msg.text}
                </div>
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
            <button type="button" style={iconBtnStyle} onClick={cancelRecording} title="ຍົກເລີກ">
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
              style={{ background: "#5bb8c4" }}
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
              onClick={sendLocation}
              disabled={uploading}
              title="ສົ່ງຕໍາແໜ່ງ"
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
              type="text"
              placeholder="ພິມຂໍ້ຄວາມ..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              className="chat-send"
              style={{ background: "#5bb8c4" }}
              onClick={sendMessage}
              disabled={uploading}
            >
              <Send size={18} color="#fff" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default TechnicianChat;
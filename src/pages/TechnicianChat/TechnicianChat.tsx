import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { ArrowLeft, Send, Camera, Image as ImageIcon, MapPin, CheckCircle2 } from "lucide-react";
import { db, storage } from "../../firebase/Firebase";
import { techList } from "../../Types/Technician";
import "../Chat/Chat.css";

interface ChatMessage {
  id: string;
  type?: "text" | "image" | "location";
  text?: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  senderId: string;
}

interface TechLite {
  name: string;
  phone: string;
}

type BookingStatus = "in_progress" | "pending_confirm" | "completed";

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

  // ---- Booking (2-stage confirm) state ----
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null);
  const creatingBookingRef = useRef(false);
  const [marking, setMarking] = useState(false);

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

  // ---- ຫາ/ສ້າງ booking ຂອງຫ້ອງແຊັດນີ້ ----
  // ປົກກະຕິລູກຄ້າຈະເປັນຄົນສ້າງໃຫ້ກ່ອນ (ຕອນເປີດແຊັດຄັ້ງທຳອິດ), ອັນນີ້ພຽງແຕ່ຟັງ/ອ່ານ
  // ແຕ່ກໍ່ກັນໄວ້ສ້າງໃຫ້ເຜື່ອກໍລະນີຊ່າງເປີດແຊັດກ່ອນລູກຄ້າ
  useEffect(() => {
    if (!tech || !roomId) {
      setBookingId(null);
      setBookingStatus(null);
      return;
    }

    const q = query(
      collection(db, "bookings"),
      where("chatId", "==", roomId),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        setBookingId(d.id);
        setBookingStatus((d.data().status as BookingStatus) ?? "in_progress");
        return;
      }

      if (creatingBookingRef.current) return;
      creatingBookingRef.current = true;
      try {
        // roomId ມີຮູບແບບ "{techPhone}_{customerId}" — ດຶງ customerId ອອກມາ
        const customerId = roomId.startsWith(`${tech.phone}_`)
          ? roomId.slice(tech.phone.length + 1)
          : "";
        if (!customerId) return;

        await addDoc(collection(db, "bookings"), {
          chatId: roomId,
          techPhone: tech.phone,
          techName: tech.name,
          customerId,
          customerName: "ລູກຄ້າ",
          status: "in_progress",
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Auto-create booking failed:", err);
      } finally {
        creatingBookingRef.current = false;
      }
    });

    return () => unsubscribe();
  }, [tech, roomId]);

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

  // ---- ຊ່າງແຈ້ງຂັ້ນຕອນທີ 1: ວຽກແລ້ວ (ຍັງບໍ່ completed ທັນທີ, ລໍລູກຄ້າຢືນຢັນກ່ອນ) ----
  const markJobDone = async () => {
    if (!bookingId) return;
    if (!window.confirm("ຢືນຢັນວ່າວຽກນີ້ສຳເລັດແລ້ວບໍ່?")) return;
    setMarking(true);
    try {
      await setDoc(
        doc(db, "bookings", bookingId),
        {
          status: "pending_confirm",
          techMarkedDoneAt: serverTimestamp(),
          techMarkedBy: myId,
        },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
      alert("ແຈ້ງວຽກສຳເລັດບໍ່ໄດ້ ກະລຸນາລອງໃໝ່");
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
      <header className="chat-appbar" style={{ background: "#5bb8c4" }}>
        <button className="detail-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} color="#fff" />
        </button>
        <h1 style={{ color: "#fff" }}>ແຊັດກັບລູກຄ້າ ({tech.name})</h1>
      </header>

      {/* ---------------- Job status bar (booking-based, 2-stage confirm) ---------------- */}
      {bookingStatus === "completed" ? (
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
          <CheckCircle2 size={15} /> ວຽກສຳເລັດແລ້ວ
        </div>
      ) : bookingStatus === "pending_confirm" ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 14px",
            background: "#fff7e6",
            borderBottom: "1px solid #f3e6c4",
            fontSize: 13,
            color: "#8a6d1f",
            fontWeight: 600,
          }}
        >
          ລໍຖ້າລູກຄ້າຢືນຢັນ...
        </div>
      ) : (
        bookingStatus === "in_progress" && (
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
              onClick={markJobDone}
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
        )
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
              {msg.type === "image" && msg.imageUrl ? (
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
      </div>
    </div>
  );
}

export default TechnicianChat;
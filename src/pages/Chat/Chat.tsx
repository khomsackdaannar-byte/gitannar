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
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { ArrowLeft, Send, Camera, Image as ImageIcon, MapPin, X, Delete, Globe } from "lucide-react";
import { db, auth, storage } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import { techList, type Technician } from "../../Types/Technician";
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
  type?: "text" | "image" | "location";
  text?: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  senderId: string;
  timestamp?: { seconds: number };
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
  color: "#3d8983",
  cursor: "pointer",
  flexShrink: 0,
};

// ---------- Simple on-screen virtual keyboard (EN + Lao) ----------
const KEY_ROWS_EN = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const KEY_ROWS_LAO = [
  ["ກ", "ຂ", "ຄ", "ງ", "ຈ", "ສ", "ຊ", "ຍ", "ດ", "ຕ", "ຖ"],
  ["ທ", "ນ", "ບ", "ປ", "ຜ", "ຝ", "ພ", "ຟ", "ມ", "ຢ", "ຣ"],
  ["ລ", "ວ", "ຫ", "ອ", "ຮ", "ໜ", "ໝ", "ໆ"],
  ["ະ", "າ", "ິ", "ີ", "ຶ", "ື", "ຸ", "ູ", "ເ", "ແ"],
  ["ໂ", "ໃ", "ໄ", "ຳ", "່", "້", "໊", "໋", "ັ"],
];

function VirtualKeyboard({
  onKey,
  onBackspace,
  onSpace,
  onEnter,
  onClose,
}: {
  onKey: (k: string) => void;
  onBackspace: () => void;
  onSpace: () => void;
  onEnter: () => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<"en" | "lo">("lo");
  const [shift, setShift] = useState(false);

  const rows = lang === "en" ? KEY_ROWS_EN : KEY_ROWS_LAO;

  const keyBtnStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    margin: 3,
    padding: "10px 0",
    borderRadius: 8,
    border: "none",
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
    fontSize: 15,
    cursor: "pointer",
  };

  const displayChar = (k: string) => (lang === "en" && shift ? k.toUpperCase() : k);

  return (
    <div
      style={{
        background: "#e7ebef",
        padding: "6px 4px 10px",
        borderTop: "1px solid #d6dade",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "2px 6px 6px",
        }}
      >
        <span style={{ fontSize: 12, color: "#666" }}>
          ແປ້ນພິມ · {lang === "lo" ? "ລາວ" : "English"}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{ border: "none", background: "transparent", cursor: "pointer" }}
        >
          <X size={18} />
        </button>
      </div>

      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex" }}>
          {row.map((k) => (
            <button
              type="button"
              key={k}
              style={keyBtnStyle}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onKey(displayChar(k))}
            >
              {displayChar(k)}
            </button>
          ))}
        </div>
      ))}

      <div style={{ display: "flex" }}>
        <button
          type="button"
          title="ປ່ຽນພາສາ"
          style={{
            ...keyBtnStyle,
            flex: 1.4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
          }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setLang((l) => (l === "en" ? "lo" : "en"))}
        >
          <Globe size={14} />
          {lang === "lo" ? "EN" : "ລາວ"}
        </button>
        {lang === "en" && (
          <button
            type="button"
            style={{ ...keyBtnStyle, flex: 1.2, fontWeight: 600 }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShift((s) => !s)}
          >
            ⇧
          </button>
        )}
        <button
          type="button"
          style={{ ...keyBtnStyle, flex: 3.5 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSpace}
        >
          ຊ່ອງວ່າງ
        </button>
        <button
          type="button"
          style={{ ...keyBtnStyle, flex: 1.4, display: "flex", justifyContent: "center" }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onBackspace}
        >
          <Delete size={16} />
        </button>
        <button
          type="button"
          style={{ ...keyBtnStyle, flex: 1.8, background: "#3d8983", color: "#fff", fontWeight: 600 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onEnter}
        >
          ສົ່ງ
        </button>
      </div>
    </div>
  );
}

function Chat() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
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

  // ---- Virtual keyboard state ----
  const [showKeyboard, setShowKeyboard] = useState(false);

  // ---- Map picker state ----
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickedPos, setPickedPos] = useState<{ lat: number; lng: number } | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

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
        customerName: auth.currentUser?.displayName || "ລູກຄ້າ",
        lastMessage,
        lastSenderId: myId,
        lastTimestamp: serverTimestamp(),
      },
      { merge: true }
    );
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
      const path = `chat-images/${chatRoomId}/${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      const chatDocRef = doc(db, "chats", chatRoomId);
      await addDoc(collection(chatDocRef, "messages"), {
        type: "image",
        imageUrl: url,
        senderId: myId,
        timestamp: serverTimestamp(),
      });
      await touchChatRoomMeta("📷 ຮູບພາບ");
    } catch (err: any) {
      // Surface the real Firebase error so we can see WHY it's failing
      // (most common cause: Storage security rules rejecting the write,
      // or the storage bucket not being configured yet)
      console.error("Image upload failed:", err);
      alert(
        "ສົ່ງຮູບບໍ່ສຳເລັດ: " +
          (err?.code || err?.message || "ບໍ່ຮູ້ສາເຫດ") +
          "\n\nກະລຸນາກວດ Firebase Storage rules ຫຼືເບິ່ງ console (F12) ເພື່ອລາຍລະອຽດ."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadAndSendImage(file);
  };

  // ---------------- Location picker (Leaflet) ----------------

  const DEFAULT_CENTER: [number, number] = [17.9757, 102.6331]; // Vientiane fallback

  const openMapPicker = () => {
    if (!tech || chatRoomId === "unknown") return;
    setShowMapPicker(true);
  };

  // Initialize the Leaflet map once the picker modal is shown
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

      // Leaflet needs a resize kick when it's mounted inside a modal
      setTimeout(() => map.invalidateSize(), 100);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          center = [pos.coords.latitude, pos.coords.longitude];
          initMap(center);
        },
        () => initMap(center), // permission denied / unavailable -> fallback center
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

  // ---------------- Virtual keyboard handlers ----------------

  const handleKeyPress = (k: string) => setText((t) => t + k);
  const handleBackspace = () => setText((t) => t.slice(0, -1));
  const handleSpace = () => setText((t) => t + " ");
  const handleKeyboardEnter = () => {
    sendMessage();
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
      <header className="chat-appbar">
        <button className="detail-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>ແຊັດກັບ {tech.name}</h1>
      </header>

      <div className="chat-messages">
        {loading && <p className="chat-loading">ກຳລັງໂຫລດ...</p>}
        {!loading && messages.length === 0 && (
          <p className="chat-loading">ຍັງບໍ່ມີຂໍ້ຄວາມ, ເລີ່ມແຊັດເລີຍ!</p>
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
        <input
          ref={textInputRef}
          type="text"
          placeholder="ພິມຂໍ້ຄວາມ..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setShowKeyboard(true)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="chat-send" onClick={sendMessage} disabled={uploading}>
          <Send size={18} color="#fff" />
        </button>
      </div>

      {showKeyboard && (
        <VirtualKeyboard
          onKey={handleKeyPress}
          onBackspace={handleBackspace}
          onSpace={handleSpace}
          onEnter={handleKeyboardEnter}
          onClose={() => setShowKeyboard(false)}
        />
      )}

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
    </div>
  );
}

export default Chat;
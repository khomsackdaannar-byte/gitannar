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
import { ArrowLeft, Send } from "lucide-react";
import { db, auth } from "../../firebase/Firebase";
import { useAuth } from "../../context/AuthContext"; // ປັບ path ນີ້ໃຫ້ກົງກັບໂຄງສ້າງຕົວຈິງຂອງທ່ານ
import { techList, type Technician } from "../../Types/Technician";
import "./Chat.css";

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp?: { seconds: number };
}

// ທຽບເທົ່າ ChatPage (StatefulWidget) ໃນ Flutter
function Chat() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const { customerPhone } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0); // ຈື່ຈຳນວນຂໍ້ຄວາມຄັ້ງກ່ອນ ເພື່ອກວດວ່າມີຂໍ້ຄວາມໃໝ່

  const decodedPhone = decodeURIComponent(phone ?? "");
  const staticTech = techList.find((t) => t.phone === decodedPhone);

  // ຂໍ້ມູນຊ່າງ (ຫາໃນ techList ຄົງທີ່ກ່ອນ, ຖ້າບໍ່ພົບໃຫ້ໄປອ່ານ Firestore)
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

  // ຕົວຕົນຄົງທີ່ຂອງຜູ້ໃຊ້ປັດຈຸບັນ:
  // - ຖ້າເປັນລູກຄ້າ (login ຜ່ານ OTP): ໃຊ້ customerPhone ທີ່ຄົງທີ່ ບໍ່ປ່ຽນເຖິງ logout/login ໃໝ່
  // - ຖ້າເປັນຊ່າງ (login ຜ່ານ email/password): auth.currentUser.uid ຄົງທີ່ຢູ່ແລ້ວ ໃຊ້ໄດ້ເລີຍ
  const myId = customerPhone ?? auth.currentUser?.uid ?? "anonymous";

  // chatRoomId ຜູກທັງເບີຊ່າງ ແລະ ຕົວຕົນຄົງທີ່ຂອງອີກຝ່າຍ
  // ເພື່ອແຍກຫ້ອງແຊັດແຕ່ລະຄູ່ອອກຈາກກັນ (ລູກຄ້າຄົນນຶ່ງ ບໍ່ເຫັນຂໍ້ຄວາມຂອງລູກຄ້າຄົນອື່ນ)
  const chatRoomId =
    tech && myId !== "anonymous" ? `${tech.phone}_${myId}` : "unknown";

  // ທຽບເທົ່າ StreamBuilder<QuerySnapshot> + ແຈ້ງເຕືອນຂໍ້ຄວາມໃໝ່
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

      // ຖ້າມີຂໍ້ຄວາມໃໝ່ເພີ່ມຂຶ້ນ (ບໍ່ແມ່ນການໂຫລດຄັ້ງທຳອິດ) ແລະ ຄົນສົ່ງບໍ່ແມ່ນຂ້ອຍ -> ແຈ້ງເຕືອນ
      if (docs.length > prevCountRef.current && prevCountRef.current !== 0) {
        const newest = docs[docs.length - 1];
        if (newest.senderId !== myId) {
          // ສຽງແຈ້ງເຕືອນ (ຕ້ອງມີໄຟລ໌ /public/notification.mp3, ຖ້າບໍ່ມີໃຫ້ລຶບແຖວນີ້ອອກ)
          new Audio("/notification.mp3").play().catch(() => {});

          // ແຈ້ງເຕືອນຂອງ browser (ເຫັນເຖິງແມ່ນຢູ່ tab ອື່ນ ຫຼື ຫຍໍ້ໜ້າຈໍ)
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.hidden
          ) {
            new Notification(`ຂໍ້ຄວາມໃໝ່ຈາກ ${tech.name}`, {
              body: newest.text,
              icon: "/logo192.png",
            });
          }
        }
      }
      prevCountRef.current = docs.length;
      setMessages(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [chatRoomId, tech, myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ທຽບເທົ່າ _sendMessage()
  const sendMessage = async () => {
    const value = text.trim();
    if (!value || !tech || chatRoomId === "unknown") return;
    setText("");
    const chatDocRef = doc(db, "chats", chatRoomId);
    await addDoc(collection(chatDocRef, "messages"), {
      text: value,
      senderId: myId,
      timestamp: serverTimestamp(),
    });
    await setDoc(
      chatDocRef,
      {
        techPhone: tech.phone,
        customerPhone: myId,
        customerName: auth.currentUser?.displayName || "ລູກຄ້າ",
        lastMessage: value,
        lastSenderId: myId,
        lastTimestamp: serverTimestamp(),
      },
      { merge: true }
    );
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
              <div className={`chat-bubble ${isMe ? "chat-bubble--me" : ""}`}>{msg.text}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <input
          type="text"
          placeholder="ພິມຂໍ້ຄວາມ..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="chat-send" onClick={sendMessage}>
          <Send size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

export default Chat;
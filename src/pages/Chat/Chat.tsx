import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ArrowLeft, Send } from "lucide-react";
import { db, auth } from "../../firebase/Firebase";
import { techList } from "../../Types/Technician";
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const tech = techList.find((t) => t.phone === decodeURIComponent(phone ?? ""));
  const chatRoomId = tech?.phone ?? "unknown"; // ໃຊ້ເບີໂທຊ່າງເປັນ ID ຫ້ອງແຊັດ ຄືກັບ Flutter
  const myUid = auth.currentUser?.uid ?? "anonymous";

  // ທຽບເທົ່າ StreamBuilder<QuerySnapshot>
  useEffect(() => {
    const q = query(
      collection(db, "chats", chatRoomId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      setMessages(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [chatRoomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ທຽບເທົ່າ _sendMessage()
  // ໝາຍເຫດ: ເພີ່ມ customerUid ເຂົ້າໄປໃນ chats/{roomId} doc ນຳ
  // ເພື່ອໃຫ້ຝັ່ງ TechnicianHome ສາມາດ navigate ໄປຫາລູກຄ້າຄົນນັ້ນໄດ້ຖືກຕ້ອງ
  // (ຖ້າບໍ່ມີແຖວນີ້ TechnicianHome ຈະໄດ້ customerUid ເປັນຄ່າວ່າງ ແລະກົດເຂົ້າຫ້ອງແຊັດຈະຜິດພາດ)
  const sendMessage = async () => {
    const value = text.trim();
    if (!value || !tech) return;
    setText("");
    const chatDocRef = doc(db, "chats", chatRoomId);
    await addDoc(collection(chatDocRef, "messages"), {
      text: value,
      senderId: myUid,
      timestamp: serverTimestamp(),
    });
    await setDoc(
      chatDocRef,
      {
        techPhone: tech.phone,
        customerUid: myUid,
        customerName: auth.currentUser?.displayName || "ລູກຄ້າ",
        lastMessage: value,
        lastTimestamp: serverTimestamp(),
      },
      { merge: true }
    );
  };

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
          const isMe = msg.senderId === myUid;
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
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
import { db } from "../../firebase/Firebase";
import { techList } from "../../Types/Technician";
import "../Chat/Chat.css"; // ໃຊ້ style ດຽວກັນກັບໜ້າແຊັດຝັ່ງລູກຄ້າ

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
}

// ທຽບເທົ່າ TechnicianChatScreen ໃນ Flutter (technician_chat_screen.dart)
function TechnicianChat() {
  const { phone, chatRoomId } = useParams<{ phone: string; chatRoomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const tech = techList.find((t) => t.phone === decodeURIComponent(phone ?? ""));
  const roomId = decodeURIComponent(chatRoomId ?? "");
  const myId = `tech_${tech?.phone ?? ""}`; // ທຽບເທົ່າ myId = 'tech_${tech.phone}'

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
    });
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ທຽບເທົ່າ _sendMessage() — ບັນທຶກຂໍ້ຄວາມ ແລະ ອັບເດດ lastMessage/lastTimestamp
  const sendMessage = async () => {
    const value = text.trim();
    if (!value || !roomId) return;
    setText("");
    const chatDocRef = doc(db, "chats", roomId);
    await addDoc(collection(chatDocRef, "messages"), {
      text: value,
      senderId: myId,
      timestamp: serverTimestamp(),
    });
    await setDoc(
      chatDocRef,
      { lastMessage: value, lastTimestamp: serverTimestamp() },
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
      <header className="chat-appbar" style={{ background: "#5bb8c4" }}>
        <button className="detail-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} color="#fff" />
        </button>
        <h1 style={{ color: "#fff" }}>ແຊັດກັບລູກຄ້າ ({tech.name})</h1>
      </header>

      <div className="chat-messages">
        {loading && <p className="chat-loading">ກຳລັງໂຫລດ...</p>}
        {!loading && messages.length === 0 && (
          <p className="chat-loading">ຍັງບໍ່ມີຂໍ້ຄວາມ</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === myId;
          return (
            <div key={msg.id} className={`chat-bubble-wrap ${isMe ? "chat-bubble-wrap--me" : ""}`}>
              <div
                className="chat-bubble"
                style={isMe ? { background: "#5bb8c4", color: "#fff" } : undefined}
              >
                {msg.text}
              </div>
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
        <button className="chat-send" style={{ background: "#5bb8c4" }} onClick={sendMessage}>
          <Send size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

export default TechnicianChat;
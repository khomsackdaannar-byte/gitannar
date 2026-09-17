import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { MessageCircle, RefreshCw } from "lucide-react";
import { db, auth } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import { techList } from "../../Types/Technician";
import { useTechnicianPhotos } from "../../hooks/useTechnicianPhotos";
import { useLanguage } from "../../context/LanguageContext";
import BottomNav from "../../component/BottomNav/BottomNav";
import "./Bookings.css";

interface ChatRoom {
  id: string;
  techPhone: string;
  lastMessage?: string;
  lastSenderId?: string;
  lastTimestamp?: { seconds: number };
  customerLastRead?: { seconds: number };
}

function formatChatDate(seconds?: number) {
  if (!seconds) return "";
  const date = new Date(seconds * 1000);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("lo-LA", { hour: "2-digit", minute: "2-digit" });
  }
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function isUnread(chat: ChatRoom, myId: string) {
  if (!chat.lastSenderId || chat.lastSenderId === myId) return false;
  if (!chat.lastTimestamp) return false;
  if (!chat.customerLastRead) return true;
  return chat.lastTimestamp.seconds > chat.customerLastRead.seconds;
}

function Bookings() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { customerPhone } = useAuth();
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const photoMap = useTechnicianPhotos();
  const myId = customerPhone ?? auth.currentUser?.uid ?? null;

  useEffect(() => {
    if (!myId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "chats"),
      where("customerPhone", "==", myId),
      orderBy("lastTimestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatRoom));
      setChats(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [myId]);

  return (
    <div className="chatlist-page">
      <header className="chatlist-appbar">
        <h1>{t.bookings.title}</h1>
        <button className="chatlist-refresh" aria-label="Reload">
          <RefreshCw size={18} />
        </button>
      </header>

      {loading && (
        <div className="chatlist-empty">
          <p>{t.bookings.loading}</p>
        </div>
      )}

      {!loading && chats.length === 0 && (
        <div className="chatlist-empty">
          <div className="chatlist-empty__icon">
            <MessageCircle size={36} />
          </div>
          <p>{t.bookings.empty}</p>
          <span>{t.bookings.emptyDesc}</span>
        </div>
      )}

      {!loading && chats.length > 0 && (
        <div className="chat-list">
          {chats.map((chat) => {
            const tech = techList.find((tc) => tc.phone === chat.techPhone);
            const image = tech ? photoMap[tech.phone] || tech.image : undefined;
            const unread = myId ? isUnread(chat, myId) : false;
            return (
              <div
                key={chat.id}
                className="chat-list-item"
                onClick={() => navigate(`/chat/${encodeURIComponent(chat.techPhone)}`)}
              >
                <div className="chat-list-avatar" style={{ position: "relative" }}>
                  {image ? (
                    <img src={image} alt={tech?.name} />
                  ) : (
                    <MessageCircle size={24} color="#3d8983" />
                  )}
                  {unread && (
                    <span
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#e0433d",
                        border: "2px solid #fff",
                      }}
                    />
                  )}
                </div>
                <div className="chat-list-info">
                  <div className="chat-list-top">
                    <p className="chat-list-name" style={{ fontWeight: unread ? 700 : undefined }}>
                      {tech?.name || chat.techPhone}
                    </p>
                    <span className="chat-list-date">{formatChatDate(chat.lastTimestamp?.seconds)}</span>
                  </div>
                  {tech?.type && (
                    <div className="chat-list-meta">
                      <span className="chat-list-tag">{tech.type}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p
                      className="chat-list-last"
                      style={{ fontWeight: unread ? 600 : undefined, color: unread ? "#1c1c1c" : undefined }}
                    >
                      {chat.lastMessage || t.bookings.startConvo}
                    </p>
                    {unread && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#fff",
                          background: "#3d8983",
                          borderRadius: 10,
                          padding: "2px 8px",
                          whiteSpace: "nowrap",
                          marginLeft: 8,
                        }}
                      >
                        {t.bookings.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default Bookings;
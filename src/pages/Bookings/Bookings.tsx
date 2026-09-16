import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { MessageCircle, RefreshCw } from "lucide-react";
import { db, auth } from "../../firebase/Firebase";
import { techList } from "../../Types/Technician";
import { useTechnicianPhotos } from "../../hooks/useTechnicianPhotos";
import { useLanguage } from "../../context/LanguageContext";
import BottomNav from "../../component/BottomNav/BottomNav";
import "./Bookings.css";

interface ChatRoom {
  id: string; // = techPhone
  techPhone: string;
  lastMessage?: string;
  lastTimestamp?: { seconds: number };
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

function Bookings() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const photoMap = useTechnicianPhotos();
  const myUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!myUid) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "chats"),
      where("customerUid", "==", myUid),
      orderBy("lastTimestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatRoom));
      setChats(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [myUid]);

  return (
    <div className="chatlist-page">
      <header className="chatlist-appbar">
        <h1>{t.bookings.title}</h1>
        <button className="chatlist-refresh" aria-label="ໂຫລດຄືນໃໝ່">
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
            const tech = techList.find((t) => t.phone === chat.techPhone);
            const image = tech ? photoMap[tech.phone] || tech.image : undefined;
            return (
              <div
                key={chat.id}
                className="chat-list-item"
                onClick={() => navigate(`/chat/${encodeURIComponent(chat.techPhone)}`)}
              >
                <div className="chat-list-avatar">
                  {image ? (
                    <img src={image} alt={tech?.name} />
                  ) : (
                    <MessageCircle size={24} color="#3d8983" />
                  )}
                </div>
                <div className="chat-list-info">
                  <div className="chat-list-top">
                    <p className="chat-list-name">{tech?.name || chat.techPhone}</p>
                    <span className="chat-list-date">{formatChatDate(chat.lastTimestamp?.seconds)}</span>
                  </div>
                  {tech?.type && (
                    <div className="chat-list-meta">
                      <span className="chat-list-tag">{tech.type}</span>
                    </div>
                  )}
                  <p className="chat-list-last">{chat.lastMessage || t.bookings.startConvo}</p>
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
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { MessageCircle, Bookmark } from "lucide-react";
import { db, auth } from "../../firebase/Firebase";
import { techList } from "../../Types/Technician";
import { useTechnicianPhotos } from "../../hooks/useTechnicianPhotos";
import BottomNav from "../../component/BottomNav/BottomNav";
import "./Bookings.css";

interface ChatRoom {
  id: string; // = techPhone
  techPhone: string;
  lastMessage?: string;
  lastTimestamp?: { seconds: number };
}

function Bookings() {
  const navigate = useNavigate();
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
    <div className="placeholder-page">
      <header className="placeholder-appbar">
        <h1>ການສົນທະນາ</h1>
      </header>

      {loading && (
        <div className="placeholder-empty">
          <p>ກຳລັງໂຫລດ...</p>
        </div>
      )}

      {!loading && chats.length === 0 && (
        <div className="placeholder-empty">
          <Bookmark size={48} color="#3d8983" />
          <p>ຍັງບໍ່ມີການແຊັດ</p>
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
                    <MessageCircle size={28} color="#3d8983" />
                  )}
                </div>
                <div className="chat-list-info">
                  <p className="chat-list-name">{tech?.name || chat.techPhone}</p>
                  <p className="chat-list-last">{chat.lastMessage || "ເລີ່ມການສົນທະນາ..."}</p>
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
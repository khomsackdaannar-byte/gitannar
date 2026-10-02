import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { MessageCircle, RefreshCw, CheckCircle2, Star, Clock } from "lucide-react";
import { db, auth } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import { techList } from "../../Types/Technician";
import { useTechnicianPhotos } from "../../hooks/useTechnicianPhotos";
import { useLanguage } from "../../context/LanguageContext";
import BottomNav from "../../component/BottomNav/BottomNav";
import ReviewModal from "../../component/ReviewModal/ReviewModal";
import "./Bookings.css";

type BookingStatus = "in_progress" | "pending_confirm" | "completed";

interface Booking {
  id: string;
  techPhone: string;
  techName?: string;
  customerId: string;
  status: BookingStatus;
  createdAt?: { seconds: number };
}

interface ChatRoom {
  id: string;
  techPhone: string;
  lastMessage?: string;
  lastTimestamp?: { seconds: number };
}

interface TechLite {
  phone: string;
  name: string;
  type?: string;
  image?: string;
}

function formatBookingDate(seconds?: number) {
  if (!seconds) return "";
  const date = new Date(seconds * 1000);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("lo-LA", { hour: "2-digit", minute: "2-digit" });
  }
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function statusMeta(status: BookingStatus) {
  switch (status) {
    case "in_progress":
      return { label: "ກຳລັງດຳເນີນການ", color: "#8a8f8d", bg: "#f0f2f1" };
    case "pending_confirm":
      return { label: "ລໍການຢືນຢັນ", color: "#8a6d1f", bg: "#fff2d6" };
    case "completed":
      return { label: "ວຽກສຳເລັດແລ້ວ", color: "#2f7d6f", bg: "#eaf6f1" };
  }
}

function Bookings() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { customerPhone } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);
  const photoMap = useTechnicianPhotos();
  const myId = customerPhone ?? auth.currentUser?.uid ?? null;

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

  // ---- ຊ່າງທີ່ລົງທະບຽນເອງໃນ Firestore (ບໍ່ຢູ່ໃນ techList ຄົງທີ່) ----
  const [registeredTechs, setRegisteredTechs] = useState<Record<string, TechLite>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "technicians"),
      (snapshot) => {
        const map: Record<string, TechLite> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const phone = data.phone ?? d.id;
          map[phone] = {
            phone,
            name: data.name ?? "",
            type: data.type ?? "",
            image: data.image || undefined,
          };
        });
        setRegisteredTechs(map);
      },
      (err) => console.error("technicians snapshot error:", err.message)
    );
    return () => unsubscribe();
  }, []);

  const findTech = useMemo(() => {
    return (phone: string): TechLite | undefined => {
      const fromList = techList.find((t) => t.phone === phone);
      if (fromList) return fromList;
      return registeredTechs[phone];
    };
  }, [registeredTechs]);

  // ---- ໂຊທຸກ "ຫ້ອງແຊັດ" ທີ່ລູກຄ້ານີ້ມີຢູ່ (ບໍ່ວ່າຈະໄດ້ຈອງຢ່າງເປັນທາງການແລ້ວຫຼືຍັງ) ----
  // ນີ້ຄືແຫຼ່ງຂໍ້ມູນຫຼັກຂອງລິດ: ຖ້າລູກຄ້າແຊັດຫາຊ່າງແລ້ວ (ແມ່ນແຕ່ຍັງບໍ່ໄດ້ຈອງ)
  // ຈະຕ້ອງຂຶ້ນຢູ່ໃນນີ້ສະເໝີ
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
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            techPhone: data.techPhone ?? "",
            lastMessage: data.lastMessage ?? "",
            lastTimestamp: data.lastTimestamp ?? undefined,
          } as ChatRoom;
        });
        setChatRooms(docs);
        setLoading(false);
      },
      (err) => {
        console.error("chats snapshot error:", err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [myId]);

  // ---- ການຈອງທັງໝົດຂອງລູກຄ້ານີ້ (ໃຊ້ສະແດງປ້າຍສະຖານະ + ປຸ່ມຢືນຢັນ/ໃຫ້ຄະແນນ ---- 
  // ບໍ່ແມ່ນແຫຼ່ງຂໍ້ມູນຫຼັກຂອງລິດອີກຕໍ່ໄປ)
  useEffect(() => {
    if (!myId) return;
    const q = query(
      collection(db, "bookings"),
      where("customerId", "==", myId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
        setBookings(docs);
      },
      (err) => {
        console.error("bookings snapshot error:", err.message);
      }
    );
    return () => unsubscribe();
  }, [myId]);

  // ---- ຫາ booking ຫຼ້າສຸດຂອງແຕ່ລະ techPhone (ສຳລັບສະແດງປ້າຍສະຖານະ) ----
  const latestBookingByTech = useMemo(() => {
    const map: Record<string, Booking> = {};
    for (const b of bookings) {
      // bookings ຖືກຮຽງລຳດັບ createdAt ຫຼ້າສຸດ -> ເກົ່າສຸດຢູ່ແລ້ວ, ເອົາແຕ່ອັນທຳອິດທີ່ພົບ
      if (!map[b.techPhone]) map[b.techPhone] = b;
    }
    return map;
  }, [bookings]);

  // ---- ຣີວິວທີ່ລູກຄ້ານີ້ເຄີຍໃຫ້ (key = bookingId) — ໃຊ້ເຊັກວ່າ booking ໃດຣີວິວແລ້ວແທ້ໆ ----
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!myId) return;
    const q = query(collection(db, "reviews"), where("customerId", "==", myId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setReviewedIds(new Set(snapshot.docs.map((d) => d.id)));
      },
      (err) => console.error("reviews snapshot error:", err.message)
    );
    return () => unsubscribe();
  }, [myId]);

  const goToChat = (techPhone: string) => {
    navigate(`/chat/${encodeURIComponent(techPhone)}`);
  };

  // ---- ຢືນຢັນວ່າວຽກສຳເລັດ ໄດ້ເລີຍຈາກໜ້ານີ້ (ບໍ່ຕ້ອງເປີດແຊັດ) ----
  const confirmBooking = async (bookingId: string) => {
    if (!window.confirm("ຢືນຢັນວ່າວຽກນີ້ສຳເລັດແລ້ວແທ້ບໍ່?")) return;
    setConfirmingId(bookingId);
    try {
      await setDoc(
        doc(db, "bookings", bookingId),
        {
          status: "completed",
          confirmedAt: serverTimestamp(),
          confirmedBy: myId,
        },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
      alert("ຢືນຢັນບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
    } finally {
      setConfirmingId(null);
    }
  };

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

      {!loading && chatRooms.length === 0 && (
        <div className="chatlist-empty">
          <div className="chatlist-empty__icon">
            <MessageCircle size={36} />
          </div>
          <p>{t.bookings.empty}</p>
          <span>{t.bookings.emptyDesc}</span>
        </div>
      )}

      {!loading && chatRooms.length > 0 && (
        <div className="chat-list">
          {chatRooms.map((room) => {
            const tech = findTech(room.techPhone);
            const image = tech ? photoMap[tech.phone] || tech.image : undefined;
            const booking = latestBookingByTech[room.techPhone];
            const reviewed = booking ? reviewedIds.has(booking.id) : false;
            const meta = booking ? statusMeta(booking.status) : null;

            return (
              <div
                key={room.id}
                className="chat-list-item"
                onClick={() => goToChat(room.techPhone)}
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
                    <p className="chat-list-name">{tech?.name || room.techPhone}</p>
                    <span className="chat-list-date">{formatBookingDate(room.lastTimestamp?.seconds)}</span>
                  </div>

                  {tech?.type && (
                    <div className="chat-list-meta">
                      <span className="chat-list-tag">{tech.type}</span>
                    </div>
                  )}

                  {room.lastMessage && (
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 12.5,
                        color: "#6b7674",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {room.lastMessage}
                    </p>
                  )}

                  {booking && meta && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color: meta.color,
                          background: meta.bg,
                          borderRadius: 10,
                          padding: "3px 9px",
                          whiteSpace: "nowrap",
                          width: "fit-content",
                        }}
                      >
                        {booking.status === "completed" ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <Clock size={12} />
                        )}
                        {meta.label}
                      </span>

                      {booking.status === "pending_confirm" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmBooking(booking.id);
                          }}
                          disabled={confirmingId === booking.id}
                          style={{
                            border: "none",
                            background: "#e0a52e",
                            color: "#fff",
                            borderRadius: 16,
                            padding: "6px 12px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            width: "fit-content",
                            opacity: confirmingId === booking.id ? 0.7 : 1,
                          }}
                        >
                          {confirmingId === booking.id ? "..." : "✓ ຢືນຢັນ"}
                        </button>
                      )}

                      {booking.status === "completed" && !reviewed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewTarget(booking);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            border: "none",
                            background: "#3d8983",
                            color: "#fff",
                            borderRadius: 16,
                            padding: "6px 12px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            width: "fit-content",
                          }}
                        >
                          <Star size={11} /> ໃຫ້ຄະແນນ
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewTarget && myId && (
        <ReviewModal
          bookingId={reviewTarget.id}
          techPhone={reviewTarget.techPhone}
          techName={findTech(reviewTarget.techPhone)?.name || reviewTarget.techName || reviewTarget.techPhone}
          customerId={myId}
          customerName={customerDisplayName}
          onClose={() => setReviewTarget(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}

export default Bookings;
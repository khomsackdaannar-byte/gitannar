import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Clock, Star, CheckCircle2 } from "lucide-react";
import { db, auth } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import { techList } from "../../Types/Technician";
import { useTechnicianPhotos } from "../../hooks/useTechnicianPhotos";
import { useLanguage } from "../../context/LanguageContext";
import BottomNav from "../../component/BottomNav/BottomNav";
import ReviewModal from "../../component/ReviewModal/ReviewModal";
import "./History.css";

interface CompletedChat {
  id: string;
  techPhone: string;
  lastMessage?: string;
  completedAt?: { seconds: number };
}

interface TechLite {
  phone: string;
  name: string;
  type?: string;
  image?: string;
}

interface ReviewLite {
  rating: number;
  comment: string;
}

function formatDate(seconds?: number) {
  if (!seconds) return "";
  const d = new Date(seconds * 1000);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function History() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { customerPhone } = useAuth();
  const photoMap = useTechnicianPhotos();
  const myId = customerPhone ?? auth.currentUser?.uid ?? null;

  const [items, setItems] = useState<CompletedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [registeredTechs, setRegisteredTechs] = useState<Record<string, TechLite>>({});
  const [myReviews, setMyReviews] = useState<Record<string, ReviewLite>>({});
  const [reviewTarget, setReviewTarget] = useState<TechLite | null>(null);

  // ---- ຊ່າງທີ່ລົງທະບຽນເອງໃນ Firestore (ບໍ່ຢູ່ໃນ techList ຄົງທີ່) ----
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "technicians"), (snapshot) => {
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
    });
    return () => unsubscribe();
  }, []);

  const findTech = useMemo(() => {
    return (phone: string): TechLite | undefined => {
      const fromList = techList.find((t) => t.phone === phone);
      if (fromList) return fromList;
      return registeredTechs[phone];
    };
  }, [registeredTechs]);

  // ---- ລາຍການ "ວຽກທີ່ສຳເລັດແລ້ວ" ຂອງລູກຄ້ານີ້ ----
  useEffect(() => {
    if (!myId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "chats"),
      where("customerPhone", "==", myId),
      where("jobStatus", "==", "completed"),
      orderBy("completedAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CompletedChat)));
        setLoading(false);
      },
      (err) => {
        console.error("history query error:", err.message);
        setLoadError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [myId]);

  // ---- ຮີວິວທັງໝົດທີ່ລູກຄ້ານີ້ເຄີຍໃຫ້ (ໃຊ້ສະແດງດາວໃນລາຍການ) ----
  useEffect(() => {
    if (!myId) return;
    const q = query(collection(db, "reviews"), where("customerId", "==", myId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map: Record<string, ReviewLite> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.technicianPhone) {
          map[data.technicianPhone] = { rating: data.rating ?? 0, comment: data.comment ?? "" };
        }
      });
      setMyReviews(map);
    });
    return () => unsubscribe();
  }, [myId]);

  return (
    <div className="history-page">
      <header className="history-appbar">
        <h1>{t.history.title}</h1>
      </header>

      {loading && (
        <div className="history-empty">
          <p>{t.bookings.loading}</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="history-empty">
          <p style={{ color: "#e05353" }}>ບໍ່ສາມາດໂຫລດປະຫວັດໄດ້: {loadError}</p>
          <span>ອາດຕ້ອງສ້າງ Firestore index ກ່ອນ (ເບິ່ງລິ້ງໃນ console F12)</span>
        </div>
      )}

      {!loading && !loadError && items.length === 0 && (
        <div className="history-empty">
          <div className="history-empty__icon">
            <Clock size={36} />
          </div>
          <p>{t.history.empty}</p>
          <span>{t.history.emptyDesc}</span>
        </div>
      )}

      {!loading && !loadError && items.length > 0 && (
        <div className="history-list">
          {items.map((item) => {
            const tech = findTech(item.techPhone);
            const image = tech ? photoMap[tech.phone] || tech.image : undefined;
            const review = myReviews[item.techPhone];
            return (
              <div key={item.id} className="history-item">
                <div
                  className="history-item__icon"
                  style={{ overflow: "hidden", padding: 0, cursor: "pointer" }}
                  onClick={() => navigate(`/chat/${encodeURIComponent(item.techPhone)}`)}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={tech?.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                    />
                  ) : (
                    <Clock size={20} />
                  )}
                </div>
                <div
                  className="history-item__info"
                  onClick={() => navigate(`/chat/${encodeURIComponent(item.techPhone)}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="history-item__top">
                    <p className="history-item__name">{tech?.name || item.techPhone}</p>
                    <span className="history-item__status history-item__status--done">
                      <CheckCircle2 size={12} style={{ marginRight: 3, verticalAlign: "-1px" }} />
                      {t.history.done}
                    </span>
                  </div>
                  <p className="history-item__type">{tech?.type || ""}</p>
                  <p className="history-item__date">{formatDate(item.completedAt?.seconds)}</p>
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {review ? (
                    <button
                      onClick={() => tech && setReviewTarget(tech)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                      title="ແກ້ໄຂຮີວິວ"
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={13} fill={i < review.rating ? "#f5a623" : "none"} color="#f5a623" />
                      ))}
                    </button>
                  ) : (
                    <button
                      onClick={() => tech && setReviewTarget(tech)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        border: "none",
                        background: "#3d8983",
                        color: "#fff",
                        borderRadius: 16,
                        padding: "5px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Star size={12} /> ໃຫ້ຄະແນນ
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewTarget && myId && (
        <ReviewModal
          techPhone={reviewTarget.phone}
          techName={reviewTarget.name}
          customerId={myId}
          customerName={auth.currentUser?.displayName || "ລູກຄ້າ"}
          onClose={() => setReviewTarget(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}

export default History;
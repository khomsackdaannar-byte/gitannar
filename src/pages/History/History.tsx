import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, doc, onSnapshot, orderBy, query, setDoc, serverTimestamp, where } from "firebase/firestore";
import { Clock, Star, CheckCircle2, Clock3 } from "lucide-react";
import { db, auth } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import { techList } from "../../Types/Technician";
import { useTechnicianPhotos } from "../../hooks/useTechnicianPhotos";
import { useLanguage } from "../../context/LanguageContext";
import BottomNav from "../../component/BottomNav/BottomNav";
import ReviewModal from "../../component/ReviewModal/ReviewModal";
import "./History.css";

interface Booking {
  id: string;
  techPhone: string;
  status: "in_progress" | "pending_confirm" | "completed";
  createdAt?: { seconds: number };
  confirmedAt?: { seconds: number };
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

function statusLabel(status: Booking["status"]) {
  if (status === "completed") return "ສຳເລັດ";
  if (status === "pending_confirm") return "ລໍຖ້າຢືນຢັນ";
  return "ກຳລັງດຳເນີນການ";
}

function History() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { customerPhone } = useAuth();
  const photoMap = useTechnicianPhotos();
  const myId = customerPhone ?? auth.currentUser?.uid ?? null;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [registeredTechs, setRegisteredTechs] = useState<Record<string, TechLite>>({});
  const [myReviews, setMyReviews] = useState<Record<string, ReviewLite>>({});
  const [reviewTarget, setReviewTarget] = useState<{ booking: Booking; tech: TechLite } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

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

  // ---- ທຸກການຈອງຂອງລູກຄ້ານີ້ (ທຸກສະຖານະ) ----
  useEffect(() => {
    if (!myId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "bookings"),
      where("customerId", "==", myId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setBookings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
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

  // ---- ຮີວິວທັງໝົດທີ່ລູກຄ້ານີ້ເຄີຍໃຫ້ (key = bookingId) ----
  useEffect(() => {
    if (!myId) return;
    const q = query(collection(db, "reviews"), where("customerId", "==", myId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map: Record<string, ReviewLite> = {};
      snapshot.docs.forEach((d) => {
        map[d.id] = { rating: d.data().rating ?? 0, comment: d.data().comment ?? "" };
      });
      setMyReviews(map);
    });
    return () => unsubscribe();
  }, [myId]);

  const confirmFromHistory = async (bookingId: string) => {
    setConfirming(bookingId);
    try {
      await setDoc(
        doc(db, "bookings", bookingId),
        { status: "completed", confirmedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
      alert("ຢືນຢັນບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
    } finally {
      setConfirming(null);
    }
  };

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

      {!loading && !loadError && bookings.length === 0 && (
        <div className="history-empty">
          <div className="history-empty__icon">
            <Clock size={36} />
          </div>
          <p>{t.history.empty}</p>
          <span>{t.history.emptyDesc}</span>
        </div>
      )}

      {!loading && !loadError && bookings.length > 0 && (
        <div className="history-list">
          {bookings.map((b) => {
            const tech = findTech(b.techPhone);
            const image = tech ? photoMap[tech.phone] || tech.image : undefined;
            const review = myReviews[b.id];

            return (
              <div key={b.id} className="history-item" style={{ flexWrap: "wrap" }}>
                <div
                  className="history-item__icon"
                  style={{ overflow: "hidden", padding: 0, cursor: "pointer" }}
                  onClick={() => navigate(`/chat/${encodeURIComponent(b.techPhone)}`)}
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
                  onClick={() => navigate(`/chat/${encodeURIComponent(b.techPhone)}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="history-item__top">
                    <p className="history-item__name">{tech?.name || b.techPhone}</p>
                    <span
                      className={`history-item__status ${
                        b.status === "completed"
                          ? "history-item__status--done"
                          : "history-item__status--cancelled"
                      }`}
                    >
                      {b.status === "completed" ? (
                        <CheckCircle2 size={12} style={{ marginRight: 3, verticalAlign: "-1px" }} />
                      ) : (
                        <Clock3 size={12} style={{ marginRight: 3, verticalAlign: "-1px" }} />
                      )}
                      {statusLabel(b.status)}
                    </span>
                  </div>
                  <p className="history-item__type">{tech?.type || ""}</p>
                  <p className="history-item__date">
                    {formatDate((b.confirmedAt ?? b.createdAt)?.seconds)}
                  </p>
                </div>

                {b.status === "completed" && (
                  <div
                    style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {review ? (
                      <button
                        onClick={() => tech && setReviewTarget({ booking: b, tech })}
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
                        onClick={() => tech && setReviewTarget({ booking: b, tech })}
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
                )}

                {b.status === "pending_confirm" && (
                  <div
                    style={{ width: "100%", marginTop: 4 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => confirmFromHistory(b.id)}
                      disabled={confirming === b.id}
                      style={{
                        width: "100%",
                        border: "none",
                        background: "#c47f3a",
                        color: "#fff",
                        borderRadius: 10,
                        padding: "8px 0",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {confirming === b.id ? "ກຳລັງຢືນຢັນ..." : "ຊ່າງແຈ້ງວຽກແລ້ວ · ກົດຢືນຢັນ"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewTarget && myId && (
        <ReviewModal
          bookingId={reviewTarget.booking.id}
          techPhone={reviewTarget.tech.phone}
          techName={reviewTarget.tech.name}
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
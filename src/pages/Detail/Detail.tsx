import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { getTechIcon } from "../../Utils/Icon";
import {
  ArrowLeft,
  MapPin,
  Home as HomeIcon,
  Cake,
  User,
  Star,
  Phone,
  CalendarCheck,
  Banknote,
  X,
  ChevronRight,
} from "lucide-react";
import { db } from "../../firebase/Firebase";
import { techList, type Technician } from "../../Types/Technician";
import { useTechnicianPhotos } from "../../hooks/useTechnicianPhotos";
import "./Detail.css";

// ລາຄາບໍລິການແບບຄົງທີ່ ໃຊ້ຄືກັນທຸກຊ່າງ
const PRICE_RANGE_TEXT = "100,000 - 300,000 ກີບ";

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <div
      className="info-row"
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <Icon size={20} color="var(--color-primary)" />
      <div style={{ flex: 1 }}>
        <p className="info-row__label">{label}</p>
        <p className="info-row__value">{value}</p>
      </div>
      {onClick && <ChevronRight size={18} color="#b7c2bf" />}
    </div>
  );
}

// ---------------- Reviews list modal (ລູກຄ້າກົດເບິ່ງວ່າໃຜລີວິວແນວໃດແດ່) ----------------
function ReviewsListModal({
  techName,
  reviews,
  loading,
  onClose,
}: {
  techName: string;
  reviews: Review[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 420,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #eee",
            flexShrink: 0,
          }}
        >
          <strong style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 16 }}>
            <Star size={17} color="#f5a623" fill="#f5a623" /> ລີວິວຈາກລູກຄ້າ · {techName}
          </strong>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {loading && <p style={{ color: "#888", fontSize: 14 }}>ກຳລັງໂຫລດ...</p>}
          {!loading && reviews.length === 0 && (
            <p style={{ color: "#888", fontSize: 14 }}>ຍັງບໍ່ມີລີວິວ</p>
          )}
          {reviews.map((r) => (
            <div
              key={r.id}
              style={{
                background: "#f5f8f7",
                borderRadius: 12,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <User size={14} color="#3d8983" /> {r.customerName}
                </span>
                <span style={{ display: "flex", gap: 1 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} fill={i < r.rating ? "#f5a623" : "none"} color="#f5a623" />
                  ))}
                </span>
              </div>
              {r.comment && (
                <p style={{ margin: 0, fontSize: 13.5, color: "#44504d", whiteSpace: "pre-wrap" }}>
                  {r.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Detail() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const [showCallDialog, setShowCallDialog] = useState(false);
  const photoMap = useTechnicianPhotos();

  const decodedPhone = decodeURIComponent(phone ?? "");
  const staticTech = techList.find((t) => t.phone === decodedPhone);

  const [tech, setTech] = useState<Technician | null>(staticTech ?? null);
  const [techLoading, setTechLoading] = useState(!staticTech);

  // ---- Reviews state ----
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

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

  // ---- ຟັງ (real-time) ລາຍການລີວິວທັງໝົດຂອງຊ່າງຄົນນີ້ ----
  useEffect(() => {
    if (!tech) return;
    const q = query(
      collection(db, "reviews"),
      where("technicianPhone", "==", tech.phone),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          customerName: d.data().customerName ?? "ລູກຄ້າ",
          rating: d.data().rating ?? 0,
          comment: d.data().comment ?? "",
        }));
        setReviews(docs);
        setReviewsLoading(false);
      },
      (err) => {
        console.error("reviews query error:", err.message);
        setReviewsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [tech]);

  const Icon = tech ? getTechIcon(tech.icon) : MapPin;
  const image = tech ? photoMap[tech.phone] || tech.image : undefined;

  // ---- ກົດ "ຈອງບໍລິການ": ພາໄປຫ້ອງແຊັດ, ຈຶ່ງກອກແບບຟອມການຈອງຢູ່ໃນນັ້ນ ----
  const goBookInChat = () => {
    if (!tech) return;
    navigate(`/chat/${encodeURIComponent(tech.phone)}?book=1`);
  };

  if (techLoading) {
    return (
      <div className="detail-page">
        <p>ກຳລັງໂຫລດ...</p>
      </div>
    );
  }

  if (!tech) {
    return (
      <div className="detail-page">
        <p>ບໍ່ພົບຂໍ້ມູນຊ່າງ</p>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <header className="detail-appbar">
        <button className="detail-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>ຂໍ້ມູນຊ່າງ</h1>
      </header>

      <div className="detail-content">
        <div className="detail-avatar">
          {image ? (
            <img src={image} alt={tech.name} />
          ) : (
            <Icon size={60} color="var(--color-primary)" />
          )}
        </div>

        <h2 className="detail-name">{tech.name}</h2>
        <p className="detail-type">{tech.type}</p>

        <div className="detail-card">
          <InfoRow icon={MapPin} label="ພື້ນທີ່ບໍລິການ" value={tech.area} />
          <hr />
          <InfoRow icon={Banknote} label="ລາຄາບໍລິການ" value={PRICE_RANGE_TEXT} />
          <hr />
          {tech.address && (
            <>
              <InfoRow icon={HomeIcon} label="ບ້ານ, ເມືອງ, ແຂວງ" value={tech.address} />
              <hr />
            </>
          )}
          {tech.hometown && (
            <>
              <InfoRow icon={HomeIcon} label="ບ້ານເກີດ" value={tech.hometown} />
              <hr />
            </>
          )}
          {tech.birthDate && (
            <>
              <InfoRow icon={Cake} label="ວັນເດືອນປີເກີດ" value={tech.birthDate} />
              <hr />
            </>
          )}
          {tech.age && (
            <>
              <InfoRow icon={User} label="ອາຍຸ" value={`${tech.age} ປີ`} />
              <hr />
            </>
          )}
          <InfoRow
            icon={Star}
            label="ຄະແນນລີວິວ (ກົດເພື່ອເບິ່ງລາຍລະອຽດ)"
            value={`${tech.rating} / 5.0 · ${reviews.length} ລີວິວ`}
            onClick={() => setShowReviewsModal(true)}
          />
          <hr />
          <InfoRow icon={Phone} label="ເບີໂທ" value={tech.phone} />
        </div>

        <div className="detail-actions">
          <button className="btn btn--primary" onClick={goBookInChat}>
            <CalendarCheck size={18} />
            ຈອງບໍລິການ
          </button>
          <button className="btn btn--outline" onClick={() => setShowCallDialog(true)}>
            <Phone size={18} />
            ໂທຫາຊ່າງ
          </button>
        </div>
      </div>

      {showCallDialog && (
        <div className="dialog-overlay" onClick={() => setShowCallDialog(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h3>ໂທຫາຊ່າງ</h3>
            <p>
              ກຳລັງໂທຫາ {tech.phone}
            </p>
            <button className="btn btn--primary" onClick={() => setShowCallDialog(false)}>
              OK
            </button>
          </div>
        </div>
      )}

      {showReviewsModal && (
        <ReviewsListModal
          techName={tech.name}
          reviews={reviews}
          loading={reviewsLoading}
          onClose={() => setShowReviewsModal(false)}
        />
      )}
    </div>
  );
}

export default Detail;
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
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
  CheckCircle2,
  XCircle,
  Users,
  CalendarDays,
  Clock,
  FileText,
} from "lucide-react";
import { db } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
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

interface BookingLite {
  id: string;
  customerId: string; // = ເບີໂທລູກຄ້າ (ຈາກ Bookings.tsx: customerId = customerPhone ?? uid)
  status: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // ເຊັ່ນ 14:30
  customerName: string; // ຊື່ທີ່ຢູ່ໃນ booking (ຖ້າມີ) ຖ້າບໍ່ມີຈະຊອກຈາກ users
  customerPhone: string;
  address: string;
  mapUrl: string;
  note: string;
}

// ການຈອງທີ່ຍັງບໍ່ສຳເລັດ ຖືວ່າຍັງຕິດຄິວ
const ACTIVE_STATUSES = ["in_progress", "pending_confirm"];

const STATUS_LABEL: Record<string, string> = {
  in_progress: "ກຳລັງດຳເນີນງານ",
  pending_confirm: "ລໍຖ້າຢືນຢັນ",
};

// ດຶງ "ວັນທີ່ລູກຄ້າຈອງ" ຈາກເອກະສານ booking
function pickBookingDate(data: any): string {
  const raw = data.preferredDate ?? data.date ?? data.visitDate ?? data.bookingDate ?? "";
  if (typeof raw === "string" && raw) return raw;
  const s = data.createdAt?.seconds;
  return s ? new Date(s * 1000).toISOString().slice(0, 10) : "";
}

// ເວລານັດ (ລອງຫຼາຍຊື່ field)
function pickBookingTime(data: any): string {
  const raw = data.preferredTime ?? data.time ?? data.visitTime ?? data.bookingTime ?? "";
  return typeof raw === "string" ? raw : "";
}

// ທີ່ຢູ່ (ອາດເປັນຂໍ້ຄວາມ ຫຼື ພິກັດ lat/lng)
function pickBookingAddress(data: any): { address: string; mapUrl: string } {
  const raw =
    data.address ?? data.customerAddress ?? data.location ?? data.place ?? data.venue ?? "";

  if (typeof raw === "string") {
    return { address: raw, mapUrl: "" };
  }
  if (raw && typeof raw === "object") {
    const lat = raw.lat ?? raw.latitude;
    const lng = raw.lng ?? raw.lon ?? raw.longitude;
    const text = raw.address ?? raw.name ?? "";
    if (lat != null && lng != null) {
      return {
        address: text,
        mapUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      };
    }
    return { address: text, mapUrl: "" };
  }

  // ບາງລະບົບເກັບ lat/lng ແຍກເປັນ field ຂອງຕົນເອງ
  const lat = data.lat ?? data.latitude;
  const lng = data.lng ?? data.longitude;
  if (lat != null && lng != null) {
    return { address: "", mapUrl: `https://www.google.com/maps?q=${lat},${lng}` };
  }
  return { address: "", mapUrl: "" };
}

function formatDateLao(iso: string) {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

// ເອົາເລກ 8 ໂຕສຸດທ້າຍ ເພື່ອປຽບທຽບເບີ (ກັນບັນຫາ +856 / 020 / 030)
const last8 = (s?: string | null) => (s ?? "").replace(/\D/g, "").slice(-8);

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

// ---------------- Reviews list modal ----------------
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

// ---------------- Bookings list modal ----------------
function BookingsModal({
  techName,
  bookings,
  customerNames,
  showDetails,
  onClose,
}: {
  techName: string;
  bookings: BookingLite[];
  customerNames: Record<string, string>; // key = ເລກ 8 ໂຕສຸດທ້າຍຂອງເບີ
  showDetails: boolean; // true = ເຫັນຊື່/ເບີ/ທີ່ຢູ່ລູກຄ້າ (ສະເພາະຊ່າງເຈົ້າຂອງ)
  onClose: () => void;
}) {
  const rowStyle = { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14 } as const;

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
            <CalendarDays size={17} color="#3d8983" /> ຄິວຈອງ · {techName}
          </strong>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {!showDetails && (
            <p style={{ margin: 0, fontSize: 12.5, color: "#888" }}>
              ຂໍ້ມູນລູກຄ້າເຫັນສະເພາະຊ່າງເຈົ້າຂອງໂປຣໄຟລ໌ ທ່ານເຫັນວັນ ແລະ ເວລາທີ່ຄິວເຕັມ
            </p>
          )}

          {bookings.length === 0 && (
            <p style={{ color: "#888", fontSize: 14 }}>ບໍ່ມີຄິວຈອງ</p>
          )}

          {bookings.map((b, idx) => {
            const name = b.customerName || customerNames[last8(b.customerPhone)] || "ລູກຄ້າ";
            return (
              <div
                key={b.id}
                style={{
                  background: "#f5f8f7",
                  borderRadius: 12,
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    {showDetails ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <User size={14} color="#3d8983" /> {name}
                      </span>
                    ) : (
                      `ຄິວທີ ${idx + 1}`
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "#e3f1ee",
                      color: "#2f7d6f",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>

                <span style={rowStyle}>
                  <CalendarDays size={15} color="#3d8983" style={{ marginTop: 2, flexShrink: 0 }} />
                  {b.dateStr ? formatDateLao(b.dateStr) : "ບໍ່ລະບຸວັນ"}
                </span>

                {b.timeStr && (
                  <span style={rowStyle}>
                    <Clock size={15} color="#3d8983" style={{ marginTop: 2, flexShrink: 0 }} />
                    {b.timeStr}
                  </span>
                )}

                {showDetails && (
                  <>
                    {b.customerPhone && (
                      <span style={rowStyle}>
                        <Phone size={15} color="#3d8983" style={{ marginTop: 2, flexShrink: 0 }} />
                        <a href={`tel:${b.customerPhone}`} style={{ color: "inherit" }}>
                          {b.customerPhone}
                        </a>
                      </span>
                    )}

                    {(b.address || b.mapUrl) && (
                      <span style={rowStyle}>
                        <MapPin size={15} color="#3d8983" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span>
                          {b.address}
                          {b.mapUrl && (
                            <>
                              {b.address && <br />}
                              <a href={b.mapUrl} target="_blank" rel="noreferrer" style={{ color: "#2f7d6f" }}>
                                ເບິ່ງໃນແຜນທີ່
                              </a>
                            </>
                          )}
                        </span>
                      </span>
                    )}

                    {b.note && (
                      <span style={rowStyle}>
                        <FileText size={15} color="#3d8983" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span style={{ whiteSpace: "pre-wrap" }}>{b.note}</span>
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Detail() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const { customerPhone } = useAuth();
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

  // ---- ຄິວຈອງຂອງຊ່າງຄົນນີ້ ----
  const [bookings, setBookings] = useState<BookingLite[]>([]);
  const [bookingsOk, setBookingsOk] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);

  // ຊື່ລູກຄ້າທີ່ຊອກຈາກ users ຕາມເບີ (key = ເລກ 8 ໂຕສຸດທ້າຍ)
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});

  // ---- ສະຖານະ ວ່າງ/ບໍ່ວ່າງ ທີ່ຊ່າງກົດເອງ ----
  const [available, setAvailable] = useState(true);
  const [toggling, setToggling] = useState(false);

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

  // ---- ຟັງ available ແບບ real-time (ບໍ່ມີ field = ວ່າງ) ----
  useEffect(() => {
    if (!decodedPhone) return;
    const unsubscribe = onSnapshot(
      doc(db, "technicians", decodedPhone),
      (snap) => {
        setAvailable(snap.exists() ? (snap.data().available ?? true) : true);
      },
      (err) => console.error("available snapshot error:", err.message)
    );
    return () => unsubscribe();
  }, [decodedPhone]);

  // ---- ຟັງລີວິວທັງໝົດຂອງຊ່າງຄົນນີ້ ----
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

  // ---- ຟັງການຈອງທັງໝົດຂອງຊ່າງຄົນນີ້ ----
  useEffect(() => {
    if (!tech) return;
    const q = query(collection(db, "bookings"), where("techPhone", "==", tech.phone));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setBookings(
          snap.docs.map((d) => {
            const data = d.data();
            const { address, mapUrl } = pickBookingAddress(data);
            const customerId: string = data.customerId ?? "";
            // customerId ໃນລະບົບນີ້ຄືເບີໂທລູກຄ້າ (ຖ້າເປັນຕົວເລກລ້ວນ)
            const idAsPhone = /^\d{8,}$/.test(customerId) ? customerId : "";
            return {
              id: d.id,
              customerId,
              status: data.status ?? "",
              dateStr: pickBookingDate(data),
              timeStr: pickBookingTime(data),
              customerName: data.customerName ?? data.customerFullName ?? data.userName ?? "",
              customerPhone:
                data.customerPhone ?? data.customerPhoneNumber ?? idAsPhone,
              address,
              mapUrl,
              note: data.note ?? data.description ?? data.problem ?? data.detail ?? data.details ?? "",
            } as BookingLite;
          })
        );
        setBookingsOk(true);
      },
      (err) => {
        console.error("bookings query error:", err.message);
        setBookingsOk(false);
      }
    );
    return () => unsubscribe();
  }, [tech]);

  // ຄິວທີ່ຍັງຄ້າງ ຈັດຕາມວັນທີ ແລ້ວຕາມເວລາ
  const activeBookings = bookings
    .filter((b) => ACTIVE_STATUSES.includes(b.status))
    .sort((a, b) => (a.dateStr + a.timeStr).localeCompare(b.dateStr + b.timeStr));
  const customerCount = new Set(activeBookings.map((b) => b.customerId)).size;
  const sortedDates = activeBookings.map((b) => b.dateStr).filter(Boolean).sort();
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  // ເປັນຊ່າງເຈົ້າຂອງໂປຣໄຟລ໌ນີ້ບໍ (ໃຊ້ customerPhone ເພາະລະບົບນີ້ເປັນ anonymous auth)
  const isOwner =
    !!tech &&
    !!customerPhone &&
    last8(customerPhone) === last8(tech.phone);

  // ໃຜເຫັນລາຍລະອຽດລູກຄ້າ: ປ່ຽນເປັນ true ຖ້າຢາກໃຫ້ທຸກຄົນເຫັນ
  const showDetails = isOwner;

  // ---- ຊອກຊື່ລູກຄ້າຈາກ users ຕາມເບີໂທ (ສະເພາະຊ່າງເຈົ້າຂອງ) ----
  const customerPhonesKey = Array.from(
    new Set(activeBookings.map((b) => b.customerPhone).filter(Boolean))
  )
    .sort()
    .join(",");

  useEffect(() => {
    if (!showDetails || !customerPhonesKey) return;
    const phones = customerPhonesKey.split(",");
    let cancelled = false;

    (async () => {
      const result: Record<string, string> = {};
      // Firestore "in" ຮອງຮັບຈຳກັດ: ແບ່ງເປັນກຸ່ມລະ 10
      for (let i = 0; i < phones.length; i += 10) {
        const chunk = phones.slice(i, i + 10);
        try {
          const snap = await getDocs(query(collection(db, "users"), where("phone", "in", chunk)));
          snap.docs.forEach((d) => {
            const n = d.data().name as string | undefined;
            const p = d.data().phone as string | undefined;
            if (n && n.trim() && p && !result[last8(p)]) result[last8(p)] = n;
          });
        } catch (e) {
          console.error("customer name lookup error:", e);
        }
      }
      if (!cancelled) setCustomerNames(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [showDetails, customerPhonesKey]);

  const Icon = tech ? getTechIcon(tech.icon) : MapPin;
  const image = tech ? photoMap[tech.phone] || tech.image : undefined;

  // ຊ່າງກົດ ວ່າງ <-> ບໍ່ວ່າງ
  const toggleAvailable = async () => {
    if (!tech || toggling) return;
    setToggling(true);
    try {
      await updateDoc(doc(db, "technicians", tech.phone), { available: !available });
    } catch (e) {
      console.error(e);
      alert("ບັນທຶກບໍ່ສຳເລັດ ລອງໃໝ່ອີກຄັ້ງ");
    }
    setToggling(false);
  };

  // ---- ກົດ "ຈອງບໍລິການ": ພາໄປຫ້ອງແຊັດທັນທີ ----
  const goBookInChat = () => {
    if (!tech) return;
    navigate(`/chat/${encodeURIComponent(tech.phone)}`);
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

        {/* ---------------- ສະຖານະ ວ່າງ / ບໍ່ວ່າງ (ຊ່າງກົດເອງ) ---------------- */}
        <div
          style={{
            margin: "4px 0 14px",
            padding: "12px 14px",
            borderRadius: 14,
            background: available ? "#e8f7ef" : "#fdecec",
            border: `1px solid ${available ? "#bfe6cf" : "#f5c6c6"}`,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 700,
              color: available ? "#17a673" : "#d64545",
            }}
          >
            {available ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {available ? "ວ່າງ · ພ້ອມຮັບວຽກ" : "ບໍ່ວ່າງ · ປິດຮັບງານຊົ່ວຄາວ"}
          </span>

          {/* ຄິວຈອງ: ກົດເພື່ອເບິ່ງລາຍລະອຽດ */}
          {bookingsOk && activeBookings.length > 0 && (
            <div
              onClick={() => setShowBookingsModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                  <Users size={16} color="#3d8983" /> ຕິດຈອງແລ້ວ {customerCount} ຄົນ
                </span>
                {firstDate && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                    <CalendarDays size={16} color="#3d8983" />
                    {firstDate === lastDate
                      ? `ວັນທີ ${formatDateLao(firstDate)}`
                      : `ວັນທີ ${formatDateLao(firstDate)} – ${formatDateLao(lastDate)}`}
                  </span>
                )}
                <span style={{ fontSize: 12, color: "#3d8983" }}>ກົດເພື່ອເບິ່ງລາຍລະອຽດ</span>
              </div>
              <ChevronRight size={18} color="#3d8983" />
            </div>
          )}

          {/* ປຸ່ມນີ້ເຫັນສະເພາະຊ່າງເຈົ້າຂອງໂປຣໄຟລ໌ */}
          {isOwner && (
            <button
              className="btn btn--outline"
              onClick={toggleAvailable}
              disabled={toggling}
              style={{ marginTop: 6 }}
            >
              {toggling ? "ກຳລັງບັນທຶກ..." : available ? "ປ່ຽນເປັນ ບໍ່ວ່າງ" : "ປ່ຽນເປັນ ວ່າງ"}
            </button>
          )}
        </div>

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
            <p>ກຳລັງໂທຫາ {tech.phone}</p>
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

      {showBookingsModal && (
        <BookingsModal
          techName={tech.name}
          bookings={activeBookings}
          customerNames={customerNames}
          showDetails={showDetails}
          onClose={() => setShowBookingsModal(false)}
        />
      )}
    </div>
  );
}

export default Detail;
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { ArrowLeft, MapPin, Mail, User, Phone, MessageCircle } from "lucide-react";
import { db } from "../../firebase/Firebase";
import "../Detail/Detail.css";

interface CustomerData {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  photoURL?: string;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="info-row">
      <Icon size={20} color="var(--color-primary)" />
      <div>
        <p className="info-row__label">{label}</p>
        <p className="info-row__value">{value}</p>
      </div>
    </div>
  );
}

function CustomerDetail() {
  const { techPhone, customerUid } = useParams<{ techPhone: string; customerUid: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCallDialog, setShowCallDialog] = useState(false);

  // chatRoomId ຕ້ອງສ້າງແບບດຽວກັນກັບຝັ່ງລູກຄ້າ (Chat.tsx): `${techPhone}_${customerUid}`
  const chatRoomId =
    techPhone && customerUid ? `${techPhone}_${customerUid}` : null;

  useEffect(() => {
    if (!chatRoomId) {
      setLoading(false);
      return;
    }

    // ດຶງຂໍ້ມູນລູກຄ້າຈາກ chat document ໂດຍກົງ (ບໍ່ອີງໃສ່ collection "users"
    // ເພາະລູກຄ້າທີ່ login ຜ່ານ OTP ບໍ່ໄດ້ຖືກບັນທຶກລົງ "users")
    const unsubscribe = onSnapshot(doc(db, "chats", chatRoomId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCustomer({
          name: data.customerName ?? "ລູກຄ້າ",
          phone: data.customerPhone ?? customerUid ?? "",
          email: undefined,
          address: undefined,
          photoURL: undefined,
        });
      } else {
        // ຍັງບໍ່ມີ chat document (ຍັງບໍ່ເຄີຍແຊັດກັນ) — ໃຊ້ customerUid ຈາກ URL ແທນ
        setCustomer(
          customerUid ? { name: "ລູກຄ້າ", phone: customerUid } : null
        );
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [chatRoomId, customerUid]);

  if (loading) {
    return (
      <div className="detail-page">
        <p>ກຳລັງໂຫລດ...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="detail-page">
        <p>ບໍ່ພົບຂໍ້ມູນລູກຄ້າ</p>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <header className="detail-appbar">
        <button className="detail-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>ຂໍ້ມູນລູກຄ້າ</h1>
      </header>

      <div className="detail-content">
        <div className="detail-avatar">
          {customer.photoURL ? (
            <img src={customer.photoURL} alt={customer.name} />
          ) : (
            <User size={60} color="var(--color-primary)" />
          )}
        </div>

        <h2 className="detail-name">{customer.name || "ບໍ່ມີຊື່"}</h2>

        <div className="detail-card">
          <InfoRow icon={Phone} label="ເບີໂທລະສັບ" value={customer.phone || "ບໍ່ມີຂໍ້ມູນ"} />
          <hr />
          <InfoRow icon={Mail} label="ອີເມວ" value={customer.email || "ບໍ່ມີຂໍ້ມູນ"} />
          <hr />
          <InfoRow icon={MapPin} label="ທີ່ຢູ່" value={customer.address || "ບໍ່ມີຂໍ້ມູນ"} />
        </div>

        <div className="detail-actions">
          <button className="btn btn--primary" onClick={() => setShowCallDialog(true)}>
            <Phone size={18} />
            ໂທຫາລູກຄ້າ
          </button>
          <button
            className="btn btn--outline"
            onClick={() => {
              if (!techPhone || !chatRoomId) return;
              navigate(
                `/technician-chat/${encodeURIComponent(techPhone)}/${encodeURIComponent(
                  chatRoomId
                )}`
              );
            }}
          >
            <MessageCircle size={18} />
            ແຊັດຫາລູກຄ້າ
          </button>
        </div>
      </div>

      {showCallDialog && (
        <div className="dialog-overlay" onClick={() => setShowCallDialog(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h3>ໂທຫາລູກຄ້າ</h3>
            <p>ກຳລັງໂທຫາ {customer.phone || "ບໍ່ມີເບີໂທ"}</p>
            <button className="btn btn--primary" onClick={() => setShowCallDialog(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerDetail;
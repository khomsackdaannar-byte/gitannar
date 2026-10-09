import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
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

  // ໝາຍເຫດ: ຄ່າ customerUid ທີ່ໄດ້ຈາກ URL ນີ້ ແມ່ນ room.id ຄົບຖ້ວນທີ່ສົ່ງມາຈາກ
  // TechnicianHome.tsx ຢູ່ແລ້ວ (ຄື "techPhone_customerPhone") ບໍ່ໄດ້ແມ່ນເບີໂທລູກຄ້າດ່ຽວໆ
  // ດັ່ງນັ້ນຫ້າມນຳມາປະກອບຄືນໃໝ່ກັບ techPhone ອີກຄັ້ງ (ຈະເຮັດໃຫ້ id ຊ້ຳກັນ/ຜິດ)
  const chatRoomId = customerUid ? decodeURIComponent(customerUid) : null;

  // ---- ຂັ້ນທີ 1: ດຶງຂໍ້ມູນພື້ນຖານຈາກ chat document (ຊື່, ເບີໂທ) ----
  useEffect(() => {
    if (!chatRoomId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "chats", chatRoomId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCustomer((prev) => ({
          name: data.customerName ?? prev?.name ?? "ລູກຄ້າ",
          phone: data.customerPhone ?? customerUid ?? "",
          email: prev?.email,
          address: prev?.address,
          photoURL: prev?.photoURL,
        }));
      } else {
        // ຍັງບໍ່ມີ chat document (ຍັງບໍ່ເຄີຍແຊັດກັນ) — ໃຊ້ customerUid ຈາກ URL ແທນ
        setCustomer((prev) =>
          customerUid ? { name: prev?.name ?? "ລູກຄ້າ", phone: customerUid } : null
        );
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [chatRoomId, customerUid]);

  // ---- ຂັ້ນທີ 2: ເອົາເບີໂທນັ້ນໄປຄົ້ນຫາຕໍ່ໃນ "users" collection ----
  // ເພື່ອດຶງຮູບໂປຣໄຟລ໌, ອີເມວ, ທີ່ຢູ່ ແທ້ຈິງຂອງລູກຄ້າ (ຖ້າລູກຄ້າເຄີຍຕັ້ງຄ່າໂປຣໄຟລ໌ໄວ້)
  useEffect(() => {
    const phone = customer?.phone;
    if (!phone) return;

    const q = query(collection(db, "users"), where("phone", "==", phone));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) return;
        const data = snapshot.docs[0].data();
        setCustomer((prev) =>
          prev
            ? {
                ...prev,
                name: data.name || prev.name,
                email: data.email || prev.email,
                address: data.address || prev.address,
                photoURL: data.photoURL || prev.photoURL,
              }
            : prev
        );
      },
      (err) => console.error("lookup customer profile by phone error:", err.message)
    );
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.phone]);

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
          <a
            className="btn btn--primary"
            href={customer.phone ? `tel:${customer.phone}` : undefined}
            style={
              !customer.phone
                ? { pointerEvents: "none", opacity: 0.5 }
                : { textDecoration: "none", display: "inline-flex" }
            }
          >
            <Phone size={18} />
            ໂທຫາລູກຄ້າ
          </a>
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
    </div>
  );
}

export default CustomerDetail;
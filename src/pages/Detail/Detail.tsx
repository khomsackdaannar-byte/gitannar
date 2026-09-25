import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
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
} from "lucide-react";
import { db } from "../../firebase/Firebase";
import { techList, type Technician } from "../../Types/Technician";
import { useTechnicianPhotos } from "../../hooks/useTechnicianPhotos";
import "./Detail.css";

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

function Detail() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const [showCallDialog, setShowCallDialog] = useState(false);
  const photoMap = useTechnicianPhotos();

  const decodedPhone = decodeURIComponent(phone ?? "");
  const staticTech = techList.find((t) => t.phone === decodedPhone);

  const [tech, setTech] = useState<Technician | null>(staticTech ?? null);
  const [techLoading, setTechLoading] = useState(!staticTech);

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
          <InfoRow icon={Star} label="ຄະແນນລີວິວ" value={`${tech.rating} / 5.0`} />
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
    </div>
  );
}

export default Detail;
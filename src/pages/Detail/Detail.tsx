import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTechIcon } from "../../Utils/Icons";
import {
  ArrowLeft,
  MapPin,
  Home as HomeIcon,
  Cake,
  User,
  Star,
  Phone,
  MessageCircle,
} from "lucide-react";
import { techList } from "../../Types/Technician";
import { useTechnicianPhotos } from "../../hooks/useTechnicianPhotos";
import "./Detail.css";

// ທຽບເທົ່າ _infoRow() ໃນ Flutter
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

// ທຽບເທົ່າ DetailPage ໃນ Flutter
function Detail() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const [showCallDialog, setShowCallDialog] = useState(false);
  const photoMap = useTechnicianPhotos();

  const tech = techList.find((t) => t.phone === decodeURIComponent(phone ?? ""));
  const Icon = tech ? getTechIcon(tech.icon) : MapPin;
  const image = tech ? photoMap[tech.phone] || tech.image : undefined;

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
          <InfoRow icon={HomeIcon} label="ບ້ານເກີດ" value={tech.hometown} />
          <hr />
          <InfoRow icon={Cake} label="ວັນເດືອນປີເກີດ" value={tech.birthDate} />
          <hr />
          <InfoRow icon={User} label="ອາຍຸ" value={`${tech.age} ປີ`} />
          <hr />
          <InfoRow icon={Star} label="ຄະແນນລີວິວ" value={`${tech.rating} / 5.0`} />
          <hr />
          <InfoRow icon={Phone} label="ເບີໂທ" value={tech.phone} />
        </div>

        <div className="detail-actions">
          <button className="btn btn--primary" onClick={() => setShowCallDialog(true)}>
            <Phone size={18} />
            ໂທຫາຊ່າງ
          </button>
          <button
            className="btn btn--outline"
            onClick={() => navigate(`/chat/${encodeURIComponent(tech.phone)}`)}
          >
            <MessageCircle size={18} />
            ແຊັດຫາຊ່າງ
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
import { useNavigate } from "react-router-dom";
import { Star, Phone } from "lucide-react";
import { getTechIcon } from "../../Utils/Icon";
import type { Technician } from "../../Types/Technician";
import { useBusyTechnicians } from "../../hooks/useBusyTechnicians";
import "./TechnicianCard.css";

// ທຽບເທົ່າ card ດຽວ ໃນ list ຊ່າງ
function TechnicianCard({ tech, isBusy }: { tech: Technician; isBusy: boolean }) {
  const navigate = useNavigate();
  const Icon = getTechIcon(tech.icon);

  return (
    <div
      className="tech-card"
      onClick={() => navigate(`/detail/${encodeURIComponent(tech.phone)}`)}
    >
      <div className={`tech-card__avatar tech-card__avatar--${tech.category}`}>
        {tech.image ? (
          <img src={tech.image} alt={tech.name} />
        ) : (
          <Icon size={32} color="var(--color-primary)" />
        )}
      </div>

      <div className="tech-card__info">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <h3 className="tech-card__name">{tech.name}</h3>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              whiteSpace: "nowrap",
              background: isBusy ? "#fde8e8" : "#e3f6ec",
              color: isBusy ? "#c0392b" : "#1f8a4c",
            }}
          >
            {isBusy ? "ບໍ່ວ່າງ" : "ວ່າງ"}
          </span>
        </div>
        <p className="tech-card__type">{tech.type}</p>
        <p className="tech-card__area">{tech.area}</p>
      </div>

      <div className="tech-card__meta">
        <div className="tech-card__rating">
          <Star size={14} fill="currentColor" />
          <span>{tech.rating}</span>
        </div>
        <Phone size={18} />
      </div>
    </div>
  );
}

// ທຽບເທົ່າ ListView.builder ໃນ Flutter
export function TechnicianListView({ list }: { list: Technician[] }) {
  const busyPhones = useBusyTechnicians();

  if (list.length === 0) {
    return <p className="tech-list__empty">ບໍ່ພົບຊ່າງທີ່ຄົ້ນຫາ</p>;
  }

  return (
    <div className="tech-list">
      {list.map((tech) => (
        <TechnicianCard
          key={tech.phone}
          tech={tech}
          isBusy={busyPhones.has(tech.phone)}
        />
      ))}
    </div>
  );
}
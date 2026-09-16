import { useNavigate } from "react-router-dom";
import { User, Wrench } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import "./ChooseRole.css";

function ChooseRole() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="role-page">
      <div className="role-header">
        <h1 className="role-title">{t.chooseRole.title}</h1>
        <p className="role-subtitle">{t.chooseRole.subtitle}</p>
      </div>

      <div className="role-options">
        <button className="role-card" onClick={() => navigate("/register")}>
          <div className="role-card__icon">
            <User size={40} color="#fff" />
          </div>
          <h2>{t.chooseRole.customerTitle}</h2>
          <p>{t.chooseRole.customerDesc}</p>
        </button>

        <button
          className="role-card role-card--tech"
          onClick={() => navigate("/register-technician")}
        >
          <div className="role-card__icon role-card__icon--tech">
            <Wrench size={40} color="#fff" />
          </div>
          <h2>{t.chooseRole.techTitle}</h2>
          <p>{t.chooseRole.techDesc}</p>
        </button>
      </div>

      <button className="role-back" onClick={() => navigate(-1)}>
        {t.chooseRole.back}
      </button>
    </div>
  );
}

export default ChooseRole;
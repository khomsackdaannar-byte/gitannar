import { useNavigate } from "react-router-dom";
import { User, Wrench } from "lucide-react";
import "./ChooseRole.css";

function ChooseRole() {
  const navigate = useNavigate();

  return (
    <div className="role-page">
      <div className="role-header">
        <h1 className="role-title">ທ່ານແມ່ນໃຜ?</h1>
        <p className="role-subtitle">ເລືອກປະເພດບັນຊີເພື່ອລົງທະບຽນ</p>
      </div>

      <div className="role-options">
        <button className="role-card" onClick={() => navigate("/register")}>
          <div className="role-card__icon">
            <User size={40} color="#fff" />
          </div>
          <h2>ລົງທະບຽນເປັນຜູ້ໃຊ້</h2>
          <p>ຄົ້ນຫາ ແລະ ຈ້າງຊ່າງໃກ້ບ້ານທ່ານ</p>
        </button>

        <button
          className="role-card role-card--tech"
          onClick={() => navigate("/register-technician")}
        >
          <div className="role-card__icon role-card__icon--tech">
            <Wrench size={40} color="#fff" />
          </div>
          <h2>ລົງທະບຽນເປັນຊ່າງ</h2>
          <p>ຮັບວຽກ ແລະ ຫາລູກຄ້າໃໝ່</p>
        </button>
      </div>

      <button className="role-back" onClick={() => navigate(-1)}>
        ← ກັບຄືນ
      </button>
    </div>
  );
}

export default ChooseRole;
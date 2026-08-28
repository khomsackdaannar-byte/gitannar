import { useNavigate } from "react-router-dom";
import "./NotFound.css";

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="notfound-page">
      <h1>404</h1>
      <p>ບໍ່ພົບໜ້າທີ່ທ່ານກຳລັງຄົ້ນຫາ</p>
      <button className="btn btn--primary" onClick={() => navigate("/")}>
        ກັບໄປໜ້າຫຼັກ
      </button>
    </div>
  );
}

export default NotFound;
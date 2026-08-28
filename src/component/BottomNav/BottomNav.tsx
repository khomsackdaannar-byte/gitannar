import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bookmark, Clock, User } from "lucide-react";
import "./BottomNav.css";

const tabs = [
  { path: "/home", label: "ໜ້າຫຼັກ", icon: Home },
  { path: "/bookings", label: "ການຈອງ", icon: Bookmark },
  { path: "/history", label: "ປະຫວັດ", icon: Clock },
  { path: "/profile", label: "ໂປຣໄຟລ໌", icon: User },
];

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            className={`bottom-nav__item ${active ? "bottom-nav__item--active" : ""}`}
            onClick={() => navigate(path)}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
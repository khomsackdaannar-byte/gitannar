import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bookmark, Clock, User } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useUnreadChatCount } from "../../hooks/useUnreadChatCount";
import "./BottomNav.css";

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const unreadCount = useUnreadChatCount();

  const tabs = [
    { path: "/home", label: t.nav.home, icon: Home },
    { path: "/bookings", label: t.nav.bookings, icon: Bookmark },
    { path: "/history", label: t.nav.history, icon: Clock },
    { path: "/profile", label: t.nav.profile, icon: User },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = location.pathname === path;
        const showDot = path === "/bookings" && unreadCount > 0;
        return (
          <button
            key={path}
            className={`bottom-nav__item ${active ? "bottom-nav__item--active" : ""}`}
            onClick={() => navigate(path)}
          >
            <span style={{ position: "relative", display: "inline-flex" }}>
              <Icon size={22} />
              {showDot && (
                <span
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -4,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#e0433d",
                  }}
                />
              )}
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
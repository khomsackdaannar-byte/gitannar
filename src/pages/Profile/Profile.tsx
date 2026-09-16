import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User, Phone, Mail, MapPin, LogOut, Camera, X, ChevronRight, ShieldCheck, Clock, Languages } from "lucide-react";
import { db } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import { useLanguage } from "../../context/LanguageContext";
import LanguageSwitcher from "../../component/LanguageSwitcher/LanguageSwitcher";
import BottomNav from "../../component/BottomNav/BottomNav";
import "./Profile.css";

interface UserData {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  photoURL?: string;
}

const MAX_DIMENSION = 300;
const JPEG_QUALITY = 0.7;

function resizeImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_DIMENSION) {
          height = (height * MAX_DIMENSION) / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = (width * MAX_DIMENSION) / height;
          height = MAX_DIMENSION;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("ບໍ່ສາມາດຫຍໍ້ຮູບໄດ້"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Profile() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editSection, setEditSection] = useState<"none" | "personal" | "address">("none");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data() as UserData;
          setData(d);
          setName(d.name || "");
          setEmail(d.email || "");
          setAddress(d.address || "");
          setPhone(d.phone || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handlePickPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarClick = () => {
    if (data?.photoURL) {
      setShowPhotoPreview(true);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      alert("ກະລຸນາເລືອກໄຟລ໌ຮູບພາບເທົ່ານັ້ນ");
      return;
    }

    setUploading(true);
    try {
      const base64 = await resizeImageToBase64(file);
      await setDoc(doc(db, "users", user.uid), { photoURL: base64 }, { merge: true });
      setData((prev) => ({ ...prev, photoURL: base64 }));
    } catch (err) {
      console.error(err);
      alert("ອັບໂຫລດຮູບບໍ່ສຳເລັດ");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload =
        editSection === "personal"
          ? { name: name.trim(), phone: phone.trim(), email: email.trim() }
          : { address: address.trim() };

      await setDoc(doc(db, "users", user.uid), payload, { merge: true });
      setData((prev) => ({ ...prev, ...payload }));
      setEditSection("none");
    } catch (err) {
      console.error(err);
      alert("ບັນທຶກບໍ່ສຳເລັດ");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(data?.name || "");
    setEmail(data?.email || "");
    setAddress(data?.address || "");
    setPhone(data?.phone || "");
    setEditSection("none");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const shortUid = user?.uid ? user.uid.slice(0, 8).toUpperCase() : "-";

  return (
    <div className="profile-page">
      <header className="profile-appbar">
        <h1>{t.profile.appTitle}</h1>
      </header>

      {loading ? (
        <div className="profile-loading">
          <p>{t.profile.loading}</p>
        </div>
      ) : editSection === "none" ? (
        <div className="profile-content">
          {/* ===== Hero card ===== */}
          <div className="profile-hero">
            <div className="profile-hero__deco" />
            <div className="profile-hero__row">
              <div className="profile-hero__avatar-wrap">
                <div
                  className="profile-hero__avatar"
                  onClick={handleAvatarClick}
                  style={{ cursor: data?.photoURL ? "pointer" : "default" }}
                >
                  {data?.photoURL ? (
                    <img src={data.photoURL} alt="avatar" />
                  ) : (
                    <User size={30} color="#fff" />
                  )}
                </div>
                <button
                  className="profile-hero__avatar-edit"
                  onClick={handlePickPhoto}
                  disabled={uploading}
                >
                  <Camera size={13} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handlePhotoChange}
                />
              </div>
              <div className="profile-hero__info">
                <p className="profile-hero__name">{data?.name || t.profile.newUser}</p>
                <span className="profile-hero__id">ID: {shortUid}</span>
                <div className="profile-hero__phone">
                  <Phone size={13} />
                  {data?.phone || t.profile.noPhone}
                </div>
              </div>
            </div>
            {uploading && <p className="profile-hero__uploading">ກຳລັງອັບໂຫລດຮູບ...</p>}
          </div>

          {/* ===== ຕັ້ງຄ່າ (ພາສາ) ===== */}
          <p className="profile-section-label">{t.profile.settings}</p>
          <div className="profile-list profile-list--lang">
            <div className="profile-list__row profile-list__row--static profile-list__row--lang">
              <div className="profile-list__icon profile-list__icon--purple">
                <Languages size={18} />
              </div>
              <div className="profile-list__text">
                <p className="profile-list__title">{t.profile.language}</p>
                <p className="profile-list__desc">{t.profile.languageDesc}</p>
              </div>
              <LanguageSwitcher />
            </div>
          </div>

          {/* ===== ບັນຊີຜູ້ໃຊ້ ===== */}
          <p className="profile-section-label">{t.profile.account}</p>
          <div className="profile-list">
            <button className="profile-list__row" onClick={() => setEditSection("personal")}>
              <div className="profile-list__icon">
                <User size={18} />
              </div>
              <div className="profile-list__text">
                <p className="profile-list__title">{t.profile.personalInfo}</p>
                <p className="profile-list__desc">{t.profile.personalInfoDesc}</p>
              </div>
              <ChevronRight size={18} color="#b7c2bf" />
            </button>

            <div className="profile-list__divider" />

            <button className="profile-list__row" onClick={() => setEditSection("address")}>
              <div className="profile-list__icon profile-list__icon--alt">
                <MapPin size={18} />
              </div>
              <div className="profile-list__text">
                <p className="profile-list__title">{t.profile.address}</p>
                <p className="profile-list__desc">{data?.address || t.profile.addressEmpty}</p>
              </div>
              <ChevronRight size={18} color="#b7c2bf" />
            </button>

            <div className="profile-list__divider" />

            <button
              className="profile-list__row"
              onClick={() => alert(t.profile.securitySoon)}
            >
              <div className="profile-list__icon profile-list__icon--gold">
                <ShieldCheck size={18} />
              </div>
              <div className="profile-list__text">
                <p className="profile-list__title">{t.profile.security}</p>
                <p className="profile-list__desc">{t.profile.securityDesc}</p>
              </div>
              <ChevronRight size={18} color="#b7c2bf" />
            </button>
          </div>

          {/* ===== ປະຫວັດ ===== */}
          <p className="profile-section-label">{t.profile.history}</p>
          <div className="profile-list">
            <button className="profile-list__row" onClick={() => navigate("/history")}>
              <div className="profile-list__icon profile-list__icon--purple">
                <Clock size={18} />
              </div>
              <div className="profile-list__text">
                <p className="profile-list__title">{t.profile.historyItem}</p>
                <p className="profile-list__desc">{t.profile.historyItemDesc}</p>
              </div>
              <ChevronRight size={18} color="#b7c2bf" />
            </button>
          </div>

          <button className="profile-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            {t.profile.logout}
          </button>
        </div>
      ) : (
        <div className="profile-content">
          <div className="profile-edit-card">
            <h3 className="profile-edit-title">
              {editSection === "personal" ? t.profile.editPersonalTitle : t.profile.editAddressTitle}
            </h3>

            {editSection === "personal" && (
              <>
                <div className="profile-form-group">
                  <label>{t.profile.name}</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="profile-form-group">
                  <label>{t.profile.phone}</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="020xxxxxxxx"
                  />
                </div>
                <div className="profile-form-group">
                  <label>{t.profile.email}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                  />
                </div>
              </>
            )}

            {editSection === "address" && (
              <div className="profile-form-group">
                <label>{t.profile.address}</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ບ້ານ, ເມືອງ, ແຂວງ"
                />
              </div>
            )}

            <div className="profile-card__edit-actions">
              <button className="profile-card__cancel-btn" onClick={handleCancel} disabled={saving}>
                {t.profile.cancel}
              </button>
              <button className="profile-card__save-btn" onClick={handleSave} disabled={saving}>
                {saving ? t.profile.saving : t.profile.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhotoPreview && data?.photoURL && (
        <div className="photo-preview-overlay" onClick={() => setShowPhotoPreview(false)}>
          <button className="photo-preview-close" onClick={() => setShowPhotoPreview(false)}>
            <X size={24} color="#fff" />
          </button>
          <img
            src={data.photoURL}
            alt="ຮູບໂປຣໄຟລ໌"
            className="photo-preview-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default Profile;
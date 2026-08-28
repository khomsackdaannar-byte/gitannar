import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User, Phone, Mail, MapPin, LogOut, Camera, Pencil, X } from "lucide-react";
import { db } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";
import BottomNav from "../../component/BottomNav/BottomNav";
import "../Bookings/Bookings.css";
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
  const navigate = useNavigate();
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
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
      await setDoc(
        doc(db, "users", user.uid),
        {
          name: name.trim(),
          email: email.trim(),
          address: address.trim(),
          phone: phone.trim(),
        },
        { merge: true }
      );
      setData((prev) => ({
        ...prev,
        name: name.trim(),
        email: email.trim(),
        address: address.trim(),
        phone: phone.trim(),
      }));
      setEditing(false);
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
    setEditing(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="placeholder-page">
      <header className="placeholder-appbar">
        <h1>ຂໍ້ມູນສ່ວນຕົວ</h1>
      </header>

      {loading ? (
        <div className="placeholder-empty">
          <p>ກຳລັງໂຫລດ...</p>
        </div>
      ) : (
        <div className="profile-card">
          <div className="profile-card__avatar-wrap">
            <div
              className="profile-card__avatar"
              onClick={handleAvatarClick}
              style={{ cursor: data?.photoURL ? "pointer" : "default" }}
            >
              {data?.photoURL ? (
                <img src={data.photoURL} alt="avatar" />
              ) : (
                <User size={40} color="#3d8983" />
              )}
            </div>
            <button
              className="profile-card__avatar-edit"
              onClick={handlePickPhoto}
              disabled={uploading}
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />
          </div>
          {uploading && <p className="profile-card__uploading">ກຳລັງອັບໂຫລດຮູບ...</p>}

          {!editing ? (
            <>
              <div className="profile-card__row">
                <User size={18} color="#3d8983" />
                <div>
                  <p className="profile-card__label">ຊື່</p>
                  <p className="profile-card__value">{data?.name || "ບໍ່ມີຂໍ້ມູນ"}</p>
                </div>
              </div>

              <div className="profile-card__row">
                <Phone size={18} color="#3d8983" />
                <div>
                  <p className="profile-card__label">ເບີໂທລະສັບ</p>
                  <p className="profile-card__value">{data?.phone || "ບໍ່ມີຂໍ້ມູນ"}</p>
                </div>
              </div>

              <div className="profile-card__row">
                <Mail size={18} color="#3d8983" />
                <div>
                  <p className="profile-card__label">ອີເມວ</p>
                  <p className="profile-card__value">{data?.email || "ບໍ່ມີຂໍ້ມູນ"}</p>
                </div>
              </div>

              <div className="profile-card__row">
                <MapPin size={18} color="#3d8983" />
                <div>
                  <p className="profile-card__label">ທີ່ຢູ່</p>
                  <p className="profile-card__value">{data?.address || "ບໍ່ມີຂໍ້ມູນ"}</p>
                </div>
              </div>

              <button className="profile-card__edit-btn" onClick={() => setEditing(true)}>
                <Pencil size={16} />
                ແກ້ໄຂຂໍ້ມູນ
              </button>

              <button className="profile-card__logout" onClick={handleLogout}>
                <LogOut size={18} />
                ອອກຈາກລະບົບ
              </button>
            </>
          ) : (
            <>
              <div className="profile-form-group">
                <label>ຊື່</label>
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="profile-form-group">
                <label>ເບີໂທລະສັບ</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="020xxxxxxxx"
                />
              </div>

              <div className="profile-form-group">
                <label>ອີເມວ</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                />
              </div>

              <div className="profile-form-group">
                <label>ທີ່ຢູ່</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ບ້ານ, ເມືອງ, ແຂວງ"
                />
              </div>

              <div className="profile-card__edit-actions">
                <button className="profile-card__cancel-btn" onClick={handleCancel} disabled={saving}>
                  ຍົກເລີກ
                </button>
                <button className="profile-card__save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
                </button>
              </div>
            </>
          )}
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
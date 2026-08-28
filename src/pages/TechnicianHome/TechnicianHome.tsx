import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, onSnapshot, orderBy, query, setDoc, where } from "firebase/firestore";
import { LogOut, User, Camera, X, MessageCircle, UserCircle, MapPin, Star, Phone } from "lucide-react";
import { db } from "../../firebase/Firebase";
import { techList } from "../../Types/Technician";
import { useAuth } from "../../context/Authcontext";
import "./technicianhome.css";

interface ChatRoom {
  id: string;
  lastMessage: string;
  customerName: string;
  customerUid: string;
}

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
}

type TabKey = "chat" | "profile";

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

function TechnicianHome() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("chat");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== ທີ່ຢູ່ (ແກ້ໄຂໄດ້ໂດຍຊ່າງເອງ) =====
  const [address, setAddress] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  // ===== ຣີວິວ =====
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const tech = techList.find((t) => t.phone === decodeURIComponent(phone ?? ""));

  // ໂຫລດ photoURL + address ຈາກ technicians/{phone}
  useEffect(() => {
    if (!tech) return;
    const unsubscribe = onSnapshot(doc(db, "technicians", tech.phone), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPhotoURL(data.photoURL ?? null);
        setAddress(data.address ?? "");
      }
    });
    return () => unsubscribe();
  }, [tech]);

  // ໂຫລດລາຍການແຊັດ
  useEffect(() => {
    if (!tech) return;
    const q = query(
      collection(db, "chats"),
      where("techPhone", "==", tech.phone),
      orderBy("lastTimestamp", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          lastMessage: d.data().lastMessage ?? "",
          customerName: d.data().customerName ?? "ລູກຄ້າ",
          customerUid: d.data().customerUid ?? "",
        }));
        setRooms(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [tech]);

  // ໂຫລດຣີວິວ (collection "reviews", field technicianPhone)
  useEffect(() => {
    if (!tech) return;
    const q = query(
      collection(db, "reviews"),
      where("technicianPhone", "==", tech.phone),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          customerName: d.data().customerName ?? "ລູກຄ້າ",
          rating: d.data().rating ?? 0,
          comment: d.data().comment ?? "",
        }));
        setReviews(docs);
        setReviewsLoading(false);
      },
      (err) => {
        // ຖ້າຍັງບໍ່ມີ index ຫຼືຍັງບໍ່ມີ collection ນີ້ - ບໍ່ໃຫ້ crash, ສະແດງວ່າຍັງບໍ່ມີຣີວິວແທນ
        console.warn("reviews query error:", err.message);
        setReviewsError(err.message);
        setReviewsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [tech]);

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const handlePickPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarClick = () => {
    if (photoURL) {
      setShowPhotoPreview(true);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tech) return;

    if (!file.type.startsWith("image/")) {
      alert("ກະລຸນາເລືອກໄຟລ໌ຮູບພາບເທົ່ານັ້ນ");
      return;
    }

    setUploading(true);
    try {
      const base64 = await resizeImageToBase64(file);
      await setDoc(doc(db, "technicians", tech.phone), { photoURL: base64 }, { merge: true });
      setPhotoURL(base64);
    } catch (err) {
      console.error(err);
      alert("ອັບໂຫລດຮູບບໍ່ສຳເລັດ");
    } finally {
      setUploading(false);
    }
  };

  const startEditAddress = () => {
    setAddressInput(address);
    setEditingAddress(true);
  };

  const saveAddress = async () => {
    if (!tech) return;
    setSavingAddress(true);
    try {
      await setDoc(doc(db, "technicians", tech.phone), { address: addressInput.trim() }, { merge: true });
      setAddress(addressInput.trim());
      setEditingAddress(false);
    } catch (err) {
      console.error(err);
      alert("ບັນທຶກທີ່ຢູ່ບໍ່ສຳເລັດ");
    } finally {
      setSavingAddress(false);
    }
  };

  const logout = async () => {
    await authLogout();
    navigate("/", { replace: true });
  };

  if (!tech) {
    return (
      <div className="tech-home-page">
        <p>ບໍ່ພົບຂໍ້ມູນຊ່າງ</p>
      </div>
    );
  }

  return (
    <div className="tech-home-page">
      <header className="tech-home-appbar">
        <h1>{activeTab === "chat" ? `ລາຍການແຊັດ (${tech.name})` : `ຂໍ້ມູນຊ່າງ`}</h1>
        <button
          className="tech-home-logout"
          title="ອອກຈາກລະບົບ"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <LogOut size={20} color="#fff" />
        </button>
      </header>

      {/* ===== ແທັບ: ແຊັດລູກຄ້າ ===== */}
      {activeTab === "chat" && (
        <div className="tech-home-list">
          {error && <p className="tech-home-status">ຜິດພາດ: {error}</p>}
          {loading && !error && <p className="tech-home-status">ກຳລັງໂຫລດ...</p>}
          {!loading && !error && rooms.length === 0 && (
            <p className="tech-home-status">ຍັງບໍ່ມີລູກຄ້າແຊັດເຂົ້າມາ</p>
          )}
          {rooms.map((room) => (
            <div
              key={room.id}
              className="tech-home-item"
              onClick={() =>
                navigate(
                  `/technician-customer/${encodeURIComponent(tech.phone)}/${encodeURIComponent(room.customerUid)}`
                )
              }
            >
              <div className="tech-home-avatar">
                <User size={20} color="#fff" />
              </div>
              <div className="tech-home-item__text">
                <p className="tech-home-item__name">{room.customerName}</p>
                <p className="tech-home-item__msg">{room.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== ແທັບ: ຂໍ້ມູນຊ່າງ ===== */}
      {activeTab === "profile" && (
        <div className="tech-home-profile-tab">
          <div className="tech-home-profile-upload">
            <div
              className="tech-home-profile-avatar"
              onClick={handleAvatarClick}
              style={{ cursor: photoURL ? "pointer" : "default" }}
            >
              {photoURL ? (
                <img src={photoURL} alt={tech.name} />
              ) : (
                <User size={32} color="#3d8983" />
              )}
            </div>
            <p className="tech-home-item__name" style={{ marginTop: 12 }}>{tech.name}</p>
            {averageRating && (
              <div className="tech-home-rating-badge">
                <Star size={14} fill="#f5a623" color="#f5a623" />
                <span>{averageRating} ({reviews.length} ຣີວິວ)</span>
              </div>
            )}
            <button
              className="tech-home-profile-upload-btn"
              onClick={handlePickPhoto}
              disabled={uploading}
            >
              <Camera size={14} />
              {uploading ? "ກຳລັງອັບໂຫລດ..." : "ອັບໂຫລດຮູບໂປຣໄຟລ໌"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />
          </div>

          {/* ===== ຂໍ້ມູນຕິດຕໍ່ ===== */}
          <div className="tech-home-info-card">
            <div className="tech-home-info-row">
              <Phone size={16} color="#3d8983" />
              <span>{tech.phone}</span>
            </div>
            <div className="tech-home-info-row">
              <MapPin size={16} color="#3d8983" />
              {editingAddress ? (
                <div className="tech-home-address-edit">
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="ປ້ອນທີ່ຢູ່..."
                  />
                  <button onClick={saveAddress} disabled={savingAddress}>
                    {savingAddress ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
                  </button>
                  <button
                    className="tech-home-address-cancel"
                    onClick={() => setEditingAddress(false)}
                  >
                    ຍົກເລີກ
                  </button>
                </div>
              ) : (
                <span onClick={startEditAddress} style={{ cursor: "pointer" }}>
                  {address || "ຍັງບໍ່ໄດ້ໃສ່ທີ່ຢູ່ (ກົດເພື່ອແກ້ໄຂ)"}
                </span>
              )}
            </div>
          </div>

          {/* ===== ຣີວິວ ===== */}
          <div className="tech-home-reviews">
            <h3>ຣີວິວຈາກລູກຄ້າ</h3>
            {reviewsLoading && <p className="tech-home-status">ກຳລັງໂຫລດ...</p>}
            {!reviewsLoading && reviewsError && (
              <p className="tech-home-status">ຍັງບໍ່ມີຣີວິວ</p>
            )}
            {!reviewsLoading && !reviewsError && reviews.length === 0 && (
              <p className="tech-home-status">ຍັງບໍ່ມີຣີວິວ</p>
            )}
            {reviews.map((r) => (
              <div key={r.id} className="tech-home-review-item">
                <div className="tech-home-review-header">
                  <span className="tech-home-review-name">{r.customerName}</span>
                  <span className="tech-home-review-stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        fill={i < r.rating ? "#f5a623" : "none"}
                        color="#f5a623"
                      />
                    ))}
                  </span>
                </div>
                {r.comment && <p className="tech-home-review-comment">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Bottom Tab Bar ===== */}
      <div className="tech-home-tabbar">
        <button
          className={`tech-home-tab ${activeTab === "chat" ? "tech-home-tab--active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          <MessageCircle size={20} />
          <span>ແຊັດລູກຄ້າ</span>
        </button>
        <button
          className={`tech-home-tab ${activeTab === "profile" ? "tech-home-tab--active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <UserCircle size={20} />
          <span>ຂໍ້ມູນຊ່າງ</span>
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="dialog-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h3>ອອກຈາກລະບົບ</h3>
            <p>ທ່ານແນ່ໃຈບໍ່ວ່າຈະອອກຈາກລະບົບ?</p>
            <div className="dialog-actions">
              <button className="dialog-btn" onClick={() => setShowLogoutConfirm(false)}>
                ຍົກເລີກ
              </button>
              <button className="dialog-btn dialog-btn--danger" onClick={logout}>
                ອອກຈາກລະບົບ
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhotoPreview && photoURL && (
        <div className="photo-preview-overlay" onClick={() => setShowPhotoPreview(false)}>
          <button className="photo-preview-close" onClick={() => setShowPhotoPreview(false)}>
            <X size={24} color="#fff" />
          </button>
          <img
            src={photoURL}
            alt="ຮູບໂປຣໄຟລ໌ຊ່າງ"
            className="photo-preview-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default TechnicianHome;
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, getDoc, onSnapshot, orderBy, query, setDoc, where } from "firebase/firestore";
import { LogOut, User, Camera, X, MessageCircle, UserCircle, MapPin, Star, Phone } from "lucide-react";
import { db, auth } from "../../firebase/Firebase";
import { techList, type Technician } from "../../Types/Technician";
import { useAuth } from "../../context/Authcontext";
import { useLanguage } from "../../context/LanguageContext";
import { useNewMessageAlert } from "../../hooks/useNewMessageAlert";
import "./technicianhome.css";

interface ChatRoom {
  id: string;
  lastMessage: string;
  customerName: string;
  lastSenderId?: string;
  lastTimestamp?: { seconds: number };
  techLastRead?: { seconds: number };
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

function isUnread(room: ChatRoom, myId: string) {
  if (!room.lastSenderId || room.lastSenderId === myId) return false;
  if (!room.lastTimestamp) return false;
  if (!room.techLastRead) return true;
  return room.lastTimestamp.seconds > room.techLastRead.seconds;
}

function TechnicianHome() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>("chat");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [address, setAddress] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const decodedPhone = decodeURIComponent(phone ?? "");
  const staticTech = techList.find((t) => t.phone === decodedPhone);

  const [tech, setTech] = useState<Technician | null>(staticTech ?? null);
  const [techLoading, setTechLoading] = useState(!staticTech);

  useEffect(() => {
    if (staticTech) {
      setTech(staticTech);
      setTechLoading(false);
      return;
    }
    if (!decodedPhone) {
      setTech(null);
      setTechLoading(false);
      return;
    }

    let cancelled = false;
    setTechLoading(true);

    const loadTech = async () => {
      try {
        const snap = await getDoc(doc(db, "technicians", decodedPhone));
        if (cancelled) return;

        if (snap.exists()) {
          const data = snap.data();
          setTech({
            name: data.name ?? "",
            type: data.type ?? "",
            category: data.category ?? "electric",
            phone: data.phone ?? decodedPhone,
            area: data.area ?? "",
            hometown: data.hometown ?? "",
            birthDate: data.birthDate ?? "",
            age: data.age ?? "",
            rating: data.rating ?? 0,
            icon: data.icon ?? "electrical_services",
            image: data.image || undefined,
          });
        } else {
          setTech(null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setTech(null);
      } finally {
        if (!cancelled) setTechLoading(false);
      }
    };

    loadTech();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedPhone]);

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
        const docs = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            lastMessage: data.lastMessage ?? "",
            customerName: data.customerName ?? "ລູກຄ້າ",
            lastSenderId: data.lastSenderId ?? undefined,
            lastTimestamp: data.lastTimestamp ?? undefined,
            techLastRead: data.techLastRead ?? undefined,
          } as ChatRoom;
        });
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

  const techMyId = tech ? `tech_${tech.phone}` : "anonymous";
  useNewMessageAlert("techPhone", tech?.phone, techMyId, (room) => room.customerName ?? "");

  const hasUnread = rooms.some((r) => isUnread(r, techMyId));

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

  if (techLoading) {
    return (
      <div className="tech-home-page">
        <p>{t.technicianHome.loading}</p>
      </div>
    );
  }

  if (!tech) {
    return (
      <div className="tech-home-page">
        <p>{t.technicianHome.noTech}</p>
      </div>
    );
  }

  return (
    <div className="tech-home-page">
      <header className="tech-home-appbar">
        <h1>{activeTab === "chat" ? t.technicianHome.chatListTitle(tech.name) : t.technicianHome.profileTitle}</h1>
        <button
          className="tech-home-logout"
          title={t.technicianHome.logoutTitle}
          onClick={() => setShowLogoutConfirm(true)}
        >
          <LogOut size={20} color="#fff" />
        </button>
      </header>

      {activeTab === "chat" && (
        <div className="tech-home-list">
          {error && <p className="tech-home-status">ຜິດພາດ: {error}</p>}
          {loading && !error && <p className="tech-home-status">{t.technicianHome.loading}</p>}
          {!loading && !error && rooms.length === 0 && (
            <p className="tech-home-status">{t.technicianHome.noChats}</p>
          )}
          {rooms.map((room) => {
            const unread = isUnread(room, techMyId);
            return (
              <div
                key={room.id}
                className="tech-home-item"
                onClick={() =>
                  navigate(
                    `/technician-customer/${encodeURIComponent(tech.phone)}/${encodeURIComponent(room.id)}`
                  )
                }
              >
                <div className="tech-home-avatar" style={{ position: "relative" }}>
                  <User size={20} color="#fff" />
                  {unread && (
                    <span
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#e0433d",
                        border: "2px solid #fff",
                      }}
                    />
                  )}
                </div>
                <div className="tech-home-item__text">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p className="tech-home-item__name" style={{ fontWeight: unread ? 700 : undefined }}>
                      {room.customerName}
                    </p>
                    {unread && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#fff",
                          background: "#5bb8c4",
                          borderRadius: 10,
                          padding: "2px 8px",
                          whiteSpace: "nowrap",
                          marginLeft: 8,
                        }}
                      >
                        {t.technicianHome.unread}
                      </span>
                    )}
                  </div>
                  <p
                    className="tech-home-item__msg"
                    style={{ fontWeight: unread ? 600 : undefined, color: unread ? "#1c1c1c" : undefined }}
                  >
                    {room.lastMessage}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                    {t.technicianHome.cancel}
                  </button>
                </div>
              ) : (
                <span onClick={startEditAddress} style={{ cursor: "pointer" }}>
                  {address || "ຍັງບໍ່ໄດ້ໃສ່ທີ່ຢູ່ (ກົດເພື່ອແກ້ໄຂ)"}
                </span>
              )}
            </div>
          </div>

          <div className="tech-home-reviews">
            <h3>ຣີວິວຈາກລູກຄ້າ</h3>
            {reviewsLoading && <p className="tech-home-status">{t.technicianHome.loading}</p>}
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

      <div className="tech-home-tabbar">
        <button
          className={`tech-home-tab ${activeTab === "chat" ? "tech-home-tab--active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          <span style={{ position: "relative", display: "inline-flex" }}>
            <MessageCircle size={20} />
            {hasUnread && (
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
          <span>{t.technicianHome.tabChat}</span>
        </button>
        <button
          className={`tech-home-tab ${activeTab === "profile" ? "tech-home-tab--active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <UserCircle size={20} />
          <span>{t.technicianHome.tabProfile}</span>
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="dialog-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h3>{t.technicianHome.logoutTitle}</h3>
            <p>{t.technicianHome.logoutConfirm}</p>
            <div className="dialog-actions">
              <button className="dialog-btn" onClick={() => setShowLogoutConfirm(false)}>
                {t.technicianHome.cancel}
              </button>
              <button className="dialog-btn dialog-btn--danger" onClick={logout}>
                {t.technicianHome.logout}
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
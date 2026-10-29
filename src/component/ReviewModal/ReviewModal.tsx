import { useEffect, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Camera, Star, X } from "lucide-react";
import { db } from "../../firebase/Firebase";

interface ReviewModalProps {
  bookingId: string;
  techPhone: string;
  techName: string;
  customerId: string;
  customerName: string;
  onClose: () => void;
  onSaved?: () => void;
}

// ---------------- ແນບຮູບໃນຣີວິວ (ເກັບເປັນ base64 ໃນ Firestore, ບໍ່ໃຊ້ Firebase Storage) ----------------
const MAX_IMAGES = 3;
const IMAGE_MAX_DIMENSION = 600;
const IMAGE_JPEG_QUALITY = 0.6;
// ຂະໜາດຕໍ່ 1 ຮູບ ແລະ ຂະໜາດລວມ (Firestore ຈຳກັດ 1 document ບໍ່ໃຫ້ເກີນ 1MB)
const MAX_ONE_IMAGE_LENGTH = 250_000;
const MAX_TOTAL_LENGTH = 800_000;

function resizeFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > IMAGE_MAX_DIMENSION) {
          height = (height * IMAGE_MAX_DIMENSION) / width;
          width = IMAGE_MAX_DIMENSION;
        } else if (height > IMAGE_MAX_DIMENSION) {
          width = (width * IMAGE_MAX_DIMENSION) / height;
          height = IMAGE_MAX_DIMENSION;
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
        resolve(canvas.toDataURL("image/jpeg", IMAGE_JPEG_QUALITY));
      };
      img.onerror = () => reject(new Error("ອ່ານໄຟລ໌ຮູບບໍ່ໄດ້"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("ອ່ານໄຟລ໌ຮູບບໍ່ໄດ້"));
    reader.readAsDataURL(file);
  });
}

/**
 * Popup ໃຫ້ຄະແນນ (1-5 ດາວ) + ຄອມເມັ້ນ + ແນບຮູບ (ສູງສຸດ 3 ຮູບ) ສຳລັບການຈອງ (booking) ໜຶ່ງຄັ້ງ
 * ໃຊ້ doc id = bookingId ດັ່ງນັ້ນແຕ່ລະການຈອງ ຣີວິວແຍກກັນໄດ້
 * (ກົດຮີວິວຊ້ຳໃນ booking ດຽວກັນ = ແກ້ໄຂອັນເກົ່າ, setDoc merge)
 */
function ReviewModal({ bookingId, techPhone, techName, customerId, customerName, onClose, onSaved }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, "reviews", bookingId))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data();
          setRating(d.rating ?? 0);
          setComment(d.comment ?? "");
          setImages((d.images ?? []) as string[]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const handlePickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      alert(`ແນບຮູບໄດ້ສູງສຸດ ${MAX_IMAGES} ຮູບ`);
      return;
    }
    if (files.length > remaining) {
      alert(`ແນບໄດ້ອີກພຽງ ${remaining} ຮູບ ລະບົບຈະເອົາແຕ່ ${remaining} ຮູບທຳອິດ`);
    }

    setProcessing(true);
    try {
      const next = [...images];
      for (const file of files.slice(0, remaining)) {
        if (!file.type.startsWith("image/")) {
          alert("ກະລຸນາເລືອກໄຟລ໌ຮູບພາບເທົ່ານັ້ນ");
          continue;
        }
        const base64 = await resizeFileToBase64(file);
        if (base64.length > MAX_ONE_IMAGE_LENGTH) {
          alert("ຮູບໃຫຍ່ເກີນໄປ ກະລຸນາເລືອກຮູບອື່ນ");
          continue;
        }
        const total = next.reduce((sum, s) => sum + s.length, 0) + base64.length;
        if (total > MAX_TOTAL_LENGTH) {
          alert("ຂະໜາດຮູບລວມໃຫຍ່ເກີນໄປ ກະລຸນາລຶບບາງຮູບອອກ");
          break;
        }
        next.push(base64);
      }
      setImages(next);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "ເພີ່ມຮູບບໍ່ສຳເລັດ");
    } finally {
      setProcessing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (rating === 0) {
      alert("ກະລຸນາເລືອກຄະແນນດາວກ່ອນ");
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        doc(db, "reviews", bookingId),
        {
          bookingId,
          technicianPhone: techPhone,
          customerId,
          customerName: customerName || "ລູກຄ້າ",
          rating,
          comment: comment.trim(),
          images,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert("ບັນທຶກຮີວິວບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 480,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          padding: 20,
          boxSizing: "border-box",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>ໃຫ້ຄະແນນ {techName}</h3>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
            <X size={22} />
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#888" }}>ກຳລັງໂຫລດ...</p>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "16px 0" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2 }}
                >
                  <Star size={34} fill={n <= rating ? "#f5a623" : "none"} color="#f5a623" />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ຂຽນຄຳເຫັນກ່ຽວກັບການບໍລິການ (ບໍ່ບັງຄັບ)..."
              rows={4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 10,
                border: "1px solid #ddd",
                padding: 10,
                fontSize: 14,
                resize: "none",
                fontFamily: "inherit",
              }}
            />

            {/* ---------------- ແນບຮູບ ---------------- */}
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#667", fontWeight: 600 }}>
                ແນບຮູບ (ບໍ່ບັງຄັບ, ສູງສຸດ {MAX_IMAGES} ຮູບ)
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {images.map((src, i) => (
                  <div key={i} style={{ position: "relative", width: 76, height: 76 }}>
                    <img
                      src={src}
                      alt={`ຮູບທີ ${i + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label="ລຶບຮູບ"
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: "none",
                        background: "#e05353",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 13,
                        lineHeight: "22px",
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: 10,
                      border: "1px dashed #b7c2bf",
                      background: "#f7faf9",
                      color: "#3d8983",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      fontSize: 11.5,
                      opacity: processing ? 0.6 : 1,
                    }}
                  >
                    <Camera size={20} />
                    {processing ? "ກຳລັງເພີ່ມ..." : "ເພີ່ມຮູບ"}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handlePickImages}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || processing}
              style={{
                width: "100%",
                marginTop: 14,
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                background: "#3d8983",
                color: "#fff",
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
                opacity: saving || processing ? 0.7 : 1,
              }}
            >
              {saving ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກຮີວິວ"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ReviewModal;
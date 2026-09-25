import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Star, X } from "lucide-react";
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

/**
 * Popup ໃຫ້ຄະແນນ (1-5 ດາວ) + ຄອມເມັ້ນ ສຳລັບການຈອງ (booking) ໜຶ່ງຄັ້ງ
 * ໃຊ້ doc id = bookingId ດັ່ງນັ້ນແຕ່ລະການຈອງ ຣີວິວແຍກກັນໄດ້
 * (ກົດຮີວິວຊ້ຳໃນ booking ດຽວກັນ = ແກ້ໄຂອັນເກົ່າ, setDoc merge)
 */
function ReviewModal({ bookingId, techPhone, techName, customerId, customerName, onClose, onSaved }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, "reviews", bookingId))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data();
          setRating(d.rating ?? 0);
          setComment(d.comment ?? "");
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

            <button
              onClick={handleSave}
              disabled={saving}
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
                opacity: saving ? 0.7 : 1,
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
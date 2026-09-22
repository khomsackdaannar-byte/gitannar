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

type LoadState = "loading" | "ready" | "not_completed" | "not_found";

/**
 * Popup ໃຫ້ຄະແນນ (1-5 ດາວ) + ຄອມເມັ້ນ ຜູກກັບ "booking" ໜຶ່ງລາຍການ
 * (ບໍ່ແມ່ນຜູກກັບຊ່າງໂດຍກົງອີກຕໍ່ໄປ)
 *
 * doc id ໃນ collection "reviews" = bookingId ໂດຍກົງ
 * → ຈອງໃໝ່ (booking ໃໝ່) = ຣີວິວໃໝ່ໄດ້ອີກຄັ້ງ (ບໍ່ທັບຂອງເກົ່າ)
 * → ຖ້າກົດເປີດຄືນ modal ຂອງ booking ດຽວກັນ ຈະແກ້ໄຂຣີວິວອັນເກົ່າຂອງ booking ນັ້ນ (setDoc merge)
 *
 * ກ່ອນໃຫ້ຣີວິວໄດ້ ຈະເຊັກສະຖານະຂອງ booking ກ່ອນວ່າ status === "completed"
 * (ຜ່ານ 2 ຂັ້ນຕອນຢືນຢັນ: ຊ່າງກົດວຽກແລ້ວ → ລູກຄ້າກົດຢືນຢັນ) ຖ້າຍັງບໍ່ຄົບ ຈະບໍ່ໃຫ້ຣີວິວ
 */
function ReviewModal({
  bookingId,
  techPhone,
  techName,
  customerId,
  customerName,
  onClose,
  onSaved,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // 1) ກວດ booking ກ່ອນ — ຕ້ອງ completed (ຜ່ານ 2 ຂັ້ນຕອນຢືນຢັນ) ຈຶ່ງໃຫ້ຣີວິວໄດ້
        const bookingSnap = await getDoc(doc(db, "bookings", bookingId));
        if (cancelled) return;

        if (!bookingSnap.exists()) {
          setLoadState("not_found");
          return;
        }
        const bookingData = bookingSnap.data();
        if (bookingData.status !== "completed") {
          setLoadState("not_completed");
          return;
        }

        // 2) ໂຫລດຣີວິວເກົ່າຂອງ booking ນີ້ (ຖ້າມີ) ເພື່ອໃຫ້ແກ້ໄຂໄດ້
        const reviewSnap = await getDoc(doc(db, "reviews", bookingId));
        if (cancelled) return;

        if (reviewSnap.exists()) {
          const d = reviewSnap.data();
          setRating(d.rating ?? 0);
          setComment(d.comment ?? "");
        }
        setLoadState("ready");
      } catch (err) {
        console.error(err);
        if (!cancelled) setLoadState("not_found");
      }
    };

    load();
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

      // ໝາຍໄວ້ໃນ booking ວ່າຖືກຣີວິວແລ້ວ (ໃຊ້ສະແດງໃນໜ້າປະຫວັດ)
      await setDoc(
        doc(db, "bookings", bookingId),
        {
          reviewId: bookingId,
          reviewedAt: serverTimestamp(),
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

        {loadState === "loading" && <p style={{ color: "#888" }}>ກຳລັງໂຫລດ...</p>}

        {loadState === "not_found" && (
          <p style={{ color: "#c0392b" }}>ບໍ່ພົບຂໍ້ມູນການຈອງນີ້ ກະລຸນາລອງໃໝ່ພາຍຫຼັງ</p>
        )}

        {loadState === "not_completed" && (
          <p style={{ color: "#c0392b" }}>
            ຍັງໃຫ້ຣີວິວບໍ່ໄດ້ — ຕ້ອງລໍຖ້າຢືນຢັນວ່າວຽກສຳເລັດຄົບທັງ 2 ຝ່າຍກ່ອນ
          </p>
        )}

        {loadState === "ready" && (
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
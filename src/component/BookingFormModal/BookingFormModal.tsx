import { useState } from "react";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { X, Camera } from "lucide-react";
import { db, storage } from "../../firebase/Firebase";

interface BookingFormModalProps {
  techPhone: string;
  techName: string;
  customerId: string;
  chatRoomId: string;
  defaultName: string;
  defaultPhone: string;
  onClose: () => void;
  onCreated?: () => void;
}

// ຊົ່ວໂມງແບບ 24 ຊົ່ວໂມງ: 00 - 23 (ບໍ່ໃຊ້ AM/PM)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
// ນາທີ: 00, 05, 10, ... 55 (ທຸກ 5 ນາທີ, ພຽງພໍສຳລັບນັດໝາຍ)
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

// ປ່ຽນ "2026-09-23" + "14:30" -> "23/09/2026 ເວລາ 14:30 ໂມງ"
function formatPreferredDateTime(dateStr: string, timeStr: string) {
  if (!dateStr && !timeStr) return "";
  let datePart = "";
  if (dateStr) {
    const [year, month, day] = dateStr.split("-");
    datePart = `${day}/${month}/${year}`;
  }
  const timePart = timeStr ? `ເວລາ ${timeStr} ໂມງ` : "";
  return [datePart, timePart].filter(Boolean).join(" ");
}

/**
 * ແບບຟອມ "ຈອງບໍລິການ" — ກອກຊື່, ເບີໂທ, ທີ່ຢູ່, ວັນ-ເວລາທີ່ສະດວກ, ຮູບປະກອບບັນຫາ
 * ຫຼັງກົດຢືນຢັນ: ສ້າງ booking doc ໃໝ່ + ສົ່ງຂໍ້ມູນນີ້ເປັນຂໍ້ຄວາມພິເສດເຂົ້າໄປໃນຫ້ອງແຊັດ
 * ໃຫ້ຊ່າງເຫັນທັນທີ
 */
function BookingFormModal({
  techPhone,
  techName,
  customerId,
  chatRoomId,
  defaultName,
  defaultPhone,
  onClose,
  onCreated,
}: BookingFormModalProps) {
  const [name, setName] = useState(defaultName);
  const [phoneNum, setPhoneNum] = useState(defaultPhone);
  const [address, setAddress] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredHour, setPreferredHour] = useState("");
  const [preferredMinute, setPreferredMinute] = useState("");
  const preferredTimeOfDay =
    preferredHour && preferredMinute ? `${preferredHour}:${preferredMinute}` : "";
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("ກະລຸນາເລືອກໄຟລ໌ຮູບພາບເທົ່ານັ້ນ");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phoneNum.trim() || !address.trim()) {
      alert("ກະລຸນາກອກຊື່, ເບີໂທ ແລະ ທີ່ຢູ່ໃຫ້ຄົບ");
      return;
    }

    const preferredTime = formatPreferredDateTime(preferredDate, preferredTimeOfDay);

    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const path = `booking-photos/${chatRoomId}/${Date.now()}_${photoFile.name}`;
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, photoFile);
        photoUrl = await getDownloadURL(fileRef);
      }

      // 1. ສ້າງ booking ໃໝ່
      await addDoc(collection(db, "bookings"), {
        techPhone,
        techName,
        customerId,
        customerName: name.trim(),
        customerContactPhone: phoneNum.trim(),
        address: address.trim(),
        preferredDate,
        preferredTimeOfDay,
        preferredTime: preferredTime.trim(),
        photoUrl: photoUrl ?? null,
        status: "in_progress",
        createdAt: serverTimestamp(),
      });

      // 2. ສົ່ງຂໍ້ມູນການຈອງເປັນຂໍ້ຄວາມພິເສດເຂົ້າໄປໃນຫ້ອງແຊັດ ໃຫ້ຊ່າງເຫັນ
      const chatDocRef = doc(db, "chats", chatRoomId);
      await addDoc(collection(chatDocRef, "messages"), {
        type: "booking",
        bookingName: name.trim(),
        bookingPhone: phoneNum.trim(),
        bookingAddress: address.trim(),
        bookingTime: preferredTime.trim(),
        bookingPhotoUrl: photoUrl ?? null,
        senderId: customerId,
        timestamp: serverTimestamp(),
      });

      await setDoc(
        chatDocRef,
        {
          techPhone,
          customerPhone: customerId,
          customerName: name.trim(),
          lastMessage: "📋 ຂໍ້ມູນການຈອງ",
          lastSenderId: customerId,
          lastTimestamp: serverTimestamp(),
        },
        { merge: true }
      );

      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert("ຈອງບໍລິການບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 10,
    border: "1px solid #ddd",
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 600,
    color: "#4a5a56",
    marginBottom: 4,
    display: "block",
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
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>ຈອງບໍລິການ · {techName}</h3>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>ຊື່ຜູ້ຈອງ *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="ຊື່ ແລະ ນາມສະກຸນ" />
          </div>

          <div>
            <label style={labelStyle}>ເບີໂທຕິດຕໍ່ *</label>
            <input style={inputStyle} value={phoneNum} onChange={(e) => setPhoneNum(e.target.value)} placeholder="020xxxxxxxx" />
          </div>

          <div>
            <label style={labelStyle}>ທີ່ຢູ່ *</label>
            <input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ບ້ານ, ເມືອງ, ແຂວງ" />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>ວັນທີ່ສະດວກໃຫ້ມາ</label>
              <input
                type="date"
                style={inputStyle}
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>ເວລາທີ່ສະດວກ (24 ຊົ່ວໂມງ)</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select
                  style={{ ...inputStyle, flex: 1, cursor: "pointer" }}
                  value={preferredHour}
                  onChange={(e) => setPreferredHour(e.target.value)}
                >
                  <option value="">ຊມ</option>
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span style={{ fontWeight: 700, color: "#4a5a56" }}>:</span>
                <select
                  style={{ ...inputStyle, flex: 1, cursor: "pointer" }}
                  value={preferredMinute}
                  onChange={(e) => setPreferredMinute(e.target.value)}
                >
                  <option value="">ນທ</option>
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>ຮູບພາບປະກອບບັນຫາ (ບໍ່ບັງຄັບ)</label>
            {photoPreview ? (
              <div style={{ position: "relative", width: 90, height: 90 }}>
                <img
                  src={photoPreview}
                  alt="preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }}
                />
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "#e05353",
                    border: "none",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    lineHeight: "20px",
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px dashed #bbb",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#3d8983",
                  cursor: "pointer",
                }}
              >
                <Camera size={16} /> ເລືອກຮູບ
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
              </label>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              marginTop: 6,
              width: "100%",
              padding: "13px 0",
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
            {saving ? "ກຳລັງຈອງ..." : "ຢືນຢັນການຈອງ"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingFormModal;
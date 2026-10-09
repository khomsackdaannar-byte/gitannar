import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { LogOut, ShieldCheck, X, Check, Eye } from "lucide-react";
import { db } from "../../firebase/Firebase";
import { useAuth } from "../../context/Authcontext";

type Status = "pending" | "approved" | "rejected";

interface TechRow {
  phone: string;
  name: string;
  type: string;
  area: string;
  address: string;
  birthDate: string;
  age: string;
  status: Status;
  rejectReason: string;
  createdAt: number;
}

const STATUS_LABEL: Record<Status, string> = {
  pending: "ລໍຖ້າອະນຸມັດ",
  approved: "ອະນຸມັດແລ້ວ",
  rejected: "ປະຕິເສດ",
};

const STATUS_STYLE: Record<Status, { color: string; bg: string }> = {
  pending: { color: "#8a6413", bg: "#fff2d6" },
  approved: { color: "#2f7d6f", bg: "#eaf6f1" },
  rejected: { color: "#b3392f", bg: "#fde8e6" },
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 10,
  border: "1px solid #ddd",
  padding: "11px 12px",
  fontSize: 14,
  fontFamily: "inherit",
};

function Admin() {
  const { user, loading: authLoading, login, logout } = useAuth();

  // null = ກຳລັງກວດ, true/false = ຜົນການກວດວ່າເປັນ admin ບໍ່
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [rows, setRows] = useState<TechRow[]>([]);
  const [filter, setFilter] = useState<Status>("pending");
  const [busyPhone, setBusyPhone] = useState<string | null>(null);

  const [viewing, setViewing] = useState<TechRow | null>(null);
  const [idImage, setIdImage] = useState<string | null>(null);
  const [idLoading, setIdLoading] = useState(false);
  const [idError, setIdError] = useState("");

  // ---- ກວດວ່າ user ທີ່ login ຢູ່ ເປັນ admin ແທ້ບໍ່ (ມີ document ໃນ admins/{uid}) ----
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    setIsAdmin(null);
    getDoc(doc(db, "admins", user.uid))
      .then((snap) => {
        if (!cancelled) setIsAdmin(snap.exists());
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // ---- ຟັງລາຍຊື່ຊ່າງທັງໝົດ (ສະເພາະເມື່ອເປັນ admin) ----
  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = onSnapshot(
      collection(db, "technicians"),
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              phone: (data.phone ?? d.id) as string,
              name: (data.name ?? "") as string,
              type: (data.type ?? "") as string,
              area: (data.area ?? "") as string,
              address: (data.address ?? "") as string,
              birthDate: (data.birthDate ?? "") as string,
              age: (data.age ?? "") as string,
              // ຊ່າງເກົ່າທີ່ບໍ່ມີ field status ຖືວ່າອະນຸມັດແລ້ວ
              status: (data.status ?? "approved") as Status,
              rejectReason: (data.rejectReason ?? "") as string,
              createdAt: (data.createdAt?.seconds ?? 0) as number,
            } as TechRow;
          })
          .filter((r) => r.name.trim() !== "");
        setRows(list);
      },
      (err) => console.error("admin technicians snapshot error:", err.message)
    );
    return () => unsubscribe();
  }, [isAdmin]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { pending: 0, approved: 0, rejected: 0 };
    rows.forEach((r) => {
      c[r.status] += 1;
    });
    return c;
  }, [rows]);

  const visible = useMemo(
    () => rows.filter((r) => r.status === filter).sort((a, b) => b.createdAt - a.createdAt),
    [rows, filter]
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      console.error(err);
      setLoginError("ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ");
    } finally {
      setLoggingIn(false);
    }
  };

  // ---- ເປີດເບິ່ງຮູບບັດ (ດຶງຕອນກົດເບິ່ງເທົ່ານັ້ນ ເພາະໄຟລ໌ໃຫຍ່) ----
  const openIdCard = async (row: TechRow) => {
    setViewing(row);
    setIdImage(null);
    setIdError("");
    setIdLoading(true);
    try {
      const snap = await getDoc(doc(db, "technicianVerifications", row.phone));
      if (snap.exists() && snap.data().idCardImage) {
        setIdImage(snap.data().idCardImage as string);
      } else {
        setIdError("ບໍ່ພົບຮູບບັດຂອງຊ່າງຄົນນີ້ (ອາດສະໝັກກ່ອນມີລະບົບນີ້)");
      }
    } catch (err: any) {
      console.error(err);
      setIdError("ໂຫລດຮູບບໍ່ໄດ້: " + (err?.message || "ບໍ່ຮູ້ສາເຫດ"));
    } finally {
      setIdLoading(false);
    }
  };

  const closeIdCard = () => {
    setViewing(null);
    setIdImage(null);
    setIdError("");
  };

  const setStatus = async (row: TechRow, status: Status, reason = "") => {
    setBusyPhone(row.phone);
    try {
      await setDoc(
        doc(db, "technicians", row.phone),
        { status, rejectReason: reason, reviewedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
      alert("ບັນທຶກບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
    } finally {
      setBusyPhone(null);
    }
  };

  const approve = async (row: TechRow) => {
    if (!window.confirm(`ອະນຸມັດ ${row.name} ເປັນຊ່າງ?`)) return;
    await setStatus(row, "approved");
    if (viewing?.phone === row.phone) closeIdCard();
  };

  const reject = async (row: TechRow) => {
    const reason = window.prompt(`ເຫດຜົນທີ່ປະຕິເສດ ${row.name} (ບໍ່ບັງຄັບ)`);
    if (reason === null) return; // ກົດຍົກເລີກ
    await setStatus(row, "rejected", reason.trim());
    if (viewing?.phone === row.phone) closeIdCard();
  };

  // ======================= UI =======================

  if (authLoading || isAdmin === null) {
    return <div style={{ padding: 24 }}>ກຳລັງກວດສອບ...</div>;
  }

  if (!isAdmin) {
    const signedInNotAdmin = !!user && !user.isAnonymous;
    return (
      <div style={{ padding: 24, minHeight: "100vh", background: "#f4f7f6" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px", fontSize: 18 }}>
            <ShieldCheck size={20} color="#3d8983" /> ເຂົ້າສູ່ລະບົບຜູ້ດູແລ
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#777" }}>
            ສຳລັບຜູ້ດູແລລະບົບເທົ່ານັ້ນ
          </p>

          {signedInNotAdmin && (
            <p style={{ color: "#b3392f", fontSize: 13, marginBottom: 12 }}>
              ບັນຊີ {user?.email} ບໍ່ມີສິດຜູ້ດູແລລະບົບ
            </p>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email"
              placeholder="ອີເມວ"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
            <input
              type="password"
              placeholder="ລະຫັດຜ່ານ"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
            {loginError && <p style={{ color: "#b3392f", fontSize: 13, margin: 0 }}>{loginError}</p>}
            <button
              type="submit"
              disabled={loggingIn}
              style={{
                border: "none",
                background: "#3d8983",
                color: "#fff",
                borderRadius: 10,
                padding: "12px 0",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                opacity: loggingIn ? 0.7 : 1,
              }}
            >
              {loggingIn ? "ກຳລັງເຂົ້າສູ່ລະບົບ..." : "ເຂົ້າສູ່ລະບົບ"}
            </button>
          </form>

          {signedInNotAdmin && (
            <button
              onClick={() => logout()}
              style={{
                marginTop: 12,
                border: "none",
                background: "transparent",
                color: "#3d8983",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ອອກຈາກບັນຊີນີ້
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f6", paddingBottom: 40 }}>
      <header
        style={{
          background: "#3d8983",
          color: "#fff",
          padding: "16px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 17, display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={20} /> ຈັດການຊ່າງ (Admin)
        </h1>
        <button
          onClick={() => logout()}
          title="ອອກຈາກລະບົບ"
          style={{ border: "none", background: "rgba(255,255,255,0.2)", borderRadius: 10, padding: 8, cursor: "pointer" }}
        >
          <LogOut size={18} color="#fff" />
        </button>
      </header>

      <div style={{ display: "flex", gap: 8, padding: 12 }}>
        {(["pending", "approved", "rejected"] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              flex: 1,
              border: filter === s ? "none" : "1px solid #d5dedb",
              background: filter === s ? "#3d8983" : "#fff",
              color: filter === s ? "#fff" : "#44504d",
              borderRadius: 10,
              padding: "9px 4px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {STATUS_LABEL[s]} ({counts[s]})
          </button>
        ))}
      </div>

      <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.length === 0 && (
          <p style={{ textAlign: "center", color: "#888", fontSize: 14, marginTop: 24 }}>
            ບໍ່ມີລາຍການໃນໝວດນີ້
          </p>
        )}

        {visible.map((r) => {
          const st = STATUS_STYLE[r.status];
          const busy = busyPhone === r.phone;
          return (
            <div
              key={r.phone}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: 14,
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 15 }}>{r.name}</strong>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: st.color,
                    background: st.bg,
                    borderRadius: 10,
                    padding: "3px 9px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#44504d" }}>
                {r.type} · {r.area}
              </div>
              <div style={{ fontSize: 13, color: "#44504d" }}>☎ {r.phone}</div>
              {r.address && <div style={{ fontSize: 13, color: "#44504d" }}>📍 {r.address}</div>}
              <div style={{ fontSize: 12.5, color: "#777" }}>
                {r.birthDate && `ເກີດ ${r.birthDate}`} {r.age && `· ອາຍຸ ${r.age} ປີ`}
              </div>
              {r.status === "rejected" && r.rejectReason && (
                <div style={{ fontSize: 12.5, color: "#b3392f" }}>ເຫດຜົນ: {r.rejectReason}</div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                <button
                  onClick={() => openIdCard(r)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    border: "1px solid #3d8983",
                    background: "#fff",
                    color: "#3d8983",
                    borderRadius: 18,
                    padding: "7px 13px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Eye size={14} /> ເບິ່ງຮູບບັດ
                </button>
                {r.status !== "approved" && (
                  <button
                    onClick={() => approve(r)}
                    disabled={busy}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      border: "none",
                      background: "#3d8983",
                      color: "#fff",
                      borderRadius: 18,
                      padding: "7px 13px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <Check size={14} /> ອະນຸມັດ
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    onClick={() => reject(r)}
                    disabled={busy}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      border: "none",
                      background: "#d9534f",
                      color: "#fff",
                      borderRadius: 18,
                      padding: "7px 13px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <X size={14} /> {r.status === "approved" ? "ຖອນສິດ" : "ປະຕິເສດ"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------- ໜ້າຕ່າງເບິ່ງຮູບບັດ ---------------- */}
      {viewing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={closeIdCard}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 440,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: "1px solid #eee",
              }}
            >
              <strong style={{ fontSize: 15 }}>ບັດຂອງ {viewing.name}</strong>
              <button onClick={closeIdCard} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ padding: 12, overflow: "auto", flex: 1 }}>
              {idLoading && <p style={{ color: "#888" }}>ກຳລັງໂຫລດຮູບ...</p>}
              {idError && <p style={{ color: "#b3392f", fontSize: 14 }}>{idError}</p>}
              {idImage && (
                <img
                  src={idImage}
                  alt="ຮູບບັດ"
                  style={{ width: "100%", borderRadius: 10, display: "block" }}
                />
              )}
            </div>

            {viewing.status !== "approved" && (
              <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #eee" }}>
                <button
                  onClick={() => reject(viewing)}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "#d9534f",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "11px 0",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ປະຕິເສດ
                </button>
                <button
                  onClick={() => approve(viewing)}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "#3d8983",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "11px 0",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ອະນຸມັດ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
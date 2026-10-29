import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/Firebase";

/**
 * ສະຖານະ "ວ່າງ/ບໍ່ວ່າງ" ຂອງຊ່າງທຸກຄົນ  →  { [ເບີໂທ]: true | false }
 *
 * - ຊ່າງທີ່ບໍ່ມີ field `available` ຖືວ່າ "ວ່າງ" (ຄ່າເລີ່ມຕົ້ນ)
 * - ຊ່າງປິດປຸ່ມຮັບງານ → available = false → "ບໍ່ວ່າງ"
 *
 * ໝາຍເຫດ: ເອີ້ນ hook ນີ້ "ຄັ້ງດຽວ" ໃນໜ້າລາຍການ ແລ້ວສົ່ງຄ່າລົງໄປໃຫ້ແຕ່ລະ card
 * (ຢ່າເອີ້ນໃນທຸກ card ເພາະຈະເປີດ listener ຫຼາຍເກີນໄປ)
 */
export function useTechnicianAvailability(): Record<string, boolean> {
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "technicians"),
      (snapshot) => {
        const next: Record<string, boolean> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          next[(data.phone ?? d.id) as string] = data.available !== false;
        });
        setAvailability(next);
      },
      (err) => console.error("availability snapshot error:", err.message)
    );
    return () => unsubscribe();
  }, []);

  return availability;
}
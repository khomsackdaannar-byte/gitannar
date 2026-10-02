import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/Firebase";

/**
 * ຟັງ (real-time) ວ່າຊ່າງຄົນໃດ "ບໍ່ວ່າງ" ຢູ່ - ຄືມີ booking ຄ້າງຢູ່
 * ທີ່ status ເປັນ in_progress ຫຼື pending_confirm (ຍັງບໍ່ສຳເລັດ)
 *
 * ຖ້າ techPhone ຢູ່ໃນ Set ນີ້ = ບໍ່ວ່າງ
 * ຖ້າບໍ່ຢູ່ = ວ່າງ
 */
export function useBusyTechnicians() {
  const [busyPhones, setBusyPhones] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = query(
      collection(db, "bookings"),
      where("status", "in", ["in_progress", "pending_confirm"])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const phones = new Set<string>();
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (data.techPhone) phones.add(data.techPhone as string);
        });
        setBusyPhones(phones);
      },
      (err) => {
        console.error("useBusyTechnicians error:", err.message);
      }
    );

    return () => unsubscribe();
  }, []);

  return busyPhones;
}
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/Firebase"; // ປັບ path ນີ້ໃຫ້ກົງກັບໂປຣເຈັກຂອງທ່ານ
import { useAuth } from "../context/Authcontext"; // ປັບ path/ຊື່ໄຟລ໌ໃຫ້ກົງກັບຂອງທ່ານ

interface ChatRoomLite {
  id: string;
  lastSenderId?: string;
  customerPhone?: string;
}

/**
 * ນັບຈຳນວນຫ້ອງແຊັດ (ຂອງລູກຄ້າທີ່ login ຢູ່) ທີ່ຂໍ້ຄວາມລ່າສຸດ
 * ຖືກສົ່ງມາຈາກ "ຊ່າງ" (ຄື customer ຍັງບໍ່ໄດ້ຕອບ/ອ່ານ)
 * ໃຊ້ສະແດງຈຸດແດງ (badge) ເທິງ BottomNav
 *
 * ໝາຍເຫດ: ຖືວ່າ "unread" = ຫ້ອງທີ່ lastSenderId != customerPhone ຂອງຕົນເອງ
 * (ຄື ຄົນອື່ນ (ຊ່າງ) ເປັນຄົນສົ່ງລ່າສຸດ) — ຖ້າ lastSenderId ໃນ project ນີ້
 * ເກັບເປັນຮູບແບບອື່ນ (ເຊັ່ນ "customer"/"technician" ຫຼື uid) ໃຫ້ປັບເງື່ອນໄຂດ້ານລຸ່ມ
 */
export function useUnreadChatCount(): number {
  const { customerPhone } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!customerPhone || customerPhone === "anonymous") {
      setCount(0);
      return;
    }

    const q = query(
      collection(db, "chats"),
      where("customerPhone", "==", customerPhone)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unread = 0;
      snapshot.docs.forEach((d) => {
        const room = { id: d.id, ...d.data() } as ChatRoomLite;
        const lastFromOther =
          !!room.lastSenderId && room.lastSenderId !== customerPhone;
        if (lastFromOther) unread += 1;
      });
      setCount(unread);
    });

    return () => unsubscribe();
  }, [customerPhone]);

  return count;
}
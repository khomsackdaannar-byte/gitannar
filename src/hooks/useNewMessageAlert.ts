import { useEffect, useRef } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase/Firebase"; // ປັບ path ນີ້ໃຫ້ກົງກັບໂປຣເຈັກຂອງທ່ານ

interface ChatRoomLite {
  id: string;
  lastMessage?: string;
  lastSenderId?: string;
  lastTimestamp?: { seconds: number };
  customerName?: string;
  techPhone?: string;
  customerPhone?: string;
}

/**
 * ຟັງລາຍການ "chats" ທັງໝົດຂອງຜູ້ໃຊ້ນີ້ (ອີງໃສ່ field ທີ່ລະບຸ)
 * ແລະຍິງແຈ້ງເຕືອນ (ສຽງ + browser notification) ເມື່ອມີຂໍ້ຄວາມໃໝ່ຈາກອີກຝ່າຍ
 * ໃຊ້ໄດ້ຈາກ "ໜ້າສ່ວນກາງ" (ບໍ່ຕ້ອງເປີດໜ້າແຊັດຢູ່)
 *
 * @param field     "techPhone" (ຝັ່ງຊ່າງ) ຫຼື "customerPhone" (ຝັ່ງລູກຄ້າ)
 * @param value     ຄ່າຂອງຕົນເອງ (tech.phone ຫຼື customerPhone) — null/undefined = ຍັງບໍ່ພ້ອມ, ຈະບໍ່ຟັງ
 * @param myId      ຕົວຕົນຄົງທີ່ຂອງຕົນເອງ (ໃຊ້ປຽບທຽບກັບ lastSenderId ເພື່ອຮູ້ວ່າແມ່ນຄົນອື່ນສົ່ງມາ)
 * @param peerLabel ຟັງຊັນສ້າງຊື່ອີກຝ່າຍທີ່ຈະສະແດງໃນຫົວຂໍ້ແຈ້ງເຕືອນ
 */
export function useNewMessageAlert(
  field: "techPhone" | "customerPhone",
  value: string | null | undefined,
  myId: string,
  peerLabel: (room: ChatRoomLite) => string
) {
  // ຈື່ lastTimestamp ຂອງແຕ່ລະຫ້ອງແຊັດທີ່ເຄີຍເຫັນແລ້ວ (ເພື່ອບໍ່ໃຫ້ແຈ້ງເຕືອນຊ້ຳ)
  const seenRef = useRef<Map<string, number>>(new Map());
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (!value || value === "anonymous") return;

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // ໂຫລດຄືນໃໝ່ທຸກຄັ້ງທີ່ value ປ່ຽນ (ເຊັ່ນ login ຄົນໃໝ່)
    seenRef.current = new Map();
    firstLoadRef.current = true;

    const q = query(
      collection(db, "chats"),
      where(field, "==", value),
      orderBy("lastTimestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach((d) => {
        const room = { id: d.id, ...d.data() } as ChatRoomLite;
        const ts = room.lastTimestamp?.seconds ?? 0;
        const prevTs = seenRef.current.get(room.id);

        const isNewMessage =
          !firstLoadRef.current && prevTs !== undefined && ts > prevTs;
        const isFromOtherPerson = room.lastSenderId !== myId;

        if (isNewMessage && isFromOtherPerson) {
          // ສຽງແຈ້ງເຕືອນ — ຖ້າບໍ່ມີໄຟລ໌ /public/notification.mp3 ໃຫ້ລຶບແຖວນີ້ອອກ
          new Audio("/notification.mp3").play().catch(() => {});

          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.hidden
          ) {
            new Notification(`ຂໍ້ຄວາມໃໝ່ຈາກ ${peerLabel(room)}`, {
              body: room.lastMessage ?? "",
              icon: "/logo192.png",
            });
          }
        }

        seenRef.current.set(room.id, ts);
      });
      firstLoadRef.current = false;
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, value, myId]);
}
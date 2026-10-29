
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/Firebase";

interface TechnicianStatus {
  busyPhones: Set<string>;
  unavailablePhones: Set<string>;
}

export function useBusyTechnicians() {
  const [status, setStatus] = useState<TechnicianStatus>({
    busyPhones: new Set<string>(),
    unavailablePhones: new Set<string>(),
  });

  useEffect(() => {
    // ຟັງສະຖານະການຈອງຊ່າງ
    const bookingQuery = query(
      collection(db, "bookings"),
      where("status", "in", [
        "in_progress",
        "pending_confirm",
      ])
    );

    const unsubscribeBookings = onSnapshot(
      bookingQuery,
      (snapshot) => {
        const phones = new Set<string>();

        snapshot.docs.forEach((document) => {
          const data = document.data();

          if (data.techPhone) {
            phones.add(String(data.techPhone));
          }
        });

        setStatus((previous) => ({
          ...previous,
          busyPhones: phones,
        }));
      },
      (error) => {
        console.error(
          "Failed to listen to bookings:",
          error
        );
      }
    );

    // ຟັງສະຖານະວ່າງ/ບໍ່ວ່າງຂອງຊ່າງ
    const unsubscribeTechnicians = onSnapshot(
      collection(db, "technicians"),
      (snapshot) => {
        const unavailable = new Set<string>();

        snapshot.docs.forEach((document) => {
          const data = document.data();

          const documentPhone = document.id;
          const dataPhone = data.phone
            ? String(data.phone)
            : "";

          if (data.available === false) {
            unavailable.add(documentPhone);

            if (dataPhone) {
              unavailable.add(dataPhone);
            }
          }
        });

        setStatus((previous) => ({
          ...previous,
          unavailablePhones: unavailable,
        }));
      },
      (error) => {
        console.error(
          "Failed to listen to technician availability:",
          error
        );
      }
    );

    return () => {
      unsubscribeBookings();
      unsubscribeTechnicians();
    };
  }, []);

  return status;
}

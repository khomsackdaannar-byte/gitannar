import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/Firebase";

// ດຶງຮູບໂປຣໄຟລ໌ຊ່າງທີ່ອັບໂຫລດເອງ, ເກັບເປັນ map: { [phone]: photoURL }
export function useTechnicianPhotos() {
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "technicians"), (snapshot) => {
      const map: Record<string, string> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.photoURL) {
          map[doc.id] = data.photoURL;
        }
      });
      setPhotoMap(map);
    });
    return () => unsubscribe();
  }, []);

  return photoMap;
}
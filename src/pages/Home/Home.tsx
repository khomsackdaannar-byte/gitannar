import { useEffect, useMemo, useState } from "react";
import { Search, Zap, Wrench, Scissors, Car, Smartphone, ArrowLeft } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/Firebase";
import { TechCategory, TechCategoryType, techList, type Technician } from "../../Types/Technician";
import { TechnicianListView } from "../../component/TechnicianCard/TechnicianCard";
import { useTechnicianPhotos } from "../../hooks/useTechnicianPhotos";
import "./Home.css";
import BottomNav from "../../component/BottomNav/BottomNav";


const categories: {
  category: TechCategoryType;
  label: string;
  desc: string;
  icon: typeof Zap;
  cls: string;
}[] = [
  { category: TechCategory.electric, label: "ຊ່າງໄຟຟ້າ", desc: "ໄຟຟ້າດັບ ໄຟຟ້າຮົ່ວ ຕິດຕັ້ງອຸປະກອນ", icon: Zap, cls: "electric" },
  { category: TechCategory.plumbing, label: "ຊ່າງນ້ຳປະປາ", desc: "ນ້ຳຮົ່ວ ນ້ຳຕັນ ທໍ່ແຕກ ແກ້ໄວ", icon: Wrench, cls: "plumbing" },
  { category: TechCategory.beauty, label: "ຊ່າງເສີມສວຍ", desc: "ຕັດຜົມ ແຕ່ງໜ້າ ເສີມສວຍ", icon: Scissors, cls: "beauty" },
  { category: TechCategory.carRepair, label: "ຊ່າງສ້ອມແປງລົດ", desc: "ຢາງແຕກ ເຄື່ອງຍົນ ສ້ອມແປງດ່ວນ", icon: Car, cls: "car_repair" },
  { category: TechCategory.phoneRepair, label: "ຊ່າງສ້ອມແປງໂທລະສັບ", desc: "ຈໍແຕກ ແບັດເສຍ ເປີດບໍ່ຕິດ ແກ້ໄດ້", icon: Smartphone, cls: "phone_repair" },
];

function Home() {
  const [view, setView] = useState<"categories" | "list">("categories");
  const [activeTab, setActiveTab] = useState<TechCategoryType>(TechCategory.electric);
  const [searchText, setSearchText] = useState("");
  const photoMap = useTechnicianPhotos();

  // ຊ່າງທີ່ລົງທະບຽນຜ່ານແອັບ (ບັນທຶກໄວ້ໃນ Firestore collection "technicians")
  const [registeredTechs, setRegisteredTechs] = useState<Technician[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "technicians"),
      (snapshot) => {
        const docs = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              name: data.name ?? "",
              type: data.type ?? "",
              category: data.category ?? TechCategory.electric,
              phone: data.phone ?? d.id,
              area: data.area ?? "",
              hometown: data.hometown ?? "",
              birthDate: data.birthDate ?? "",
              age: data.age ?? "",
              rating: data.rating ?? 0,
              icon: data.icon ?? "electrical_services",
              image: data.image || undefined,
            } as Technician;
          })
          // ຕັດຂໍ້ມູນທີ່ລົງທະບຽນບໍ່ຄົບ (ບໍ່ມີຊື່) ອອກ ບໍ່ໃຫ້ສະແດງບັດຫວ່າງໆ
          .filter((t) => t.name.trim() !== "");
        setRegisteredTechs(docs);
      },
      (err) => {
        console.error("technicians snapshot error:", err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // ລວມລາຍຊື່ຄົງທີ່ (demo) ກັບຊ່າງທີ່ລົງທະບຽນຈິງ, ຕັດຊ້ຳກັນອອກໂດຍໃຊ້ເບີໂທເປັນຫຼັກ
  // (ຂໍ້ມູນທີ່ບັນທຶກຈິງໃນ Firestore ຈະໃຊ້ແທນຂໍ້ມູນຄົງທີ່ ຖ້າເບີໂທຊ້ຳກັນ)
  const allTechs = useMemo(() => {
    const merged = new Map<string, Technician>();
    for (const t of techList) merged.set(t.phone, t);
    for (const t of registeredTechs) merged.set(t.phone, t);
    return Array.from(merged.values());
  }, [registeredTechs]);

  const filteredList = useMemo(() => {
    const search = searchText.toLowerCase();
    return allTechs
      .filter((tech) => {
        const matchCategory = tech.category === activeTab;
        const matchSearch =
          tech.name.toLowerCase().includes(search) ||
          tech.area.toLowerCase().includes(search);
        return matchCategory && matchSearch;
      })
      .map((tech) => ({
        ...tech,
        image: photoMap[tech.phone] || tech.image,
      }));
  }, [allTechs, activeTab, searchText, photoMap]);

  const activeCategory = categories.find((c) => c.category === activeTab);

  const openCategory = (category: TechCategoryType) => {
    setActiveTab(category);
    setSearchText("");
    setView("list");
  };

  return (
    <div className="home-page">
      <header className="home-appbar">
        {view === "list" && (
          <button className="home-back" onClick={() => setView("categories")}>
            <ArrowLeft size={20} />
          </button>
        )}
        <h1>{view === "categories" ? "ຊ່າງດ່ວນ" : activeCategory?.label}</h1>
      </header>

            {view === "categories" && (
        <div className="category-grid">
          {categories.map(({ category, label, icon: Icon, cls }) => (
            <button
              key={category}
              className="category-tile"
              onClick={() => openCategory(category)}
            >
              <div className={`category-tile__icon category-tile__icon--${cls}`}>
                <Icon size={28} />
              </div>
              <span className="category-tile__label">{label}</span>
            </button>
          ))}
        </div>
      )}
      {view === "list" && (
        <>
          <div className="home-search">
            <Search size={18} color="#888" />
            <input
              type="text"
              placeholder="ຄົ້ນຫາຊື່ ຫຼື ພື້ນທີ່..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <TechnicianListView list={filteredList} />
        </>
      )}
          <BottomNav />
    </div>
  );
}

export default Home;
import { useMemo, useState } from "react";
import { Search, Zap, Wrench, Scissors, Car, Smartphone, ArrowLeft } from "lucide-react";
import { TechCategory, TechCategoryType, techList } from "../../Types/Technician";
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

  const filteredList = useMemo(() => {
    const search = searchText.toLowerCase();
    return techList
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
  }, [activeTab, searchText, photoMap]);

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
import { useEffect, useMemo, useState } from "react";
import { Search, Zap, Wrench, Scissors, Car, Smartphone, ArrowLeft, Bell, MapPin, Star, ShieldCheck, Snowflake, ChevronRight } from "lucide-react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase/Firebase";
import { TechCategory, TechCategoryType, techList, type Technician } from "../../Types/Technician";
import { TechnicianListView } from "../../component/TechnicianCard/TechnicianCard";
import { useTechnicianPhotos } from "../../hooks/useTechnicianPhotos";
import { useLanguage } from "../../context/LanguageContext";
import "./Home.css";
import BottomNav from "../../component/BottomNav/BottomNav";

function Home() {
  const [view, setView] = useState<"categories" | "list">("categories");
  const [activeTab, setActiveTab] = useState<TechCategoryType>(TechCategory.electric);
  const [searchText, setSearchText] = useState("");
  const photoMap = useTechnicianPhotos();
  const { t } = useLanguage();

  const categories: {
    category: TechCategoryType;
    label: string;
    icon: typeof Zap;
    cls: string;
  }[] = [
    { category: TechCategory.electric, label: t.home.categories.electric, icon: Zap, cls: "electric" },
    { category: TechCategory.plumbing, label: t.home.categories.plumbing, icon: Wrench, cls: "plumbing" },
    { category: TechCategory.beauty, label: t.home.categories.beauty, icon: Scissors, cls: "beauty" },
    { category: TechCategory.carRepair, label: t.home.categories.carRepair, icon: Car, cls: "car_repair" },
    { category: TechCategory.phoneRepair, label: t.home.categories.phoneRepair, icon: Smartphone, cls: "phone_repair" },
  ];

const [displayName, setDisplayName] = useState<string>("ທ່ານ");

useEffect(() => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const unsubscribe = onSnapshot(doc(db, "users", uid), (snap) => {
    const name = snap.exists() ? (snap.data().name as string) : "";
    setDisplayName(name && name.trim() !== "" ? name : "ທ່ານ");
  });

  return () => unsubscribe();
}, []);


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
          .filter((t) => t.name.trim() !== "");
        setRegisteredTechs(docs);
      },
      (err) => {
        console.error("technicians snapshot error:", err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  const allTechs = useMemo(() => {
    const merged = new Map<string, Technician>();
    for (const t of techList) merged.set(t.phone, t);
    for (const t of registeredTechs) merged.set(t.phone, t);
    return Array.from(merged.values());
  }, [registeredTechs]);

  const featuredTechs = useMemo(() => {
    return [...allTechs]
      .map((t) => ({ ...t, image: photoMap[t.phone] || t.image }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);
  }, [allTechs, photoMap]);

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
      {view === "categories" && (
        <>
          <header className="home-hero">
            <div className="home-hero__deco" />
            <div className="home-hero__top">
              <div className="home-hero__location">
                <MapPin size={14} />
                <span>{t.home.location}</span>
              </div>
              <button className="home-bell" aria-label="Notifications">
                <Bell size={19} />
                <span className="home-bell__dot" />
              </button>
            </div>

            <div className="home-hero__greet">
              {t.home.greet(displayName)} <span className="home-hero__wave">👋</span>
            </div>
          </header>

          <div className="home-content">
            <div className="home-banner">
              <div className="home-banner__badge">
                <ShieldCheck size={13} /> {t.home.banner.badge}
              </div>
              <h2>{t.home.banner.title}</h2>
              <p>{t.home.banner.desc}</p>
              <span className="home-banner__discount">{t.home.banner.discount}</span>
            </div>

            <div className="home-section-title">
              <h3>{t.home.perksTitle}</h3>
            </div>
            <div className="home-perks">
              <div className="home-perk-card">
                <div className="home-perk-card__icon">
                  <ShieldCheck size={22} />
                </div>
                <div className="home-perk-card__text">
                  <p className="home-perk-card__title">{t.home.perk1Title}</p>
                  <p className="home-perk-card__desc">{t.home.perk1Desc}</p>
                </div>
                <ChevronRight size={18} color="#b7c2bf" />
              </div>
              <div className="home-perk-card">
                <div className="home-perk-card__icon home-perk-card__icon--alt">
                  <Snowflake size={22} />
                </div>
                <div className="home-perk-card__text">
                  <p className="home-perk-card__title">{t.home.perk2Title}</p>
                  <p className="home-perk-card__desc">{t.home.perk2Desc}</p>
                </div>
                <ChevronRight size={18} color="#b7c2bf" />
              </div>
            </div>

            <div className="home-section-title">
              <h3>{t.home.categoriesTitle}</h3>
            </div>
            <div className="category-grid">
              {categories.map(({ category, label, icon: Icon, cls }) => (
                <button
                  key={category}
                  className="category-tile"
                  onClick={() => openCategory(category)}
                >
                  <div className={`category-tile__icon category-tile__icon--${cls}`}>
                    <Icon size={26} />
                  </div>
                  <span className="category-tile__label">{label}</span>
                </button>
              ))}
            </div>

            {featuredTechs.length > 0 && (
              <>
                <div className="home-section-title">
                  <h3>{t.home.featuredTitle}</h3>
                </div>
                <div className="featured-scroll">
                  {featuredTechs.map((tech) => (
                    <button
                      key={tech.phone}
                      className="featured-card"
                      onClick={() => openCategory(tech.category)}
                    >
                      <div className="featured-card__image">
                        {tech.image ? (
                          <img src={tech.image} alt={tech.name} />
                        ) : (
                          <div className="featured-card__placeholder">
                            {tech.name.charAt(0)}
                          </div>
                        )}
                        {tech.rating > 0 && (
                          <span className="featured-card__rating">
                            <Star size={11} fill="#fff" /> {tech.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="featured-card__body">
                        <p className="featured-card__name">{tech.name}</p>
                        <p className="featured-card__type">{tech.type}</p>
                        <div className="featured-card__footer">
                          <span className="featured-card__area">{tech.area || t.home.location}</span>
                          <ChevronRight size={16} color="#3d8983" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {view === "list" && (
        <>
          <header className="home-appbar">
            <button className="home-back" onClick={() => setView("categories")}>
              <ArrowLeft size={20} />
            </button>
            <h1>{activeCategory?.label}</h1>
          </header>

          <div className="home-search">
            <Search size={18} color="#888" />
            <input
              type="text"
              placeholder={t.home.searchPlaceholder}
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
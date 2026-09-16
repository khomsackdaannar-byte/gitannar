import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage, type LangKey } from "../../context/LanguageContext";
import "./LanguageSwitcher.css";

const options: { key: LangKey; flag: string; label: string }[] = [
  { key: "lo", flag: "🇱🇦", label: "ລາວ" },
  { key: "th", flag: "🇹🇭", label: "ไทย" },
  { key: "en", flag: "🇬🇧", label: "English" },
];

function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.key === lang) ?? options[0];

  // ປິດ dropdown ເມື່ອກົດນອກກ່ອງ
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="lang-switch" ref={wrapRef}>
      <button
        type="button"
        className="lang-switch__trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="lang-switch__flag">{current.flag}</span>
        <span className="lang-switch__label">{current.label}</span>
        <ChevronDown
          size={15}
          className={`lang-switch__chevron ${open ? "lang-switch__chevron--open" : ""}`}
        />
      </button>

      {open && (
        <div className="lang-switch__menu">
          {options.map((opt) => (
            <button
              type="button"
              key={opt.key}
              className={`lang-switch__item ${opt.key === lang ? "lang-switch__item--active" : ""}`}
              onClick={() => {
                setLang(opt.key);
                setOpen(false);
              }}
            >
              <span className="lang-switch__flag">{opt.flag}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
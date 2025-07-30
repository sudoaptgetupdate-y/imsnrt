// src/components/ui/LanguageToggle.jsx

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react"; // --- 1. Import ไอคอน Globe ---

export function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'th' ? 'en' : 'th';
    i18n.changeLanguage(newLang);
  };

  return (
    // --- 2. แก้ไข Button ทั้งหมด ---
    <Button variant="outline" size="sm" onClick={toggleLanguage}>
      <Globe className="mr-2 h-4 w-4" />
      <span className="font-semibold">
        {i18n.language.toUpperCase()}
      </span>
      <span className="sr-only">Toggle language</span>
    </Button>
  );
}
// src/components/ui/LanguageToggle.jsx

import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
// --- START: 1. Import Tooltip components ---
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
// --- END ---

export function LanguageToggle() {
  // --- START: 2. เรียก t function มาใช้งานด้วย ---
  const { i18n, t } = useTranslation()
  // --- END ---

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "th" : "en"
    i18n.changeLanguage(newLang)
  }

  return (
    // --- START: 3. ห่อหุ้มปุ่มด้วย TooltipProvider และ Tooltip ---
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* นี่คือปุ่มเดิมของคุณ */}
          <Button variant="outline" size="icon" onClick={toggleLanguage}>
            {i18n.language === "en" ? "TH" : "EN"}
            <span className="sr-only">{t('toggle_language_tooltip')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {/* เพิ่มข้อความ Tooltip โดยใช้ t() function */}
          <p>{t('toggle_language_tooltip')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    // --- END ---
  )
}
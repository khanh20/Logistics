import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import vi from "~/locales/vi.json";
import en from "~/locales/en.json";

i18n.use(initReactI18next).init({
  lng: "vi",
  fallbackLng: "vi",
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  interpolation: { escapeValue: false },
});

export default i18n;

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr.json";
import en from "./locales/en.json";

const defaultLocale = (import.meta.env.VITE_DEFAULT_LOCALE as string | undefined) ?? "fr";

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en }
  },
  lng: defaultLocale,
  fallbackLng: "fr",
  interpolation: { escapeValue: false }
});

export default i18n;

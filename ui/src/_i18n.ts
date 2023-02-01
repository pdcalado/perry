import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import * as en from "locales/en/translation.json";
import * as de from "locales/de/translation.json";

i18n.use(LanguageDetector)
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources: {
            en: {
                translation: (en as any).default,
            },
            de: {
                translation: (de as any).default,
            }
        },
        fallbackLng: "en",
        detection: {
            order: ["navigator"],
        },
        interpolation: {
            escapeValue: false,
        },
    });

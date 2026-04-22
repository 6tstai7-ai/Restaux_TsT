import { useTranslation } from "react-i18next";

export default function App() {
  const { t, i18n } = useTranslation();
  const next = i18n.resolvedLanguage === "fr" ? "en" : "fr";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">{t("welcome")}</h1>
      <button
        type="button"
        onClick={() => i18n.changeLanguage(next)}
        className="rounded border px-4 py-2"
      >
        {t("switchLocale", { lng: next.toUpperCase() })}
      </button>
    </main>
  );
}

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";

type Restaurant = {
  id: string;
  name: string | null;
  card_bg_color: string | null;
  card_text_color: string | null;
  card_label_color: string | null;
  card_description: string | null;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
const DEFAULT_BG = "#18181b";
const DEFAULT_TEXT = "#ffffff";
const DEFAULT_LABEL = "#a1a1aa";

export default function PublicEnrollment() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [resto, setResto] = useState<Restaurant | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [passPending, setPassPending] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passDownloaded, setPassDownloaded] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/public/restaurant/${restaurantId}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as { success: boolean; restaurant?: Restaurant; error?: string };
        if (!json.success || !json.restaurant) {
          throw new Error(json.error ?? "Restaurant introuvable");
        }
        setResto(json.restaurant);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Chargement impossible");
      } finally {
        setLoading(false);
      }
    })();
  }, [restaurantId]);

  const colors = useMemo(
    () => ({
      bg: resto?.card_bg_color ?? DEFAULT_BG,
      text: resto?.card_text_color ?? DEFAULT_TEXT,
      label: resto?.card_label_color ?? DEFAULT_LABEL
    }),
    [resto]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    const name = fullName.trim();
    const ph = phone.trim();
    if (!name || !ph || !consent) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/api/public/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          name,
          phone: ph,
          opt_in_sms: consent
        })
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; customer_id?: string; error?: string };
      if (!res.ok || !json.success || !json.customer_id) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setCustomerId(json.customer_id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'inscription");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddToWallet() {
    if (!customerId) return;
    setPassPending(true);
    setPassError(null);
    try {
      const res = await fetch(`${API_BASE}/api/wallet/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: customerId })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "carte-fidelite.pkpass";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPassDownloaded(true);
    } catch (err) {
      setPassError(err instanceof Error ? err.message : "Échec génération pass");
    } finally {
      setPassPending(false);
    }
  }

  const restoName = resto?.name?.trim() || "Ce restaurant";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12 font-sans antialiased transition-colors"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <div className="w-full max-w-md">
        {loading ? (
          <p className="text-center text-sm opacity-60">Chargement…</p>
        ) : loadError ? (
          <div className="text-center">
            <h1 className="text-2xl font-light">Lien invalide</h1>
            <p className="mt-3 text-sm opacity-70">{loadError}</p>
          </div>
        ) : !customerId ? (
          <>
            <header className="mb-10 text-center">
              <div
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ color: colors.label }}
              >
                Programme fidélité
              </div>
              <h1 className="mt-3 text-3xl font-light tracking-tight">{restoName}</h1>
              <p className="mt-4 text-sm opacity-70">
                Rejoins la base fidèle. Accumule des points à chaque visite. Reçois les meilleures offres en premier.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: colors.label }}>
                  Prénom et Nom
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  className="w-full bg-transparent border border-current/30 px-4 py-3 text-base focus:outline-none transition-colors"
                  style={{ borderColor: `${colors.label}66`, color: colors.text }}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: colors.label }}>
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(514) 555-1234"
                  className="w-full bg-transparent border px-4 py-3 text-base focus:outline-none transition-colors placeholder-current/40"
                  style={{ borderColor: `${colors.label}66`, color: colors.text }}
                />
              </div>

              <label className="flex items-start gap-3 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                  className="mt-1 h-4 w-4 accent-current shrink-0"
                />
                <span className="text-sm leading-relaxed opacity-90">
                  J'accepte de recevoir des offres par SMS. Je peux me désinscrire à tout moment en répondant STOP.
                </span>
              </label>

              {submitError && (
                <p className="text-sm" style={{ color: "var(--color-danger)" }}>{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !consent || !fullName.trim() || !phone.trim()}
                className="w-full py-4 text-sm font-medium tracking-wide transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.text, color: colors.bg }}
              >
                {submitting ? "Inscription…" : "Rejoindre"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{ color: colors.label }}
            >
              Bienvenue
            </div>
            <h1 className="mt-3 text-3xl font-light tracking-tight">
              Tu fais partie de la famille.
            </h1>
            <p className="mt-4 text-sm opacity-70">
              Garde ta carte dans ton portefeuille — elle suit tes points en temps réel.
            </p>

            <button
              onClick={handleAddToWallet}
              disabled={passPending}
              className="mt-10 w-full py-5 text-base font-medium tracking-wide transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.text, color: colors.bg }}
            >
              {passPending ? "Génération de la carte…" : "Ajouter à Apple Wallet"}
            </button>

            {passDownloaded && !passError && (
              <p className="mt-5 text-sm opacity-70">
                Carte téléchargée. Ouvre le fichier pour l'ajouter à Wallet.
              </p>
            )}
            {passError && (
              <p className="mt-5 text-sm" style={{ color: "var(--color-danger)" }}>{passError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { Wallet } from "lucide-react";
import { getContrastColor } from "../lib/colorUtils";

function isAppleWalletDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports as MacIntel with touch
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

type Restaurant = {
  id: string;
  name: string | null;
  card_bg_color: string | null;
  card_text_color: string | null;
  card_label_color: string | null;
  card_description: string | null;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
const DEFAULT_BRAND = "#18181b";

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
  const isApple = useMemo(isAppleWalletDevice, []);

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

  const tenantStyle = useMemo<CSSProperties>(() => {
    const brand = resto?.card_bg_color?.trim() || DEFAULT_BRAND;
    const text = resto?.card_text_color?.trim() || getContrastColor(brand);
    return {
      "--tenant-brand": brand,
      "--tenant-text": text
    } as CSSProperties;
  }, [resto]);

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

  const walletUrl = customerId ? `${API_BASE}/api/wallet/apple/${customerId}` : null;
  const restoName = resto?.name?.trim() || "Ce restaurant";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12 font-sans antialiased transition-colors bg-[var(--tenant-brand)] text-[var(--tenant-text)]"
      style={tenantStyle}
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
              <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--tenant-text)] opacity-60">
                Programme fidélité
              </div>
              <h1 className="mt-3 text-3xl font-light tracking-tight text-[var(--tenant-text)]">{restoName}</h1>
              <p className="mt-4 text-sm text-[var(--tenant-text)] opacity-70">
                Rejoins la base fidèle. Accumule des points à chaque visite. Reçois les meilleures offres en premier.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-widest mb-2 text-[var(--tenant-text)] opacity-60">
                  Prénom et Nom
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  className="w-full bg-transparent border border-[var(--tenant-text)]/30 px-4 py-3 text-base text-[var(--tenant-text)] focus:outline-none focus:border-[var(--tenant-text)]/70 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest mb-2 text-[var(--tenant-text)] opacity-60">
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
                  className="w-full bg-transparent border border-[var(--tenant-text)]/30 px-4 py-3 text-base text-[var(--tenant-text)] placeholder:text-[var(--tenant-text)]/40 focus:outline-none focus:border-[var(--tenant-text)]/70 transition-colors"
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
                <span className="text-sm leading-relaxed text-[var(--tenant-text)] opacity-90">
                  J'accepte de recevoir des offres par SMS. Je peux me désinscrire à tout moment en répondant STOP.
                </span>
              </label>

              {submitError && <p className="text-sm text-danger">{submitError}</p>}

              <button
                type="submit"
                disabled={submitting || !consent || !fullName.trim() || !phone.trim()}
                className="w-full py-4 text-sm font-medium tracking-wide bg-[var(--tenant-text)] text-[var(--tenant-brand)] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Inscription…" : "Rejoindre"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--tenant-text)] opacity-60">
              Bienvenue chez {restoName}
            </div>
            <h1 className="mt-3 text-3xl font-light tracking-tight text-[var(--tenant-text)]">
              Tu fais partie de la famille.
            </h1>
            <p className="mt-4 text-sm text-[var(--tenant-text)] opacity-70">
              Garde ta carte dans ton portefeuille — elle suit tes points en temps réel.
            </p>

            {walletUrl && isApple && (
              <a
                href={walletUrl}
                className="mt-10 inline-flex w-full items-center justify-center gap-2 h-14 rounded-xl bg-[var(--tenant-text)] text-[var(--tenant-brand)] text-base font-medium tracking-wide transition-opacity hover:opacity-90"
              >
                <Wallet size={20} strokeWidth={1.75} aria-hidden />
                <span>Ajouter à Apple Wallet</span>
              </a>
            )}

            {walletUrl && !isApple && (
              <a
                href={walletUrl}
                className="mt-10 inline-flex w-full items-center justify-center gap-2 h-14 rounded-xl border border-[var(--tenant-text)]/40 text-[var(--tenant-text)] text-base font-medium tracking-wide transition-colors hover:bg-[var(--tenant-text)]/10"
              >
                <Wallet size={20} strokeWidth={1.75} aria-hidden />
                <span>Télécharger la carte</span>
              </a>
            )}

            <p className="mt-5 text-xs text-[var(--tenant-text)] opacity-60">
              {isApple
                ? "Wallet s'ouvrira automatiquement."
                : "Pour ajouter à Apple Wallet, ouvre ce lien sur ton iPhone."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

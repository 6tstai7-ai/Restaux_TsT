import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Palette } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

type Branding = {
  name: string;
  card_bg_color: string;
  card_text_color: string;
  card_label_color: string;
  card_description: string;
};

const DEFAULTS: Branding = {
  name: "",
  card_bg_color: "#18181b",
  card_text_color: "#ffffff",
  card_label_color: "#a1a1aa",
  card_description: ""
};

export default function LoyaltySettings() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [branding, setBranding] = useState<Branding>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("restaurants")
        .select("id, name, card_bg_color, card_text_color, card_label_color, card_description")
        .eq("owner_id", userId)
        .limit(1);
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      const row = data?.[0];
      if (!row) {
        setError("Aucun restaurant associé à ce compte.");
        setLoading(false);
        return;
      }
      setRestaurantId(row.id as string);
      setBranding({
        name: (row.name as string | null) ?? "",
        card_bg_color: (row.card_bg_color as string | null) ?? DEFAULTS.card_bg_color,
        card_text_color: (row.card_text_color as string | null) ?? DEFAULTS.card_text_color,
        card_label_color: (row.card_label_color as string | null) ?? DEFAULTS.card_label_color,
        card_description: (row.card_description as string | null) ?? ""
      });
      setLoading(false);
    })();
  }, [session?.user?.id]);

  function update<K extends keyof Branding>(key: K, value: Branding[K]) {
    setBranding((b) => ({ ...b, [key]: value }));
    setSavedAt(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("restaurants")
      .update({
        card_bg_color: branding.card_bg_color,
        card_text_color: branding.card_text_color,
        card_label_color: branding.card_label_color,
        card_description: branding.card_description || null
      })
      .eq("id", restaurantId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSavedAt(new Date().toLocaleTimeString("fr-CA"));
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans">
      <header className="relative flex items-center justify-center h-14 px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="absolute left-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors duration-180 ease-out-punched"
        >
          <ChevronLeft size={28} strokeWidth={1.75} />
        </button>
        <h1 className="text-base font-medium tracking-tight">Identité de la carte</h1>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 pb-24 pt-2 sm:px-5">
        {loading ? (
          <p className="py-12 text-center text-caption text-[var(--color-text-dim)]">Chargement…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                Aperçu en direct
              </p>
              <WalletPreview branding={branding} />
            </section>

            <section className="flex flex-col gap-6">
              <ColorField
                label="Fond de la carte"
                value={branding.card_bg_color}
                onChange={(v) => update("card_bg_color", v)}
              />
              <ColorField
                label="Couleur du texte"
                value={branding.card_text_color}
                onChange={(v) => update("card_text_color", v)}
              />
              <ColorField
                label="Couleur des libellés"
                value={branding.card_label_color}
                onChange={(v) => update("card_label_color", v)}
              />

              <div>
                <label
                  htmlFor="card-description"
                  className="block mb-2 text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]"
                >
                  Description
                </label>
                <textarea
                  id="card-description"
                  value={branding.card_description}
                  onChange={(e) => update("card_description", e.target.value)}
                  placeholder="Ex: Carte fidélité La Boîte Jaune"
                  rows={3}
                  className="w-full bg-transparent border border-[var(--color-border-strong)] rounded-xl px-4 py-3 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--tenant-accent)] focus:outline-none transition-colors duration-180 ease-out-punched resize-none"
                />
              </div>
            </section>

            {error && (
              <p className="text-caption text-[var(--color-danger)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving || !restaurantId}
              className="w-full h-14 mt-4 rounded-xl bg-[var(--color-brand)] text-[var(--color-brand-ink)] text-base font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-180 ease-out-punched"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>

            {savedAt && (
              <p className="text-center text-caption text-[var(--color-text-muted)]">
                Enregistré à {savedAt}
              </p>
            )}

            {restaurantId && <PublicLinkSection restaurantId={restaurantId} />}
          </form>
        )}
      </main>
    </div>
  );
}

function PublicLinkSection({ restaurantId }: { restaurantId: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/rejoindre/${restaurantId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mt-8 pt-8 border-t border-[var(--color-border)]">
      <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-2">
        Lien d'inscription public
      </p>
      <p className="text-caption text-[var(--color-text-muted)] mb-4">
        Partage ce lien ou affiche un QR au comptoir.
      </p>

      <div className="flex items-center gap-3 h-14 rounded-xl border border-[var(--color-border-strong)] bg-transparent px-4">
        <code className="min-w-0 flex-1 truncate text-sm font-mono text-[var(--color-text)]">
          {url}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 inline-flex items-center justify-center h-9 px-3 rounded-lg text-caption text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors duration-180 ease-out-punched"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block mb-2 text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </label>
      <div className="relative flex items-center justify-between gap-3 h-14 rounded-xl border border-[var(--color-border-strong)] bg-transparent px-4 transition-colors duration-180 ease-out-punched focus-within:border-[var(--tenant-accent)]">
        <div className="flex items-center gap-3 min-w-0">
          <span
            aria-hidden
            className="block h-7 w-7 rounded-sm border border-[var(--color-border)] shrink-0"
            style={{ backgroundColor: value }}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            className="min-w-0 bg-transparent font-mono tabular text-base text-[var(--color-text)] focus:outline-none"
          />
        </div>
        <label className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] cursor-pointer transition-colors duration-180 ease-out-punched">
          <Palette size={20} strokeWidth={1.75} />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Choisir une couleur"
          />
        </label>
      </div>
    </div>
  );
}

function WalletPreview({ branding }: { branding: Branding }) {
  const name = branding.name?.trim() || "La Boîte Jaune";
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      <div
        className="rounded-xl p-5 sm:p-6 aspect-[1.6/1] flex flex-col justify-between"
        style={{ backgroundColor: branding.card_bg_color, color: branding.card_text_color }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.08em]"
              style={{ color: branding.card_label_color }}
            >
              Membre
            </div>
            <div className="mt-1 text-lg font-medium">Alex Dubois</div>
          </div>
          <div className="text-right">
            <div
              className="text-[10px] uppercase tracking-[0.08em]"
              style={{ color: branding.card_label_color }}
            >
              Points
            </div>
            <div className="mt-1 text-lg font-medium tabular">1 250</div>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.08em]"
              style={{ color: branding.card_label_color }}
            >
              Resto
            </div>
            <div className="mt-1 text-lg font-medium">{name}</div>
          </div>
          <div
            className="h-10 w-10 rounded-sm grid grid-cols-4 grid-rows-4 gap-[2px] opacity-90"
            style={{ color: branding.card_label_color }}
            aria-hidden
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: i % 3 === 0 ? branding.card_text_color : "transparent"
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

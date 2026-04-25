import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import DashboardNav from "@/components/DashboardNav";

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
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased">
      <div className="mx-auto max-w-6xl px-8 py-16">
        <header className="mb-16 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight">Identité de la carte</h1>
            <p className="mt-2 text-sm text-zinc-500">Couleurs et description de ta carte fidélité Wallet</p>
          </div>
          <DashboardNav />
        </header>

        {loading ? (
          <p className="text-sm text-zinc-600">Chargement…</p>
        ) : (
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_420px]">
            <form onSubmit={handleSubmit} className="space-y-8">
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
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-3">
                  Description
                </label>
                <textarea
                  value={branding.card_description}
                  onChange={(e) => update("card_description", e.target.value)}
                  placeholder="Ex: Carte fidélité La Boîte Jaune"
                  rows={3}
                  className="w-full bg-transparent border border-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-4">
                <button
                  type="submit"
                  disabled={saving || !restaurantId}
                  className="border border-zinc-100 bg-zinc-100 px-6 py-3 text-sm font-medium text-black hover:bg-transparent hover:text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
                {savedAt && <span className="text-xs text-zinc-500">Enregistré à {savedAt}</span>}
                {error && <span className="text-xs text-red-400">{error}</span>}
              </div>
            </form>

            <aside className="lg:sticky lg:top-16 self-start">
              <p className="mb-4 text-xs uppercase tracking-widest text-zinc-500">Aperçu en direct</p>
              <WalletPreview branding={branding} />
            </aside>
          </div>
        )}

        {restaurantId && <PublicLinkSection restaurantId={restaurantId} />}
      </div>
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
    <section className="mt-24 border-t border-zinc-900 pt-12">
      <h2 className="text-xl font-light tracking-tight">Lien d'inscription public</h2>
      <p className="mt-2 text-sm text-zinc-500">
        Partage ce lien ou génère un QR à afficher au comptoir pour que tes clients rejoignent ta base fidélité.
      </p>

      <div className="mt-6 flex items-center gap-3 border border-zinc-800 px-4 py-3">
        <code className="flex-1 truncate text-sm font-mono text-zinc-300">{url}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
        >
          {copied ? "Copié ✓" : "Copier le lien"}
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
      <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-3">{label}</label>
      <div className="flex items-center gap-3 border border-zinc-800 px-3 py-2 focus-within:border-zinc-500 transition-colors">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer bg-transparent border-0 p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm font-mono text-zinc-100 focus:outline-none"
        />
      </div>
    </div>
  );
}

function WalletPreview({ branding }: { branding: Branding }) {
  const name = branding.name?.trim() || "La Boîte Jaune";
  return (
    <div
      className="rounded-2xl shadow-2xl p-6 aspect-[1.6/1] flex flex-col justify-between"
      style={{ backgroundColor: branding.card_bg_color, color: branding.card_text_color }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div
            className="text-[10px] uppercase tracking-widest"
            style={{ color: branding.card_label_color }}
          >
            Membre
          </div>
          <div className="mt-1 text-lg font-medium">Alex Dubois</div>
        </div>
        <div className="text-right">
          <div
            className="text-[10px] uppercase tracking-widest"
            style={{ color: branding.card_label_color }}
          >
            Points
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">1 250</div>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div
            className="text-[10px] uppercase tracking-widest"
            style={{ color: branding.card_label_color }}
          >
            Resto
          </div>
          <div className="mt-1 text-sm font-medium">{name}</div>
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
  );
}

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import DashboardNav from "@/components/DashboardNav";

type Customer = {
  id: string;
  name: string | null;
  phone: string | null;
  points_balance: number | null;
  created_at: string;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export default function ClientsView() {
  const { session } = useSession();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadCustomers = useCallback(async (rid: string) => {
    const { data, error: err } = await supabase
      .from("customers")
      .select("id, name, phone, points_balance, created_at")
      .eq("restaurant_id", rid)
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
      return;
    }
    setCustomers((data ?? []) as Customer[]);
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", userId)
        .limit(1);
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      const rid = data?.[0]?.id as string | undefined;
      if (!rid) {
        setError("Aucun restaurant associé à ce compte.");
        setLoading(false);
        return;
      }
      setRestaurantId(rid);
      await loadCustomers(rid);
      setLoading(false);
    })();
  }, [session?.user?.id, loadCustomers]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    const name = fullName.trim();
    const phone = phoneNumber.trim();
    if (!name || !phone) return;

    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase
      .from("customers")
      .insert({ restaurant_id: restaurantId, name, phone });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setFullName("");
    setPhoneNumber("");
    await loadCustomers(restaurantId);
  }

  async function handleGeneratePass(clientId: string) {
    setPendingId(clientId);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/wallet/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "loyalty-card.pkpass";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec génération pass");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 md:px-8 md:py-10">
        <header className="mb-10 flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center md:justify-between md:pb-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-h1 font-bold tracking-tight">RESTAUX</h1>
            <DashboardNav />
          </div>
          <p className="text-caption text-[var(--color-text-muted)]">
            Clients — Base fidélité
          </p>
        </header>

        <section className="mb-10">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:gap-4">
            <div>
              <label htmlFor="cli-name" className="block mb-2 text-caption text-[var(--color-text-muted)]">
                Nom complet
              </label>
              <input
                id="cli-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-body text-[var(--color-text)] focus:border-[var(--tenant-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-accent)]/30 transition-colors duration-180 ease-out-punched"
              />
            </div>
            <div>
              <label htmlFor="cli-phone" className="block mb-2 text-caption text-[var(--color-text-muted)]">
                Téléphone
              </label>
              <input
                id="cli-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-4 py-3 font-mono tabular text-body text-[var(--color-text)] focus:border-[var(--tenant-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-accent)]/30 transition-colors duration-180 ease-out-punched"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting || !restaurantId}
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] rounded-lg bg-[var(--tenant-accent)] px-6 py-3 text-sm font-semibold text-[var(--tenant-accent-ink)] hover:bg-[var(--tenant-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-180 ease-out-punched"
              >
                {submitting ? "Ajout…" : "Ajouter"}
              </button>
            </div>
          </form>
          {error && <p className="mt-4 text-caption text-[var(--color-danger)]">{error}</p>}
        </section>

        <section>
          <div className="border-t border-[var(--color-border)]">
            <div className="hidden md:grid md:grid-cols-[1.4fr_1fr_100px_180px] gap-6 py-3 text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              <div>Nom</div>
              <div>Téléphone</div>
              <div className="text-right">Points</div>
              <div className="text-right">Action</div>
            </div>

            {loading && (
              <div className="border-t border-[var(--color-border)] py-8 text-caption text-[var(--color-text-dim)]">
                Chargement…
              </div>
            )}

            {!loading && customers.length === 0 && (
              <div className="border-t border-[var(--color-border)] py-8 text-caption text-[var(--color-text-dim)]">
                Aucun client pour l'instant.
              </div>
            )}

            {!loading &&
              customers.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-3 border-t border-[var(--color-border)] py-4 text-body md:grid md:grid-cols-[1.4fr_1fr_100px_180px] md:items-center md:gap-6"
                >
                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[var(--color-text)] font-medium">{c.name ?? "—"}</span>
                    <span className="font-mono tabular text-caption text-[var(--color-text-muted)] md:hidden">
                      {(c.points_balance ?? 0).toLocaleString('fr-CA')} pts
                    </span>
                  </div>
                  <div className="font-mono tabular text-[var(--color-text-muted)]">
                    {c.phone ?? "—"}
                  </div>
                  <div className="hidden md:block text-right font-mono tabular text-[var(--color-text)]">
                    {(c.points_balance ?? 0).toLocaleString('fr-CA')}
                  </div>
                  <div className="md:text-right">
                    <button
                      type="button"
                      onClick={() => handleGeneratePass(c.id)}
                      disabled={pendingId === c.id}
                      className="w-full md:w-auto inline-flex items-center justify-center min-h-[44px] rounded-lg border border-[var(--color-border-strong)] bg-transparent px-4 py-2 text-caption text-[var(--color-text)] hover:bg-[var(--color-surface-2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-180 ease-out-punched"
                    >
                      {pendingId === c.id ? "Génération…" : "Générer pass"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

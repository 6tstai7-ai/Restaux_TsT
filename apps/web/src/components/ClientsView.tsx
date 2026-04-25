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
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-16">
        <header className="mb-10 flex flex-col gap-6 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-light tracking-tight">Clients</h1>
            <p className="mt-2 text-sm text-zinc-500">Base fidélité — La Boîte Jaune</p>
          </div>
          <DashboardNav />
        </header>

        <section className="mb-20">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nom complet"
              required
              className="bg-transparent border border-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
            />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Téléphone"
              required
              className="bg-transparent border border-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={submitting || !restaurantId}
              className="border border-zinc-100 bg-zinc-100 px-6 py-3 text-sm font-medium text-black hover:bg-transparent hover:text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Ajout…" : "Ajouter"}
            </button>
          </form>
          {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
        </section>

        <section>
          <div className="border-t border-zinc-800">
            <div className="hidden md:grid md:grid-cols-[1fr_1fr_80px_160px] gap-6 py-4 text-xs uppercase tracking-widest text-zinc-500">
              <div>Nom</div>
              <div>Téléphone</div>
              <div className="text-right">Points</div>
              <div className="text-right">Action</div>
            </div>

            {loading && (
              <div className="border-t border-zinc-900 py-8 text-sm text-zinc-600">Chargement…</div>
            )}

            {!loading && customers.length === 0 && (
              <div className="border-t border-zinc-900 py-8 text-sm text-zinc-600">Aucun client pour l'instant.</div>
            )}

            {!loading &&
              customers.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-3 border-t border-zinc-900 py-4 text-sm md:grid md:grid-cols-[1fr_1fr_80px_160px] md:items-center md:gap-6"
                >
                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-zinc-100">{c.name ?? "—"}</span>
                    <span className="text-xs text-orange-400 font-bold tabular-nums md:hidden">
                      {c.points_balance ?? 0} pts
                    </span>
                  </div>
                  <div className="text-zinc-400">{c.phone ?? "—"}</div>
                  <div className="hidden md:block text-right text-zinc-400 tabular-nums">{c.points_balance ?? 0}</div>
                  <div className="md:text-right">
                    <button
                      onClick={() => handleGeneratePass(c.id)}
                      disabled={pendingId === c.id}
                      className="w-full md:w-auto border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

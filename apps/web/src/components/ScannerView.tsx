import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import DashboardNav from "@/components/DashboardNav";

type Customer = {
  id: string;
  name: string | null;
  points_balance: number | null;
};

type Stage = "scanning" | "form" | "success";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ScannerView() {
  const { session } = useSession();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [pointsPerDollar, setPointsPerDollar] = useState<number>(1);
  const [bootError, setBootError] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage>("scanning");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awardedPoints, setAwardedPoints] = useState(0);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    (async () => {
      const { data, error: err } = await supabase
        .from("restaurants")
        .select("id, points_per_dollar")
        .eq("owner_id", userId)
        .limit(1);
      if (err) {
        setBootError(err.message);
        return;
      }
      const row = data?.[0];
      if (!row?.id) {
        setBootError("Aucun restaurant associé à ce compte.");
        return;
      }
      setRestaurantId(row.id as string);
      const rate = Number(row.points_per_dollar);
      if (Number.isFinite(rate) && rate > 0) setPointsPerDollar(rate);
    })();
  }, [session?.user?.id]);

  const resetToScan = useCallback(() => {
    setCustomer(null);
    setAmount("");
    setError(null);
    setAwardedPoints(0);
    setStage("scanning");
  }, []);

  const handleDetected = useCallback(
    async (codes: IDetectedBarcode[]) => {
      if (stage !== "scanning" || !restaurantId) return;
      const raw = codes[0]?.rawValue?.trim();
      if (!raw) return;

      const id = UUID_RE.test(raw) ? raw : extractUuid(raw);
      if (!id) {
        setError("Code QR non reconnu.");
        return;
      }

      setStage("form");
      setError(null);

      const { data, error: err } = await supabase
        .from("customers")
        .select("id, name, points_balance")
        .eq("id", id)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (err) {
        setError(err.message);
        setStage("scanning");
        return;
      }
      if (!data) {
        setError("Client introuvable pour ce restaurant.");
        setStage("scanning");
        return;
      }
      setCustomer(data as Customer);
    },
    [stage, restaurantId]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customer || !restaurantId) return;
    const parsed = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Montant invalide.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const amountCents = Math.round(parsed * 100);
    const delta = Math.round(parsed * pointsPerDollar);
    const userId = session?.user?.id ?? null;

    const { data: visit, error: visitErr } = await supabase
      .from("visits")
      .insert({
        restaurant_id: restaurantId,
        customer_id: customer.id,
        amount_cents: amountCents,
        registered_by: userId
      })
      .select("id")
      .single();

    if (visitErr || !visit) {
      setSubmitting(false);
      setError(visitErr?.message ?? "Échec enregistrement visite.");
      return;
    }

    const { error: txErr } = await supabase.from("points_transactions").insert({
      restaurant_id: restaurantId,
      customer_id: customer.id,
      delta,
      reason: "visit",
      visit_id: visit.id
    });

    if (txErr) {
      setSubmitting(false);
      setError(txErr.message);
      return;
    }

    const newBalance = (customer.points_balance ?? 0) + delta;
    const { error: balErr } = await supabase
      .from("customers")
      .update({ points_balance: newBalance })
      .eq("id", customer.id);

    setSubmitting(false);
    if (balErr) {
      setError(balErr.message);
      return;
    }

    setAwardedPoints(delta);
    setStage("success");
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-16">
        <header className="mb-10 flex flex-col gap-6 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight">Scanner</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Enregistrer une visite · {pointsPerDollar} pt / $ CAD
            </p>
          </div>
          <DashboardNav />
        </header>

        {bootError && (
          <p className="mb-6 text-xs text-red-400">{bootError}</p>
        )}

        {stage === "scanning" && (
          <section className="mx-auto max-w-md">
            <div className="relative aspect-square w-full overflow-hidden border border-zinc-800 bg-zinc-950">
              <Scanner
                onScan={handleDetected}
                onError={(err) =>
                  setError(err instanceof Error ? err.message : "Erreur caméra")
                }
                constraints={{ facingMode: "environment" }}
                formats={["qr_code"]}
                scanDelay={500}
                components={{ finder: false, audio: false, torch: true } as any}
                styles={{
                  container: { width: "100%", height: "100%" },
                  video: { width: "100%", height: "100%", objectFit: "cover" }
                }}
              />
              <div className="pointer-events-none absolute inset-6 border border-zinc-100/40" />
            </div>
            <p className="mt-6 text-center text-xs uppercase tracking-widest text-zinc-500">
              Pointez la caméra sur le code-barres du pass
            </p>
            {error && (
              <p className="mt-4 text-center text-xs text-red-400">{error}</p>
            )}
          </section>
        )}

        {stage === "form" && (
          <section className="mx-auto max-w-md">
            <div className="border border-zinc-800 p-8">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Ajouter des points pour
              </p>
              <h2 className="mt-2 text-2xl font-light tracking-tight text-zinc-100">
                {customer?.name ?? "—"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 tabular-nums">
                Solde actuel · {customer?.points_balance ?? 0} pts
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <label className="block">
                  <span className="text-xs uppercase tracking-widest text-zinc-500">
                    Montant dépensé ($)
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    autoFocus
                    required
                    className="mt-2 w-full bg-transparent border border-zinc-800 px-4 py-4 text-lg text-zinc-100 tabular-nums placeholder-zinc-700 focus:border-zinc-500 focus:outline-none transition-colors"
                  />
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetToScan}
                    disabled={submitting}
                    className="flex-1 border border-zinc-800 px-4 py-3 text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-40 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 border border-zinc-100 bg-zinc-100 px-4 py-3 text-sm font-medium text-black hover:bg-transparent hover:text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? "Enregistrement…" : "Ajouter"}
                  </button>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}
              </form>
            </div>
          </section>
        )}

        {stage === "success" && (
          <section className="mx-auto max-w-md text-center">
            <div className="border border-zinc-800 p-10">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Visite enregistrée
              </p>
              <p className="mt-6 text-5xl font-light tracking-tight text-zinc-100 tabular-nums">
                +{awardedPoints}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                points ajoutés à {customer?.name ?? "—"}
              </p>
              <button
                onClick={resetToScan}
                className="mt-10 w-full border border-zinc-100 bg-zinc-100 px-6 py-4 text-sm font-medium text-black hover:bg-transparent hover:text-zinc-100 transition-colors"
              >
                Scanner une autre carte
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function extractUuid(raw: string): string | null {
  const match = raw.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return match ? match[0] : null;
}

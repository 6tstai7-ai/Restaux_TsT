import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { Link } from "react-router-dom";
import { ArrowLeft, Flashlight, FlashlightOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

type Customer = {
  id: string;
  name: string | null;
  points_balance: number | null;
};

type Stage = "scanning" | "actions" | "visit" | "redeem" | "success";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FLOATING_CHIP =
  "rounded-full border border-border-strong/60 backdrop-blur-md " +
  "transition-colors duration-180 ease-out-punched";

const FLOATING_BG: React.CSSProperties = {
  backgroundColor: "color-mix(in srgb, var(--color-surface) 55%, transparent)"
};

export default function ScannerView() {
  const { session } = useSession();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [pointsPerDollar, setPointsPerDollar] = useState<number>(1);
  const [bootError, setBootError] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage>("scanning");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [torch, setTorch] = useState(false);

  const [amount, setAmount] = useState("");
  const [redeemReason, setRedeemReason] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delta, setDelta] = useState(0);

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

  // Drive torch via the live MediaStreamTrack; silent no-op on devices without support.
  useEffect(() => {
    const video = document.querySelector<HTMLVideoElement>("video");
    const stream = video?.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks?.()[0];
    if (!track) return;
    const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
    if (!caps.torch) return;
    track.applyConstraints({ advanced: [{ torch } as MediaTrackConstraintSet] }).catch(() => {});
  }, [torch]);

  const resetToScan = useCallback(() => {
    setCustomer(null);
    setAmount("");
    setRedeemReason("");
    setRedeemPoints("");
    setError(null);
    setDelta(0);
    setStage("scanning");
  }, []);

  useEffect(() => {
    if (stage === "scanning") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") resetToScan();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, resetToScan]);

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

      setStage("actions");
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

  async function handleVisit(e: FormEvent) {
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
    const d = Math.round(parsed * pointsPerDollar);

    const { error: rpcErr } = await supabase.rpc("record_visit_and_points", {
      p_restaurant_id: restaurantId,
      p_customer_id: customer.id,
      p_points_added: d,
      p_spend_amount: amountCents
    });

    setSubmitting(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }

    setDelta(d);
    setStage("success");
  }

  async function handleRedeem(e: FormEvent) {
    e.preventDefault();
    if (!customer || !restaurantId) return;

    const reason = redeemReason.trim();
    const pts = Number.parseInt(redeemPoints, 10);
    if (!reason) {
      setError("Raison requise.");
      return;
    }
    if (!Number.isFinite(pts) || pts <= 0) {
      setError("Points invalides.");
      return;
    }
    if (pts > (customer.points_balance ?? 0)) {
      setError("Solde insuffisant.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: rpcErr } = await supabase.rpc("record_redemption", {
      p_restaurant_id: restaurantId,
      p_customer_id: customer.id,
      p_points_deducted: pts,
      p_reason: reason
    });

    setSubmitting(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }

    setDelta(-pts);
    setStage("success");
  }

  return (
    <div className="fixed inset-0 bg-bg text-text">
      <div className="absolute inset-0">
        {restaurantId && (
          <Scanner
            onScan={handleDetected}
            onError={(err) =>
              setError(err instanceof Error ? err.message : "Erreur caméra")
            }
            constraints={{ facingMode: "environment" }}
            formats={["qr_code"]}
            scanDelay={500}
            components={{ finder: false, audio: false, torch: false } as never}
            styles={{
              container: { width: "100%", height: "100%" },
              video: { width: "100%", height: "100%", objectFit: "cover" }
            }}
          />
        )}
      </div>

      {stage === "scanning" && !bootError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-64 w-64 max-h-[70vw] max-w-[70vw] border border-text/40" />
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-6">
        <Link
          to="/dashboard"
          aria-label="Retour"
          className={`${FLOATING_CHIP} flex h-12 w-12 items-center justify-center text-text hover:text-text`}
          style={FLOATING_BG}
        >
          <ArrowLeft size={20} strokeWidth={1.75} />
        </Link>
        <button
          type="button"
          onClick={() => setTorch((t) => !t)}
          aria-label={torch ? "Éteindre la lampe" : "Allumer la lampe"}
          aria-pressed={torch}
          className={`${FLOATING_CHIP} flex h-12 w-12 items-center justify-center text-text`}
          style={FLOATING_BG}
        >
          {torch ? (
            <Flashlight size={20} strokeWidth={1.75} />
          ) : (
            <FlashlightOff size={20} strokeWidth={1.75} />
          )}
        </button>
      </div>

      {stage === "scanning" && !bootError && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center p-6">
          <p
            className={`${FLOATING_CHIP} px-4 py-2 text-micro uppercase text-text-muted`}
            style={FLOATING_BG}
          >
            Pointez la caméra sur le code QR
          </p>
        </div>
      )}

      {bootError && (
        <div className="absolute inset-x-0 bottom-24 flex justify-center px-6">
          <p
            className={`${FLOATING_CHIP} px-4 py-2 text-caption text-danger`}
            style={FLOATING_BG}
          >
            {bootError}
          </p>
        </div>
      )}

      {stage !== "scanning" && (
        <div
          role="dialog"
          aria-modal="true"
          className="absolute inset-x-0 bottom-0 border-t border-border bg-surface text-text"
        >
          <div className="mx-auto w-full max-w-md px-6 pb-8 pt-6">
            <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-border-strong" />

            {customer && (
              <>
                <p className="text-micro uppercase text-text-muted">Client</p>
                <h2 className="mt-1 font-display text-h2 text-text">
                  {customer.name ?? "—"}
                </h2>
                <p className="mt-2 font-mono text-body tabular-nums text-text-muted">
                  Solde · {(customer.points_balance ?? 0).toString()} pts
                </p>
              </>
            )}

            {stage === "actions" && (
              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={() => setStage("visit")}
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-brand px-6 text-body font-semibold text-brand-ink transition-colors duration-180 ease-out-punched hover:opacity-90"
                >
                  Enregistrer une visite
                </button>
                <button
                  type="button"
                  onClick={() => setStage("redeem")}
                  className="flex h-12 w-full items-center justify-center rounded-lg border border-border-strong bg-transparent px-6 text-body font-semibold text-text transition-colors duration-180 ease-out-punched hover:bg-surface-2"
                >
                  Rédemption
                </button>
                <button
                  type="button"
                  onClick={resetToScan}
                  className="flex h-12 w-full items-center justify-center px-6 text-caption text-text-muted transition-colors duration-180 ease-out-punched hover:text-text"
                >
                  Annuler
                </button>
              </div>
            )}

            {stage === "visit" && (
              <form onSubmit={handleVisit} className="mt-8 space-y-4">
                <label className="block">
                  <span className="text-caption text-text-muted">Montant dépensé ($)</span>
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
                    className="mt-2 block w-full rounded-lg border border-border bg-surface-2 px-4 py-3 font-mono text-body-l tabular-nums text-text placeholder:text-text-dim focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-border-strong/40"
                  />
                </label>
                <p className="text-caption text-text-muted">
                  Taux · {pointsPerDollar} pt / $ CAD
                </p>
                <FormFooter
                  submitting={submitting}
                  onCancel={() => setStage("actions")}
                  submitLabel="Enregistrer"
                />
                {error && <p className="text-caption text-danger">{error}</p>}
              </form>
            )}

            {stage === "redeem" && (
              <form onSubmit={handleRedeem} className="mt-8 space-y-4">
                <label className="block">
                  <span className="text-caption text-text-muted">Raison</span>
                  <input
                    type="text"
                    value={redeemReason}
                    onChange={(e) => setRedeemReason(e.target.value)}
                    placeholder="Ex. café offert"
                    autoFocus
                    required
                    maxLength={120}
                    className="mt-2 block w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-body text-text placeholder:text-text-dim focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-border-strong/40"
                  />
                </label>
                <label className="block">
                  <span className="text-caption text-text-muted">Points à retirer</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    value={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.value)}
                    placeholder="0"
                    required
                    className="mt-2 block w-full rounded-lg border border-border bg-surface-2 px-4 py-3 font-mono text-body-l tabular-nums text-text placeholder:text-text-dim focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-border-strong/40"
                  />
                </label>
                <FormFooter
                  submitting={submitting}
                  onCancel={() => setStage("actions")}
                  submitLabel="Rédemption"
                />
                {error && <p className="text-caption text-danger">{error}</p>}
              </form>
            )}

            {stage === "success" && (
              <div className="mt-8">
                <p className="text-micro uppercase text-text-muted">
                  {delta >= 0 ? "Visite enregistrée" : "Rédemption enregistrée"}
                </p>
                <p className="mt-3 font-mono text-display-l tabular-nums text-text">
                  {delta > 0 ? "+" : ""}
                  {delta}
                </p>
                <p className="mt-1 text-caption text-text-muted">
                  {delta >= 0 ? "points ajoutés" : "points retirés"}
                </p>
                <button
                  onClick={resetToScan}
                  className="mt-8 flex h-12 w-full items-center justify-center rounded-lg bg-brand px-6 text-body font-semibold text-brand-ink transition-colors duration-180 ease-out-punched hover:opacity-90"
                >
                  Scanner une autre carte
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FormFooter({
  submitting,
  onCancel,
  submitLabel
}: {
  submitting: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="flex h-12 flex-1 items-center justify-center rounded-lg border border-border-strong bg-transparent px-4 text-body font-semibold text-text transition-colors duration-180 ease-out-punched hover:bg-surface-2 disabled:opacity-40"
      >
        Annuler
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="flex h-12 flex-1 items-center justify-center rounded-lg bg-brand px-4 text-body font-semibold text-brand-ink transition-colors duration-180 ease-out-punched hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Envoi…" : submitLabel}
      </button>
    </div>
  );
}

function extractUuid(raw: string): string | null {
  const match = raw.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return match ? match[0] : null;
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, TrendingUp, Users, Smartphone } from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import DashboardNav from "@/components/DashboardNav";

const AUDIT_QUESTION = "Bonjour, quels sont vos 2-3 surplus ou produits à écouler aujourd'hui ?";
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

type AuditStatus = 'idle' | 'saving' | 'generating' | 'saved' | 'error';
type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

type RecentCustomer = {
  id: string;
  name: string | null;
  phone: string | null;
  points_balance: number | null;
  created_at: string;
};

type Kpis = { totalCustomers: number; totalPoints: number };

function formatRelative(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  return `Il y a ${Math.floor(diffH / 24)} j`;
}

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="h-4 w-32 bg-[var(--color-surface-2)] rounded" />
        <div className="h-5 w-5 bg-[var(--color-surface-2)] rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-12 w-28 bg-[var(--color-surface-2)] rounded" />
        <div className="h-3 w-40 bg-[var(--color-surface-2)] rounded mt-3" />
      </CardContent>
    </Card>
  );
}

function RecentRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-[var(--color-surface-2)] rounded-full" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-[var(--color-surface-2)] rounded" />
          <div className="h-3 w-44 bg-[var(--color-surface-2)] rounded" />
        </div>
      </div>
      <div className="h-4 w-16 bg-[var(--color-surface-2)] rounded" />
    </div>
  );
}

const DemoDashboard = () => {
  const { session } = useSession();
  const [surplusText, setSurplusText] = useState("Ailes de poulet (12 morceaux), Macaroni au fromage");
  const [auditStatus, setAuditStatus] = useState<AuditStatus>('idle');
  const [auditError, setAuditError] = useState<string | null>(null);
  const [generatedSms, setGeneratedSms] = useState<string | null>(null);
  const [promotionId, setPromotionId] = useState<string | null>(null);

  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendCount, setSendCount] = useState<number | null>(null);

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[] | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    let cancelled = false;
    (async () => {
      setMetricsLoading(true);
      setMetricsError(null);

      const { data: rest, error: restErr } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (restErr) {
        setMetricsError(restErr.message);
        setMetricsLoading(false);
        return;
      }
      if (!rest) {
        setKpis({ totalCustomers: 0, totalPoints: 0 });
        setRecentCustomers([]);
        setMetricsLoading(false);
        return;
      }

      const restaurantId = rest.id as string;

      const [countRes, sumRes, recentRes] = await Promise.all([
        supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId),
        supabase
          .from('customers')
          .select('points_balance')
          .eq('restaurant_id', restaurantId),
        supabase
          .from('customers')
          .select('id, name, phone, points_balance, created_at')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;

      const err = countRes.error?.message ?? sumRes.error?.message ?? recentRes.error?.message;
      if (err) {
        setMetricsError(err);
        setMetricsLoading(false);
        return;
      }

      const totalCustomers = countRes.count ?? 0;
      const totalPoints = (sumRes.data ?? []).reduce(
        (acc, row) => acc + (row.points_balance ?? 0),
        0
      );

      setKpis({ totalCustomers, totalPoints });
      setRecentCustomers((recentRes.data ?? []) as RecentCustomer[]);
      setMetricsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  async function handleGenerate() {
    const userId = session?.user?.id;
    if (!userId) {
      setAuditError("Session invalide — reconnectez-vous.");
      setAuditStatus('error');
      return;
    }
    setAuditStatus('saving');
    setAuditError(null);

    const { data: existing, error: fetchErr } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);
    if (fetchErr) {
      setAuditError(fetchErr.message);
      setAuditStatus('error');
      return;
    }

    let restaurantId = existing?.[0]?.id as string | undefined;
    if (!restaurantId) {
      const { data: created, error: createErr } = await supabase
        .from('restaurants')
        .insert({ owner_id: userId, name: 'La Boîte Jaune' })
        .select('id')
        .single();
      if (createErr || !created) {
        setAuditError(createErr?.message ?? "Création du restaurant échouée.");
        setAuditStatus('error');
        return;
      }
      restaurantId = created.id;
    }

    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .insert({
        restaurant_id: restaurantId,
        question: AUDIT_QUESTION,
        response: surplusText,
        status: 'pending'
      })
      .select('id')
      .single();
    if (auditErr || !audit) {
      setAuditError(auditErr?.message ?? "Insertion audit échouée.");
      setAuditStatus('error');
      return;
    }

    setAuditStatus('generating');
    try {
      const res = await fetch(`${API_BASE}/api/generate-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_id: audit.id })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) {
        setAuditError(payload.error ?? `Erreur API (${res.status})`);
        setAuditStatus('error');
        return;
      }
      setGeneratedSms(payload.sms ?? null);
      setPromotionId(payload.promotion_id ?? null);
      setSendStatus('idle');
      setSendError(null);
      setSendCount(null);
      setAuditStatus('saved');
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : 'Erreur réseau');
      setAuditStatus('error');
    }
  }

  async function handleSend() {
    if (!promotionId) return;
    setSendStatus('sending');
    setSendError(null);
    try {
      const res = await fetch(`${API_BASE}/api/promotions/${promotionId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) {
        setSendError(payload.error ?? `Erreur API (${res.status})`);
        setSendStatus('error');
        return;
      }
      setSendCount(payload.sent ?? 0);
      setSendStatus('sent');
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Erreur réseau');
      setSendStatus('error');
    }
  }

  const buttonDisabled = auditStatus === 'saving' || auditStatus === 'generating' || auditStatus === 'saved';
  const buttonText =
    auditStatus === 'saving'     ? "Enregistrement…" :
    auditStatus === 'generating' ? "Génération IA en cours…" :
    auditStatus === 'saved'      ? "Campagne générée — aperçu ci-dessous" :
                                   "Générer la campagne";

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 md:px-8 md:py-10 space-y-10 md:space-y-14">

        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center md:justify-between md:pb-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-h1 font-bold tracking-tight">RESTAUX</h1>
            <DashboardNav />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end md:gap-6">
            <p className="text-caption text-[var(--color-text-muted)]">Pilote — La Boîte Jaune</p>
            <Badge variant="warning">Mode Démo Actif</Badge>
          </div>
        </header>

        {/* KPIs — grid breakpoints per §4 */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
          {metricsLoading ? (
            <>
              <KpiSkeleton />
              <KpiSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Clients fidélisés
                  </CardTitle>
                  <Users size={20} strokeWidth={1.75} className="text-[var(--color-text-muted)]" />
                </CardHeader>
                <CardContent>
                  <div className="font-display font-bold tracking-tight tabular text-[clamp(2rem,6vw,2.75rem)] leading-[1.05]">
                    {(kpis?.totalCustomers ?? 0).toLocaleString('fr-CA')}
                  </div>
                  <p className="mt-2 text-caption text-[var(--color-text-dim)]">Base opt-in active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Points distribués
                  </CardTitle>
                  <TrendingUp size={20} strokeWidth={1.75} className="text-[var(--color-text-muted)]" />
                </CardHeader>
                <CardContent>
                  <div className="font-display font-bold tracking-tight tabular text-[clamp(2rem,6vw,2.75rem)] leading-[1.05]">
                    {(kpis?.totalPoints ?? 0).toLocaleString('fr-CA')}
                  </div>
                  <p className="mt-2 text-caption text-[var(--color-text-dim)]">Solde total fidélité</p>
                </CardContent>
              </Card>
            </>
          )}
        </section>

        {metricsError && (
          <div className="border border-[var(--color-danger)] bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-sm p-3 rounded-lg">
            Métriques indisponibles : {metricsError}
          </div>
        )}

        {/* Audit des Surplus — distinctive move: thick tenant-accent left bar */}
        <section>
          <Card className="relative overflow-hidden">
            <span
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--tenant-accent)]"
            />
            <div className="pl-1">
              <CardHeader>
                <CardTitle className="text-h2 font-display flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[var(--tenant-accent)] shrink-0" />
                  Audit des surplus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-body text-[var(--color-text-muted)]">{AUDIT_QUESTION}</p>
                <div>
                  <label
                    htmlFor="surplus"
                    className="block mb-2 text-caption text-[var(--color-text-muted)]"
                  >
                    Réponse libre
                  </label>
                  <textarea
                    id="surplus"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-4 text-body text-[var(--color-text)] focus:border-[var(--tenant-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-accent)]/30 h-32 disabled:opacity-60 transition-colors duration-180 ease-out-punched"
                    placeholder="Ex: 15 kg d'ailes de poulet, porc pour griot…"
                    value={surplusText}
                    onChange={(e) => setSurplusText(e.target.value)}
                    disabled={buttonDisabled}
                  />
                </div>
                {auditError && (
                  <div className="border border-[var(--color-danger)] bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-sm p-3 rounded-lg">
                    {auditError}
                  </div>
                )}
                <Button
                  variant="primary"
                  onClick={handleGenerate}
                  disabled={buttonDisabled || surplusText.trim().length === 0}
                  className="w-full"
                >
                  <Send size={20} strokeWidth={1.75} className="mr-2 shrink-0" />
                  <span>{buttonText}</span>
                </Button>
              </CardContent>
            </div>
          </Card>
        </section>

        {/* Section Bas : SMS et Clients */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">

          {/* Aperçu SMS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)] flex items-center gap-2">
                <span>Aperçu Promo SMS</span>
                {generatedSms && sendStatus !== 'sent' && <Badge variant="tenant">Généré IA</Badge>}
                {sendStatus === 'sent' && <Badge variant="success">Envoyée</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="font-mono text-body text-[var(--color-text)] leading-relaxed">
                {generatedSms ?? "Spécial ce soir à La Boîte Jaune ! Obtenez un extra Mac n Cheese gratuit à l'achat de nos fameuses ailes de poulet (12 mcx). Présentez votre carte Wallet. Valide aujourd'hui seulement !"}
              </p>

              {sendStatus === 'sent' && sendCount !== null && (
                <div className="border border-[var(--color-success)] bg-[var(--color-success)]/10 text-[var(--color-success)] text-sm p-3 rounded-lg">
                  Promotion envoyée à {sendCount} client{sendCount > 1 ? 's' : ''}.
                </div>
              )}

              {sendError && (
                <div className="border border-[var(--color-danger)] bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-sm p-3 rounded-lg">
                  {sendError}
                </div>
              )}

              {generatedSms && promotionId && sendStatus !== 'sent' && (
                <Button
                  variant="primary"
                  onClick={handleSend}
                  disabled={sendStatus === 'sending'}
                  className="w-full"
                >
                  <Send size={20} strokeWidth={1.75} className="mr-2 shrink-0" />
                  {sendStatus === 'sending' ? 'Envoi en cours…' : 'Envoyer la promotion'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Derniers clients inscrits */}
          <Card>
            <CardHeader className="border-b border-[var(--color-border)]">
              <CardTitle className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Smartphone size={20} strokeWidth={1.75} />
                  Derniers clients inscrits
                </span>
                <Badge variant="success">En direct</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--color-border)]">
                {metricsLoading ? (
                  <>
                    <RecentRowSkeleton />
                    <RecentRowSkeleton />
                    <RecentRowSkeleton />
                    <RecentRowSkeleton />
                  </>
                ) : recentCustomers && recentCustomers.length > 0 ? (
                  recentCustomers.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-4 hover:bg-[var(--color-surface-2)] transition-colors duration-180 ease-out-punched"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center font-display font-semibold text-[var(--color-text-muted)]">
                          {(c.name?.charAt(0) ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-body font-medium text-[var(--color-text)]">{c.name ?? 'Sans nom'}</p>
                          <p className="text-caption text-[var(--color-text-dim)]">
                            <span className="font-mono tabular">{c.phone ?? '—'}</span>
                            <span className="mx-1.5">·</span>
                            {formatRelative(c.created_at)}
                          </p>
                        </div>
                      </div>
                      <p className="text-caption font-semibold text-[var(--color-text)] tabular">
                        {(c.points_balance ?? 0).toLocaleString('fr-CA')} pts
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-caption text-[var(--color-text-dim)]">
                    Aucun client inscrit pour l'instant.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </section>
      </div>
    </div>
  );
};

export default DemoDashboard;

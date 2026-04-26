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
    <Card className="bg-zinc-900 border-zinc-800 text-white">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse" />
        <div className="h-6 w-6 bg-zinc-800 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-12 w-32 bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-44 bg-zinc-800 rounded animate-pulse mt-3" />
      </CardContent>
    </Card>
  );
}

function RecentRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-zinc-800 rounded-full animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-44 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
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
    auditStatus === 'generating' ? "Audit enregistré — Génération IA en cours…" :
    auditStatus === 'saved'      ? "Campagne IA générée — aperçu ci-dessous" :
                                   "GÉNÉRER LA CAMPAGNE IA";

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-7xl space-y-8 md:space-y-10">

        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-center md:justify-between md:pb-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-extrabold tracking-tighter italic md:text-3xl">RESTAUX.</h1>
            <DashboardNav />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end md:gap-8">
            <p className="text-zinc-500 text-base md:text-lg">Dashboard Pilote — La Boîte Jaune</p>
            <Badge variant="outline" className="text-yellow-500 border-yellow-500 text-xs px-3 py-1 md:text-base md:px-4 md:py-1.5">Mode Démo Actif</Badge>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
          {metricsLoading ? (
            <>
              <KpiSkeleton />
              <KpiSkeleton />
            </>
          ) : (
            <>
              <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between pb-3 md:pb-4">
                  <CardTitle className="text-base md:text-lg font-medium text-zinc-400">Clients fidélisés</CardTitle>
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl md:text-5xl font-extrabold tabular-nums">
                    {(kpis?.totalCustomers ?? 0).toLocaleString('fr-CA')}
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">Base opt-in active</p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between pb-3 md:pb-4">
                  <CardTitle className="text-base md:text-lg font-medium text-zinc-400">Points distribués</CardTitle>
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl md:text-5xl font-extrabold tabular-nums">
                    {(kpis?.totalPoints ?? 0).toLocaleString('fr-CA')}
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">Solde total fidélité</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {metricsError && (
          <div className="border border-red-500/60 bg-red-500/10 text-red-400 text-sm p-3 rounded-md">
            Métriques indisponibles : {metricsError}
          </div>
        )}

        {/* Audit des Surplus */}
        <div className="mt-8 md:mt-16">
          <Card className="bg-zinc-900 border-2 border-yellow-500/50 text-white">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl flex items-center gap-3">
                <span className="h-3 w-3 bg-yellow-500 rounded-full animate-pulse shrink-0" />
                Audit des Surplus Hebdomadaire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 md:space-y-6">
              <p className="text-zinc-400 text-base md:text-lg italic">"{AUDIT_QUESTION}"</p>
              <textarea
                className="w-full bg-black border border-zinc-700 rounded-lg p-4 md:p-6 text-base md:text-xl text-zinc-300 focus:border-yellow-500 outline-none h-40 disabled:opacity-60"
                placeholder="Ex: 15kg d'ailes de poulet, porc pour griot..."
                value={surplusText}
                onChange={(e) => setSurplusText(e.target.value)}
                disabled={buttonDisabled}
              />
              {auditError && (
                <div className="border border-red-500/60 bg-red-500/10 text-red-400 text-sm p-3 rounded-md">
                  {auditError}
                </div>
              )}
              <Button
                onClick={handleGenerate}
                disabled={buttonDisabled || surplusText.trim().length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 md:py-8 text-base md:text-2xl tracking-tight disabled:opacity-60 disabled:cursor-not-allowed whitespace-normal"
              >
                <Send className="mr-3 h-5 w-5 md:h-6 md:w-6 shrink-0" /> <span className="text-center">{buttonText}</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Section Bas : SMS et Clients */}
        <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">

          {/* Aperçu SMS */}
          <div className={`p-5 md:p-8 border rounded-xl bg-zinc-900/50 ${generatedSms ? 'border-yellow-500/60' : 'border-zinc-800 opacity-80'}`}>
            <h3 className="text-sm font-bold text-zinc-500 uppercase mb-4 tracking-widest flex items-center gap-2">
              Aperçu Promo SMS
              {generatedSms && sendStatus !== 'sent' && (
                <Badge variant="outline" className="text-yellow-500 border-yellow-500">Généré IA</Badge>
              )}
              {sendStatus === 'sent' && (
                <Badge variant="outline" className="text-emerald-400 border-emerald-400">Envoyée</Badge>
              )}
            </h3>
            <p className="text-lg italic font-mono text-zinc-300">
              "{generatedSms ?? "Spécial ce soir à La Boîte Jaune ! Obtenez un extra Mac n Cheese gratuit à l'achat de nos fameuses ailes de poulet (12 mcx). Présentez votre carte Wallet. Valide aujourd'hui seulement !"}"
            </p>

            {sendStatus === 'sent' && sendCount !== null && (
              <div className="mt-6 border border-emerald-500/60 bg-emerald-500/10 text-emerald-300 text-base font-bold p-4 rounded-md">
                Promotion envoyée à {sendCount} client{sendCount > 1 ? 's' : ''} !
              </div>
            )}

            {sendError && (
              <div className="mt-6 border border-red-500/60 bg-red-500/10 text-red-400 text-sm p-3 rounded-md">
                {sendError}
              </div>
            )}

            {generatedSms && promotionId && sendStatus !== 'sent' && (
              <Button
                onClick={handleSend}
                disabled={sendStatus === 'sending'}
                className="mt-6 w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-6 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Send className="mr-2 h-5 w-5" />
                {sendStatus === 'sending' ? 'Envoi en cours…' : 'Envoyer la promotion'}
              </Button>
            )}
          </div>

          {/* Derniers clients inscrits */}
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader className="pb-4 border-b border-zinc-800">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-zinc-400"/> Derniers clients inscrits</span>
                <Badge variant="outline" className="text-emerald-400 border-emerald-400">En direct</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="divide-y divide-zinc-800">
                {metricsLoading ? (
                  <>
                    <RecentRowSkeleton />
                    <RecentRowSkeleton />
                    <RecentRowSkeleton />
                    <RecentRowSkeleton />
                  </>
                ) : recentCustomers && recentCustomers.length > 0 ? (
                  recentCustomers.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-zinc-400 border border-zinc-700">
                          {(c.name?.charAt(0) ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-base">{c.name ?? 'Sans nom'}</p>
                          <p className="text-xs text-zinc-500">{c.phone ?? '—'} • {formatRelative(c.created_at)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-orange-400 font-bold">
                        {(c.points_balance ?? 0).toLocaleString('fr-CA')} pts
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-sm">
                    Aucun client inscrit pour l'instant.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default DemoDashboard;

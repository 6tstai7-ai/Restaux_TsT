import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { NavLink } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  CreditCard,
  LayoutDashboard,
  Package,
  ScanLine,
  Smartphone,
  TrendingUp,
  UserCircle,
  Users
} from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { deriveDashboardDecision, type DashboardDecision } from "@/lib/dashboardDecision";

const AUDIT_QUESTION = "Bonjour, quels sont vos 2-3 surplus ou produits à écouler aujourd'hui ?";
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
const dashboardTheme = {
  "--tenant-accent": "#3B82F6",
  "--tenant-accent-hover": "#60A5FA",
  "--tenant-accent-ink": "#F8FAFC",
  "--color-warning": "#60A5FA"
} as CSSProperties;

type AuditStatus = 'idle' | 'saving' | 'generating' | 'saved' | 'error';
type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

type RecentCustomer = {
  id: string;
  name: string | null;
  phone: string | null;
  points_balance: number | null;
  created_at: string;
};

type Kpis = { totalCustomers: number; totalPoints: number; totalSmsOptIns: number };
type TodayAction = {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  to?: string;
};

function formatRelative(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  return `Il y a ${Math.floor(diffH / 24)} j`;
}

function MobileHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate font-display text-h2 font-semibold tracking-tight text-[var(--color-text)]">
          Salut
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Profil"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
        >
          <UserCircle size={24} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </header>
  );
}

const quickActions = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/stock", label: "Stock", Icon: Package },
  { to: "/customers", label: "Clients", Icon: Users },
  { to: "/scanner", label: "Scanner", Icon: ScanLine },
  { to: "/loyalty", label: "Carte", Icon: CreditCard }
];

function QuickActionsRow() {
  return (
    <nav aria-label="Actions rapides" className="grid grid-cols-5 gap-2 sm:gap-3">
      {quickActions.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              "flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 text-center transition-colors duration-180 ease-out-punched",
              isActive
                ? "border-[var(--tenant-accent)] bg-[var(--tenant-accent)]/12 text-[var(--color-text)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
            ].join(" ")
          }
        >
          <Icon size={24} strokeWidth={1.75} aria-hidden />
          <span className="text-[0.72rem] font-semibold leading-tight">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function RecentRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 animate-pulse">
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

function TodaySkeleton() {
  return (
    <section aria-labelledby="today-loading" aria-busy="true" aria-live="polite">
      <Card className="relative overflow-hidden">
        <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--tenant-accent)]" />
        <div className="grid gap-6 p-5 pl-6 md:grid-cols-[1.4fr_0.9fr] md:p-6 md:pl-7 animate-pulse">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-3 w-24 bg-[var(--color-surface-2)] rounded" />
              <div className="h-6 w-32 bg-[var(--color-surface-2)] rounded-full" />
            </div>
            <div className="flex items-start gap-4">
              <div className="mt-1 h-6 w-6 bg-[var(--color-surface-2)] rounded-full shrink-0" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-7 w-3/4 bg-[var(--color-surface-2)] rounded" />
                <div className="h-7 w-1/2 bg-[var(--color-surface-2)] rounded" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full bg-[var(--color-surface-2)] rounded" />
                  <div className="h-3 w-5/6 bg-[var(--color-surface-2)] rounded" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:border-l md:border-[var(--color-border)] md:pl-6">
            <div className="space-y-2">
              <div className="h-3 w-32 bg-[var(--color-surface-2)] rounded" />
              <div className="h-4 w-full bg-[var(--color-surface-2)] rounded" />
              <div className="h-4 w-2/3 bg-[var(--color-surface-2)] rounded" />
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 space-y-2">
              <div className="h-3 w-24 bg-[var(--color-surface-2)] rounded" />
              <div className="h-3 w-full bg-[var(--color-surface-2)] rounded" />
            </div>
          </div>
        </div>
        <span id="today-loading" className="sr-only">Lecture des indicateurs en cours.</span>
      </Card>
    </section>
  );
}

function TodayDecisionSection({
  decision,
  primaryAction
}: {
  decision: DashboardDecision;
  primaryAction: TodayAction;
}) {
  const statusClass: Record<DashboardDecision["healthStatus"], string> = {
    critical: "border-[var(--color-danger)] text-[var(--color-danger)]",
    attention: "border-[var(--tenant-accent)]/70 text-[var(--tenant-accent)]",
    ready: "border-[var(--tenant-accent)] text-[var(--tenant-accent)]",
    success: "border-[var(--color-success)] text-[var(--color-success)]"
  };
  const iconClass: Record<DashboardDecision["healthStatus"], string> = {
    critical: "text-[var(--color-danger)]",
    attention: "text-[var(--tenant-accent)]",
    ready: "text-[var(--tenant-accent)]",
    success: "text-[var(--color-success)]"
  };
  const Icon =
    decision.healthStatus === "success"
      ? CheckCircle2
      : decision.healthStatus === "ready"
        ? CircleDot
        : AlertTriangle;
  const headline =
    decision.campaignState === "draft"
      ? "Campagne prête"
      : decision.campaignState === "sent"
        ? "Journée lancée"
        : decision.healthStatus === "critical"
          ? "À corriger"
          : decision.healthStatus === "attention"
            ? "À surveiller"
            : "Action du jour";
  const contextItems =
    decision.urgentAlerts.length > 0
      ? decision.urgentAlerts
      : [decision.explanation, decision.nextAction];
  const primaryButtonClass =
    "inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-[var(--tenant-accent)] px-6 py-3.5 text-sm font-semibold text-[var(--tenant-accent-ink)] transition-colors duration-180 ease-out-punched hover:bg-[var(--tenant-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-50 sm:w-auto";

  return (
    <section aria-labelledby="today-title">
      <Card className="relative overflow-hidden rounded-3xl">
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--tenant-accent)]"
        />
        <div className="grid gap-5 p-5 pl-6 md:grid-cols-[1.15fr_0.85fr] md:p-6 md:pl-8">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p id="today-title" className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                Aujourd'hui
              </p>
              <span className={`inline-flex items-center rounded-full border-[1.5px] bg-transparent px-3 py-1.5 text-micro uppercase tracking-[0.08em] ${statusClass[decision.healthStatus]}`}>
                {decision.statusLabel}
              </span>
            </div>
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] ${iconClass[decision.healthStatus]}`}>
                <Icon size={24} strokeWidth={1.75} aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-[clamp(1.85rem,8vw,2.75rem)] font-semibold leading-[1.02] tracking-tight text-[var(--color-text)]">
                  {headline}
                </h2>
                <p className="mt-3 max-w-2xl text-body text-[var(--color-text-muted)]">
                  {decision.headline}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:border-l md:border-[var(--color-border)] md:pl-6">
            <ul className="space-y-2.5">
              {contextItems.slice(0, 3).map((item) => (
                <li key={item} className="flex gap-2.5 text-caption text-[var(--color-text-muted)]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--tenant-accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {primaryAction.to ? (
              <NavLink to={primaryAction.to} className={primaryButtonClass}>
                {primaryAction.label}
              </NavLink>
            ) : (
              <Button
                variant="primary"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className="w-full whitespace-normal px-6 py-3.5 text-center leading-snug sm:w-auto"
              >
                {primaryAction.label}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}

type AiRecommendationSectionProps = {
  generatedSms: string | null;
  promotionId: string | null;
  totalSmsOptIns: number | null;
  metricsError: string | null;
  auditError: string | null;
  auditStatus: AuditStatus;
  sendStatus: SendStatus;
  onGenerate: () => void;
  onViewMessage: () => void;
  onSend: () => void;
  canGenerate: boolean;
};

function AiRecommendationSection({
  generatedSms,
  promotionId,
  totalSmsOptIns,
  metricsError,
  auditError,
  auditStatus,
  sendStatus,
  onGenerate,
  onViewMessage,
  onSend,
  canGenerate
}: AiRecommendationSectionProps) {
  const hasRecommendation = Boolean(generatedSms);
  const isGenerating = auditStatus === 'saving' || auditStatus === 'generating';
  const isSending = sendStatus === 'sending';
  const sendDisabled = !promotionId || sendStatus === 'sent' || isSending;
  const impactLabel =
    metricsError
      ? "Impact estimé indisponible pour le moment."
      : totalSmsOptIns !== null
        ? `Jusqu'à ${totalSmsOptIns.toLocaleString('fr-CA')} client${totalSmsOptIns > 1 ? 's' : ''} SMS opt-in à rejoindre.`
        : "Impact estimé après lecture des clients SMS opt-in.";

  return (
    <section aria-labelledby="ai-recommendation-title">
      <Card className="relative overflow-hidden rounded-3xl border-[var(--tenant-accent)]/35">
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--tenant-accent)]"
        />
        <CardContent className="p-5 pl-6 md:p-7 md:pl-8">
          <div className="min-w-0 space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <p
                  id="ai-recommendation-title"
                  className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)]"
                >
                  Recommandation IA
                </p>
                {hasRecommendation && sendStatus !== 'sent' && (
                  <Badge variant="tenant">Prête à envoyer</Badge>
                )}
                {sendStatus === 'sent' && (
                  <Badge variant="success">Campagne envoyée</Badge>
                )}
              </div>
              <h2 className="font-display text-h1 font-semibold tracking-tight text-[var(--color-text)]">
                {hasRecommendation ? "Envoyez la campagne maintenant" : "Générez la prochaine action"}
              </h2>
              <p className="max-w-2xl text-body text-[var(--color-text-muted)]">
                {hasRecommendation
                  ? "Votre message est prêt. Envoyez-le aux clients SMS opt-in ou vérifiez le texte avant l'envoi."
                  : "Transformez vos surplus du jour en campagne SMS prête à envoyer."}
              </p>
            </div>

            {auditError && (
              <div
                role="alert"
                className="flex gap-3 rounded-lg border border-[var(--color-warning)]/60 bg-[var(--color-warning)]/10 p-4 text-caption text-[var(--color-text)]"
              >
                <AlertTriangle
                  size={18}
                  strokeWidth={1.75}
                  className="mt-0.5 shrink-0 text-[var(--color-warning)]"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="font-medium">La recommandation n'a pas pu être générée.</p>
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    Réessayez dans un instant. Si le problème persiste, reconnectez-vous avant de relancer.
                  </p>
                </div>
              </div>
            )}

            {hasRecommendation ? (
              <div className="flex w-full flex-col gap-3 sm:max-w-md">
                <Button
                  variant="primary"
                  onClick={onSend}
                  disabled={sendDisabled}
                  className="w-full whitespace-normal px-6 py-3 text-center leading-snug"
                >
                  {isSending ? "Envoi en cours…" : "Envoyer la campagne"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={onViewMessage}
                  className="w-full whitespace-normal text-center leading-snug"
                >
                  Voir le message
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 md:max-w-2xl">
                <p className="text-body font-medium text-[var(--color-text)]">
                  Exemple : transformer un surplus d'ailes de poulet en promo SMS pour ce soir.
                </p>
                <p className="mt-1 text-caption text-[var(--color-text-muted)]">
                  Lancez l'IA après l'audit pour obtenir une recommandation exploitable.
                </p>
              </div>
            )}

            {hasRecommendation && generatedSms && (
              <div className="grid gap-3 md:max-w-3xl md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                  <p className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Message prêt
                  </p>
                  <p className="mt-2 line-clamp-3 font-mono text-caption leading-relaxed text-[var(--color-text)]">
                    {generatedSms}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                  <p className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Impact attendu
                  </p>
                  <p className="mt-1 text-body font-medium text-[var(--color-text)]">
                    {impactLabel}
                  </p>
                </div>
              </div>
            )}

            {!hasRecommendation && (
              <div className="flex w-full flex-col gap-3 sm:max-w-md">
                <Button
                  variant="primary"
                  onClick={onGenerate}
                  disabled={!canGenerate || isGenerating}
                  className="w-full whitespace-normal px-6 py-3 text-center leading-snug"
                >
                  {isGenerating ? "Génération en cours…" : "Générer la recommandation"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function KpiSummaryCard({
  metricsLoading,
  metricsError,
  kpis
}: {
  metricsLoading: boolean;
  metricsError: string | null;
  kpis: Kpis | null;
}) {
  const stats = [
    {
      label: "Clients",
      value: kpis?.totalCustomers ?? 0,
      helper: "fidélisés",
      Icon: Users
    },
    {
      label: "SMS",
      value: kpis?.totalSmsOptIns ?? 0,
      helper: "opt-in",
      Icon: Smartphone
    },
    {
      label: "Points",
      value: kpis?.totalPoints ?? 0,
      helper: "distribués",
      Icon: TrendingUp
    }
  ];

  return (
    <section aria-label="Indicateurs clés">
      <Card className="rounded-3xl">
        <CardContent className="p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                Vue rapide
              </p>
              <h2 className="mt-1 font-display text-h3 font-semibold text-[var(--color-text)]">
                Performance
              </h2>
            </div>
            {metricsLoading && (
              <Badge variant="tenant">Lecture</Badge>
            )}
            {metricsError && (
              <Badge variant="warning">À rafraîchir</Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {stats.map(({ label, value, helper, Icon }) => (
              <div
                key={label}
                className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                  <Icon size={18} strokeWidth={1.75} aria-hidden />
                </div>
                {metricsLoading ? (
                  <div className="h-7 w-12 animate-pulse rounded bg-[var(--color-surface)]" />
                ) : (
                  <p className="font-display text-[clamp(1.35rem,6vw,2rem)] font-bold leading-none tracking-tight text-[var(--color-text)]">
                    {metricsError ? "—" : value.toLocaleString('fr-CA')}
                  </p>
                )}
                <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                  {label}
                </p>
                <p className="mt-0.5 text-[0.72rem] leading-tight text-[var(--color-text-dim)]">
                  {helper}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

const DemoDashboard = () => {
  const { session } = useSession();
  const smsPreviewRef = useRef<HTMLDivElement>(null);
  const [surplusText] = useState("Ailes de poulet (12 morceaux), Macaroni au fromage");
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
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
        setHasRestaurant(false);
        setKpis({ totalCustomers: 0, totalPoints: 0, totalSmsOptIns: 0 });
        setRecentCustomers([]);
        setMetricsLoading(false);
        return;
      }

      setHasRestaurant(true);
      const restaurantId = rest.id as string;

      const [countRes, optInRes, sumRes, recentRes] = await Promise.all([
        supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId),
        supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('opt_in_sms', true),
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

      const err =
        countRes.error?.message ??
        optInRes.error?.message ??
        sumRes.error?.message ??
        recentRes.error?.message;
      if (err) {
        setMetricsError(err);
        setMetricsLoading(false);
        return;
      }

      const totalCustomers = countRes.count ?? 0;
      const totalSmsOptIns = optInRes.count ?? 0;
      const totalPoints = (sumRes.data ?? []).reduce(
        (acc, row) => acc + (row.points_balance ?? 0),
        0
      );

      setKpis({ totalCustomers, totalPoints, totalSmsOptIns });
      setRecentCustomers((recentRes.data ?? []) as RecentCustomer[]);
      setMetricsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, reloadKey]);

  async function handleGenerate() {
    const userId = session?.user?.id;
    const token = session?.access_token;
    if (!userId || !token) {
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
      setAuditError("Lecture du restaurant impossible — réessayez dans un instant.");
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
        setAuditError("Création du restaurant pilote impossible — réessayez dans un instant.");
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
      setAuditError("Enregistrement de votre réponse impossible — réessayez dans un instant.");
      setAuditStatus('error');
      return;
    }

    setAuditStatus('generating');
    try {
      const res = await fetch(`${API_BASE}/api/generate-promo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ audit_id: audit.id })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) {
        if (res.status === 401 || res.status === 403) {
          setAuditError("Session expirée — reconnectez-vous puis relancez la génération.");
        } else {
          setAuditError(payload.error ?? "La génération a échoué — réessayez dans un instant.");
        }
        setAuditStatus('error');
        return;
      }
      setGeneratedSms(payload.sms ?? null);
      setPromotionId(payload.promotion_id ?? null);
      setSendStatus('idle');
      setSendError(null);
      setSendCount(null);
      setAuditStatus('saved');
    } catch {
      setAuditError("Connexion interrompue — vérifiez votre internet puis réessayez.");
      setAuditStatus('error');
    }
  }

  async function handleSend() {
    if (!promotionId) return;
    const token = session?.access_token;
    if (!token) {
      setSendError("Session invalide — reconnectez-vous.");
      setSendStatus('error');
      return;
    }
    setSendStatus('sending');
    setSendError(null);
    try {
      const res = await fetch(`${API_BASE}/api/promotions/${promotionId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.success) {
        if (res.status === 401 || res.status === 403) {
          setSendError("Session expirée — reconnectez-vous puis relancez l'envoi.");
        } else {
          setSendError(payload.error ?? "L'envoi SMS a échoué — réessayez dans un instant.");
        }
        setSendStatus('error');
        return;
      }
      setSendCount(payload.sent ?? 0);
      setSendStatus('sent');
    } catch {
      setSendError("Connexion interrompue — vérifiez votre internet puis réessayez.");
      setSendStatus('error');
    }
  }

  function handleRetryMetrics() {
    setReloadKey((k) => k + 1);
  }

  function handleViewMessage() {
    smsPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const canGenerateRecommendation =
    surplusText.trim().length > 0 && auditStatus !== 'saving' && auditStatus !== 'generating';

  const todayDecision = deriveDashboardDecision({
    hasRestaurant,
    metricsLoading,
    metricsError,
    totalCustomers: kpis?.totalCustomers ?? 0,
    totalSmsOptIns: kpis?.totalSmsOptIns ?? null,
    recentCustomerCount: recentCustomers?.length ?? 0,
    generatedSms,
    sendStatus,
    sendError
  });
  const todayPrimaryAction: TodayAction =
    metricsError
      ? { label: "Réessayer", onClick: handleRetryMetrics, disabled: metricsLoading }
      : todayDecision.campaignState === "draft"
        ? { label: "Envoyer la campagne", onClick: handleSend, disabled: !promotionId || sendStatus === 'sending' }
        : todayDecision.campaignState === "sent"
          ? { label: "Scanner une visite", to: "/scanner" }
          : todayDecision.healthStatus === "attention" && (kpis?.totalCustomers ?? 0) === 0 && hasRestaurant
            ? { label: "Ajouter des clients", to: "/customers" }
            : { label: "Générer une recommandation", onClick: handleGenerate, disabled: !canGenerateRecommendation };

  return (
    <div
      className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans"
      style={dashboardTheme}
    >
      <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 md:px-8 md:py-8 space-y-6 md:space-y-8">

        <MobileHeader />
        <QuickActionsRow />

        {metricsLoading ? (
          <TodaySkeleton />
        ) : (
          <TodayDecisionSection decision={todayDecision} primaryAction={todayPrimaryAction} />
        )}

        <AiRecommendationSection
          generatedSms={generatedSms}
          promotionId={promotionId}
          totalSmsOptIns={kpis?.totalSmsOptIns ?? null}
          metricsError={metricsError}
          auditError={auditError}
          auditStatus={auditStatus}
          sendStatus={sendStatus}
          onGenerate={handleGenerate}
          onViewMessage={handleViewMessage}
          onSend={handleSend}
          canGenerate={canGenerateRecommendation}
        />

        <KpiSummaryCard metricsLoading={metricsLoading} metricsError={metricsError} kpis={kpis} />

        {metricsError && (
          <div
            role="status"
            className="rounded-lg border border-[var(--tenant-accent)]/60 bg-[var(--tenant-accent)]/10 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-body font-medium text-[var(--color-text)]">
                Indicateurs momentanément indisponibles
              </p>
              <p className="mt-1 text-caption text-[var(--color-text-muted)]">
                Vos données sont en sécurité. Réessayez dans un instant.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleRetryMetrics}
              disabled={metricsLoading}
              className="shrink-0"
            >
              {metricsLoading ? "Nouvelle tentative…" : "Réessayer"}
            </Button>
          </div>
        )}

        {/* Section Bas : SMS et Clients */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">

          {/* Aperçu SMS */}
          <Card ref={smsPreviewRef}>
            <CardHeader>
              <CardTitle className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)] flex items-center gap-2">
                <span>Aperçu Promo SMS</span>
                {generatedSms && sendStatus !== 'sent' && <Badge variant="tenant">Généré IA</Badge>}
                {sendStatus === 'sent' && <Badge variant="success">Envoyée</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {generatedSms ? (
                <p className="font-mono text-body text-[var(--color-text)] leading-relaxed">
                  {generatedSms}
                </p>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-5">
                  <p className="text-body font-medium text-[var(--color-text)]">
                    Aucune promo générée pour aujourd'hui
                  </p>
                  <p className="mt-1 text-caption text-[var(--color-text-muted)]">
                    Lancez la génération dans Recommandation IA pour faire apparaître le SMS ici.
                  </p>
                </div>
              )}

              {sendStatus === 'sent' && sendCount !== null && (
                <div
                  role="status"
                  className="rounded-lg border border-[var(--color-success)]/60 bg-[var(--color-success)]/10 p-4"
                >
                  <p className="text-caption font-medium text-[var(--color-text)]">
                    Promotion envoyée à {sendCount} client{sendCount > 1 ? 's' : ''}.
                  </p>
                </div>
              )}

              {sendError && (
                <div
                  role="alert"
                  className="rounded-lg border border-[var(--color-danger)]/70 bg-[var(--color-danger)]/10 p-4"
                >
                  <p className="text-caption font-medium text-[var(--color-text)]">
                    {sendError}
                  </p>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Derniers clients inscrits */}
          <Card>
            <CardHeader className="border-b border-[var(--color-border)]">
              <CardTitle className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)] flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <Smartphone size={20} strokeWidth={1.75} className="shrink-0" />
                  <span className="truncate">Derniers clients inscrits</span>
                </span>
                {!metricsLoading && !metricsError && (
                  <Badge variant="success">En direct</Badge>
                )}
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
                ) : metricsError ? (
                  <div className="p-8 text-center space-y-2">
                    <p className="text-body font-medium text-[var(--color-text)]">
                      Liste momentanément indisponible
                    </p>
                    <p className="text-caption text-[var(--color-text-muted)]">
                      Réessayez la lecture des indicateurs ci-dessus pour rafraîchir cette section.
                    </p>
                  </div>
                ) : recentCustomers && recentCustomers.length > 0 ? (
                  recentCustomers.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-[var(--color-surface-2)] transition-colors duration-180 ease-out-punched"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center font-display font-semibold text-[var(--color-text-muted)]">
                          {(c.name?.charAt(0) ?? '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-body font-medium text-[var(--color-text)] truncate">{c.name ?? 'Sans nom'}</p>
                          <p className="text-caption text-[var(--color-text-dim)] truncate">
                            <span className="font-mono tabular">{c.phone ?? '—'}</span>
                            <span className="mx-1.5">·</span>
                            {formatRelative(c.created_at)}
                          </p>
                        </div>
                      </div>
                      <p className="text-caption font-semibold text-[var(--color-text)] tabular shrink-0">
                        {(c.points_balance ?? 0).toLocaleString('fr-CA')} pts
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center space-y-2">
                    <p className="text-body font-medium text-[var(--color-text)]">
                      Aucun client inscrit pour l'instant
                    </p>
                    <p className="text-caption text-[var(--color-text-muted)]">
                      Ouvrez la page Clients pour ajouter un premier nom à fidéliser, ou partagez le QR d'inscription au comptoir.
                    </p>
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

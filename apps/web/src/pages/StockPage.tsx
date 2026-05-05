import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Package, Plus, Trash2 } from "lucide-react";
import type { InventoryAlert, InventoryCondition } from "@app/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardNav from "@/components/DashboardNav";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export type StockLineForm = {
  id: string;
  itemName: string;
  quantity: string;
  minQuantity: string;
  expiresOn: string;
  condition: InventoryCondition;
};

export type StockAlertGroups = {
  critical: InventoryAlert[];
  reorder: InventoryAlert[];
  sellQuickly: InventoryAlert[];
  surplus: InventoryAlert[];
};

type SaveStatus = "idle" | "saving" | "saved" | "error";
type CompleteStatus = "idle" | "completing" | "completed" | "error";
type StockCampaignStatus = "idle" | "creating" | "created" | "error";

type InventoryCompletePayload = {
  success?: boolean;
  error?: string;
  inventory_check_id?: string;
  alert_count?: number;
  alerts?: InventoryAlert[];
};

type InventoryDraftPayload = {
  success?: boolean;
  error?: string;
  inventory_check_id?: string;
};

type StockPromoAuditPayload = {
  success?: boolean;
  error?: string;
  audit_id?: string;
  audit_response?: string;
  sms?: string | null;
  promotion_id?: string;
};

type GeneratePromoPayload = {
  success?: boolean;
  error?: string;
  sms?: string;
  promotion_id?: string;
};

type LoadedStockCheck = {
  id: string;
  restaurant_id: string;
  week_start_date: string;
  status: "draft" | "completed";
};

export type LoadedStockLine = {
  item_name: string;
  quantity: number | string;
  min_quantity: number | string | null;
  target_quantity: number | string | null;
  expires_on: string | null;
  condition: InventoryCondition;
};

export type LoadedStockPayload = {
  success?: boolean;
  error?: string;
  check?: LoadedStockCheck | null;
  lines?: LoadedStockLine[];
  alerts?: InventoryAlert[];
};

const conditionLabels: Record<InventoryCondition, string> = {
  ok: "OK",
  watch: "À surveiller",
  bad: "Mauvais"
};

export function createEmptyStockLine(): StockLineForm {
  return {
    id: crypto.randomUUID(),
  itemName: "",
  quantity: "",
  minQuantity: "",
  expiresOn: "",
  condition: "ok"
  };
}

export function getCurrentWeekStartDate(now = new Date()): string {
  const day = now.getDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, "0"),
    String(monday.getDate()).padStart(2, "0")
  ].join("-");
}

export function buildInventoryLinesPayload(lines: StockLineForm[]) {
  return lines.map((line) => ({
    item_name: line.itemName.trim(),
    quantity: Number(line.quantity),
    ...(line.minQuantity.trim() ? { min_quantity: Number(line.minQuantity) } : {}),
    ...(line.expiresOn ? { expires_on: line.expiresOn } : {}),
    condition: line.condition
  }));
}

export function validateStockLines(lines: StockLineForm[]): string | null {
  if (lines.length === 0) return "Ajoutez au moins un produit.";

  for (const [index, line] of lines.entries()) {
    const label = `Ligne ${index + 1}`;
    if (!line.itemName.trim()) return `${label}: nom du produit requis.`;
    if (!isNonNegativeNumber(line.quantity)) return `${label}: quantité invalide.`;
    if (line.minQuantity.trim() && !isNonNegativeNumber(line.minQuantity)) {
      return `${label}: minimum invalide.`;
    }
  }

  return null;
}

export function groupStockAlerts(alerts: InventoryAlert[]): StockAlertGroups {
  return {
    critical: alerts.filter((alert) => alert.type === "critical"),
    reorder: alerts.filter((alert) => alert.type === "reorder"),
    sellQuickly: alerts.filter((alert) => alert.type === "sell_quickly"),
    surplus: alerts.filter((alert) => alert.type === "surplus")
  };
}

export function hasStockCampaignOpportunity(alerts: InventoryAlert[]): boolean {
  return alerts.some((alert) => alert.type === "sell_quickly" || alert.type === "surplus");
}

export function mapLoadedLinesToStockLines(lines: LoadedStockLine[]): StockLineForm[] {
  if (lines.length === 0) return [createEmptyStockLine()];

  return lines.map((line) => ({
    id: crypto.randomUUID(),
    itemName: line.item_name,
    quantity: String(line.quantity),
    minQuantity: optionalNumberToInput(line.min_quantity),
    expiresOn: line.expires_on ?? "",
    condition: conditionLabels[line.condition] ? line.condition : "ok"
  }));
}

export function mapLoadedCheckToStockState(payload: LoadedStockPayload) {
  const check = payload.check ?? null;
  const alerts = payload.alerts ?? [];

  if (!check) {
    return {
      inventoryCheckId: null,
      lines: [createEmptyStockLine()],
      alerts: [] as InventoryAlert[],
      saveStatus: "idle" as SaveStatus,
      completeStatus: "idle" as CompleteStatus,
      successMessage: null as string | null
    };
  }

  const completed = check.status === "completed";
  return {
    inventoryCheckId: check.id,
    lines: mapLoadedLinesToStockLines(payload.lines ?? []),
    alerts: completed ? alerts : [],
    saveStatus: "saved" as SaveStatus,
    completeStatus: completed ? ("completed" as CompleteStatus) : ("idle" as CompleteStatus),
    successMessage: completed ? "Inventaire complété repris." : "Brouillon repris."
  };
}

function isNonNegativeNumber(value: string): boolean {
  const parsed = Number(value);
  return value.trim().length > 0 && Number.isFinite(parsed) && parsed >= 0;
}

function optionalNumberToInput(value: number | string | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function StockHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <NavLink
          to="/dashboard"
          className="text-caption text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          Restaux
        </NavLink>
        <h1 className="mt-1 font-display text-h2 font-semibold tracking-tight text-[var(--color-text)]">
          Stock de la semaine
        </h1>
      </div>
      <div className="shrink-0">
        <DashboardNav />
      </div>
    </header>
  );
}

function AlertGroup({
  title,
  alerts,
  tone
}: {
  title: string;
  alerts: InventoryAlert[];
  tone: "danger" | "warning" | "tenant" | "info";
}) {
  if (alerts.length === 0) return null;

  const toneClass = {
    danger: "border-[var(--color-danger)]/60 bg-[var(--color-danger)]/10",
    warning: "border-[var(--color-warning)]/60 bg-[var(--color-warning)]/10",
    tenant: "border-[var(--tenant-accent)]/50 bg-[var(--tenant-accent)]/10",
    info: "border-[var(--color-info)]/60 bg-[var(--color-info)]/10"
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <h3 className="text-caption font-semibold uppercase tracking-[0.08em] text-[var(--color-text)]">
        {title}
      </h3>
      <div className="mt-3 space-y-3">
        {alerts.map((alert) => (
          <div key={`${alert.type}-${alert.itemName}-${alert.message}`} className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 break-words font-medium text-[var(--color-text)]">
                {alert.itemName}
              </p>
              <span className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                {alert.severity}
              </span>
            </div>
            <p className="break-words text-caption text-[var(--color-text-muted)]">
              {alert.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StockPage() {
  const { session } = useSession();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [restaurantError, setRestaurantError] = useState<string | null>(null);
  const [lines, setLines] = useState<StockLineForm[]>([createEmptyStockLine()]);
  const [inventoryCheckId, setInventoryCheckId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [completeStatus, setCompleteStatus] = useState<CompleteStatus>("idle");
  const [stockCampaignStatus, setStockCampaignStatus] = useState<StockCampaignStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stockCampaignError, setStockCampaignError] = useState<string | null>(null);
  const [generatedSms, setGeneratedSms] = useState<string | null>(null);
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);

  const weekStartDate = useMemo(() => getCurrentWeekStartDate(), []);
  const groupedAlerts = useMemo(() => groupStockAlerts(alerts), [alerts]);
  const readOnlyCompleted = completeStatus === "completed";
  const hasGeneratedStockCampaign =
    stockCampaignStatus === "created" && (!!generatedSms || !!promotionId);
  const canCreateStockCampaign =
    readOnlyCompleted &&
    !!inventoryCheckId &&
    hasStockCampaignOpportunity(alerts) &&
    !hasGeneratedStockCampaign;
  const busy =
    saveStatus === "saving" ||
    completeStatus === "completing" ||
    stockCampaignStatus === "creating" ||
    loadingRestaurant ||
    loadingCheck;

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    let cancelled = false;
    setLoadingRestaurant(true);
    setRestaurantError(null);

    supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        if (loadError) {
          setRestaurantError("Lecture du restaurant impossible. Réessayez dans un instant.");
          setLoadingRestaurant(false);
          return;
        }
        if (!data?.id) {
          setRestaurantError("Aucun restaurant associé à cette session.");
          setLoadingRestaurant(false);
          return;
        }
        setRestaurantId(data.id as string);
        setLoadingRestaurant(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!restaurantId) return;
    const token = session?.access_token;
    if (!token) return;

    let cancelled = false;
    setLoadingCheck(true);
    setError(null);
    setSuccessMessage(null);

    const params = new URLSearchParams({
      restaurant_id: restaurantId,
      week_start_date: weekStartDate
    });

    fetch(`${API_BASE}/api/inventory/checks/current-week?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as LoadedStockPayload;
        if (!response.ok || !payload.success) {
          throw new Error(payload.error ?? "Lecture du brouillon impossible.");
        }
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        const loaded = mapLoadedCheckToStockState(payload);
        setInventoryCheckId(loaded.inventoryCheckId);
        setLines(loaded.lines);
        setAlerts(loaded.alerts);
        setSaveStatus(loaded.saveStatus);
        setCompleteStatus(loaded.completeStatus);
        setSuccessMessage(loaded.successMessage);
        setLoadingCheck(false);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Lecture du brouillon impossible.");
        setLoadingCheck(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantId, session?.access_token, weekStartDate]);

  function updateLine(id: string, patch: Partial<StockLineForm>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
    setSaveStatus("idle");
    setCompleteStatus("idle");
    setStockCampaignStatus("idle");
    setStockCampaignError(null);
    setGeneratedSms(null);
    setPromotionId(null);
    setSuccessMessage(null);
  }

  function addLine() {
    setLines((current) => [...current, createEmptyStockLine()]);
  }

  function removeLine(id: string) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.id !== id)
    );
  }

  async function saveDraft(): Promise<string | null> {
    const validationError = validateStockLines(lines);
    if (validationError) {
      setError(validationError);
      setSaveStatus("error");
      return null;
    }
    if (!restaurantId) {
      setError(restaurantError ?? "Restaurant introuvable.");
      setSaveStatus("error");
      return null;
    }
    const token = session?.access_token;
    if (!token) {
      setError("Session expirée. Reconnectez-vous.");
      setSaveStatus("error");
      return null;
    }

    setSaveStatus("saving");
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api/inventory/checks/current-week/draft`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          week_start_date: weekStartDate,
          lines: buildInventoryLinesPayload(lines)
        })
      });
      const payload = (await response.json().catch(() => ({}))) as InventoryDraftPayload;
      if (!response.ok || !payload.success || !payload.inventory_check_id) {
        setSaveStatus("error");
        setError(payload.error ?? "Enregistrement du brouillon impossible.");
        return null;
      }
      setInventoryCheckId(payload.inventory_check_id);
      setSaveStatus("saved");
      setSuccessMessage("Brouillon enregistré.");
      return payload.inventory_check_id;
    } catch {
      setSaveStatus("error");
      setError("Connexion interrompue. Vérifiez votre internet puis réessayez.");
      return null;
    }
  }

  async function completeCheck() {
    const checkId = inventoryCheckId ?? (await saveDraft());
    const validationError = validateStockLines(lines);
    if (validationError) {
      setError(validationError);
      setCompleteStatus("error");
      return;
    }
    if (!checkId) return;

    const token = session?.access_token;
    if (!token) {
      setError("Session expirée. Reconnectez-vous.");
      setCompleteStatus("error");
      return;
    }

    setCompleteStatus("completing");
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api/inventory/checks/${checkId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ lines: buildInventoryLinesPayload(lines) })
      });
      const payload = (await response.json().catch(() => ({}))) as InventoryCompletePayload;
      if (!response.ok || !payload.success) {
        setCompleteStatus("error");
        setError(payload.error ?? "Impossible de compléter l'inventaire.");
        return;
      }
      setInventoryCheckId(payload.inventory_check_id ?? checkId);
      setAlerts(payload.alerts ?? []);
      setStockCampaignStatus("idle");
      setStockCampaignError(null);
      setGeneratedSms(null);
      setPromotionId(null);
      setCompleteStatus("completed");
      setSaveStatus("saved");
      setSuccessMessage(
        (payload.alert_count ?? payload.alerts?.length ?? 0) > 0
          ? "Inventaire complété. Alertes générées."
          : "Inventaire complété. Aucune alerte détectée."
      );
    } catch {
      setCompleteStatus("error");
      setError("Connexion interrompue. Vérifiez votre internet puis réessayez.");
    }
  }

  async function createStockCampaign() {
    if (!inventoryCheckId) return;
    const token = session?.access_token;
    if (!token) {
      setStockCampaignError("Session expirée. Reconnectez-vous.");
      setStockCampaignStatus("error");
      return;
    }

    setStockCampaignStatus("creating");
    setStockCampaignError(null);
    setGeneratedSms(null);
    setPromotionId(null);

    try {
      const auditResponse = await fetch(
        `${API_BASE}/api/inventory/checks/${inventoryCheckId}/stock-promo-audit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      const auditPayload = (await auditResponse.json().catch(() => ({}))) as StockPromoAuditPayload;
      if (!auditResponse.ok || !auditPayload.success || !auditPayload.audit_id) {
        setStockCampaignStatus("error");
        setStockCampaignError(
          auditPayload.error ?? "Impossible de préparer l'audit stock pour la campagne."
        );
        return;
      }

      if (auditPayload.promotion_id || auditPayload.sms) {
        setGeneratedSms(auditPayload.sms ?? null);
        setPromotionId(auditPayload.promotion_id ?? null);
        setStockCampaignStatus("created");
        return;
      }

      const promoResponse = await fetch(`${API_BASE}/api/generate-promo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ audit_id: auditPayload.audit_id })
      });
      const promoPayload = (await promoResponse.json().catch(() => ({}))) as GeneratePromoPayload;
      if (!promoResponse.ok || !promoPayload.success) {
        setStockCampaignStatus("error");
        setStockCampaignError(
          promoPayload.error ?? "La génération de la campagne stock a échoué."
        );
        return;
      }

      setGeneratedSms(promoPayload.sms ?? null);
      setPromotionId(promoPayload.promotion_id ?? null);
      setStockCampaignStatus("created");
    } catch {
      setStockCampaignStatus("error");
      setStockCampaignError("Connexion interrompue. Vérifiez votre internet puis réessayez.");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans">
      <div className="mx-auto w-full max-w-[1180px] space-y-6 px-4 py-5 sm:px-6 md:px-8 md:py-8">
        <StockHeader />

        <section className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--tenant-accent)] text-[var(--tenant-accent-ink)]">
            <Package size={26} strokeWidth={1.75} aria-hidden />
          </div>
          <p className="max-w-2xl text-body text-[var(--color-text-muted)]">
            Mettez à jour les produits importants. Restaux détecte les alertes et les opportunités de campagne.
          </p>
          <p className="text-caption text-[var(--color-text-dim)]">Semaine du {weekStartDate}</p>
        </section>

        <Card className="rounded-3xl">
          <CardContent className="space-y-5 p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Produits
                </p>
                <h2 className="mt-1 font-display text-h3 font-semibold text-[var(--color-text)]">
                  Relevé rapide
                </h2>
              </div>
              <Badge variant={completeStatus === "completed" ? "success" : "tenant"}>
                {completeStatus === "completed" ? "Complété" : "Brouillon"}
              </Badge>
            </div>

            <div className="space-y-4">
              {lines.map((line, index) => (
                <div
                  key={line.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-caption font-semibold text-[var(--color-text)]">
                      Produit {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length === 1 || busy || readOnlyCompleted}
                      aria-label="Retirer le produit"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] disabled:opacity-40"
                    >
                      <Trash2 size={18} strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-12">
                    <label className="grid gap-1.5 md:col-span-4">
                      <span className="text-caption text-[var(--color-text-muted)]">Nom</span>
                      <input
                        value={line.itemName}
                        onChange={(event) => updateLine(line.id, { itemName: event.target.value })}
                        disabled={busy || readOnlyCompleted}
                        className="min-h-[46px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--tenant-accent)]"
                        placeholder="Produit"
                      />
                    </label>
                    <label className="grid gap-1.5 md:col-span-2">
                      <span className="text-caption text-[var(--color-text-muted)]">Quantité</span>
                      <input
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                        inputMode="decimal"
                        disabled={busy || readOnlyCompleted}
                        className="min-h-[46px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--tenant-accent)]"
                        placeholder="0"
                      />
                    </label>
                    <label className="grid gap-1.5 md:col-span-2">
                      <span className="text-caption text-[var(--color-text-muted)]">Min</span>
                      <input
                        value={line.minQuantity}
                        onChange={(event) => updateLine(line.id, { minQuantity: event.target.value })}
                        inputMode="decimal"
                        disabled={busy || readOnlyCompleted}
                        className="min-h-[46px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--tenant-accent)]"
                        placeholder="Optionnel"
                      />
                    </label>
                    <label className="grid gap-1.5 md:col-span-2">
                      <span className="text-caption text-[var(--color-text-muted)]">Expire</span>
                      <input
                        value={line.expiresOn}
                        onChange={(event) => updateLine(line.id, { expiresOn: event.target.value })}
                        type="date"
                        disabled={busy || readOnlyCompleted}
                        className="min-h-[46px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--tenant-accent)]"
                      />
                    </label>
                    <label className="grid gap-1.5 md:col-span-2">
                      <span className="text-caption text-[var(--color-text-muted)]">État</span>
                      <select
                        value={line.condition}
                        onChange={(event) =>
                          updateLine(line.id, { condition: event.target.value as InventoryCondition })
                        }
                        disabled={busy || readOnlyCompleted}
                        className="min-h-[46px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--tenant-accent)]"
                      >
                        {Object.entries(conditionLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLine}
              disabled={busy || readOnlyCompleted}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border-strong)] text-caption font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-2)] disabled:opacity-50"
            >
              <Plus size={18} strokeWidth={1.75} aria-hidden />
              Ajouter un produit
            </button>

            {restaurantError && (
              <div role="alert" className="rounded-lg border border-[var(--color-warning)]/60 bg-[var(--color-warning)]/10 p-4 text-caption text-[var(--color-text)]">
                {restaurantError}
              </div>
            )}
            {loadingCheck && (
              <div role="status" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-caption text-[var(--color-text-muted)]">
                Chargement du contrôle de la semaine...
              </div>
            )}
            {error && (
              <div role="alert" className="flex gap-3 rounded-lg border border-[var(--color-danger)]/60 bg-[var(--color-danger)]/10 p-4 text-caption text-[var(--color-text)]">
                <AlertTriangle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div role="status" className="flex gap-3 rounded-lg border border-[var(--color-success)]/60 bg-[var(--color-success)]/10 p-4 text-caption text-[var(--color-text)]">
                <CheckCircle2 size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="secondary"
                onClick={() => void saveDraft()}
                disabled={busy || readOnlyCompleted}
                className="w-full"
              >
                {saveStatus === "saving" ? "Enregistrement..." : "Enregistrer le brouillon"}
              </Button>
              <Button
                variant="primary"
                onClick={() => void completeCheck()}
                disabled={busy || readOnlyCompleted}
                className="w-full"
              >
                {completeStatus === "completing" ? "Analyse en cours..." : "Compléter le contrôle"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <section aria-labelledby="stock-alerts-title">
          <Card className="rounded-3xl">
            <CardContent className="space-y-4 p-5 md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Alertes
                  </p>
                  <h2 id="stock-alerts-title" className="mt-1 font-display text-h3 font-semibold text-[var(--color-text)]">
                    Résultat du contrôle
                  </h2>
                </div>
                <Button
                  variant="secondary"
                  disabled={!canCreateStockCampaign || busy}
                  onClick={() => void createStockCampaign()}
                  className="w-full sm:w-auto"
                >
                  {stockCampaignStatus === "creating"
                    ? "Création en cours..."
                    : hasGeneratedStockCampaign
                      ? "Campagne stock prête"
                      : "Créer une campagne stock"}
                </Button>
              </div>

              {stockCampaignError && (
                <div role="alert" className="rounded-lg border border-[var(--color-danger)]/60 bg-[var(--color-danger)]/10 p-4 text-caption text-[var(--color-text)]">
                  {stockCampaignError}
                </div>
              )}
              {stockCampaignStatus === "created" && (
                <div role="status" className="rounded-2xl border border-[var(--color-success)]/60 bg-[var(--color-success)]/10 p-4">
                  <p className="text-caption font-semibold text-[var(--color-text)]">
                    Campagne stock prête
                  </p>
                  {generatedSms ? (
                    <p className="mt-2 whitespace-pre-wrap break-words text-body text-[var(--color-text)]">
                      {generatedSms}
                    </p>
                  ) : (
                    <p className="mt-2 text-caption text-[var(--color-text-muted)]">
                      Promotion générée.
                    </p>
                  )}
                  {promotionId && (
                    <p className="mt-2 break-all text-micro uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      Promotion {promotionId}
                    </p>
                  )}
                </div>
              )}

              {alerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-5">
                  <p className="text-body font-medium text-[var(--color-text)]">
                    Aucune alerte affichée.
                  </p>
                  <p className="mt-1 text-caption text-[var(--color-text-muted)]">
                    Complétez le contrôle pour voir les produits critiques, à recommander ou à écouler.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <AlertGroup title="Critique" alerts={groupedAlerts.critical} tone="danger" />
                  <AlertGroup title="À recommander" alerts={groupedAlerts.reorder} tone="warning" />
                  <AlertGroup title="À écouler" alerts={groupedAlerts.sellQuickly} tone="tenant" />
                  <AlertGroup title="Surplus" alerts={groupedAlerts.surplus} tone="info" />
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

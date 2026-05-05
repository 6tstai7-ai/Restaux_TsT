import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deriveInventoryAlerts,
  type InventoryAlert,
  type InventoryCheckLine,
  type InventoryCondition
} from "@app/shared";
import { requireRestaurantOwner, requireUserId } from "./auth.js";

type InventoryLineInput = {
  item_name?: unknown;
  quantity?: unknown;
  min_quantity?: unknown;
  target_quantity?: unknown;
  expires_on?: unknown;
  condition?: unknown;
  note?: unknown;
};

type ValidatedLine = InventoryCheckLine & {
  note: string | null;
};

type InventoryItemRow = {
  id: string;
  name: string;
};

type InventoryCheckRow = {
  id: string;
  restaurant_id: string;
  week_start_date: string;
  status: "draft" | "completed";
};

type InventoryCheckLineRow = {
  id: string;
  inventory_item_id: string;
  item_name?: string | null;
  quantity: number | string;
  min_quantity_snapshot: number | string | null;
  target_quantity_snapshot: number | string | null;
  expires_on: string | null;
  condition: InventoryCondition;
  note: string | null;
};

type InventoryAlertRow = {
  alert_type: InventoryAlert["type"];
  severity: InventoryAlert["severity"];
  item_name: string;
  message: string;
  score: number;
  alert_snapshot: unknown;
};

type StockPromoAuditRow = {
  id: string;
  response: string;
};

type StockPromoDraftRow = {
  id: string;
  content_sms: string | null;
};

const VALID_CONDITIONS = new Set<InventoryCondition>(["ok", "watch", "bad"]);
const STOCK_AUDIT_QUESTION =
  "Quels produits du stock complété devraient devenir une campagne SMS aujourd'hui?";

const STOCK_AUDIT_MARKER_PREFIX = "stock-promo:inventory-check:";

export function createGetCurrentWeekInventoryCheckController(supabase: SupabaseClient) {
  return async (req: Request, res: Response) => {
    const userId = await requireUserId(supabase, req, res);
    if (!userId) return res;

    const restaurantId = readString(req.query.restaurant_id).trim();
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: "restaurant_id requis" });
    }

    const weekStartDate =
      readString(req.query.week_start_date).trim() || getCurrentWeekStartDate();
    if (!isDateOnly(weekStartDate)) {
      return res.status(400).json({
        success: false,
        error: "week_start_date doit utiliser le format YYYY-MM-DD"
      });
    }

    const allowed = await requireRestaurantOwner(supabase, restaurantId, userId, res);
    if (!allowed) return res;

    const { data: check, error: checkError } = await supabase
      .from("inventory_checks")
      .select("id, restaurant_id, week_start_date, status")
      .eq("restaurant_id", restaurantId)
      .eq("week_start_date", weekStartDate)
      .maybeSingle<InventoryCheckRow>();

    if (checkError) {
      return res.status(500).json({
        success: false,
        error: `lecture de l'inventaire echouee: ${checkError.message}`
      });
    }

    if (!check) {
      return res.json({
        success: true,
        check: null,
        lines: [],
        alerts: []
      });
    }

    const lines = await loadCheckLines(supabase, check.id);
    if (!lines.ok) {
      return res.status(500).json({ success: false, error: lines.error });
    }

    let alerts: InventoryAlert[] = [];
    if (check.status === "completed") {
      const loadedAlerts = await loadCheckAlerts(supabase, check.id);
      if (!loadedAlerts.ok) {
        return res.status(500).json({ success: false, error: loadedAlerts.error });
      }
      alerts = loadedAlerts.alerts;
    }

    return res.json({
      success: true,
      check: {
        id: check.id,
        restaurant_id: check.restaurant_id,
        week_start_date: check.week_start_date,
        status: check.status
      },
      lines: lines.lines.map(toLineResponse),
      alerts
    });
  };
}

export function createCreateInventoryStockPromoAuditController(supabase: SupabaseClient) {
  return async (req: Request, res: Response) => {
    const userId = await requireUserId(supabase, req, res);
    if (!userId) return res;

    const rawCheckId = req.params.id;
    const checkId = Array.isArray(rawCheckId) ? rawCheckId[0] : rawCheckId;
    if (!checkId || typeof checkId !== "string") {
      return res.status(400).json({ success: false, error: "inventory_check_id requis" });
    }

    const { data: check, error: checkError } = await supabase
      .from("inventory_checks")
      .select("id, restaurant_id, week_start_date, status")
      .eq("id", checkId)
      .single<InventoryCheckRow>();
    if (checkError || !check) {
      return res
        .status(404)
        .json({ success: false, error: checkError?.message ?? "inventaire introuvable" });
    }

    const allowed = await requireRestaurantOwner(supabase, check.restaurant_id, userId, res);
    if (!allowed) return res;
    if (check.status !== "completed") {
      return res.status(409).json({ success: false, error: "inventaire non complete" });
    }

    const loadedAlerts = await loadCheckAlerts(supabase, check.id);
    if (!loadedAlerts.ok) {
      return res.status(500).json({ success: false, error: loadedAlerts.error });
    }

    const baseResponse = buildInventoryAuditResponse(loadedAlerts.alerts);
    if (!baseResponse) {
      return res.status(409).json({
        success: false,
        error: "aucune opportunite stock a transformer en campagne"
      });
    }

    const marker = buildStockPromoAuditMarker(check.id);
    const existing = await loadExistingStockPromoAudit(supabase, {
      restaurantId: check.restaurant_id,
      marker
    });
    if (!existing.ok) {
      return res.status(500).json({ success: false, error: existing.error });
    }
    if (existing.audit) {
      const promotion = await loadExistingStockPromoDraft(supabase, existing.audit.id);
      if (!promotion.ok) {
        return res.status(500).json({ success: false, error: promotion.error });
      }

      return res.json({
        success: true,
        audit_id: existing.audit.id,
        audit_response: existing.audit.response,
        ...(promotion.promotion
          ? {
              promotion_id: promotion.promotion.id,
              sms: promotion.promotion.content_sms ?? null
            }
          : {})
      });
    }

    const response = appendStockPromoAuditMarker(baseResponse, marker);

    const { data: audit, error: auditError } = await supabase
      .from("audits")
      .insert({
        restaurant_id: check.restaurant_id,
        question: STOCK_AUDIT_QUESTION,
        response,
        status: "pending"
      })
      .select("id, response")
      .single<{ id: string; response: string }>();

    if (auditError || !audit) {
      return res.status(500).json({
        success: false,
        error: `creation de l'audit stock echouee: ${auditError?.message ?? "erreur inconnue"}`
      });
    }

    return res.json({
      success: true,
      audit_id: audit.id,
      audit_response: audit.response
    });
  };
}

export function createSaveWeeklyInventoryDraftController(supabase: SupabaseClient) {
  return async (req: Request, res: Response) => {
    const userId = await requireUserId(supabase, req, res);
    if (!userId) return res;

    const payload = validateInventoryPayload(req.body, { requireLines: true });
    if (!payload.ok) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    const allowed = await requireRestaurantOwner(supabase, payload.restaurantId, userId, res);
    if (!allowed) return res;

    const check = await getOrCreateDraftCheck(supabase, {
      restaurantId: payload.restaurantId,
      weekStartDate: payload.weekStartDate,
      notes: payload.notes
    });
    if (!check.ok) {
      return res.status(check.status).json({ success: false, error: check.error });
    }

    const saved = await replaceCheckLines(supabase, {
      restaurantId: payload.restaurantId,
      checkId: check.check.id,
      lines: payload.lines
    });
    if (!saved.ok) {
      return res.status(500).json({ success: false, error: saved.error });
    }

    const { error: alertDeleteError } = await supabase
      .from("inventory_alerts")
      .delete()
      .eq("inventory_check_id", check.check.id);
    if (alertDeleteError) {
      return res.status(500).json({
        success: false,
        error: `nettoyage des alertes echoue: ${alertDeleteError.message}`
      });
    }

    return res.json({
      success: true,
      inventory_check_id: check.check.id,
      status: "draft",
      line_count: payload.lines.length
    });
  };
}

export function createCompleteWeeklyInventoryCheckController(supabase: SupabaseClient) {
  return async (req: Request, res: Response) => {
    const userId = await requireUserId(supabase, req, res);
    if (!userId) return res;

    const rawCheckId = req.params.id;
    const checkId = Array.isArray(rawCheckId) ? rawCheckId[0] : rawCheckId;
    if (!checkId || typeof checkId !== "string") {
      return res.status(400).json({ success: false, error: "inventory_check_id requis" });
    }

    const { data: check, error: checkError } = await supabase
      .from("inventory_checks")
      .select("id, restaurant_id, week_start_date, status")
      .eq("id", checkId)
      .single<InventoryCheckRow>();
    if (checkError || !check) {
      return res
        .status(404)
        .json({ success: false, error: checkError?.message ?? "inventaire introuvable" });
    }

    const allowed = await requireRestaurantOwner(supabase, check.restaurant_id, userId, res);
    if (!allowed) return res;
    if (check.status === "completed") {
      return res.status(409).json({ success: false, error: "inventaire deja complete" });
    }

    const payload = validateCompletionPayload(req.body);
    if (!payload.ok) {
      return res.status(400).json({ success: false, error: payload.error });
    }

    let lines = payload.lines;
    if (lines) {
      const saved = await replaceCheckLines(supabase, {
        restaurantId: check.restaurant_id,
        checkId: check.id,
        lines
      });
      if (!saved.ok) {
        return res.status(500).json({ success: false, error: saved.error });
      }
    } else {
      const loaded = await loadCheckLines(supabase, check.id);
      if (!loaded.ok) {
        return res.status(500).json({ success: false, error: loaded.error });
      }
      lines = loaded.lines;
    }

    if (lines.length === 0) {
      return res.status(400).json({
        success: false,
        error: "au moins une ligne d'inventaire est requise"
      });
    }

    const alertResult = deriveInventoryAlerts(lines);
    const alertRows = alertResult.alerts.map((alert) =>
      toAlertRow({
        alert,
        restaurantId: check.restaurant_id,
        checkId: check.id,
        lines
      })
    );

    const { error: deleteAlertsError } = await supabase
      .from("inventory_alerts")
      .delete()
      .eq("inventory_check_id", check.id);
    if (deleteAlertsError) {
      return res.status(500).json({
        success: false,
        error: `nettoyage des alertes echoue: ${deleteAlertsError.message}`
      });
    }

    if (alertRows.length > 0) {
      const { error: alertInsertError } = await supabase.from("inventory_alerts").insert(alertRows);
      if (alertInsertError) {
        return res.status(500).json({
          success: false,
          error: `enregistrement des alertes echoue: ${alertInsertError.message}`
        });
      }
    }

    const { error: completeError } = await supabase
      .from("inventory_checks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", check.id);
    if (completeError) {
      return res.status(500).json({
        success: false,
        error: `completion de l'inventaire echouee: ${completeError.message}`
      });
    }

    return res.json({
      success: true,
      inventory_check_id: check.id,
      status: "completed",
      alert_count: alertRows.length,
      alerts: alertResult.alerts,
      top_priority_item: alertResult.topPriorityItem,
      summary: alertResult.summary
    });
  };
}

export function buildInventoryAuditResponse(alerts: InventoryAlert[]): string | null {
  const uniqueByTypeAndItem = dedupeAlerts(alerts);
  const opportunities = uniqueByTypeAndItem
    .filter((alert) => alert.type === "sell_quickly" || alert.type === "surplus")
    .sort(compareCampaignAlertPriority);

  if (opportunities.length === 0) return null;

  const urgentContext = uniqueByTypeAndItem
    .filter((alert) => alert.type === "critical" || alert.type === "reorder")
    .filter((alert) => !opportunities.some((opportunity) => opportunity.itemName === alert.itemName))
    .sort(compareCampaignAlertPriority)
    .slice(0, 3);

  const lines = [
    "Opportunites stock a transformer en promotion SMS.",
    "Priorite: ecouler rapidement les items qui expirent, sont a surveiller ou sont en surplus.",
    "",
    "Candidats promo:"
  ];

  opportunities.slice(0, 5).forEach((alert, index) => {
    lines.push(`${index + 1}. ${alert.itemName} - ${alert.message}`);
  });

  if (urgentContext.length > 0) {
    lines.push("", "Contexte a respecter (ne pas pousser si cela nuit au service):");
    urgentContext.forEach((alert) => {
      lines.push(`- ${alert.itemName}: ${alert.message}`);
    });
  }

  return lines.join("\n");
}

function validateInventoryPayload(
  body: unknown,
  options: { requireLines: boolean }
):
  | {
      ok: true;
      restaurantId: string;
      weekStartDate: string;
      notes: string | null;
      lines: ValidatedLine[];
    }
  | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: "payload JSON requis" };

  const restaurantId = readString(body.restaurant_id).trim();
  if (!restaurantId) return { ok: false, error: "restaurant_id requis" };

  const weekStartDate = readString(body.week_start_date).trim() || getCurrentWeekStartDate();
  if (!isDateOnly(weekStartDate)) {
    return { ok: false, error: "week_start_date doit utiliser le format YYYY-MM-DD" };
  }

  const lines = validateLines(body.lines, options);
  if (!lines.ok) return lines;

  return {
    ok: true,
    restaurantId,
    weekStartDate,
    notes: optionalString(body.notes),
    lines: lines.lines
  };
}

function validateCompletionPayload(
  body: unknown
): { ok: true; lines: ValidatedLine[] | null } | { ok: false; error: string } {
  if (body === undefined || body === null) return { ok: true, lines: null };
  if (!isRecord(body)) return { ok: false, error: "payload JSON requis" };
  if (!("lines" in body)) return { ok: true, lines: null };
  const lines = validateLines(body.lines, { requireLines: true });
  if (!lines.ok) return lines;
  return { ok: true, lines: lines.lines };
}

function validateLines(
  rawLines: unknown,
  options: { requireLines: boolean }
): { ok: true; lines: ValidatedLine[] } | { ok: false; error: string } {
  if (!Array.isArray(rawLines)) {
    return {
      ok: false,
      error: options.requireLines ? "lignes d'inventaire requises" : "lines doit etre une liste"
    };
  }
  if (rawLines.length === 0) {
    return { ok: false, error: "au moins une ligne d'inventaire est requise" };
  }

  const lines: ValidatedLine[] = [];
  for (const [index, rawLine] of rawLines.entries()) {
    if (!isRecord(rawLine)) {
      return { ok: false, error: `ligne ${index + 1}: objet requis` };
    }
    const line = rawLine as InventoryLineInput;
    const itemName = readString(line.item_name).trim();
    if (!itemName) {
      return { ok: false, error: `ligne ${index + 1}: nom d'item requis` };
    }
    if (itemName.length > 120) {
      return { ok: false, error: `ligne ${index + 1}: nom d'item trop long` };
    }

    const quantity = readNonNegativeNumber(line.quantity);
    if (quantity === null) {
      return { ok: false, error: `ligne ${index + 1}: quantite invalide` };
    }

    const minQuantity = readOptionalNonNegativeNumber(line.min_quantity);
    if (minQuantity === null) {
      return { ok: false, error: `ligne ${index + 1}: minimum invalide` };
    }
    const targetQuantity = readOptionalNonNegativeNumber(line.target_quantity);
    if (targetQuantity === null) {
      return { ok: false, error: `ligne ${index + 1}: cible invalide` };
    }

    const expiresOn = optionalString(line.expires_on);
    if (expiresOn && !isDateOnly(expiresOn)) {
      return { ok: false, error: `ligne ${index + 1}: date d'expiration invalide` };
    }

    const condition = (readString(line.condition).trim() || "ok") as InventoryCondition;
    if (!VALID_CONDITIONS.has(condition)) {
      return { ok: false, error: `ligne ${index + 1}: condition invalide` };
    }

    const validatedLineInput: {
      itemName: string;
      quantity: number;
      minQuantity?: number;
      targetQuantity?: number;
      expiresOn?: string;
      condition: InventoryCondition;
      note: string | null;
    } = {
      itemName,
      quantity,
      condition,
      note: optionalString(line.note)
    };
    if (minQuantity !== undefined) validatedLineInput.minQuantity = minQuantity;
    if (targetQuantity !== undefined) validatedLineInput.targetQuantity = targetQuantity;
    if (expiresOn) validatedLineInput.expiresOn = expiresOn;
    lines.push(compactLine(validatedLineInput));
  }

  return { ok: true, lines };
}

async function getOrCreateDraftCheck(
  supabase: SupabaseClient,
  input: { restaurantId: string; weekStartDate: string; notes: string | null }
): Promise<{ ok: true; check: InventoryCheckRow } | { ok: false; status: number; error: string }> {
  const { data: existing, error: selectError } = await supabase
    .from("inventory_checks")
    .select("id, restaurant_id, week_start_date, status")
    .eq("restaurant_id", input.restaurantId)
    .eq("week_start_date", input.weekStartDate)
    .maybeSingle<InventoryCheckRow>();

  if (selectError) {
    return { ok: false, status: 500, error: `lecture de l'inventaire echouee: ${selectError.message}` };
  }
  if (existing?.status === "completed") {
    return { ok: false, status: 409, error: "inventaire deja complete pour cette semaine" };
  }
  if (existing) {
    const { error: updateError } = await supabase
      .from("inventory_checks")
      .update({ notes: input.notes })
      .eq("id", existing.id);
    if (updateError) {
      return { ok: false, status: 500, error: `mise a jour de l'inventaire echouee: ${updateError.message}` };
    }
    return { ok: true, check: existing };
  }

  const { data: created, error: insertError } = await supabase
    .from("inventory_checks")
    .insert({
      restaurant_id: input.restaurantId,
      week_start_date: input.weekStartDate,
      status: "draft",
      notes: input.notes
    })
    .select("id, restaurant_id, week_start_date, status")
    .single<InventoryCheckRow>();

  if (insertError || !created) {
    return {
      ok: false,
      status: 500,
      error: `creation de l'inventaire echouee: ${insertError?.message ?? "erreur inconnue"}`
    };
  }
  return { ok: true, check: created };
}

async function replaceCheckLines(
  supabase: SupabaseClient,
  input: { restaurantId: string; checkId: string; lines: ValidatedLine[] }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const itemMap = await upsertInventoryItems(supabase, input.restaurantId, input.lines);
  if (!itemMap.ok) return itemMap;

  const { error: deleteError } = await supabase
    .from("inventory_check_lines")
    .delete()
    .eq("inventory_check_id", input.checkId);
  if (deleteError) {
    return { ok: false, error: `suppression des lignes echouee: ${deleteError.message}` };
  }

  const rows = input.lines.map((line) => ({
    restaurant_id: input.restaurantId,
    inventory_check_id: input.checkId,
    inventory_item_id: itemMap.items.get(line.itemName),
    item_name: line.itemName,
    quantity: line.quantity,
    min_quantity_snapshot: line.minQuantity ?? null,
    target_quantity_snapshot: line.targetQuantity ?? null,
    expires_on: line.expiresOn ?? null,
    condition: line.condition,
    note: line.note
  }));

  const { error: insertError } = await supabase.from("inventory_check_lines").insert(rows);
  if (insertError) {
    return { ok: false, error: `enregistrement des lignes echoue: ${insertError.message}` };
  }

  return { ok: true };
}

async function upsertInventoryItems(
  supabase: SupabaseClient,
  restaurantId: string,
  lines: ValidatedLine[]
): Promise<{ ok: true; items: Map<string, string> } | { ok: false; error: string }> {
  const names = Array.from(new Set(lines.map((line) => line.itemName)));
  const { data: existing, error: selectError } = await supabase
    .from("inventory_items")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .in("name", names)
    .returns<InventoryItemRow[]>();

  if (selectError) {
    return { ok: false, error: `lecture des items echouee: ${selectError.message}` };
  }

  const items = new Map((existing ?? []).map((item) => [item.name, item.id]));
  const missing = lines.filter((line) => !items.has(line.itemName));

  if (missing.length > 0) {
    const rows = missing.map((line) => ({
      restaurant_id: restaurantId,
      name: line.itemName,
      min_quantity: line.minQuantity ?? 0,
      target_quantity: line.targetQuantity ?? null
    }));
    const { data: created, error: insertError } = await supabase
      .from("inventory_items")
      .insert(rows)
      .select("id, name")
      .returns<InventoryItemRow[]>();

    if (insertError || !created) {
      return {
        ok: false,
        error: `creation des items echouee: ${insertError?.message ?? "erreur inconnue"}`
      };
    }
    for (const item of created) items.set(item.name, item.id);
  }

  return { ok: true, items };
}

async function loadCheckLines(
  supabase: SupabaseClient,
  checkId: string
): Promise<{ ok: true; lines: ValidatedLine[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("inventory_check_lines")
    .select(
      "id, inventory_item_id, quantity, min_quantity_snapshot, target_quantity_snapshot, expires_on, condition, note, inventory_items(name)"
    )
    .eq("inventory_check_id", checkId)
    .returns<(InventoryCheckLineRow & { inventory_items?: { name: string | null } })[]>();

  if (error) {
    return { ok: false, error: `lecture des lignes echouee: ${error.message}` };
  }

  return {
    ok: true,
    lines: (data ?? []).map((line) => {
      const loadedLineInput: {
        itemName: string;
        quantity: number;
        minQuantity?: number;
        targetQuantity?: number;
        expiresOn?: string;
        condition: InventoryCondition;
        note: string | null;
      } = {
        itemName: line.inventory_items?.name ?? line.item_name ?? line.inventory_item_id,
        quantity: Number(line.quantity),
        condition: line.condition,
        note: line.note
      };
      if (line.min_quantity_snapshot !== null) {
        loadedLineInput.minQuantity = Number(line.min_quantity_snapshot);
      }
      if (line.target_quantity_snapshot !== null) {
        loadedLineInput.targetQuantity = Number(line.target_quantity_snapshot);
      }
      if (line.expires_on) loadedLineInput.expiresOn = line.expires_on;
      return compactLine(loadedLineInput);
    })
  };
}

async function loadCheckAlerts(
  supabase: SupabaseClient,
  checkId: string
): Promise<{ ok: true; alerts: InventoryAlert[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("inventory_alerts")
    .select("alert_type, severity, item_name, message, score, alert_snapshot")
    .eq("inventory_check_id", checkId)
    .returns<InventoryAlertRow[]>();

  if (error) {
    return { ok: false, error: `lecture des alertes echouee: ${error.message}` };
  }

  return {
    ok: true,
    alerts: (data ?? []).map((alert) => ({
      type: alert.alert_type,
      severity: alert.severity,
      itemName: alert.item_name,
      message: alert.message,
      score: alert.score
    }))
  };
}

async function loadExistingStockPromoAudit(
  supabase: SupabaseClient,
  input: { restaurantId: string; marker: string }
): Promise<{ ok: true; audit: StockPromoAuditRow | null } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("audits")
    .select("id, response")
    .eq("restaurant_id", input.restaurantId)
    .eq("question", STOCK_AUDIT_QUESTION)
    .like("response", `%${input.marker}%`)
    .returns<StockPromoAuditRow[]>();

  if (error) {
    return { ok: false, error: `lecture de l'audit stock existant echouee: ${error.message}` };
  }

  return { ok: true, audit: data?.[0] ?? null };
}

async function loadExistingStockPromoDraft(
  supabase: SupabaseClient,
  auditId: string
): Promise<{ ok: true; promotion: StockPromoDraftRow | null } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("promotions")
    .select("id, content_sms")
    .eq("audit_id", auditId)
    .eq("status", "draft")
    .returns<StockPromoDraftRow[]>();

  if (error) {
    return { ok: false, error: `lecture de la campagne stock existante echouee: ${error.message}` };
  }

  return { ok: true, promotion: data?.[0] ?? null };
}

function buildStockPromoAuditMarker(checkId: string): string {
  return `${STOCK_AUDIT_MARKER_PREFIX}${checkId}`;
}

function appendStockPromoAuditMarker(response: string, marker: string): string {
  return `${response}\n\nReference interne: ${marker}`;
}

function toLineResponse(line: ValidatedLine) {
  return {
    item_name: line.itemName,
    quantity: line.quantity,
    min_quantity: line.minQuantity ?? null,
    target_quantity: line.targetQuantity ?? null,
    expires_on: line.expiresOn ?? null,
    condition: line.condition,
    note: line.note
  };
}

function toAlertRow(input: {
  alert: InventoryAlert;
  restaurantId: string;
  checkId: string;
  lines: ValidatedLine[];
}) {
  const line = input.lines.find((candidate) => candidate.itemName === input.alert.itemName);
  return {
    restaurant_id: input.restaurantId,
    inventory_check_id: input.checkId,
    inventory_item_id: null,
    alert_type: input.alert.type,
    severity: input.alert.severity,
    item_name: input.alert.itemName,
    message: input.alert.message,
    score: input.alert.score,
    alert_snapshot: {
      ...input.alert,
      line: line
        ? {
            quantity: line.quantity,
            minQuantity: line.minQuantity ?? null,
            targetQuantity: line.targetQuantity ?? null,
            expiresOn: line.expiresOn ?? null,
            condition: line.condition
          }
        : null
    }
  };
}

function dedupeAlerts(alerts: InventoryAlert[]): InventoryAlert[] {
  const seen = new Set<string>();
  return [...alerts].sort(compareCampaignAlertPriority).filter((alert) => {
    const key = `${alert.type}:${alert.itemName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compareCampaignAlertPriority(a: InventoryAlert, b: InventoryAlert): number {
  return campaignTypeWeight(b.type) - campaignTypeWeight(a.type) || b.score - a.score || a.itemName.localeCompare(b.itemName);
}

function campaignTypeWeight(type: InventoryAlert["type"]): number {
  if (type === "sell_quickly") return 4;
  if (type === "surplus") return 3;
  if (type === "critical") return 2;
  return 1;
}

function getCurrentWeekStartDate(now = new Date()): string {
  const day = now.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return monday.toISOString().slice(0, 10);
}

function compactLine(input: {
  itemName: string;
  quantity: number;
  minQuantity?: number;
  targetQuantity?: number;
  expiresOn?: string;
  condition: InventoryCondition;
  note: string | null;
}): ValidatedLine {
  return {
    itemName: input.itemName,
    quantity: input.quantity,
    ...(input.minQuantity !== undefined ? { minQuantity: input.minQuantity } : {}),
    ...(input.targetQuantity !== undefined ? { targetQuantity: input.targetQuantity } : {}),
    ...(input.expiresOn !== undefined ? { expiresOn: input.expiresOn } : {}),
    condition: input.condition,
    note: input.note
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalString(value: unknown): string | null {
  const trimmed = readString(value).trim();
  return trimmed || null;
}

function readNonNegativeNumber(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(numberValue) || numberValue < 0) return null;
  return numberValue;
}

function readOptionalNonNegativeNumber(value: unknown): number | undefined | null {
  if (value === undefined || value === null || value === "") return undefined;
  return readNonNegativeNumber(value);
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export type InventoryCondition = "ok" | "watch" | "bad";

export type InventoryAlertType = "critical" | "reorder" | "sell_quickly" | "surplus";
export type InventoryAlertSeverity = "low" | "medium" | "high" | "critical";

export type InventoryCheckLine = {
  itemName: string;
  quantity: number;
  minQuantity?: number;
  targetQuantity?: number;
  expiresOn?: string;
  condition: InventoryCondition;
};

export type InventoryAlert = {
  type: InventoryAlertType;
  severity: InventoryAlertSeverity;
  itemName: string;
  message: string;
  score: number;
};

export type InventoryAlertSummary = {
  sellQuicklyItems: string[];
  reorderItems: string[];
  criticalItems: string[];
};

export type InventoryAlertResult = {
  alerts: InventoryAlert[];
  topPriorityItem: string | null;
  summary: InventoryAlertSummary;
};

const SELL_QUICKLY_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const severityWeight: Record<InventoryAlertSeverity, number> = {
  low: 10,
  medium: 30,
  high: 60,
  critical: 100
};

export function deriveInventoryAlerts(
  lines: InventoryCheckLine[],
  now: Date = new Date()
): InventoryAlertResult {
  const alerts = lines.flatMap((line) => deriveLineAlerts(line, now));
  alerts.sort((a, b) => b.score - a.score || a.itemName.localeCompare(b.itemName));

  return {
    alerts,
    topPriorityItem: alerts[0]?.itemName ?? null,
    summary: {
      sellQuicklyItems: uniqueItems(alerts, (a) => a.type === "sell_quickly" || a.type === "surplus"),
      reorderItems: uniqueItems(alerts, (a) => a.type === "reorder"),
      criticalItems: uniqueItems(alerts, (a) => a.type === "critical")
    }
  };
}

function deriveLineAlerts(line: InventoryCheckLine, now: Date): InventoryAlert[] {
  const itemName = line.itemName.trim();
  if (!itemName) return [];

  const alerts: InventoryAlert[] = [];
  const quantity = Number.isFinite(line.quantity) ? line.quantity : 0;

  if (line.condition === "bad") {
    alerts.push(
      createAlert({
        type: "critical",
        severity: "critical",
        itemName,
        message: `${itemName} est en mauvais état. Retirez-le du service.`,
        urgency: 90,
        quantityFactor: quantityFactor(quantity)
      })
    );
  }

  if (quantity <= 0) {
    alerts.push(
      createAlert({
        type: "critical",
        severity: "critical",
        itemName,
        message: `${itemName} est en rupture de stock.`,
        urgency: 80,
        quantityFactor: 0
      })
    );
  }

  if (typeof line.minQuantity === "number" && quantity > 0 && quantity < line.minQuantity) {
    const gap = Math.max(line.minQuantity - quantity, 0);
    alerts.push(
      createAlert({
        type: "reorder",
        severity: gap >= line.minQuantity * 0.5 ? "high" : "medium",
        itemName,
        message: `${itemName} est sous le minimum. Prévoir un réapprovisionnement.`,
        urgency: gapRatio(gap, line.minQuantity) * 50,
        quantityFactor: gap
      })
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry(line.expiresOn, now);
  if (daysUntilExpiry !== null && daysUntilExpiry <= SELL_QUICKLY_DAYS) {
    const expired = daysUntilExpiry < 0;
    alerts.push(
      createAlert({
        type: "sell_quickly",
        severity: expired ? "critical" : daysUntilExpiry <= 1 ? "high" : "medium",
        itemName,
        message: expired
          ? `${itemName} est expiré. Vérifiez avant toute vente.`
          : `${itemName} expire bientôt. À écouler rapidement.`,
        urgency: expired ? 95 : 75 - daysUntilExpiry * 10,
        quantityFactor: quantityFactor(quantity)
      })
    );
  }

  const surplusTarget = getSurplusTarget(line);
  if (surplusTarget !== null && quantity > surplusTarget) {
    const surplus = quantity - surplusTarget;
    alerts.push(
      createAlert({
        type: "surplus",
        severity: surplus >= surplusTarget * 0.5 ? "medium" : "low",
        itemName,
        message: `${itemName} depasse le niveau attendu. Bon candidat pour une campagne.`,
        urgency: gapRatio(surplus, surplusTarget) * 35,
        quantityFactor: surplus
      })
    );
  }

  if (line.condition === "watch") {
    alerts.push(
      createAlert({
        type: "sell_quickly",
        severity: "medium",
        itemName,
        message: `${itemName} est à surveiller. À prioriser si une campagne est lancée.`,
        urgency: 35,
        quantityFactor: quantityFactor(quantity)
      })
    );
  }

  return alerts;
}

function createAlert(input: {
  type: InventoryAlertType;
  severity: InventoryAlertSeverity;
  itemName: string;
  message: string;
  urgency: number;
  quantityFactor: number;
}): InventoryAlert {
  return {
    type: input.type,
    severity: input.severity,
    itemName: input.itemName,
    message: input.message,
    score: Math.round(severityWeight[input.severity] + input.urgency + input.quantityFactor)
  };
}

function getDaysUntilExpiry(expiresOn: string | undefined, now: Date): number | null {
  if (!expiresOn) return null;
  const expiry = new Date(`${expiresOn}T00:00:00.000Z`);
  if (Number.isNaN(expiry.getTime())) return null;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.floor((expiry.getTime() - today.getTime()) / MS_PER_DAY);
}

function gapRatio(gap: number, base: number): number {
  if (base <= 0) return 0;
  return Math.min(gap / base, 2);
}

function getSurplusTarget(line: InventoryCheckLine): number | null {
  if (typeof line.targetQuantity === "number" && line.targetQuantity > 0) {
    return line.targetQuantity;
  }
  if (typeof line.minQuantity === "number" && line.minQuantity > 0) {
    return line.minQuantity * 2;
  }
  return null;
}

function quantityFactor(quantity: number): number {
  return Math.min(Math.max(quantity, 0), 50);
}

function uniqueItems(
  alerts: InventoryAlert[],
  predicate: (alert: InventoryAlert) => boolean
): string[] {
  return Array.from(new Set(alerts.filter(predicate).map((alert) => alert.itemName)));
}

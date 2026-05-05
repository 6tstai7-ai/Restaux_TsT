import { describe, expect, it } from "vitest";
import { deriveInventoryAlerts, type InventoryCheckLine } from "./inventory";

const NOW = new Date("2026-05-03T12:00:00.000Z");

describe("deriveInventoryAlerts", () => {
  it("detects low stock as a reorder alert", () => {
    const result = deriveInventoryAlerts([
      line({ itemName: "Sauce créole", quantity: 2, minQuantity: 5 })
    ], NOW);

    expect(result.alerts).toEqual([
      expect.objectContaining({
        type: "reorder",
        severity: "high",
        itemName: "Sauce créole"
      })
    ]);
    expect(result.summary.reorderItems).toEqual(["Sauce créole"]);
  });

  it("detects out of stock as a critical alert", () => {
    const result = deriveInventoryAlerts([
      line({ itemName: "Ailes de poulet", quantity: 0, minQuantity: 6 })
    ], NOW);

    expect(result.alerts[0]).toEqual(
      expect.objectContaining({
        type: "critical",
        severity: "critical",
        itemName: "Ailes de poulet"
      })
    );
    expect(result.topPriorityItem).toBe("Ailes de poulet");
    expect(result.summary.criticalItems).toEqual(["Ailes de poulet"]);
  });

  it("detects expiring soon as a sell quickly alert", () => {
    const result = deriveInventoryAlerts([
      line({ itemName: "Mac n cheese", quantity: 12, expiresOn: "2026-05-05" })
    ], NOW);

    expect(result.alerts).toEqual([
      expect.objectContaining({
        type: "sell_quickly",
        severity: "medium",
        itemName: "Mac n cheese"
      })
    ]);
    expect(result.summary.sellQuicklyItems).toEqual(["Mac n cheese"]);
  });

  it("detects quantity above target as a surplus alert", () => {
    const result = deriveInventoryAlerts([
      line({ itemName: "Griot", quantity: 18, targetQuantity: 10 })
    ], NOW);

    expect(result.alerts).toEqual([
      expect.objectContaining({
        type: "surplus",
        severity: "medium",
        itemName: "Griot"
      })
    ]);
    expect(result.summary.sellQuicklyItems).toEqual(["Griot"]);
  });

  it("detects clear surplus from minimum quantity when no target is provided", () => {
    const result = deriveInventoryAlerts([
      line({ itemName: "Griot", quantity: 14, minQuantity: 5 })
    ], NOW);

    expect(result.alerts).toEqual([
      expect.objectContaining({
        type: "surplus",
        severity: "low",
        itemName: "Griot"
      })
    ]);
    expect(result.summary.sellQuicklyItems).toEqual(["Griot"]);
  });

  it("detects bad condition as a critical alert", () => {
    const result = deriveInventoryAlerts([
      line({ itemName: "Salade de chou", quantity: 4, condition: "bad" })
    ], NOW);

    expect(result.alerts[0]).toEqual(
      expect.objectContaining({
        type: "critical",
        severity: "critical",
        itemName: "Salade de chou"
      })
    );
    expect(result.summary.criticalItems).toEqual(["Salade de chou"]);
  });

  it("sorts alerts by highest priority score first", () => {
    const result = deriveInventoryAlerts([
      line({ itemName: "Griot", quantity: 18, targetQuantity: 10 }),
      line({ itemName: "Ailes de poulet", quantity: 0, minQuantity: 6 }),
      line({ itemName: "Mac n cheese", quantity: 12, expiresOn: "2026-05-04" })
    ], NOW);

    expect(result.alerts.map((alert) => alert.itemName)).toEqual([
      "Ailes de poulet",
      "Mac n cheese",
      "Griot"
    ]);
    expect(result.alerts[0]!.score).toBeGreaterThan(result.alerts[1]!.score);
    expect(result.alerts[1]!.score).toBeGreaterThan(result.alerts[2]!.score);
  });

  it("returns an empty healthy state when no alerts are detected", () => {
    const result = deriveInventoryAlerts([
      line({
        itemName: "Riz",
        quantity: 10,
        minQuantity: 5,
        targetQuantity: 12,
        expiresOn: "2026-05-20"
      })
    ], NOW);

    expect(result).toEqual({
      alerts: [],
      topPriorityItem: null,
      summary: {
        sellQuicklyItems: [],
        reorderItems: [],
        criticalItems: []
      }
    });
  });

  it("handles empty input", () => {
    expect(deriveInventoryAlerts([], NOW)).toEqual({
      alerts: [],
      topPriorityItem: null,
      summary: {
        sellQuicklyItems: [],
        reorderItems: [],
        criticalItems: []
      }
    });
  });
});

function line(overrides: Partial<InventoryCheckLine>): InventoryCheckLine {
  return {
    itemName: "Item",
    quantity: 10,
    condition: "ok",
    ...overrides
  };
}

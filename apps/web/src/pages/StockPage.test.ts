import type { InventoryAlert } from "@app/shared";
import { describe, expect, it } from "vitest";
import {
  buildInventoryLinesPayload,
  getCurrentWeekStartDate,
  groupStockAlerts,
  hasStockCampaignOpportunity,
  mapLoadedCheckToStockState,
  mapLoadedLinesToStockLines,
  type StockLineForm,
  validateStockLines
} from "./StockPage";

const baseLine: StockLineForm = {
  id: "line-1",
  itemName: "Chicken wings",
  quantity: "2",
  minQuantity: "5",
  expiresOn: "",
  condition: "ok"
};

describe("StockPage helpers", () => {
  it("calculates the Monday week start date", () => {
    expect(getCurrentWeekStartDate(new Date("2026-05-07T12:00:00"))).toBe("2026-05-04");
  });

  it("validates item names and quantities before API submission", () => {
    expect(validateStockLines([{ ...baseLine, itemName: "" }])).toBe(
      "Ligne 1: nom du produit requis."
    );
    expect(validateStockLines([{ ...baseLine, quantity: "-1" }])).toBe(
      "Ligne 1: quantité invalide."
    );
    expect(validateStockLines([baseLine])).toBeNull();
  });

  it("builds the inventory API payload without empty optional fields", () => {
    expect(buildInventoryLinesPayload([baseLine])).toEqual([
      {
        item_name: "Chicken wings",
        quantity: 2,
        min_quantity: 5,
        condition: "ok"
      }
    ]);
  });

  it("groups returned alerts for the stock result view", () => {
    const alerts: InventoryAlert[] = [
      { type: "critical", severity: "critical", itemName: "A", message: "A", score: 100 },
      { type: "reorder", severity: "high", itemName: "B", message: "B", score: 80 },
      { type: "sell_quickly", severity: "medium", itemName: "C", message: "C", score: 60 },
      { type: "surplus", severity: "low", itemName: "D", message: "D", score: 20 }
    ];

    expect(groupStockAlerts(alerts)).toEqual({
      critical: [alerts[0]],
      reorder: [alerts[1]],
      sellQuickly: [alerts[2]],
      surplus: [alerts[3]]
    });
  });

  it("enables stock campaign generation only for sell quickly or surplus alerts", () => {
    expect(
      hasStockCampaignOpportunity([
        { type: "reorder", severity: "high", itemName: "A", message: "A", score: 80 },
        { type: "critical", severity: "critical", itemName: "B", message: "B", score: 180 }
      ])
    ).toBe(false);
    expect(
      hasStockCampaignOpportunity([
        { type: "surplus", severity: "low", itemName: "C", message: "C", score: 40 }
      ])
    ).toBe(true);
  });

  it("maps a loaded draft into editable stock form lines", () => {
    const [line] = mapLoadedLinesToStockLines([
      {
        item_name: "Chicken wings",
        quantity: "2.5",
        min_quantity: 5,
        target_quantity: null,
        expires_on: "2026-05-08",
        condition: "watch"
      }
    ]);

    expect(line).toEqual(
      expect.objectContaining({
        itemName: "Chicken wings",
        quantity: "2.5",
        minQuantity: "5",
        expiresOn: "2026-05-08",
        condition: "watch"
      })
    );
  });

  it("maps a completed check into completed UI state with alerts", () => {
    const alert: InventoryAlert = {
      type: "critical",
      severity: "critical",
      itemName: "Chicken wings",
      message: "Rupture",
      score: 180
    };

    const state = mapLoadedCheckToStockState({
      success: true,
      check: {
        id: "check-1",
        restaurant_id: "restaurant-1",
        week_start_date: "2026-05-04",
        status: "completed"
      },
      lines: [
        {
          item_name: "Chicken wings",
          quantity: 0,
          min_quantity: 5,
          target_quantity: null,
          expires_on: null,
          condition: "ok"
        }
      ],
      alerts: [alert]
    });

    expect(state).toEqual(
      expect.objectContaining({
        inventoryCheckId: "check-1",
        alerts: [alert],
        saveStatus: "saved",
        completeStatus: "completed",
        successMessage: "Inventaire complété repris."
      })
    );
    expect(state.lines[0]).toEqual(
      expect.objectContaining({
        itemName: "Chicken wings",
        quantity: "0",
        minQuantity: "5"
      })
    );
  });
});

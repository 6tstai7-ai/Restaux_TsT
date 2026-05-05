import { describe, expect, it } from "vitest";
import { deriveDashboardDecision, type DashboardDecisionInput } from "./dashboardDecision";

const baseInput: DashboardDecisionInput = {
  hasRestaurant: true,
  metricsLoading: false,
  metricsError: null,
  totalCustomers: 12,
  totalSmsOptIns: 12,
  recentCustomerCount: 4,
  generatedSms: null,
  sendStatus: "idle",
  sendError: null
};

describe("deriveDashboardDecision", () => {
  it("returns a setup-critical state when no restaurant exists", () => {
    const decision = deriveDashboardDecision({ ...baseInput, hasRestaurant: false });

    expect(decision.healthStatus).toBe("critical");
    expect(decision.priorityLevel).toBe("critical");
    expect(decision.headline).toContain("Aucun restaurant");
    expect(decision.urgentAlerts).toHaveLength(1);
  });

  it("prioritizes customer acquisition when there are zero customers", () => {
    const decision = deriveDashboardDecision({ ...baseInput, totalCustomers: 0, recentCustomerCount: 0 });

    expect(decision.healthStatus).toBe("attention");
    expect(decision.priorityLevel).toBe("high");
    expect(decision.nextAction).toContain("Clients");
  });

  it("recommends generating a campaign when customers exist but no promo is generated", () => {
    const decision = deriveDashboardDecision(baseInput);

    expect(decision.healthStatus).toBe("ready");
    expect(decision.campaignState).toBe("none");
    expect(decision.nextAction).toContain("générer la campagne IA");
  });

  it("surfaces a generated campaign waiting to send", () => {
    const decision = deriveDashboardDecision({
      ...baseInput,
      generatedSms: "Promo ce soir",
      sendStatus: "idle"
    });

    expect(decision.campaignState).toBe("draft");
    expect(decision.priorityLevel).toBe("high");
    expect(decision.urgentAlerts).toContain("Campagne générée en attente d'envoi.");
  });

  it("marks the day as launched after campaign send", () => {
    const decision = deriveDashboardDecision({
      ...baseInput,
      generatedSms: "Promo ce soir",
      sendStatus: "sent"
    });

    expect(decision.healthStatus).toBe("success");
    expect(decision.campaignState).toBe("sent");
    expect(decision.urgentAlerts).toEqual([]);
  });

  it("returns a calm degraded state when dashboard metrics fail without leaking the raw error", () => {
    const decision = deriveDashboardDecision({
      ...baseInput,
      metricsError: "permission denied"
    });

    expect(decision.healthStatus).toBe("attention");
    expect(decision.priorityLevel).toBe("high");
    expect(decision.urgentAlerts).not.toContain("permission denied");
    expect(decision.nextAction.toLowerCase()).toContain("réessayer");
  });
});

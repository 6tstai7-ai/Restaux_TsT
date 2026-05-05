import { describe, expect, it } from "vitest";
import {
  buildDashboardConsentLogInsert,
  buildDashboardConsentRollbackUpdate,
  buildDashboardCustomerInsert
} from "./customerConsent";

describe("dashboard customer consent payloads", () => {
  it("marks dashboard-created customers as explicitly opted in to SMS", () => {
    expect(
      buildDashboardCustomerInsert({
        restaurantId: "restaurant-1",
        name: "Alex Dubois",
        phone: "5145551234",
        consentedAt: "2026-05-02T20:00:00.000Z"
      })
    ).toEqual({
      restaurant_id: "restaurant-1",
      name: "Alex Dubois",
      phone: "5145551234",
      opt_in_sms: true,
      opt_in_sms_at: "2026-05-02T20:00:00.000Z"
    });
  });

  it("creates a traceable consent log payload for manual dashboard enrollment", () => {
    expect(
      buildDashboardConsentLogInsert({
        customerId: "customer-1",
        consentedAt: "2026-05-02T20:00:00.000Z"
      })
    ).toEqual({
      customer_id: "customer-1",
      type: "sms",
      action: "opt_in",
      source: "dashboard_manual",
      timestamp: "2026-05-02T20:00:00.000Z"
    });
  });

  it("neutralizes SMS opt-in when consent logging cannot be completed", () => {
    expect(buildDashboardConsentRollbackUpdate()).toEqual({
      opt_in_sms: false,
      opt_in_sms_at: null
    });
  });
});

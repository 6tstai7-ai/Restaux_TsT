export type Locale = "fr-CA" | "en-CA";

export const SUPPORTED_LOCALES = ["fr-CA", "en-CA"] as const;

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export type PlanStatus = "trialing" | "active" | "past_due" | "canceled";

export interface Restaurant {
  id: string;
  name: string;
  locale: Locale;
  timezone: string;
  stripe_customer_id: string | null;
  plan_status: PlanStatus;
  points_per_dollar: number;
  branding_json: Record<string, unknown>;
}

export {
  deriveInventoryAlerts,
  type InventoryAlert,
  type InventoryAlertResult,
  type InventoryAlertSeverity,
  type InventoryAlertSummary,
  type InventoryAlertType,
  type InventoryCheckLine,
  type InventoryCondition
} from "./inventory.js";

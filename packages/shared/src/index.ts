export type Locale = "fr-CA" | "en-CA";

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

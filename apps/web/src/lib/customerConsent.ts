export function buildDashboardCustomerInsert(input: {
  restaurantId: string;
  name: string;
  phone: string;
  consentedAt: string;
}) {
  return {
    restaurant_id: input.restaurantId,
    name: input.name,
    phone: input.phone,
    opt_in_sms: true,
    opt_in_sms_at: input.consentedAt
  };
}

export function buildDashboardConsentLogInsert(input: {
  customerId: string;
  consentedAt: string;
}) {
  return {
    customer_id: input.customerId,
    type: "sms",
    action: "opt_in",
    source: "dashboard_manual",
    timestamp: input.consentedAt
  };
}

export function buildDashboardConsentRollbackUpdate() {
  return {
    opt_in_sms: false,
    opt_in_sms_at: null
  };
}

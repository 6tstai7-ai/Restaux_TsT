import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  buildInventoryAuditResponse,
  createCreateInventoryStockPromoAuditController,
  createCompleteWeeklyInventoryCheckController,
  createGetCurrentWeekInventoryCheckController,
  createSaveWeeklyInventoryDraftController
} from "./inventory.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "99999999-9999-4999-8999-999999999999";
const RESTAURANT_ID = "22222222-2222-4222-8222-222222222222";
const CHECK_ID = "33333333-3333-4333-8333-333333333333";
const ITEM_ID = "44444444-4444-4444-8444-444444444444";

type QueryResult<T> = {
  data?: T;
  error?: { message: string } | null;
};

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  returns: ReturnType<typeof vi.fn>;
  inserted: unknown[];
  updated: unknown[];
};

function createResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      res.body = body;
      return res;
    })
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

function createBuilder(input: {
  single?: QueryResult<unknown>;
  maybeSingle?: QueryResult<unknown>;
  returns?: QueryResult<unknown>;
} = {}): QueryBuilder {
  const builder = {
    inserted: [] as unknown[],
    updated: [] as unknown[],
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    like: vi.fn(() => builder),
    not: vi.fn(() => builder),
    insert: vi.fn((row: unknown) => {
      builder.inserted.push(row);
      return builder;
    }),
    update: vi.fn((row: unknown) => {
      builder.updated.push(row);
      return builder;
    }),
    delete: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(input.single ?? { data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve(input.maybeSingle ?? { data: null, error: null })),
    returns: vi.fn(() => Promise.resolve(input.returns ?? { data: [], error: null }))
  };
  return builder;
}

function createSupabaseMock(input: {
  userId?: string;
  queues?: Record<string, QueryBuilder[]>;
}) {
  const queues: Record<string, QueryBuilder[]> = input.queues ?? {};
  const from = vi.fn((table: string) => {
    const queue = queues[table];
    const builder = queue?.shift();
    if (!builder) throw new Error(`Unexpected table call: ${table}`);
    return builder;
  });
  const auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: input.userId ? { id: input.userId } : null },
      error: input.userId ? null : { message: "invalid session" }
    })
  };
  return {
    supabase: { auth, from } as unknown as SupabaseClient & {
      auth: { getUser: ReturnType<typeof vi.fn> };
      from: ReturnType<typeof vi.fn>;
    },
    auth,
    from,
    queues
  };
}

function ownerBuilder(ownerId = USER_ID) {
  return createBuilder({
    single: { data: { owner_id: ownerId }, error: null }
  });
}

function validLine(overrides: Record<string, unknown> = {}) {
  return {
    item_name: "Chicken wings",
    quantity: 2,
    min_quantity: 5,
    target_quantity: 10,
    expires_on: "2026-05-05",
    condition: "ok",
    ...overrides
  };
}

describe("weekly inventory controllers", () => {
  it("builds an audit response from marketable inventory alerts first", () => {
    const response = buildInventoryAuditResponse([
      {
        type: "critical",
        severity: "critical",
        itemName: "Burger buns",
        message: "Burger buns est en rupture de stock.",
        score: 180
      },
      {
        type: "surplus",
        severity: "medium",
        itemName: "Chicken wings",
        message: "Chicken wings depasse la cible. Bon candidat pour une campagne.",
        score: 70
      },
      {
        type: "sell_quickly",
        severity: "high",
        itemName: "Poutine sauce",
        message: "Poutine sauce expire bientot. A ecouler rapidement.",
        score: 120
      },
      {
        type: "reorder",
        severity: "high",
        itemName: "Fries",
        message: "Fries est sous le minimum. Prevoir un reapprovisionnement.",
        score: 90
      }
    ]);

    expect(response).toContain("Candidats promo:");
    expect(response).toMatch(/1\. Poutine sauce/);
    expect(response).toMatch(/2\. Chicken wings/);
    expect(response).toContain("Contexte a respecter");
    expect(response).toContain("Burger buns");
    expect(response).toContain("Fries");
  });

  it("does not build a stock campaign audit when alerts have no promo opportunity", () => {
    expect(
      buildInventoryAuditResponse([
        {
          type: "critical",
          severity: "critical",
          itemName: "Burger buns",
          message: "Burger buns est en rupture de stock.",
          score: 180
        }
      ])
    ).toBeNull();
  });

  it("rejects unauthenticated draft saves before touching inventory tables", async () => {
    const { supabase, auth, from } = createSupabaseMock({ queues: {} });
    const controller = createSaveWeeklyInventoryDraftController(supabase);
    const res = createResponse();

    await controller({ body: {}, headers: {} } as Request, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ success: false, error: "authentification requise" });
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads with a friendly error", async () => {
    const { supabase, from } = createSupabaseMock({ userId: USER_ID, queues: {} });
    const controller = createSaveWeeklyInventoryDraftController(supabase);
    const res = createResponse();

    await controller(
      {
        body: {
          restaurant_id: RESTAURANT_ID,
          week_start_date: "2026-05-04",
          lines: [validLine({ item_name: "", quantity: -1 })]
        },
        headers: { authorization: "Bearer valid-token" }
      } as Request,
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ success: false, error: "ligne 1: nom d'item requis" });
    expect(from).not.toHaveBeenCalled();
  });

  it("loads the current week draft check with saved lines", async () => {
    const checkLookup = createBuilder({
      maybeSingle: {
        data: {
          id: CHECK_ID,
          restaurant_id: RESTAURANT_ID,
          week_start_date: "2026-05-04",
          status: "draft"
        },
        error: null
      }
    });
    const lineLookup = createBuilder({
      returns: {
        data: [
          {
            id: "line-1",
            inventory_item_id: ITEM_ID,
            quantity: 2,
            min_quantity_snapshot: 5,
            target_quantity_snapshot: 10,
            expires_on: "2026-05-05",
            condition: "watch",
            note: null,
            inventory_items: { name: "Chicken wings" }
          }
        ],
        error: null
      }
    });
    const { supabase } = createSupabaseMock({
      userId: USER_ID,
      queues: {
        restaurants: [ownerBuilder()],
        inventory_checks: [checkLookup],
        inventory_check_lines: [lineLookup]
      }
    });
    const controller = createGetCurrentWeekInventoryCheckController(supabase);
    const res = createResponse();

    await controller(
      {
        query: { restaurant_id: RESTAURANT_ID, week_start_date: "2026-05-04" },
        headers: { authorization: "Bearer valid-token" }
      } as unknown as Request,
      res
    );

    expect(checkLookup.eq).toHaveBeenCalledWith("restaurant_id", RESTAURANT_ID);
    expect(checkLookup.eq).toHaveBeenCalledWith("week_start_date", "2026-05-04");
    expect(res.body).toEqual({
      success: true,
      check: {
        id: CHECK_ID,
        restaurant_id: RESTAURANT_ID,
        week_start_date: "2026-05-04",
        status: "draft"
      },
      lines: [
        {
          item_name: "Chicken wings",
          quantity: 2,
          min_quantity: 5,
          target_quantity: 10,
          expires_on: "2026-05-05",
          condition: "watch",
          note: null
        }
      ],
      alerts: []
    });
  });

  it("loads a completed current week check with persisted alerts", async () => {
    const checkLookup = createBuilder({
      maybeSingle: {
        data: {
          id: CHECK_ID,
          restaurant_id: RESTAURANT_ID,
          week_start_date: "2026-05-04",
          status: "completed"
        },
        error: null
      }
    });
    const lineLookup = createBuilder({
      returns: {
        data: [
          {
            id: "line-1",
            inventory_item_id: ITEM_ID,
            quantity: 0,
            min_quantity_snapshot: 5,
            target_quantity_snapshot: null,
            expires_on: null,
            condition: "ok",
            note: null,
            inventory_items: { name: "Chicken wings" }
          }
        ],
        error: null
      }
    });
    const alertLookup = createBuilder({
      returns: {
        data: [
          {
            alert_type: "critical",
            severity: "critical",
            item_name: "Chicken wings",
            message: "Chicken wings est en rupture de stock.",
            score: 180,
            alert_snapshot: {}
          }
        ],
        error: null
      }
    });
    const { supabase } = createSupabaseMock({
      userId: USER_ID,
      queues: {
        restaurants: [ownerBuilder()],
        inventory_checks: [checkLookup],
        inventory_check_lines: [lineLookup],
        inventory_alerts: [alertLookup]
      }
    });
    const controller = createGetCurrentWeekInventoryCheckController(supabase);
    const res = createResponse();

    await controller(
      {
        query: { restaurant_id: RESTAURANT_ID, week_start_date: "2026-05-04" },
        headers: { authorization: "Bearer valid-token" }
      } as unknown as Request,
      res
    );

    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        check: expect.objectContaining({ id: CHECK_ID, status: "completed" }),
        alerts: [
          {
            type: "critical",
            severity: "critical",
            itemName: "Chicken wings",
            message: "Chicken wings est en rupture de stock.",
            score: 180
          }
        ]
      })
    );
  });

  it("creates or updates the current week draft check and replaces lines", async () => {
    const existingCheck = createBuilder({
      maybeSingle: {
        data: {
          id: CHECK_ID,
          restaurant_id: RESTAURANT_ID,
          week_start_date: "2026-05-04",
          status: "draft"
        },
        error: null
      }
    });
    const checkUpdate = createBuilder();
    const existingItems = createBuilder({ returns: { data: [], error: null } });
    const createdItems = createBuilder({
      returns: { data: [{ id: ITEM_ID, name: "Chicken wings" }], error: null }
    });
    const lineDelete = createBuilder();
    const lineInsert = createBuilder();
    const alertDelete = createBuilder();

    const { supabase } = createSupabaseMock({
      userId: USER_ID,
      queues: {
        restaurants: [ownerBuilder()],
        inventory_checks: [existingCheck, checkUpdate],
        inventory_items: [existingItems, createdItems],
        inventory_check_lines: [lineDelete, lineInsert],
        inventory_alerts: [alertDelete]
      }
    });
    const controller = createSaveWeeklyInventoryDraftController(supabase);
    const res = createResponse();

    await controller(
      {
        body: {
          restaurant_id: RESTAURANT_ID,
          week_start_date: "2026-05-04",
          notes: "Weekly prep",
          lines: [validLine()]
        },
        headers: { authorization: "Bearer valid-token" }
      } as Request,
      res
    );

    expect(existingCheck.eq).toHaveBeenCalledWith("restaurant_id", RESTAURANT_ID);
    expect(existingCheck.eq).toHaveBeenCalledWith("week_start_date", "2026-05-04");
    expect(checkUpdate.updated).toEqual([{ notes: "Weekly prep" }]);
    expect(createdItems.inserted[0]).toEqual([
      {
        restaurant_id: RESTAURANT_ID,
        name: "Chicken wings",
        min_quantity: 5,
        target_quantity: 10
      }
    ]);
    expect(lineDelete.eq).toHaveBeenCalledWith("inventory_check_id", CHECK_ID);
    expect(lineInsert.inserted[0]).toEqual([
      expect.objectContaining({
        restaurant_id: RESTAURANT_ID,
        inventory_check_id: CHECK_ID,
        inventory_item_id: ITEM_ID,
        item_name: "Chicken wings",
        quantity: 2,
        condition: "ok"
      })
    ]);
    expect(res.body).toEqual({
      success: true,
      inventory_check_id: CHECK_ID,
      status: "draft",
      line_count: 1
    });
  });

  it("completes a check, derives alerts, persists snapshots, then marks completed", async () => {
    const checkLookup = createBuilder({
      single: {
        data: {
          id: CHECK_ID,
          restaurant_id: RESTAURANT_ID,
          week_start_date: "2026-05-04",
          status: "draft"
        },
        error: null
      }
    });
    const existingItems = createBuilder({ returns: { data: [], error: null } });
    const createdItems = createBuilder({
      returns: { data: [{ id: ITEM_ID, name: "Chicken wings" }], error: null }
    });
    const lineDelete = createBuilder();
    const lineInsert = createBuilder();
    const alertDelete = createBuilder();
    const alertInsert = createBuilder();
    const checkComplete = createBuilder();

    const { supabase } = createSupabaseMock({
      userId: USER_ID,
      queues: {
        inventory_checks: [checkLookup, checkComplete],
        restaurants: [ownerBuilder()],
        inventory_items: [existingItems, createdItems],
        inventory_check_lines: [lineDelete, lineInsert],
        inventory_alerts: [alertDelete, alertInsert]
      }
    });
    const controller = createCompleteWeeklyInventoryCheckController(supabase);
    const res = createResponse();

    await controller(
      {
        params: { id: CHECK_ID },
        body: {
          lines: [validLine({ quantity: 0 })]
        },
        headers: { authorization: "Bearer valid-token" }
      } as unknown as Request,
      res
    );

    const persistedAlerts = alertInsert.inserted[0] as Array<Record<string, unknown>>;
    expect(persistedAlerts.length).toBeGreaterThan(0);
    expect(persistedAlerts[0]).toEqual(
      expect.objectContaining({
        restaurant_id: RESTAURANT_ID,
        inventory_check_id: CHECK_ID,
        alert_type: "critical",
        severity: "critical",
        item_name: "Chicken wings"
      })
    );
    expect(persistedAlerts[0]?.alert_snapshot).toEqual(
      expect.objectContaining({
        type: "critical",
        itemName: "Chicken wings"
      })
    );
    expect(checkComplete.updated[0]).toEqual(
      expect.objectContaining({ status: "completed" })
    );
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        inventory_check_id: CHECK_ID,
        status: "completed",
        top_priority_item: "Chicken wings"
      })
    );
  });

  it("rejects completion when the user does not own the restaurant", async () => {
    const checkLookup = createBuilder({
      single: {
        data: {
          id: CHECK_ID,
          restaurant_id: RESTAURANT_ID,
          week_start_date: "2026-05-04",
          status: "draft"
        },
        error: null
      }
    });
    const { supabase } = createSupabaseMock({
      userId: USER_ID,
      queues: {
        inventory_checks: [checkLookup],
        restaurants: [ownerBuilder(OTHER_USER_ID)]
      }
    });
    const controller = createCompleteWeeklyInventoryCheckController(supabase);
    const res = createResponse();

    await controller(
      {
        params: { id: CHECK_ID },
        body: { lines: [validLine()] },
        headers: { authorization: "Bearer valid-token" }
      } as unknown as Request,
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({ success: false, error: "accès refusé" });
  });
  it("creates an audit from completed inventory alerts for the existing promo flow", async () => {
    const checkLookup = createBuilder({
      single: {
        data: {
          id: CHECK_ID,
          restaurant_id: RESTAURANT_ID,
          week_start_date: "2026-05-04",
          status: "completed"
        },
        error: null
      }
    });
    const alertLookup = createBuilder({
      returns: {
        data: [
          {
            alert_type: "sell_quickly",
            severity: "high",
            item_name: "Chicken wings",
            message: "Chicken wings expire bientot. A ecouler rapidement.",
            score: 120,
            alert_snapshot: {}
          },
          {
            alert_type: "surplus",
            severity: "medium",
            item_name: "Sauce BBQ",
            message: "Sauce BBQ depasse la cible. Bon candidat pour une campagne.",
            score: 80,
            alert_snapshot: {}
          }
        ],
        error: null
      }
    });
    const auditLookup = createBuilder({ returns: { data: [], error: null } });
    const auditInsert = createBuilder({
      single: {
        data: {
          id: "audit-1",
          response: "Opportunites stock a transformer en promotion SMS."
        },
        error: null
      }
    });

    const { supabase } = createSupabaseMock({
      userId: USER_ID,
      queues: {
        inventory_checks: [checkLookup],
        restaurants: [ownerBuilder()],
        inventory_alerts: [alertLookup],
        audits: [auditLookup, auditInsert]
      }
    });
    const controller = createCreateInventoryStockPromoAuditController(supabase);
    const res = createResponse();

    await controller(
      {
        params: { id: CHECK_ID },
        headers: { authorization: "Bearer valid-token" }
      } as unknown as Request,
      res
    );

    expect(auditLookup.like).toHaveBeenCalledWith(
      "response",
      `%stock-promo:inventory-check:${CHECK_ID}%`
    );
    expect(auditInsert.inserted[0]).toEqual(
      expect.objectContaining({
        restaurant_id: RESTAURANT_ID,
        status: "pending",
        response: expect.stringContaining(`stock-promo:inventory-check:${CHECK_ID}`)
      })
    );
    expect(res.body).toEqual({
      success: true,
      audit_id: "audit-1",
      audit_response: "Opportunites stock a transformer en promotion SMS."
    });
  });

  it("returns an existing stock promo draft instead of inserting a duplicate audit", async () => {
    const checkLookup = createBuilder({
      single: {
        data: {
          id: CHECK_ID,
          restaurant_id: RESTAURANT_ID,
          week_start_date: "2026-05-04",
          status: "completed"
        },
        error: null
      }
    });
    const alertLookup = createBuilder({
      returns: {
        data: [
          {
            alert_type: "sell_quickly",
            severity: "high",
            item_name: "Chicken wings",
            message: "Chicken wings expire bientot. A ecouler rapidement.",
            score: 120,
            alert_snapshot: {}
          }
        ],
        error: null
      }
    });
    const auditLookup = createBuilder({
      returns: {
        data: [
          {
            id: "audit-existing",
            response: `Opportunites stock.\n\nReference interne: stock-promo:inventory-check:${CHECK_ID}`
          }
        ],
        error: null
      }
    });
    const promoLookup = createBuilder({
      returns: {
        data: [{ id: "promo-existing", content_sms: "Promo stock deja prete." }],
        error: null
      }
    });

    const { supabase, from } = createSupabaseMock({
      userId: USER_ID,
      queues: {
        inventory_checks: [checkLookup],
        restaurants: [ownerBuilder()],
        inventory_alerts: [alertLookup],
        audits: [auditLookup],
        promotions: [promoLookup]
      }
    });
    const controller = createCreateInventoryStockPromoAuditController(supabase);
    const res = createResponse();

    await controller(
      {
        params: { id: CHECK_ID },
        headers: { authorization: "Bearer valid-token" }
      } as unknown as Request,
      res
    );

    expect(auditLookup.like).toHaveBeenCalledWith(
      "response",
      `%stock-promo:inventory-check:${CHECK_ID}%`
    );
    expect(promoLookup.eq).toHaveBeenCalledWith("audit_id", "audit-existing");
    expect(promoLookup.eq).toHaveBeenCalledWith("status", "draft");
    expect(from).toHaveBeenCalledTimes(5);
    expect(res.body).toEqual({
      success: true,
      audit_id: "audit-existing",
      audit_response: `Opportunites stock.\n\nReference interne: stock-promo:inventory-check:${CHECK_ID}`,
      promotion_id: "promo-existing",
      sms: "Promo stock deja prete."
    });
  });

  it("rejects stock promo audit creation for incomplete checks", async () => {
    const checkLookup = createBuilder({
      single: {
        data: {
          id: CHECK_ID,
          restaurant_id: RESTAURANT_ID,
          week_start_date: "2026-05-04",
          status: "draft"
        },
        error: null
      }
    });
    const { supabase, from } = createSupabaseMock({
      userId: USER_ID,
      queues: {
        inventory_checks: [checkLookup],
        restaurants: [ownerBuilder()]
      }
    });
    const controller = createCreateInventoryStockPromoAuditController(supabase);
    const res = createResponse();

    await controller(
      {
        params: { id: CHECK_ID },
        headers: { authorization: "Bearer valid-token" }
      } as unknown as Request,
      res
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.body).toEqual({ success: false, error: "inventaire non complete" });
    expect(from).not.toHaveBeenCalledWith("audits");
  });
});

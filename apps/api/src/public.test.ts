import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createPublicEnrollController } from "./public.js";

const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";

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

function createSupabaseMock() {
  const supabase = {
    from: vi.fn()
  };
  return supabase as unknown as SupabaseClient & { from: ReturnType<typeof vi.fn> };
}

describe("createPublicEnrollController", () => {
  it("rejects enrollment without explicit SMS consent before touching Supabase", async () => {
    const supabase = createSupabaseMock();
    const controller = createPublicEnrollController(supabase);
    const res = createResponse();

    await controller(
      {
        body: {
          restaurant_id: RESTAURANT_ID,
          name: "Alex Dubois",
          phone: "5145551234",
          opt_in_sms: false
        }
      } as Request,
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({
      success: false,
      error: "consentement SMS explicite requis"
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("continues to the restaurant lookup when explicit SMS consent is present", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "restaurant introuvable" }
    });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const supabase = {
      from: vi.fn(() => ({ select }))
    } as unknown as SupabaseClient & { from: ReturnType<typeof vi.fn> };
    const controller = createPublicEnrollController(supabase);
    const res = createResponse();

    await controller(
      {
        body: {
          restaurant_id: RESTAURANT_ID,
          name: "Alex Dubois",
          phone: "5145551234",
          opt_in_sms: true
        },
        headers: {},
        socket: {}
      } as Request,
      res
    );

    expect(supabase.from).toHaveBeenCalledWith("restaurants");
    expect(select).toHaveBeenCalledWith("id");
    expect(eq).toHaveBeenCalledWith("id", RESTAURANT_ID);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("rolls back the customer and fails when consent logging fails", async () => {
    const customerId = "22222222-2222-4222-8222-222222222222";
    const restaurantSingle = vi.fn().mockResolvedValue({
      data: { id: RESTAURANT_ID },
      error: null
    });
    const restaurantEq = vi.fn(() => ({ single: restaurantSingle }));
    const restaurantSelect = vi.fn(() => ({ eq: restaurantEq }));

    const customerSingle = vi.fn().mockResolvedValue({
      data: { id: customerId },
      error: null
    });
    const customerSelect = vi.fn(() => ({ single: customerSingle }));
    const customerInsert = vi.fn(() => ({ select: customerSelect }));

    const consentInsert = vi.fn().mockResolvedValue({
      error: { message: "consent insert failed" }
    });

    const rollbackEq = vi.fn().mockResolvedValue({ error: null });
    const rollbackDelete = vi.fn(() => ({ eq: rollbackEq }));

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "restaurants") return { select: restaurantSelect };
        if (table === "customers") return { insert: customerInsert, delete: rollbackDelete };
        if (table === "consent_log") return { insert: consentInsert };
        throw new Error(`Unexpected table ${table}`);
      })
    } as unknown as SupabaseClient & { from: ReturnType<typeof vi.fn> };
    const controller = createPublicEnrollController(supabase);
    const res = createResponse();

    await controller(
      {
        body: {
          restaurant_id: RESTAURANT_ID,
          name: "Alex Dubois",
          phone: "5145551234",
          opt_in_sms: true
        },
        headers: {},
        socket: {}
      } as Request,
      res
    );

    expect(consentInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: customerId,
        type: "sms",
        action: "opt_in",
        source: "public_enrollment"
      })
    );
    expect(rollbackDelete).toHaveBeenCalled();
    expect(rollbackEq).toHaveBeenCalledWith("id", customerId);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({
      success: false,
      error: "consentement non enregistré, inscription annulée"
    });
  });

  it("returns success when customer creation and consent logging both succeed", async () => {
    const customerId = "22222222-2222-4222-8222-222222222222";
    const restaurantSingle = vi.fn().mockResolvedValue({
      data: { id: RESTAURANT_ID },
      error: null
    });
    const restaurantEq = vi.fn(() => ({ single: restaurantSingle }));
    const restaurantSelect = vi.fn(() => ({ eq: restaurantEq }));

    const customerSingle = vi.fn().mockResolvedValue({
      data: { id: customerId },
      error: null
    });
    const customerSelect = vi.fn(() => ({ single: customerSingle }));
    const customerInsert = vi.fn(() => ({ select: customerSelect }));

    const consentInsert = vi.fn().mockResolvedValue({ error: null });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "restaurants") return { select: restaurantSelect };
        if (table === "customers") return { insert: customerInsert };
        if (table === "consent_log") return { insert: consentInsert };
        throw new Error(`Unexpected table ${table}`);
      })
    } as unknown as SupabaseClient & { from: ReturnType<typeof vi.fn> };
    const controller = createPublicEnrollController(supabase);
    const res = createResponse();

    await controller(
      {
        body: {
          restaurant_id: RESTAURANT_ID,
          name: "Alex Dubois",
          phone: "5145551234",
          opt_in_sms: true
        },
        headers: {},
        socket: {}
      } as Request,
      res
    );

    expect(customerInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurant_id: RESTAURANT_ID,
        name: "Alex Dubois",
        phone: "5145551234",
        opt_in_sms: true
      })
    );
    expect(consentInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: customerId,
        type: "sms",
        action: "opt_in",
        source: "public_enrollment"
      })
    );
    expect(res.body).toEqual({ success: true, customer_id: customerId });
  });
});

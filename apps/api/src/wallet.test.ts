import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWalletController } from "./wallet.js";
import { generateApplePass } from "./services/passkit.js";

vi.mock("./services/passkit.js", () => ({
  generateApplePass: vi.fn()
}));

const CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";
const RESTAURANT_ID = "22222222-2222-4222-8222-222222222222";
const OWNER_ID = "33333333-3333-4333-8333-333333333333";

function createResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    sent: undefined as unknown,
    headers: {} as Record<string, string>,
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
    setHeader: vi.fn((name: string, value: string) => {
      res.headers[name] = value;
      return res;
    }),
    send: vi.fn((body: unknown) => {
      res.sent = body;
      return res;
    })
  };
  return res as unknown as Response & {
    statusCode: number;
    body: unknown;
    sent: unknown;
    headers: Record<string, string>;
  };
}

function createSupabaseMock(input: {
  userId?: string;
  authError?: { message: string };
  restaurantOwnerId?: string;
}) {
  const auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: input.userId ? { id: input.userId } : null },
      error: input.authError ?? null
    })
  };

  const customerSingle = vi.fn().mockResolvedValue({
    data: {
      id: CUSTOMER_ID,
      restaurant_id: RESTAURANT_ID,
      name: "Alex Dubois",
      points_balance: 120
    },
    error: null
  });
  const customerEq = vi.fn(() => ({ single: customerSingle }));
  const customerSelect = vi.fn(() => ({ eq: customerEq }));

  const restaurantSingle = vi.fn().mockResolvedValue({
    data: {
      owner_id: input.restaurantOwnerId ?? OWNER_ID,
      name: "La Boite Jaune",
      card_bg_color: "#18181b",
      card_text_color: "#ffffff",
      card_label_color: "#a1a1aa",
      card_description: "Carte fidelite"
    },
    error: null
  });
  const restaurantEq = vi.fn(() => ({ single: restaurantSingle }));
  const restaurantSelect = vi.fn(() => ({ eq: restaurantEq }));

  const from = vi.fn((table: string) => {
    if (table === "customers") return { select: customerSelect };
    if (table === "restaurants") return { select: restaurantSelect };
    throw new Error(`Unexpected table ${table}`);
  });

  return {
    supabase: { auth, from } as unknown as SupabaseClient & {
      auth: { getUser: ReturnType<typeof vi.fn> };
      from: ReturnType<typeof vi.fn>;
    },
    auth,
    from
  };
}

describe("createWalletController", () => {
  beforeEach(() => {
    vi.mocked(generateApplePass).mockReset();
    vi.mocked(generateApplePass).mockResolvedValue(Buffer.from("pkpass"));
  });

  it("rejects dashboard pass generation without a bearer token", async () => {
    const { supabase, auth, from } = createSupabaseMock({ userId: OWNER_ID });
    const controller = createWalletController(supabase);
    const res = createResponse();

    await controller({ body: { client_id: CUSTOMER_ID }, headers: {} } as Request, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ success: false, error: "authentification requise" });
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects pass generation when the owner does not own the customer restaurant", async () => {
    const { supabase } = createSupabaseMock({
      userId: OWNER_ID,
      restaurantOwnerId: "44444444-4444-4444-8444-444444444444"
    });
    const controller = createWalletController(supabase);
    const res = createResponse();

    await controller(
      {
        body: { client_id: CUSTOMER_ID },
        headers: { authorization: "Bearer valid-token" }
      } as Request,
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({ success: false, error: "accès refusé" });
    expect(generateApplePass).not.toHaveBeenCalled();
  });

  it("generates a pass when the authenticated owner owns the customer restaurant", async () => {
    const { supabase, auth } = createSupabaseMock({ userId: OWNER_ID, restaurantOwnerId: OWNER_ID });
    const controller = createWalletController(supabase);
    const res = createResponse();

    await controller(
      {
        body: { client_id: CUSTOMER_ID },
        headers: { authorization: "Bearer valid-token" }
      } as Request,
      res
    );

    expect(auth.getUser).toHaveBeenCalledWith("valid-token");
    expect(generateApplePass).toHaveBeenCalledWith(
      expect.objectContaining({
        client: expect.objectContaining({ id: CUSTOMER_ID, pointsBalance: 120 }),
        tenant: expect.objectContaining({ name: "La Boite Jaune" })
      })
    );
    expect(res.headers["Content-Type"]).toBe("application/vnd.apple.pkpass");
    expect(res.sent).toEqual(Buffer.from("pkpass"));
  });
});

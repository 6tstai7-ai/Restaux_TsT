import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { getBearerToken, requireRestaurantOwner, requireUserId } from "./auth.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const RESTAURANT_ID = "22222222-2222-4222-8222-222222222222";

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

describe("API auth helpers", () => {
  it("extracts bearer tokens case-insensitively", () => {
    expect(getBearerToken({ headers: { authorization: "Bearer abc123" } } as Request)).toBe(
      "abc123"
    );
    expect(getBearerToken({ headers: { authorization: "bearer xyz" } } as Request)).toBe("xyz");
    expect(getBearerToken({ headers: {} } as Request)).toBeNull();
  });

  it("rejects missing bearer tokens before calling Supabase auth", async () => {
    const getUser = vi.fn();
    const supabase = { auth: { getUser } } as unknown as SupabaseClient;
    const res = createResponse();

    const userId = await requireUserId(supabase, { headers: {} } as Request, res);

    expect(userId).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ success: false, error: "authentification requise" });
  });

  it("returns the authenticated Supabase user id", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null
    });
    const supabase = { auth: { getUser } } as unknown as SupabaseClient;
    const res = createResponse();

    const userId = await requireUserId(
      supabase,
      { headers: { authorization: "Bearer valid-token" } } as Request,
      res
    );

    expect(getUser).toHaveBeenCalledWith("valid-token");
    expect(userId).toBe(USER_ID);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects non-owner restaurant access", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { owner_id: "33333333-3333-4333-8333-333333333333" },
      error: null
    });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const supabase = {
      from: vi.fn(() => ({ select }))
    } as unknown as SupabaseClient;
    const res = createResponse();

    const allowed = await requireRestaurantOwner(supabase, RESTAURANT_ID, USER_ID, res);

    expect(allowed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({ success: false, error: "accès refusé" });
  });

  it("allows restaurant owners", async () => {
    const single = vi.fn().mockResolvedValue({ data: { owner_id: USER_ID }, error: null });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const supabase = {
      from: vi.fn(() => ({ select }))
    } as unknown as SupabaseClient;
    const res = createResponse();

    const allowed = await requireRestaurantOwner(supabase, RESTAURANT_ID, USER_ID, res);

    expect(supabase.from).toHaveBeenCalledWith("restaurants");
    expect(select).toHaveBeenCalledWith("owner_id");
    expect(eq).toHaveBeenCalledWith("id", RESTAURANT_ID);
    expect(allowed).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });
});

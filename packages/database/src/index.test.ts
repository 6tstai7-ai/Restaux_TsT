import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServerClient } from "./index";

const currentDir = dirname(fileURLToPath(import.meta.url));
const weeklyInventoryMigration = readFileSync(
  resolve(currentDir, "../supabase/migrations/20260503120000_weekly_inventory.sql"),
  "utf8"
);

describe("createServerClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails fast when Supabase service-role environment is missing", () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(() => createServerClient()).toThrow(
      "Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  });

  it("refuses to run in a browser-like environment", () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {});

    expect(() => createServerClient()).toThrow("@app/database is server-only");
  });
});

describe("weekly inventory migration", () => {
  it("creates the weekly inventory tables", () => {
    expect(weeklyInventoryMigration).toContain("create table public.inventory_items");
    expect(weeklyInventoryMigration).toContain("create table public.inventory_checks");
    expect(weeklyInventoryMigration).toContain("create table public.inventory_check_lines");
    expect(weeklyInventoryMigration).toContain("create table public.inventory_alerts");
  });

  it("keeps inventory scoped and queryable by restaurant", () => {
    for (const tableName of [
      "inventory_items",
      "inventory_checks",
      "inventory_check_lines",
      "inventory_alerts"
    ]) {
      expect(weeklyInventoryMigration).toContain(
        `create index ${tableName}_restaurant_id_idx`
      );
    }

    expect(weeklyInventoryMigration).toContain(
      "restaurant_id    uuid not null references public.restaurants(id) on delete cascade"
    );
    expect(weeklyInventoryMigration).toContain(
      "create unique index inventory_checks_restaurant_week_uniq"
    );
  });

  it("supports draft/completed weekly checks and alert snapshots", () => {
    expect(weeklyInventoryMigration).toContain(
      "status           text not null default 'draft' check (status in ('draft','completed'))"
    );
    expect(weeklyInventoryMigration).toContain("item_name             text not null");
    expect(weeklyInventoryMigration).toContain(
      "alert_type               text not null check (alert_type in ('critical','reorder','sell_quickly','surplus'))"
    );
    expect(weeklyInventoryMigration).toContain(
      "severity                 text not null check (severity in ('low','medium','high','critical'))"
    );
    expect(weeklyInventoryMigration).toContain(
      "alert_snapshot           jsonb not null default '{}'::jsonb"
    );
  });

  it("follows existing owner RLS policy style", () => {
    for (const tableName of [
      "inventory_items",
      "inventory_checks",
      "inventory_check_lines",
      "inventory_alerts"
    ]) {
      expect(weeklyInventoryMigration).toContain(
        `alter table public.${tableName}`
      );
      expect(weeklyInventoryMigration).toContain(
        `create policy ${tableName}_owner_all on public.${tableName}`
      );
    }

    expect(weeklyInventoryMigration).toContain(
      "restaurant_id in (select id from public.restaurants where owner_id = auth.uid())"
    );
  });
});

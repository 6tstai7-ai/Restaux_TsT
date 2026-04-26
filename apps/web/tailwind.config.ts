import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1180px"
      }
    },
    extend: {
      colors: {
        // Restaux shell tokens — DESIGN.md §2
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        "text-dim": "var(--color-text-dim)",
        brand: "var(--color-brand)",
        "brand-ink": "var(--color-brand-ink)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",

        // shadcn-style aliases — keep existing primitives compiling
        // (Phase 4 will introduce `tenant` accent vars; primary will move there)
        background: "var(--color-bg)",
        foreground: "var(--color-text)",
        primary: {
          DEFAULT: "var(--color-brand)",
          foreground: "var(--color-brand-ink)"
        },
        secondary: {
          DEFAULT: "var(--color-surface-2)",
          foreground: "var(--color-text)"
        },
        muted: {
          DEFAULT: "var(--color-surface-2)",
          foreground: "var(--color-text-muted)"
        },
        accent: {
          DEFAULT: "var(--color-surface-2)",
          foreground: "var(--color-text)"
        },
        card: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-text)"
        },
        popover: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-text)"
        },
        destructive: {
          DEFAULT: "var(--color-danger)",
          foreground: "var(--color-text)"
        },
        input: "var(--color-border)",
        ring: "var(--color-border-strong)",

        // Tenant accent — flexes per-restaurant via CSS var
        tenant: {
          DEFAULT: "var(--tenant-accent)",
          hover: "var(--tenant-accent-hover)",
          ink: "var(--tenant-accent-ink)"
        }
      },
      fontFamily: {
        display: ['"Inter Display"', "system-ui", "sans-serif"],
        sans: ['"Inter Tight"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      fontSize: {
        // DESIGN.md §3 type scale
        "display-xl": [
          "clamp(2.5rem, 8vw, 4rem)",
          { lineHeight: "1", letterSpacing: "-0.015em", fontWeight: "700" }
        ],
        "display-l": [
          "clamp(2rem, 6vw, 2.75rem)",
          { lineHeight: "1.05", letterSpacing: "-0.015em", fontWeight: "600" }
        ],
        h1: [
          "clamp(1.625rem, 5vw, 2rem)",
          { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "600" }
        ],
        h2: ["1.375rem", { lineHeight: "1.2", fontWeight: "500" }],
        h3: ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-l": ["1.0625rem", { lineHeight: "1.55", fontWeight: "400" }],
        body: ["1rem", { lineHeight: "1.55", fontWeight: "400" }],
        caption: ["0.875rem", { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "500" }],
        micro: ["0.75rem", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "600" }]
      },
      transitionTimingFunction: {
        "out-punched": "cubic-bezier(0.2, 0, 0, 1)"
      },
      transitionDuration: {
        "180": "180ms",
        "240": "240ms"
      }
    }
  },
  plugins: []
} satisfies Config;

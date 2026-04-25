# DESIGN.md — Restaux

> Brand & design system for the Restaux SaaS product.
> Restaux is sold to multiple independent restaurants. This document defines
> the **product identity** — the shell every tenant sees — and the rules
> for **tenant theming** — how each restaurant customer brings their own
> brand inside that shell.
>
> Read this before writing UI code. Anything that contradicts it is wrong.

---

## 1. What Restaux is

**Product:** a B2B SaaS for independent restaurants. Loyalty programs,
mass SMS campaigns, digital wallet cards, customer database. The operator
is a restaurant owner or floor manager — busy, on a phone, mid-shift.

**Audience:** independent restaurants of every kind — fine dining, fast
casual, bistros, food trucks, cafés, bakeries. Casse-croûtes and
chef-driven tables alike. The product must feel as natural in a
neighborhood pizzeria as in a tasting-menu restaurant.

**Brand essence:** **professional kitchen tooling.** Clean, precise,
durable. Like a chef's knife, a stainless prep table, a well-printed
menu. Not playful. Not corporate. Not foodie-cute. **Restaux is the tool;
the restaurant is the star.**

**Adjectives we are:** precise, calm, confident, neutral, professional,
operator-focused.
**Adjectives we are not:** corporate, playful, cute, futuristic, sterile,
trendy, food-themed (no plates, no forks, no chef hats).

### The two-layer model

```
┌─────────────────────────────────────────────┐
│  RESTAUX SHELL  ← product brand (this doc)  │
│  ┌───────────────────────────────────────┐  │
│  │  TENANT SURFACE                       │  │
│  │  ← restaurant's logo, name, accent    │  │
│  │     color, loyalty card design        │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

The **shell** (nav, dashboard chrome, settings, system messages) is
always Restaux. Neutral, consistent, recognizable across every tenant.

The **tenant surface** (loyalty card preview, SMS sender name, customer-
facing pages, the restaurant's own logo in the top-left) flexes per
tenant.

If you're styling something, ask first: *is this the shell or the tenant
surface?* The rules differ.

---

## 2. Palette

### Shell palette — fixed, never overridden

This is Restaux's product identity. Every tenant sees these colors in the
chrome. Defined in `apps/web/src/index.css` on `:root`.

```css
:root {
  /* Foundation — neutral, professional, dark-first */
  --color-bg:           #0B0B0C;   /* near-black, slight cool tint */
  --color-surface:      #16171A;   /* card, elevated panels */
  --color-surface-2:    #1F2024;   /* nested panels, inputs */
  --color-border:       #2A2C31;   /* hairline dividers */
  --color-border-strong:#3D4047;   /* focus rings, emphasized borders */

  /* Type — neutral off-white, no warm or cool bias */
  --color-text:         #ECEDEF;   /* primary copy */
  --color-text-muted:   #9DA0A6;   /* secondary, captions */
  --color-text-dim:     #686B72;   /* tertiary, metadata */

  /* Restaux brand accent — the product's own signature */
  --color-brand:        #E8E5DE;   /* warm off-white / bone */
  --color-brand-ink:    #0B0B0C;   /* text on brand surfaces */

  /* Semantic states — always these, never tenant-overridden */
  --color-success:      #5DAE7A;   /* muted sage */
  --color-warning:      #D4A24C;   /* amber, used sparingly */
  --color-danger:       #D9534B;   /* deep red */
  --color-info:         #6F8AA0;   /* desaturated steel */
}
```

**Restaux's own accent is bone / off-white**, not a color. This is
intentional: the shell stays chromatically neutral so the tenant's
accent color (next section) reads as *theirs*, not as competing with
Restaux. Think of it as a clean white plate — the dish is the point.

### Tenant accent — fully customizable, per-restaurant

Each restaurant configures their accent color in settings. It's stored
in their tenant config and applied via a CSS variable cascade.

```css
/* Set per-tenant via inline style or theme provider */
[data-tenant-theme] {
  --tenant-accent:        #F4C20D;  /* default fallback if not set */
  --tenant-accent-hover:  /* computed: lighten 8% */;
  --tenant-accent-ink:    /* computed: contrast pick black or white */;
}
```

**Where the tenant accent appears:**
- The primary CTA on tenant-facing screens ("Générer la campagne IA")
- The active-state indicator in the tenant's nav (underline / side bar)
- The tenant's logo background or initial-letter badge
- The loyalty card design (heavily — that IS the tenant's brand)
- One-or-two visual accent moments per dashboard view

**Where the tenant accent must NEVER appear:**
- Restaux logo or product chrome
- Semantic states (success/warning/danger keep their fixed colors)
- System notifications, error screens, billing pages
- Auth/login (Restaux's own surface)

### Default tenants

When a restaurant signs up and hasn't picked an accent yet:
`--tenant-accent: #C8B273` — a neutral warm taupe. Looks intentional
on day one, invites them to customize.

### Tenant accent rules

For every tenant accent:
- Must pass 3:1 contrast against `--color-bg` (else we surface a warning
  in the picker and suggest an adjusted shade)
- We auto-compute `--tenant-accent-ink` as `#FFFFFF` or `#0B0B0C`
  whichever has better contrast on the chosen accent
- Hover state: shift lightness +8% for dark accents, -8% for light ones
- Never used as a large background fill (>20% of any screen)

---

## 3. Typography

### Shell type — fixed across all tenants

Two faces. Both free, both on Google Fonts. Loaded once, used everywhere
in the shell.

#### Display — `Söhne` *(or fallback: `Inter Display`)*

Söhne is paid; if not licensed, use **Inter Display** (free, distinct
from regular Inter through tighter optical settings).

- **Use for:** the RESTAUX wordmark, page titles (h1), big numbers in KPIs.
- **Why:** a precise, neutral grotesque. Looks like signage in a
  professional kitchen — clear, no ornament, confident.
- **Settings:** weights 500–700, slight negative letter-spacing
  (`-0.015em`) at large sizes.

#### Body / UI — `Inter Tight`

- **Use for:** all UI copy, labels, buttons, table cells, paragraphs.
- **Why:** explicitly avoiding regular Inter (the AI-slop default).
  Inter Tight has denser horizontal rhythm — better on small screens,
  more confident next to the display face.
- **Weights loaded:** 400, 500, 600, 700.
- **Default:** 400, 16px, line-height 1.55.

#### Monospace — `JetBrains Mono`

- **Use for:** loyalty card codes, phone numbers in tables, order IDs,
  any string the user might need to read character-by-character.
- **NOT for** body copy or emphasis.

### Tenant type — controlled, not free

Tenants do **not** choose their own fonts. The product identity stays
consistent. The only typographic flex per tenant is:

- The restaurant's **name** in the loyalty card preview can render in
  one of three curated tenant display faces: `Inter Display` (default,
  modern), `Fraunces` (warm/editorial, for bistros), `Archivo Black`
  (bold/punchy, for casual/fast). Tenant picks one in onboarding.
- That's it. No custom font uploads. No web-font URL fields. The shell
  font set is the shell font set.

### Type scale (mobile-first, applies across shell)

```
Display XL   clamp(2.5rem, 8vw, 4rem)     Display 700   leading 1
Display L    clamp(2rem,   6vw, 2.75rem)  Display 600   leading 1.05
H1           clamp(1.625rem,5vw,2rem)     Display 600   leading 1.15
H2           1.375rem                     Display 500   leading 1.2
H3           1.125rem                     Inter Tight 600
Body L       1.0625rem                    Inter Tight 400  leading 1.55
Body         1rem                         Inter Tight 400  leading 1.55
Caption      0.875rem                     Inter Tight 500  tracking 0.01em
Micro        0.75rem  uppercase           Inter Tight 600  tracking 0.08em
```

KPI numbers: Display 700, tabular figures
(`font-feature-settings: "tnum"`), so digits don't dance on update.

---

## 4. Layout & spatial system

### Mobile-first, always

The phone is the primary device. Design for 375px first, enhance up.
If a screen looks better on desktop than on mobile, it's wrong.

### Spacing — 4px base, generous outside, tight inside

- Screen edge padding: `1rem` (mobile), `2rem` (desktop).
- Card outer margin: minimum `1rem` on mobile.
- Card inner padding: `1.25rem`–`1.5rem`. Never less.
- Stack rhythm: `0.75rem` between related items, `1.5rem` between
  sections, `2.5rem`+ between major regions.

### Container

Max content width on desktop: `1180px`. Centered. Tables don't stretch
to 1600px just because the screen is wide.

### Grid breakpoints

- Mobile: single column, full bleed minus edge padding.
- `sm` (640px+): KPI grids → 2-col.
- `md` (768px+): nav goes horizontal.
- `lg` (1024px+): editorial layouts allowed (multi-column, side modules).

### One distinctive move per view

Each major view gets ONE non-standard layout decision. Restraint is the
brand. Examples:

- **Dashboard:** the active campaign card has a thick vertical bar in
  the **tenant accent** color on its left edge. Visual weight earned by
  being the action card.
- **Clients:** column headers on desktop in Micro style (uppercase,
  tracking, muted) — looks like a chef's prep list, not a CRM.
- **Identité Carte:** the loyalty card live-preview floats to the right
  of the form on desktop, slightly larger than the form column. The
  preview IS the focus.
- **Scanner:** full-bleed camera viewport, controls floating with
  backdrop blur. No card chrome around the scanner — it IS the screen.

If you find yourself adding a second distinctive move, kill one.

---

## 5. Components

### Buttons — three variants only

```
Primary    bg: var(--tenant-accent)         text: var(--tenant-accent-ink)
           hover: var(--tenant-accent-hover)
           weight: 600   padding: 0.875rem 1.5rem   radius: 0.5rem
           min-height: 48px (mobile tap target)

Secondary  bg: transparent                  text: var(--color-text)
           border: 1px var(--color-border-strong)
           hover: bg var(--color-surface-2)

Ghost      bg: transparent                  text: var(--color-text-muted)
           hover: text var(--color-text)    no border
```

Never: gradient buttons, shadowed buttons, pill buttons (except badges).

### Cards

```
bg:      var(--color-surface)
border:  1px solid var(--color-border)
radius:  0.75rem
padding: 1.25rem mobile, 1.5rem desktop
```

No shadows on the dark theme. Elevation is communicated through border +
surface color, not blur.

### Inputs

```
bg:      var(--color-surface-2)
border:  1px solid var(--color-border)
radius:  0.5rem
padding: 0.75rem 1rem
focus:   border var(--tenant-accent), outline 2px var(--tenant-accent) at 30% opacity
```

Labels above the input, in Caption style, `var(--color-text-muted)`.
Never use placeholders as labels.

### Badges & pills

The "Mode Démo Actif" pattern (and any tenant-status pill):

```
border: 1.5px solid var(--tenant-accent)   /* or --color-warning for system status */
bg:     transparent
text:   matching color, Micro style (uppercase, tracking 0.08em)
padding: 0.375rem 0.875rem
radius: 999px
```

### Nav

- Mobile: hamburger reveals a vertical drawer, items stacked, full-width
  tap targets, active item has a vertical bar on the left edge in
  `var(--tenant-accent)` (3px wide).
- Desktop: horizontal, items separated by `2rem`, active item has an
  underline in `var(--tenant-accent)` (2px, `0.5rem` below baseline).

### Tenant logo placement

Top-left of every tenant-facing screen, next to the **RESTAUX** wordmark
in mobile, separated by a `1px` divider. On desktop, tenant logo is in
the header bar; RESTAUX wordmark moves to a smaller mark in the footer
("Powered by RESTAUX"). On Restaux-system surfaces (billing, support,
auth), only RESTAUX is shown.

---

## 6. Motion

CSS-only unless something genuinely needs Framer Motion.

### Defaults
- Duration: `180ms` for hover/focus, `240ms` for layout changes.
- Easing: `cubic-bezier(0.2, 0, 0, 1)` (ease-out, slightly punched).

### Rules
- ✅ State transitions (hover, focus, open/close): always animated.
- ✅ Number changes in KPIs: subtle count-up (~400ms).
- ❌ No entry animations on page load.
- ❌ No parallax. No scroll-triggered fanciness.
- ❌ No "whoosh." Restaurant operators don't have time for this.

Respect `prefers-reduced-motion`: cut all animations to `0.01ms`.

---

## 7. Iconography

- **Library:** `lucide-react`.
- **Stroke width:** 1.75px everywhere. Never 1, never 2.
- **Size:** matches adjacent text line-height. Default 20px.
- **Color:** inherits from `currentColor`. Never hardcode icon color.
- **No food/restaurant clichés** in the shell — no chef hats, plates,
  utensils, wine glasses. The product is tooling, not decoration.

---

## 8. Voice & copy

- **Language:** product UI is bilingual (FR/EN), tenant-configurable.
  French is the default and primary at launch.
- **Tone:** direct, professional, calm. Like writing on a service
  bulletin in a kitchen — short, clear, no filler.
- **Tenant content** (campaign copy, SMS body) is whatever the tenant
  writes. The shell never editorializes their content.
- **Length:** if a label needs more than 4 words, the design is wrong.
- **Numbers:** always formatted to the tenant's locale (`fr-CA` default).
  `1 234` not `1234`.
- **Capitalization:** sentence case for buttons and labels EXCEPT Micro
  style which is uppercase.
- **No emoji in product UI.** Tenants can use emoji in SMS content if
  they want — that's their voice, not ours.

### Locked product copy

- "RESTAUX" — wordmark, weight 700. The period is optional, decided
  later. Currently no period.
- "Mode Démo Actif" — exact wording.
- Primary CTAs are tenant-configurable defaults but ship with: "Générer
  la campagne", "Envoyer", "Enregistrer", "Annuler".

---

## 9. Accessibility floors — non-negotiable

- Contrast: 4.5:1 for body, 3:1 for large text and UI elements.
- Tap targets: 44×44px minimum on mobile.
- Focus states: visible on every interactive element. 2px outline in
  `var(--tenant-accent)` with 2px offset.
- Form inputs: always have visible labels OR `aria-label`.
- Color is never the only signifier. Errors get an icon + text, not red.
- Drawer/modal: trap focus, ESC to close, restore focus on close.
- Tenant accent picker rejects accents that fail 3:1 against bg, OR
  warns and offers a corrected shade.

---

## 10. Anti-patterns — never ship

- ❌ Restaux's own brand in any color other than the bone off-white.
- ❌ Tenant accent overriding semantic states.
- ❌ Tenant accent on Restaux chrome (logo, billing, auth).
- ❌ Purple-to-pink gradients (anywhere).
- ❌ Glassmorphism / frosted-glass cards.
- ❌ Pure white (#FFF) on pure black (#000).
- ❌ Drop shadows on the dark theme.
- ❌ Plain Inter as the only font.
- ❌ Decorative emoji in product labels.
- ❌ Skeleton loaders with shimmer animation everywhere — use a simple
  muted block.
- ❌ Card-inside-card-inside-card nesting.
- ❌ Stock food photography or food-themed illustrations.
- ❌ Tenant accent as a large background fill.

---

## 11. File map

- Shell tokens: `apps/web/src/index.css` — `:root` block.
- Tenant theme provider:
  `apps/web/src/lib/theme/TenantThemeProvider.tsx` — reads tenant
  config from Supabase, sets `--tenant-accent` and computes derived
  variables on `[data-tenant-theme]`.
- Tailwind config: `apps/web/tailwind.config.ts` — extends with the
  tokens above; `tenant` color references `var(--tenant-accent)`.
- Fonts: `<link>` in `apps/web/index.html`, Google Fonts, `display=swap`.
- Reusable primitives: `apps/web/src/components/ui/` — `Button`,
  `Card`, `Input`, `Badge`, `Nav`.
- Icons: import `lucide-react` per-component.

### Tenant config schema (Supabase)

```ts
type TenantTheme = {
  tenant_id: string;
  display_name: string;        // "La Boîte Jaune"
  logo_url: string | null;     // uploaded asset
  accent_color: string;        // hex, validated for contrast
  card_display_font:
    | 'inter-display'
    | 'fraunces'
    | 'archivo-black';
  locale: 'fr-CA' | 'en-CA' | 'fr-FR' | 'en-US';
};
```

---

## 12. Definition of done

Before any visual change ships:

1. Tested at 375px, 390px, 430px, 768px, 1024px, 1440px. No horizontal
   scroll at any width.
2. Tap targets ≥ 44px on mobile.
3. Contrast checked on all new text/bg pairs (including the
   tenant-accent path with at least 3 sample accents: yellow, deep red,
   forest green).
4. Tokens used — no raw hex outside `index.css` and the tenant theme
   provider.
5. Tenant accent appears only on tenant-surface elements, never on
   shell chrome.
6. Build passes: `pnpm --filter @app/web run build` exits 0.
7. No regressions to prior fixes (React import, audio property, types).
8. Looks like Restaux. Doesn't look like a default Claude landing page.
   Doesn't look like any one tenant's brand has taken over the shell.

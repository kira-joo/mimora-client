# `store-platform` — Design system

> **STATUS: APPROVED as the visual baseline — 2026-10-20, by the owner.** The
> design preview (`src/preview/**`, `/preview`) built from this document —
> including the product card, image gallery, mobile layout, wishlist placement,
> full-width mobile Add to cart and Quick Add — is the approved baseline the
> production storefront (Phase 6) implements. Minor visual refinements may
> follow without blocking implementation. **Where this document and the code
> disagree, the code (`src/styles/tokens.css`, the components) is the ground
> truth** and this document is the one to correct.
>
> *History:* proposed 2026-10-12 with decisions D-S0–D-S5 approved in principle
> (§17.1); the preview iterations of 2026-10 changed the card and Quick Add as
> recorded in the change notes below.

## 0. What the 2026-10-12 review changed

The review re-ran `ui-ux-pro-max` and `apple-design-skill` (§17.3) and read
the backend's real theme contract. Most of this document survived. What did
not:

| # | Change | Why | Where |
|---|---|---|---|
| 1 | **Emotion leads, measurement supports.** The direction is restated as *craft first, precision second* | The earlier framing put "the rule and the spec sheet" at the centre. The brief asks for emotional, visual, premium, creative; a measuring metaphor is a supporting detail, not a feeling | §3 |
| 2 | **The home page and merchandising had no design at all** — now they do: a fixed library of section types | The plan makes home sections, navigation and the announcement bar v1 (#78–80). Rejecting the "Feature-Rich Showcase" landing page was right; leaving nothing in its place was a gap | §13a |
| 3 | **The variant selector is conventional tiles, not values on the rule** | Colour is not a scale; 8 sizes at ≥44px do not fit one rule at 375px; "a gap reads as *not made*" is a learned signal with no accessible equivalent. The rule stays as a signature everywhere it carries information without being a control | §4.2, §10 |
| 4 | **Mobile conversion is specified end to end** — header, filter sheet, add-to-cart confirmation, inset sticky bar with safe area, checkout | §4.3 named the path to cart; nothing covered navigation, filtering or checkout on a phone | §13b |
| 5 | **Motion has named moments**, not one reveal | "Motion that rewards" was asserted and then specified as a single `[ASSUMPTION]` reveal | §14 |
| 6 | **The merchant's theme controls are reconciled with the backend** | The backend stores `brand.{primary, accent, surface, text, radiusScale, typographyChoice}`. This document ignored four of the six | §7a |
| 7 | **The marquee contradiction is removed** | §5 assigned `--sf-support` to "the marquee strip" while §14 bans marquees | §5 |

---

The visual identity and token layer for the customer-facing storefront. Its
identity **borrows nothing from the backoffice**, and the backoffice borrows
nothing from it.

**`src/styles/tokens.css` is authoritative. This document must be kept honest
against it.** Both restaurant design-system documents drifted from their token
files — one describes a palette that had already been superseded, the other lists
four statuses where the code has eight. When they disagree, the code is right and
this document is stale.

---

## 1. What this has to be

Three hard constraints shape every choice below, and none of them is negotiable.

**1. The merchant is data.** No hex, phone number, social URL, store name or
marketing copy may appear in `src/`; `predev`/`prebuild` fails the build on
violations. So **this palette is not a brand — it is the designed default and the
fallback.** It is what the system was measured against and what renders if the
profile read fails. A storefront that loses its brand should degrade to a
designed neutral, not to unstyled text.

**2. Arabic is the default locale and RTL is primary.** This disqualifies
typefaces on function rather than taste. A face without Arabic coverage would
render the majority of the site in a fallback — not a stylistic disagreement, a
broken page. It also rules out the reference's signature move: wide letter-spacing
on uppercase micro-labels, which breaks Arabic's cursive joins into disconnected
glyphs.

**3. This platform sells apparel *and* tools/hardware.** This is the constraint
the visual reference cannot help with, and it is the most interesting one. An
editorial fashion serif at `leading-[0.91]` flatters a linen shirt and makes a
socket wrench look absurd. The identity has to carry both without becoming
generic.

---

## 2. What the tooling recommended, and what was taken

**Both consultations have now been run.** `ui-ux-pro-max` was queried for a
design system, palettes, typography and e-commerce patterns; `apple-design-skill`
was used as an audit lens on accessibility, colour, dark mode and — unexpectedly
— right-to-left. Full account, including what was rejected and why, is in
`../../docs/store/05-design-consultation.md`. The short version:

### Taken, and it changed the direction

- **The Arabic type pairing.** `ui-ux-pro-max` returned **Noto Naskh Arabic +
  Noto Sans Arabic** ("Arabic Elegant" — *"RTL support. Naskh for traditional,
  Sans for modern Arabic"*). This replaced an earlier single-family choice and is
  the single most valuable thing either tool produced: it supplies a **genuine
  display face with full Arabic coverage**, which is exactly what the restaurant
  precedent could not find. See §6.
- **Warm-neutral-plus-gold as the premium register.** Its palette
  (`#1C1917` / `#A16207` / `#FAFAF9`, *"premium dark + gold accent"*) independently
  converged on the same territory as this direction's ink-and-brass. Treated as
  corroboration, not instruction — its own accent measures 4.71:1 against its
  own background, where ours has more headroom at 5.43:1.
- **Six specific RTL rules from `apple-design-skill`** that were genuinely
  missing here, now in §9.
- **More contrast headroom on muted text**, prompted by its dark-mode guidance
  (*"strive for a contrast ratio of 7:1, especially in small text"* for custom
  colours). Muted ink was raised on both grounds — see §5.

### Rejected, with reasons

- **"Liquid Glass" / glassmorphism**, which `ui-ux-pro-max` recommends as the
  primary style for *E-commerce Luxury*. Rejected on **Apple's own guidance**,
  which is the authority the recommendation implicitly appeals to:
  *"Don't use Liquid Glass in the content layer… it creates unnecessary
  complexity and confusing visual hierarchy."* A product grid and a product page
  **are** the content layer. It also requires adaptive dimming keyed to
  background brightness (*"if underlying content is bright → add a dark dimming
  layer ~35% opacity"*), which over **merchant-supplied photography nobody
  controls** is precisely the unpredictability our on-media scrim tokens exist to
  remove. Add the blur cost against a mid-range phone on 4G and it fails three
  ways at once.
- **Cormorant + Montserrat**, its "luxury / high-end / fashion" pairing.
  **Neither has Arabic coverage.** This is the identical disqualification the
  restaurant recorded for Playfair Display SC + Karla — the same tool, the same
  failure mode, twice. **Any font recommendation from any source is checked for
  Arabic coverage before it is evaluated aesthetically.**
- **Its "Feature-Rich Showcase" pattern** — a marketing landing page with
  "Hero > Feature grid > Social proof > CTA". A store's money screens are a
  listing page and a product page. Wrong artefact.
- **Its GSAP motion preset** (`back.out(1.4)` stagger). **GSAP is retired in this
  workspace and a second animation engine is forbidden.** The underlying idea — a
  staggered grid reveal — survives, in `motion/react`, at token durations.

### The negative result, reproduced

`ui-ux-pro-max` was queried for RTL guidance
(`"RTL bidirectional mirrored layout logical properties" --domain ux`). It
returned **six results, none on topic** — transform performance, fixed
positioning, stacking contexts, viewport units. This reproduces the restaurant's
recorded finding exactly, and is worth stating precisely: **it did not return
zero, it returned confident irrelevance**, which is the more dangerous outcome
because it looks like an answer.

**The precedent needs one correction, though:** that finding was about
`ui-ux-pro-max`. **`apple-design-skill` does ship real RTL guidance**, and it is
specific and applicable — see §9. "No tool will help with RTL" was true of one
tool, not of the toolbox.

## 3. The direction: **Measure** — craft first, precision second

> **2026-10-12 restatement.** Both product families are *made things* — a
> washed-linen shirt and a forged chisel are each the work of someone who
> cared how they were made, and both are bought by someone who will use them
> for years. **That is the emotional core: the store presents every product as
> a well-made object worth wanting.** Photography carries the desire, the
> display face carries the voice, the warm material ground carries the
> quality. Measurement — the rule, the spec block, honest numbers — is the
> *signature detail* that proves the care, not the headline. A visitor should
> remember the pictures and the type; they should trust the numbers.
>
> In practice, three layers, in this order of visual weight:
>
> 1. **Campaign** — full-bleed photography, display type over a scrim, one
>    action. The home hero, collection heads, editorial bands (§13a).
> 2. **Shelf** — the grid and the card: calm, even, fast to scan (§4.1, §12a).
> 3. **Workshop detail** — the rule, the spec block, tabular figures, the order
>    timeline (§10). Small, precise, everywhere information is exact.
>
> The paragraphs below are the original statement; they still hold, read
> through this ordering.

> **Register: emotional, visual, conversion-led.** An earlier draft of this
> direction read as restraint for its own sake. That was the wrong reading of the
> brief. The discipline below — one accent, near-zero radius, no decorative
> colour — exists to **clear the stage for photography and type**, not to damp
> the page down. The feeling should be *desire, then confidence*: want it first,
> trust it second.

Apparel and hardware share exactly one language, and it is **measurement**. A
shirt has a size; a chisel has a width. A trouser has an inseam; a wrench has a
drive. Both are bought by people who want the number before they commit, and both
come back when the number was wrong.

So the store sells on **desire carried by precision**. Big, unapologetic imagery.
A display face with real character. Type that gets out of the photograph's way.
And running through all of it, the vocabulary of the rule and the spec sheet —
because for these two product families, **the specification is part of the
seduction.** A 42 mm blade width and a 32/34 inseam are not dry facts; they are
the reason someone believes this is the right object.

**Where the emotion actually comes from**, in priority order:

1. **Photography, given room.** The hero is near-viewport-height; product images
   are large, portrait, ratio-locked and never cropped apologetically.
2. **A display face with a voice** — Noto Naskh Arabic at large sizes has genuine
   calligraphic character in Arabic and reads as considered in Latin. This is the
   change that most closes the gap the owner identified.
3. **Motion that rewards** — a staggered reveal as a grid enters, a slow image
   scale on hover, a decisive add-to-cart confirmation. Never blocking, always
   optional under reduced motion.
4. **One accent, spent deliberately** — brass appears on price, on the primary
   action, and on the thing you are meant to want next. Because it is rare, it
   pulls.

**Conversion is a design requirement, not a marketing overlay.** The primary
action is always visible without hunting: a persistent add-to-cart on mobile, a
price and CTA that never move after load, stock scarcity stated honestly rather
than manufactured, and a checkout that never asks twice for the same thing.

**What this rules out.** Fashion-editorial extremes — near-1.0 display leading,
negative tracking as a signature, wide-tracked all-caps micro-labels. Those are
the reference's identity, and here they are wrong twice: they suit neither a
socket wrench nor the Arabic script.

**What it rules in.** Material warmth over stark white. Imagery over ornament.
Numbers treated as content. Near-zero radius, because a measured edge is a
straight one.

## 4. The conversion axis — the card, the selector, the path to cart

> **This section was missing, and that was a real gap.** The brief asked for
> emotional / visual / **conversion-focused**. The type and palette work above
> answers the first two; conversion is not a typeface decision. An audit of the
> earlier draft found it covered the card's *geometry* (columns, gutters, image
> ratio) and the selector's *correctness* (§14, and `MDS.md` §10) — but nowhere
> reasoned about **completing a purchase**. Named here, then closed.

### 4.1 The product card

Anatomy, in reading order: **image → category eyebrow → name + price on one
row → one stock signal → the action.** Nothing else — **specifications do not
appear on a card**, and the name is **clamped to two lines**. Measured in §12a.

- **Price is set in the display face, at `1.375rem`, in `--sf-ink`** — the
  highest-contrast value in the palette (15.98:1). Price is the second thing a
  scanning customer looks for after the image, so it wants **legibility, not
  decoration**; putting it below any other metadata costs scanning speed on a
  grid of twenty products. *(An earlier draft set price in a brass accent
  "because the accent is rare". Measurement killed that: the accent and the
  action colour differed by a luminance ratio of 1.01, so the palette lost a
  role — see §5. The colour that is now rare is the CTA, which is the thing that
  should pull.)*
- **A price *range* until a variant is chosen** (`from` the minimum active
  price), never a single price that changes after selection. A price that moves
  after the customer has committed to reading is the cheapest way to lose trust.
- **`compareAtPrice` renders only when a genuine prior price exists.** No
  invented anchor. A store sold to more than one merchant must not ship a
  fake-discount affordance, because it will be used.
- **No variant swatches on the card.** This is the decision most likely to be
  questioned, so: a swatch on a card invites a selection the card **cannot
  validate against a sparse matrix**. The customer picks Olive, lands on the
  product, and finds their size is not made in Olive. **One extra tap is cheaper
  than one broken expectation** — and the card cannot know the whole matrix
  without shipping it to every tile in the grid.
- **Nothing essential is hover-only.** Touch has no hover, and the majority
  device is a phone. A hover reveal may add delight; it may never carry
  information.
- **The stock signal is honest.** "Only 2 left" appears when it is true and never
  otherwise. Manufactured urgency is a conversion tactic this platform will not
  ship, because it is sold to merchants repeatedly and would be used at scale.

### 4.2 The variant selector — the highest-leverage surface in the store

In an apparel store this is where size-and-colour confusion becomes either an
abandoned cart or a return. Both are expensive; the return is more expensive.

- **It sits directly under the price, above the fold on mobile.** The decision
  sequence is *want it → can I get it → how much → buy*, and the selector is
  step two.
- **Axis values are tiles, not graduations on the rule.** *Revised
  2026-10-12.* The earlier draft set values on the rule (§10) so that a gap
  would read as "not made". Three problems, each sufficient on its own: colour
  is not a scale, so a colour axis has no meaningful gaps; eight sizes at the
  44px minimum plus spacing (≈400px) do not fit one rule at 375px, so it wraps
  and stops being a rule; and "a gap means not made" is a signal a customer
  has to learn and a screen reader cannot convey. The design consultation
  also recorded that this interaction was never consulted on.
  - **Size and other text axes:** square-cornered tiles, ≥44×44px, label
    centred, `--sf-line-strong` boundary, selected = `--sf-ink` fill with
    `--sf-canvas` label **plus** a 2px inset ring (never colour alone).
  - **Colour axes:** a swatch tile showing the variant's own image crop when
    the variant has one, a flat fill otherwise, always with the colour name as
    visible text beneath the selected one and as the accessible name of each.
  - **Unavailable** stays in place, `aria-disabled`, struck through with a
    diagonal hairline, and the selector line beneath states which reason
    applies ("Not made in Olive" / "Out of stock in M").
  - **Above the tiles, one line reads the current selection in full**
    ("Olive · M"), so the choice is legible without inspecting tile states.
- **The reason for unavailability is stated, because the two reasons are
  different.** "Not made in this colour" is permanent; "out of stock in your
  size" is temporary and recoverable — it is the one that earns a back-in-stock
  signal (v2). Collapsing them into one grey chip throws away the difference the
  customer most needs.
- **Never hidden, never silently switched.** The full rules are §14 and
  `MDS.md` §10; they are correctness rules *and* conversion rules, because
  silently changing someone's selection is how a person buys the wrong size.
- **The size guide is one tap away, in a dialog, and never a separate page.**
  Leaving the product to find a measurement is where sessions die — and for
  apparel, an unread size guide is a return.
- **Selection survives navigation.** Coming back from the size guide, or from a
  back button, must not reset the choice.

### 4.3 The path to cart

- **A persistent add-to-cart on mobile.** Once the primary button scrolls out of
  view, a slim sticky bar carries the name, the resolved price and the button.
  On a long product page the decision is usually made *after* reading the specs
  — by which point, without this, the button is gone.
- **Full-width, ≥48px tall**, comfortably above the 44px floor, because it is the
  one control that must never be mis-tapped.
- **Add-to-cart does not navigate to the cart.** It confirms in place. Sending
  someone to the cart ends browsing, and a store selling both a shirt and a
  chisel wants multi-item sessions.
- **Feedback is immediate and optimistic**, with rollback on failure. Motion
  decorates the confirmation; it never delays it.
- **Trust signals sit beside the button, not in the footer** — return window,
  delivery lead time, accepted payment methods. They answer the objections that
  actually occur at the moment of commitment, and a footer is not where anyone
  looks while deciding.
- **A failed add-to-cart is specific and recoverable.** "This size sold out while
  you were looking" with the selector reopened, never a generic error.
- **Guest checkout is never blocked, deferred, or nudged against.** Account
  creation is offered *after* the order, when it has earned the ask.

### 4.4 What is asserted here, and what is not

Every decision above is reasoned from the product's own constraints — a sparse
matrix, two very different product families, a phone-first Arabic audience — and
**none of it is validated by behaviour yet.** `[ASSUMPTION]` the persistent
add-to-cart bar, the no-swatches-on-card call, and the price-range-before-
selection default are the three most worth measuring once there is traffic.
Recording them as assumptions rather than findings.

## 5. Palette — derived from the reference, measured, both grounds

Every ratio below was computed from these exact values, not estimated. Required:
**4.5:1** for text, **3:1** for non-text (WCAG 1.4.11).

**This palette is a token change away from the reference, not a departure from
it** — see §11 for the full account of what was kept, what could not be kept,
and why.

### The three chromatic roles, and why there are only three

The reference runs **a warm primary, an olive secondary, and a gold-ish accent**.
This palette maps onto that structure rather than inventing one:

| Role | Reference | Here | Used for |
|---|---|---|---|
| `--sf-action` | `--primary` `HSL(24 73% 48%)` | same hue, darkened for contrast | CTA, links, active state, focus. **The only chromatic pull** |
| `--sf-support` | `--secondary` `HSL(101 15% 31%)` | as-is | Category eyebrows, promo bands, the announcement bar *(was "the marquee strip" — §14 bans marquees; corrected 2026-10-12)* |
| `--sf-ink` | `--foreground` | warm graphite | Body **and price** |

**An earlier draft had a fourth role — a brass `--sf-accent` carrying price — and
it was removed by measurement.** Against the warm action colour it measured a
luminance ratio of **1.01:1**: two warm browns of identical weight, which would
have read as one muddy colour and destroyed the "one rare accent" idea the
direction depends on. **Price moved to `--sf-ink`**, which is both the most
legible option (15.98:1) and the more honest one — a price should be the clearest
thing on a card, not a decorated one. *When a capability is superseded, remove
what it replaces.*

### Light ground (`:root` — the designed primary)

| Token | Hex | Role |
|---|---|---|
| `--sf-canvas` | `#F7F5F1` | Page ground — warm paper, the reference's cream |
| `--sf-surface` | `#FFFFFF` | Raised card |
| `--sf-surface-muted` | `#EFEBE4` | Recessed panel, order summary |
| `--sf-ink` | `#1B1A17` | Body text **and price** |
| `--sf-ink-secondary` | `#4A4740` | Secondary text |
| `--sf-ink-muted` | `#5C574F` | Meta, captions |
| `--sf-line` | `#DDD8CF` | Decorative hairline |
| `--sf-line-strong` | `#8A857A` | Control boundary — **meaningful** |
| `--sf-action` | `#9F4E19` | CTA, links — the reference's warm primary, made legible |
| `--sf-action-hover` | `#8D4616` | |
| `--sf-support` | `#4B5B43` | Eyebrows, bands — the reference's olive, as-is |
| `--sf-focus` | `#9F4E19` | Focus ring |
| `--sf-positive` | `#1F6D45` | In stock, delivered |
| `--sf-caution` | `#8A5206` | Low stock, awaiting verification |
| `--sf-critical` | `#A32218` | Out of stock, rejected |

| Pair | Ratio | Need | Use |
|---|---|---|---|
| `ink` / `canvas` | **15.98:1** | 4.5 | Body text and price |
| `ink` / `surface` | **17.40:1** | 4.5 | On a card |
| `ink-secondary` / `canvas` | **8.51:1** | 4.5 | Secondary text |
| `ink-muted` / `canvas` | **6.58:1** | 4.5 | Meta text |
| `ink-muted` / `surface-muted` | **6.03:1** | 4.5 | Muted on recessed panel |
| `action` / `canvas` | **5.39:1** | 4.5 | Link text |
| `action` / `surface` | **5.87:1** | 4.5 | Link on a card |
| `#FFFFFF` / `action` | **5.87:1** | 4.5 | **Label on the CTA fill** |
| `support` / `canvas` | **6.70:1** | 4.5 | Eyebrow, category label |
| `positive` / `canvas` | **5.79:1** | 4.5 | Positive status |
| `caution` / `canvas` | **5.86:1** | 4.5 | Caution status |
| `critical` / `canvas` | **6.89:1** | 4.5 | Critical status |
| `line-strong` / `canvas` | **3.37:1** | 3.0 | Control boundary |
| `focus` / `canvas` | **5.39:1** | 3.0 | Focus ring |

### Dark ground (`[data-ground="dark"]` and the system default)

| Token | Hex | Role |
|---|---|---|
| `--sf-canvas` | `#14130F` | Warm near-black — a neutral `#111` makes warm product photography look like a sticker |
| `--sf-surface` | `#1D1B16` | |
| `--sf-surface-muted` | `#24211B` | |
| `--sf-ink` | `#F5F1E8` | |
| `--sf-ink-secondary` | `#CFC8B9` | |
| `--sf-ink-muted` | `#AEA697` | |
| `--sf-line` | `#2E2A22` | |
| `--sf-line-strong` | `#837C6D` | |
| `--sf-action` | `#EA833E` | The same warm hue, at the brightness a dark ground needs |
| `--sf-action-hover` | `#F09454` | |
| `--sf-support` | `#9DB08F` | Olive, lifted |
| `--sf-focus` | `#EA833E` | |
| `--sf-positive` | `#5BC98C` | |
| `--sf-caution` | `#E0A552` | |
| `--sf-critical` | `#F0736A` | |

| Pair | Ratio | Need | Use |
|---|---|---|---|
| `ink` / `canvas` | **16.49:1** | 4.5 | Body text and price |
| `ink` / `surface` | **15.26:1** | 4.5 | On a card |
| `ink-secondary` / `canvas` | **11.17:1** | 4.5 | Secondary text |
| `ink-muted` / `canvas` | **7.70:1** | 4.5 | Meta text |
| `ink-muted` / `surface-muted` | **6.65:1** | 4.5 | Muted on recessed panel |
| `action` / `canvas` | **6.92:1** | 4.5 | Link text |
| `action` / `surface` | **6.40:1** | 4.5 | Link on a card |
| `canvas` / `action` | **6.92:1** | 4.5 | **Label on the CTA fill** |
| `support` / `canvas` | **8.00:1** | 4.5 | Eyebrow, category label |
| `positive` / `canvas` | **9.01:1** | 4.5 | Positive status |
| `caution` / `canvas` | **8.56:1** | 4.5 | Caution status |
| `critical` / `canvas` | **6.52:1** | 4.5 | Critical status |
| `line-strong` / `canvas` | **4.49:1** | 3.0 | Control boundary |
| `focus` / `canvas` | **6.92:1** | 3.0 | Focus ring |

**All 28 pairs pass.** Muted ink was raised on both grounds after the
`apple-design-skill` consultation, which asks for **7:1 on custom colours,
especially small text** — stricter than WCAG AA. **The tight pair is
`line-strong` on `canvas` at 3.37:1** against a 3:1 non-text floor; lightening a
control boundary breaks it, which is why the contrast gate recomputes from the
CSS on every build rather than trusting this table.

**One pair deliberately does not meet 4.5:1, and must never be used as if it
did:** `--sf-line` at **1.30:1** is a *decorative* hairline. `--sf-line-strong`
exists separately for any boundary that carries meaning. Using one token for both
would ship an inaccessible input on every form. (`ui-ux-pro-max` made exactly
this mistake: both palettes it returned carry a single `border` token measuring
**1.43:1** and **1.17:1**.)

## 6. Type — a real display face, a body face, and numbers as content

> **Delivery (2026-10-22):** every face is **self-hosted** through `next/font/local`
> (`src/fonts/`, sources and licenses in `src/fonts/README.md`); no build or page
> load contacts Google's font servers. Families, weights and the preload split
> below are unchanged. IBM Plex files are IBM's unmodified release files (Reserved
> Font Name "Plex"); the Noto files are documented subsets.

### Families

| Token | Family | Coverage | Used for |
|---|---|---|---|
| `--sf-font-display` | **Noto Naskh Arabic** | **Arabic + Latin** | Display and headings |
| `--sf-font-sans` | **Noto Sans Arabic** | **Arabic + Latin** | Body and UI |
| `--sf-font-mono` | **IBM Plex Mono** | Latin figures | **Specs only** — SKU, dimensions, size labels, stock, order numbers |

**This pairing came from the `ui-ux-pro-max` consultation** and it changed the
direction for the better. An earlier draft used one family across all three tiers
specifically to avoid the Arabic-coverage trap, and accepted a flatter hierarchy
as the price. That price no longer has to be paid: **Noto Naskh Arabic is a
genuine display face with full Arabic coverage**, so the store gets real
display/body contrast in *both* locales rather than in one.

Naskh carries calligraphic character at large sizes — which is where the
emotional register the brief asks for actually comes from — while Noto Sans
Arabic stays quiet and legible underneath it.

**One honest caveat from the specimen:** Noto Naskh Arabic's **Latin** glyphs are
a sturdy, fairly conventional transitional serif — perfectly serviceable, and it
set "Less, but better" and "Forged bench chisel" well. But it is **a different
voice from its Arabic**, which is flowing and calligraphic. The identity is
therefore not quite identical across locales. That is a real trade and it is
acceptable — the alternative is a second Latin display face, which adds weight
and a second personality anyway — but it should be a decision rather than a
surprise. `[ASSUMPTION]` both faces, and that
Naskh's traditional register reads as *considered* rather than *ornate* for a
store selling tools as well as clothes. **This is the assumption most worth
challenging in a real browser with real Arabic product copy**, because it is the
one carrying the identity.

**Mono is for Latin codes only — and this rule is narrower than it first
looked.** The earlier draft said mono was for "specs", on the reasoning that a
spec is Latin-figure content in both locales. **A browser proved that wrong.**
An Arabic spec line is mostly *Arabic*: `عرض الشفرة ٤٢ مم` is an Arabic label
plus Arabic-Indic digits, and **IBM Plex Mono covers neither.** Measured in the
specimen: that string renders at **78px in Plex Mono and 78px in the generic
`monospace` fallback** — identical, i.e. Plex Mono contributed nothing — against
**66px in Noto Sans Arabic**. Every Arabic spec line was silently falling back to
a system monospace and looked visibly wrong: wide, loose, and fighting the
script's joins.

**Worth recording how that hid:** `document.fonts.check('13px "IBM Plex Mono"')`
returns **`true`**. It reports whether *a face for that family loaded*, not
whether it covers the glyphs being set. **A font-loading check is not a coverage
check** — the same trap as a tool reporting something and it not being a
measurement.

So, corrected:

| Content | Face |
|---|---|
| SKUs and Latin product codes (`LSH-M-SND`) | **`--sf-font-mono`** |
| Everything else in a spec line — Arabic labels, units, Arabic-Indic digits | **`--sf-font-sans`** with `font-variant-numeric: tabular-nums` |

Tabular figures give the column alignment mono was wanted for, without asking a
Latin-only face to set Arabic. The restaurant's staff document rejected Fira Code
for headings as "a costume" and that distinction still holds — **mono for codes
is function; mono for headings is decoration** — it simply applies to a narrower
slice than "specs". (`ui-ux-pro-max` recommended Fira Code for headings again
during this consultation. Rejected again, same reason.)

### The merchant's typography choice

*Added 2026-10-12.* The backend stores `brand.typographyChoice`, and `MDS.md`
calls it "a typography choice from a curated set". The pairing above is the
`default`. §7a proposes the set — every member covering Arabic **and**
Latin, checked by rendering Arabic in it, not by `document.fonts.check()`.
The scale below applies unchanged to every member; only the families swap.

### D-S4, verified in a browser — 2026-10-12

A specimen rendered every face in Chrome at 375 and 1440 with Arabic display
copy, Latin, Arabic-Indic and Western figures, and mixed lines
(`مقاس M اللون Olive`, `CHS-42-BE` in `bdi`). **Coverage was measured, not
checked with `document.fonts.check()`:** each sample was set as
`"<face>", monospace` and as `"<face>", serif` against a control proving the
two fallbacks differ — equal widths mean the face set every glyph. Noto Naskh
Arabic, Noto Sans Arabic, Noto Kufi Arabic and IBM Plex Sans Arabic each cover
**all five** samples. (A single-fallback comparison first reported Plex's
Western digits as missing; its tabular figures happen to match monospace
width. The control is what exposed the false negative.) No horizontal
overflow at 375; mixed-script lines keep Latin words, codes and digit order
intact inside Arabic.

**One finding the scale must absorb:** Noto Kufi Arabic is markedly wider. At
the shared `--sf-text-display` minimum (2.75rem) a three-word Arabic name sets
on **four** lines at 375, against two in Naskh. The `contemporary` pairing
therefore needs its own display step — a `--sf-display-scale` of ~0.85,
declared once per typography choice (never per ground) — to be fixed against
real product names in Phase 6 before the pairing ships.

### Scale — Arabic-first vertical rhythm

Arabic needs **more** generous leading than Latin, not less. The reference's
display leading of 0.91–1.03 is unusable here. Nothing goes below **1.2**, and
body copy sits at **1.7**.

| Token | Size | Line height | Tracking | Weight | Use |
|---|---|---|---|---|---|
| `--sf-text-display` | 2.75rem → 4.5rem | **1.2** | `-0.005em` | 600 | Hero, page title |
| `--sf-text-title` | 1.875rem → 2.5rem | **1.25** | 0 | 600 | Section heading |
| `--sf-text-heading` | 1.25rem | **1.35** | 0 | 600 | Card / block heading |
| `--sf-text-body` | 1rem | **1.7** | 0 | 400 | Body copy |
| `--sf-text-body-sm` | 0.875rem | **1.6** | 0 | 400 | Secondary copy |
| `--sf-text-label` | 0.8125rem | **1.4** | **`0.02em`** | 500 | UI labels |
| `--sf-text-spec` | 0.8125rem | 1.4 | 0 | 400 mono | SKU, dimensions, stock |

Display sizes rose slightly from the earlier draft — a display face with
character earns more room, and the hero is where desire is won.

**Tracking is capped at `0.02em`, and uppercase is not a label style.** Arabic is
cursive and contextually joining: wide tracking breaks the joins into
disconnected shapes, and `text-transform: uppercase` is a silent no-op on Arabic.
The reference uses `0.14em`–`0.24em` uppercase micro-labels *pervasively* — a
systemic incompatibility, not an isolated one. **Labels earn emphasis from weight
and colour, never from spacing or case.**

**Every size is in `rem`,** so browser text scaling works. The layout must remain
usable at **200% text size** — `apple-design-skill` asks for at least that, and
it is the one piece of its "scalable text" guidance that transfers cleanly to the
web.

## 7. Token inventory

Organised as one file, `src/styles/tokens.css`, with `:root` as the light ground
and the dark overrides below it.

**Ground-dependent — redefined per ground:** ground/surface, text, lines, action,
support, brand, on-fill, focus, status, on-media/scrim, elevation.

**Declared ONCE on `:root` and never per ground:** type (family, size, line
height, tracking), spacing, radius, durations, easing curves, z-index.

> **This split is the organising principle of the file.** Light and dark differ
> in colour, scrim and elevation only. **The flip must not move a single pixel.**
> Anything geometric defined inside a ground block is a bug, and the reason is
> concrete: a theme change that reflows the page is indistinguishable from a
> layout defect, and it makes every visual regression test ambiguous.

### Which roles a brand may touch, and which it must not

| Role | Overridable by the merchant? | Why |
|---|---|---|
| `--sf-brand*` | **Yes** — this is the merchant's identity | It is what makes two deployments look different |
| `--sf-support*` | **Yes**, as a fill | A band or eyebrow colour is brand territory |
| `--sf-action*` | **No** — *proposed to become "Yes, derived"; see §7a and decision D-S1* | An arbitrary hex cannot be guaranteed to clear 4.5:1 against both a warm white and a near-black ground, *and* to carry a legible label on its own fill. The alternative is letting a store ship unreadable buttons. *(2026-10-12: the backend's `deriveInkForGround` now provides exactly that guarantee — the reason this row rested on no longer holds.)* |
| `--sf-ink*`, `--sf-line*` | **No** | They carry the measured ratios in §5 — and `--sf-ink` now carries price |
| `--sf-positive/caution/critical` | **No** | Status is a learned vocabulary, and a merchant recolouring "out of stock" is a defect, not a brand choice |
| **Any `*-soft` surface** | **No** | See §8 — a surface is ground-dependent |

Plus a `--ftk-*` alias block mapping the toolkit's role vocabulary onto these
tokens, so the few toolkit components used here inherit the identity rather than
importing the admin one.

**On-media tokens are pre-composed, not opacity-modified.** Type over product
photography must clear 4.5:1 against an image whose brightness nobody controls,
so the scrim's stops are tokens (`--sf-on-media-floor`) rather than a
Tailwind opacity modifier — which cannot be applied to a `var()` anyway.

### 7a. The merchant's controls, as the backend actually stores them

*Added 2026-10-12.* This document reasoned about "brand fills" in the
abstract. The backend has a concrete contract
(`store-platform-staff/src/server/content/store-profile.schema.ts`, served by
`GET /api/storefront/theme`):

- `brand` — `primary`, `accent`, `surface`, `text` (hex), `radiusScale`
  (number, default `1`), `typographyChoice` (string, default `"default"`)
- `theme` — `defaultGround`, `darkEnabled`, `allowVisitorChoice`,
  `tokenOverrides[]` (key `primary` | `accent` only)

What each field means to the storefront — **proposed, part of approval**:

| Field | Storefront meaning |
|---|---|
| `primary` | `--sf-brand`, **and — decision D-S1 — the action colour.** Derived per ground with `deriveInkForGround` against `--sf-canvas`: the derived value is the link/text action colour; the CTA fill uses the same derived value, and its label is that ground's own `--sf-canvas` — contrast is symmetric, so a fill derived to clear 4.5:1 against the canvas carries a canvas-coloured label at the same ratio, on both grounds, by construction (this is already how §5's dark ground labels its CTA). The engine guarantees ≥4.5:1 for every parseable hex, so "an arbitrary hex cannot be guaranteed" is no longer true. The designed default `#9F4E19` stays the fallback |
| `accent` | `--sf-support` — eyebrows, bands, the announcement bar — derived per ground the same way |
| `surface`, `text` | **Not applied.** D-2: text colours are never brand-overridable, and a surface is ground-dependent (§8, failure 2). Ground and ink stay the measured tokens of §5 |
| `radiusScale` | **Controls only:** `--sf-radius-control: calc(2px * var(--brand-radius-scale))`. The backend accepts 0.5–2 (`UpdateThemeDto`), so 1–4px; the default `1` gives the reference's own `2px`. **Media and cards stay 0 at every scale** — square photography is the identity. `full` stays reserved for circular affordances. *(Corrected 2026-10-12: an earlier revision assumed 0–4.)* |
| `typographyChoice` | A curated set, **every face covering Arabic and Latin** (§6): `default` = Noto Naskh Arabic + Noto Sans Arabic; `contemporary` = Noto Kufi Arabic (display) + Noto Sans Arabic; `neutral` = IBM Plex Sans Arabic at both tiers, hierarchy from weight. An unknown value renders `default`. Decision D-S4 |
| `theme.*` | As §8. `darkEnabled: false` means the dark ground is never applied, including from the system preference |

**Backend, done 2026-10-12** (`store-platform-staff` `5efed1a`, after the
owner approved D-S1/D-S4 in principle):

1. `STOREFRONT_GROUNDS` holds `#F7F5F1` and `#14130F`; brand fills are measured
   and derived against them on both grounds — no longer against `brand.surface`.
2. `GET /api/storefront/theme` returns the resolved palette per ground and the
   grounds themselves. **The storefront paints from that palette and never
   derives a colour itself**, and its contrast gate asserts its own
   `--sf-canvas` tokens equal the returned `grounds` — the two repositories
   cannot silently disagree.
3. `typographyChoice` accepts only the three curated values; an older value
   reads as `default`.

**Still open — a documentation conflict for the owner:** `MDS.md` lists
`surface`/`text` among the merchant's brand colours, while D-2 makes text and
surfaces non-overridable. The backend stores both and applies neither; the
console now says so. Removing the two fields is a schema and contract change
and was not made without a decision.

---

## 8. Theming — derived, with a narrow override

`[ASSUMPTION → D-3]` **Resolution is a CSS concern, never JavaScript:**

```css
:root                                            { /* light tokens */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-ground="light"])               { /* dark tokens */ }
}
[data-ground="dark"]                             { /* dark tokens */ }
[data-ground="light"]                            { /* light tokens */ }
```

The system preference is honoured **on first paint with zero JavaScript**, every
page stays fully static so ISR survives, and no cookie is involved. Only an
**explicit stored choice** is applied, by a tiny synchronous script injected
first in the document — **wrapped in try/catch**, because `localStorage` throws
outright in a private window with site data blocked and in some embedded
webviews, and an exception there would abort before the attribute is set on a
page that has not yet painted.

**No Server Component branches on theme.** A dark flash on a cold load is a
defect, not a polish item.

### The derivation, and why override is narrow

`[ASSUMPTION → D-2]` The merchant supplies brand fills. **The system derives the
dark palette and every contrast ink.** Override is permitted for **brand fills
only**, validated against **both grounds** at write time, falling back to the
derived value on failure.

Two recorded failures define that boundary, and both are worth stating in full
because each one looks like an over-restriction until you know it happened:

1. **An operator supplied a fill and its ink, and nothing checked the pair.**
   `#6B8F71` with white measures **3.63:1** and failed **16 nodes across 8
   routes** the moment a second store was rendered. The first store's values
   happened to pass, which is why it had never surfaced. Validating the supplied
   pair was the tempting middle answer and it is weaker: it leaves existing data
   broken, it puts the burden on the person least equipped to carry it — a
   merchant cannot be asked to guarantee a contrast ratio, and `#6B8F71` looks
   perfectly reasonable — and it turns a rendering guarantee into a data-entry
   rule that the next import or seed script bypasses without noticing. **So the
   ink is computed from the fill. The failure cannot occur rather than being
   caught.**
2. **A brand `*-soft` surface hex painted a cart notice cream-on-cream on the
   dark ground.** A surface is **ground-dependent** — on light it is a pale tint,
   on dark a deep one — and a single hex emitted inline wins over *both* ground
   blocks. **Every contrast pair still passed**, because the pair that failed was
   one the brand had substituted at runtime. It was found by looking at a
   screenshot.

**The derivation is a pure, unit-tested engine function**, and it lives with the
money engines in the testing floor rather than in a colour utility file — it
decides legibility for every store this platform is ever sold to. Its contract:

- **Input:** the merchant's brand fills, plus the authored ground palettes.
- **Guarantees:** every emitted pair clears its required ratio on **both**
  grounds; the returned ink is always a `var()` reference to a token, never a
  literal, because this module has no business knowing token values.
- **Refuses:** a value that is not a valid hex falls back to the designed
  default rather than breaking the cascade — a CSS custom property is not a
  script context, but `red; background-image: url(...)` would still be accepted
  verbatim, so the shape is validated rather than trusted.
- **Fails loudly:** a brand colour from which no compliant palette can be
  derived is rejected at write time with the measured ratio shown, not accepted
  and quietly degraded.

---

## 9. Right-to-left — the rules, not the aspiration

Arabic is the **default** locale, so RTL is not a mode this design supports; it
is the design. Logical properties throughout — `ms-`/`me-`/`ps-`/`pe-`,
`start`/`end` — never `ml-`/`mr-`/`left`/`right`.

**Six rules below came from the `apple-design-skill` consultation and were
genuinely missing here.** They are marked ✚. Recording that plainly matters,
because the standing assumption in this workspace was that no tool would help
with RTL — true of `ui-ux-pro-max`, not of this one.

| Rule | Why it matters here |
|---|---|
| ✚ **A paragraph aligns to its own language, not the context** | Three-or-more-line blocks align by language; one- and two-line blocks follow the reading direction of the context. A bilingual store shows Arabic chrome around an English product description constantly, and right-aligning a long English paragraph hides the start of every line |
| ✚ **Never flip photography** | A mirrored product photo changes the object. A flipped tool becomes left-handed; flipped packaging text is obvious and cheap-looking. Any blanket `scaleX(-1)` RTL approach is forbidden |
| ✚ **Reverse the *order* of images when the order is meaningful** | The PDP thumbnail rail is sequential, so its positions reverse — while each image itself is untouched |
| ✚ **Never reverse the digits within a number** | A SKU, an order number, a phone number and a price keep their digit order in every locale. Latin codes are set in mono; Arabic spec text uses the sans with tabular figures (§6) |
| ✚ **Reverse the order of numerals that show progress or counting** | The order timeline runs in reading order, so its day graduations reverse. The signature rule (§10) is direction-aware for this reason, not for symmetry |
| ✚ **Don't flip icons of real-world objects — including right-handed tools** | Unusually on point for a store selling tools. A wrench icon is not mirrored; a *back* chevron is |
| **Flip anything directional or navigational** | Back, next, previous, progress. In RTL, "back" points right |
| **Never flip a logo, a checkmark, or a universal mark** | They are recognised as fixed shapes |
| **Preserve a control that means an actual direction** | "Align right" always points right |

**One adaptation rather than adoption.** The guidance suggests increasing Arabic
font size by about 2pt where it sits beside all-caps Latin, since Arabic has no
uppercase and reads smaller by comparison. **This design bans all-caps labels
entirely, so that specific remedy is not applicable** — but the underlying
asymmetry is real wherever a Latin brand name or size code sits inline in Arabic
copy. Handled at the token level instead: a `--sf-latin-inline` adjustment
applied to Latin runs inside Arabic text, rather than a blanket size bump.

**Verified in a browser, in both directions, on both grounds** — not asserted
here.

## 10. The signature element: **the rule**

A thin measured line — a rule, in both senses — with tick marks, used sparingly
and always to carry information rather than decoration:

- Under a section heading, as the section's own boundary — and, on the home
  page, as the one element that repeats across every section type (§13a), so
  a merchant-ordered page still reads as one designed page.
- In the spec block, separating measurements.
- As the order-timeline axis, where days are the graduations.
- *(Removed 2026-10-12: the variant selector's spine. See §4.2 — the selector
  is a control, and a control's states must be legible without learning a
  metaphor.)*

It is one token-driven element (`--sf-rule-*`) reused in three places, and it is
**direction-aware**: the graduations run from the reading-start edge, so it
mirrors correctly in RTL rather than reading backwards.

---

## 11. The reference — what this palette owes it

**The owner supplied `Premium-Commerce-Store/artifacts/atelier-store` as the
intended look. This section states the relationship, because an earlier draft
did not — and a from-scratch type-and-colour exercise with no stated lineage
reads as if the reference had been ignored.** It was not ignored. It was
constrained.

### What was kept

- **The warm cream ground.** The reference's `--background` is
  `HSL(42 45% 96%)` = `#F9F7F0`; ours is `#F7F5F1`. Effectively the same paper.
- **The editorial display register** — a serif-voiced display face against a
  quiet sans body, with generous macro spacing and tight micro spacing.
- **Near-square corners.** The reference's only radius token is
  `--radius-lg: 2px`, and it is never even applied; the only radius in use is
  `rounded-full` on circular icon affordances. Ours matches: 0 for cards,
  images, inputs and buttons; `full` for circular affordances only.
- **Its three-role colour structure** — a warm primary, an olive secondary, a
  neutral warm ink. §5 maps onto that rather than inventing a structure.
- **Portrait product imagery at a consistent locked ratio**, 2 columns on mobile,
  and a near-flat surface treatment using hairlines rather than shadows.

### What could not be kept, and why — the whole reason a typography exercise existed

**The reference's three faces are DM Sans, Fraunces and Inter. All three have
zero Arabic coverage.** This store's **default** locale is Arabic and its primary
direction is RTL, so adopting any of them would render the majority of the site
in a fallback face — not a stylistic disagreement, a broken page. That single
fact is why a typography exercise was necessary at all: **the reference's look
had to be re-achieved with faces that actually cover Arabic**, which is what
Noto Naskh Arabic + Noto Sans Arabic do (§6). The register is the reference's;
the faces cannot be.

The same constraint disqualified `ui-ux-pro-max`'s Cormorant + Montserrat
suggestion, and previously disqualified Playfair + Karla for the restaurant. It
is the most consistent single constraint in this workspace's design history.

### What changed, and the measurement that forced it

**The reference's primary cannot be used at its own value.** `--primary`
`HSL(24 73% 48%)` = **`#D46921`**, and measured against our cream ground it is
**3.30:1 — a text-contrast failure** — while **white on it is 3.59:1**, also
failing. So it cannot be a link colour *or* a filled button with a white label.
That is a hard, arithmetic fact, not a preference.

**So the hue was kept and the luminance was moved**, which is the smallest change
that makes it usable: `--sf-action` is `#9F4E19` — the same hue family (24),
darkened to 36% lightness — measuring **5.39:1** on cream, **5.87:1** on a card,
and **5.87:1** for a white label on its own fill. Its dark-ground counterpart
`#EA833E` sits in the same family, brighter.

**And the earlier deep-green action was dropped.** That was the fair criticism:
green with gold was invented rather than derived, and it read cooler and more
"heritage workshop" than the warm premium retail the reference establishes.
Moving to the reference's warm family is a token change, exactly as the owner
said, and the palette is better for it — the ground and the action now belong to
one warm family instead of holding a deliberate but unearned tension.

**The olive survived intact.** The reference's `--secondary`
`HSL(101 15% 31%)` = `#4B5B43` measures **6.70:1** on our cream and is used
as-is, for eyebrows and bands — the role the reference itself uses it in.

**One thing is knowingly not adopted:** the reference's terracotta `--accent`
`HSL(15 57% 44%)` = `#B05030` (4.78:1, passes). It is omitted because §5 now
carries only three chromatic roles, and a second warm mid-tone was the exact
problem measurement had just removed. Available if a fourth role is ever earned.

### What must not cross over

| Not crossing over | Why |
|---|---|
| Vite, `wouter`, Express 5, PostgreSQL, Drizzle, Orval/OpenAPI, Replit plugins | None of it is our stack |
| ~~Tailwind v4 CSS-first `@theme` config~~ | **Superseded, 2026-09-18 (Phase 12).** `@kira-joo/frontend-toolkit-tailwind@1.0.0` ships a real, tested v4 `@theme`/`@source` contract (`theme.css`), and every consumer in the workspace is on `tailwindcss ^4.3.3`. There is no v3 pattern left to copy. Build on `theme.css`, not the JS preset. |
| **Liquid Glass / glassmorphism** (`ui-ux-pro-max`'s primary style for *E-commerce Luxury*) | Rejected on Apple's own guidance: *"Don't use Liquid Glass in the content layer."* A product grid and product page **are** the content layer. It also needs adaptive dimming keyed to background brightness, over merchant photography nobody controls — and blur costs real milliseconds on a mid-range phone |
| **3D & Hyperrealism, Aurora UI** (its secondary suggestions) | Ornament competing with product photography, which is the one thing that must win |
| **27 `@radix-ui/*` packages and 55 shadcn `components/ui/*` files** | **Do not port shadcn/Radix sets wholesale.** And note: the reference's own storefront imports **none** of them — it is unused scaffold, so copying it would import 55 files of dead weight |
| **Inline hex in `className`** (`#3d352b` × 99, `#b95d31` × 45) | Precisely what `verify-design-tokens.mjs` fails the build on. The reference *has* a CSS-variable layer and bypasses it |
| **Display leading of 0.91–1.03** | Unusable for Arabic, which needs more leading than Latin, not less |
| **Uppercase micro-labels at `0.14em`–`0.24em`** | Breaks Arabic cursive joins; uppercase is a silent no-op on Arabic. Used *pervasively* in the reference, so this is systemic |
| **Pure-LTR authoring** — zero logical-property utilities, hardcoded `lang="en"`, `left-3`/`right-3`, `ChevronLeft` for "back", a fixed L→R hero scrim, `transform-origin: right` underlines | Every one of these breaks in RTL |
| Pexels stock photography | Placeholder content, not an asset set |

**Logical properties throughout: `ms-`/`me-`/`ps-`/`pe-`, `start`/`end`.** Never
`ml-`/`mr-`/`left`/`right`. Directional icons mirror; a "back" chevron points
right in RTL.

## 12. Photography — the media treatment, and the defect the browser found

Photography does most of the work the word "emotional" points at, so how an image
is framed is load-bearing rather than cosmetic. **This section was previously
asserted and untested. It has now been rendered with real photographs at both
tonal extremes** — mean relative luminance **0.084** and **0.484**, measured
rather than eyeballed, because the whole argument is about tonal range.

### The treatment

| | Light ground | Dark ground |
|---|---|---|
| `--sf-media-radius` | **0** | **0** |
| `--sf-media-ring` | `inset 0 0 0 1px rgba(27,26,23,.10)` | *(see defect below)* |
| `--sf-media-shadow` | `0 1px 2px …/.05, 0 10px 26px -10px …/.16` | `none` |

**The reasoning, inherited from the restaurant precedent and then tested:** on a
warm-white ground a photograph must look **contained**, or a dark image bleeds
into the page and reads unfinished. On a near-black ground a photograph should
**dissolve** — its edges melt into the ground, which is what makes a dark store
feel expensive rather than boxy.

**One deliberate departure, verified.** The restaurant contains images with a
**14px radius** plus ring plus shadow. This direction keeps the reference's
square corners, so containment had to come from **ring plus shadow at radius 0**
— and in the browser it does. A near-white bag photo on cream is defined by the
ring; a near-black watch photo on cream is defined by the shadow. **Radius is
not required for containment.** That resolves the tension rather than ignoring it.

### The confirmed defect: "edges dissolve" is conditional on dark photography

**On the dark ground, dark photographs dissolve exactly as intended — and light
photographs punch out as hard bright rectangles.** A product shot on a white
sweep (overwhelmingly common for both apparel and hardware) becomes a glaring
block against `#14130F`, and no ring or shadow fixes it because the *rectangle
itself* is bright.

**This is a reusability-contract failure — §17 of `MDS.md` — which is why it
matters.** The treatment works for
a merchant who shoots dark and breaks for a merchant who shoots on white — it
would pass for store one and fail for store two, which is precisely the class of
defect the second-store fixture exists to catch. **The document previously stated
"edges dissolve" unconditionally. That was wrong.**

### The accepted fix did not work, and here is what does

**The owner accepted the recommendation — imagery on `--sf-surface` rather than
`--sf-canvas`. Implemented and re-shot, it changes nothing**, and the reason is
mechanical rather than aesthetic: the image is `object-fit: cover`, so it **fills
its container completely and the container's background is never visible.**
Setting that background to a slightly lighter tone helps only while the image is
loading, or if it letterboxes. A bright photograph still meets near-black at its
own edge.

**Reported rather than quietly shipped**, because the recommendation was mine and
it was wrong.

**A ring on the dark ground was tried next and also fails** — a light 14%-opacity
inset ring is invisible against a bright photograph, which is precisely where it
was needed.

**What does work: an inset edge-darkening on the dark ground only.**

```css
[data-ground="dark"] .media::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  box-shadow: inset 0 0 22px 10px var(--sf-canvas);
}
```

The photograph's **outer edge** fades into the ground, so a white-sweep product
no longer reads as a hard bright rectangle, while **the centre of the product is
untouched** — colour fidelity is preserved where it matters for buying. A dark
photograph is unaffected, because its edges were already near the ground: it
still dissolves.

**The trade, stated:** on a product that runs to the frame edge, the product's
own edge is dimmed slightly along with the background. For a studio shot on a
sweep — the normal case — what gets dimmed is the sweep, which is not the
product. `[ASSUMPTION]` the 22px/10px spread is right; it is the value that
looked correct at 375 and should be re-checked at 1440 before it is fixed as a
token.

**Either way it becomes an asset requirement**, and `docs/asset-requirements.md`
is where it belongs — the restaurant pair carries exactly such a document.

### What else the specimen confirmed

- **Type over photography works.** White Naskh over the dark hero, with a
  pre-composed scrim, is legible and genuinely striking at 375 and 1440.
- **The warm action colour is sympathetic to product photography** in a way the
  earlier deep green would not have been — burnt orange sits naturally beside tan
  leather and warm wood. That is an argument for the reference's palette that
  arithmetic could not have produced, and it is the strongest vindication of the
  owner's steer.
- **Price in `--sf-ink` reads as authoritative** and leaves the CTA as the only
  chromatic pull, exactly as §5 intended.
- **The olive eyebrow is recessive** — it passes at 6.70:1 but reads dim at 13px.
  Acceptable for a category label; wrong if it is ever load-bearing.

### One honesty note about the specimen itself

The photographs used were a **watch** and a **leather bag**, not the chisel and
linen shirt the copy names — they were chosen for their measured luminance, not
their subject. **The treatment conclusions hold** (they are about tonal range),
but the *subject-matter* question — does this identity flatter a hand tool as
well as a garment — was answered by the earlier type specimen with real Arabic
copy, not by these images.

## 12a. The product card — measured, not asserted

**Owner's finding: the card was too tall, everything stacked, and the opposite
side sat empty.** Correct, and the fix reached four decisions.

### What changed

1. **The specification block left the card.** Blade width, overall length, SKU —
   that is product-detail content. On a grid it is noise, and it was the single
   biggest contributor to card height.
2. **Price moved onto the title row**, at the opposite end, sharing a baseline:
   title start-aligned, price end-aligned, correct in both directions.
3. **The name is clamped to two lines.** This was not in the original
   instruction; it came out of the measurement (below) and it matters more than
   anything else here.
4. What remains: image · eyebrow · **name + price on one row** · one stock
   signal · the action. Nothing else.

### The measurements

Tallest card in the grid, and total page height, measured in the browser:

| | Old | New (name+price) | **+ 2-line clamp** | Saved |
|---|---|---|---|---|
| 375 · `ar` | 475px | 442px | **396px** | **79px / 17%** |
| 375 · `en` | 521px | 511px | **396px** | **125px / 24%** |
| 1440 · `ar` | 668px | 612px | *see note* | 56px+ |
| 1440 · `en` | 691px | 612px | *see note* | 79px+ |

Page height at 375·`ar`: **2081px → 1903px**. At 1440·`en`: **1568px → 1410px**.

### The clamp is the finding, not the footnote

Without it, the tallest card is 442px and the shortest 396px — a **46px ragged
spread** across one row, which reads as unfinished. With it, **every card is
exactly 396px and the spread is 0.** Even card heights in a grid are worth more
visually than the 46px saved.

It also fixes a second problem the specimen exposed: a long Arabic name wrapped
to **four lines**, and the baseline-aligned price then floated alone at the top
of the row with a visible hole beneath it. Two lines removes the hole.

### The conversion claim — the honest version

**Whole products above the fold did not change: 2 at 375, 4 at 1440, before and
after.** At 375 the grid is 2-up and exactly one row fits either way; at 1440 all
four fit either way. Reporting otherwise would have been an impression, not a
number.

**What did change is how much of the next row is revealed**, which is what
actually drives the scroll:

| | Old | New | Gain |
|---|---|---|---|
| 375 · `ar` | 133px (28%) | **189px (43%)** | +56px, +15pts |
| 375 · `en` | 110px (21%) | **166px (33%)** | +56px, +12pts |

A third of the next row visible instead of a fifth is a real difference in
whether a customer keeps scrolling. **That is the conversion argument, and it is
a smaller and more specific claim than "more products per screen".**

### The long-name case, verified

Measured at 375 with a deliberately long Arabic name: **no horizontal collision**
— the price keeps a 10px gap, held by `flex: none` on the price and
`min-width: 0` on the name. That holds before the clamp; the clamp makes it moot.


## 13. Spacing, layout, and the product grid

- **Spacing scale** (`--sf-space-*`): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 ·
  128 px. Declared once, never per ground.
- **Container:** `max-width: 1440px`, gutters 16px / 24px / 32px across
  breakpoints.
- **Section rhythm:** 64px mobile → 112px desktop.
- **Product grid:** 2 columns → 3 at `md` → 4 at `lg`, gutters 12px → 20px.
- **Product image:** `4/5` portrait, tightening slightly on mobile, ratio-locked
  so the grid never reflows.
- **Radius** (`--sf-radius-*`): 0 for cards and images at every merchant
  setting; inputs and buttons take `--sf-radius-control` — 2px at the default
  `radiusScale` of 1, 0–8px across the merchant's range (§7a); `full` for
  circular icon affordances only. A measured edge is a straight one.

## 13a. The home page and merchandising — a fixed library of sections

*Added 2026-10-12.* The home page is where "emotional, visual, creative" is
won or lost, and this document previously said nothing about it beyond
rejecting a marketing landing-page pattern. The plan makes it configurable
(#78 home sections, #79 navigation, #80 announcement bar, all v1), and
`MDS.md` §6.1 names its parts — *hero, featured collections, categories, a
product rail, content sections — all configured, none hardcoded*.

**The merchant orders sections; the design owns every section.** No free
layout, no per-section colours, no font picker. A merchant can make a
different home page; they cannot make a broken one. That is what keeps a
second store looking designed rather than assembled.

| Section | Composition | Mobile (375) | Desktop (1440) | Feeds from |
|---|---|---|---|---|
| **Campaign hero** (at most one, first) | Full-bleed image, display headline + one line + **one** action, on a pre-composed bottom scrim | 4:5, ≈80svh, type bottom-start | 16:9 up to `calc(100svh − header)`, type bottom-start in a 6-column measure | Store profile hero media, or a collection |
| **Collection story** | Large image beside (desktop) or above (mobile) a heading, two lines, and a rail of that collection's products | Image 4:5, then a horizontal snap rail | 7/5 split, image to the reading-start edge | A collection |
| **Product rail** | A heading with the rule, "view all", products as cards | Horizontal scroll-snap, 2.2 cards visible — the partial card is the scroll cue | 4-up grid, no scroll | A collection, or newest |
| **Category tiles** | Image tiles with the category name set on the image's scrim | 2-up | 4-up (or 3 for three) | Selected categories |
| **Editorial band** | One full-width image, one line of display type, one link | 4:5 | 21:9 | A collection or a page |
| **Assurance strip** | Three facts — delivery window, return window, accepted payment methods — each icon + text | Stacked | One row | Fulfilment, payment and returns settings — never typed copy |

**Every section degrades to nothing, never to scaffolding.** A section whose
collection is empty or unpublished does not render. A home page with no
sections configured renders the assurance strip and the newest-products rail —
the `MDS.md` §6.1 requirement that home renders with no hero, no featured
collections and an empty catalog.

**The announcement bar** sits above the header in `--sf-support` with
`--sf-canvas` text: one message, optional link, **static** — no marquee, no
auto-rotation (§14). Dismissible, and remembered per message for the session.

**Navigation** (#79): the header carries the merchant's chosen categories and
collections, in their chosen order. On desktop, a single row of up to 6
items; on mobile, a drawer from the reading-start edge. The footer carries
the legal pages (`legal-and-consent.md` — `contact` on every page), the
store's contact details and social links from the profile, and newsletter
capture (#42 — capture only, D-8).

**The content model exists** (`store-platform-staff` `13c2a02`, owner's
"Option A", 2026-10-12): one storefront-content record, **draft then publish**.
What it fixes for this design:

- The six section types above are the whole vocabulary; a section carries
  content and references, never colour or layout. The campaign hero's image
  is the store profile's hero media (`MDS.md` §6.1); editorial bands and
  collection stories use their collection's image.
- **Several announcements, one shown at a time** — the first enabled one in
  its window. The response says when that next changes, so the storefront
  bounds its cache by it.
- **Footer navigation is the merchant's; the published legal pages are always
  listed beside it** and cannot be removed (`legal-and-consent.md` — `contact`
  on every page).
- A section whose collection is unpublished after publishing **drops out**
  rather than rendering an empty frame.
- The merchant previews the draft as the storefront would serve it in the
  console. A visual preview *in the storefront itself* needs a preview
  handshake that is Phase 6 work.

## 13b. Mobile conversion — the whole path on a phone

*Added 2026-10-12.* `MDS.md` assumes the majority of traffic is a phone, in
Arabic, on an unreliable connection. §4 covers the card, the selector and
the add-to-cart button; this covers the rest.

- **Header:** 56px, sticky, solid `--sf-canvas` with a hairline once
  scrolled — **no backdrop blur** (§11: blur over content was rejected). Menu
  at the reading start, store mark centred, search and cart at the reading
  end. The cart count is a live region.
- **Search** opens a full-screen sheet with the field focused, recent
  searches, and category shortcuts — never a tiny inline field.
- **Listing:** a sticky bar under the header holds *Filter* and *Sort*. Filter
  opens a bottom sheet; its primary button reads **"Show 24 products"** with
  the server's live count, so a filter that empties the grid is caught before
  it is applied. Applied filters show as removable chips above the grid.
- **Product page:** gallery first, swipeable with a position indicator,
  never hijacking vertical scroll. Then name, price, the selector (§4.2), the
  primary action, and the assurance line beside it (§4.3).
- **The sticky add-to-cart bar** is inset within the 16px gutters — not
  edge to edge — and clears `env(safe-area-inset-bottom)`. It holds the
  resolved price and the button; it does not cover the selector it depends on.
- **Add-to-cart confirms in a sheet**, not a page and not a toast: the line
  just added, the cart subtotal **as the server returned it**, and two actions
  — *Checkout* and *Keep shopping*. Desktop shows the same content as a panel
  from the reading-end edge.
- **Cart** is a page (`/cart`), with the checkout button sticky at the bottom
  on mobile and the total above it, as returned by the server.
- **Checkout** is one page in the sections `MDS.md` fixes (contact →
  fulfilment → address/pickup → payment → review). On mobile the order
  summary collapses to one line showing the server's total, expandable. Phone
  first (D-9), `inputmode="tel"`, `autocomplete` on every field, errors on
  their field. The terms acceptance (D-13) is an unticked checkbox naming
  Terms of Sale and Returns, each opening in a sheet over checkout, never
  navigating away.
- **Targets:** ≥44px everywhere, 48px for the primary action; 8px minimum
  between adjacent targets.

---

## 14. Motion

Tokens only. No literals.

| Token | Value | Use |
|---|---|---|
| `--sf-duration-fast` | 150ms | Hover, focus, colour |
| `--sf-duration-standard` | 250ms | Reveals, disclosure, swatch state |
| `--sf-duration-slow` | 400ms | Overlays, sheets, gallery change |
| `--sf-ease-standard` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Almost everything |
| `--sf-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Leaving |

- **Motion never delays an action.** Add-to-cart feedback is immediate; the
  animation decorates it.
- **`prefers-reduced-motion` gets a genuine non-animated path**, not a shortened
  duration.
- **The ground flip is not animated.** Geometry does not move, and crossfading a
  whole page's colour is nausea rather than polish.
- Nothing animates on the critical path to first paint.
- No page transitions, no scroll-jacking, no marquee, no parallax, no film
  grain (the reference's `.grain` overlay — it sits over the content layer).

### The moments — *specified 2026-10-12*

"Motion that rewards" was asserted in §3 and then specified as one
`[ASSUMPTION]` reveal. These are the moments, and the list is closed — a
moment not here is not added without a reason recorded here.

| Moment | What moves | Duration / ease | Reduced motion |
|---|---|---|---|
| **Hero settle** | The hero image eases from 1.04 scale to 1; the headline fades and rises 12px, after the image has painted | `slow` / `standard` | Static, final state on first paint |
| **Section reveal** | A section's heading and first row fade and rise 12px **once**, on first entry into view; cards stagger 50ms, capped at the first 6 | `standard` / `standard` | Static |
| **Card image** | Slow scale to 1.03 on hover — `(hover: hover) and (pointer: fine)` only; never carries information (§4.1) | `slow` / `standard` | None |
| **Gallery change** | Crossfade between images | `standard` | Instant swap |
| **Add to cart** | The button shows its confirmed state immediately; the cart count ticks; the confirmation sheet slides in | `fast` → `slow` / `standard` | Sheet appears, no slide |
| **Sheets and drawers** | Slide from their edge — bottom on mobile, reading-start for the menu, reading-end for the cart panel — so they mirror in RTL | `slow` in, `standard` out / `standard`, `exit` | Fade only |
| **Selector state** | Tile fill and ring | `fast` | Instant |

**Each one is cancellable and never blocks input**: a tap during a sheet's
entrance acts at once. A frequent interaction — the selector, the stepper —
gets state change, not choreography (`apple-design-skill`, Motion: *"avoid
adding motion to UI interactions that occur frequently"*).

---

## 15. States are deliverables

Each of these is designed here, not discovered in implementation. Every one is
specified on **both grounds** and in **both locales**.

| State | Treatment |
|---|---|
| Loading | Skeletons matching final geometry exactly. **Layout stability is a requirement** — a price or add-to-cart that moves after load causes mis-taps |
| Empty catalog | A designed statement, not a blank grid |
| No filter matches | Says what was searched, what is applied, and offers one tap to drop the narrowest filter |
| **Low stock** | `caution` + icon + text. Never colour alone |
| **Out of stock** | `critical` + an explicit statement. The button is **visibly disabled, never hidden** |
| **Variant unavailable for this selection** | The tile stays in place, struck through, `aria-disabled`, with the reason stated in the selection line (§4.2) — *was "a gap in the rule", revised 2026-10-12*. **Never hidden, never silently re-selected** |
| **Compare-at price in Arabic** | **Open defect** (`05-design-consultation.md`, Part 6): `line-through` at a smaller size beside a Naskh price renders cramped and overlapping. Proposed treatment, to verify in a browser before it is fixed as a token: the prior price on its own line beneath, in `--sf-ink-muted`, with a thicker offset strike (`text-decoration-thickness` + `text-underline-offset` equivalent), never inline beside the current price |
| Home with nothing configured | Assurance strip and newest-products rail only (§13a) — never empty section frames |
| **Terms changed during checkout** | The server refuses the order and returns the live terms version; checkout reopens the terms sheet at the acceptance checkbox, unticked, with one line saying the terms were updated. Nothing else in the form is lost |
| Cart line no longer purchasable | Surfaced explicitly with a one-tap remove and a link back |
| Zone not served / below minimum | Specific and actionable |
| **No fulfilment capability enabled** | A first-class designed state saying the store cannot currently take orders. **No dead UI, no empty scaffolding** |
| Proof rejected | The staff reason, and a path to resubmit |
| Brand read failed | Degrades to this designed palette, not to unstyled text |

---

## 16. Verification

- **The contrast gate runs over `tokens.css` on every build, on both grounds**,
  and recomputes every pair in §5 rather than trusting this table.
- **A rendered-contrast gate** walks the real paint stack in a browser on both
  grounds — because the two failures in §8 both passed the declared-pair check.
- **Browser QA at 375 / 768 / 1024 / 1440, in both locales, on both grounds** —
  four combinations.
- **The second-store fixture differs in theme configuration**, not just palette.
  A derived dark palette tested against one brand's colours has not been tested.
- **Measure the DOM for anything geometric.** A screenshot proves what a frame
  looked like, not why.
- **Confirm the gates can fail.** Introduce a hex, a phone number, a social URL
  and a brand string, and a sub-threshold pair on each ground, and confirm each
  goes red. *A test that cannot fail proves nothing.*

---

## 17. For the owner — the decisions this review needs, and the evidence behind it

### 17.1 Decisions

Approving this document is the entry condition for Phase 6
(`docs/store/phases/06-storefront.md`).

**Owner decisions, 2026-10-12 — approved in principle:** D-S0 the refined
emotional, premium, editorial direction with precision supporting it; D-S1
the merchant's `primary` drives primary CTAs, with legibility guaranteed by
the contrast engine; D-S2 explicit variant tiles, never a silent switch; D-S3
the six-section home library; D-S4 three curated Arabic-covering pairings,
verified in Arabic, Latin, RTL and mixed script (done above, with one scale
finding); D-S5 dark ground off by default, merchant opts in. Home content as
"Option A" — draft then publish, configurable footer with legal links always
present, several announcements shown one at a time. **Final approval of the
document is still pending.**

The table below is the recommendation as it was put to the owner:

| # | Decision | Recommendation | Why |
|---|---|---|---|
| **D-S0** | **Approve the direction** — *craft first, precision second* (§3), on the warm cream/terracotta/olive palette (§5), Noto Naskh + Noto Sans Arabic (§6), square media (§13) | Approve | Every constraint in the brief, MDS and plan is met, measured, and verified in a specimen; the open items are below, not inside it |
| **D-S1** | **Does the merchant's `primary` colour drive the call to action?** | **Yes, derived** (§7a) | It is what makes two stores look like two brands. The reason it was "No" — an arbitrary hex cannot be guaranteed legible — is now false: the backend's `deriveInkForGround` guarantees ≥4.5:1 by construction. The cost: the CTA is no longer always the reference's terracotta |
| **D-S2** | **Variant selector: conventional tiles instead of values on the rule** | Tiles (§4.2) | Colour is not a scale; 8 sizes do not fit one rule at 375px; a gap is not an accessible signal. The rule stays as the signature where it is not a control |
| **D-S3** | **The home-page section library** (§13a) — six types, merchant orders them, design owns them | Approve as listed | It is also the content model the backend needs for #78–80, so this decision and that one are the same decision |
| **D-S4** | **The typography set** behind `typographyChoice` | Three: `default` (Naskh + Sans Arabic), `contemporary` (Kufi + Sans Arabic), `neutral` (Plex Sans Arabic) — or ship only `default` in v1 | The field exists and is merchant-editable today with free text. Either the set is defined or the field is narrowed; leaving it free is the worst option |
| **D-S5** | **Is the dark ground on by default for a new store?** | Off by default (`darkEnabled: false`), merchant opts in | Light is the designed primary; dark depends on photography the merchant has not supplied yet (§12 edge treatment) |

### 17.2 Visual references — directions to take, not stores to copy

Named from general knowledge for what each does well; **none was browsed for
this review**, so treat them as lenses to look at together, not as evidence.

| Reference | Take | Leave |
|---|---|---|
| **The owner's `atelier-store`** (in the workspace) | Cream ground, square corners, serif display over quiet sans, olive bands, generous section rhythm, portrait product imagery | Everything §11 lists — Latin-only faces, uppercase tracked labels, the grain overlay, the marquee, hover-only "View piece", LTR-only authoring |
| **Huckberry** | Apparel and tools/gear sold side by side without either looking out of place; product rails anchored by editorial stories | Density and promotional noise |
| **Aesop** | Material warmth; type that feels considered; restraint as luxury | Its near-absence of product grids — this is a store first |
| **Ounass** | Premium fashion commerce authored Arabic-first; RTL merchandising and Arabic display type at large sizes | Its luxury-marketplace scale and navigation depth |
| **Best Made Co.'s catalogue photography** | Hand tools photographed as craft objects — the single best precedent for "a chisel worth wanting" | Its americana branding |

### 17.3 What the two consultations said this time

**`ui-ux-pro-max`** (`--design-system "premium ecommerce lifestyle editorial
store"`, plus domain searches). It again returned the *Feature-Rich Showcase*
pattern, *Liquid Glass*, Playfair Display + Inter, and a GSAP stagger —
**all rejected again for the reasons in §2 and §11** (Playfair and Inter have
no Arabic). A landing-pattern query for e-commerce heroes returned **zero
results**; a retry returned conversion funnels for SaaS — not applicable.
**Useful this time:** the *Exaggerated Minimalism* and *Editorial Grid*
styles corroborate §13a's campaign/editorial layer; the *Content Jumping* rule
("reserve space … aspect-ratio for media") corroborates §15's loading state;
the *Motion Sensitivity* rule corroborates §14's ban on scroll effects; its
Arabic font list confirmed Noto Kufi Arabic (variable 100–900) and IBM Plex
Sans Arabic as Arabic-plus-Latin families for D-S4.

**`apple-design-skill`** (typography, motion, layout references), classified:

| Finding | Classification |
|---|---|
| *"Minimize the number of typefaces"* — two families plus mono for codes | **Already handled** |
| *"Avoid adding motion to UI interactions that occur frequently"* | **Applicable and confirmed** — §14 limits frequent interactions to state change |
| *"Let people cancel motion"* | **Applicable and confirmed** — §14 |
| *"Avoid full-width buttons … respect system-defined margins"* | **Applicable and confirmed** — the sticky bar's button is inset within the gutters and clears the safe area (§13b). Needs browser verification in Phase 6 |
| *"Keep text truncation to a minimum as font size increases"* vs the two-line name clamp | **Applicable, held** — the clamp is on the card only; the full name is the PDP heading. Must be checked at 200% text size |
| Bottom tab bar instead of a menu for primary navigation | **Not applicable** — a store's primary navigation is its catalogue, and a fixed bottom bar would compete with the sticky add-to-cart bar on the page that matters most |
| Liquid Glass / materials | **Conflicts with our approved constraints** — rejected in §2, unchanged |

---

## 18. Findings from the browser preview — 2026-10-12

*Proposals only. Nothing below changes a decision in this document; each is
for the owner to accept or reject.* The preview (`src/app/preview/`, run with
`docs/tasks/ws dev store-platform 3200`, open `/preview`) renders this design
in a real browser at 375 / 768 / 1280 / 1440, both locales, both grounds.

| # | Finding (measured) | Where | Proposal |
|---|---|---|---|
| P-1 | **"Name + price on one row" fails on narrow cards.** A phone rail card is ≈145px and a two-up grid card ≈165px; the Arabic display-face price takes over half, so the two-line clamp leaves two or three words of the name (`قميص كتان…`). §12a measured card *height*, not name legibility | §4.1, §12a | On a card narrower than 230px only, the price moves beneath the name (one extra line, clamp kept). Wider cards keep the row. Toggle in the preview: Review controls → Card |
| P-2 | **The selector is not above the fold on a phone.** At 375×812 the first axis starts at **779px** (821px with the preview bar) — the full-width 4:5 gallery and the header/announcement take the screen | §4.2 vs §13b | Cap the phone gallery at ≈56svh (cropped by `object-fit`, swipe unchanged), which brings name, price and the first axis above the fold; or accept below-the-fold and rely on the sticky bar. Owner choice |
| P-3 | **The hero headline fades in from zero.** For visitors with motion on, the largest text on the home page — the likely LCP element — is invisible until JavaScript hydrates. §14 also says nothing animates on the critical path to first paint | §14 "Hero settle" | Keep the image settle; let the headline only rise 12px from full opacity, so it paints immediately |
| P-4 | **"Only a few left" has no data behind it.** The variant matrix carries `purchasable` only; the storefront is deliberately never told a stock count | §4.1, §15, `MDS.md` §6.3 | Either add a server-computed `lowStock` boolean to `MatrixVariant` (a backend contract change, threshold from inventory settings) or drop the signal. The preview shows it from a preview-only flag |
| P-5 | **The listing facets exceed the API.** `GET /api/storefront/products` filters by category, brand and price only; `/facets` takes no query, so it cannot return the live count that "Show 24 products" needs, nor size, colour or collection filters | §13b listing | A Phase 4 contract addition: option-axis and collection filters (existential across axes — one variant must satisfy all), and facet counts against the current query |
| P-6 | **The compare-at treatment** proposed in §15 (prior price on its own line, thicker strike) is what the preview renders, in both locales | §15 | Confirm or reject it by looking at the listing |

**Implementation findings, already handled in the preview** (recorded so
Phase 6 does not rediscover them):

- **RTL scroll rails need `contain: paint`.** Without it Chrome counted the
  rails' scrolled-away cards as page overflow once they had revealed — the page
  panned sideways at 375 (42px; 827px when the reveal wrapped the list).
  Clipping an ancestor, removing scroll-snap and `overflow:hidden` on the list
  did not fix it; paint containment did.
- **Reduced motion cannot be decided on the server.** Motion wrappers render
  one element tree regardless of preference; `MotionConfig reducedMotion="user"`
  drops transforms and a `[data-reveal]` CSS guard makes the final state the
  first paint. Branching the tree on `useReducedMotion()` produced a hydration
  mismatch on a cold first load in production.
- **Listing filters are existential across axes**, exactly as the selector is:
  "comes in XXL" and "comes in Ink" is not "comes in XXL in Ink". The preview's
  first version got this wrong and returned a product that is not made in that
  combination.


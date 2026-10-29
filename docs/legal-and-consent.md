# Legal and consent — starting draft

> ## ⚠️ This is a starting draft, not legal advice.
> It is written so the owner has something to **edit rather than specify**. None
> of it has been reviewed by a lawyer, and the jurisdictional questions —
> particularly the consent banner and the data-retention periods — need one.
> **Do not ship any of this text as-is.**

**Answers D-13.** All of this is **content-managed**, not hardcoded: every page
below is a `Page` entity with a slug, localized in `ar` and `en`, editable in the
backoffice. Hardcoding legal text would make a translation or a policy change a
deploy, and it would break the reusability contract — every merchant's terms
differ.

---

## 1. The pages

| Slug | Title (`en` / `ar`) | Purpose |
|---|---|---|
| `terms` | Terms of Sale / شروط البيع | The contract for buying |
| `privacy` | Privacy Policy / سياسة الخصوصية | What is collected, why, how long |
| `returns` | Returns & Refunds / الإرجاع والاسترداد | The return right, window and process |
| `shipping` | Delivery & Collection / التوصيل والاستلام | Zones, fees, lead times, collection |
| `cookies` | Cookies & Storage / ملفات تعريف الارتباط | What is stored in the browser and why |
| `accessibility` | Accessibility / إمكانية الوصول | The standard aimed at, and how to report a barrier |
| `contact` | Contact / اتصل بنا | Who the merchant legally is, and how to reach them |

**`contact` carries the legal identity** — trading name, registered address, and
a commercial registration or tax number where the jurisdiction requires it.
Several jurisdictions require this to be reachable from every page, which is why
it is a footer link rather than a page you have to find.

---

## 2. What data is collected, and why

This table is the substance of the privacy page, and it is also an engineering
checklist — **if a field is collected and not on this list, one of the two is
wrong.**

| Data | Why | Basis | Retained |
|---|---|---|---|
| **Phone number** | The login identifier, and how a delivery actually happens | Necessary for the contract | Life of the account |
| Name | Addressing the order and the delivery | Necessary for the contract | Life of the account |
| Email (optional) | Order notices where given; account recovery later | Necessary / consent | Life of the account |
| Delivery address | Delivering the order | Necessary for the contract | Life of the account; snapshotted onto past orders `[see §5]` |
| Order history | Fulfilling, supporting and returning orders | Necessary for the contract | `[ASSUMPTION]` 7 years, because tax records usually require it |
| **Payment proof image** | Verifying a manual wallet or InstaPay transfer | Necessary for the contract | `[ASSUMPTION]` 2 years, then deleted. It may contain a bank identifier and should not be kept indefinitely |
| Password hash | Authentication | Necessary for the contract | Life of the account |
| Session and refresh tokens | Keeping the customer signed in | Necessary for the contract | Access ~15 min; refresh ~30 days; **only hashes stored** |
| Marketing consent flag | Proving consent was given | Consent | Until withdrawn, plus a record that it was |
| Reviews | Publishing them | Consent | Until deleted |
| Wishlist | The feature itself | Necessary for the feature | Life of the account |
| Cart (guest) | Keeping a cart across visits | Necessary for the feature | 30 days, then expires |
| Activity/audit log (staff) | Security and accountability | Legitimate interest | `[ASSUMPTION]` 2 years |

**Not collected:** card details (there is no card gateway), location beyond the
address the customer types, and any third-party advertising identifier.

**One thing worth the owner's attention:** the **payment proof** is the most
sensitive item here — a screenshot of a bank or wallet transfer, often showing a
balance or an account number. It is already handled correctly in engineering
terms (private storage, a short-lived signed URL minted per request behind the
permission check). What it needs from *this* document is a **retention period and
a deletion job**, because "kept forever in a bucket" is the default and it is the
wrong answer.

---

## 3. Cookies and browser storage

There is no advertising or cross-site tracking, which makes this page short and
honest — and it changes what the consent banner has to be.

| What | Kind | Why | Consent needed? |
|---|---|---|---|
| Session cookie (HttpOnly) | Strictly necessary | Keeping you signed in | No |
| Refresh cookie (HttpOnly) | Strictly necessary | Renewing the session | No |
| Guest cart cookie | Strictly necessary | Your cart, before you sign in | No |
| Theme choice (`localStorage`) | Preference | Remembering light or dark | No — a preference you set yourself |
| Locale choice | Preference | Remembering `ar` or `en` | No |
| Analytics | Analytics | Understanding what is used | **Yes**, if it is identifying |

**The consequence, and it is the useful part:** with no advertising and no
cross-site tracking, **every cookie except analytics is strictly necessary.** A
blocking "Accept all / Reject all" wall is not required for those, and adding one
would be theatre that costs conversion. **A dismissible notice plus a real
analytics opt-out is the honest posture.**

`[ASSUMPTION]` this holds only while analytics stays first-party and
non-identifying. **Adding a third-party pixel changes the answer**, and that is
the trigger to revisit this page — not a redesign.

---

## 4. The consent points in the funnel

Where consent is actually taken, and what each one must not do.

| Point | What | Rule |
|---|---|---|
| **First visit** | Cookie/storage notice | Dismissible. **Never blocks the funnel.** Never pre-ticks an analytics opt-in |
| **Signup** | Marketing consent | **Unticked by default**, separate from the terms. Bundling marketing into "I accept the terms" is not consent |
| **Checkout — placing the order** | Terms of Sale + Returns | **The one required acceptance.** An explicit, unticked checkbox naming both, linked, opening in place rather than navigating away from checkout |
| **Checkout — guest** | Same | A guest accepts the same terms. Guest checkout never gets a lighter legal path |
| **Account** | Withdraw marketing consent | One control, effective immediately, no dark pattern |
| **Account** | Request deletion | See §5 |

**The checkout acceptance is recorded on the order** — which version of the terms,
accepted at what timestamp. A store that cannot show *which* terms a customer
agreed to has not really taken consent. This means **terms pages are versioned**,
and an edit creates a new version rather than mutating the old one.

That is a real engineering consequence of this document, and it belongs in the
data model: `Page` needs a version, and `Order` needs `termsVersionAccepted` and
`acceptedAt`.

---

## 5. Deletion and export

`[ASSUMPTION]` — the shape below is standard; whether it is *required* is
jurisdictional.

- **Export:** a customer can request their data. Given the model, that is their
  profile, addresses, orders, reviews and wishlist. Deliverable as JSON from the
  backoffice.
- **Deletion:** a customer can request deletion. **It cannot mean "delete the
  orders"** — tax records require retention, and an order's line snapshot is a
  financial record. So deletion is:
  - the **account** is closed and credentials destroyed;
  - **personal identifiers are redacted** from the customer record;
  - **orders survive, with their existing snapshot** — which already contains the
    name and address as given at the time, because snapshotting is how orders
    work here;
  - reviews are anonymised rather than removed.

**The snapshot discipline that protects order history is also what makes
deletion partial.** That is worth stating in the privacy page plainly rather
than promising an erasure that cannot happen.

---

## 6. Draft copy — the openings

Enough to edit rather than start from nothing. Each needs the merchant's legal
identity substituted, and each needs translating into Arabic as the **default**
locale, not as an afterthought.

**Terms of Sale — opening:**
> These terms apply to every order placed through this store. By placing an
> order you agree to them. We may change them, and the terms that apply to your
> order are the ones you accepted when you placed it.
>
> **Prices** are shown in `[CURRENCY]` and include `[tax treatment]`. The price
> you pay is the price shown at checkout when your order is placed.
>
> **Availability.** We may be unable to fulfil an order if an item sells out
> between your order and our confirmation. If that happens we will contact you
> and refund anything already paid.

**Privacy — opening:**
> We collect what we need to sell you something and deliver it. We do not sell
> your data, we do not share it for advertising, and we do not track you across
> other sites.

**Returns — opening:**
> You may return an item within `[RETURN WINDOW]` days of delivery, provided it
> is unused and in its original condition. Some items cannot be returned for
> hygiene reasons; these are marked on the product page.

**Cookies — opening:**
> This site stores a small amount of information in your browser. Most of it is
> what keeps you signed in and keeps your cart — without it the store does not
> work. We do not use advertising cookies.

---

## 7. What this document needs from the owner

1. **The legal identity** — trading name, registered address, registration or
   tax number.
2. **The jurisdiction**, which determines whether the consent posture in §3 is
   sufficient and whether §5's deletion rights are mandatory.
3. **Retention periods** — the three marked `[ASSUMPTION]` in §2, especially
   the payment proof.
4. **The return window**, which also sets `returnWindowDays` in settings.
5. **A lawyer's review.** This draft is a starting point for that conversation,
   not a substitute for it.

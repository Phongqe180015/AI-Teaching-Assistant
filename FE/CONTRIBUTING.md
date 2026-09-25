# AITA Frontend — Developer Guide

> **Service:** `FE/` — the AITA web client (3 role portals: admin · lecturer · student, plus a public marketing site).
> **Stack:** React 19 · Vite 8 · TypeScript 5.8 · React Router 7 · TanStack Query 5 · React Hook Form 7 + Zod 4 · Tailwind CSS 4 · i18next (vi/en/ja) · lucide‑react.
> **Last verified:** 2026‑06‑25 (against the code). Keep this date current — see [§11](#11-keeping-this-doc-current).

> ⚠️ **The old `FE/ARCHITECTURE.md` is largely aspirational and out of date.** This guide describes the code as it actually is. Where they disagree, this file wins.

New here? Read [§1 Quick start](#1-quick-start) → [§2 The most important thing to understand](#2-the-most-important-thing-to-understand) → [§4 Structure](#4-directory-structure) → [§7 How to add a page/feature](#7-how-to-add-a-page-or-feature-the-golden-path).

---

## 1. Quick start

```bash
cd FE
npm install
npm run dev          # Vite → http://localhost:5173, proxies /api → http://localhost:3001
```

The backend must be running on `:3001` (see [`be/CONTRIBUTING.md`](../be/CONTRIBUTING.md)). Log in with a seeded account, e.g. `admin@fpt.edu.vn` / `admin123`.

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server with `/api` proxy (`vite.config.ts`) |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | serve the production build |
| `npm run lint` | ESLint |

**Production needs `VITE_API_URL`.** In dev, `/api` is proxied to `:3001`. In production there's no proxy, so set `VITE_API_URL` to the backend origin at build time, or every request resolves to the static host and 404s.

---

## 2. The most important thing to understand

**This frontend is UI‑first, and most screens are wired to backend endpoints that don't exist yet.**

- The backend serves **only** auth, classes, assignments, and users (14 endpoints + a `/health` probe = 15 routes — see [`be/CONTRIBUTING.md` §2](../be/CONTRIBUTING.md#2-what-actually-runs-today-read-this-first)).
- `FE/src/lib/api.ts` defines **~57** `api.*` methods. The **~44** that the backend doesn't serve hit its 404 fallback, `request()` throws, and pages catch with `.catch(console.error)` → a silent, empty UI.
- So a screen can look "done" and be completely non‑functional. **`be/src/routes/index.ts` is the source of truth for what actually works.**

**What works end‑to‑end today:** login · `AdminUsers` CRUD · class/assignment **list + create** (with some blank columns, see [§8](#8-known-bugs--gotchas)). **Everything else is a UI shell over dead endpoints.**

**Two documented pillars are built but never used** — know this so you don't assume they're active:
1. **TanStack Query hooks + feature services** (`hooks/use*.ts`, `features/*/services`) — well‑written, but **no page imports them.** Every page calls `api.*` directly with `useState`/`useEffect`.
2. **React Hook Form + Zod** (`lib/schemas/*`) — `react-hook-form`/`zodResolver` are imported **nowhere**; all forms use manual `useState`.

> Adopting (or deleting) these pillars is a roadmap decision ([CODEBASE_REVIEW §W3.4](../docs/CODEBASE_REVIEW.md#phase-3--harden-model-complete--scale-ongoing)). Until then, **follow the real pattern in [§6](#6-data-fetching--the-real-pattern), not the one in `ARCHITECTURE.md`.**

---

## 3. The FE↔BE contract (must‑know)

- **Envelope:** `request()` (`lib/api.ts`) expects `{ success, data, error? }` and returns `data`. This matches the BE `ok()` helper.
- **Auth:** token + user are stored in `localStorage` (`aita_token`, `aita_user`); `request()` attaches `Authorization: Bearer`. On boot, `AuthContext` calls `api.me()` and clears storage on failure.
- **Roles are UPPERCASE from the server** (`ADMIN`/`LECTURER`/`STUDENT`) but the FE assumes **lowercase** in several places. **Lowercase role at the boundary** (in `AuthContext`/`api`) and rely on lowercase everywhere in the UI. (Today this is inconsistent and causes the broken Topbar "dashboard" link and missing role label/avatar — see [§8](#8-known-bugs--gotchas).)
- **Method/shape drift exists:** e.g. FE `updateAssignment` uses `PATCH` but the BE serves `PUT`; class/assignment responses omit `studentCount`/`due`/`submitted`. When you add a call, **match the BE method/path/shape exactly** (check `be/CONTRIBUTING.md`).

---

## 4. Directory structure

```
FE/src/
├── main.tsx                 # entry: ReactQuery > Router > Theme > Language > Auth providers
├── App.tsx
├── routes/index.tsx         # ⭐ route table; ProtectedRoute-guarded admin/lecturer/student portals
├── lib/
│   ├── api.ts               # ⭐ the HTTP client + ALL api.* methods + FE row types  (source of truth for calls)
│   └── schemas/             # Zod schemas (auth/class/assignment) — currently ORPHANED
├── store/                   # React Contexts (this is the "providers/context" layer)
│   ├── AuthContext.tsx      #   auth state, login/register/logout, useAuth()
│   ├── LanguageContext.tsx  #   i18next wrapper
│   ├── ThemeContext.tsx     #   light/dark
│   └── ReactQueryProvider.tsx  # QueryClient (mounted but no live queries)
├── pages/
│   ├── home/                #   public marketing: Home, About, Features, Pillars (static, real)
│   ├── admin/   (10 pages)
│   ├── lecturer/ (9 pages)
│   └── student/ (11 pages)
│   └── LoginPage.tsx        #   login only (no register form, though the logic exists)
├── layouts/                 # Public* and Dashboard* shells (header, sidebar, topbar, footer)
├── components/
│   ├── ui/                  #   Button, Card, Input, DataTable, Badge, Tabs, StatCard, … (the design system)
│   ├── common/              #   ErrorBoundary, ErrorState, LoadingSpinner  (built but unused — start using them)
│   └── icons/IconMap.tsx
├── features/<domain>/       # services/ (api pass-throughs) + barrels; auth/ also has components/ProtectedRoute
├── hooks/                   # use*.ts React Query hooks — ORPHANED (no page uses them)
├── constants/               # navigation.ts (sidebars), content.ts
├── types/index.ts           # pure UI types (NavItem, TableColumn, …)
├── utils/i18n.ts            # i18next init (vi fallback; only ~40 keys translated)
└── styles/index.css         # Tailwind entry
```

> `components/motion/` is an empty dead directory; `fix_imports.js`, `scaffold.js`, `scaffold.ps1` are leftover codegen scripts — safe to remove.

---

## 5. Routing & access control

- `routes/index.tsx` defines public routes (`/`, `/about`, `/features`, `/pillars`), `/login`, and three portals guarded by **`ProtectedRoute`** (`features/auth/components/`). Catch‑all `*` → `/`.
- `ProtectedRoute` handles the `loading` state, redirects unauthenticated users to `/login?redirect=…`, and **lowercases `user.role`** before comparing to the route's `allowedRole`. Client‑side gating is correct; **server‑side gating is a separate BE concern** and is currently missing on some routes.
- **Sidebars come from `constants/navigation.ts`** — this is fully synced with the route table. All 30 pages across admin, lecturer, and student portals are properly wired into the `Routes` and accessible via the sidebar menus. When you add a page, update **both** the route table and the nav.

---

## 6. Data fetching — the real pattern

Until the React Query pillar is adopted, **follow the pattern the codebase actually uses**, but improve on its two weaknesses (no loading state, swallowed errors):

```tsx
const [items, setItems] = useState<Thing[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  let alive = true
  api.getThings()
    .then((d) => { if (alive) setItems(d) })
    .catch((e) => { if (alive) setError(e.message) })   // ← surface it; don't console.error and move on
    .finally(() => { if (alive) setLoading(false) })
  return () => { alive = false }
}, [])

if (loading) return <LoadingSpinner />
if (error) return <ErrorState message={error} />        // ← use the existing common/ components
```

**Rules:**
- All network access goes through `api.*` in `lib/api.ts` — never `fetch` directly in a component.
- **Surface errors** with `components/common/ErrorState` (and wrap the app/routes in `ErrorBoundary`). Stop the `.catch(console.error)` habit — it's why broken screens look "fine."
- Mutations: `await api.x()` then re‑load, and show a real success/error to the user (not `alert()`).
- **If you adopt React Query** for your feature (encouraged): use the existing `hooks/use*.ts` as templates (constant query keys, tuned `staleTime`, invalidation) and import them in the page. Do it consistently per feature, not half‑and‑half.

---

## 7. How to add a page or feature (the golden path)

Example: a **Lecturer Grading** screen that lists a class's students.

1. **Confirm the endpoint exists** in `be/src/routes/index.ts`. If not (e.g. `GET /classes/:id/students` doesn't yet), it's a backend task first — coordinate via [`be/CONTRIBUTING.md`](../be/CONTRIBUTING.md). Don't ship a UI over a dead endpoint without flagging it.
2. **Add the call** to `lib/api.ts` — match the BE **method, path, and response shape exactly**. Add/adjust the row type next to it.
3. **Build the page** under `pages/<role>/`, using `components/ui/*` (Button, Card, DataTable, …) for consistency. Use the fetch pattern in [§6](#6-data-fetching--the-real-pattern) with real loading + error states.
4. **Register the route** in `routes/index.tsx` under the correct `ProtectedRoute` portal.
5. **Add it to the sidebar** in `constants/navigation.ts` (and an icon in `components/icons/IconMap.tsx`).
6. **i18n:** if the screen should be multilingual, add keys to `utils/i18n.ts` and use `t()`. Otherwise know that dashboard text is currently hardcoded Vietnamese (the switcher only affects the public site + login).
7. **Forms:** prefer the existing Zod schemas in `lib/schemas/*`. If adopting React Hook Form, wire `zodResolver` (the dep is installed). Otherwise validate explicitly before calling `api.*`.
8. **Update docs:** reflect new pages/routes in [§4](#4-directory-structure)/[§5](#5-routing--access-control) here (the CLAUDE.md rule will remind you).

---

## 8. Known bugs & gotchas

Confirmed in [`docs/CODEBASE_REVIEW.md`](../docs/CODEBASE_REVIEW.md). Fix rather than mirror when you touch the area:

- **Role casing:** BE sends UPPERCASE; `DashboardTopbar` builds `to={/${user.role}}` → `/ADMIN` (no match → redirect home), and `roleLabel[user.role]`/`roleAvatar[user.role]` (keyed lowercase) → `undefined`. **Normalize role to lowercase at the boundary.**
- **Class/assignment blank columns:** the wired BE DTOs omit `studentCount` (class) and `class`/`due`/`submitted` (assignment); FE row types claim them. Either align FE types to the real DTO or get the BE presenter enriched.
- **`updateAssignment` 404:** FE uses `PATCH`, BE serves `PUT`. Change the FE.
- **Edit‑user no‑op:** the BE silently drops `email`/`role`/`password` on update; the form looks like it worked. (BE‑side fix needed; disable those fields meanwhile.)
- **Lock/unlock broken:** BE writes status `BANNED` (→ lowercased `banned`), but `AdminUsers` checks `=== 'locked'`, so the badge/toggle never reflect a locked user. Align the status vocabulary across BE+FE.
- **Misleading language switcher:** en/ja appear available but dashboards are hardcoded Vietnamese.

---

## 9. Coding rules & conventions

- **TypeScript everywhere**, React 19 function components + hooks. Path alias `@/` → `src/`.
- **Styling:** Tailwind CSS 4 utility classes; reuse `components/ui/*` and `class-variance-authority` variants rather than re‑styling primitives.
- **Network:** only via `api.*` in `lib/api.ts`. One method per backend endpoint; keep the FE row type beside it and matching the BE shape.
- **State:** local UI state with `useState`; cross‑cutting state via the contexts in `store/` (`useAuth`, `useLanguage`, `useTheme`). Don't add a new global store without reason.
- **Errors:** user‑visible via `ErrorState`/`ErrorBoundary`. No silent `console.error` for data failures.
- **i18n:** if a string is user‑facing and the screen is meant to be translated, use `t()` with a key — don't hardcode (outside the currently‑Vietnamese dashboards, which are a known debt).
- **Icons:** through `components/icons/IconMap.tsx` (lucide‑react).
- **No new deps** without need — several installed deps (RHF, react‑query) are already paid for; use them before adding more.

---

## 10. Environment

| Var | When | Notes |
|---|---|---|
| `VITE_API_URL` | **production build** | backend origin; without it prod calls resolve to the static host and 404 |
| (dev) | — | dev uses the Vite `/api` → `:3001` proxy in `vite.config.ts`; no env needed |

---

## 11. Keeping this doc current

This file is **auto‑maintained** per the root [`CLAUDE.md`](../CLAUDE.md) policy. Update it **in the same change** when you:

- add/remove an `api.*` method in `lib/api.ts` → update [§2](#2-the-most-important-thing-to-understand)/[§3](#3-the-febe-contract-must-know);
- add/remove a page or route in `routes/index.tsx` / `constants/navigation.ts` → update [§4](#4-directory-structure)/[§5](#5-routing--access-control);
- adopt React Query / RHF in pages → update [§2](#2-the-most-important-thing-to-understand)/[§6](#6-data-fetching--the-real-pattern) (they stop being "orphaned");
- fix a [§8](#8-known-bugs--gotchas) bug → remove it from the list.

Then bump **"Last verified"** in the header to the current date. When the structure here and `FE/ARCHITECTURE.md` fully reconcile, fold the latter into this guide.

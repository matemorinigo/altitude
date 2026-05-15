# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev environment (starts local Supabase + Vite, requires Docker)
./dev.sh

# Start only the frontend (when Supabase is already running)
npm run dev

# Type check (no emit)
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview

# Supabase operations (using local binary)
./node_modules/.bin/supabase status
./node_modules/.bin/supabase db reset --no-backup   # apply migrations fresh
./node_modules/.bin/supabase gen types typescript --local > src/types/db.ts
```

Environment: copy `.env.example` to `.env.local` and fill in Supabase credentials. `dev.sh` auto-populates `.env.local` from the local Supabase instance.

## Architecture

### App shell

`App.tsx` wraps everything in `QueryClientProvider → AuthProvider → ToastProvider`. The `Shell` component handles auth gating (shows `<Login />` if no session) and tab-based navigation — there is no React Router; tabs are managed with `useState<TabId>` directly in `Shell`. The four main screens (`Dashboard`, `Hangar`, `Ledger`, `System`) are conditionally rendered by tab.

### Data flow

All server state goes through TanStack Query hooks in `src/hooks/`. Each hook owns its query key, fetches from Supabase, and exposes mutations. Components never call `supabase` directly — they use the hooks. The single Supabase client instance lives in `src/lib/supabase.ts`.

### Screens and settings sub-screens

- `screens/Dashboard.tsx` — main view, checks for pending `scheduled_events` on mount and opens prompt modals before rendering
- `screens/Hangar.tsx` — portfolio view, drives `syncTickerPrices` from `lib/data912.ts`
- `screens/Ledger.tsx` — paginated transaction list (limit 200), category chip filters
- `screens/System.tsx` — settings hub linking to `screens/settings/` sub-screens (AccountsAdmin, CardsAdmin, RecurringAdmin, PaydayAdmin, TickersAdmin)

### Modals

Three modals in `src/components/modals/`:
- `LogTransactionModal` — main transaction entry; toggle DEBIT/CREDIT, category chips, account/card chips, numeric keypad
- `PaydayPromptModal` — auto-triggered when a `scheduled_event` with `is_payday=true` is PENDING and `due_date ≤ today`
- `RecurringPromptModal` — same trigger pattern for non-payday recurring templates

### Business logic libs

| File | Purpose |
|---|---|
| `lib/holidays.ts` | `HOLIDAYS_AR` dict + `isBusinessDay()` + `getNthBusinessDay()` — all dates in `America/Argentina/Buenos_Aires` via `date-fns-tz` |
| `lib/payday.ts` | `nextPaydayDate()` and `cycleProgress()` — derive cycle tape data from payday config |
| `lib/data912.ts` | Fetches market prices from `data912.com/live/<panel>`; groups tickers by `instrument_kind` to minimize requests; 1-min in-memory cache; upserts prices back to Supabase |
| `lib/format.ts` | `fmt()` — monospace number formatting with AR separators |
| `lib/categories.ts` | Fixed `CATEGORIES` constant; not stored in DB |
| `lib/export.ts` | CSV export logic for the Ledger screen |

### Database schema key points

- All tables have `user_id` + RLS (each user sees only their own rows). `profiles` row is auto-created on signup via trigger.
- `transactions.amount` is always positive; the sign comes from `kind` (`EXPENSE`/`INCOME`/`TRANSFER`/`CARD_PAYMENT`).
- `accounts.balance` and `credit_cards.current_debt` are kept in sync by Postgres triggers on `transactions` — do not manually compute balances in the app.
- `scheduled_events` are generated client-side by `ensureScheduledEvents()` (called on Dashboard mount) via upsert with `onConflict: 'template_id,due_date'`. Dashboard queries for `status='PENDING' AND due_date <= today` to decide which modal to show.
- `tickers.last_price` and `last_price_at` are updated by the SYNC flow, not by transactions.

### Styling rules (non-negotiable)

- All design tokens are in `src/styles/globals.css` CSS custom properties (`--grn`, `--amb`, `--mono`, etc.). Shared component classes are in `src/styles/components.css`.
- No Tailwind. No border-radius (max 1px). No box shadows except green LED glow (`box-shadow: 0 0 6px var(--grn)`). No gradients.
- All numbers: `font-family: var(--mono); font-variant-numeric: tabular-nums`.
- Labels: uppercase + `letter-spacing ≥ 0.14em`.
- Mobile-first at ~400px; container `max-width: 480px`.
- Icons: inline mono chars (`●`, `▶`, `◆`, `▮`) and inline SVGs only — no icon library.

### Completed phases

All 6 phases are done. The app includes: Auth, CRUD for accounts/cards/recurring/tickers, LogTransactionModal with keypad, payday + recurring prompts with `scheduled_events`, Hangar with data912 sync, Ledger with filters + CSV export, toast system, TelemetryBar loading states, PWA manifest.

### Known pending items

- PWA icons (`/public/icon-192.png`, `/public/icon-512.png`) not yet created
- Service worker (offline support) not implemented — `vite-plugin-pwa` or manual SW needed
- Ledger pagination beyond 200 rows
- `console.log` debug lines in `lib/supabase.ts` should be removed before shipping

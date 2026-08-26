# Standalone Kiosk

A clean-room, touch-first customer ordering application. This workspace does not import the legacy PHP backend, database, vendor packages, or restaurant-branded catalog assets.

## Implemented

- Welcome and dine-in/takeout flow
- Zod-validated typed catalog fixtures behind a repository interface
- Category browsing, search, loading/empty/error states, and unavailable products
- Product options, add-ons, quantity, notes, and integer minor-unit pricing
- Persisted Zustand cart with order review and VAT totals
- Payment selection with duplicate-submit protection
- Server-authoritative order validation, modifier pricing, tax calculation, and receipt numbering
- Transactional order and canonical item-snapshot persistence
- Ticket number, printable receipt, completion/reset flow
- Idle timeout warning before cart clearing
- Responsive touch UI and reduced-motion support
- Unit and journey tests

The customer catalog UI is still fixture-backed, while the Laravel database seeder mirrors the same products and option definitions for authoritative checkout. The order API ignores client-supplied prices and names, validates product availability and modifier rules, calculates totals from backend data, and generates the receipt number. Payment-provider confirmation and durable request idempotency are not implemented yet.

## Run

```powershell
npm install
npm run dev
```

Open `http://localhost:4173`.

## Verify

```powershell
npm run check
```

## Architecture

```text
src/
  components/       reusable shell, brand, icons, idle guard
  data/             repository implementations and fixtures
  domain/           validated catalog and order models
  screens/          route-owned kiosk screens
  store/            persisted kiosk session/cart state
  test/             test environment setup
```

## Next delivery phases

1. Replace `FixtureCatalogRepository` through the existing repository boundary.
2. Implement terminal registration, expiring kiosk sessions, and idempotency keys.
3. Integrate payment providers and confirm payment status through trusted callbacks.
4. Complete catalog CRUD, durable terminal monitoring, compliance-reviewed reports, and audit coverage.

Do not connect this application to the legacy `Kiosk/kiosk1.sql` database. The new backend must own its schema, authentication, migrations, tests, and deployment configuration.

# Standalone Kiosk

A clean-room, touch-first customer ordering application. This workspace does not import the legacy PHP backend, database, vendor packages, or restaurant-branded catalog assets.

## Implemented

- Welcome and dine-in/takeout flow
- Zod-validated typed catalog fixtures behind a repository interface
- Category browsing, search, loading/empty/error states, and unavailable products
- Product options, add-ons, quantity, notes, and integer minor-unit pricing
- Persisted Zustand cart with order review and VAT totals
- Payment selection with duplicate-submit protection
- Ticket number, printable receipt, completion/reset flow
- Idle timeout warning before cart clearing
- Responsive touch UI and reduced-motion support
- Unit and journey tests

The fixture repository is intentionally replaceable by a new API implementation in the backend phase. Checkout currently simulates order creation locally; it does not claim server-side validation or durable idempotency.

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

1. Select and scaffold a new backend and database.
2. Implement terminal registration, expiring kiosk sessions, server-owned pricing, and atomic order creation with idempotency keys.
3. Replace `FixtureCatalogRepository` through the existing repository boundary.
4. Build the authenticated admin dashboard, catalog management, order workflow, kiosk settings, reports, and audit logs.

Do not connect this application to the legacy `Kiosk/kiosk1.sql` database. The new backend must own its schema, authentication, migrations, tests, and deployment configuration.

# Local development

## Stack

- React 19 and TypeScript
- Laravel 13 API on PHP 8.4
- SQLite for local development and automated tests
- PostgreSQL for production
- Eloquent ORM and Laravel migrations
- Laravel Sanctum for admin and terminal API authentication
- Vitest for frontend tests and Pest for backend tests
- React Router, Zustand, Zod, React Testing Library, and the existing custom CSS design system
- Tailwind CSS is optional and is not currently the primary styling system
- Access types are limited to `super_admin`, `store_admin`, and separately authenticated terminals
- Laravel queues are available; production queue workers still require deployment configuration

## Start the applications

Open two PowerShell terminals in the repository root (`C:\Users\Kiosk\.KIOSK SETUP`).

Frontend:

```powershell
.\scripts\start-frontend.ps1
```
*(Or directly: `npm install` followed by `npm run dev`)*

Backend:

```powershell
.\scripts\start-backend.ps1
```
*(Or directly: `cd backend`, `composer install`, `php artisan migrate --seed`, `php artisan serve --host=127.0.0.1 --port=8000`)*

Local URLs:

- Kiosk: `http://127.0.0.1:4173`
- Admin: `http://127.0.0.1:4173/admin/login`
- API: `http://127.0.0.1:8000`

## Integrations and deployment boundaries

WBOX is currently a local file-based integration. The Laravel service writes request files to a store computer, and the WBOX POS writes responses back. A cloud deployment cannot write directly to a restaurant computer's `C:` drive; it requires a store-side connector/bridge.

Receipts currently use browser print output. Direct printer support, payment-provider confirmation, inventory, and cloud synchronization are future integration milestones.

## WBOX POS bridge

WBOX integration uses the same local file contract as the legacy kiosk. Laravel records the order first, then the local bridge writes a `.request` file atomically and creates the matching `.sig` file last. The bridge processes only one unacknowledged request at a time because the legacy response filename is shared.

1. Open Admin > Catalog and assign every sellable product its WBOX `menukey` as the WBOX Item Code.
2. Open Admin > Settings and configure the WBOX request folder, response folder, kiosk number, product number, and authentication token.
3. Save the settings, use **Test saved connection**, and enable WBOX delivery.
4. Open a third PowerShell terminal and run:

```powershell
.\scripts\start-wbox-bridge.ps1
```

Default legacy folders:

- Request: `C:\Restrnt\3rdParty\Request`
- Response: `C:\Restrnt\3rdParty\Response`

Keep the bridge running on the Windows computer that can access those folders. An online Laravel server cannot write directly to the restaurant computer's `C:` drive; for an online deployment, this local bridge remains the secure connection between Laravel and WBOX.

Do not commit or share the WBOX authentication token. It is encrypted in the application database and is never returned by the admin API.

LAN URLs use the computer's current IP in place of `127.0.0.1`.

Development admin account:

- Email: `admin@kiosk.local`
- Password: `Admin123!`

Replace this seeded password before any shared or production deployment.

# Local development

## Stack

- React 19 and TypeScript
- Laravel 13 API on PHP 8.4
- SQLite for local development and automated tests
- PostgreSQL for production
- Eloquent ORM and Laravel migrations
- Laravel Sanctum for admin and terminal API authentication
- Vitest for frontend tests and Pest for backend tests

## Start the applications

Open two PowerShell terminals.

Frontend:

```powershell
cd "C:\Users\Kiosk\.KIOSK SETUP\Refactored-Kiosk"
.\scripts\start-frontend.ps1
```

Backend:

```powershell
cd "C:\Users\Kiosk\.KIOSK SETUP\Refactored-Kiosk"
.\scripts\start-backend.ps1
```

Local URLs:

- Kiosk: `http://127.0.0.1:4173`
- Admin: `http://127.0.0.1:4173/admin/login`
- API: `http://127.0.0.1:8000`

LAN URLs use the computer's current IP in place of `127.0.0.1`.

Development admin account:

- Email: `admin@kiosk.local`
- Password: `Admin123!`

Replace this seeded password before any shared or production deployment.

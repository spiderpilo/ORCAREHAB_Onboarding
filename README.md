# ORCA Rehab Onboarding

New employee onboarding portal for ORCA Rehab.

## What it does

Guides a new hire through three steps:

1. **Employee information** — name, date of birth, phone, degree, home address, SSN, driver's license photo, resume
2. **Direct deposit** — bank name, account type, routing/account number, with an optional split between two accounts
3. **Additional information** — emergency contact, work authorization (Form I-9), tax withholding (Form W-4)

On final submit, the app sends the employee's basic info to a small backend that creates a matching employee record in QuickBooks Online.

## Getting started (frontend)

```bash
npm install
npm run dev
```

Built with Vite, React, and TypeScript.

## Backend (QuickBooks integration)

The frontend can't safely hold QuickBooks API credentials, so a small Express server in [server/](server/) handles that side.

```bash
cd server
npm install
cp .env.example .env
```

Fill in `.env` with your QuickBooks app's credentials from the [Intuit Developer portal](https://developer.intuit.com/):

- `QBO_CLIENT_ID` / `QBO_CLIENT_SECRET` — from your app's Keys tab
- `QBO_ENVIRONMENT` — `sandbox` while testing, `production` when you're ready to go live
- `QBO_REDIRECT_URI` — must match a Redirect URI registered on your app (defaults to `http://localhost:4000/api/quickbooks/callback`)

Start the server:

```bash
npm run dev
```

Then connect it to your QuickBooks company once, by visiting:

```
http://localhost:4000/api/quickbooks/connect
```

This walks you through Intuit's OAuth approval screen and stores the resulting tokens in `server/tokens.json` (gitignored — never commit this file). After that, the onboarding form's final submit will create an employee record in QuickBooks automatically.

**What does and doesn't sync:** QuickBooks Online's public Accounting API allows creating employee records with name, address, SSN, date of birth, and hire date — that part is automated. Direct deposit bank details and W-4 tax withholding live in QuickBooks Online Payroll, which Intuit does not expose via public API to third-party apps. Those fields are stored securely (see below) for HR/Payroll to enter manually into QB Payroll.

## Data storage and HR/Payroll dashboard

Every submission is saved to a local SQLite database (`server/data.db`), regardless of whether the QuickBooks sync succeeds — QuickBooks is a best-effort sync, not the source of truth. Sensitive fields (SSN, bank routing/account numbers) are encrypted at rest with AES-256-GCM before being written to disk. Uploaded files (driver's license photo, resume) are stored in `server/uploads/`.

Set these additional variables in `server/.env` (see `.env.example` for the full list):

- `ENCRYPTION_KEY` — 64-character hex string. Generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `SESSION_SECRET` — any long random string, for signing the admin login session.
- `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` — a single shared HR/Payroll login. Generate the password hash with:
  ```bash
  node scripts/hash-password.js "your-password"
  ```
  Run this again any time you want to change the password, then paste the new hash into `.env`.

Optionally, fill in the `SMTP_*` and `NOTIFY_EMAIL_TO` variables to get an email notification whenever a new submission comes in. Leave them blank to skip notifications entirely (nothing breaks — it just logs a warning and moves on).

With both the frontend (`npm run dev`) and backend (`cd server && npm run dev`) running, HR/Payroll can log in at:

```
http://localhost:5173/admin
```

This is part of the React app (not the backend), reusing the onboarding portal's own styling. The Vite dev server proxies `/api` requests through to the backend, so the login session works the same as if everything were on one origin.

to see every submission (name, date, QuickBooks sync status), view full details for manual entry into QB Payroll, download the uploaded license photo/resume, and remove a submission once it's been processed.

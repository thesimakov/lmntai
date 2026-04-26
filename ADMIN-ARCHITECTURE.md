# Admin Architecture Rules

## 1) Access Control
- `USER`: no access to `/admin/*`.
- `MANAGER`: limited access by permission keys in `User.adminPermissions`.
- `ADMIN`: full access to all admin sections and server actions.

## 2) Section Rules
- `/admin/users` -> requires `users.read`.
- Mutations on users (`create`, `set plan`, `add tokens`, `set partner`) -> `users.write`.
- User deletion -> `users.delete`.
- `/admin/settings` -> always available for staff (password self-service).
- `/admin/tariffs` and `/admin/team` -> super-admin only (`ADMIN`).

## 3) Source of Truth
- Plan runtime config (tokens/thresholds/features) is stored in `PlatformPlanSettings` (row id: `default`).
- Static defaults remain in `lib/plan-config.ts` as fallback only.

## 4) Runtime Binding
- Plan assignment uses DB-based monthly allowance (`applyPlan` -> `getEffectiveMonthlyAllowance`).
- Token gates use DB-based minima:
  - stream routes -> `getEffectiveStreamMinimum`.
  - prompt routes -> `getEffectivePromptBuilderMinimum`.
- Team quota uses DB-based seats (`getEffectiveTeamSeatLimit`).

## 5) User Virtual Folder (1 GiB)
- Every user has a virtual workspace (`UserVirtualWorkspace`) with default quota `1 GiB`.
- API metadata and request snapshots are persisted as virtual files (`UserVirtualEntry`) under paths like:
  - `requests/YYYY-MM-DD/<timestamp>-request.json`
- Storage is quota-enforced (no writes above limit), and usage is visible in admin users table.
- User endpoint: `GET /api/profile/virtual-workspace` (summary + paginated entries).

## 6) Security & Operations
- Bootstrap admin login must use env vars (`ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_PASSWORD`) and be disabled in production unless explicitly required.
- Never hardcode admin credentials in source.
- Password updates must always write bcrypt hash (`setUserPassword`).

## 7) UI Consistency
- Sidebar sections are rendered from centralized rules (`lib/admin-rules.ts`).
- Server-side permission checks remain authoritative; UI visibility is only convenience.

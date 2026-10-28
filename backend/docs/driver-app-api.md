# Driver mobile API

The React Native app uses these routes under `/api`. The existing fleet schema stays intact: starting duty updates **`vehicle_master.driver_id` to the numeric primary key in `driver_master`**. Existing bus/vehicle list queries therefore return the new driver without a second integration. The mobile driver's `id` in responses is the public `driver_id`, such as `DRV-014`.

## Setup

Use Node 22 (also used by the mobile app). Ensure the configured MySQL fleet database already exists and its tables use InnoDB. The existing backend selects `development` in `config/config.json`; this implementation does not change database connection settings.

```sh
npm install
npm run driver-app:setup
```

Setup creates only four additive tables: `driver_app_credentials`, `driver_app_sessions`, `driver_duties`, and `driver_assignment_lock`. It adds the `mustChangePin` flag to an existing `driver_app_credentials` table when needed; it does not alter or delete existing fleet tables/data. The backend's existing `sequelize.sync()` also discovers these models. Run setup before starting the server to avoid startup requests racing schema creation. **Do not use `sync({ force: true })` or `alter: true` on your fleet database.**

Provision a PIN for an existing active driver using a hidden prompt (Python 3):

```sh
python3 -c "import getpass; print(getpass.getpass('New driver PIN: '))" | node scripts/set-driver-pin.js DRV-014
```

Use 4–8 digits; 6–8 are preferable. The manual provisioning command uses the PIN you enter; no demo driver is inserted into your fleet. PINs are hashed with bcrypt. A PIN provisioned or reset by this script is temporary: the driver must change it after login before using any other driver API. Changing a PIN through the app keeps the current session valid and does not end the driver's duty. Provisioning revokes that driver's existing sessions. The PIN is read from stdin, not command-line arguments. Run provisioning from a trusted backend terminal, not a public HTTP endpoint.

To add credentials for every driver who does not have one yet, run:

```sh
npm run driver-app:backfill-credentials
```

The backfill only inserts missing credentials; it does not replace existing PINs or reset their lock/change status. Newly added credentials use temporary PIN `1234`, so drivers must change it immediately after login. New drivers created through the existing admin `saveDriver` endpoint receive a credential with the same temporary PIN automatically. Run `npm run driver-app:setup` first.

```sh
npm start
```

Default port is 8100 (`PORT` overrides it). `DRIVER_SESSION_DAYS` optionally controls session expiry (1–90, default 30). Environment variables may be exported in your process manager, or loaded using Node 22's `node --env-file=/path/to/backend.env app.js`. No JWT secret is required: random opaque bearer tokens are stored only as SHA-256 hashes in MySQL.

## Connect the React Native app

In the **mobile project's** `.env`:

```dotenv
EXPO_PUBLIC_USE_MOCK_API=false
EXPO_PUBLIC_API_URL=http://10.0.2.2:8100/api
```

`10.0.2.2` is for the Android emulator. Use your computer's reachable LAN IP on a physical phone, or `http://localhost:8100/api` for the iOS simulator. Use an HTTPS backend URL for distributed/release apps; native release builds may block cleartext HTTP. Restart Expo after editing `.env`; rebuild distributed apps. The mobile adapter now sends the required `assignmentVersion` and revokes sessions on logout. Search and history adapter methods are available for future list screens; the existing manual lookup/QR screens work directly.

## Endpoints

All responses are plain JSON, without a `data` envelope. Except login, every route requires `Authorization: Bearer <token>` and returns `Cache-Control: no-store`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Driver ID or registered mobile + PIN; returns `{ token, driver, mustChangePin }` |
| POST | `/api/auth/change-pin` | Change temporary/current PIN; returns `{ mustChangePin: false }` |
| GET | `/api/auth/me` | Current authenticated driver (`id`, `name` only) |
| POST | `/api/auth/logout` | Revoke this login session; 204 |
| GET | `/api/vehicles?q=8803&limit=20&offset=0` | Search registration numbers, paginated |
| GET | `/api/vehicles/:identifier` | Exact vehicle lookup by registration, numeric database ID, or `BUS-<id>` |
| GET | `/api/duties/current` | Current duty or JSON `null` |
| GET | `/api/duties/history?limit=20&offset=0` | This driver's duty history only |
| POST | `/api/duties` | Confirm assignment and start duty |
| POST | `/api/duties/:id/end` | End own duty; 204, safe to retry |

### Login

```json
{ "identifier": "DRV-014", "pin": "<provisioned PIN>" }
```

The same route accepts `contact_no`. Only an `Active` driver with a provisioned PIN can log in. Five failed PIN attempts lock that account for 15 minutes; this counter is stored in MySQL and shared across server processes. Login also has a bounded per-process IP rate limit (30 requests per 15 minutes). Configure trusted proxy/rate limiting at your gateway appropriately if deploying multiple instances. Inactive, expired, revoked, or invalid sessions return 401. A temporary-PIN session can only call `POST /api/auth/change-pin` until the PIN is changed; other driver API routes return 403.

### Change PIN

```json
{ "currentPin": "<current PIN>", "newPin": "<new 4–8 digit PIN>" }
```

For a temporary PIN, `currentPin` may be omitted. For a normal PIN change from Profile, it is required. On success the API returns `{ "mustChangePin": false }` and keeps the current session valid. Invalid input or an incorrect current PIN returns a non-2xx response with a `{ "message": "..." }` body. PIN values are never returned or logged.

### Lookup / QR

A vehicle QR should contain `BUS-123`, the registration text, or mobile-supported JSON `{"vehicleId":"BUS-123"}`. Numeric IDs refer to `vehicle_master.id`, not GPS box IDs. Registrations ignore spaces/hyphens/case. Duplicate registrations return 409; use the unique `BUS-<id>` QR in that case.

```json
{
  "id": "123",
  "number": "AS 01 UC 8803",
  "type": "Bus",
  "gpsOnline": false,
  "currentDriver": { "id": "DRV-009", "name": "Previous Driver" },
  "assignmentVersion": "<opaque version from server>",
  "qrValue": "BUS-123",
  "division": null
}
```

`gpsOnline` requires a GPS-enabled vehicle and telemetry in `travel_histories` from the last five minutes. Enabled GPS alone is not reported as online. Search returns `{ items, total, limit, offset }`; limit is 1–50. Full driver personal data, identification documents, PIN hashes, and tokens are never included in vehicle search.

### Start duty

```json
{
  "vehicleId": "123",
  "assignmentVersion": "<copy from the latest lookup>",
  "replaceExistingDriver": true,
  "location": { "latitude": 26.1445, "longitude": 91.7362, "accuracy": 12 }
}
```

GPS is required for starting; numeric latitude/longitude ranges and nonnegative accuracy are checked. The driver is derived from the session; a caller cannot submit another driver's ID. Time comes from the server. Mobile location is a client report, not independent proof of physical presence.

The transaction checks the latest assignment version and explicit replacement consent, closes the earlier mobile duty (if any), clears other legacy bus links for the incoming driver, updates `vehicle_master.driver_id`, and creates a timestamped duty record. An existing active duty on another vehicle must be ended first. Retrying the same active assignment returns that duty without creating duplicates. Historical duties retain driver/vehicle snapshots.

Mobile duty mutations share a database row lock, and unique nullable indexes on active driver/vehicle IDs enforce one active mobile duty per driver and per vehicle. Different server instances use the same lock. If a legacy admin endpoint changes a bus assignment, `/duties/current` reconciles and closes the stale duty on the next check. Existing admin assignment writes are not part of the mobile transaction protocol; route those writes through the same service if stronger cross-interface consistency is required.

### End duty / history

```json
{ "location": { "latitude": 26.1445, "longitude": 91.7362, "accuracy": 12 } }
```

End location may be `null` or omitted if unavailable. End requests only affect the caller's duty. Retrying an ended or replaced duty succeeds without clearing the next driver's assignment. History returns `ACTIVE` or `ENDED`, plus `endedAt`, `endLocation`, and `endReason` for completed records (`ENDED`, `REPLACED`, or `ASSIGNMENT_CHANGED`).

Errors use `{ "message": "..." }`: 400 invalid input, 401 login required, 404 missing record, 409 changed assignment/conflict, 429 login throttled, 500 unexpected failure. After 409, fetch vehicle details again and obtain a fresh confirmation.

## Tests

```sh
npm test
```

Validation tests run normally. The MySQL integration suite runs only with an explicitly supplied **disposable local test server socket**; it never loads `config/config.json`. It creates and drops a uniquely named test schema on that server:

```sh
MYSQL_TEST_SOCKET=/path/to/disposable-mysql.sock npm test
```

Tests cover login/expiry/revocation/lockout, search and GPS freshness, fleet-link updates, idempotent retries, replacement consent, stale versions, simultaneous assignments, transaction rollback, external reassignment, ownership checks, and the HTTP contract.

Deployment note: the existing admin endpoints and their authentication behavior are unchanged. Keep those endpoints restricted to administrators; the new bearer checks apply only to the driver-app routes. The startup log that printed database credentials has been removed.

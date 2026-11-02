# SafeRide — Child Safety Verification System for School Transport

An admin dashboard that verifies every child boarding and leaving a school bus with RFID cards, blocks unsafe or invalid scans, and notifies parents automatically.

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts (`frontend/`)
- **Backend:** Java 21, Spring Boot 4, Spring Data JPA, Spring Security with JWT (`backend/`)
- **Database:** Supabase PostgreSQL over JDBC (`database/`)

```
Browser (React SPA) ──/api──► Spring Boot REST API ──JDBC──► Supabase Postgres
                                   ▲
RFID reader (optional) ──X-Reader-Key──┘
```

The browser never talks to Supabase directly. Database credentials live only in `backend/.env`. Row Level Security is enabled on every table with no policies, so Supabase's public REST API cannot read the data.

## Features

| Area | What it does |
|---|---|
| Overview | KPIs, a 14-day boarding/exit chart, live bus status, recent RFID scans, notification health and an activity feed, all computed from the database |
| Live Bus Monitoring | Per-bus occupancy and the students onboard now, with a live scan feed. Refreshes every 5 seconds |
| Students | Create, edit and delete students. Search, filters (class, bus, status), pagination and a detail panel with scan and notification history |
| Buses | Bus records with occupancy bars, plus assigning and unassigning students |
| RFID Activity | Scan simulator with a step-by-step verification result, and a full scan log with filters |
| Notifications | Parent SMS lifecycle (PENDING → SENT → DELIVERED / FAILED), filters, detail view and retry |
| Analytics | Daily, weekly and monthly trends; failed verifications by reason; delivery rate; bus usage |
| Settings | Admin profile, password change and read-only system configuration |

### Scan verification rules

These run inside one database transaction. The bus row and then the student row are locked, so two readers tapping at once cannot overfill a bus. Every scan is stored, including rejected ones.

1. The bus exists and is `ACTIVE`.
2. The card is registered and active.
3. The student is assigned to *this* bus, otherwise the scan is rejected as unauthorized.
4. The scan is not a repeat of the same card on the same bus within `DUPLICATE_SCAN_WINDOW_SECONDS`.
5. The sequence is valid: no boarding twice, and no exit without boarding first.
6. For a boarding, the onboard count is below the bus capacity.
7. If accepted, the student's status is updated and a parent notification is queued.

## Prerequisites

- **JDK 21.** Check with `java -version`. The Maven wrapper is included, so Maven itself is not needed.
- **Node.js 20 or later** and npm.
- **A Supabase project.** The free tier is enough.

## 1. Database setup (Supabase)

1. In the Supabase dashboard, open **SQL Editor**.
2. Paste and run `database/schema.sql`. This creates the 7 tables, constraints, indexes and RLS.
   > The schema script drops and recreates these tables, so only run it on a fresh project or when you want a reset.
3. Paste and run `database/seed.sql` (optional, but recommended for the demo). It adds:
   - 6 buses, one of them in maintenance;
   - 40 students with RFID cards;
   - about 4 weeks of scan history;
   - notifications;
   - students currently onboard today.
4. Get the connection details from **Project Settings → Database → Connection string → JDBC**. Choose **Session pooler**: it works over IPv4 on port 5432.

## 2. Backend configuration

```bash
cd backend
cp .env.example .env      # Windows: copy .env.example .env
```

Edit `backend/.env`:

| Variable | Description |
|---|---|
| `DB_URL` | `jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require` |
| `DB_USERNAME` | `postgres.<project-ref>` (Session pooler user) |
| `DB_PASSWORD` | Your database password |
| `JWT_SECRET` | At least 32 random characters, e.g. from `openssl rand -base64 48` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | First admin account, created at startup only if no admin exists. Password must be at least 8 characters and is stored with BCrypt |
| `APP_TIMEZONE` | School timezone used for "today" and analytics (default `Asia/Kolkata`) |
| `DUPLICATE_SCAN_WINDOW_SECONDS` | Window for rejecting repeated taps (default 10) |
| `SIM_NOTIFICATION_FAILURE_RATE` | Share of simulated SMS that fail, so retry can be demonstrated (default 0.08) |
| `RFID_READER_API_KEY` | Optional shared key for physical readers |
| `CORS_ALLOWED_ORIGINS` | Frontend origin (default `http://localhost:5173`) |

`.env` is git-ignored. Never commit it, and never put these values in the frontend.

## 3. Run

```bash
# Backend — http://localhost:8080
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run

# Frontend — http://localhost:5173 (proxies /api to :8080)
cd frontend
npm install
npm run dev
```

Check the backend with `GET http://localhost:8080/api/health`, which also checks the database connection. Then open http://localhost:5173 and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Other commands:

- Backend tests: `./mvnw test`
- Production frontend build: `npm run build` (output in `frontend/dist`)

## Demo walkthrough

1. **Live Bus Monitoring:** pick a bus and choose *Simulate scan*.
2. **Board a student:** on RFID Activity, click a student under *Quick tap*. The result shows **Verified** and a notification is queued.
3. **Duplicate tap:** tap the same card again straight away. It is rejected as a duplicate tap.
4. **Exit:** wait 10 seconds and tap again (Auto mode). The tap is recorded as an exit.
5. **Invalid exit:** switch the event to *Exit* and tap a student who hasn't boarded. It is rejected because the student is not onboard.
6. **Unknown card:** use *Unknown card*, or the card of a student from another bus. It is rejected.
7. **Notifications:** watch the message move from PENDING to SENT to DELIVERED. Retry any FAILED one.
8. **Overview and Analytics:** check the counts and charts have updated.

## What is simulated

- **Parent SMS.** `SimulatedNotificationProvider` stands in for a real SMS gateway; no messages are actually sent. Messages are marked *Simulated* in the UI. To go live, implement `NotificationProvider` (`backend/src/main/java/com/childsafety/service/notification/`) for a real gateway such as Twilio or MSG91.
- **RFID reader.** The *Scan simulator* calls the same endpoint a physical reader would.
- **Demo traffic.** With `DEMO_TRAFFIC_ENABLED=true` (set in `render.yaml`), `DemoTrafficSimulator` taps a card every 20 seconds through the normal verification rules, recorded as reader scans. A few taps are deliberately invalid and get rejected. It is off by default for local runs.

## Connecting a hardware RFID reader

Set `RFID_READER_API_KEY` in `backend/.env`, then have the reader (for example an ESP32 with an RC522) post each tap:

```http
POST /api/rfid/scan
X-Reader-Key: <RFID_READER_API_KEY>
Content-Type: application/json

{ "busId": 1, "rfidUid": "04:A3:1F:6B" }
```

`eventType` is optional. When it is omitted, the backend infers boarding or exit from the student's current status. The response says whether the scan was accepted and gives the rejection reason. A reader key can only call this endpoint.

## API overview

All endpoints are under `/api` and require `Authorization: Bearer <token>`, except login and health. Errors use RFC 7807 problem details, with field errors in `errors`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Sign in, returns a JWT |
| GET | `/auth/me` | Current admin |
| POST | `/auth/change-password` | Change the password |
| GET | `/dashboard/summary`, `/dashboard/activity` | Overview KPIs and activity feed |
| GET, POST | `/students` | List (filters: `q`, `className`, `busId` with `0` = unassigned, `status`, `page`, `size`) and create |
| GET, PUT, DELETE | `/students/{id}` | Detail (includes the full parent phone), update, delete |
| GET | `/students/classes` | Distinct class names |
| GET, POST | `/buses` | List and create |
| GET, PUT, DELETE | `/buses/{id}` | Detail with roster and recent scans, update, delete |
| POST | `/buses/{id}/students` | Assign students (`{ "studentIds": [...] }`) |
| DELETE | `/buses/{id}/students/{studentId}` | Unassign a student |
| POST | `/rfid/scan` | Verify a scan (admin token or reader key) |
| GET | `/rfid/activity`, `/rfid/activity/{id}` | Scan log (filters: `result`, `eventType`, `busId`, `q`, `from`, `to`) |
| GET | `/notifications`, `/notifications/{id}` | Notification log and detail |
| POST | `/notifications/{id}/retry` | Re-queue a failed notification |
| GET | `/analytics/daily`, `/weekly`, `/monthly`, `/summary` | Analytics (`from`, `to` as `YYYY-MM-DD`) |
| GET | `/settings`, `/health` | Read-only configuration and health check |

## Privacy and security notes

- Parent phone numbers are masked (`+91 ******1201`) in lists and only shown in full on detail views.
- Passwords are hashed with BCrypt. Sessions are stateless JWTs that expire after `JWT_EXPIRATION_MINUTES`.
- Deleting a student deactivates their card. Scan and notification history is kept as an audit trail, with the names recorded at the time of each event.

## Project structure

```
database/   schema.sql, seed.sql
backend/    Spring Boot app: config, entity, repository, service, controller, security, dto, exception
frontend/   React app: components, layouts, pages, services, hooks, types, utils
```

# ReachInbox — Full-stack Email Job Scheduler

A production-oriented demo built with Express, BullMQ/Redis, PostgreSQL, React, Ethereal SMTP, Elasticsearch, Google OAuth, and Slack OAuth.

## Quick start

1. Copy `.env.example` to `backend/.env` and fill Google, Slack, and optionally Ethereal credentials.
2. Start infrastructure. This environment uses legacy Compose (`docker-compose`); run `docker-compose up -d`. If Docker Desktop provides the plugin, `docker compose up -d` also works.
3. Install dependencies: `npm install --prefix backend && npm install --prefix frontend`
4. Create tables: `npm run migrate`
5. Start API, worker, and web app in separate terminals:
   - `npm run dev:api`
   - `npm run dev:worker`
   - `npm run dev:web`
6. Open `http://localhost:5173`. Queue dashboard: `http://localhost:4000/admin/queues`.

If Ethereal variables are omitted, the worker creates a temporary Ethereal account at runtime. The Ethereal inbox preview URL is printed in server logs by nodemailer as `https://ethereal.email/message/...`.

## External OAuth setup

### Google
Create a Web OAuth client at Google Cloud Console. Add `http://localhost:4000/api/auth/google/callback` as an authorized redirect URI and set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.

### Slack
Create a Slack app with incoming-webhook permission and OAuth redirect `http://localhost:4000/api/slack/callback`. Set `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET`. Connecting Slack stores the tenant webhook in PostgreSQL; disconnecting removes it immediately without redeployment.

## Architecture and persistence

`POST /api/emails/bulk` and `/api/emails/schedule` persist each recipient as a PostgreSQL row, then add an idempotent BullMQ job identified by `email:<emailId>`. BullMQ delayed jobs persist in Redis and survive API and worker restarts. The worker rechecks the database state before sending, so restarts cannot duplicate a completed email. PostgreSQL is the source of truth for status; Redis is the durable transport.

Elasticsearch indexes sent/scheduled rows under `emails`. The dashboard and API expose search through `GET /api/emails/search?q=...`.

## Throughput controls

- Worker concurrency defaults to `WORKER_CONCURRENCY=5`.
- `MIN_SEND_DELAY_MS` spaces individual sends; default is 2 seconds.
- Redis-backed per-sender hourly counters use the sender plus UTC hour-window key and are shared safely across workers. Default limit is `MAX_EMAILS_PER_HOUR_PER_SENDER=200`, and bulk jobs also submit campaign-specific values from the dashboard.
- At the limit, a job is not failed or dropped. It is re-enqueued with a delayed job one hour later and retains its original `emailId`. BullMQ prevents the same ID from creating duplicate queue records.
- BullMQ rate limiting and worker concurrency further protect provider throughput.

If 1,000 emails arrive together and the hourly limit is exceeded, all beyond the limit remain queued and are re-enqueued into the next hour window, preserving their relative order as closely as BullMQ allows. A live Slack incoming-webhook notification is attempted once when a sender encounters the limit; tenants with Slack disconnected are skipped.

## Environment

See `.env.example`. The repository uses Docker Compose for PostgreSQL, Redis, and Elasticsearch.

## Feature map

- Backend: REST scheduling APIs, CSV bulk scheduling, PostgreSQL persistence, BullMQ delayed jobs, restart-safe idempotency, distributed per-sender hourly limiting, concurrency/delay, Ethereal SMTP, Elasticsearch indexing/search, Google and Slack OAuth, Bull Board.
- Frontend: real Google OAuth entry flow, authenticated header profile/logout, Scheduled/Sent tabs, campaign compose modal, CSV/TXT lead parsing, loading/empty/error states, Slack connection, responsive dashboard.

## Demo / restart validation

1. Schedule an email 30–60 seconds ahead and confirm it appears in Scheduled.
2. Stop the API and worker processes, wait a few seconds, restart them, then confirm BullMQ sends the job at its scheduled time once.
3. Open Bull Board and show a delayed job.
4. Run a campaign over the hourly limit to demonstrate queued rescheduling and Slack notification if connected.

## Assumptions and shortcuts

BullMQ is used for scheduling rather than cron. Email credentials from one configured Ethereal account can be applied across sender addresses; recipient delivery is real only within the Ethereal preview. Elasticsearch calls degrade gracefully if unavailable. OAuth credentials are deployment-specific and must be supplied via environment variables.

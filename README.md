## Job recommendation architecture

OpportuneX now uses a semantic recommendation pipeline instead of the previous hand-tuned scoring/search model:

1. Active jobs are synchronized from the configured job sources in the background.
2. Hard eligibility rules remove jobs that clearly violate sector, location, workplace, employment-type, or experience constraints.
3. `gemini-embedding-001` creates 768-dimensional retrieval embeddings for the user intent/profile and job documents.
4. Semantic retrieval selects the most relevant candidate openings without requiring exact keyword/title matches.
5. `gemini-3.8-flash` reranks the top semantic candidates using the complete profile and job evidence.
6. The API returns explainable relevance, matched skills, missing required skills, and confidence.

New/changed jobs receive embeddings during background ingestion. Existing jobs without embeddings are backfilled lazily when recommendations are requested. `GEMINI_API_KEY` is required for semantic recommendations.

The old `lib/scoring.ts`, `lib/queryBuilder.ts`, `lib/skillExpansion.ts`, `lib/ml/hybridRanker.ts`, and `lib/explainer.ts` recommendation path has been removed.

# OpportuneX — AI Powered Job Recommendation System

This iteration turns OpportuneX into a full-stack, database-backed job intelligence foundation.

## Architecture

- Next.js App Router + TypeScript
- Auth.js v5 + Google OAuth
- PostgreSQL + Prisma
- Multi-source job ingestion adapters
- Normalization and duplicate consolidation
- Structured recommendation scoring and explainable match analysis
- Gemini integration for the Career Copilot/AI layer
- User profile, saved jobs, activity and alert data models

## Job-source policy

OpportuneX is India-first by default and can support other countries when requested. The backend is designed to aggregate APIs, permitted public feeds and official employer/government sources. It does **not** fabricate government listings and does not assume that a public website can be scraped without permission.

Configured source adapters include Adzuna, Jooble, Remotive, Greenhouse, Lever and Workable. The source registry documents official Indian sources that should be connected through permitted interfaces as access is available.

## Database setup

1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` and other secrets.
3. Install dependencies: `npm install`.
4. Generate Prisma client: `npx prisma generate`.
5. Create tables: `npx prisma migrate dev --name init`.
6. Start: `npm run dev`.

## Google OAuth

Configure a Google OAuth Web Application in Google Cloud. Add this authorized redirect URI for local development:

`http://localhost:3000/api/auth/callback/google`

Required environment variables:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_URL`

Verify the route before testing the button:

`http://localhost:3000/api/auth/session`

A working unauthenticated Auth.js session endpoint should return JSON rather than an HTML document.

## Job sync

`POST /api/jobs/sync` (and the scheduler-compatible `GET`) is protected by `x-job-sync-secret` or `CRON_SECRET`. The included `vercel.json` runs it every hour. Each source has its own minimum refresh interval: high-frequency API sources run hourly, slower sources run every few hours. Synchronization is incremental: new jobs are inserted, unchanged jobs only refresh their seen/check timestamps, changed jobs are updated, duplicates are consolidated, and jobs not observed for 14 days are deactivated only when their source has synchronized successfully within the previous 48 hours (protecting listings during provider outages). The Jobs page never waits for this synchronization; it reads PostgreSQL directly.

For non-Vercel deployments, configure an external scheduler to call `/api/jobs/sync` hourly with `Authorization: Bearer <CRON_SECRET>` or `x-job-sync-secret: <JOB_SYNC_SECRET>`. Sync status is available at `/api/jobs/sync/status`.

## Important

API credentials, database credentials and OAuth secrets are never included in this repository. Source access can be limited by provider terms, quota or geography; the application handles unavailable sources by skipping them rather than inventing data.

## Important database/auth setup

After `npm install`, Prisma Client is generated automatically by the `postinstall` script. If an existing installation still reports `@prisma/client did not initialize yet`, run:

```powershell
npx prisma generate
```

Then configure `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` in `.env.local`.

Google OAuth callback for local development:

```text
http://localhost:3000/api/auth/callback/google
```

The canonical job-listing route is `/openings`. The profile/preferences form is `/openings/setup`.

## Google Login setup

Google OAuth is wired through NextAuth/Auth.js and Prisma. For local development, set these values in `.env.local`:

```env
AUTH_SECRET="a-long-random-secret"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
AUTH_URL="http://localhost:3000"
```

In Google Cloud Console, add this authorized redirect URI:

`http://localhost:3000/api/auth/callback/google`

The landing-page Google button sends a new user to `/openings/setup` after authentication, where the profile can be completed and stored in PostgreSQL. Existing users can continue to the same flow and update their profile.


## v20 notes
- Career Copilot now supports file attachments (PDF, TXT/Markdown, CSV, JSON).
- Interview Prep keeps signed-in test history in the database and guest history in session storage.
- Resume Optimizer retries transient service failures and keeps its deterministic fallback.
- AI Match Analysis uses a stable responsive three-column layout.

## Semantic embedding pipeline (v26)

Job-document embeddings are generated only by the background embedding queue. Job ingestion never calls Gemini embeddings synchronously, and the user-facing recommendation API never embeds missing job documents.

- New/changed jobs are marked `embeddingStatus=pending`.
- `/api/jobs/sync` processes one bounded embedding batch after source ingestion.
- `/api/jobs/embeddings` is an authenticated manual worker endpoint for draining the queue when needed.
- Embeddings are reused until the normalized job content changes (`contentHash`).
- Gemini 429/quota errors are retried with backoff and then scheduled for a later attempt; the job sync itself continues.
- User searches make one query-embedding request, then perform local semantic retrieval over precomputed job vectors before Gemini reranking.
- Embedding status can be inspected through the authenticated sync-status endpoint.

Run the new Prisma migration before starting the application:

```bash
npx prisma migrate deploy
npx prisma generate
```

## v27 multi-domain job ingestion

The job ingestion layer uses a domain-diverse catalog of targeted role queries instead of a small set of bundled technology queries. Queries are rotated in batches so the provider is not hit with the entire catalog on every cron execution. For hourly API sources, the full catalog is covered across successive runs; slower sources use their own sync interval.

Job records receive deterministic domain metadata during normalization (for example healthcare, pharma, finance/accounting, mechanical, civil/construction, electronics/embedded, education, legal, agriculture, hospitality, and others). This metadata is ingestion context for semantic retrieval/reranking; it is not a weighted recommendation score.

Existing jobs with a missing domain are backfilled during the next protected sync. No database migration is required for v27.


## Hybrid Vector Recommendation Engine

The job recommender uses a hybrid vector-ranking architecture. Each active opening is represented by four Gemini embedding vectors: **full-job**, **role**, **skills**, and **domain**. The user's profile is mapped into the same four semantic spaces. Candidate ranking combines cosine similarity across those vectors with structured role/skill/domain/experience signals, followed by a small Gemini reranking signal.

### First-time setup after this version

1. Install dependencies: `npm install`
2. Apply the database migration: `npx prisma migrate deploy`
3. Generate the Prisma client: `npx prisma generate`
4. Run the app and job sync. The embedding worker will backfill the four vectors for active jobs.
5. Until backfill completes, the recommender can temporarily fall back to the existing full-job vector where available.

The current migration is `20261001070000_hybrid_vector_ranking`. New or changed jobs are automatically queued for all four embeddings.

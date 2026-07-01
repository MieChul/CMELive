# CME Live

Vite + React engagement portal with a Node/Express API, PostgreSQL, and Vertex AI (Gemini).

## Local Development

### 1. Start PostgreSQL (Docker — one command, no install needed)

```bash
docker run -d --name cmelive-db \
  -e POSTGRES_USER=cmelive \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=cmelive \
  -p 5432:5432 \
  postgres:16-alpine
```

Each developer runs their own isolated local instance. Data persists between restarts.

```bash
docker start cmelive-db   # start
docker stop cmelive-db    # stop when done
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
# Database (local Docker instance)
PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=cmelive
PG_PASSWORD=devpass
PG_DATABASE=cmelive
PG_SSL=false

# Auth
JWT_SECRET=any-long-random-string-for-local-dev
ADMIN_EMAILS=your.email@ltm.com

# SSO (leave false for local dev — use local sign-in instead)
ENABLE_SSO=false

# Optional: AI features (Vertex AI)
# GOOGLE_VERTEX_PROJECT_ID=your-gcp-project
# GOOGLE_VERTEX_LOCATION=us-central1
# GOOGLE_CREDENTIALS_JSON=<service-account-json>

# Optional: News agent
# NEWS_API_KEY=your-newsapi-key
```

### 3. Install and run

```bash
npm install
npm run dev:all    # starts API (port 3001) + Vite (port 5173) together
```

Migrations run automatically on first start.

---

## Production (GCP Cloud Run)

Set these environment variables in Cloud Run:

```
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://your-domain.ltm.com
JWT_SECRET=<strong-random-secret-32-chars-min>
ENABLE_SSO=true

# Cloud SQL PostgreSQL (Unix socket)
PG_SOCKET_PATH=/cloudsql/<project>:<region>:<instance>
PG_USER=cmelive
PG_PASSWORD=<secret>
PG_DATABASE=cmelive

# Microsoft Entra SSO
AZURE_AD_TENANT_ID=<tenant>
AZURE_AD_CLIENT_ID=<client>
AZURE_AD_CLIENT_SECRET=<secret>
AZURE_AD_REDIRECT_URI=https://your-domain.ltm.com/api/auth/callback

# Vertex AI
GOOGLE_VERTEX_PROJECT_ID=<project>
GOOGLE_CREDENTIALS_JSON=<service-account-json>
GCS_BUCKET_NAME=<bucket>
```

## Build

```bash
npm run build    # outputs static frontend to dist/
```

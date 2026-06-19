# CmeLive — GCP Migration Runbook

**Project ID:** `ltm-cme-labongcp`
**Region:** `us-central1`
**VPC Network Name:** `<VPC-NETWORK-NAME>` ← replace this everywhere with the name admin gives you

**Starting point:** Admin has created the VPC network and set up /24 Private Service Access range.
You have Editor + AI Platform Admin access and can create SA keys.

---

## PHASE 1 — GCP Infrastructure Setup

---

### Step 1 — Confirm VPC and Private Service Access

Open **Cloud Shell** by clicking the `>_` icon at the top-right of GCP Console.

Run this to get the VPC network name:
```bash
gcloud compute networks list --project=ltm-cme-labongcp
```
Copy the name from the output and replace every `<VPC-NETWORK-NAME>` in this document with it.

Confirm Private Service Access peering exists:
```bash
gcloud services vpc-peerings list --network=<VPC-NETWORK-NAME> --project=ltm-cme-labongcp
```

- If it shows a peering entry → admin already did it, skip to Step 2
- If output is empty → run these two commands yourself:

```bash
gcloud compute addresses create google-managed-services-default \
    --global \
    --purpose=VPC_PEERING \
    --prefix-length=24 \
    --network=<VPC-NETWORK-NAME> \
    --project=ltm-cme-labongcp
```

```bash
gcloud services vpc-peerings connect \
    --service=servicenetworking.googleapis.com \
    --ranges=google-managed-services-default \
    --network=<VPC-NETWORK-NAME> \
    --project=ltm-cme-labongcp
```

---

### Step 2 — Enable Required APIs

1. Click the hamburger menu **(≡)** at the top-left of GCP Console
2. Click **APIs & Services** → **Library**
3. Search for each name below, click the result, then click the blue **Enable** button:

| Search For | Purpose |
|---|---|
| `Cloud SQL Admin API` | PostgreSQL database |
| `Cloud Run API` | App hosting |
| `Artifact Registry API` | Docker image storage |
| `Cloud Storage API` | Image bucket |
| `Secret Manager API` | Secure credentials |
| `Cloud Build API` | Build Docker image in GCP |
| `Serverless VPC Access API` | Connect Cloud Run to private Cloud SQL |

Each takes 10–30 seconds. Wait for the checkmark before moving on.

---

### Step 3 — Create Serverless VPC Access Connector

This allows Cloud Run to reach private-IP Cloud SQL.

In **Cloud Shell**:
```bash
gcloud compute networks vpc-access connectors create cmelive-connector \
    --region=us-central1 \
    --network=<VPC-NETWORK-NAME> \
    --range=10.8.0.0/28 \
    --project=ltm-cme-labongcp
```

> If `10.8.0.0/28` conflicts with your org's managed ranges, ask admin for an available /28 and substitute it.

Verify it is ready:
```bash
gcloud compute networks vpc-access connectors describe cmelive-connector \
    --region=us-central1 --project=ltm-cme-labongcp
```
Look for `state: READY` in the output before continuing.

---

### Step 4 — Create Cloud SQL PostgreSQL Instance

1. Hamburger menu → **Databases** → **SQL**
2. Click **Create Instance**
3. Click **Choose PostgreSQL**
4. Fill in the form:

**Instance info section:**
- Database version: `PostgreSQL 16`
- Instance ID: `cmelive-postgres`
- Password: click **Generate** → copy and save this (postgres superuser password)

**Edition section:**
- Select **Enterprise**

**Region and availability section:**
- Region: `us-central1`
- Zonal availability: `Single zone` (cost saving) or `Multiple zones` (production HA)

**Machine configuration section:**
- Click the machine dropdown → select **Shared core**
- Select `1 vCPU, 1.7 GB`

**Storage section:**
- Type: `SSD`
- Size: `10 GB`
- Tick ✅ **Enable automatic storage increases**

**Connections section (scroll down):**
- Uncheck `Public IP`
- Check ✅ `Private IP`
- VPC Network: select `<VPC-NETWORK-NAME>`
- Allocated IP range: select `google-managed-services-default`
- Leave Private Service Connect unchecked

5. Click **Create Instance** at the bottom — takes 5–10 minutes
6. Once green, click `cmelive-postgres` → find and copy the **Connection name**:
```
ltm-cme-labongcp:us-central1:cmelive-postgres
```

---

### Step 5 — Create Database and App User

In **Cloud Shell**:
```bash
gcloud sql connect cmelive-postgres --user=postgres --database=postgres --project=ltm-cme-labongcp
```
Type `Y` when prompted, then enter the postgres superuser password from Step 4.

Once inside the `psql` prompt, run each command:
```sql
CREATE DATABASE cmelive ENCODING 'UTF8';
\c cmelive
CREATE USER cmelive_app WITH PASSWORD 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE cmelive TO cmelive_app;
GRANT ALL PRIVILEGES ON SCHEMA public TO cmelive_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cmelive_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO cmelive_app;
\q
```
> Replace `YourStrongPassword123!` with your own strong password (16+ chars). Save it — this becomes `PG_PASSWORD`.

---

### Step 6 — Create GCS Bucket

1. Hamburger menu → **Cloud Storage** → **Buckets**
2. Click **Create bucket**
3. Fill in:
   - Name: `cmelive-news-images-ltm`
   - Click **Continue**
   - Location type: `Region` → `us-central1` → **Continue**
   - Storage class: `Standard` → **Continue**
   - Access control: `Uniform` → **Continue**
   - Leave data protection defaults → **Continue**
4. Click **Create**

> No public access needed. The app serves images via `/api/images/:filename` which generates a short-lived GCS signed URL on each request. The bucket stays private — org policy compliant.

---

### Step 7 — Create Service Account

1. Hamburger menu → **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Fill in:
   - Service account name: `cmelive-app`
   - ID auto-fills as `cmelive-app` — leave it
   - Click **Create and Continue**
4. Add these roles by clicking **+ Add another role** for each:
   - `Cloud SQL Client`
   - `Storage Object Admin`
   - `Vertex AI User`
   - `Secret Manager Secret Accessor`
5. Click **Continue** → **Done**

**Download the JSON key:**
1. Click `cmelive-app@ltm-cme-labongcp.iam.gserviceaccount.com` in the list
2. Click **Keys** tab → **Add Key** → **Create new key**
3. Select **JSON** → **Create**
4. A `.json` file downloads to your laptop — keep this secure, treat it like a password

---

### Step 8 — Store Secrets in Secret Manager

1. Hamburger menu → **Security** → **Secret Manager**
2. For each row below: click **Create Secret**, enter the name and value exactly as shown, click **Create Secret**

| Secret Name | Value |
|---|---|
| `cmelive-jwt-secret` | Your current `JWT_SECRET` from Azure App Service environment |
| `cmelive-pg-password` | The `cmelive_app` password you set in Step 5 |
| `cmelive-azure-ad-client-secret` | Your `AZURE_AD_CLIENT_SECRET` from Azure |
| `cmelive-news-agent-api-key` | Your current `NEWS_AGENT_API_KEY` from Azure App Service (32+ chars) |
| `cmelive-google-credentials` | Entire contents of the JSON file downloaded in Step 7 |

> For `cmelive-google-credentials`: open the `.json` file in Notepad → Ctrl+A → Ctrl+C → paste into the Secret value field as-is.

---

## PHASE 2 — Build and Deploy

---

### Step 9 — Install gcloud CLI on Your Laptop

1. Go to [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
2. Click **Windows** → download the installer → run it → follow all prompts
3. When prompted to run `gcloud init` → select **Yes**
4. A browser opens → sign in with your GCP org account
5. When asked to select a project → choose `ltm-cme-labongcp`

Verify in a new PowerShell window:
```powershell
gcloud auth list
```
You should see your email with an asterisk next to it.

---

### Step 10 — Create Artifact Registry Repository

In PowerShell:
```powershell
gcloud artifacts repositories create cmelive `
  --repository-format=docker `
  --location=us-central1 `
  --project=ltm-cme-labongcp `
  --description="CmeLive app images"
```

---

### Step 11 — Build and Push Docker Image

In PowerShell, navigate to the project folder:
```powershell
cd e:\CmeLive
```

Submit the build to Cloud Build (runs entirely in GCP — no Docker needed on your laptop):
```powershell
gcloud builds submit `
  --tag us-central1-docker.pkg.dev/ltm-cme-labongcp/cmelive/app:v1 `
  --project=ltm-cme-labongcp `
  .
```

This takes 3–5 minutes. Build logs stream in the terminal. Wait for `SUCCESS`.

---

### Step 12 — Deploy to Cloud Run

1. Hamburger menu → **Cloud Run**
2. Click **Create Service**
3. Select **Deploy one revision from an existing container image**
4. Click **Select** → navigate: **Artifact Registry** → `cmelive` → `app` → select `v1` → **Select**
5. Fill in:
   - Service name: `cmelive`
   - Region: `us-central1`
   - Authentication: `Allow unauthenticated invocations`

6. Click **Container, Networking, Security** to expand

**Container tab:**
- Container port: `8080`
- Memory: `1 GiB`
- CPU: `1`
- Minimum instances: `1`
- Maximum instances: `10`
- Tick ✅ **Enable startup CPU boost**

**Networking tab:**
- Under VPC, select **Connect to a VPC for outbound traffic**
- VPC Connector: select `cmelive-connector`
- Traffic routing: `Route only requests to private IPs through the VPC connector`

**Variables & Secrets tab — click Add Variable for each:**

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DB_TYPE` | `pg` |
| `PG_SOCKET_PATH` | `/cloudsql/ltm-cme-labongcp:us-central1:cmelive-postgres` |
| `PG_DATABASE` | `cmelive` |
| `PG_USER` | `cmelive_app` |
| `ENABLE_SSO` | `true` |
| `AZURE_AD_TENANT_ID` | your Tenant ID from Azure App Service environment |
| `AZURE_AD_CLIENT_ID` | your Client ID from Azure App Service environment |
| `AZURE_AD_REDIRECT_URI` | `https://PLACEHOLDER` (update after deployment) |
| `FRONTEND_URL` | `https://PLACEHOLDER` (update after deployment) |
| `GCS_BUCKET_NAME` | `cmelive-news-images-ltm` |
| `GOOGLE_VERTEX_PROJECT_ID` | `ltm-cme-labongcp` |
| `GOOGLE_VERTEX_LOCATION` | `us-central1` |
| `ADMIN_EMAILS` | your admin email address |
| `NEWS_AGENT_CRON` | `0 8 * * *` |
| `NEWS_MAX_PER_RUN` | `10` |
| `ENABLE_DALLE_IMAGES` | `true` |
| `GOOGLE_CSE_API_KEY` | your Google Custom Search API key from Azure App Service |
| `GOOGLE_CSE_ID` | your Google Custom Search Engine ID from Azure App Service |
| `KEYMOMENT_API_BASE_URL` | your Key Moments API base URL from Azure App Service |
| `KEYMOMENT_API_KEY` | your Key Moments API key from Azure App Service |

**Click Reference a Secret for each of these:**

| Variable Name | Secret | Version |
|---|---|---|
| `JWT_SECRET` | `cmelive-jwt-secret` | `latest` |
| `PG_PASSWORD` | `cmelive-pg-password` | `latest` |
| `AZURE_AD_CLIENT_SECRET` | `cmelive-azure-ad-client-secret` | `latest` |
| `GOOGLE_CREDENTIALS_JSON` | `cmelive-google-credentials` | `latest` |
| `NEWS_AGENT_API_KEY` | `cmelive-news-agent-api-key` | `latest` |

**Connections tab:**
- Click **Add connection** → select `ltm-cme-labongcp:us-central1:cmelive-postgres` → **Done**

**Security tab:**
- Service account: select `cmelive-app@ltm-cme-labongcp.iam.gserviceaccount.com`

7. Click **Create** — wait 1–2 minutes
8. **Copy the URL** shown at the top — looks like `https://cmelive-xxxxx-uc.a.run.app`

---

### Step 13 — Register Redirect URI in Azure Portal

1. Go to [https://portal.azure.com](https://portal.azure.com)
2. Search **Azure Active Directory** → click it
3. Left sidebar → **App registrations** → click your CmeLive app
4. Left sidebar → **Authentication**
5. Under **Web → Redirect URIs** → click **Add URI**
6. Paste: `https://YOUR-CLOUD-RUN-URL/api/auth/callback`
7. Click **Save**

---

### Step 14 — Update Placeholder URLs in Cloud Run

1. GCP Console → **Cloud Run** → click `cmelive`
2. Click **Edit & Deploy New Revision**
3. Click **Variables & Secrets** tab
4. Update:
   - `AZURE_AD_REDIRECT_URI` → `https://YOUR-CLOUD-RUN-URL/api/auth/callback`
   - `FRONTEND_URL` → `https://YOUR-CLOUD-RUN-URL`
5. Click **Deploy** → wait for green checkmark

---

## PHASE 3 — Data Migration

---

### Step 15 — Export Data from Azure SQL

Export each table as a CSV file in the following order (foreign key dependency order):

```
1.  users
2.  admin_config
3.  news
4.  surveys
5.  questions
6.  question_options
7.  responses
8.  answers
9.  survey_votes
10. testimonials
11. cornerOfficeConversations
12. keyMoments
13. user_likes
14. user_km_likes
```

In SSMS: right-click database → **Tasks** → **Export Data** → select CSV format for each table.

Or in Azure portal Query Editor, run for each table:
```sql
SELECT * FROM [dbo].[users]
```
Then click **Export results → CSV**.

**Important data transformations before import:**
- `BIT` columns (`isAdmin`, `isReviewed`, `isRequired`): change `1` → `true` and `0` → `false` in the CSV (PostgreSQL uses boolean, not 0/1)
- Timestamps are compatible — no change needed
- Text fields are compatible — no change needed

---

### Step 16 — Upload CSVs to GCS

In PowerShell on your laptop:
```powershell
gcloud storage cp C:\path\to\your\csvs\*.csv gs://cmelive-news-images-ltm/migration-data/
```

---

### Step 17 — Import Data into Cloud SQL

In **Cloud Shell**:
```bash
mkdir ~/migration && cd ~/migration
gcloud storage cp gs://cmelive-news-images-ltm/migration-data/*.csv .

gcloud sql connect cmelive-postgres --user=cmelive_app --database=cmelive --project=ltm-cme-labongcp
```

Inside psql:
```sql
SET session_replication_role = 'replica';

\COPY users(id,email,"displayName","profilePicUrl","ssoObjectId","createdDate","createdBy","updatedDate","updatedBy","isAdmin") FROM 'users.csv' WITH (FORMAT csv, HEADER true);
\COPY admin_config(id,key,value,"createdDate","updatedDate") FROM 'admin_config.csv' WITH (FORMAT csv, HEADER true);
\COPY news(id,title,url,"imageUrl","imageAlt",tags,summary,"aiScore","batchId",images,likes,views,shares,"domainImperative","aiTechImperative","createdDate") FROM 'news.csv' WITH (FORMAT csv, HEADER true);
\COPY surveys(id,"userId",title,description,"isActive","createdDate","createdBy","updatedDate","updatedBy") FROM 'surveys.csv' WITH (FORMAT csv, HEADER true);
\COPY questions(id,"surveyId",text,type,"isRequired","orderIndex","createdDate") FROM 'questions.csv' WITH (FORMAT csv, HEADER true);
\COPY question_options(id,"questionId",text,"orderIndex") FROM 'question_options.csv' WITH (FORMAT csv, HEADER true);
\COPY responses(id,"surveyId","userId","submittedAt") FROM 'responses.csv' WITH (FORMAT csv, HEADER true);
\COPY answers(id,"responseId","questionId","optionId",text) FROM 'answers.csv' WITH (FORMAT csv, HEADER true);
\COPY survey_votes(id,"surveyId","userId","createdDate") FROM 'survey_votes.csv' WITH (FORMAT csv, HEADER true);
\COPY testimonials(id,name,title,company,quote,"avatarUrl","isActive","orderIndex","createdDate") FROM 'testimonials.csv' WITH (FORMAT csv, HEADER true);
\COPY "cornerOfficeConversations"(id,title,description,"videoUrl","thumbnailUrl","speakerName","speakerTitle","isActive","orderIndex","createdDate") FROM 'cornerOfficeConversations.csv' WITH (FORMAT csv, HEADER true);
\COPY "keyMoments"(id,"externalId",title,description,category,tags,"thumbnailUrl","s3Path","remoteVideoUrl","localVideoUrl","durationSeconds","capturedAt","rawMetadata",status,"reviewedBy","reviewedAt","fetchedAt","createdDate","updatedDate",domain) FROM 'keyMoments.csv' WITH (FORMAT csv, HEADER true);
\COPY user_likes(id,"userId","newsId","createdDate") FROM 'user_likes.csv' WITH (FORMAT csv, HEADER true);
\COPY user_km_likes(id,"userId","momentId","createdDate") FROM 'user_km_likes.csv' WITH (FORMAT csv, HEADER true);

SET session_replication_role = 'origin';

-- Reset SERIAL sequences (CRITICAL — must do this or new inserts will fail with duplicate key errors)
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('surveys_id_seq', (SELECT MAX(id) FROM surveys));
SELECT setval('questions_id_seq', (SELECT MAX(id) FROM questions));
SELECT setval('question_options_id_seq', (SELECT MAX(id) FROM question_options));
SELECT setval('responses_id_seq', (SELECT MAX(id) FROM responses));
SELECT setval('answers_id_seq', (SELECT MAX(id) FROM answers));
SELECT setval('survey_votes_id_seq', (SELECT MAX(id) FROM survey_votes));
SELECT setval('news_id_seq', (SELECT MAX(id) FROM news));
SELECT setval('testimonials_id_seq', (SELECT MAX(id) FROM testimonials));
SELECT setval('"cornerOfficeConversations_id_seq"', (SELECT MAX(id) FROM "cornerOfficeConversations"));
SELECT setval('"keyMoments_id_seq"', (SELECT MAX(id) FROM "keyMoments"));
SELECT setval('user_likes_id_seq', COALESCE((SELECT MAX(id) FROM user_likes), 1), false);
SELECT setval('user_km_likes_id_seq', COALESCE((SELECT MAX(id) FROM user_km_likes), 1), false);

\q
```

---

### Step 18 — Migrate Images from Azure Blob to GCS

Download azcopy from [https://aka.ms/downloadazcopy-v10-windows](https://aka.ms/downloadazcopy-v10-windows).

In PowerShell:
```powershell
# Get SAS token from Azure portal → Storage Account → Shared Access Signature → Generate
azcopy copy "https://YOURACCOUNT.blob.core.windows.net/news-images?YOUR_SAS_TOKEN" ./news-images-backup --recursive

# Upload all images to GCS
gcloud storage cp ./news-images-backup/* gs://cmelive-news-images-ltm/
```

Update image URLs in the database (run in Cloud Shell psql):
```sql
-- Azure Blob URLs → app-served signed URL path
UPDATE news SET "imageUrl" = '/api/images/' || SPLIT_PART("imageUrl", '/', -1)
WHERE "imageUrl" LIKE 'https://YOURACCOUNT.blob.core.windows.net/%';
```

---

### Step 19 — Verify Row Counts Before Cutover

In Cloud Shell psql, run a quick count check and compare against Azure SQL:
```sql
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'surveys', COUNT(*) FROM surveys
UNION ALL SELECT 'news', COUNT(*) FROM news
UNION ALL SELECT 'questions', COUNT(*) FROM questions
UNION ALL SELECT 'responses', COUNT(*) FROM responses
UNION ALL SELECT 'answers', COUNT(*) FROM answers
UNION ALL SELECT 'testimonials', COUNT(*) FROM testimonials
UNION ALL SELECT 'keyMoments', COUNT(*) FROM "keyMoments";
```

---

## PHASE 4 — Verify and Cutover

---

### Troubleshooting — Imagen 3 Returns No Images

If news articles are saved with only the category gradient placeholder and no AI-generated image, the most common cause is that Vertex AI billing was not yet active when the first run happened.

**Fix:**
1. GCP Console → **Billing** → confirm the billing account is linked to project `ltm-cme-labongcp`
2. GCP Console → **APIs & Services** → confirm `Vertex AI API` shows a green checkmark
3. In Cloud Run → click `cmelive` → **Logs** — search for `Imagen API error` to see the exact error message
4. Trigger a manual agent run: Admin panel → Agent → **Run Now**

Imagen 3 pricing is ~$0.02 per image. With `ENABLE_DALLE_IMAGES=true` and `NEWS_MAX_PER_RUN=10` and 3 images per article, a single daily run costs ~$0.60.

---

### Step 20 — Verification Checklist

Open your Cloud Run URL in a browser:

- [ ] Home page loads (React frontend)
- [ ] Click **Sign In** → Microsoft login page appears → login succeeds → redirected back to app
- [ ] News section loads with articles and images visible
- [ ] Survey section loads, can submit a response
- [ ] Admin panel accessible (navigate to `/admin`)
- [ ] No red errors in: GCP Console → Cloud Run → `cmelive` → **Logs** tab

---

### Step 21 — Cutover

Once all verification checks pass:

1. **Freeze Azure App Service** — Azure portal → App Services → your app → **Stop**
2. Export any rows created after your initial export: `WHERE createdDate > 'your-export-timestamp'`
3. Import those incremental rows to Cloud SQL (repeat Step 17 for only the new rows)
4. Reset sequences again (repeat the `setval` block from Step 17)
5. **Update DNS** (if you have a custom domain) to point to the Cloud Run URL
6. Confirm traffic flows correctly in Cloud Run logs

---

### Rollback Plan (valid for 30 days)

If anything goes wrong after cutover:

1. Azure portal → App Services → your app → **Start**
2. Revert DNS to the Azure App Service URL
3. Users are back on the old system immediately — Azure SQL was never modified

Do not delete any Azure resources for 30 days after successful cutover.

---

## News Agent — Article Sources

The news agent collects articles from three independent source types. They work in combination — you do not need all three.

### Source 1 — RSS Feeds (free, no key required)

RSS feeds are built into the agent and require zero configuration. The following feeds are hardcoded as fallback sources and will be fetched automatically:

| Feed | URL |
|---|---|
| Google News AI | `https://news.google.com/rss/search?q=artificial+intelligence+when:7d` |
| The Verge AI | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` |
| VentureBeat AI | `https://venturebeat.com/category/ai/feed/` |
| Wired AI | `https://www.wired.com/feed/tag/ai/latest/rss` |

You can also add custom RSS feeds in the admin panel (Agent Config → Custom Sources). No environment variable needed.

---

### Source 2 — Google Custom Search Engine (free tier, already configured)

You already have `GOOGLE_CSE_API_KEY` and `GOOGLE_CSE_ID` from your Azure setup. These work in Cloud Run production without any changes. Google CSE gives 100 free search queries per day — more than enough for the daily cron job.

This is your primary production source alongside RSS.

---

### Source 3 — NewsAPI (optional, free key available — but read the caveat)

[https://newsapi.org](https://newsapi.org) offers a broader keyword-based article search.

**How to get the free key:**
1. Go to [https://newsapi.org/register](https://newsapi.org/register)
2. Fill in your name, email, and password → click **Submit**
3. Your API key is shown immediately on the next screen — copy it
4. Also available any time at: **Account → API Key**

**Add it to Cloud Run:**
- In Cloud Run → Edit & Deploy New Revision → Variables & Secrets tab
- Click **Add Variable** → Name: `NEWS_API_KEY` → Value: your key
- Click **Deploy**

> **⚠️ Production caveat:** NewsAPI's free Developer plan blocks requests from non-localhost origins. This means `NEWS_API_KEY` will work on your local machine but will return a `426 Upgrade Required` error when the code runs on Cloud Run. The agent silently skips NewsAPI when this happens and falls back to Google CSE + RSS feeds, so it will not break anything — you just won't get the extra NewsAPI articles in production without a paid plan (~$99/month).
>
> **Recommendation:** Use Google CSE + RSS feeds for production. Add `NEWS_API_KEY` only if you want richer results during local development testing.

---

## Quick Reference — Environment Variables

| Variable | Where It Comes From |
|---|---|
| `AZURE_AD_TENANT_ID` | Azure App Service → Configuration → App settings |
| `AZURE_AD_CLIENT_ID` | Azure App Service → Configuration → App settings |
| `AZURE_AD_CLIENT_SECRET` | Azure App Service → Configuration → App settings |
| `JWT_SECRET` | Azure App Service → Configuration → App settings |
| `ADMIN_EMAILS` | Azure App Service → Configuration → App settings |
| `NEWS_AGENT_API_KEY` | Azure App Service → Configuration → App settings |
| `GOOGLE_CSE_API_KEY` | Azure App Service → Configuration → App settings |
| `GOOGLE_CSE_ID` | Azure App Service → Configuration → App settings |
| `KEYMOMENT_API_BASE_URL` | Azure App Service → Configuration → App settings |
| `KEYMOMENT_API_KEY` | Azure App Service → Configuration → App settings |
| `GOOGLE_CREDENTIALS_JSON` | JSON key file downloaded in Step 7 |
| `PG_PASSWORD` | Password you set in Step 5 |
| `NEWS_API_KEY` | newsapi.org → Register (optional — dev only, see News Agent section) |

## Services Coverage Summary

| Service | Azure (Old) | GCP (New) | Status |
|---|---|---|---|
| **Database** | Azure SQL Server (MSSQL) | Cloud SQL PostgreSQL 16 | Migrated — new `pg` driver, 16 migration files |
| **File Storage** | Azure Blob Storage | Cloud Storage (GCS) | Migrated — private bucket, signed URLs via `/api/images/:filename` |
| **AI — Text/Summaries** | Azure OpenAI (GPT-4o) | Vertex AI Gemini 2.0 Flash (GCP) | Migrated — geminiService.js, no OpenAI key needed |
| **AI — Image Generation** | Azure OpenAI DALL-E | Vertex AI Imagen 3 (GCP) | Migrated — DALL-E fallback removed |
| **AI — News Search** | Google CSE (via Azure) | Google CSE + RSS feeds (no key) | No change for CSE — RSS feeds built-in, no key required |
| **Authentication** | Microsoft Entra SSO | Microsoft Entra SSO (unchanged) | No code change — just add redirect URI |
| **Hosting** | Azure App Service + IISNode | Cloud Run (Docker) | Migrated — Dockerfile added |
| **Key Moments** | AWS API Gateway (external) | AWS API Gateway (external) | No change — external API, same keys |
| **Secrets** | Azure App Service env vars | GCP Secret Manager | Migrated — 5 secrets stored |
| **Cron / Scheduler** | Azure App Service (always-on) | Cloud Run min instances=1 + node-cron | No code change — cron runs inside container |

---

*Runbook version: GCP Migration v1.0 — CmeLive*

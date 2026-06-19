# Full app deployment (API + static UI)

This package contains the **Node/Express API** (`server/`), the **built React app** (`dist/`), and dependencies metadata.

## Prerequisites

- **Node.js 18+** on the server (Azure App Service: enable Node, set version in Configuration).
- **Environment variables** — copy `.env.example` to `.env` on the server (or use Application Settings) and set at least:
  - `JWT_SECRET` (strong random string)
  - `PORT` — Azure usually sets `process.env.PORT` automatically.
  - For Azure SQL: `DB_TYPE=mssql` and your `AZURE_SQL_*` values (see `.env.example`).
  - For AI features: `OPENAI_API_KEY` or Azure OpenAI vars as documented in `.env.example`.

## Install and start

From the folder that contains `package.json`:

```bash
npm install --production
```

`postinstall` **skips** rebuilding if `dist/index.html` is already present (this package includes it).

```bash
npm start
```

This runs `node server/index.js`, which serves **both** `/api` and the static files from `dist/`.

## Azure App Service

1. Create a **Node** web app (Linux or Windows).
2. Upload this package (ZIP) and extract so `package.json` is at `site/wwwroot` (or your deployment root).
3. **Configuration → Application settings**: add the same keys as `.env` (especially `JWT_SECRET`, DB, SSO).
4. **Startup command** (Linux): `npm start`  
   **Windows** with `web.config` + iisnode: ensure `server/index.js` path matches; often default is fine.
5. After deploy, Kudu / SSH: run `npm install --production` if your pipeline does not.

## Rebuild the UI on the server (optional)

If you change only frontend code, rebuild locally with `npm run build`, then redeploy `dist/`.  
To build on the server you need a full dev install: `npm install` (with devDependencies) then `npm run build`.

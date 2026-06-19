# CME Live

Vite + React marketing site and **AI Exchange** (surveys) with a Node API.

## Development

1. `npm install`
2. Copy `.env.example` to `.env` in the project root. Set `JWT_SECRET`, optional `AZURE_OPENAI_*` or `OPENAI_API_KEY` for real AI; set `NEWS_API_KEY` for live AI news cards (`/api/ai/latest-news`).
3. **Run API + Vite** (two terminals) or: `npm run dev:all`
   - API: `npm run server` → http://localhost:3001
   - Vite: `npm run dev` → http://localhost:5173 (proxies `/api` and `/uploads` to the API)

4. In **AI Exchange**, use **Sign in** (local): email + display name. Then create a survey, run **AI review**, and save. SQLite data lives in `server/data/aiexchange.db`.

## Production notes

- Set `FRONTEND_URL`, `NODE_ENV=production`, strong `JWT_SECRET`, and `ENABLE_SSO=true` with Microsoft Entra app registration for SSO. With SSO disabled, use local sign-in (same API).
- Optional: point `AZURE_SQL_*` in a later iteration; current default is **SQLite** for portability.

## Build

- `npm run build` – static `dist/`

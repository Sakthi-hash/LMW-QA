# QA Machine Dispatch Board

A full-stack, responsive QA tracking web application for CNC machines moving through six readiness checks before dispatch. Powered by React, Vite, Express, and PostgreSQL (Supabase) via Drizzle ORM.

---

## 🚀 Quick Start (Localhost Setup)

### 1. Prerequisites
- **Node.js**: v18+ (Node 20+ recommended)
- **Supabase PostgreSQL Database**: A free Supabase project.

---

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and set your **Supabase PostgreSQL Connection String**:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
PORT=5000
VITE_PORT=3000
```

> **Where to find your Supabase Connection String**:
> 1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
> 2. Open your project > **Project Settings** > **Database**.
> 3. Under **Connection String**, copy the **URI** (or Pooled connection string).
> 4. Replace `[YOUR-PASSWORD]` with your database password.

---

### 3. Install Dependencies
```bash
npx pnpm install
```

---

### 4. Push Database Schema to Supabase
Run Drizzle schema push to automatically create the required database tables (`machines`, `activity`) in your Supabase database:
```bash
npx pnpm db:push
```

---

### 5. Run the Web Application on Localhost

#### Option A: Run Backend & Frontend Concurrently (2 Terminals)

**Terminal 1 — API Server (Port 5000)**:
```bash
npx pnpm dev:api
```

**Terminal 2 — React Web Board (Port 3000)**:
```bash
npx pnpm dev:web
```

Open **`http://localhost:3000`** in your browser!

---

## 🌐 Deployment Plan (Publishing to Web)

### Architecture
- **Database**: Supabase PostgreSQL (Cloud Database).
- **Backend API**: Render / Railway / Fly.io / VPS (Node.js Express).
- **Frontend SPA**: Vercel / Netlify / Render Static Site (React Vite).

---

### Step-by-Step Deployment

#### 1. Backend API Deployment (Render / Railway)
1. Push your repository to GitHub.
2. Create a new **Web Service** on [Render](https://render.com) or [Railway](https://railway.app).
3. Connect your GitHub repository.
4. Set the following build and start commands:
   - **Build Command**: `npx pnpm install && npx pnpm run build`
   - **Start Command**: `node artifacts/api-server/dist/index.mjs`
5. Set Environment Variables:
   - `DATABASE_URL`: Your Supabase connection string.
   - `PORT`: `5000` (or system `$PORT`).
   - `NODE_ENV`: `production`

#### 2. Frontend Deployment (Vercel / Netlify)
1. Create a new project on [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
2. Root Directory: `artifacts/qa-machine-board`
3. Framework Preset: **Vite**
4. Build Command: `npx pnpm run build`
5. Output Directory: `dist/public`
6. Rewrite / Proxy Configuration:
   - In Vercel `vercel.json` or Netlify `_redirects`, proxy `/api/*` requests to your deployed Express API URL (e.g. `https://your-api.onrender.com/api/:splat`).

---

## 🏗️ Project Structure

- `artifacts/qa-machine-board/` — React Vite frontend UI and live polling board
- `artifacts/api-server/` — Express 5 API server handling machines, processes, summary & activity log
- `lib/db/` — Drizzle ORM schema and PostgreSQL database client
- `lib/api-spec/` — OpenAPI spec and codegen definition
- `lib/api-client-react/` — React Query hooks for fetching machine state

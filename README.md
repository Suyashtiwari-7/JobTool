# JobTool — AI-Powered Job Application Pipeline

Cloud-hosted job application pipeline that sources jobs from 7 public APIs, scores them against your resume, generates tailored resumes and cover letters using AI, and presents a review dashboard — all running independently of your laptop.

## Architecture

```
Frontend (Vercel)  ──▶  Backend (Render)  ──▶  Database (Neon PostgreSQL)
                           │
                           ├── Job APIs (Adzuna, Greenhouse, Lever, Ashby, Arbeitnow, RemoteOK, The Muse)
                           ├── LLM APIs (Gemini → Groq → DeepSeek failover)
                           └── PDF Generation (WeasyPrint)
                           
Cron-job.org  ──▶  Backend /api/pipeline/run/cron (daily trigger)
```

## Features

- **7 Job Source Integrations**: Adzuna (multi-country), Greenhouse, Lever, Ashby, Arbeitnow, RemoteOK, The Muse
- **Smart Deduplication**: Fuzzy matching to remove duplicates across sources
- **AI Resume Parsing**: Upload PDF/DOCX, get structured JSON via LLM
- **AI Job Scoring**: Score each job against your resume (0-100)
- **AI Resume Tailoring**: Light, truthful adjustments to match each job description
- **AI Cover Letters**: Custom cover letter generated per job
- **PDF Generation**: Professional PDFs for tailored resumes and cover letters
- **Review Queue Dashboard**: Card-based queue with score badges, status tracking, one-click apply
- **Multi-Provider LLM**: Automatic failover across Gemini, Groq, DeepSeek
- **Cloud Cron**: Daily pipeline runs via cron-job.org (independent of your laptop)

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (or use a free Neon database)

### 1. Clone and setup backend

```bash
cd backend
cp ../.env.example .env
# Edit .env with your API keys and database URL

python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

pip install -e .
```

### 2. Setup frontend

```bash
cd frontend
npm install
```

### 3. Set environment variables

Edit `backend/.env`:
```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/jobtool
GEMINI_API_KEY=your-key
ADZUNA_APP_ID=your-id
ADZUNA_APP_KEY=your-key
APP_PASSWORD=your-password
```

### 4. Run

```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open http://localhost:3000

## Deployment ($0/month)

### 1. Database — Neon (Free)
1. Go to [neon.tech](https://neon.tech) → Create a free project
2. Copy the connection string (change `postgres://` to `postgresql+asyncpg://`)

### 2. Backend — Render (Free)
1. Push code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo, set root directory to `backend`
4. Runtime: Docker
5. Plan: Free
6. Add environment variables from `.env.example`
7. Note the deployed URL (e.g., `https://jobtool-api.onrender.com`)

### 3. Frontend — Vercel (Free)
1. Go to [vercel.com](https://vercel.com) → Import project
2. Set root directory to `frontend`
3. Add env variable: `NEXT_PUBLIC_API_URL=https://jobtool-api.onrender.com`
4. Deploy

### 4. Cron — cron-job.org (Free)
1. Go to [cron-job.org](https://cron-job.org) → Create a free account
2. Create a new cron job:
   - URL: `https://jobtool-api.onrender.com/api/pipeline/run/cron`
   - Method: POST
   - Schedule: Daily at your preferred time
   - Headers: `X-Cron-Secret: your-cron-secret-from-env`

## API Keys Needed (All Free)

| Service | URL | Free Tier |
|---------|-----|-----------|
| Adzuna | [developer.adzuna.com](https://developer.adzuna.com) | 2,500 req/month |
| Google Gemini | [aistudio.google.com](https://aistudio.google.com) | 1,500 req/day |
| Groq | [console.groq.com](https://console.groq.com) | 1,000 req/day |
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com) | Trial credits |

Greenhouse, Lever, Ashby, Arbeitnow, RemoteOK, and The Muse APIs are all free and require no API key.

## Tech Stack

- **Backend**: Python FastAPI + SQLAlchemy + asyncpg
- **Frontend**: Next.js (React)
- **Database**: PostgreSQL (Neon)
- **LLM**: Google Gemini / Groq / DeepSeek (failover chain)
- **PDF**: WeasyPrint
- **Hosting**: Render (backend) + Vercel (frontend) + cron-job.org (scheduler)

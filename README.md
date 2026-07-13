# Zorvia

Multi-tenant **tiffin SaaS** for Canadian providers (**Zorvia**). FastAPI + MongoDB backend, Next.js frontend, Firebase Google auth, Resend email, Cloudflare R2 storage, optional Stripe billing.

## Documentation (start here)

| Doc | Purpose |
|-----|---------|
| [docs/PLATFORM_BLUEPRINT.md](docs/PLATFORM_BLUEPRINT.md) | Overall platform memory — requirements, flowcharts, decisions |
| [docs/FUNCTIONAL.md](docs/FUNCTIONAL.md) | Functional / product specification |
| [docs/TECHNICAL.md](docs/TECHNICAL.md) | Technical specification — APIs, data model, env, runbook |
| [memory/INDEX.md](memory/INDEX.md) | Short agent memory map |
| [AGENTS.md](AGENTS.md) | Cursor / agent contract |

## Quick start

### Prerequisites

- MongoDB running (`mongodb://localhost:27017`)
- Node.js + npm
- Python 3.11+ (venv already supported under `backend/.venv`)

### Configure env

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Fill Mongo, JWT, Firebase, Resend, R2 as needed — see docs/TECHNICAL.md
```

### Install

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
# Install requirements; skip private emergentintegrations/litellm if pip fails — unused by app
pip install -r requirements.txt

# Frontend (Next.js — lives in frontend/)
cd ../frontend
npm install
```

### Run

```bash
# Terminal 1 — API (from repo root)
npm run dev
# or: cd backend && npm run dev

# Terminal 2 — Web (Next.js)
npm run dev:frontend
# or: cd frontend && npm run dev
```

Equivalent without npm (API): `cd backend && source .venv/bin/activate && uvicorn server:app --reload --host 0.0.0.0 --port 8000`

- App: http://localhost:3000  
- API health: http://localhost:8000/api/health  
- OpenAPI: http://localhost:8000/docs  

### Tests

```bash
cd backend && source .venv/bin/activate
python -m pytest tests/backend_test.py -n 0
```

## Repo layout

```
backend/     FastAPI
frontend/    Next.js (App Router)
docs/        Functional, technical, blueprint
memory/      Compact PRD + index for agents
```

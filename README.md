# E-Gabay STI

Web-based guidance management system with an NLP chatbot for the Guidance and Counseling Office of STI College Sta. Maria, Bulacan.

## Stack

- Web app: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma 7
- Database: Supabase (PostgreSQL)
- Chatbot: Python, FastAPI, scikit-learn (`nlp_service/`)
- Hosting: Vercel (web app), Render (chatbot)

## Run locally

```bash
npm install
npx prisma generate
npm run dev
```

Chatbot service:

```bash
cd nlp_service
pip install -r requirements.txt
python train.py
uvicorn app:app --port 8000
```

## Environment variables

| Name | Purpose |
| --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | Supabase PostgreSQL connection |
| `NLP_SERVICE_URL` | Chatbot service URL (default `http://localhost:8000`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Sign-in codes and email notifications |
| `COUNSELOR_EMAILS` | Emails that become Guidance Associate accounts on first sign-in |
| `NEXT_PUBLIC_DEMO_LOGIN` | Set to `false` to hide the demo sign-in buttons |

## Tests

```bash
npm test
```

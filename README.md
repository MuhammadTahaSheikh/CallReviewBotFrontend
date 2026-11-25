# Call Review Bot — Frontend

Next.js App Router UI for call analysis, Practice Studio, overview, settings, and auth.

API routes are colocated in this Next.js app (standard App Router). Server schema, n8n workflow, and integration samples also live in the backend repo:

https://github.com/MuhammadTahaSheikh/CallReviewBotBackend

## Setup

1. Copy `.env.example` → `.env` (Supabase + xAI + webhook secret)
2. `npm install`
3. `npx prisma db push`
4. `npm run dev` → http://localhost:3000

Sign up with the same email as `ADMIN_EMAIL` for admin access.

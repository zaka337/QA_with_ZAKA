# QA with Zaka

A full-stack learning platform for QA automation. Four structured courses (Python, Selenium, Playwright and Appium), a student dashboard with progress tracking, a distraction-free lesson player, paid access through Stripe, and an admin area.

**Live:** https://qa-with-zaka-4pc9.vercel.app/

## What it does

- **Courses:** 4 courses, 24 modules and 80 lessons. Course content is written as JSON in `content/courses/` and loaded through an admin import tool, so adding a course needs no code change.
- **Students:** sign-up, login and password reset; a dashboard with live progress bars; "Cinema Mode", a distraction-free lesson player; account settings.
- **Free first module, paid access after:** every course opens with a free module. Stripe Checkout (lifetime or monthly plan) runs through Supabase Edge Functions, and a webhook verifies Stripe's signature before setting the student's plan and enrolling them. The paywall is enforced in the database (a view hides paid lesson content from anyone without access), not only in the interface.
- **Admin:** manage students and enrolments, import courses, and review an audit log of admin actions.
- **AI assistant:** a chat assistant served by an Edge Function and a hosted language model, which knows the site and the course catalogue.
- **Quality checks:** lint, unit tests and a production build run on every push (GitHub Actions).

## Tech stack

| Area | Tools |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, GSAP, Framer Motion, React Router |
| Backend | Supabase: Auth, Postgres, Edge Functions |
| Payments | Stripe Checkout and webhooks |
| AI | Hosted language model through the `chat` Edge Function |
| Quality and hosting | Vitest, ESLint, GitHub Actions, Vercel |

## Project layout

```text
src/                     the React app
content/courses/         course content as JSON
supabase/functions/      Edge Functions: chat, create-checkout-session, get-video-url, stripe-webhook
supabase_*.sql           database changes applied to the Supabase project (see "Database")
.github/workflows/       CI (lint, test, build) and a Supabase keep-alive job
```

## Run it locally

You need Node 20 or newer, a Supabase project and a Stripe account (test mode is fine).

```bash
npm install
npm run dev
```

Create `.env.local` in the project root (it is git-ignored):

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_MONTHLY_PRICE_ID=
VITE_STRIPE_LIFETIME_PRICE_ID=
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
```

The Edge Functions read their secrets from the Supabase project (`supabase secrets set ...`), never from the repository:

| Secret | Used by |
|---|---|
| `STRIPE_SECRET_KEY` | `create-checkout-session`, `stripe-webhook` |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` |
| `SUPABASE_SERVICE_ROLE_KEY` | `stripe-webhook`, `get-video-url` |
| `GROQ_API_KEY` (and optionally `GEMINI_API_KEY`, `OPENAI_API_KEY`) | `chat` |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided to Edge Functions by Supabase itself.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm test` | Run the unit tests once (`npm run test:watch` to watch) |

## Database

The `supabase_*.sql` files at the repository root are the changes applied to the Supabase project: the student-access model, the secure lesson-content view behind the paywall, the admin audit log and a few fixes. They are meant to be run in the Supabase SQL editor.

A full export of the base schema (tables such as profiles, courses and enrollments) is not in this repository yet, so a brand-new Supabase project cannot be recreated from the files here alone. Exporting it as migrations (`supabase db dump`) is the next step.

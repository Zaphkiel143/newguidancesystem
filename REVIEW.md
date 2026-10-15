# E-Gabay redesign copy — review notes

This folder is a **separate copy** of the E-Gabay project for review. Nothing
here is pushed: the `original` remote's push URL is set to `DISABLED`, and the
app uses a **local** PostgreSQL database, never the Supabase one.

## Run it

```bash
node scripts/local-db.mjs start    # local PostgreSQL on localhost:54329
npx prisma db push                 # create/update tables (local DB only)
node scripts/seed-local.mjs        # sample students, sessions, events… (once)
npx next dev -p 3001               # http://localhost:3001
```

Sign in with the **Continue as …** demo links on the login page. The E-Gabay
chatbot also needs the Python service from `nlp_service/` on port 8000.

Stop the database with `node scripts/local-db.mjs stop`. Its files live in
`%LOCALAPPDATA%\egabay-review-db` (outside the repo).

The original Supabase settings are kept in `.env.supabase-backup` (git-ignored).
**Do not** point this copy at that database without first running the schema
changes there on purpose: `prisma db push` adds tables and columns.

## What was added (manuscript Chapter 1 gaps)

| Manuscript feature | Where |
| --- | --- |
| Email notifications (booked → Guidance Associate; confirmed / rescheduled / cancelled → whoever booked) | `lib/email.ts`; SMTP via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Without `SMTP_HOST`, emails are only recorded in the `EmailLog` table (status `LOGGED`). |
| Events module | Counselor: **Events**. Everyone else: **Announcements & Events** |
| Information Service board, with "seen by" | Counselor: **Information Service**. Others: **Announcements & Events** |
| Needs assessment forms with automatic tallying | Counselor: **Group Guidance**. Students: **Needs Assessment** |
| Group session attendance and outcomes | Counselor: **Group Guidance → Record attendance** |
| Career plan: per-stage activity notes, facilitator | Counselor: **Career Guidance** |
| Students view their own career plan | Student: **My Career Plan** |
| Students refer themselves and track their referrals | Student: **Refer a Student** (choose "Myself"), **My Referrals** |
| Parents see their child's career plan progress | Parent: **Child Profile** |
| Individual Inventory stored in the database, editable | Counselor: **Individual Inventory** (new `StudentProfile` table) |
| Students submit documents (excuse letters, medical certificates…) | Student: **Profile** |
| Single-entry session logging + GCO Daily Log | Session notes in **Appointments** appear in **Daily Log** and on the student record |

## Privacy / access fixes

- Every server action now checks the signed-in user's role and takes the
  user's name from the session. Previously each role used a hardcoded name
  (every student account saw "Nhel Belarmino"'s data) and actions had no checks.
- Parents are linked to children through `StudentProfile.parentName`; they can
  only book for, and view, their own linked children. Counselor notes and family
  background are never sent to parents.
- Cancelling an appointment now keeps the record (status `CANCELLED`) instead
  of deleting it, so the history and the cancellation email are preserved.

## Still open

- **Career Planning Program stage names** are still the generic ones in
  `app/config/careerSteps.ts`. The manuscript describes STI's program
  ("Career Planning Survey" in Grade 11 … "Career Mapping" in Grade 12) but
  doesn't list all six names. Put the real names there.
- **College Career Planning Form** isn't built: its fields aren't described in
  the manuscript.
- Records are still linked to students **by name** (as the manuscript states).
  Renaming a student in the inventory doesn't update older records.
- Calendar dates are stored as UTC midnight and are now always displayed in
  UTC, so they read correctly on any computer's time zone.

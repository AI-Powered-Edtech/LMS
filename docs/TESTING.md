# EduSync LMS — Testing Guide

## Test Accounts

The following accounts exist in the shared dev Supabase project (tenant: `EduSync Dev`, ID `00000000-0000-0000-0000-00000000000d`):

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev`   | `password123` | ADMIN   |

## Known Limitation: .test TLD Emails

Accounts with `.test` TLD (e.g., `guru.mat@smanusantara1.test`) fail login due to GoTrue email validation. Do not use `.test` TLD for test accounts. Use `.dev` or real-domain emails.

Affected accounts (login FAILS, infra limitation, not a code bug):

- `guru.mat@smanusantara1.test`
- `siswa.andi@smanusantara1.test`
- `siswa.budi@smanusantara1.test`
- `tutor.mandiri@gmail.test`

## Known Limitation: `agent-browser` Click Simulation

When running automated QA via `agent-browser` CLI, standard click simulations sometimes fail on interactive React components (especially those using Framer Motion's `AnimatePresence` or complex portal structures).

- **Workaround:** If `agent-browser click @ref` fails, it may be an artifact of the simulation, not an actual bug in the app. Fall back to testing standard browser usage, or instruct the agent to use `element.click()` in JS.
- Defensive coding (e.g., adding `type="button"` and managing `pointerEvents: 'none'` during exit animations) helps mitigate this, but absolute compatibility with generic DOM click simulators is not guaranteed.

## Running the App for Testing

# EduSync LMS

EduSync is a modern, modular Learning Management System built with a **Database-Centric Architecture** using React and Supabase.

## Architecture

EduSync operates strictly without a traditional backend server (like Node/Express). Instead, it uses a **4-layer serverless architecture**:

1. **Database Layer (Supabase PostgreSQL):** The core system where all data (users, classes, grades, progress) resides. Security is managed natively via Row Level Security (RLS).
2. **Service Layer (Supabase Client SDK):** The frontend React application interacts directly with the database using the `@supabase/supabase-js` SDK. Complex operations use PostgreSQL RPCs.
3. **Logic Layer (Supabase Edge Functions):** Deno-based serverless functions for operations that require secrets or heavy processing (e.g., sending emails, AI tutoring, grading validation, certificate generation).
4. **Presentation Layer (React + Vite):** A fast, responsive frontend application styled with Tailwind CSS and Framer Motion for smooth interactions.

## Key Features
- **Role-Based Access:** Native support for Student, Teacher, and Admin roles.
- **Real-time Synchronization:** Built-in Supabase Realtime for instant notifications and live updates.
- **AI-Powered:** Integrated AI tutor via Gemini API running securely on Edge Functions.
- **Rich Learning Lifecycle:** Complete modules, submit assignments, track progress, earn XP and badges.

## Run Locally

**Prerequisites:** Node.js (v18+)

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables template:
   ```bash
   cp .env.example .env.local
   ```
4. Configure your environment variables in `.env.local`:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
5. Run the app:
   ```bash
   npm run dev
   ```

## Documentation

- [Domain Map](./DOMAIN_MAP.md): Overview of architectural domains.
- [Feature Map](./FEATURE_MAP.md): Complete feature inventory across all domains.
- [Database Architecture](../DATABASE_ARCHITECTURE.md): Entity-relationship map and table definitions.
- [System Map](../SYSTEM_MAP.md): Module-by-module table/RPC/RLS/EdgeFunction reference.
- [User Flow](../USERFLOW.md): Step-by-step learning life cycles.
- [Engineering Roadmap](../ENGINEERING_ROADMAP.md): Project phases and implementation plan.

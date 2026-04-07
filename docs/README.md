# EduSync LMS — Documentation Hub

Welcome to the central documentation hub for EduSync LMS. This directory contains detailed guides, architecture blueprints, and references to help you build, test, and deploy the platform.

---

## 🚀 Getting Started

If you are new to the project, start here:

- **[Setup Guide](SETUP_GUIDE.md)**: End-to-end local environment setup (Supabase + React).
- **[Developer Runbook](DEVELOPER_RUNBOOK.md)**: Daily developer workflows, scripts, and debugging tips.
- **[Testing Guide](TESTING.md)**: Guide on writing and running Unit and E2E tests.
- **[Deployment](DEPLOYMENT.md)**: Production deployment instructions & checklist.
- **[Environments](environments.md)**: Details on dev, staging, and prod configurations.
- **[Upgrade Guide](upgrade-guide.md)**: Instructions for handling major version bumps and migrations.

---

## 🏗 Architecture & Core Concepts

Understand how EduSync is built and how its pieces fit together:

- **[System Architecture](ARCHITECTURE.md)**: High-level overview of the tech stack and module structure.
- **[Database Architecture](DATABASE_ARCHITECTURE.md)**: Deep dive into the PostgreSQL/Supabase database design.
- **[Tenant Architecture](TENANT_ARCHITECTURE.md)**: How multi-tenancy and data isolation work.
- **[Architecture Decisions (ADRs)](adr/)**: Historical records of major technical decisions.
- **[Domain Maps & Diagrams](architecture/)**: Detailed architectural diagrams and blueprints.

---

## 🗄 Database & Schema

Everything related to data storage and structure:

- **[Schema ERD](schema-erd.md)**: Entity-Relationship Diagram of the database.
- **[RLS Policies](RLS_POLICIES.md)**: Detailed breakdown of Row-Level Security policies.
- **[Quiz Schema Map](QUIZ_SCHEMA_MAP.md)**: Specific schema details for the quiz engine.

---

## 🔐 Security & Authentication

Protecting tenant data and managing access:

- **[Security Overview](SECURITY.md)**: Core security principles and mitigations.
- **[Auth Flow](AUTH.md)**: How authentication works with Supabase Auth.
- **[Auth Setup Guide](AUTH_SETUP_GUIDE.md)**: Initial configuration for SSO and providers.
- **[RBAC Matrix](rbac-matrix.md)**: Role-Based Access Control mapping for all features.

---

## 🎨 UI, UX & Components

Building the frontend interface:

- **[Design System](design-system.md)**: Core design principles, colors, and typography.
- **[Component Registry](COMPONENT_REGISTRY.md)**: Detailed tracking of component state and usage.
- **[UX Resources](ux/)**: Blueprints, screen specs, and user flows.

---

## 🧩 Features & Domains

Detailed documentation for specific product domains:

- **[Feature Matrix](FEATURE_MATRIX.md)**: Matrix of features available per user role.
- **[Analytics](ANALYTICS.md)**: How tracking, metrics, and dashboards work.
- **[Gamification](GAMIFICATION.md)**: XP, leaderboards, and engagement mechanics.
- **[User Flows](USERFLOW.md)**: Key user journeys through the application.
- **[Feature Deep Dives](features/)**: Directory containing docs for each of the 49 feature modules.
- **[Product Requirements (PRDs)](prd/)**: Directory of original feature specifications.

---

## 📁 Archives & Reports

Historical documents and point-in-time assessments:

- **[Reports & Audits](reports/)**: Performance, security, and benchmark reports.
- **[AI Guidelines](ai/)**: Prompts and memory logs for AI agents.
- **[Archived Docs](archive/)**: Deprecated or legacy documentation.

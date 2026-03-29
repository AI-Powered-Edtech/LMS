# EduSync LMS — System Map

> **Single Source of Truth** for all AI agents (executor/reviewer) to ensure consistent architecture and prevent collisions.
>
> This document maps all 9 core modules with their database schemas, RPCs, RLS policies, Edge Functions, service patterns, and event-driven triggers.
>
> **Principles:** Follows the [EduSync Engineering Constitution](./docs/architecture/DOMAIN_MAP.md) — Security, Correctness, Scalability, Maintainability.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Module 1: Auth (Identity)](#module-1-auth-identity)
3. [Module 2: Tenant](#module-2-tenant)
4. [Module 3: Class](#module-3-class)
5. [Module 4: Course](#module-4-course)
6. [Module 5: Lesson](#module-5-lesson)
7. [Module 6: Quiz](#module-6-quiz)
8. [Module 7: Assignment](#module-7-assignment)
9. [Module 8: Gradebook](#module-8-gradebook)
10. [Module 9: Analytics](#module-9-analytics)
11. [AI Tutor System](#ai-tutor-system)
12. [Cross-Module Events](#cross-module-events)
13. [Security Checklist](#security-checklist)
14. [Performance Checklist](#performance-checklist)

---

## Architecture Overview

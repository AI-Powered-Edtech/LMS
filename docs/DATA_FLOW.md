# EduSync LMS — Data Flow Guide

Panduan alur data dan state management di EduSync LMS.

## State Management Architecture

| Layer        | Technology      | Feature Modules             |
| ------------ | --------------- | --------------------------- |
| Server State | React Query v5  | Semua 24 feature modules    |
| Local State  | Zustand v5      | quizzes (quiz player store) |
| URL State    | React Router v7 | Semua route-aware features  |

## Data Flow per Feature

### administration

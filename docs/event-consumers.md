# Event Consumers Architecture

EduSync LMS uses a highly scalable event-driven architecture to process student and teacher activities efficiently without overwhelming the database with queries.

## Concept

Instead of every feature querying the `activity_events` table directly, events flow through a processing pipeline:

# Audit Logging Retention Policy

## Overview

This document outlines the Audit Logging Retention Policy for EduSync LMS. It defines the types of audit logs generated, their retention periods, and the procedures for storage, archiving, and deletion to ensure compliance, security monitoring, and operational integrity.

## Purpose

The purpose of this policy is to:

1. Provide a historical record of system events, user activities, and administrative actions.
2. Support incident investigation, security monitoring, and forensic analysis.
3. Fulfill regulatory and compliance requirements regarding data retention and privacy.

## Scope

This policy applies to all systems, applications, and network infrastructure within the EduSync LMS environment, including:

- Supabase Database Audit Logs (`auth.audit_log_entries`, `pgaudit`)
- Application Access and Error Logs (Sentry, Vercel/Netlify Logs)
- Edge Function Execution Logs
- Infrastructure and Deployment Logs (GitHub Actions, Cloudflare)

## Log Types and Data Elements

### 1. Security and Access Logs

- **Events**: Successful/failed logins, password resets, role changes, multi-factor authentication events.
- **Data Elements**: Timestamp, User ID, IP Address, User-Agent, Event Type, Outcome (Success/Failure).

### 2. Administrative Actions

- **Events**: Changes to system configurations, creation/deletion of tenants, modifications to RBAC policies, API key generation/revocation.
- **Data Elements**: Timestamp, Admin ID, Action Performed, Target Resource, Previous State, New State.

### 3. Application and Error Logs

- **Events**: Unhandled exceptions, failed API requests, critical application errors, rate-limiting triggers.
- **Data Elements**: Timestamp, Error Message, Stack Trace, Request URL, Request Headers (sanitized).

### 4. Database Activity Logs

- **Events**: Data modifications (INSERT, UPDATE, DELETE) on sensitive tables, execution of critical RPCs, schema changes.
- **Data Elements**: Timestamp, Query Executed, Database User, Connection IP.

## Retention Periods

| Log Category                     | Active Storage (Hot) | Archival Storage (Cold) | Total Retention Period |
| :------------------------------- | :------------------- | :---------------------- | :--------------------- |
| Security and Access Logs         | 90 Days              | 1 Year                  | 1 Year + 90 Days       |
| Administrative Actions           | 180 Days             | 3 Years                 | 3 Years + 180 Days     |
| Application and Error Logs       | 30 Days              | 90 Days                 | 120 Days               |
| Database Activity Logs (pgaudit) | 90 Days              | 1 Year                  | 1 Year + 90 Days       |

- **Active Storage (Hot)**: Logs are immediately searchable and accessible via logging dashboards (e.g., Supabase Log Explorer, Sentry).
- **Archival Storage (Cold)**: Logs are moved to secure, long-term storage (e.g., AWS S3 Glacier, Supabase Storage with lifecycle rules) for compliance purposes. Retrieval may take up to 24 hours.

## Storage and Security

1. **Encryption**: All audit logs must be encrypted at rest (AES-256) and in transit (TLS 1.2+).
2. **Immutability**: Archival storage must be configured as Write-Once-Read-Many (WORM) to prevent tampering or accidental deletion.
3. **Access Control**: Access to audit logs is strictly limited to authorized personnel (Security Team, DevOps/SRE, and designated Administrators) based on the principle of least privilege.
4. **Data Sanitization**: Sensitive information (e.g., passwords, session tokens, PII) must be scrubbed or masked before logs are written to storage.

## Archiving and Deletion Procedure

1. **Automated Archiving**: Logs exceeding the active storage duration are automatically exported and transferred to cold storage.
2. **Automated Deletion**: Upon reaching the end of the total retention period, logs in cold storage are securely and permanently deleted via automated lifecycle policies.
3. **Legal Hold**: In the event of a legal investigation or security incident, the retention period for relevant logs may be suspended (Legal Hold). These logs will be retained until the hold is officially lifted.

## Review and Compliance

- This policy will be reviewed annually by the Security Team to ensure alignment with current regulations (e.g., GDPR, FERPA, COPPA) and business requirements.
- Periodic audits will be conducted to verify adherence to this policy and the integrity of the logging infrastructure.

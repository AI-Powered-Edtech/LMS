# Secret Rotation SOP

## Purpose

This Standard Operating Procedure (SOP) defines the process for safely rotating secrets, credentials, and API keys used in the EduSync LMS environment. Proper secret rotation minimizes the risk of unauthorized access due to compromised credentials.

## Scope

This SOP covers the following secrets:

- Supabase Project DB Passwords
- Supabase JWT Secrets
- Supabase Service Role Keys
- Vercel/Netlify Deployment Tokens
- LTI 1.3 RSA Key Pairs
- Third-party API Keys (e.g., OpenAI, SendGrid)

## Rotation Frequency

- **Routine Rotation**: Every 90 days for non-production environments; every 180 days for production environments.
- **Emergency Rotation**: Immediately upon suspected or confirmed compromise.

## Procedure: Routine Secret Rotation

### Step 1: Preparation

1. Schedule a maintenance window if downtime is expected (though zero-downtime rotation should be the goal).
2. Notify the engineering team and relevant stakeholders about the upcoming rotation.
3. Ensure you have access to the Supabase Dashboard, the deployment platform (Vercel/Netlify), and the GitHub repository secrets.

### Step 2: Generate New Secrets

1. Generate the new secret using a cryptographically secure method (e.g., `openssl rand -base64 32`).
2. For asymmetric keys (like LTI RSA Keys), generate a new key pair.
   ```bash
   openssl genrsa -out private.pem 2048
   openssl rsa -in private.pem -pubout -out public.pem
   ```

### Step 3: Deploy New Secrets (Zero-Downtime Approach)

1. **Application Layer**: Update the environment variables in the deployment platform (Vercel/Netlify) with the new secret.
   - If the system supports multiple active secrets (e.g., JWT signing with multiple valid keys), add the new secret alongside the old one.
2. **Infrastructure Layer**: Trigger a new deployment to ensure the application starts using the new secret for any _new_ operations.

### Step 4: Decommission Old Secrets

1. Wait for the TTL (Time to Live) of any short-lived tokens generated using the old secret to expire.
2. Remove the old secret from the deployment platform's environment variables.
3. For Supabase DB passwords, update the password in the database settings and update connection strings in the deployment platform simultaneously.
4. Verify that the application continues to function normally.

### Step 5: Verification and Audit

1. Run the E2E test suite (`pnpm test:e2e`) to ensure all critical paths (login, database queries, integrations) are working.
2. Monitor application logs and error trackers (Sentry) for any authentication or connection errors.

## Procedure: Emergency Secret Rotation

1. **Identify the Scope**: Determine which secrets were compromised and which systems are affected.
2. **Revoke Immediately**: Invalidate the compromised secret in the issuing platform (e.g., revoke the API key in the provider's dashboard).
3. **Generate and Deploy**: Follow Steps 2 and 3 from the Routine Rotation procedure to deploy the new secrets as quickly as possible.
4. **Audit Logs**: Review audit logs and access logs to determine if the compromised secret was used maliciously.
5. **Post-Mortem**: Conduct an incident review to understand how the secret was compromised and improve preventative measures.

## Roles and Responsibilities

- **DevOps/SRE**: Responsible for executing the rotation and updating infrastructure configurations.
- **Security Team**: Responsible for defining rotation policies and investigating suspected compromises.
- **Engineering Leads**: Responsible for verifying application stability post-rotation.

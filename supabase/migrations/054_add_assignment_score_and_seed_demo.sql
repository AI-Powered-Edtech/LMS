-- Fix missing score column
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS score numeric;

-- Insert Seed Data for Demo Account
-- We will create a robust script to insert demo data into a specific tenant "00000000-0000-0000-0000-000000000000" or similar, 
-- but we need actual auth users. Since we can't easily insert auth.users with passwords securely via SQL, 
-- we might want to do it via a seed.ts script or just rely on the user to create the account and we attach data to it.
-- Let's check how they do seeds.

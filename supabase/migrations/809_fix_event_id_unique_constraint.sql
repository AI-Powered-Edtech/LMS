-- Fix: event_id needs UNIQUE constraint for ON CONFLICT (event_id) DO NOTHING
-- Root cause: migration 808 used ON CONFLICT (event_id) but never created the unique index

-- First make event_id NOT NULL (every event must have a client-generated UUID)
ALTER TABLE learning_events ALTER COLUMN event_id SET NOT NULL;

-- Add unique constraint
ALTER TABLE learning_events ADD CONSTRAINT learning_events_event_id_key UNIQUE (event_id);

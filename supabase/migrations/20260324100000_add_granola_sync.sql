-- Add Granola sync columns to meetings table
ALTER TABLE public.meetings
  ADD COLUMN transcript text,
  ADD COLUMN source text NOT NULL DEFAULT 'manual';

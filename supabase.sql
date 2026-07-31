-- Supabase schema for storing graph expressions
-- Table: public.saved_graphs
CREATE TABLE IF NOT EXISTS public.saved_graphs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
  expression text NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.saved_graphs ENABLE ROW LEVEL SECURITY;

-- Public policies (for testing/demo purposes)
-- Allow anyone to SELECT rows
CREATE POLICY "public_select" ON public.saved_graphs
  FOR SELECT USING (true);
-- Allow anyone to INSERT rows
CREATE POLICY "public_insert" ON public.saved_graphs
  FOR INSERT WITH CHECK (true);

-- (Optional) Grant anon role access if not already granted
GRANT SELECT, INSERT ON public.saved_graphs TO anon;

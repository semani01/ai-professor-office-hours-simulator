import { createClient } from '@supabase/supabase-js';

// Anon key is safe to expose in the browser — Supabase RLS enforces data isolation
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

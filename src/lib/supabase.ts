import { createClient, SupabaseClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://bmnanpiftycofegguifp.supabase.co';
const fallbackKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtbmFucGlmdHljb2ZlZ2d1aWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1OTMzNjEsImV4cCI6MjEwODE2OTM2MX0.jvRueDaw8ZSfm8RJckk-VV65lUwbJ1FEX1cFGlfZJtc';

const rawUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(rawUrl && rawKey);

const supabaseUrl = rawUrl || fallbackUrl;
const supabaseKey = rawKey || fallbackKey;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});





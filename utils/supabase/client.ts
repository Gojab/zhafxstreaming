import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://bmnanpiftycofegguifp.supabase.co';

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtbmFucGlmdHljb2ZlZ2d1aWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1OTMzNjEsImV4cCI6MjEwODE2OTM2MX0.jvRueDaw8ZSfm8RJckk-VV65lUwbJ1FEX1cFGlfZJtc';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

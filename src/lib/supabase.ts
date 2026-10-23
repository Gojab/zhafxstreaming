import { createClient, SupabaseClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://xjyzfunqiazlayivjsxj.supabase.co';
const fallbackKey = 'sb_publishable_l3QQ3rkxCcKEcXfhDgEweA_Ar5lEZ6K';

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





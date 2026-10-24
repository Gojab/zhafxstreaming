import { createClient, SupabaseClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://xjyzfunqiazlayivjsxj.supabase.co';
const fallbackKey = 'sb_publishable_l3QQ3rkxCcKEcXfhDgEweA_Ar5lEZ6K';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' ? process.env : {}) as any;

const rawUrl =
  env.VITE_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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





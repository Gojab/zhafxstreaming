import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://xjyzfunqiazlayivjsxj.supabase.co';

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_l3QQ3rkxCcKEcXfhDgEweA_Ar5lEZ6K';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

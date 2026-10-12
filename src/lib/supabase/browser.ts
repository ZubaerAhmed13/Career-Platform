import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from '@/lib/config';
export function browserSupabase(){const {url,key}=supabaseConfig();return createBrowserClient(url,key)}

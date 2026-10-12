import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseConfig } from '@/lib/config';

type CookieUpdate = { name: string; value: string; options: CookieOptions };

export async function serverSupabase() {
  const { url, key } = supabaseConfig();
  const store = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(items: CookieUpdate[]) {
        try {
          items.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot set cookies. The middleware refreshes them.
        }
      },
    },
  });
}

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseConfig } from '@/lib/config';

type CookieUpdate = { name: string; value: string; options: CookieOptions };

export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Do not invent a session when project environment variables are missing.
  let config: ReturnType<typeof supabaseConfig>;
  try {
    config = supabaseConfig();
  } catch {
    return response;
  }

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(items: CookieUpdate[]) {
        // Make refreshed tokens visible to the remainder of this request.
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        // And return them to the browser for its next request.
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

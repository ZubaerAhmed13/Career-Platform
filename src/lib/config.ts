export const brand = {
  name: 'CareerOS AI',
  tagline: 'A clearer path to your next opportunity',
} as const;

/**
 * The Supabase publishable key is safe for client usage, but RLS must be applied
 * and tested. A service-role/secret key must never be placed here.
 */
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase URL and publishable key must be configured');
  }
  return { url, key };
}

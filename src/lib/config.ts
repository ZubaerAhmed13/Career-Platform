export const brand = { name: 'CareerOS AI', tagline: 'A clearer path to your next opportunity' } as const;
export function supabaseConfig(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key) throw new Error('Supabase environment configuration is missing');return {url,key};}

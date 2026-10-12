import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseConfig } from '@/lib/config';
export async function serverSupabase(){const {url,key}=supabaseConfig();const store=await cookies();return createServerClient(url,key,{cookies:{getAll(){return store.getAll()},setAll(items){try{items.forEach(({name,value,options})=>store.set(name,value,options))}catch{/* Read-only Server Component; middleware refreshes cookies. */}}}})}

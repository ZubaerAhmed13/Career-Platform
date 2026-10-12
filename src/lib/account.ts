import 'server-only';import {redirect} from 'next/navigation';
import {serverSupabase} from '@/lib/supabase/server';import type {Profile} from '@/lib/profile';
export async function requireAccount(){const supabase=await serverSupabase();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect('/login');return {user,supabase};}
export async function getProfile(){const {user,supabase}=await requireAccount();const {data,error}=await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle();if(error)throw new Error('Unable to load your profile.');return {user,profile:data as Profile|null};}

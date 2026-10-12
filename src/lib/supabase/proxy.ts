import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseConfig } from '@/lib/config';
export async function refreshSession(request:NextRequest){let response=NextResponse.next({request});let config;try{config=supabaseConfig()}catch{return response}const supabase=createServerClient(config.url,config.key,{cookies:{getAll(){return request.cookies.getAll()},setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});await supabase.auth.getUser();return response}

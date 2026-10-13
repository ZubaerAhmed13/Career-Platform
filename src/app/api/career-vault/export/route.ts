import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/supabase/server';

export const dynamic='force-dynamic';

export async function GET(){
 const supabase=await serverSupabase();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return NextResponse.json({error:'Authentication required'},{status:401,headers:{'Cache-Control':'no-store'}});
 const tableNames=[
   'career_records','career_evidence','career_evidence_links','career_links',
   'career_suggestions','career_interview_sessions','career_interview_messages','career_events',
 ] as const;
 const vault:Record<string,unknown[]>={};
 for(const table of tableNames){
   const entries:unknown[]=[];
   for(let start=0;start<20000;start+=500){
     const {data,error}=await supabase.from(table).select('*').eq('user_id',user.id)
       .order('created_at',{ascending:true}).range(start,start+499);
     if(error)return NextResponse.json({error:'Career export could not be completed.'},{status:500,headers:{'Cache-Control':'no-store'}});
     entries.push(...(data??[]));
     if((data??[]).length<500)break;
     if(start===19500)return NextResponse.json({error:'Export exceeds the current maximum; contact support for a full export.'},{status:413,headers:{'Cache-Control':'no-store'}});
   }
   vault[table]=entries;
 }
 // Never include auth tokens, credential information, model API keys or other users' records.
 const payload={format:'CareerOS-CareerVault-v1',exported_at:new Date().toISOString(),vault};
 return new Response(JSON.stringify(payload,null,2),{
  status:200,
  headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Content-Disposition':'attachment; filename="careeros-career-vault.json"',
    'Cache-Control':'private, no-store, max-age=0',
    'X-Content-Type-Options':'nosniff',
  },
 });
}

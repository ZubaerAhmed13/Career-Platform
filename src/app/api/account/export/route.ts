import {NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/supabase/server';

export const dynamic='force-dynamic';

/** Owner-scoped profile + Career Vault data portability.
 * Does not claim to export Auth secrets, provider logs or backup copies.
 */
export async function GET(){
 const supabase=await serverSupabase();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return NextResponse.json({error:'Authentication required'},{
  status:401,headers:{'Cache-Control':'no-store'},
 });
 const tables=[
  'profiles','file_metadata','career_records','career_evidence',
  'career_evidence_links','career_links','career_suggestions',
  'career_interview_sessions','career_interview_messages','career_events',
  'resumes','resume_versions',
 ] as const;
 const personalData:Record<string,unknown[]>={};
 for(const table of tables){
  const entries:unknown[]=[];
  for(let start=0;start<20000;start+=500){
   const {data,error}=await supabase.from(table).select('*')
    .eq(table==='profiles'?'id':'user_id',user.id)
    .order('created_at',{ascending:true}).order('id',{ascending:true}).range(start,start+499);
   if(error)return NextResponse.json({error:'Could not export all requested account data. No partial archive was returned.'},{
    status:500,headers:{'Cache-Control':'no-store'},
   });
   entries.push(...(data??[]));
   if((data??[]).length<500)break;
   if(start===19500){
    // A full final page may be exactly 20,000 rows; test for overflow instead
    // of rejecting a complete archive at the boundary.
    const tail=await supabase.from(table).select('id').eq(table==='profiles'?'id':'user_id',user.id)
     .order('created_at',{ascending:true}).order('id',{ascending:true}).range(20000,20000);
    if(tail.error)return NextResponse.json({error:'Could not verify the complete account export.'},{
     status:500,headers:{'Cache-Control':'no-store'},
    });
    if((tail.data??[]).length>0)return NextResponse.json({error:'Export is too large for this endpoint. Request assistance with a complete export.'},{
     status:413,headers:{'Cache-Control':'no-store'},
    });
   }
  }
  personalData[table]=entries;
 }
 const payload={
  format:'CareerOS-Account-v1',
  exported_at:new Date().toISOString(),
  scope_note:'Self-service export of profile, Career Vault, resume drafts and immutable resume versions. Auth passwords, sessions, service credentials, backend logs, backups and internal AI quota metrics are not in this archive.',
  account:{id:user.id,email:user.email??null,created_at:user.created_at},
  tables:personalData,
 };
 return new Response(JSON.stringify(payload,null,2),{
  status:200,headers:{
   'Content-Type':'application/json; charset=utf-8',
   'Content-Disposition':'attachment; filename="careeros-account-data.json"',
   'Cache-Control':'private, no-store, max-age=0',
   'X-Content-Type-Options':'nosniff',
  },
 });
}

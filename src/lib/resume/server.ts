import 'server-only';
import {requireAccount} from '@/lib/account';
import {resumeDocSchema, type ResumeRow, type ResumeVersion} from './schema';

export async function listMyResumes():Promise<ResumeRow[]>{
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('resumes').select('*').eq('user_id',user.id)
  .order('updated_at',{ascending:false}).limit(200);
 if(error)throw new Error('Resume Studio database is unavailable. The Step 3 migration may be pending.');
 return (data??[]).map(row=>({...row,draft_content:resumeDocSchema.parse(row.draft_content)})) as ResumeRow[];
}
export async function loadMyResume(id:string):Promise<ResumeRow|null>{
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('resumes').select('*').eq('user_id',user.id).eq('id',id).maybeSingle();
 if(error)throw new Error('Unable to load this resume.');
 return data?({...data,draft_content:resumeDocSchema.parse(data.draft_content)} as ResumeRow):null;
}
export async function listMyResumeVersions(id:string):Promise<ResumeVersion[]>{
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('resume_versions').select('*').eq('user_id',user.id)
  .eq('resume_id',id).order('version_number',{ascending:false}).limit(100);
 if(error)throw new Error('Unable to load version history.');
 return (data??[]).map(row=>({...row,snapshot_content:resumeDocSchema.parse(row.snapshot_content)})) as ResumeVersion[];
}
export async function listConfirmedVaultRecords(){
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('career_records').select('*').eq('user_id',user.id)
  .eq('status','confirmed').order('updated_at',{ascending:false}).limit(250);
 if(error)throw new Error('Unable to load confirmed career records.');
 return data??[];
}

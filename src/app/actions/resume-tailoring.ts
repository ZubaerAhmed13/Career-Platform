'use server';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireAccount} from '@/lib/account';
import {emptyResume,resumeDocSchema} from '@/lib/resume/schema';
import {jobBriefSchema,isValidRevision,type JobBrief} from '@/lib/tailoring/schema';
import {extractRequirements} from '@/lib/tailoring/requirements';

export type TailorResult={ok:true;id?:string;revision?:number;resumeId?:string}|
 {ok:false;error:string;conflict?:boolean};
const uid=z.uuid();
const fail=(error:string,conflict=false):TailorResult=>({ok:false,error,conflict});
function refresh(id?:string){
 revalidatePath('/resume-studio/tailor');
 revalidatePath('/resume-studio');
 if(id)revalidatePath('/resume-studio/tailor/'+id);
}
function values(brief:JobBrief){
 return {
  job_title:brief.jobTitle,employer_name:brief.employerName,job_location:brief.location,
  employment_type:brief.employmentType,job_url:brief.jobUrl,
  original_job_description:brief.originalDescription,private_notes:brief.notes,
  requirements:brief.requirements
 };
}
export async function createTailoringSession(input:{
 jobTitle:string;employerName?:string;location?:string;employmentType?:string;
 jobUrl?:string;originalDescription:string;notes?:string;
}):Promise<TailorResult>{
 const parsed=jobBriefSchema.safeParse({...input,requirements:extractRequirements(input.originalDescription??'')});
 if(!parsed.success)return fail('Enter a genuine job title and at least 40 characters of job text. Check the URL and field limits.');
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('resume_tailoring_sessions')
  .insert({user_id:user.id,...values(parsed.data)}).select('id').single();
 if(error||!data)return fail('Could not save the job brief. Step 4 database migration may still be pending.');
 refresh();return {ok:true,id:data.id};
}
export async function saveTailoringSession(id:string,revision:number,input:JobBrief):Promise<TailorResult>{
 if(!uid.safeParse(id).success||!isValidRevision(revision))return fail('Invalid session or revision.');
 const parsed=jobBriefSchema.safeParse(input);
 if(!parsed.success)return fail('Some requirements or job details are invalid or exceed limits.');
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('resume_tailoring_sessions')
  .update(values(parsed.data)).eq('user_id',user.id).eq('id',id).eq('revision',revision)
  .select('revision').maybeSingle();
 if(error)return fail('Save failed. Your changes remain in the editor.');
 if(!data)return fail('This job brief changed in another tab. Copy your edits and reload before saving.',true);
 refresh(id);return {ok:true,revision:data.revision};
}
export async function deleteTailoringSession(id:string):Promise<TailorResult>{
 if(!uid.safeParse(id).success)return fail('Invalid job brief.');
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('resume_tailoring_sessions').delete().eq('user_id',user.id).eq('id',id)
  .select('id').maybeSingle();
 if(error||!data)return fail('Unable to remove the job brief.');
 refresh();return {ok:true};
}
export async function createTargetedResume(id:string,revision:number,sourceId:string|null,
 versionId:string|null=null):Promise<TailorResult>{
 if(!uid.safeParse(id).success||!isValidRevision(revision)||
  (sourceId!==null&&!uid.safeParse(sourceId).success)||
  (versionId!==null&&(!sourceId||!uid.safeParse(versionId).success)))
  return fail('Invalid source resume or session.');
 const {user,supabase}=await requireAccount();
 const {data:job,error:jobError}=await supabase.from('resume_tailoring_sessions')
  .select('*').eq('user_id',user.id).eq('id',id).maybeSingle();
 if(jobError||!job)return fail('Job brief not found.');
 if(job.revision!==revision)return fail('This session has changed. Reload before making a copy.',true);
 if(job.tailored_resume_id)return fail('A tailored resume already exists for this job. Open it instead.');
 let content=emptyResume(),sourceRevision:number|null=null;
 if(sourceId){
  const {data:source,error}=await supabase.from('resumes').select('*').eq('user_id',user.id).eq('id',sourceId).maybeSingle();
  if(error||!source)return fail('Selected source resume was not found.');
  sourceRevision=source.revision;
  if(versionId){
   const {data:version,error:versionError}=await supabase.from('resume_versions')
    .select('snapshot_content').eq('id',versionId).eq('user_id',user.id).eq('resume_id',sourceId).maybeSingle();
   if(versionError||!version)return fail('Selected source version was not found.');
   const parsed=resumeDocSchema.safeParse(version.snapshot_content);
   if(!parsed.success)return fail('The source version is invalid.');
   content=structuredClone(parsed.data);
  }else{
   const parsed=resumeDocSchema.safeParse(source.draft_content);
   if(!parsed.success)return fail('The source draft is invalid.');
   content=structuredClone(parsed.data);
  }
 }
 const validated=resumeDocSchema.safeParse(content);
 if(!validated.success)return fail('The new resume could not be validated.');
 const label=[job.job_title,job.employer_name].filter(Boolean).join(' — ').slice(0,160);
 const {data:copy,error:copyError}=await supabase.from('resumes').insert({
  user_id:user.id,name:label,focus_label:job.job_title.slice(0,160),
  draft_content:validated.data,template_id:validated.data.settings.template,
  paper_size:validated.data.settings.paper,document_language:validated.data.settings.language,
 }).select('id').single();
 if(copyError||!copy)return fail('Could not create the independent tailored resume.');
 const {data:linked,error:linkError}=await supabase.from('resume_tailoring_sessions')
  .update({source_resume_id:sourceId,source_resume_revision:sourceRevision,
   source_snapshot:validated.data,tailored_resume_id:copy.id})
  .eq('id',id).eq('user_id',user.id).eq('revision',revision)
  .is('tailored_resume_id',null).select('revision').maybeSingle();
 if(linkError||!linked){
  await supabase.from('resumes').delete().eq('user_id',user.id).eq('id',copy.id);
  return fail('A concurrent edit interrupted linking. Reload before trying again.',true);
 }
 refresh(id);return {ok:true,resumeId:copy.id,revision:linked.revision};
}

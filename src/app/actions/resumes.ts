'use server';
import {revalidatePath} from 'next/cache';
import {requireAccount} from '@/lib/account';
import {resumeDocSchema,emptyResume, type ResumeDoc, type ResumeRow, type ResumeVersion, type ResumeEntry} from '@/lib/resume/schema';
import {z} from 'zod';

const uid=z.uuid();
const metadata=z.object({name:z.string().trim().min(1).max(160),
 focus:z.string().trim().max(160).default('')});
export type ResumeResult={ok:true;id?:string;revision?:number;version?:number;versionId?:string}|{ok:false;error:string;conflict?:boolean};
const fail=(error:string,conflict=false):ResumeResult=>({ok:false,error,conflict});
const refresh=()=>{revalidatePath('/resume-studio');revalidatePath('/dashboard');};
export async function createResume(input:{name:string;focus?:string;template?:ResumeDoc['settings']['template'];paper?:ResumeDoc['settings']['paper']}):Promise<ResumeResult>{
 const meta=metadata.safeParse(input);
 if(!meta.success)return fail('Enter a resume name of at most 160 characters.');
 const doc=resumeDocSchema.safeParse(emptyResume(input.template,input.paper));
 if(!doc.success)return fail('Invalid resume design settings.');
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('resumes').insert({
  user_id:user.id,name:meta.data.name,focus_label:meta.data.focus,
  draft_content:doc.data,template_id:doc.data.settings.template,
  paper_size:doc.data.settings.paper,document_language:doc.data.settings.language
 }).select('id').single();
 if(error||!data)return fail('Could not create the resume. Check whether the Step 3 migration is applied.');
 refresh();return {ok:true,id:data.id};
}
export async function renameResume(id:string,name:string):Promise<ResumeResult>{
 if(!uid.safeParse(id).success||!metadata.shape.name.safeParse(name).success)return fail('Invalid resume name.');
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('resumes').update({name:name.trim()})
  .eq('id',id).eq('user_id',user.id).select('id').maybeSingle();
 if(error||!data)return fail('Could not rename resume.');
 refresh();return {ok:true};
}
export async function deleteResume(id:string):Promise<ResumeResult>{
 if(!uid.safeParse(id).success)return fail('Invalid document.');
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('resumes').delete().eq('user_id',user.id)
  .eq('id',id).select('id').maybeSingle();
 if(error||!data)return fail('Could not delete this resume.');
 refresh();return {ok:true};
}
export async function duplicateResume(id:string):Promise<ResumeResult>{
 if(!uid.safeParse(id).success)return fail('Invalid document.');
 const {user,supabase}=await requireAccount();
 const {data:source,error:readError}=await supabase.from('resumes').select('*')
  .eq('id',id).eq('user_id',user.id).maybeSingle();
 if(readError||!source)return fail('Original resume was not found.');
 const doc=resumeDocSchema.safeParse(source.draft_content);
 if(!doc.success)return fail('Original draft is invalid.');
 const {data,error}=await supabase.from('resumes').insert({
  user_id:user.id,name:(source.name+' (copy)').slice(0,160),focus_label:source.focus_label,
  draft_content:structuredClone(doc.data),template_id:doc.data.settings.template,
  paper_size:doc.data.settings.paper,document_language:doc.data.settings.language
 }).select('id').single();
 if(error||!data)return fail('Could not duplicate resume.');
 refresh();return {ok:true,id:data.id};
}
function sources(doc:ResumeDoc):ResumeEntry['source'][]{
 return doc.sections.flatMap(s=>s.entries.map(e=>e.source)).filter(Boolean);
}
export async function saveResumeDraft(id:string,revision:number,raw:ResumeDoc):Promise<ResumeResult>{
 if(!uid.safeParse(id).success||!Number.isSafeInteger(revision)||revision<1)return fail('Invalid revision.');
 const parsed=resumeDocSchema.safeParse(raw);
 if(!parsed.success)return fail('Some resume information is invalid or too long. Check contact details, links and entries.');
 const {user,supabase}=await requireAccount();
 const {data:old,error:readError}=await supabase.from('resumes').select('draft_content')
  .eq('user_id',user.id).eq('id',id).maybeSingle();
 if(readError||!old)return fail('Resume no longer exists.');
 const oldDoc=resumeDocSchema.safeParse(old.draft_content);
 if(!oldDoc.success)return fail('Stored draft needs repair before it can be updated.');
 const previousSources=sources(oldDoc.data);
 const incoming=sources(parsed.data);
 const newlyLinked=incoming.filter(s=>!previousSources.some(
  p=>p?.recordId===s?.recordId&&JSON.stringify(p)===JSON.stringify(s)));
 // Never convert arbitrary user text into verified Career Vault provenance.
 if(newlyLinked.length){
  const ids=[...new Set(newlyLinked.map(s=>s!.recordId))];
  const {data:records,error}=await supabase.from('career_records')
   .select('id,revision,status,kind,title,organization,description')
   .eq('user_id',user.id).eq('status','confirmed').in('id',ids).limit(250);
  if(error||records?.length!==ids.length)return fail('Only your confirmed Career Vault records can be linked.');
  for(const s of newlyLinked){
   const record=records.find(r=>r.id===s!.recordId);
   if(!record||record.revision!==s!.revision||record.kind!==s!.kind||
      record.title!==s!.title||record.organization!==s!.organization||
      record.description!==s!.description)return fail('Career Vault source changed. Re-select its latest confirmed version.');
  }
 }
 const doc=parsed.data;
 const {data,error}=await supabase.from('resumes').update({
  draft_content:doc,template_id:doc.settings.template,paper_size:doc.settings.paper,
  document_language:doc.settings.language
 }).eq('id',id).eq('user_id',user.id).eq('revision',revision).select('revision').maybeSingle();
 if(error)return fail('Unable to save draft. Your edits remain in this browser.');
 if(!data)return fail('This resume changed in another tab. Your edits are preserved; compare or reload before saving.',true);
 refresh();return {ok:true,revision:data.revision};
}
export async function createResumeVersion(id:string,revision:number,label:string):Promise<ResumeResult>{
 if(!uid.safeParse(id).success||!Number.isSafeInteger(revision)||revision<1||
    typeof label!=='string'||label.length>120)return fail('Invalid version details.');
 const {supabase}=await requireAccount();
 const {data,error}=await supabase.rpc('create_my_resume_version',{
  p_resume:id,p_label:label.trim(),p_revision:revision
 });
 if(error)return fail('Could not save this version. Ensure draft changes are saved first and retry.');
 const {data:created,error:readError}=await supabase.from('resume_versions').select('id')
  .eq('resume_id',id).eq('version_number',data).maybeSingle();
 if(readError||!created)return fail('Version saved, but its reference could not be loaded. Reload the editor.');
 revalidatePath('/resume-studio/'+id);return {ok:true,version:data as number,versionId:created.id};
}
export async function restoreResumeVersion(id:string,versionId:string,revision:number):Promise<ResumeResult>{
 if(!uid.safeParse(id).success||!uid.safeParse(versionId).success)return fail('Invalid version.');
 const {user,supabase}=await requireAccount();
 const {data:version,error}=await supabase.from('resume_versions').select('snapshot_content')
  .eq('resume_id',id).eq('user_id',user.id).eq('id',versionId).maybeSingle();
 if(error||!version)return fail('Version not found.');
 const doc=resumeDocSchema.safeParse(version.snapshot_content);
 if(!doc.success)return fail('Historical snapshot is invalid.');
 // Restoring does not mutate historical rows. Snapshot sources already belong to this owned resume.
 // Save with revision protection, while source immutability is upheld for existing references.
 const {data:saved,error:saveError}=await supabase.from('resumes').update({
  draft_content:doc.data,template_id:doc.data.settings.template,
  paper_size:doc.data.settings.paper,document_language:doc.data.settings.language
 }).eq('id',id).eq('user_id',user.id).eq('revision',revision).select('revision').maybeSingle();
 if(saveError||!saved)return fail('Current draft was updated in another tab. Reload before restoring.',true);
 refresh();return {ok:true,revision:saved.revision};
}
export async function getResumeVersion(id:string,versionId:string):Promise<ResumeVersion|null>{
 if(!uid.safeParse(id).success||!uid.safeParse(versionId).success)return null;
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('resume_versions').select('*')
  .eq('user_id',user.id).eq('resume_id',id).eq('id',versionId).maybeSingle();
 if(error||!data)return null;
 const parsed=resumeDocSchema.safeParse(data.snapshot_content);
 return parsed.success?{...data,snapshot_content:parsed.data} as ResumeVersion:null;
}

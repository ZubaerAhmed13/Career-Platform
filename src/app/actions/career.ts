'use server';

import { revalidatePath } from 'next/cache';
import { requireAccount } from '@/lib/account';
import { careerKind, evidenceSchema, recordSchema } from '@/lib/career/schema';
import { z } from 'zod';

export type VaultActionState = { message?: string; error?: string };
const uuid = z.uuid();
const relationSchema = z.enum(['uses_skill','supports_achievement','related_project','related_education','related']);

function raw(form: FormData, key: string) { return String(form.get(key) ?? '').trim(); }
function refreshVault(){
 revalidatePath('/career-vault');
 revalidatePath('/career-vault/evidence');
 revalidatePath('/career-vault/review');
 revalidatePath('/dashboard');
}
function readRecord(form:FormData){
 return recordSchema.safeParse({
   kind:raw(form,'kind'), title:raw(form,'title'), organization:raw(form,'organization'),
   location:raw(form,'location'), description:raw(form,'description'),
   started_on:raw(form,'started_on')||null, ended_on:raw(form,'is_current')==='true'?null:(raw(form,'ended_on')||null),
   is_current:raw(form,'is_current')==='true',
   details:raw(form,'proficiency')?{proficiency:raw(form,'proficiency')}: {},
   status:'confirmed',source:'manual',
 });
}
function invalid(){return {error:'Please check the required fields and dates.'};}

export async function saveCareerRecord(_prev: VaultActionState,form:FormData):Promise<VaultActionState>{
 const parsed=readRecord(form);if(!parsed.success)return invalid();
 const id=raw(form,'id'), revision=Number(raw(form,'revision'));
 const {user,supabase}=await requireAccount();
 if(id){
   if(!uuid.safeParse(id).success||!Number.isSafeInteger(revision)||revision<1)return invalid();
   const {data,error}=await supabase.from('career_records')
     .update({...parsed.data,user_id:user.id})
     .eq('user_id',user.id).eq('id',id).eq('revision',revision)
     .select('id').maybeSingle();
   if(error)return {error:'Unable to save the record. Please retry.'};
   if(!data)return {error:'This record was changed in another session or is no longer available. Refresh to review the latest version.'};
 }else{
   const {error}=await supabase.from('career_records').insert({user_id:user.id,...parsed.data});
   if(error)return {error:'Unable to add this record. Check for duplicate or invalid information.'};
 }
 refreshVault();
 return {message:id?'Changes saved.':'Career record added.'};
}

export async function deleteCareerRecord(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 const id=raw(form,'id');
 if(!uuid.safeParse(id).success||form.get('confirm')!=='yes')return {error:'Confirm deletion first.'};
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('career_records').delete().eq('id',id).eq('user_id',user.id).select('id').maybeSingle();
 if(error)return {error:'Could not delete this record. Please try again.'};
 if(!data)return {error:'Record not found or already deleted.'};
 refreshVault();return {message:'Record deleted. Linked references were removed; standalone evidence and unrelated records remain.'};
}

export async function saveCareerEvidence(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 const parsed=evidenceSchema.safeParse({title:raw(form,'title'),evidence_type:raw(form,'evidence_type'),
   excerpt:raw(form,'excerpt'),source_url:raw(form,'source_url')});
 if(!parsed.success)return {error:'Provide a title and a valid source URL when applicable.'};
 const {user,supabase}=await requireAccount();
 const {error}=await supabase.from('career_evidence').insert({user_id:user.id,...parsed.data});
 if(error)return {error:'Could not store supporting evidence.'};
 refreshVault();return {message:'Evidence saved. Attach it to a career record below.'};
}

export async function attachCareerEvidence(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 const record_id=raw(form,'record_id'),evidence_id=raw(form,'evidence_id');
 if(!uuid.safeParse(record_id).success||!uuid.safeParse(evidence_id).success)return invalid();
 const {user,supabase}=await requireAccount();
 const {error}=await supabase.from('career_evidence_links')
   .upsert({user_id:user.id,record_id,evidence_id},{onConflict:'user_id,record_id,evidence_id',ignoreDuplicates:true});
 if(error)return {error:'Unable to link this evidence. Both entries must belong to your account.'};
 refreshVault();return {message:'Evidence linked to career record.'};
}

export async function linkCareerRecords(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 const from_record_id=raw(form,'from_record_id'),to_record_id=raw(form,'to_record_id');
 const relation=relationSchema.safeParse(raw(form,'relation'));
 if(!relation.success||!uuid.safeParse(from_record_id).success||
    !uuid.safeParse(to_record_id).success||from_record_id===to_record_id)return invalid();
 const {user,supabase}=await requireAccount();
 const {error}=await supabase.from('career_links').upsert({
    user_id:user.id,from_record_id,to_record_id,relation:relation.data,
 },{onConflict:'user_id,from_record_id,to_record_id,relation',ignoreDuplicates:true});
 if(error)return {error:'Link failed. Both records must belong to your account.'};
 refreshVault();return {message:'Career relationship saved.'};
}

export async function reviewCareerSuggestion(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 const id=raw(form,'id'),decision=raw(form,'decision');
 if(!uuid.safeParse(id).success||!['approve','reject'].includes(decision))return invalid();
 const {supabase}=await requireAccount();
 if(decision==='approve'){
   const {error}=await supabase.rpc('approve_career_suggestion',{suggestion_id:id});
   if(error)return {error:'Approval could not be completed. The suggestion may have been reviewed already.'};
 }else{
   const {data,error}=await supabase.rpc('reject_career_suggestion',{suggestion_id:id});
   if(error||!data)return {error:'Rejection could not be completed.'};
 }
 refreshVault();return {message:decision==='approve'?'Approved fact added to your Career Vault.':'Suggestion rejected; confirmed facts unchanged.'};
}

export async function removeCareerEvidence(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 const id=raw(form,'id');
 if(!uuid.safeParse(id).success||form.get('confirm')!=='yes')return {error:'Confirm evidence deletion.'};
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('career_evidence').delete().eq('id',id).eq('user_id',user.id).select('id').maybeSingle();
 if(error||!data)return {error:'Unable to delete this evidence.'};
 refreshVault();return {message:'Evidence deleted; linked references removed.'};
}

export async function addResumeTextForReview(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 // Not a parser: keeps verbatim user-supplied material pending explicit review.
 const rawText=raw(form,'resume_text');
 if(rawText.length<20||rawText.length>4000)return {error:'Paste between 20 and 4,000 characters. Do not include passwords or identity numbers.'};
 const label=raw(form,'title').slice(0,180)||'Unreviewed career information';
 const kind=careerKind.safeParse(raw(form,'kind'));
 if(!kind.success)return invalid();
 const {user,supabase}=await requireAccount();
 const {error}=await supabase.from('career_suggestions').insert({
   user_id:user.id,kind:kind.data,title:label,description:rawText,
   evidence_quote:rawText.slice(0,2000),origin:'cv_import',review_status:'pending',
 });
 if(error)return {error:'Unable to save your unreviewed text.'};
 refreshVault();return {message:'Text saved as an unreviewed suggestion. It has not changed confirmed records.'};
}

export async function removeCareerLink(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 const id=raw(form,'id');if(!uuid.safeParse(id).success)return invalid();
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('career_links').delete().eq('id',id).eq('user_id',user.id).select('id').maybeSingle();
 if(error||!data)return {error:'Unable to remove that relationship.'};
 refreshVault();return {message:'Relationship removed; career records are unchanged.'};
}
export async function detachCareerEvidence(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 const id=raw(form,'id');if(!uuid.safeParse(id).success)return invalid();
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('career_evidence_links').delete().eq('id',id).eq('user_id',user.id).select('id').maybeSingle();
 if(error||!data)return {error:'Unable to detach that evidence.'};
 refreshVault();return {message:'Evidence disconnected. The original evidence remains saved.'};
}

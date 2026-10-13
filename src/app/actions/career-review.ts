'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAccount } from '@/lib/account';
import { careerKind, recordSchema } from '@/lib/career/schema';
import type { VaultActionState } from './career';

const uuid=z.uuid();
function str(form:FormData,key:string){return String(form.get(key)??'').trim();}

export async function editSuggestion(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 const id=str(form,'id');
 const kind=careerKind.safeParse(str(form,'kind'));
 const title=str(form,'title'),description=str(form,'description');
 const isCurrent=form.get('is_current')==='yes';
 const started_on=str(form,'started_on')||null;
 const ended_on=isCurrent?null:(str(form,'ended_on')||null);
 const structured=recordSchema.safeParse({
  kind:kind.success?kind.data:'invalid',title,description,
  organization:str(form,'organization'),location:str(form,'location'),
  started_on,ended_on,is_current:isCurrent,
 });
 if(!uuid.safeParse(id).success||!kind.success||!structured.success||description.length>4000)
   return {error:'Check the suggested fact, employer, and start/end dates.'};
 const {supabase}=await requireAccount();
 const {data,error}=await supabase.rpc('edit_career_suggestion_details',{
   suggestion_id:id,proposed_kind:kind.data,proposed_title:title,
   proposed_description:description,proposed_organization:structured.data.organization,
   proposed_location:structured.data.location,proposed_started_on:started_on,
   proposed_ended_on:ended_on,proposed_is_current:isCurrent,
 });
 if(error||!data)return {error:'Unable to change this suggestion. It may already be reviewed.'};
 revalidatePath('/career-vault/review');return {message:'Suggestion updated. Existing records remain unchanged.'};
}

export async function mergeSuggestion(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 const id=str(form,'id'),targetId=str(form,'target_record_id'),revision=Number(str(form,'expected_revision'));
 const mergeTitle=form.get('merge_title')==='yes',mergeDescription=form.get('merge_description')==='yes';
 const mergeOrganization=form.get('merge_organization')==='yes',mergeLocation=form.get('merge_location')==='yes';
 const mergeDates=form.get('merge_dates')==='yes';
 if(!uuid.safeParse(id).success||!uuid.safeParse(targetId).success||
   !Number.isSafeInteger(revision)||revision<1||(!mergeTitle&&!mergeDescription&&!mergeOrganization&&!mergeLocation&&!mergeDates)||
   form.get('confirm_merge')!=='yes')return {error:'Choose fields and confirm the merge.'};
 const {supabase}=await requireAccount();
 const {error}=await supabase.rpc('merge_career_suggestion_details',{
   suggestion_id:id,target_record_id:targetId,expected_revision:revision,
   merge_title:mergeTitle,merge_description:mergeDescription,
   merge_organization:mergeOrganization,merge_location:mergeLocation,merge_dates:mergeDates,
 });
 if(error)return {error:'Merge was not completed. Your target record might have changed, or its category differs. Refresh and compare again.'};
 revalidatePath('/career-vault');revalidatePath('/career-vault/review');revalidatePath('/dashboard');
 return {message:'Only selected fields were merged into the confirmed record; prior values remain in the audit history.'};
}


export async function deleteCareerSuggestion(_previous:VaultActionState,form:FormData):Promise<VaultActionState>{
 const id=str(form,'id');
 if(!uuid.safeParse(id).success||form.get('confirm')!=='yes')
  return {error:'Confirm which suggestion should be removed.'};
 const {user,supabase}=await requireAccount();
 const {data,error}=await supabase.from('career_suggestions').delete()
  .eq('id',id).eq('user_id',user.id).select('id').maybeSingle();
 if(error||!data)return {error:'Unable to remove the suggestion.'};
 revalidatePath('/career-vault/review');
 return {message:'The selected suggestion was removed. Confirmed career records were not affected.'};
}

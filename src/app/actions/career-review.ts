'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAccount } from '@/lib/account';
import { careerKind } from '@/lib/career/schema';
import type { VaultActionState } from './career';

const uuid=z.uuid();
function str(form:FormData,key:string){return String(form.get(key)??'').trim();}

export async function editSuggestion(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 const id=str(form,'id');
 const kind=careerKind.safeParse(str(form,'kind'));
 const title=str(form,'title'),description=str(form,'description');
 if(!uuid.safeParse(id).success||!kind.success||title.length<1||title.length>180||description.length>4000)
   return {error:'Check the suggested fact and try again.'};
 const {supabase}=await requireAccount();
 const {data,error}=await supabase.rpc('edit_career_suggestion',{
   suggestion_id:id,proposed_kind:kind.data,proposed_title:title,proposed_description:description,
 });
 if(error||!data)return {error:'Unable to change this suggestion. It may already be reviewed.'};
 revalidatePath('/career-vault/review');return {message:'Suggestion updated. Existing records remain unchanged.'};
}

export async function mergeSuggestion(_prev:VaultActionState,form:FormData):Promise<VaultActionState>{
 const id=str(form,'id'),targetId=str(form,'target_record_id'),revision=Number(str(form,'expected_revision'));
 const mergeTitle=form.get('merge_title')==='yes',mergeDescription=form.get('merge_description')==='yes';
 if(!uuid.safeParse(id).success||!uuid.safeParse(targetId).success||
   !Number.isSafeInteger(revision)||revision<1||(!mergeTitle&&!mergeDescription)||
   form.get('confirm_merge')!=='yes')return {error:'Choose fields and confirm the merge.'};
 const {supabase}=await requireAccount();
 const {error}=await supabase.rpc('merge_career_suggestion',{
   suggestion_id:id,target_record_id:targetId,expected_revision:revision,
   merge_title:mergeTitle,merge_description:mergeDescription,
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

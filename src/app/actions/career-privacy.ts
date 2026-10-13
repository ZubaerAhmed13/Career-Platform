'use server';
import {revalidatePath} from 'next/cache';
import {requireAccount} from '@/lib/account';

export type VaultEraseState={error?:string;message?:string};
export async function clearMyCareerVault(
 _previous:VaultEraseState,form:FormData,
):Promise<VaultEraseState>{
 if(form.get('typed_confirmation')!=='DELETE MY CAREER VAULT'||
    form.get('confirm_permanent')!=='yes')
  return {error:'Type the complete confirmation phrase and confirm your decision.'};
 const {supabase}=await requireAccount();
 const {data,error}=await supabase.rpc('clear_my_career_vault');
 if(error||data!==true)
  return {error:'Could not clear your Career Vault. No success is claimed; contact support if this continues.'};
 for(const path of ['/career-vault','/career-vault/privacy','/career-vault/review',
  '/career-vault/evidence','/career-vault/interview','/dashboard'])revalidatePath(path);
 return {message:'Your Career Vault records, proposals, evidence, interviews, links and audit entries were cleared. Your login and profile remain active.'};
}

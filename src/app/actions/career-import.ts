'use server';
import { revalidatePath } from 'next/cache';
import { requireAccount } from '@/lib/account';
import { suggestFactsFromPastedCV } from '@/lib/career/import-ai';
import type { VaultActionState } from './career';

export async function extractPastedCV(_previous:VaultActionState,form:FormData):Promise<VaultActionState>{
 if(!process.env.OPENAI_API_KEY)return {error:'AI extraction is unavailable until the provider is configured.'};
 if(form.get('consent')!=='yes')return {error:'Consent to sharing text with the AI provider is required.'};
 const content=String(form.get('resume_text')??'').trim();
 if(content.length<20||content.length>4000)return {error:'Paste 20–4,000 characters of text.'};
 const {user,supabase}=await requireAccount();
 const recent=await supabase.from('career_suggestions').select('id')
   .eq('user_id',user.id).eq('origin','cv_import')
   .gte('created_at',new Date(Date.now()-60*60*1000).toISOString()).limit(30);
 if(recent.error)return {error:'Unable to check extraction limits.'};
 if((recent.data??[]).length>=30)return {error:'The text extraction limit has been reached for this hour.'};
 try{
  const proposed=await suggestFactsFromPastedCV(content);
  if(!proposed.length)return {message:'No clearly evidenced career facts were extracted. Confirmed records are unchanged.'};
  const {error}=await supabase.from('career_suggestions').insert(proposed.map(s=>({
    ...s,user_id:user.id,origin:'cv_import',review_status:'pending',
  })));
  if(error)return {error:'The provider responded, but proposals could not be saved.'};
  revalidatePath('/career-vault/review');
  return {message:proposed.length+' extracted suggestions saved for review. None has been confirmed.'};
 }catch{return {error:'The AI provider could not safely extract the information. Your confirmed career facts are unchanged.'};}
}

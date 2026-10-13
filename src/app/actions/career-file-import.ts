'use server';
import { requireAccount } from '@/lib/account';
import { careerKind } from '@/lib/career/schema';
import { extractCareerSections } from '@/lib/career/cv-sections';
import { extractScannedCv } from '@/lib/career/cv-file';
import { scanningConfigured } from '@/lib/career/clamav';
import { suggestFactsFromPastedCV } from '@/lib/career/import-ai';
import { localModelConfigured } from '@/lib/career/local-model';
import { aiPersistenceConfigured,persistVerifiedCVSuggestions } from '@/lib/career/ai-admin';
import { revalidatePath } from 'next/cache';
import type { VaultActionState } from './career';

export async function importScannedCv(
 _previous:VaultActionState, form:FormData,
):Promise<VaultActionState>{
 if(!scanningConfigured()) return {error:'Secure file scanning is not configured. Upload remains disabled.'};
 if(form.get('consent')!=='yes')return {error:'Confirm the file is yours and should be processed.'};
 const file=form.get('file');
 const kind=careerKind.safeParse(form.get('kind'));
 if(!(file instanceof File)||!kind.success)return {error:'Select a PDF or DOCX and a career category.'};
 const wantsAI=form.get('extract_with_ai')==='yes';
 if(wantsAI && form.get('ai_consent')!=='yes')
   return {error:'Separate consent is required to process extracted text on the private CareerOS model.'};
 if(wantsAI && (!localModelConfigured()||!aiPersistenceConfigured()))
   return {error:'AI extraction is not configured. Uncheck AI extraction to keep a manually reviewable CV text.'};
 const {user,supabase}=await requireAccount();
 let extracted:{text:string;format:'pdf'|'docx'};
 try{
  extracted=await extractScannedCv(file);
 }catch(error){
  if(error instanceof Error&&/(too large|2 MB|Only matching|12 pages|No readable|4,000-character|failed antivirus|not configured|timed out)/i.test(error.message))
   return {error:error.message};
  return {error:'The file could not be safely scanned or parsed. Nothing was imported.'};
 }
 if(wantsAI){
  const quota=await supabase.rpc('claim_career_ai_quota');
  if(quota.error||!quota.data)return {error:'AI usage limit reached or unavailable. Nothing was imported. Try manually reviewing the CV text.'};
  try{
   const proposed=await suggestFactsFromPastedCV(extracted.text);
   if(proposed.length===0)return {message:'File scanned successfully, but AI found no directly evidenced facts. No records were changed. Retry in manual review mode.'};
   await persistVerifiedCVSuggestions({
    verifiedUserId:user.id,originalText:extracted.text,suggestions:proposed,
   });
   revalidatePath('/career-vault/review');
   return {message:'Scanned '+extracted.format.toUpperCase()+' and saved '+proposed.length+' source-supported fact proposals for review. No confirmed records were changed.'};
  }catch{
   return {error:'File scanning succeeded, but AI extraction could not be completed safely. Nothing was imported. Retry with AI extraction unchecked.'};
  }
 }
 // Manual path: unreviewed original text, no provider receives the data.
 const detected=extractCareerSections(extracted.text);
 const rows=detected.suggestions.length
  ?detected.suggestions.map(s=>({...s,user_id:user.id,origin:'cv_import' as const,review_status:'pending' as const}))
  :[{
    user_id:user.id,kind:kind.data,title:file.name.slice(0,180) || 'Uploaded CV section',
    description:extracted.text,evidence_quote:extracted.text.slice(0,2000),
    origin:'cv_import' as const,review_status:'pending' as const,
   }];
 const {error}=await supabase.from('career_suggestions').insert(rows);
 if(error)return {error:'File passed scanning but its text could not be saved. Retry later.'};
 revalidatePath('/career-vault/review');
 return {message:'Scanned '+extracted.format.toUpperCase()+': '+rows.length+' source-backed candidate(s) saved for review.'+(detected.omitted?' '+detected.omitted+' further entries were omitted by the six-item limit.':'')+' No confirmed facts were replaced.'};
}

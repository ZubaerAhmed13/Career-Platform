'use server';
import { requireAccount } from '@/lib/account';
import { careerKind } from '@/lib/career/schema';
import { extractScannedCv } from '@/lib/career/cv-file';
import { scanningConfigured } from '@/lib/career/clamav';
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
 const {user,supabase}=await requireAccount();
 try{
  const extracted=await extractScannedCv(file);
  // Binary data is never written to storage. The resulting text is unreviewed.
  const {error}=await supabase.from('career_suggestions').insert({
   user_id:user.id,kind:kind.data,
   title:file.name.slice(0,180) || 'Uploaded CV section',
   description:extracted.text,
   evidence_quote:extracted.text.slice(0,2000),
   origin:'cv_import',review_status:'pending',
  });
  if(error)return {error:'File passed scanning but its text could not be saved. Retry later.'};
  revalidatePath('/career-vault/review');
  return {message:'Scanned '+extracted.format.toUpperCase()+' text was extracted into a pending review item. No confirmed facts were replaced.'};
 }catch(error){
  // Never echo raw parser/provider exceptions (which may contain untrusted text).
  if(error instanceof Error && /(too large|2 MB|Only matching|12 pages|No readable|4,000-character|failed antivirus|not configured|timed out)/i.test(error.message)){
    return {error:error.message};
  }
  return {error:'The file could not be safely scanned or parsed. Nothing was imported.'};
 }
}

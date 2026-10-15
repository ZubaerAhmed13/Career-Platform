'use server';
import {revalidatePath} from 'next/cache';
import {requireAccount} from '@/lib/account';
import {careerKind,suggestionSchema} from '@/lib/career/schema';
import {extractCareerSections} from '@/lib/career/cv-sections';
import {validateLocalCvText} from '@/lib/career/browser-cv-security';
import type {VaultActionState} from './career';

/** TEXT-ONLY action; never accepts original PDF/DOCX files. */
export async function importBrowserCvText(
 _previous:VaultActionState,form:FormData,
):Promise<VaultActionState>{
 if(form.get('confirm_source')!=='yes'||form.get('confirm_review')!=='yes')
  return {error:'Confirm your right to use the text and that all saved facts require your review.'};
 if([...form.values()].some(value=>typeof value!=='string'))
  return {error:'Only selected text may be submitted. Document uploads are not accepted.'};
 const kind=careerKind.safeParse(form.get('kind'));
 if(!kind.success)return {error:'Choose a valid career category.'};
 const source=String(form.get('resume_text')??'');
 if(source.length>4000)return {error:'Select no more than 4,000 characters to save.'};
 let text:string;
 try{text=validateLocalCvText(source);}
 catch(error){return {error:error instanceof Error?error.message:'Invalid selected text.'};}
 const {user,supabase}=await requireAccount();
 const recent=await supabase.from('career_suggestions').select('id')
  .eq('user_id',user.id).eq('origin','cv_import')
  .gte('created_at',new Date(Date.now()-60*60*1000).toISOString()).limit(30);
 if(recent.error)return {error:'Could not check the import rate limit.'};
 const detected=extractCareerSections(text,20);
 if(detected.omitted>0)return {error:'This part contains more than 20 candidate facts. Split the text into smaller review parts; nothing was discarded or saved.'};
 const selected=detected.suggestions.length
  ?detected.suggestions
  :[{kind:kind.data,title:text.split('\n').find(line=>line.trim().length>5)?.trim().slice(0,180)||'CV excerpt',
    description:text,evidence_quote:text.slice(0,2000)}];
 if((recent.data??[]).length+selected.length>30)
  return {error:'Hourly review-import limit reached. Try again later.'};
 const verified=[];
 for(const candidate of selected){
  const parsed=suggestionSchema.safeParse(candidate);
  if(!parsed.success||!text.includes(parsed.data.evidence_quote)||parsed.data.evidence_quote.length<6)
   return {error:'The selected text does not support the proposed career fact.'};
  const org=('organization' in candidate?candidate.organization:'')??'';
  const location=('location' in candidate?candidate.location:'')??'';
  const started=('started_on' in candidate?candidate.started_on:null)??null;
  const ended=('ended_on' in candidate?candidate.ended_on:null)??null;
  const current=('is_current' in candidate?candidate.is_current:false)??false;
  verified.push({...parsed.data,organization:org,location,
   started_on:started,ended_on:ended,is_current:current,
   user_id:user.id,origin:'cv_import' as const,review_status:'pending' as const});
 }
 const {error}=await supabase.from('career_suggestions').insert(verified);
 if(error)return {error:'Could not save pending career proposals. No facts were confirmed.'};
 revalidatePath('/career-vault/review');
 return {message:'Saved '+verified.length+' draft career '+(verified.length===1?'fact':'facts')+
  ' in your private Supabase review queue. No original file bytes were uploaded. Nothing was confirmed.'+
  ''};
}

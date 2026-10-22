import {qualityWarnings,resumeDocSchema,type ResumeDoc} from './schema';

export type ResumeExportReview={errors:string[];warnings:string[]};

/** Local deterministic review: no model, upload, mutation, or invented ATS score. */
export function reviewResumeBeforeExport(doc:ResumeDoc):ResumeExportReview{
 const checked=resumeDocSchema.safeParse(doc);
 if(!checked.success){
  const paths=checked.error.issues.slice(0,5).map(issue=>
   (issue.path.length?issue.path.join('.')+': ':'')+issue.message);
  return {errors:['The resume contains invalid or incomplete fields. '+paths.join(' · ')],
   warnings:[]};
 }
 const warnings=qualityWarnings(doc);
 const visible=doc.sections.filter(s=>s.visible).flatMap(s=>s.entries.filter(e=>e.visible));
 if(visible.length===0)warnings.push('The resume has no visible career entries.');
 if(visible.some(entry=>entry.bullets.some(b=>b.visible&&b.text.trim().length>230)))
  warnings.push('One or more bullets exceed 230 characters; review the document layout.');
 const percentages=(value:string)=>[...value.matchAll(/\b\d+(?:[.,]\d+)?\s*%/g)]
  .map(hit=>hit[0].replace(/\s+/g,'').replace(',','.'));
 const unsupportedNumber=visible.some(entry=>{
  const original=new Set(percentages(entry.source?.description??''));
  return entry.bullets.some(b=>b.visible&&percentages(b.text).some(value=>!original.has(value)));
 });
 if(unsupportedNumber)warnings.push('Check percentage achievements against original evidence before using them.');
 return {errors:[],warnings:[...new Set(warnings)].slice(0,10)};
}

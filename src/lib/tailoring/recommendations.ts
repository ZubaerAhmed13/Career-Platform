import type {CareerRecord} from '@/lib/career/schema';
import type {ResumeDoc} from '@/lib/resume/schema';
import type {RequirementEvidence} from './matching';

export type ContentSuggestion={
 recordId:string;record:CareerRecord;classification:'include'|'consider';
 requirements:string[];reason:string;
};
export function contentSuggestions(rows:RequirementEvidence[],records:CareerRecord[],doc?:ResumeDoc|null):ContentSuggestion[]{
 const already=new Set(doc?.sections.flatMap(s=>s.entries.map(e=>e.source?.recordId).filter(Boolean))??[]);
 const suggestions=new Map<string,ContentSuggestion>();
 const byId=new Map(records.filter(r=>r.status==='confirmed').map(r=>[r.id,r]));
 for(const row of rows.filter(row=>row.requirement.review==='approved')){
  for(const match of row.matches){
   const record=byId.get(match.recordId);
   if(!record||already.has(match.recordId))continue;
   const existing=suggestions.get(match.recordId);
   const classification=match.classification==='direct'?'include':'consider';
   if(existing){
    if(!existing.requirements.includes(row.requirement.text))existing.requirements.push(row.requirement.text);
    if(classification==='include')existing.classification='include';
   }else{
    suggestions.set(record.id,{recordId:record.id,record,
     classification,requirements:[row.requirement.text],
     reason:classification==='include'?'Contains an explicit supported skill or activity in the job criteria.':'Shares controlled terminology, but suitability needs your review.'});
   }
  }
 }
 return [...suggestions.values()].sort((a,b)=>
  (a.classification==='include'?0:1)-(b.classification==='include'?0:1));
}
export type WordingPrompt={entry:string;bullet:string;message:string};
export function wordingPrompts(doc:ResumeDoc):WordingPrompt[]{
 const prompts:WordingPrompt[]=[];const seen=new Set<string>();
 for(const section of doc.sections.filter(s=>s.visible)){
  for(const entry of section.entries.filter(e=>e.visible)){
   for(const bullet of entry.bullets.filter(b=>b.visible&&b.text.trim())){
    const text=bullet.text.trim(),normalized=text.toLowerCase().replace(/\s+/g,' ');
    let message='';
    if(text.length>230)message='Consider shortening this bullet to make the contribution easier to scan.';
    else if(/^(responsible for|worked on|helped with|tasked with|duties included)\b/i.test(text))
     message='Consider opening with a precise action verb and concrete contribution.';
    else if(seen.has(normalized))message='This bullet repeats another visible bullet.';
    else if(/\b\d+(?:[.,]\d+)?%\b/.test(text)||/\b\d+(?:[.,]\d+)?\s*%/.test(text)){
     if(!entry.source?.description.includes(text.match(/\d+(?:[.,]\d+)?\s*%/)?.[0]??''))
      message='Check this numerical result against an original supporting source before relying on it.';
    }
    seen.add(normalized);
    if(message)prompts.push({entry:entry.title,bullet:text,message});
   }
  }
 }
 return prompts.slice(0,35);
}
export function sourceChangeWarnings(doc:ResumeDoc,records:CareerRecord[]){
 const byId=new Map(records.map(r=>[r.id,r]));
 const warnings:string[]=[];
 for(const section of doc.sections)for(const entry of section.entries){
  if(!entry.source)continue;
  const current=byId.get(entry.source.recordId);
  if(!current)warnings.push(entry.title+': the original confirmed Vault record is unavailable or no longer confirmed. Saved text is unchanged.');
  else if(current.revision!==entry.source.revision)
   warnings.push(entry.title+': Career Vault has a newer revision. Review before manually refreshing this copy.');
 }
 return [...new Set(warnings)].slice(0,35);
}

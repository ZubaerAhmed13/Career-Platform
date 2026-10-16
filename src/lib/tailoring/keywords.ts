import type {ResumeDoc} from '@/lib/resume/schema';
import type {JobRequirement} from './schema';
import type {CareerRecord} from '@/lib/career/schema';
import {resumePlainText} from '@/lib/resume/exports';
import {controlledAliases,findEvidence} from './matching';

export type KeywordFinding={
 term:string;requirementIds:string[];priority:JobRequirement['priority'];
 status:'present'|'confirmed-missing'|'related'|'unsupported';
};
const normalized=(value:string)=>' '+value.toLowerCase().normalize('NFKC')
 .replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim()+' ';
const includes=(haystack:string,needle:string)=>normalized(haystack).includes(normalized(needle));
/** Explicit terminology only. No keyword density, hidden stuffing, or inferred competence. */
export function inspectKeywordCoverage(requirements:JobRequirement[],doc:ResumeDoc|null,
 records:CareerRecord[]):KeywordFinding[]{
 const approved=requirements.filter(r=>r.review==='approved');
 const terms=new Map<string,KeywordFinding>();
 const resume=doc?resumePlainText(doc):'';
 for(const requirement of approved){
  for(const aliases of controlledAliases){
   if(!aliases.some(term=>includes(requirement.text,term)))continue;
   const primary=aliases[0];
   const current=terms.get(primary);
   if(current){current.requirementIds.push(requirement.id);continue;}
   const textFound=!!doc&&aliases.some(term=>includes(resume,term));
   const evidence=findEvidence(requirement,records);
   const status=textFound?'present':
    evidence.status==='direct'?'confirmed-missing':
    evidence.status==='related'||evidence.status==='needs-review'?'related':'unsupported';
   terms.set(primary,{term:primary,requirementIds:[requirement.id],
    priority:requirement.priority,status});
  }
 }
 return [...terms.values()].slice(0,60);
}

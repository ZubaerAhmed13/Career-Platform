import type {CareerRecord} from '@/lib/career/schema';
import type {JobRequirement} from './schema';
import type {ResumeDoc} from '@/lib/resume/schema';

export type EvidenceMatch={
 recordId:string;revision:number;kind:CareerRecord['kind'];title:string;
 excerpt:string;rule:string;classification:'direct'|'related'|'needs-review';
};
export type RequirementEvidence={requirement:JobRequirement;matches:EvidenceMatch[];
 status:'direct'|'related'|'none'|'needs-review';warning?:string};

export const controlledAliases:readonly (readonly string[])[]=[
 ['microsoft excel','ms excel','excel'],
 ['inventory cycle counting','cycle counting','cycle counts','inventory counts'],
 ['power bi','powerbi'],
 ['project coordination','coordinating projects','project coordinator'],
 ['microsoft powerpoint','ms powerpoint','powerpoint'],
 ['sql'],['sap fi/co','sap fico'],['sap'],['oracle'],['python'],
 ['financial modelling','financial modeling'],['replenishment'],['reporting'],['procurement'],
 ['bachelor of business administration','bba'],['bachelor degree','bachelors degree','bachelor'],
 ['masters degree','master degree','master of arts','ma'],['pmp','project management professional']
];
const normalize=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
function hasPhrase(text:string,phrase:string){
 return (' '+normalize(text)+' ').includes(' '+normalize(phrase)+' ');
}
const levels=['a1','a2','b1','b2','c1','c2'];
const languageAliases:readonly (readonly string[])[]=[
 ['german','deutsch'],['english','englisch'],
 ['french','französisch','franzoesisch'],['spanish','spanisch']
];
const languageGroup=(text:string)=>languageAliases.find(group=>group.some(word=>hasPhrase(text,word)));
const sameLanguage=(text:string,group:readonly string[])=>group.some(word=>hasPhrase(text,word));
const nativeLanguage=/\b(?:native|mother[ -]?tongue|first language|muttersprache|muttersprachlich)\b/i;
const fluentLanguage=/\b(?:fluent(?:ly)?|fluency|verhandlungssicher)\b/i;
const negatedNative=/\b(?:non[ -]?native|not\s+(?:a\s+)?native)\b/i;
const negatedFluency=/\b(?:not\s+(?:yet\s+)?fluent|non[ -]?fluent|not\s+fluent(?:ly)?)\b/i;
/** A CEFR level alone cannot prove native proficiency; vague fluency cannot prove a CEFR score. */
export function detectLanguageGap(required:string,recordText:string){
 const requested=languageGroup(required);
 if(!requested||!sameLanguage(recordText,requested))return undefined;
 const recordNative=nativeLanguage.test(recordText)&&!negatedNative.test(recordText);
 const recordFluent=fluentLanguage.test(recordText)&&!negatedFluency.test(recordText);
 const requiredNative=nativeLanguage.test(required);
 if(requiredNative&&!recordNative)
  return 'Native language proficiency cannot be inferred from a CEFR level or general fluency.';
 if(recordNative)return undefined;
 const recordLevel=levels.findIndex(level=>hasPhrase(recordText,level));
 const requestedLevel=levels.findIndex(level=>hasPhrase(required,level));
 if(requestedLevel>=0){
  if(recordLevel<0)return 'The specified CEFR level is not confirmed by this record.';
  if(recordLevel<requestedLevel)return 'Recorded language level is below the stated requirement.';
 }
 if(fluentLanguage.test(required)){
  if(recordLevel>=0&&recordLevel<4)
   return 'Fluent language proficiency is not supported by this recorded level.';
  if(recordLevel<0&&!recordFluent)
   return 'Fluent language proficiency is not confirmed by this record.';
 }
 if(recordLevel<0&&!recordFluent)
  return 'Language proficiency not explicitly stated in the record.';
 return undefined;
}
const actionVerbs=new Set(['used','using','managed','performed','developed','maintained',
 'created','coordinated','analysed','analyzed','conducted','worked','applied','built','automated']);
/** A skill mention near an action is more meaningful than a tool in an employer name. */
function actionNearTerm(text:string,alias:string){
 const phrase=normalize(alias).split(' ');
 for(const clause of text.split(/[.!?;\n]+/)){
  const words=normalize(clause).split(' ').filter(Boolean);
  for(let i=0;i<=words.length-phrase.length;i++){
   if(!phrase.every((word,j)=>words[i+j]===word))continue;
   const vicinity=words.slice(Math.max(0,i-5),Math.min(words.length,i+phrase.length+5));
   if(vicinity.some(word=>actionVerbs.has(word)))return true;
  }
 }
 return false;
}
export function findEvidence(requirement:JobRequirement,records:CareerRecord[]):RequirementEvidence{
 const approved=records.filter(r=>r.status==='confirmed');
 const query=requirement.text;
 const terms=controlledAliases.filter(group=>group.some(v=>hasPhrase(query,v)));
 const language=languageGroup(query);
 const matches:EvidenceMatch[]=[];
 let warning: string|undefined;
 for(const record of approved){
  // Employer names do not prove an employee's proficiency with similarly named tools.
  // Retain the exact matched field, rather than displaying unrelated description text.
  const fieldEntries=[
   {label:'Description',value:record.description},
   {label:'Title',value:record.title},
   ...Object.entries(record.details??{}).map(([label,value])=>({label:'Detail · '+label,value}))
  ];
  const fields=fieldEntries.map(field=>field.value);
  const value=fields.join(' ');
  if(requirement.category==='language'&&record.kind!=='language')continue;
  if(requirement.category==='certification'&&record.kind!=='certification')continue;
  if(requirement.category==='qualification'&&record.kind!=='education')continue;
  if(language&&!sameLanguage(value,language))continue;
  const gap=requirement.category==='language'?detectLanguageGap(query,value):undefined;
  if(gap){warning=gap;continue;}
  const matched=terms.filter(group=>group.some(v=>hasPhrase(value,v)));
  const all=terms.length>0&&matched.length===terms.length;
  // Credentials cannot be deduced from a related degree or a generic tool keyword.
  const certificationNamed=requirement.category==='certification'&&
   record.title.trim().length>=3&&hasPhrase(query,record.title);
  const degreeNamed=requirement.category==='qualification'&&
   (matched.length>0||hasPhrase(query,record.title));
  const relevant=matched.length>0||certificationNamed||degreeNamed||
   (requirement.category==='language'&&!!language&&sameLanguage(value,language));
  if(!relevant)continue;
  // No single skill keyword proves years of experience, seniority, fluency or certification.
  const advanced=/\b(advanced|expert|senior|years|certified|certification|qualified|professional)\b/i.test(query);
  const handsOn=matched.length>0&&matched.every(group=>
   fields.some(field=>group.some(alias=>actionNearTerm(field,alias))));
  const direct=requirement.relation==='single'&&(
   certificationNamed||
   (requirement.category==='qualification'&&degreeNamed&&!record.is_current&&
    /\b(completed|graduated|awarded|degree|diploma|bba|mba|bachelor|master)\b/i.test(value))||
   (requirement.category==='language'&&!!language&&!gap)||
   (all&&!advanced&&(
    (record.kind==='skill'&&!/\b(years|experience|advanced|expert)\b/i.test(query))||
    handsOn))
  );
  const citedFields=fieldEntries.filter(field=>
   matched.some(group=>group.some(alias=>hasPhrase(field.value,alias)))||
   (language&&sameLanguage(field.value,language))||
   (certificationNamed&&hasPhrase(field.value,record.title)));
  const excerpt=(citedFields.length?citedFields:[{label:'Title',value:record.title}])
   .slice(0,3).map(field=>field.label+': '+field.value).join(' · ').slice(0,450);
  matches.push({recordId:record.id,revision:record.revision,kind:record.kind,
   title:record.title,excerpt,
   rule:'Approved exact phrase / controlled alias: '+(matched[0]?.[0]??(certificationNamed?record.title:language?.[0])??''),
   classification:direct?'direct':requirement.relation!=='single'?'needs-review':'related'});
 }
 matches.sort((a,b)=>(a.classification==='direct'?0:1)-(b.classification==='direct'?0:1));
 const status=matches.some(m=>m.classification==='direct')?'direct':
  matches.some(m=>m.classification==='needs-review')?'needs-review':
  matches.length?'related':'none';
 return {requirement,matches:matches.slice(0,12),status,warning};
}
export function coverage(rows:RequirementEvidence[]){
 const approved=rows.filter(r=>r.requirement.review==='approved');
 return {
  total:approved.length,
  essential:approved.filter(r=>r.requirement.priority==='essential').length,
  essentialDirect:approved.filter(r=>r.requirement.priority==='essential'&&r.status==='direct').length,
  preferred:approved.filter(r=>r.requirement.priority==='preferred').length,
  preferredDirect:approved.filter(r=>r.requirement.priority==='preferred'&&r.status==='direct').length,
  essentialAttention:approved.filter(r=>r.requirement.priority==='essential'&&r.status!=='direct').length,
  preferredAttention:approved.filter(r=>r.requirement.priority==='preferred'&&r.status!=='direct').length,
  direct:approved.filter(r=>r.status==='direct').length,
  related:approved.filter(r=>r.status==='related'||r.status==='needs-review').length,
  missing:approved.filter(r=>r.status==='none').length,
 };
}
export type ResumeChange={kind:'added'|'removed'|'changed'|'moved';label:string};
export function compareResume(source:ResumeDoc,target:ResumeDoc):ResumeChange[]{
 const diff:ResumeChange[]=[];
 for(const key of ['name','headline','email','phone','location','linkedin','portfolio','github','website'] as const){
  if(source.contact[key]!==target.contact[key])diff.push({kind:'changed',label:'Contact: '+key});
 }
 if(source.contact.photo!==target.contact.photo)diff.push({kind:'changed',label:'Portrait image'});
 if(source.contact.showPhoto!==target.contact.showPhoto)diff.push({kind:'changed',label:'Portrait visibility'});
 if(JSON.stringify([...source.contact.hidden].sort())!==JSON.stringify([...target.contact.hidden].sort()))
  diff.push({kind:'changed',label:'Contact field visibility'});
 if(source.summary!==target.summary)diff.push({kind:'changed',label:'Professional summary'});
 if(source.summaryVisible!==target.summaryVisible)diff.push({kind:'changed',label:'Professional summary visibility'});
 for(const key of Object.keys(source.settings) as Array<keyof ResumeDoc['settings']>){
  if(source.settings[key]!==target.settings[key])
   diff.push({kind:'changed',label:'Design setting: '+key});
 }
 const before=new Map(source.sections.map((s,i)=>[s.id,{s,i}]));
 const after=new Map(target.sections.map((s,i)=>[s.id,{s,i}]));
 // Ignore index shifts caused solely by newly inserted or removed sections.
 const sharedBefore=source.sections.map(s=>s.id).filter(id=>after.has(id));
 const sharedAfter=target.sections.map(s=>s.id).filter(id=>before.has(id));
 const reorderedSections=new Set(sharedBefore.filter((id,index)=>id!==sharedAfter[index]));
 for(const [id,{s}] of before){
  const found=after.get(id);
  if(!found){diff.push({kind:'removed',label:'Section: '+s.title});continue;}
  if(reorderedSections.has(id))diff.push({kind:'moved',label:'Section: '+s.title});
  if(s.visible!==found.s.visible)diff.push({kind:'changed',label:'Section visibility: '+s.title});
  if(s.title!==found.s.title||s.kind!==found.s.kind)
   diff.push({kind:'changed',label:'Section heading/type: '+s.title});
  const original=new Map(s.entries.map((entry,index)=>[entry.id,{entry,index}]));
  const current=new Map(found.s.entries.map((entry,index)=>[entry.id,{entry,index}]));
  const sharedOriginal=s.entries.map(entry=>entry.id).filter(id=>current.has(id));
  const sharedCurrent=found.s.entries.map(entry=>entry.id).filter(id=>original.has(id));
  const reorderedEntries=new Set(sharedOriginal.filter((eid,index)=>eid!==sharedCurrent[index]));
  for(const [eid,item] of original){
   const update=current.get(eid);
   if(!update){diff.push({kind:'removed',label:'Entry: '+item.entry.title});continue;}
   if(reorderedEntries.has(eid))diff.push({kind:'moved',label:'Entry: '+item.entry.title});
   if(item.entry.visible!==update.entry.visible)
    diff.push({kind:'changed',label:'Entry visibility: '+item.entry.title});
   if(JSON.stringify(item.entry.bullets)!==JSON.stringify(update.entry.bullets))
    diff.push({kind:'changed',label:'Entry bullets: '+item.entry.title});
   const oldContent={...item.entry,visible:undefined,bullets:undefined};
   const newContent={...update.entry,visible:undefined,bullets:undefined};
   if(JSON.stringify(oldContent)!==JSON.stringify(newContent))
    diff.push({kind:'changed',label:'Entry content: '+item.entry.title});
  }
  for(const [eid,item] of current)if(!original.has(eid))
   diff.push({kind:'added',label:'Entry: '+item.entry.title});
 }
 for(const [id,item] of after)if(!before.has(id))
  diff.push({kind:'added',label:'Section: '+item.s.title});
 return diff.slice(0,120);
}

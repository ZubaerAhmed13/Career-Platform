import type { CareerKind } from './schema';

/**
 * Deliberately conservative, provider-free CV text segmentation.
 * Each candidate is an unconfirmed excerpt, never an inferred fact.
 * Avoid guessing dates, employers, roles or personal qualifications.
 */
export type SectionProposal = {
 kind:CareerKind; title:string; description:string; evidence_quote:string;
 organization?:string; location?:string;started_on?:string|null;ended_on?:string|null;is_current?:boolean;
};
type ParsedSections={ suggestions:SectionProposal[]; recognized:boolean; omitted:number };
const headings:readonly [RegExp,CareerKind][]=[
 [/^(?:professional |employment |work )?(?:experience|history of employment|work history|employment history)$/i,'experience'],
 [/^(?:education|academic background|qualifications|degrees?)$/i,'education'],
 [/^(?:technical skills|core skills|skills|competencies|technologies)$/i,'skill'],
 [/^(?:languages|language proficiency)$/i,'language'],
 [/^(?:projects|academic projects|personal projects|professional projects)$/i,'project'],
 [/^(?:achievements|awards|honors|honours)$/i,'achievement'],
 [/^(?:certifications|certificates|licenses|licences)$/i,'certification'],
 [/^(?:volunteering|volunteer work|voluntary experience)$/i,'volunteering'],
];
function headingOf(line:string):{kind:CareerKind;inline:string}|null{
 const cleaned=line.replace(/^\s*#{1,3}\s*/,'').trim();
 const colon=cleaned.indexOf(':');
 const name=(colon<0?cleaned:cleaned.slice(0,colon)).trim();
 for(const [regex,kind] of headings)if(regex.test(name)) {
  return {kind,inline:colon<0?'':cleaned.slice(colon+1).trim()};
 }
 return null;
}
function candidate(kind:CareerKind,block:string,title:string):SectionProposal|null{
 const excerpt=block.trim();
 if(excerpt.length<6)return null;
 return {
  kind,title:title.replace(/^\s*[-•*]\s*/,'').trim().slice(0,180),
  description:excerpt.slice(0,4000),
  evidence_quote:excerpt.slice(0,2000),
 };
}
/**
 * Only explicit labeled metadata can populate structured fields. No employer
 * or date is inferred from prose or rewritten to look more precise than source.
 */
function explicitDetails(kind:CareerKind,block:string){
 if(!['experience','education','project','certification','volunteering'].includes(kind))return {};
 const lines=block.split('\n');
 const tagged=(label:RegExp)=>lines.map(l=>l.trim().match(label)?.[1]?.trim()).find(Boolean);
 const organization=tagged(/^(?:employer|organization|institution|company|issuer):\s*(.+)$/i)?.slice(0,180)||'';
 const location=tagged(/^(?:location|city):\s*(.+)$/i)?.slice(0,150)||'';
 const validDate=(label:RegExp)=>{
  const date=tagged(label);
  if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
  const value=new Date(date+'T00:00:00Z');
  return !Number.isNaN(value.getTime())&&value.toISOString().slice(0,10)===date?date:null;
 };
 const started_on=validDate(/^(?:start|start date|from):\s*(.+)$/i);
 let ended_on=validDate(/^(?:end|end date|to):\s*(.+)$/i);
 const rawCurrent=tagged(/^(?:current|ongoing|present):\s*(.+)$/i);
 const endLabel=tagged(/^(?:end|end date|to):\s*(.+)$/i);
 const is_current=/^(?:yes|true)$/i.test(rawCurrent??'')||
  /^(?:present|current|ongoing)$/i.test(endLabel??'');
 // Conflicting or reversed dates stay unpopulated pending human correction.
 if(started_on&&ended_on&&started_on>ended_on)ended_on=null;
 if(ended_on&&is_current)return {organization,location,started_on,
  ended_on, is_current:false};
 return {organization,location,started_on,ended_on:is_current?null:ended_on,is_current};
}

export function extractCareerSections(text:string,max=6):ParsedSections{
 if(text.length<20||text.length>4000)throw new Error('CV text must contain 20–4,000 characters.');
 const lines=text.replace(/\r\n?/g,'\n').split('\n');
 let current:CareerKind|null=null;
 const candidateBlocks:{kind:CareerKind;text:string;headingLine:string}[]=[];
 let currentHeading='';
 let active:string[]=[];
 let recognized=false;
 const flush=()=>{
  const block=active.join('\n').trim();
  if(block&&current)candidateBlocks.push({kind:current,text:block,headingLine:currentHeading});
  active=[];
 };
 for(const rawLine of lines){
  const line=rawLine.trim();
  const heading=headingOf(line);
  if(heading){
   flush();current=heading.kind;currentHeading=line;recognized=true;
   if(heading.inline)active.push(heading.inline);
   continue;
  }
  if(!current)continue;
  if(!line){flush();continue;}
  const bullet=/^[-*•]\s+/.test(line);
  // Explicit list entries are distinct facts; continuation lines otherwise
  // stay with the previous CV entry up to a blank line.
  if(bullet&&active.length)flush();
  active.push(line);
 }
 flush();
 const candidates:SectionProposal[]=[];
 for(const block of candidateBlocks){
  // Preserve source text exactly as included in the cleaned section; never
  // synthesize employer/date values or numerical achievements.
  if(block.kind==='skill'||block.kind==='language'){
   const rawEntries=block.text.split(/\s*[,;]\s*/).filter(Boolean);
   for(const entry of rawEntries){
    if(entry.trim().length<2)continue;
    const proposal=candidate(block.kind,block.text,entry);
    if(proposal)candidates.push(proposal);
    else if(block.headingLine.length>=6&&text.includes(block.headingLine)){
      candidates.push({kind:block.kind,title:entry.trim().slice(0,180),
       description:block.text,evidence_quote:block.headingLine.slice(0,2000)});
    }
   }
  }else{
   const title=block.text.split('\n')[0].trim();
   const proposal=candidate(block.kind,block.text,title);
   if(proposal)candidates.push({...proposal,...explicitDetails(block.kind,block.text)});
  }
 }
 // Source quotes must actually appear in the submitted CV. If a normalized
 // multi-line block loses spacing, fall back to one verbatim supporting line.
 const verified=candidates.flatMap(record=>{
   if(text.includes(record.evidence_quote))return [record];
   const line=record.evidence_quote.split('\n').map(v=>v.trim())
    .find(v=>v.length>=6&&text.includes(v));
   return line?[{...record,evidence_quote:line.slice(0,2000)}]:[];
 });
 const limited=verified.slice(0,Math.max(0,Math.min(max,20)));
 return {suggestions:limited,recognized,omitted:Math.max(0,verified.length-limited.length)};
}

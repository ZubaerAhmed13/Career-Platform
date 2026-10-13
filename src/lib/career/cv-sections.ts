import type { CareerKind } from './schema';

/**
 * Deliberately conservative, provider-free CV text segmentation.
 * Each candidate is an unconfirmed excerpt, never an inferred fact.
 * Avoid guessing dates, employers, roles or personal qualifications.
 */
export type SectionProposal = {
 kind:CareerKind; title:string; description:string; evidence_quote:string;
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
   if(proposal)candidates.push(proposal);
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
 const limited=verified.slice(0,Math.max(0,Math.min(max,6)));
 return {suggestions:limited,recognized,omitted:Math.max(0,verified.length-limited.length)};
}

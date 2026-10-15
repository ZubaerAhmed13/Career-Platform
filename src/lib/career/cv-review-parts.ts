import {MAX_LOCAL_CV_TEXT} from './browser-cv-security';

export type CvReviewPart={original:string;text:string;label:string};
/**
 * Prepare a longer CV for deliberate, sequential review. Preserve every
 * original character exactly once in original; repeat an existing section
 * heading in text only when continuity would otherwise be lost.
 * No network requests or persistence occur here.
 */
export function planCvReviewParts(raw:string,max=MAX_LOCAL_CV_TEXT):CvReviewPart[]{
 if(!Number.isInteger(max)||max<80)throw new Error('Unsupported review-section size.');
 const source=raw.replace(/\0/g,'').replace(/\r\n?/g,'\n').trim();
 if(source.length<20||source.length>100_000)throw new Error('The document must contain between 20 and 100,000 readable characters.');
 const chunks:string[]=[];
 let buffer='';
 let heading='';
 let bufferHeading='';
 const isHeading=(s:string)=>/^\s*(?:#{1,3}\s*)?(?:work experience|employment history|professional experience|education|academic background|skills|technical skills|core skills|languages|language proficiency|projects|academic projects|achievements|awards|certifications|certificates|volunteering|volunteer work)\s*:?(?:\s*)$/i.test(s);
 function push(){if(buffer){chunks.push(buffer);buffer='';bufferHeading='';}}
 // Keep \n in the tokens, preserving all text. Long unbroken lines are split
 // without discarding bytes; the resulting text remains editable before save.
 const lines=source.match(/[^\n]*\n|[^\n]+$/g)??[];
 for(const line of lines){
  if(isHeading(line.trim()))heading=line.trim();
  let remaining=line;
  while(remaining){
   const continuation=buffer===''&&chunks.length>0&&heading&&heading!==remaining.trim()
    ?heading+'\n':'';
   const prefix=buffer===''&&continuation.length<max-80?continuation:'';
   const room=max-prefix.length-buffer.length;
   if(room<=0){push();continue;}
   // Prefer placing complete lines in the next part.
   if(remaining.length>room&&buffer){push();continue;}
   if(buffer==='')bufferHeading=prefix;
   const take=remaining.slice(0,room);
   buffer+=prefix+take;
   remaining=remaining.slice(take.length);
   if(remaining)push();
  }
 }
 push();
 // The visible review text can contain duplicated *source* headings, never
 // invented record details. original holds the exact unmodified coverage.
 let cursor=0;
 const parts=chunks.map((chunk,i)=>{
  const copy=i>0&&chunk.match(/^(?:work experience|employment history|professional experience|education|academic background|skills|technical skills|core skills|languages|language proficiency|projects|academic projects|achievements|awards|certifications|certificates|volunteering|volunteer work)\n/i)?.[0]??'';
  const pure=copy&&source.slice(cursor,cursor+copy.length)!==copy?chunk.slice(copy.length):chunk;
  cursor+=pure.length;
  return {original:pure,text:chunk,label:'Part '+(i+1)};
 });
 if(parts.map(p=>p.original).join('')!==source)
  throw new Error('Could not safely partition the extracted text.');
 // A very small tail is not allowed to be silently omitted.
 if(parts.length>1&&parts[parts.length-1].text.trim().length<20){
  const tail=parts.pop()!;
  const previous=parts[parts.length-1];
  if(previous.text.length+tail.text.length<=max){
   previous.text+=tail.text;previous.original+=tail.original;
  }else{
   // Borrow enough already-present source content for a valid final review part.
   const suffix=previous.original.slice(-30);
   tail.text=suffix+tail.text;
   parts.push(tail);
  }
 }
 return parts.map((part,i)=>({...part,label:'Part '+(i+1)+' of '+parts.length}));
}

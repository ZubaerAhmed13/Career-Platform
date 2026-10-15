import {MAX_LOCAL_CV_TEXT} from './browser-cv-security';

export type CvReviewPart={original:string;text:string;label:string};
const headingPattern=/^\s*(?:#{1,3}\s*)?(?:work experience|employment history|professional experience|education|academic background|skills|technical skills|core skills|languages|language proficiency|projects|academic projects|achievements|awards|certifications|certificates|volunteering|volunteer work)\s*:?(?:\s*)$/i;

/** Lossless browser-only partitioning. A recognized source heading may be
 * repeated in the editable review text so later parts retain context.
 * Each character from the extracted source is represented once in original.
 */
export function planCvReviewParts(raw:string,max=MAX_LOCAL_CV_TEXT):CvReviewPart[]{
 if(!Number.isInteger(max)||max<80)throw new Error('Unsupported review-section size.');
 const source=raw.replace(/\0/g,'').replace(/\r\n?/g,'\n');
 if(source.trim().length<20||source.length>100_000)
  throw new Error('The document must contain between 20 and 100,000 readable characters.');
 const parts:CvReviewPart[]=[];
 let text='',original='',activeHeading='';
 function flush(){
  if(!original)return;
  parts.push({text,original,label:''});
  text='';original='';
 }
 const lines=source.match(/[^\n]*\n|[^\n]+$/g)??[];
 for(const line of lines){
  const isHeading=headingPattern.test(line.trim());
  if(isHeading)activeHeading=line.trim();
  let remaining=line;
  while(remaining.length){
   if(!text&&parts.length>0&&!isHeading&&activeHeading&&activeHeading.length<max-80)
    text=activeHeading+'\n';
   const room=max-text.length;
   if(remaining.length>room&&original.length){flush();continue;}
   const take=remaining.slice(0,room);
   text+=take;original+=take;
   remaining=remaining.slice(take.length);
   if(remaining)flush();
  }
 }
 flush();
 if(parts.map(part=>part.original).join('')!==source)
  throw new Error('Could not safely partition the extracted text.');
 if(parts.length>1&&parts[parts.length-1].text.trim().length<20){
  const tail=parts.pop()!;
  const previous=parts[parts.length-1];
  if(previous.text.length+tail.text.length<=max){
   previous.text+=tail.text;previous.original+=tail.original;
  }else{
   // Explicit source overlap lets the user save tiny trailing text without loss.
   tail.text=previous.original.slice(-30)+tail.text;
   parts.push(tail);
  }
 }
 return parts.map((part,i)=>({...part,label:'Part '+(i+1)+' of '+parts.length}));
}

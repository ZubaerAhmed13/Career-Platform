import type {JobRequirement} from './schema';

const qualifying=/\b(experience|proficien\w*|knowledge|familiar\w*|ability|skills?|degree|bachelor|master|diploma|certific\w*|fluency|fluent|language|excel|sql|sap|oracle|python|power bi|tableau|requirements?|responsib\w*|manag\w*|coordinat\w*|analys\w*|analyz\w*|reporting|communication|working hours|available|travel|location)\b/i;
const head=/^(responsibilities|your profile|requirements|qualifications|what you bring|who you are|benefits|about us|nice to have|must have|tasks|profil|anforderungen|aufgaben)\s*:?$/i;
const preferred=/\b(preferred|nice to have|advantageous|desirable|optional|plus|ideally|von vorteil|wünschenswert)\b/i;
const essential=/\b(required|essential|must have|mandatory|minimum|need to|you must|erforderlich|voraussetzung|zwingend)\b/i;
function category(text:string):JobRequirement['category']{
 if(/\b(german|english|french|language|fluent|sprachkenntnisse|deutsch|englisch)\b/i.test(text))return 'language';
 if(/\b(certif|license|licence|accredit)\w*/i.test(text))return 'certification';
 if(/\b(bachelor|master|degree|diploma|university)\b/i.test(text))return 'qualification';
 if(/\b(excel|sap|oracle|sql|power bi|tableau|python|powerpoint|office|software)\b/i.test(text))return 'tool';
 if(/\b(years? of experience|professional experience|work experience)\b/i.test(text))return 'experience';
 if(/\b(hours?|week|shifts?|part.time)\b/i.test(text))return 'hours';
 if(/\b(travel|relocat|onsite|on.site|driving|location)\b/i.test(text))return 'mobility';
 if(/\b(knowledge|skills?|competenc|communication)\b/i.test(text))return 'skill';
 if(/\b(industry|sector|automotive|banking|retail)\b/i.test(text))return 'industry';
 return 'responsibility';
}
export function extractRequirements(source:string):JobRequirement[]{
 const results:JobRequirement[]=[];
 let offset=0;const seen=new Set<string>();
 for(const line of source.split(/\n/)){
  const full=line.trim().replace(/^(?:[•*–-]\s+|\d+[.)]\s+)/,'').trim();
  const position=line.indexOf(full)>=0?offset+line.indexOf(full):offset;
  offset+=line.length+1;
  if(!full||head.test(full)||full.length<9||full.length>1200||!qualifying.test(full))continue;
  // Long paragraphs are retained for manual review rather than split into misleading criteria.
  const norm=full.toLowerCase().replace(/\s+/g,' ');
  if(seen.has(norm))continue;seen.add(norm);
  const priority=preferred.test(full)?'preferred':essential.test(full)?'essential':'unclassified';
  results.push({
   id:crypto.randomUUID(),text:full,excerpt:line.slice(0,1500),
   position,category:category(full),priority,
   relation:/\b(or|oder|either)\b/i.test(full)?'alternative':
    /\b(and|sowie|und)\b/i.test(full)?'compound':'single',
   origin:'detected',review:'candidate',
  });
  if(results.length>=70)break;
 }
 return results;
}
export function newManualRequirement(text:string):JobRequirement{
 return {id:crypto.randomUUID(),text,excerpt:'',position:-1,category:'other',
  priority:'unclassified',relation:'single',origin:'user',review:'approved'};
}

/** Human-directed structural review. Never silently reinterpret AND/OR criteria. */
export function splitRequirement(item:JobRequirement,left:string,right:string):[JobRequirement,JobRequirement]{
 const a=left.trim(),b=right.trim();
 if(a.length<2||b.length<2||a.length>1200||b.length>1200)
  throw new Error('Split requirements must each contain 2–1,200 characters.');
 return [a,b].map(text=>({...item,id:crypto.randomUUID(),text,
  origin:'user' as const,review:'candidate' as const,
  priority:'unclassified' as const,relation:'single' as const})) as [JobRequirement,JobRequirement];
}
export function mergeRequirements(a:JobRequirement,b:JobRequirement):JobRequirement{
 if(a.id===b.id)throw new Error('Choose two different requirements.');
 const text=a.text+'; '+b.text;
 if(text.length>1200)throw new Error('Combined requirement exceeds the 1,200-character limit.');
 return {
  id:crypto.randomUUID(),text,excerpt:[a.excerpt,b.excerpt].filter(Boolean).join('\n').slice(0,1500),
  position:a.position<0?b.position:b.position<0?a.position:Math.min(a.position,b.position),
  category:a.category===b.category?a.category:'other',
  priority:a.priority===b.priority?a.priority:'unclassified',
  relation:'compound',origin:'user',review:'candidate',
 };
}

/** Re-review the meaning of a previously approved criterion after a semantic edit. */
export function reviseRequirement(item:JobRequirement,changes:Partial<JobRequirement>):JobRequirement{
 const meaningful=['text','category','priority','relation'] as const;
 const changed=meaningful.some(key=>changes[key]!==undefined&&changes[key]!==item[key]);
 return {
  ...item,...changes,
  ...(changes.text!==undefined&&changes.text!==item.text?{origin:'user' as const}:{}),
  ...(changed&&changes.review===undefined?{review:'candidate' as const}:{})
 };
}

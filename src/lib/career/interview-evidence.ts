import {z} from 'zod';
import {interviewFocuses} from './interview-coach';

export const zInterviewFocus=z.enum(interviewFocuses);
type Candidate={
 kind:string;title:string;description:string;evidence_quote:string;
};

const evidenceStopwords=new Set([
 'about','above','after','again','also','among','around','because','before',
 'being','could','each','from','have','having','into','more','most','only',
 'other','ours','their','them','these','those','through','using','used',
 'when','where','which','while','with','would','your','work','worked',
 'role','roles','task','tasks','experience','professional',
]);
function keywords(text:string):string[]{
 return [...new Set((text.toLocaleLowerCase().match(/[\p{L}]{4,}/gu)??[])
  .filter(term=>!evidenceStopwords.has(term)))];
}
function hasAnchor(claim:string,source:string):boolean{
 const terms=keywords(claim);
 if(!terms.length)return true;
 const present=new Set(keywords(source));
 return terms.some(term=>present.has(term));
}

/** Conservative post-model gate: a quote is necessary but not sufficient. */
export function onlySupportedSuggestions<T extends Candidate>(
 proposals:T[],latestSource:string,max=6,
):T[]{
 const accepted:T[]=[];
 const seen=new Set<string>();
 for(const p of proposals){
  const quote=p.evidence_quote.trim();
  if(quote.length<6||!latestSource.includes(quote))continue;
  // Numerals, percentage claims and dates asserted by AI must appear in the
  // evidence excerpt itself. Otherwise request clarification from the user.
  const declared=[...new Set(((p.title+' '+p.description).match(/\d+(?:[.,]\d+)?%?/g)??[]))];
  if(declared.some(value=>!quote.includes(value)))continue;
  // A verbatim quote can be unrelated to the AI claim. Ensure at least one
  // meaningful title and description term occurs in the user's actual source.
  // This is only a rejection filter, NOT semantic proof of the whole claim.
  if(!hasAnchor(p.title,latestSource)||
     !hasAnchor(p.description,latestSource))continue;
  const key=p.kind+'|'+p.title.normalize('NFKC').toLocaleLowerCase().trim();
  if(seen.has(key))continue;
  seen.add(key);
  accepted.push({...p,evidence_quote:quote});
  if(accepted.length>=max)break;
 }
 return accepted;
}

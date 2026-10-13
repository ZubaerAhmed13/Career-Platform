import {z} from 'zod';
import {interviewFocuses} from './interview-coach';

export const zInterviewFocus=z.enum(interviewFocuses);
type Candidate={
 kind:string;title:string;description:string;evidence_quote:string;
};

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
  const key=(p.kind+'|'+p.title).normalize('NFKC').toLocaleLowerCase().trim();
  if(seen.has(key))continue;
  seen.add(key);
  accepted.push({...p,evidence_quote:quote});
  if(accepted.length>=max)break;
 }
 return accepted;
}

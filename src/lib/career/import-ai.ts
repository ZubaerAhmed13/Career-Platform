import 'server-only';
import { z } from 'zod';
import { careerKind, suggestionSchema } from './schema';
import { requestStructuredCareerAI, AIUnavailableError } from './provider';

const importSchema={
 type:'object',additionalProperties:false,
 properties:{
  suggestions:{type:'array',items:{
    type:'object',additionalProperties:false,
    properties:{
     kind:{type:'string',enum:careerKind.options},
     title:{type:'string'},
     description:{type:'string'},
     evidence_quote:{type:'string'},
    },required:['kind','title','description','evidence_quote'],
  }},
 },
 required:['suggestions'],
} as const;
const outputSchema=z.object({suggestions:z.array(suggestionSchema).max(6)});

/** Paste-only extraction. No claims are created or verified automatically. */
export async function suggestFactsFromPastedCV(source:string){
 if(source.length<20||source.length>4000)throw new Error('Invalid input size.');
 const data=await requestStructuredCareerAI({
  instructions:[
   'Extract only clearly stated personal career facts from the user-provided text.',
   'Use one of the eight specified career categories.',
   'Return at most six focused suggestions; choose none for ambiguous text.',
   'Every suggestion must contain a verbatim evidence_quote from the supplied text.',
   'Do not invent job dates, employers, education, metrics, certifications or skills.',
   'These are UNVERIFIED proposals which the human user will review before saving.',
  ].join(' '),
  input:[{role:'user',content:source}],schema:importSchema,name:'career_cv_paste',maxOutputTokens:900,
 });
 const parsed=outputSchema.safeParse(data);
 if(!parsed.success)throw new AIUnavailableError('Extracted records did not pass validation.');
 return parsed.data.suggestions.filter(s=>s.evidence_quote.length>=6&&source.includes(s.evidence_quote));
}

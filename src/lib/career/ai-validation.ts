import { z } from 'zod';
import { suggestionSchema } from './schema';
import { careerOnlyReply } from './ai-purpose';

export const careerAIOutputSchema=z.object({
 scope:z.enum(['career','off_topic']),
 reply:z.string().trim().min(1).max(1800),
 suggestions:z.array(suggestionSchema).max(2),
}).strict();

export function validateInterviewOutput(value:unknown,latestAnswer:string){
 const parsed=careerAIOutputSchema.safeParse(value);
 if(!parsed.success)throw new Error('AI output does not match the restricted career interview schema.');
 if(parsed.data.scope==='off_topic'){
  return {reply:careerOnlyReply,suggestions:[],scope:'off_topic' as const};
 }
 // Proposals remain unconfirmed and require an exact excerpt from this answer,
 // not just a similar phrase in conversation history or career records.
 return {
  reply:parsed.data.reply,
  scope:'career' as const,
  suggestions:parsed.data.suggestions.filter(s=>
   s.evidence_quote.length>=6&&latestAnswer.includes(s.evidence_quote)),
 };
}

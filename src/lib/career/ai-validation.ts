import { z } from 'zod';
import { suggestionSchema } from './schema';

export const careerAIOutputSchema=z.object({
 reply:z.string().trim().min(1).max(1800),
 suggestions:z.array(suggestionSchema).max(2),
});
export function validateInterviewOutput(value:unknown,latestAnswer:string){
 const parsed=careerAIOutputSchema.safeParse(value);
 if(!parsed.success)throw new Error('AI output does not match the expected career interview schema.');
 // Only directly evidenced proposals are allowed into the review queue.
 return {reply:parsed.data.reply,
  suggestions:parsed.data.suggestions.filter(s=>s.evidence_quote.length>=6&&latestAnswer.includes(s.evidence_quote)),
 };
}

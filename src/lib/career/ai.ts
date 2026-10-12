import 'server-only';
import { careerKind } from './schema';
import { validateInterviewOutput } from './ai-validation';
import { interviewInstructions, topicPrompts, type InterviewTopic } from './prompts';
import { requestStructuredCareerAI, AIUnavailableError } from './provider';

const formatSchema={
 type:'object',additionalProperties:false,
 properties:{
  reply:{type:'string'},
  suggestions:{type:'array',items:{
    type:'object',additionalProperties:false,
    properties:{
     kind:{type:'string',enum:careerKind.options},
     title:{type:'string'},description:{type:'string'},evidence_quote:{type:'string'},
    },required:['kind','title','description','evidence_quote'],
  }},
 },
 required:['reply','suggestions'],
} as const;
export { AIUnavailableError };

export async function getInterviewResponse({
 topic,answer,history,context,
}:{
 topic:InterviewTopic;answer:string;
 history:{role:'user'|'assistant';content:string}[];
 context:{kind:string;title:string;description:string}[];
}){
 const instructions=interviewInstructions+'\n'+topicPrompts[topic]+
  '\nRelevant confirmed user data, not a license to invent: '+
  JSON.stringify(context.map(r=>({kind:r.kind,title:r.title,description:r.description.slice(0,500)})));
 const parsed=await requestStructuredCareerAI({
  instructions,
  input:[...history.slice(-10),{role:'user',content:answer}],
  schema:formatSchema,
  name:'career_interview',
  maxOutputTokens:600,
 });
 try{return validateInterviewOutput(parsed,answer);}
 catch{throw new AIUnavailableError('AI response failed career-fact validation.');}
}

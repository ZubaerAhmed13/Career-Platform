import 'server-only';
import { careerKind } from './schema';
import { validateInterviewOutput } from './ai-validation';
import { interviewInstructions, topicPrompts, type InterviewTopic } from './prompts';

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

export class AIUnavailableError extends Error {}
export async function getInterviewResponse({
 topic,answer,history,context,
}:{
 topic:InterviewTopic;answer:string;
 history:{role:'user'|'assistant';content:string}[];
 context:{kind:string;title:string;description:string}[];
}){
 const key=process.env.OPENAI_API_KEY;
 if(!key)throw new AIUnavailableError('AI provider is not configured.');
 const model=process.env.CAREER_AI_MODEL||'gpt-4o-mini';
 const prompt=interviewInstructions+'\n'+topicPrompts[topic]+
   '\nApproved existing context (not a license to invent facts): '+
   JSON.stringify(context.map(r=>({kind:r.kind,title:r.title,description:r.description.slice(0,500)})));
 const requestBody={
   model,store:false,max_output_tokens:600,
   instructions:prompt,
   input:[
    ...history.slice(-10).map(m=>({role:m.role,content:[{type:'input_text',text:m.content.slice(0,2000)}]})),
    {role:'user',content:[{type:'input_text',text:answer}]},
   ],
   text:{format:{type:'json_schema',name:'career_interview',strict:true,schema:formatSchema}},
 };
 let response:Response;
 try{
  response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify(requestBody),signal:AbortSignal.timeout(20000),
  });
 }catch{throw new AIUnavailableError('AI service timed out or could not be reached.');}
 if(!response.ok)throw new AIUnavailableError('AI service temporarily unavailable ('+response.status+').');
 const payload:unknown=await response.json();
 if(!payload||typeof payload!=='object')throw new AIUnavailableError('Invalid AI service response.');
 const obj=payload as {output?:Array<{type?:string;content?:Array<{type?:string;text?:string}>}>;status?:string};
 if(obj.status!=='completed')throw new AIUnavailableError('AI output was incomplete.');
 const raw=obj.output?.flatMap(m=>m.content??[]).find(c=>c.type==='output_text')?.text;
 if(!raw)throw new AIUnavailableError('AI did not return usable structured text.');
 let parsed:unknown;
 try{parsed=JSON.parse(raw);}catch{throw new AIUnavailableError('AI returned invalid JSON.');}
 return validateInterviewOutput(parsed,answer);
}


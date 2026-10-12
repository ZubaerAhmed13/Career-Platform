import 'server-only';

/** Single, swappable server-side boundary for structured career AI operations. */
export class AIUnavailableError extends Error {}

export async function requestStructuredCareerAI({
 instructions,input,schema,name,maxOutputTokens=700,
}:{
 instructions:string;
 input:Array<{role:'user'|'assistant';content:string}>;
 schema:Record<string,unknown>;
 name:string;maxOutputTokens?:number;
}):Promise<unknown>{
 const key=process.env.OPENAI_API_KEY;
 if(!key)throw new AIUnavailableError('The AI provider is not configured.');
 const model=process.env.CAREER_AI_MODEL??'gpt-4o-mini';
 if(input.length>12)throw new AIUnavailableError('Input context is too long.');
 const request={
  model,store:false,max_output_tokens:maxOutputTokens,
  instructions,
  input:input.map(item=>({role:item.role,content:item.content.slice(0,5000)})),
  text:{format:{type:'json_schema',name,strict:true,schema}},
 };
 let response:Response;
 try{
  response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
    signal:AbortSignal.timeout(20000),
    body:JSON.stringify(request),
  });
 }catch{throw new AIUnavailableError('AI request timed out or could not connect.');}
 if(!response.ok)throw new AIUnavailableError('AI provider rejected the request ('+response.status+').');
 let obj:unknown;
 try{obj=await response.json();}catch{throw new AIUnavailableError('Invalid provider response.');}
 if(!obj||typeof obj!=='object')throw new AIUnavailableError('Invalid provider response.');
 const json=obj as {status?:string;output?:Array<{content?:Array<{type?:string;text?:string}>}>};
 if(json.status!=='completed')throw new AIUnavailableError('Provider output was incomplete.');
 const raw=json.output?.flatMap(item=>item.content??[]).find(item=>item.type==='output_text')?.text;
 if(!raw)throw new AIUnavailableError('Provider returned no structured text.');
 try{return JSON.parse(raw) as unknown;}catch{throw new AIUnavailableError('Provider returned invalid JSON.');}
}
